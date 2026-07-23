
-- Lesson views (dwell tracking, recently viewed)
CREATE TABLE public.lesson_views (
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  first_viewed_at timestamptz NOT NULL DEFAULT now(),
  last_viewed_at timestamptz NOT NULL DEFAULT now(),
  total_seconds integer NOT NULL DEFAULT 0,
  view_count integer NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, lesson_id)
);
ALTER TABLE public.lesson_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lv select own" ON public.lesson_views FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "lv insert own" ON public.lesson_views FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "lv update own" ON public.lesson_views FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "lv delete own" ON public.lesson_views FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX lesson_views_user_last_idx ON public.lesson_views(user_id, last_viewed_at DESC);

-- User state (last_seen_at, streak)
CREATE TABLE public.user_state (
  user_id uuid PRIMARY KEY,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  streak_days integer NOT NULL DEFAULT 0,
  streak_last_day date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "us select own" ON public.user_state FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "us insert own" ON public.user_state FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "us update own" ON public.user_state FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Lesson recommendations (co-completion, computed)
CREATE TABLE public.lesson_recommendations (
  lesson_id uuid NOT NULL,
  recommended_lesson_id uuid NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lesson_id, recommended_lesson_id)
);
ALTER TABLE public.lesson_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lr public read" ON public.lesson_recommendations FOR SELECT USING (true);

-- Popular lessons (30 days) for cold start
CREATE OR REPLACE FUNCTION public.popular_lessons(_limit integer DEFAULT 12)
RETURNS TABLE(lesson_id uuid, completions bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT lesson_id, count(*)::bigint AS completions
  FROM public.lesson_completions
  WHERE completed_at > now() - interval '30 days'
  GROUP BY lesson_id
  ORDER BY completions DESC
  LIMIT GREATEST(1, LEAST(_limit, 50))
$$;

-- Recompute co-completion recommendations
CREATE OR REPLACE FUNCTION public.recompute_lesson_recommendations()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.lesson_recommendations;
  INSERT INTO public.lesson_recommendations (lesson_id, recommended_lesson_id, score, computed_at)
  SELECT a.lesson_id, b.lesson_id, count(*)::numeric, now()
  FROM public.lesson_completions a
  JOIN public.lesson_completions b
    ON a.user_id = b.user_id AND a.lesson_id <> b.lesson_id
  GROUP BY a.lesson_id, b.lesson_id;
END;
$$;

-- Touch user_state + streak on lesson completion
CREATE OR REPLACE FUNCTION public.touch_user_streak()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  today date := (NEW.completed_at AT TIME ZONE 'UTC')::date;
  existing public.user_state%ROWTYPE;
  new_streak integer := 1;
BEGIN
  SELECT * INTO existing FROM public.user_state WHERE user_id = NEW.user_id;
  IF FOUND THEN
    IF existing.streak_last_day = today THEN
      new_streak := existing.streak_days;
    ELSIF existing.streak_last_day = today - 1 THEN
      new_streak := existing.streak_days + 1;
    ELSE
      new_streak := 1;
    END IF;
    UPDATE public.user_state
      SET streak_days = new_streak,
          streak_last_day = today,
          last_seen_at = now(),
          updated_at = now()
      WHERE user_id = NEW.user_id;
  ELSE
    INSERT INTO public.user_state (user_id, last_seen_at, streak_days, streak_last_day)
      VALUES (NEW.user_id, now(), 1, today);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER lesson_completions_touch_streak
AFTER INSERT ON public.lesson_completions
FOR EACH ROW EXECUTE FUNCTION public.touch_user_streak();
