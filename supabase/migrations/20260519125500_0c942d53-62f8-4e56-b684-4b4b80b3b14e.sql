
ALTER TABLE public.sessions ALTER COLUMN user_id DROP NOT NULL;

DROP POLICY IF EXISTS "Sessions select own" ON public.sessions;
DROP POLICY IF EXISTS "Sessions insert own" ON public.sessions;
DROP POLICY IF EXISTS "Sessions update own" ON public.sessions;
DROP POLICY IF EXISTS "Sessions delete own" ON public.sessions;

CREATE POLICY "Sessions public select" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Sessions public insert" ON public.sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Sessions public update" ON public.sessions FOR UPDATE USING (true);
CREATE POLICY "Sessions public delete" ON public.sessions FOR DELETE USING (true);
