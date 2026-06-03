
-- chat-media bucket policies (path: {couple_id}/{filename})
CREATE POLICY chat_media_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = public.user_couple_id(auth.uid())::text
  );
CREATE POLICY chat_media_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = public.user_couple_id(auth.uid())::text
    AND owner = auth.uid()
  );
CREATE POLICY chat_media_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-media' AND owner = auth.uid());
