
-- 1) app_settings: restrict SELECT to authenticated users only
DROP POLICY IF EXISTS "app_settings public read" ON public.app_settings;
CREATE POLICY "app_settings authenticated read"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT ON public.app_settings FROM anon;

-- 2) profiles: add WITH CHECK to prevent id hijacking on update
DROP POLICY IF EXISTS "Profiles update own" ON public.profiles;
CREATE POLICY "Profiles update own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3) Tighten SECURITY DEFINER function execute grants.
-- Revoke anon EXECUTE on all remaining public-schema SECURITY DEFINER functions.
-- These are only invoked from authenticated app surfaces.
REVOKE EXECUTE ON FUNCTION public.has_any_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.role_play_popularity() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.role_play_leaderboard(uuid, integer) FROM PUBLIC, anon;
