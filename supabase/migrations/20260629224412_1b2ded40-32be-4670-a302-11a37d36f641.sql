
CREATE TABLE public.pencil_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  display_name text NOT NULL,
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  headline text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pencil_scores TO anon, authenticated;
GRANT ALL ON public.pencil_scores TO service_role;
ALTER TABLE public.pencil_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view pencil scores" ON public.pencil_scores FOR SELECT USING (true);
CREATE INDEX pencil_scores_score_idx ON public.pencil_scores (score DESC, created_at ASC);
