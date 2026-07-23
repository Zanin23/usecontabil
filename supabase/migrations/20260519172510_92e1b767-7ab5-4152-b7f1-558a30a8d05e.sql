
-- Convert existing /25 totals to /100 (legacy rows only)
UPDATE public.sessions
SET total_score = LEAST(100, ROUND(total_score::numeric * 4))
WHERE total_score IS NOT NULL AND total_score <= 25;

-- Leaderboard RPC: returns top scored sessions for a role-play with display names.
-- SECURITY DEFINER so it can read profiles.display_name without exposing the full profiles table via RLS.
CREATE OR REPLACE FUNCTION public.role_play_leaderboard(_role_play_id uuid, _limit int DEFAULT 25)
RETURNS TABLE (
  session_id uuid,
  user_id uuid,
  display_name text,
  total_score int,
  difficulty text,
  duration_seconds int,
  ended_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id AS session_id,
    s.user_id,
    COALESCE(p.display_name, 'Anonymous') AS display_name,
    s.total_score,
    s.difficulty::text,
    s.duration_seconds,
    COALESCE(s.ended_at, s.started_at) AS ended_at
  FROM public.sessions s
  LEFT JOIN public.profiles p ON p.id = s.user_id
  WHERE s.role_play_id = _role_play_id
    AND s.status = 'scored'
    AND s.total_score IS NOT NULL
  ORDER BY s.total_score DESC, COALESCE(s.ended_at, s.started_at) ASC
  LIMIT GREATEST(1, LEAST(_limit, 100));
$$;

GRANT EXECUTE ON FUNCTION public.role_play_leaderboard(uuid, int) TO anon, authenticated;
