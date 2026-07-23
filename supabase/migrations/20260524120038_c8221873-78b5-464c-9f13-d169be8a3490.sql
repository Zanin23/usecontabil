-- Server-side popularity aggregation for role plays.
CREATE OR REPLACE FUNCTION public.role_play_popularity()
RETURNS TABLE(role_play_id uuid, sessions_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role_play_id, count(*)::bigint AS sessions_count
  FROM public.sessions
  WHERE role_play_id IS NOT NULL
    AND parent_session_id IS NULL
  GROUP BY role_play_id
$$;

GRANT EXECUTE ON FUNCTION public.role_play_popularity() TO anon, authenticated;

-- Hot-path indexes.
CREATE INDEX IF NOT EXISTS idx_sessions_role_play_id
  ON public.sessions (role_play_id)
  WHERE role_play_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_role_play_parent
  ON public.sessions (role_play_id, parent_session_id)
  WHERE role_play_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_user_started
  ON public.sessions (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_started_at
  ON public.sessions (started_at DESC);

CREATE INDEX IF NOT EXISTS idx_lesson_completions_lesson_completed
  ON public.lesson_completions (lesson_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_lesson_completions_user
  ON public.lesson_completions (user_id);

CREATE INDEX IF NOT EXISTS idx_lesson_views_user_lesson
  ON public.lesson_views (user_id, lesson_id);
