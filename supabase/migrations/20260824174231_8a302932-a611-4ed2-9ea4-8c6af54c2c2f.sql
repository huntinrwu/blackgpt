REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.analytics_summary(integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.analytics_summary(integer) TO authenticated;