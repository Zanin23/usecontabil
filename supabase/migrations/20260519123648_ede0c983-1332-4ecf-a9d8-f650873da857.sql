ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS self_assessment jsonb,
  ADD COLUMN IF NOT EXISTS live_scores jsonb;