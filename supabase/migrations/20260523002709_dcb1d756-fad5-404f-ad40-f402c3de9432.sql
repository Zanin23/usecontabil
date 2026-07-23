
-- Hot-path indexes for fast leaderboards, reporting, and recommendations.

-- Sessions: filtered by role_play_id constantly (leaderboard, stats, reporting)
CREATE INDEX IF NOT EXISTS sessions_role_play_idx
  ON public.sessions (role_play_id)
  WHERE role_play_id IS NOT NULL;

-- Leaderboard query: WHERE role_play_id=? AND status='scored' ORDER BY total_score DESC
CREATE INDEX IF NOT EXISTS sessions_leaderboard_idx
  ON public.sessions (role_play_id, status, total_score DESC)
  WHERE parent_session_id IS NULL;

-- Reporting: scan by ended_at / started_at
CREATE INDEX IF NOT EXISTS sessions_started_at_idx
  ON public.sessions (started_at DESC);

-- lesson_completions: popular_lessons groups by lesson_id, filters by completed_at
CREATE INDEX IF NOT EXISTS lesson_completions_lesson_idx
  ON public.lesson_completions (lesson_id);
CREATE INDEX IF NOT EXISTS lesson_completions_completed_at_idx
  ON public.lesson_completions (completed_at DESC);

-- Lock down recompute function: heavy, admin-only
REVOKE EXECUTE ON FUNCTION public.recompute_lesson_recommendations() FROM PUBLIC, anon, authenticated;
