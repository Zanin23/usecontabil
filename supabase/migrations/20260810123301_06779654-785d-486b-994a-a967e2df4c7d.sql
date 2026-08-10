
-- Fix: Signed-In Users Can Execute SECURITY DEFINER Function
-- Revoke PUBLIC execute rights first (best practice)
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- Re-grant to authenticated/service_role as needed for known app functions
-- (These functions were identified in the migrations and linter results)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.role_play_leaderboard(uuid, int) TO authenticated, service_role;

-- Revoke execute from anon specifically to satisfy the linter's primary concern
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.role_play_leaderboard(uuid, int) FROM anon;

-- Note: has_any_admin, role_play_popularity were already partially revoked in recent migrations 
-- but we ensure they are tight here as well.
REVOKE EXECUTE ON FUNCTION public.has_any_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.role_play_popularity() FROM anon;
