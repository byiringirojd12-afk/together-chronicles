
-- 1. Remove overly permissive UPDATE policy on messages; keep sender/partner-scoped ones
DROP POLICY IF EXISTS messages_update_couple ON public.messages;

-- 2. Tighten realtime.messages SELECT policy: exact-segment match instead of substring LIKE
DROP POLICY IF EXISTS "Authenticated can read own topic messages" ON realtime.messages;
CREATE POLICY "Authenticated can read own topic messages"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    split_part(realtime.topic(), ':', 2) = (auth.uid())::text
    OR (
      public.user_couple_id(auth.uid()) IS NOT NULL
      AND split_part(realtime.topic(), ':', 2) = (public.user_couple_id(auth.uid()))::text
    )
  );
