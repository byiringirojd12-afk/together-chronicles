DO $$
DECLARE tbl record;
BEGIN
  FOR tbl IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname='public'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.relname);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.relname);
  END LOOP;
END $$;

GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.create_couple(text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pair_with_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_couple_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_sharing_active(uuid) TO authenticated;