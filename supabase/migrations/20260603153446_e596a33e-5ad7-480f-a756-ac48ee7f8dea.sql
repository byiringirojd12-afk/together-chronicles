
REVOKE EXECUTE ON FUNCTION public.is_sharing_active(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_sharing_active(uuid) TO service_role;
