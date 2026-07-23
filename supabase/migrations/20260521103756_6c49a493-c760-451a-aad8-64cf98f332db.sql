-- Add rehearsal columns
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS parent_session_id uuid NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS rehearsal_dimension text NULL,
  ADD COLUMN IF NOT EXISTS rehearsal_context jsonb NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_parent_session_id ON public.sessions(parent_session_id);

-- Extend status enum with 'rehearsed' (separate terminal state for rehearsals)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.session_status'::regtype
      AND enumlabel = 'rehearsed'
  ) THEN
    ALTER TYPE public.session_status ADD VALUE 'rehearsed';
  END IF;
END$$;

-- Update leaderboard fn to exclude rehearsals
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
    AND s.parent_session_id IS NULL
  ORDER BY s.total_score DESC, COALESCE(s.ended_at, s.started_at) ASC
  LIMIT GREATEST(1, LEAST(_limit, 100));
$function$;