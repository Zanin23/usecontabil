CREATE TABLE public.learning_progress (
  user_id uuid NOT NULL,
  licao_slug text NOT NULL,
  status text NOT NULL DEFAULT 'vista',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, licao_slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_progress TO authenticated;
GRANT ALL ON public.learning_progress TO service_role;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "learning progress own" ON public.learning_progress FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());