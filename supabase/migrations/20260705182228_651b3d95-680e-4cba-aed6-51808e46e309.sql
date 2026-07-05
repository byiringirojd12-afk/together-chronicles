DO $$
DECLARE tbl text;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl);
  END LOOP;
END $$;

-- Execute grants on RPCs used from client
GRANT EXECUTE ON FUNCTION public.create_couple(text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pair_with_code(text) TO authenticated;