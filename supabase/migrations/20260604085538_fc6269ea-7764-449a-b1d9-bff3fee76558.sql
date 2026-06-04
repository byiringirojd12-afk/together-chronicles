
-- 1. Split messages UPDATE policy
DROP POLICY IF EXISTS "Couple can update messages" ON public.messages;
DROP POLICY IF EXISTS "messages_update" ON public.messages;
DROP POLICY IF EXISTS "Users can update couple messages" ON public.messages;

CREATE POLICY "Sender can edit own messages"
ON public.messages FOR UPDATE TO authenticated
USING (sender_id = auth.uid() AND couple_id = public.user_couple_id(auth.uid()))
WITH CHECK (sender_id = auth.uid() AND couple_id = public.user_couple_id(auth.uid()));

-- Partner read-receipt updates: enforce via trigger that only read_at may change
CREATE OR REPLACE FUNCTION public.tg_messages_partner_read_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_id <> auth.uid() THEN
    IF NEW.content IS DISTINCT FROM OLD.content
       OR NEW.image_url IS DISTINCT FROM OLD.image_url
       OR NEW.reply_to_id IS DISTINCT FROM OLD.reply_to_id
       OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
       OR NEW.couple_id IS DISTINCT FROM OLD.couple_id
       OR NEW.edited_at IS DISTINCT FROM OLD.edited_at
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Partners may only update read_at';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_partner_read_only ON public.messages;
CREATE TRIGGER messages_partner_read_only
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.tg_messages_partner_read_only();

CREATE POLICY "Partner can mark read"
ON public.messages FOR UPDATE TO authenticated
USING (sender_id <> auth.uid() AND couple_id = public.user_couple_id(auth.uid()))
WITH CHECK (couple_id = public.user_couple_id(auth.uid()));

-- 2. Revoke anon defense-in-depth on couple-scoped tables
REVOKE ALL ON public.memories FROM anon;
REVOKE ALL ON public.memory_favorites FROM anon;
REVOKE ALL ON public.memory_categories FROM anon;
REVOKE ALL ON public.messages FROM anon;
REVOKE ALL ON public.locations FROM anon;
REVOKE ALL ON public.location_settings FROM anon;
REVOKE ALL ON public.location_events FROM anon;
REVOKE ALL ON public.saved_places FROM anon;

-- 3. Memories storage bucket: replace public-read with couple-scoped signed access
DROP POLICY IF EXISTS "Public read memories" ON storage.objects;
DROP POLICY IF EXISTS "memories public read" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read memories" ON storage.objects;

CREATE POLICY "Couple can read memory media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'memories'
  AND EXISTS (
    SELECT 1 FROM public.memories m
    WHERE m.couple_id = public.user_couple_id(auth.uid())
      AND (
        m.image_url LIKE '%/' || name
        OR m.video_url LIKE '%/' || name
        OR m.image_url LIKE '%' || name
        OR m.video_url LIKE '%' || name
      )
  )
);
