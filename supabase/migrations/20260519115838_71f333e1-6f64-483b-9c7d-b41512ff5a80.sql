
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles select own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profiles update own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Profiles insert own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sessions
CREATE TYPE public.difficulty_level AS ENUM ('easy', 'standard', 'hard');
CREATE TYPE public.session_status AS ENUM ('in_progress', 'completed', 'scored', 'abandoned');

CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  difficulty public.difficulty_level NOT NULL DEFAULT 'standard',
  agent_id TEXT,
  status public.session_status NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  transcript JSONB,
  total_score INT,
  scores JSONB,
  red_flags TEXT[],
  green_flags TEXT[],
  coaching_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sessions select own" ON public.sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Sessions insert own" ON public.sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Sessions update own" ON public.sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Sessions delete own" ON public.sessions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX sessions_user_started_idx ON public.sessions(user_id, started_at DESC);
