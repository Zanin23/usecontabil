ALTER TABLE public.role_plays ADD COLUMN IF NOT EXISTS category text;
CREATE INDEX IF NOT EXISTS idx_role_plays_category ON public.role_plays(category);