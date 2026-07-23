
CREATE TABLE IF NOT EXISTS public.app_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  voice_mode text NOT NULL DEFAULT 'browser' CHECK (voice_mode IN ('browser','elevenlabs')),
  default_voice_id text NOT NULL DEFAULT 'EXAVITQu4vr4xnSDxMaL',
  onboarded_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_settings public read"
  ON public.app_settings FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "app_settings admin insert"
  ON public.app_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "app_settings admin update"
  ON public.app_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

-- Drop lessons-related artifacts (template strip-down)
DROP TABLE IF EXISTS public.lesson_recommendations CASCADE;
DROP TABLE IF EXISTS public.lesson_role_plays CASCADE;
DROP TABLE IF EXISTS public.lesson_views CASCADE;
DROP TABLE IF EXISTS public.lesson_completions CASCADE;
DROP TABLE IF EXISTS public.lessons CASCADE;
DROP TABLE IF EXISTS public.learning_paths CASCADE;
DROP TABLE IF EXISTS public.tracks CASCADE;
DROP TABLE IF EXISTS public.assignments CASCADE;
DROP TABLE IF EXISTS public.link_suggestions CASCADE;
DROP FUNCTION IF EXISTS public.recompute_lesson_recommendations() CASCADE;
DROP FUNCTION IF EXISTS public.admin_lesson_completions() CASCADE;
DROP FUNCTION IF EXISTS public.popular_lessons(integer) CASCADE;
DROP FUNCTION IF EXISTS public.bump_lesson_view(uuid,integer) CASCADE;
