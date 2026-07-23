
-- ============================================================================
-- Recovery migration: rebuild Learn (tracks/paths/lessons), knowledge,
-- assignments, views, recommendations and related functions that were dropped
-- from the database. Idempotent: safe to re-run.
-- ============================================================================

-- knowledge_docs ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.knowledge_docs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.knowledge_docs TO authenticated;
GRANT ALL ON public.knowledge_docs TO service_role;
ALTER TABLE public.knowledge_docs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Knowledge docs public read" ON public.knowledge_docs;
CREATE POLICY "Knowledge docs public read" ON public.knowledge_docs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Knowledge docs admin insert" ON public.knowledge_docs;
CREATE POLICY "Knowledge docs admin insert" ON public.knowledge_docs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Knowledge docs admin update" ON public.knowledge_docs;
CREATE POLICY "Knowledge docs admin update" ON public.knowledge_docs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Knowledge docs admin delete" ON public.knowledge_docs;
CREATE POLICY "Knowledge docs admin delete" ON public.knowledge_docs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS knowledge_docs_set_updated_at ON public.knowledge_docs;
CREATE TRIGGER knowledge_docs_set_updated_at BEFORE UPDATE ON public.knowledge_docs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.knowledge_docs (slug, title, content)
VALUES ('global','Global knowledge','') ON CONFLICT (slug) DO NOTHING;

-- tracks --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  badge_label text,
  order_index int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tracks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tracks TO authenticated;
GRANT ALL ON public.tracks TO service_role;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tracks public read" ON public.tracks;
CREATE POLICY "tracks public read" ON public.tracks FOR SELECT
  USING (is_published OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "tracks admin write" ON public.tracks;
CREATE POLICY "tracks admin write" ON public.tracks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- learning_paths ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learning_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (track_id, slug)
);
GRANT SELECT ON public.learning_paths TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.learning_paths TO authenticated;
GRANT ALL ON public.learning_paths TO service_role;
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "paths public read" ON public.learning_paths;
CREATE POLICY "paths public read" ON public.learning_paths FOR SELECT USING (true);
DROP POLICY IF EXISTS "paths admin write" ON public.learning_paths;
CREATE POLICY "paths admin write" ON public.learning_paths FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- lessons -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id uuid NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  blurb text NOT NULL DEFAULT '',
  embed_url text NOT NULL DEFAULT '',
  thumbnail_url text,
  tags text[] NOT NULL DEFAULT '{}',
  est_minutes int NOT NULL DEFAULT 5,
  order_index int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  slides jsonb NOT NULL DEFAULT '[]'::jsonb,
  component_key text,
  lesson_content jsonb,
  UNIQUE (path_id, slug)
);
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS slides jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS component_key text;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS lesson_content jsonb;
GRANT SELECT ON public.lessons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lessons public read" ON public.lessons;
CREATE POLICY "lessons public read" ON public.lessons FOR SELECT
  USING (is_published OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "lessons admin write" ON public.lessons;
CREATE POLICY "lessons admin write" ON public.lessons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS lessons_set_updated_at ON public.lessons;
CREATE TRIGGER lessons_set_updated_at BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- lesson_completions --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lesson_completions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_completions TO authenticated;
GRANT ALL ON public.lesson_completions TO service_role;
ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "completions select own" ON public.lesson_completions;
CREATE POLICY "completions select own" ON public.lesson_completions FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "completions insert own" ON public.lesson_completions;
CREATE POLICY "completions insert own" ON public.lesson_completions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "completions delete own" ON public.lesson_completions;
CREATE POLICY "completions delete own" ON public.lesson_completions FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS lesson_completions_lesson_idx ON public.lesson_completions (lesson_id);
CREATE INDEX IF NOT EXISTS lesson_completions_completed_at_idx ON public.lesson_completions (completed_at DESC);

-- lesson_role_plays ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lesson_role_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  role_play_id uuid NOT NULL REFERENCES public.role_plays(id) ON DELETE CASCADE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, role_play_id)
);
GRANT SELECT ON public.lesson_role_plays TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lesson_role_plays TO authenticated;
GRANT ALL ON public.lesson_role_plays TO service_role;
CREATE INDEX IF NOT EXISTS idx_lrp_lesson ON public.lesson_role_plays(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lrp_role_play ON public.lesson_role_plays(role_play_id);
ALTER TABLE public.lesson_role_plays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lrp public read" ON public.lesson_role_plays;
CREATE POLICY "lrp public read" ON public.lesson_role_plays FOR SELECT USING (true);
DROP POLICY IF EXISTS "lrp admin write" ON public.lesson_role_plays;
CREATE POLICY "lrp admin write" ON public.lesson_role_plays FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- link_suggestions ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.link_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('lesson','role_play')),
  source_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('lesson','role_play')),
  target_id uuid NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  rationale text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id, target_type, target_id)
);
GRANT SELECT ON public.link_suggestions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.link_suggestions TO authenticated;
GRANT ALL ON public.link_suggestions TO service_role;
CREATE INDEX IF NOT EXISTS idx_link_sug_source ON public.link_suggestions(source_type, source_id, status);
CREATE INDEX IF NOT EXISTS idx_link_sug_status ON public.link_suggestions(status);
ALTER TABLE public.link_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "link_sug public read" ON public.link_suggestions;
CREATE POLICY "link_sug public read" ON public.link_suggestions FOR SELECT USING (true);
DROP POLICY IF EXISTS "link_sug admin write" ON public.link_suggestions;
CREATE POLICY "link_sug admin write" ON public.link_suggestions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS link_sug_updated_at ON public.link_suggestions;
CREATE TRIGGER link_sug_updated_at BEFORE UPDATE ON public.link_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- lesson_views --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lesson_views (
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  first_viewed_at timestamptz NOT NULL DEFAULT now(),
  last_viewed_at timestamptz NOT NULL DEFAULT now(),
  total_seconds integer NOT NULL DEFAULT 0,
  view_count integer NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_views TO authenticated;
GRANT ALL ON public.lesson_views TO service_role;
ALTER TABLE public.lesson_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lv select own" ON public.lesson_views;
CREATE POLICY "lv select own" ON public.lesson_views FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "lv insert own" ON public.lesson_views;
CREATE POLICY "lv insert own" ON public.lesson_views FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "lv update own" ON public.lesson_views;
CREATE POLICY "lv update own" ON public.lesson_views FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "lv delete own" ON public.lesson_views;
CREATE POLICY "lv delete own" ON public.lesson_views FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS lesson_views_user_last_idx ON public.lesson_views(user_id, last_viewed_at DESC);

-- user_state ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_state (
  user_id uuid PRIMARY KEY,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  streak_days integer NOT NULL DEFAULT 0,
  streak_last_day date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_state TO authenticated;
GRANT ALL ON public.user_state TO service_role;
ALTER TABLE public.user_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "us select own" ON public.user_state;
CREATE POLICY "us select own" ON public.user_state FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "us insert own" ON public.user_state;
CREATE POLICY "us insert own" ON public.user_state FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "us update own" ON public.user_state;
CREATE POLICY "us update own" ON public.user_state FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- lesson_recommendations ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lesson_recommendations (
  lesson_id uuid NOT NULL,
  recommended_lesson_id uuid NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lesson_id, recommended_lesson_id)
);
GRANT SELECT ON public.lesson_recommendations TO anon, authenticated;
GRANT ALL ON public.lesson_recommendations TO service_role;
ALTER TABLE public.lesson_recommendations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lr public read" ON public.lesson_recommendations;
CREATE POLICY "lr public read" ON public.lesson_recommendations FOR SELECT USING (true);

-- assignments --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('lesson','path','track')),
  target_id uuid NOT NULL,
  assigned_by uuid,
  due_at timestamptz,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated;
GRANT ALL ON public.assignments TO service_role;
CREATE INDEX IF NOT EXISTS assignments_user_idx ON public.assignments(user_id);
CREATE INDEX IF NOT EXISTS assignments_target_idx ON public.assignments(target_type, target_id);
CREATE UNIQUE INDEX IF NOT EXISTS assignments_unique ON public.assignments(user_id, target_type, target_id);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assignments select own or admin" ON public.assignments;
CREATE POLICY "assignments select own or admin" ON public.assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "assignments admin insert" ON public.assignments;
CREATE POLICY "assignments admin insert" ON public.assignments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "assignments admin update" ON public.assignments;
CREATE POLICY "assignments admin update" ON public.assignments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "assignments admin delete" ON public.assignments;
CREATE POLICY "assignments admin delete" ON public.assignments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- Functions ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.popular_lessons(_limit integer DEFAULT 12)
RETURNS TABLE(lesson_id uuid, completions bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT lesson_id, count(*)::bigint AS completions
  FROM public.lesson_completions
  WHERE completed_at > now() - interval '30 days'
  GROUP BY lesson_id
  ORDER BY completions DESC
  LIMIT GREATEST(1, LEAST(_limit, 50))
$$;

CREATE OR REPLACE FUNCTION public.recompute_lesson_recommendations()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.lesson_recommendations;
  INSERT INTO public.lesson_recommendations (lesson_id, recommended_lesson_id, score, computed_at)
  SELECT a.lesson_id, b.lesson_id, count(*)::numeric, now()
  FROM public.lesson_completions a
  JOIN public.lesson_completions b
    ON a.user_id = b.user_id AND a.lesson_id <> b.lesson_id
  GROUP BY a.lesson_id, b.lesson_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.recompute_lesson_recommendations() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.touch_user_streak()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  today date := (NEW.completed_at AT TIME ZONE 'UTC')::date;
  existing public.user_state%ROWTYPE;
  new_streak integer := 1;
BEGIN
  SELECT * INTO existing FROM public.user_state WHERE user_id = NEW.user_id;
  IF FOUND THEN
    IF existing.streak_last_day = today THEN new_streak := existing.streak_days;
    ELSIF existing.streak_last_day = today - 1 THEN new_streak := existing.streak_days + 1;
    ELSE new_streak := 1;
    END IF;
    UPDATE public.user_state
      SET streak_days = new_streak, streak_last_day = today,
          last_seen_at = now(), updated_at = now()
      WHERE user_id = NEW.user_id;
  ELSE
    INSERT INTO public.user_state (user_id, last_seen_at, streak_days, streak_last_day)
      VALUES (NEW.user_id, now(), 1, today);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS lesson_completions_touch_streak ON public.lesson_completions;
CREATE TRIGGER lesson_completions_touch_streak
AFTER INSERT ON public.lesson_completions
FOR EACH ROW EXECUTE FUNCTION public.touch_user_streak();

CREATE OR REPLACE FUNCTION public.admin_lesson_completions()
RETURNS TABLE(user_id uuid, lesson_id uuid, completed_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id, lesson_id, completed_at FROM public.lesson_completions
  WHERE public.has_role(auth.uid(),'admin')
$$;

CREATE OR REPLACE FUNCTION public.bump_lesson_view(_lesson_id uuid, _add_seconds integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _add integer := GREATEST(0, COALESCE(_add_seconds, 0));
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  INSERT INTO public.lesson_views (user_id, lesson_id, total_seconds, view_count, first_viewed_at, last_viewed_at)
  VALUES (_uid, _lesson_id, _add, 1, now(), now())
  ON CONFLICT (user_id, lesson_id) DO UPDATE
    SET total_seconds = public.lesson_views.total_seconds + EXCLUDED.total_seconds,
        last_viewed_at = now();
END;
$$;
GRANT EXECUTE ON FUNCTION public.bump_lesson_view(uuid, integer) TO authenticated;

-- Seed onboarding track + paths --------------------------------------------
INSERT INTO public.tracks (slug, title, description, badge_label, order_index)
VALUES ('onboarding','Onboarding','Everything a new hire needs to sell Lovable in the enterprise.','Best for new hires',0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.learning_paths (track_id, slug, title, description, icon, order_index)
SELECT t.id, p.slug, p.title, p.description, p.icon, p.order_index
FROM public.tracks t,
  (VALUES
    ('know-the-market','Know the Market','What Lovable actually is, the two enterprise use cases (prototyping + internal apps), how to demo it credibly, and how to build live in a call. Prerequisite for everything else.','Compass',0),
    ('find-the-fire','Find the Fire','The core discovery skill. The first question, the two branches (fan vs. light), the three buyer archetypes, Three Whys.','Flame',1),
    ('know-the-buyer','Know the Buyer','Enterprise persona profiles, product/innovation-oriented leader vs. IT buyer, AI mandate vs. shadow IT expansion deals.','Users',2),
    ('run-the-deal','Run the Deal','Buying-aligned stages, champion development, mutual action plans, a business case that survives a room you''re not in.','Briefcase',3),
    ('navigate-the-machine','Navigate the Machine','Procurement, legal, security review, vendor risk assessment, IT stakeholders. What to expect, when, and how to get ahead of it.','Settings',4),
    ('work-ai-native','Work AI-Native','Tools and workflows, AI in the actual sales motion. WhisperFlow, the roleplay app, prep and follow-up.','Sparkles',5)
  ) AS p(slug, title, description, icon, order_index)
WHERE t.slug = 'onboarding'
ON CONFLICT (track_id, slug) DO NOTHING;
