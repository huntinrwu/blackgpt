CREATE OR REPLACE FUNCTION public.analytics_summary(_days integer DEFAULT 30, _caller uuid DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  since timestamptz := now() - make_interval(days => greatest(1, least(_days, 365)));
  caller uuid := coalesce(_caller, auth.uid());
BEGIN
  IF NOT public.has_role(caller, 'admin') THEN
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
$function$;

REVOKE EXECUTE ON FUNCTION public.analytics_summary(integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_summary(integer, uuid) TO service_role;
DROP FUNCTION IF EXISTS public.analytics_summary(integer);