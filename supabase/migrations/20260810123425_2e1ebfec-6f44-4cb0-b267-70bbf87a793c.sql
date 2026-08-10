
-- 1) Revoke execution from PUBLIC and anon for all SECURITY DEFINER functions in public schema
REVOKE EXECUTE ON FUNCTION public.role_play_popularity() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.touch_user_streak() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.add_admin_by_email(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_admin_if_unclaimed() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_elevenlabs_key() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_any_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.role_play_leaderboard(uuid, integer) FROM PUBLIC, anon;

-- 2) Re-grant EXECUTE to authenticated and service_role for those that need it
GRANT EXECUTE ON FUNCTION public.role_play_popularity() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.touch_user_streak() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_admin_by_email(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_admin_if_unclaimed() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_elevenlabs_key() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_any_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.role_play_leaderboard(uuid, integer) TO authenticated, service_role;
