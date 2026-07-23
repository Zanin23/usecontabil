
-- Tighten EXECUTE on SECURITY DEFINER functions in public schema.
-- Trigger-only functions: revoke from all client roles.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_user_streak() FROM PUBLIC, anon, authenticated;

-- Admin-only or signed-in-only callers: revoke anon, keep authenticated.
REVOKE EXECUTE ON FUNCTION public.add_admin_by_email(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_admin_if_unclaimed() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_elevenlabs_key() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

-- Intentionally public (used by anonymous landing/leaderboard surfaces):
--   has_any_admin, role_play_leaderboard, role_play_popularity.
-- These remain executable by anon and authenticated by design.
