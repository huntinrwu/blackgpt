-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Usage / analytics events (privacy-light: no IP, no user agent, no page content)
CREATE TABLE public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  visitor_id text,
  event_type text NOT NULL DEFAULT 'message',
  model text,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  source text,
  referrer_host text
);

CREATE INDEX idx_usage_events_created_at ON public.usage_events(created_at DESC);
CREATE INDEX idx_usage_events_user ON public.usage_events(user_id, created_at DESC);
CREATE INDEX idx_usage_events_visitor ON public.usage_events(visitor_id, created_at DESC);

GRANT ALL ON public.usage_events TO service_role;
GRANT SELECT ON public.usage_events TO authenticated;

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read usage events"
  ON public.usage_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Aggregated analytics for admins only
CREATE OR REPLACE FUNCTION public.analytics_summary(_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  since timestamptz := now() - make_interval(days => greatest(1, least(_days, 365)));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM auth.users),
    'new_users', (SELECT count(*) FROM auth.users WHERE created_at >= since),
    'dau', (SELECT count(DISTINCT coalesce(user_id::text, visitor_id)) FROM usage_events WHERE created_at >= now() - interval '1 day'),
    'wau', (SELECT count(DISTINCT coalesce(user_id::text, visitor_id)) FROM usage_events WHERE created_at >= now() - interval '7 days'),
    'mau', (SELECT count(DISTINCT coalesce(user_id::text, visitor_id)) FROM usage_events WHERE created_at >= now() - interval '30 days'),
    'returning_users', (
      SELECT count(*) FROM (
        SELECT coalesce(user_id::text, visitor_id) AS k
        FROM usage_events WHERE created_at >= since AND coalesce(user_id::text, visitor_id) IS NOT NULL
        GROUP BY 1 HAVING count(DISTINCT date_trunc('day', created_at)) > 1
      ) r
    ),
    'total_messages', (SELECT count(*) FROM usage_events WHERE created_at >= since AND event_type = 'message'),
    'messages_per_user', (
      SELECT coalesce(round(avg(c), 2), 0) FROM (
        SELECT count(*) AS c FROM usage_events
        WHERE created_at >= since AND event_type = 'message' AND coalesce(user_id::text, visitor_id) IS NOT NULL
        GROUP BY coalesce(user_id::text, visitor_id)
      ) m
    ),
    'tokens_in', (SELECT coalesce(sum(prompt_tokens), 0) FROM usage_events WHERE created_at >= since),
    'tokens_out', (SELECT coalesce(sum(completion_tokens), 0) FROM usage_events WHERE created_at >= since),
    'cost_usd', (SELECT coalesce(round(sum(cost_usd), 4), 0) FROM usage_events WHERE created_at >= since),
    'daily', (
      SELECT coalesce(jsonb_agg(d ORDER BY d->>'day'), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'day', to_char(date_trunc('day', created_at), 'YYYY-MM-DD'),
          'users', count(DISTINCT coalesce(user_id::text, visitor_id)),
          'messages', count(*) FILTER (WHERE event_type = 'message'),
          'cost_usd', round(sum(cost_usd), 4)
        ) AS d
        FROM usage_events WHERE created_at >= since
        GROUP BY date_trunc('day', created_at)
      ) x
    ),
    'sources', (
      SELECT coalesce(jsonb_agg(s ORDER BY (s->>'visits')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'source', coalesce(nullif(source, ''), referrer_host, 'direct'),
          'visits', count(DISTINCT coalesce(user_id::text, visitor_id))
        ) AS s
        FROM usage_events WHERE created_at >= since
        GROUP BY coalesce(nullif(source, ''), referrer_host, 'direct')
        LIMIT 20
      ) y
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.analytics_summary(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.analytics_summary(integer) TO authenticated;