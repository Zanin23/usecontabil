CREATE OR REPLACE FUNCTION public.bump_lesson_view(_lesson_id uuid, _add_seconds integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _add integer := GREATEST(0, COALESCE(_add_seconds, 0));
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  INSERT INTO public.lesson_views (user_id, lesson_id, total_seconds, view_count, first_viewed_at, last_viewed_at)
  VALUES (_uid, _lesson_id, _add, 1, now(), now())
  ON CONFLICT (user_id, lesson_id) DO UPDATE
    SET total_seconds = public.lesson_views.total_seconds + EXCLUDED.total_seconds,
        last_viewed_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.bump_lesson_view(uuid, integer) TO authenticated;