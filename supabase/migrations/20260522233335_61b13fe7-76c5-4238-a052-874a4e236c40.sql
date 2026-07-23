
-- 1) Sessions: remove anonymous access, restrict to authenticated owners + admins
DROP POLICY IF EXISTS "Sessions select own or anon or admin" ON public.sessions;
DROP POLICY IF EXISTS "Sessions insert anon or own" ON public.sessions;
DROP POLICY IF EXISTS "Sessions update own or anon or admin" ON public.sessions;
DROP POLICY IF EXISTS "Sessions delete own or admin" ON public.sessions;

CREATE POLICY "Sessions select own or admin"
  ON public.sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sessions insert own"
  ON public.sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Sessions update own or admin"
  ON public.sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sessions delete own or admin"
  ON public.sessions FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 2) Role plays: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "Role plays read public or owned" ON public.role_plays;

CREATE POLICY "Role plays read published or owned (auth only)"
  ON public.role_plays FOR SELECT TO authenticated
  USING (
    (is_published = true AND visibility = 'public')
    OR (created_by = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 3) Profiles: add admin SELECT policy
CREATE POLICY "Profiles admin read all"
  ON public.profiles FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4) Revoke EXECUTE on SECURITY DEFINER functions from anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.role_play_leaderboard(uuid, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.popular_lessons(integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_lesson_completions() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.recompute_lesson_recommendations() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_user_streak() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, public, authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.role_play_leaderboard(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.popular_lessons(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_lesson_completions() TO authenticated;
