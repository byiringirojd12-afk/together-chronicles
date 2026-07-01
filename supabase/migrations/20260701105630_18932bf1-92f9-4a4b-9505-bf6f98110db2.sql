
-- 1. Move pg_net out of public (requires drop+create; extension does not support SET SCHEMA)
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;

-- 2. Lock down SECURITY DEFINER helpers.
REVOKE EXECUTE ON FUNCTION public.user_couple_id(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_sharing_active(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_profile_prefs() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_messages_partner_read_only() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.create_couple(text, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.pair_with_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_couple(text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pair_with_code(text) TO authenticated;

-- 3. Storage UPDATE policies restricted to file owner
DROP POLICY IF EXISTS chat_media_update ON storage.objects;
CREATE POLICY chat_media_update ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'chat-media' AND owner = auth.uid())
WITH CHECK (bucket_id = 'chat-media' AND owner = auth.uid());

DROP POLICY IF EXISTS memories_storage_update ON storage.objects;
CREATE POLICY memories_storage_update ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'memories' AND owner = auth.uid())
WITH CHECK (bucket_id = 'memories' AND owner = auth.uid());

-- 4. Tighten memories delete to require couple membership on referenced memory
DROP POLICY IF EXISTS memories_storage_delete ON storage.objects;
CREATE POLICY memories_storage_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'memories'
  AND owner = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.memories m
    WHERE m.couple_id = public.user_couple_id(auth.uid())
      AND (
        m.image_url LIKE '%' || storage.objects.name
        OR m.video_url LIKE '%' || storage.objects.name
      )
  )
);

-- 5. Realtime channel subscriptions scoped to caller's couple or uid
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read own topic messages" ON realtime.messages;
CREATE POLICY "Authenticated can read own topic messages"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE '%' || auth.uid()::text || '%'
  OR (
    public.user_couple_id(auth.uid()) IS NOT NULL
    AND realtime.topic() LIKE '%' || public.user_couple_id(auth.uid())::text || '%'
  )
);
