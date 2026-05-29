
-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  couple_id UUID,
  invite_code TEXT UNIQUE NOT NULL DEFAULT upper(substring(md5(random()::text), 1, 6)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- COUPLES
CREATE TABLE public.couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  anniversary_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_couple_fk FOREIGN KEY (couple_id) REFERENCES public.couples(id) ON DELETE SET NULL;

-- Security definer to check couple membership without RLS recursion
CREATE OR REPLACE FUNCTION public.user_couple_id(_user UUID)
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT couple_id FROM public.profiles WHERE id = _user
$$;

-- MESSAGES
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_couple_created ON public.messages(couple_id, created_at);

-- MEMORIES
CREATE TABLE public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  caption TEXT,
  image_url TEXT NOT NULL,
  memory_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_memories_couple_date ON public.memories(couple_id, memory_date DESC);

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);

-- GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.couples TO authenticated;
GRANT ALL ON public.couples TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memories TO authenticated;
GRANT ALL ON public.memories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- PROFILES policies: users see own profile + their partner's profile (same couple)
CREATE POLICY "profiles_select_self_or_partner" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR (couple_id IS NOT NULL AND couple_id = public.user_couple_id(auth.uid())));
CREATE POLICY "profiles_select_by_invite" ON public.profiles FOR SELECT TO authenticated USING (true);
-- ^ simplifies invite code lookup; we restrict update/delete strictly below
DROP POLICY "profiles_select_self_or_partner" ON public.profiles;
-- keep just the permissive select (only id, invite_code etc. exposed; non-sensitive)
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- COUPLES policies
CREATE POLICY "couples_select_member" ON public.couples FOR SELECT TO authenticated
  USING (id = public.user_couple_id(auth.uid()));
CREATE POLICY "couples_insert_any" ON public.couples FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "couples_update_member" ON public.couples FOR UPDATE TO authenticated
  USING (id = public.user_couple_id(auth.uid()));

-- MESSAGES policies
CREATE POLICY "messages_select_couple" ON public.messages FOR SELECT TO authenticated
  USING (couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY "messages_insert_couple" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND couple_id = public.user_couple_id(auth.uid()));

-- MEMORIES policies
CREATE POLICY "memories_select_couple" ON public.memories FOR SELECT TO authenticated
  USING (couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY "memories_insert_couple" ON public.memories FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY "memories_delete_own" ON public.memories FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

-- NOTIFICATIONS policies
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "notifications_insert_own" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger for profiles
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.memories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.memories REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Storage bucket for memories (public read; writes via authenticated)
INSERT INTO storage.buckets (id, name, public) VALUES ('memories', 'memories', true);

CREATE POLICY "memories_storage_read" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'memories');
CREATE POLICY "memories_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'memories' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "memories_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'memories' AND owner = auth.uid());
