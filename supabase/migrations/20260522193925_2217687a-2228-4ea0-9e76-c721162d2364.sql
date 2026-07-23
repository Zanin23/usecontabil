
CREATE TABLE public.lesson_role_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  role_play_id uuid NOT NULL REFERENCES public.role_plays(id) ON DELETE CASCADE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, role_play_id)
);
CREATE INDEX idx_lrp_lesson ON public.lesson_role_plays(lesson_id);
CREATE INDEX idx_lrp_role_play ON public.lesson_role_plays(role_play_id);

ALTER TABLE public.lesson_role_plays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lrp public read" ON public.lesson_role_plays FOR SELECT USING (true);
CREATE POLICY "lrp admin write" ON public.lesson_role_plays FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.link_suggestions (
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
CREATE INDEX idx_link_sug_source ON public.link_suggestions(source_type, source_id, status);
CREATE INDEX idx_link_sug_status ON public.link_suggestions(status);

ALTER TABLE public.link_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "link_sug public read" ON public.link_suggestions FOR SELECT USING (true);
CREATE POLICY "link_sug admin write" ON public.link_suggestions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER link_sug_updated_at BEFORE UPDATE ON public.link_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
