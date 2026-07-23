CREATE OR REPLACE FUNCTION public.role_play_leaderboard(_role_play_id uuid, _limit integer DEFAULT 25)
 RETURNS TABLE(session_id uuid, user_id uuid, display_name text, total_score integer, difficulty text, duration_seconds integer, ended_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    AND s.total_score >= 50
  ORDER BY s.total_score DESC, COALESCE(s.ended_at, s.started_at) ASC
  LIMIT GREATEST(1, LEAST(_limit, 100));
$function$;