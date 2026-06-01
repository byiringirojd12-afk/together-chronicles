
-- Tighten profiles SELECT: only self + same couple. pair_with_code RPC is SECURITY DEFINER so invite-code lookup still works.
DROP POLICY IF EXISTS profiles_select_by_invite ON public.profiles;
CREATE POLICY profiles_select_self_or_partner ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (couple_id IS NOT NULL AND couple_id = public.user_couple_id(auth.uid()))
  );

-- Attach the missing trigger so notification_preferences is auto-created when a profile is inserted.
DROP TRIGGER IF EXISTS on_profile_created_prefs ON public.profiles;
CREATE TRIGGER on_profile_created_prefs
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_prefs();

-- Backfill any existing profiles missing a prefs row (defensive).
INSERT INTO public.notification_preferences (user_id)
SELECT p.id FROM public.profiles p
LEFT JOIN public.notification_preferences np ON np.user_id = p.id
WHERE np.user_id IS NULL;
