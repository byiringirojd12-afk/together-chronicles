
-- =========================================================
-- PHASE 2 — Memory, Chat, Location
-- =========================================================

-- ---------- MEMORIES upgrades ----------
ALTER TABLE public.memories
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- allow owner to UPDATE captions/title/category
DROP POLICY IF EXISTS memories_update_own ON public.memories;
CREATE POLICY memories_update_own ON public.memories
  FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

DROP TRIGGER IF EXISTS memories_set_updated_at ON public.memories;
CREATE TRIGGER memories_set_updated_at BEFORE UPDATE ON public.memories
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- memory_favorites ----------
CREATE TABLE IF NOT EXISTS public.memory_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id uuid NOT NULL,
  user_id uuid NOT NULL,
  couple_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (memory_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memory_favorites TO authenticated;
GRANT ALL ON public.memory_favorites TO service_role;
ALTER TABLE public.memory_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY mf_select ON public.memory_favorites FOR SELECT TO authenticated
  USING (couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY mf_insert ON public.memory_favorites FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY mf_delete ON public.memory_favorites FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------- memory_categories ----------
CREATE TABLE IF NOT EXISTS public.memory_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL,
  name text NOT NULL,
  color text,
  icon text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memory_categories TO authenticated;
GRANT ALL ON public.memory_categories TO service_role;
ALTER TABLE public.memory_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY mc_select ON public.memory_categories FOR SELECT TO authenticated
  USING (couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY mc_insert ON public.memory_categories FOR INSERT TO authenticated
  WITH CHECK (couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY mc_update ON public.memory_categories FOR UPDATE TO authenticated
  USING (couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY mc_delete ON public.memory_categories FOR DELETE TO authenticated
  USING (couple_id = public.user_couple_id(auth.uid()));

-- ---------- MESSAGES upgrades ----------
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS reply_to_id uuid,
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

ALTER TABLE public.messages ALTER COLUMN content DROP NOT NULL;

DROP POLICY IF EXISTS messages_update_couple ON public.messages;
CREATE POLICY messages_update_couple ON public.messages
  FOR UPDATE TO authenticated
  USING (couple_id = public.user_couple_id(auth.uid()))
  WITH CHECK (couple_id = public.user_couple_id(auth.uid()));

CREATE INDEX IF NOT EXISTS messages_couple_created_idx ON public.messages(couple_id, created_at DESC);

-- ---------- LOCATION ----------
CREATE TABLE IF NOT EXISTS public.location_settings (
  user_id uuid PRIMARY KEY,
  sharing_enabled boolean NOT NULL DEFAULT false,
  share_mode text NOT NULL DEFAULT 'until_off', -- until_off | timed | paused
  share_until timestamptz,
  arrival_notify boolean NOT NULL DEFAULT true,
  departure_notify boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.location_settings TO authenticated;
GRANT ALL ON public.location_settings TO service_role;
ALTER TABLE public.location_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY ls_select_own ON public.location_settings FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY ls_insert_own ON public.location_settings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY ls_update_own ON public.location_settings FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.locations (
  user_id uuid PRIMARY KEY,
  couple_id uuid NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy double precision,
  heading double precision,
  speed double precision,
  battery integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
-- Partner can see your location ONLY when sharing is active
CREATE OR REPLACE FUNCTION public.is_sharing_active(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT sharing_enabled
       AND share_mode <> 'paused'
       AND (share_until IS NULL OR share_until > now())
     FROM public.location_settings WHERE user_id = _user), false)
$$;

CREATE POLICY loc_select ON public.locations FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (couple_id = public.user_couple_id(auth.uid()) AND public.is_sharing_active(user_id))
  );
CREATE POLICY loc_upsert_own_ins ON public.locations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY loc_upsert_own_upd ON public.locations FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY loc_delete_own ON public.locations FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.saved_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL,
  created_by uuid NOT NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'custom', -- home | work | custom
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  radius_m integer NOT NULL DEFAULT 150,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_places TO authenticated;
GRANT ALL ON public.saved_places TO service_role;
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;
CREATE POLICY sp_select ON public.saved_places FOR SELECT TO authenticated
  USING (couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY sp_insert ON public.saved_places FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY sp_update ON public.saved_places FOR UPDATE TO authenticated
  USING (couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY sp_delete ON public.saved_places FOR DELETE TO authenticated
  USING (couple_id = public.user_couple_id(auth.uid()));

CREATE TABLE IF NOT EXISTS public.location_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL,
  user_id uuid NOT NULL,
  place_id uuid,
  place_name text,
  event_type text NOT NULL, -- arrival | departure
  occurred_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.location_events TO authenticated;
GRANT ALL ON public.location_events TO service_role;
ALTER TABLE public.location_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY le_select ON public.location_events FOR SELECT TO authenticated
  USING (couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY le_insert ON public.location_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND couple_id = public.user_couple_id(auth.uid()));

-- ---------- Realtime ----------
ALTER PUBLICATION supabase_realtime ADD TABLE public.memory_favorites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.memory_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.location_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_places;
ALTER PUBLICATION supabase_realtime ADD TABLE public.location_events;

ALTER TABLE public.locations REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
