REVOKE EXECUTE ON FUNCTION public.analytics_summary(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_summary(integer) TO service_role;