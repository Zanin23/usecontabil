
-- 1. Harden has_role: ignore caller-supplied _user_id, always use auth.uid()
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = _role
  )
$$;

-- 2. Lock down EXECUTE on all SECURITY DEFINER functions.
-- Trigger / internal-only functions: revoke from everyone except postgres/service_role.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_user_streak() FROM PUBLIC, anon, authenticated;

-- Admin-only RPCs: revoke from anon (function still self-guards via has_role)
REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_admin_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_admin_by_email(text) TO authenticated;

-- Helper functions called from authenticated client / RLS: revoke anon
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_any_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_admin_if_unclaimed() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_elevenlabs_key() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.role_play_popularity() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.role_play_leaderboard(uuid, integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_admin_if_unclaimed() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_elevenlabs_key() TO authenticated;
GRANT EXECUTE ON FUNCTION public.role_play_popularity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.role_play_leaderboard(uuid, integer) TO authenticated;
