-- Lock down has_role: only used internally by policies/definer functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- analytics_summary stays callable by signed-in users (it enforces admin internally)
REVOKE EXECUTE ON FUNCTION public.analytics_summary(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_summary(integer) TO authenticated, service_role;

-- Make the fail-closed write posture explicit at the privilege level
REVOKE INSERT, UPDATE, DELETE ON public.usage_events FROM anon, authenticated;
REVOKE SELECT ON public.usage_events FROM anon;
GRANT SELECT ON public.usage_events TO authenticated;
GRANT ALL ON public.usage_events TO service_role;

REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;
REVOKE SELECT ON public.user_roles FROM anon;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Explicit deny policies so intent is documented and enforced by RLS too
CREATE POLICY "No client writes to usage_events" ON public.usage_events
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (false);

CREATE POLICY "No client writes to user_roles" ON public.user_roles
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (false);