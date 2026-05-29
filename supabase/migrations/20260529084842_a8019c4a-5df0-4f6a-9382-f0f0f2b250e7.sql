
-- 1. Replace permissive couples insert with security-definer RPCs
DROP POLICY IF EXISTS "couples_insert_any" ON public.couples;

CREATE OR REPLACE FUNCTION public.create_couple(_name TEXT, _anniversary DATE)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_couple_id UUID;
  current_couple UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT couple_id INTO current_couple FROM public.profiles WHERE id = auth.uid();
  IF current_couple IS NOT NULL THEN RAISE EXCEPTION 'Already in a couple'; END IF;
  INSERT INTO public.couples (name, anniversary_date) VALUES (_name, _anniversary) RETURNING id INTO new_couple_id;
  UPDATE public.profiles SET couple_id = new_couple_id WHERE id = auth.uid();
  RETURN new_couple_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.pair_with_code(_code TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  partner_record RECORD;
  current_couple UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT couple_id INTO current_couple FROM public.profiles WHERE id = auth.uid();
  IF current_couple IS NOT NULL THEN RAISE EXCEPTION 'Already in a couple'; END IF;

  SELECT id, couple_id INTO partner_record FROM public.profiles WHERE invite_code = upper(_code) AND id <> auth.uid();
  IF partner_record IS NULL THEN RAISE EXCEPTION 'Invite code not found'; END IF;

  IF partner_record.couple_id IS NULL THEN
    INSERT INTO public.couples (name) VALUES ('Us') RETURNING id INTO current_couple;
    UPDATE public.profiles SET couple_id = current_couple WHERE id IN (auth.uid(), partner_record.id);
  ELSE
    UPDATE public.profiles SET couple_id = partner_record.couple_id WHERE id = auth.uid();
    current_couple := partner_record.couple_id;
  END IF;
  RETURN current_couple;
END;
$$;

-- 2. Lock down function execution
REVOKE EXECUTE ON FUNCTION public.user_couple_id(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_couple(TEXT, DATE) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.pair_with_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_couple(TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pair_with_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_couple_id(UUID) TO authenticated;

-- handle_new_user / tg_set_updated_at are trigger-only
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;

-- 3. Fix search_path on tg_set_updated_at
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;

-- 4. Drop overly-broad storage SELECT policy on public bucket (public buckets are readable via CDN getPublicUrl regardless of RLS)
DROP POLICY IF EXISTS "memories_storage_read" ON storage.objects;
