
-- =============== FINANCE ===============
CREATE TABLE public.finance_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('income','expense')),
  color text,
  icon text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_categories TO authenticated;
GRANT ALL ON public.finance_categories TO service_role;
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY fc_select ON public.finance_categories FOR SELECT TO authenticated USING (couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY fc_insert ON public.finance_categories FOR INSERT TO authenticated WITH CHECK (couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY fc_update ON public.finance_categories FOR UPDATE TO authenticated USING (couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY fc_delete ON public.finance_categories FOR DELETE TO authenticated USING (couple_id = public.user_couple_id(auth.uid()));

CREATE TABLE public.finance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL,
  created_by uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('income','expense')),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'USD',
  category text,
  note text,
  occurred_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ft_couple_date_idx ON public.finance_transactions (couple_id, occurred_on DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_transactions TO authenticated;
GRANT ALL ON public.finance_transactions TO service_role;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY ft_select ON public.finance_transactions FOR SELECT TO authenticated USING (couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY ft_insert ON public.finance_transactions FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY ft_update ON public.finance_transactions FOR UPDATE TO authenticated USING (couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY ft_delete ON public.finance_transactions FOR DELETE TO authenticated USING (couple_id = public.user_couple_id(auth.uid()));

CREATE TABLE public.savings_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  target_amount numeric(12,2) NOT NULL CHECK (target_amount > 0),
  current_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  deadline date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.savings_goals TO authenticated;
GRANT ALL ON public.savings_goals TO service_role;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY sg_select ON public.savings_goals FOR SELECT TO authenticated USING (couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY sg_insert ON public.savings_goals FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY sg_update ON public.savings_goals FOR UPDATE TO authenticated USING (couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY sg_delete ON public.savings_goals FOR DELETE TO authenticated USING (couple_id = public.user_couple_id(auth.uid()));
CREATE TRIGGER sg_updated_at BEFORE UPDATE ON public.savings_goals FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL,
  category text NOT NULL,
  monthly_limit numeric(12,2) NOT NULL CHECK (monthly_limit > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (couple_id, category)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT ALL ON public.budgets TO service_role;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY bg_select ON public.budgets FOR SELECT TO authenticated USING (couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY bg_insert ON public.budgets FOR INSERT TO authenticated WITH CHECK (couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY bg_update ON public.budgets FOR UPDATE TO authenticated USING (couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY bg_delete ON public.budgets FOR DELETE TO authenticated USING (couple_id = public.user_couple_id(auth.uid()));
CREATE TRIGGER bg_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =============== GOALS ===============
CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','archived')),
  progress int NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  target_date date,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY gl_select ON public.goals FOR SELECT TO authenticated USING (couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY gl_insert ON public.goals FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY gl_update ON public.goals FOR UPDATE TO authenticated USING (couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY gl_delete ON public.goals FOR DELETE TO authenticated USING (couple_id = public.user_couple_id(auth.uid()));
CREATE TRIGGER gl_updated_at BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.goal_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  couple_id uuid NOT NULL,
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gm_goal_idx ON public.goal_milestones (goal_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goal_milestones TO authenticated;
GRANT ALL ON public.goal_milestones TO service_role;
ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY gm_select ON public.goal_milestones FOR SELECT TO authenticated USING (couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY gm_insert ON public.goal_milestones FOR INSERT TO authenticated WITH CHECK (couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY gm_update ON public.goal_milestones FOR UPDATE TO authenticated USING (couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY gm_delete ON public.goal_milestones FOR DELETE TO authenticated USING (couple_id = public.user_couple_id(auth.uid()));

-- =============== CALENDAR ===============
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  location text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  all_day boolean NOT NULL DEFAULT false,
  event_type text NOT NULL DEFAULT 'event' CHECK (event_type IN ('event','anniversary','birthday','reminder')),
  recurrence text NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none','daily','weekly','monthly','yearly')),
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ce_couple_start_idx ON public.calendar_events (couple_id, starts_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY ce_select ON public.calendar_events FOR SELECT TO authenticated USING (couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY ce_insert ON public.calendar_events FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY ce_update ON public.calendar_events FOR UPDATE TO authenticated USING (couple_id = public.user_couple_id(auth.uid()));
CREATE POLICY ce_delete ON public.calendar_events FOR DELETE TO authenticated USING (couple_id = public.user_couple_id(auth.uid()));
CREATE TRIGGER ce_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =============== REALTIME ===============
ALTER PUBLICATION supabase_realtime ADD TABLE public.finance_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.savings_goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.budgets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.goal_milestones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
