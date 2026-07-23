
-- 1. claim_admin_if_unclaimed: lets the first authenticated user grab admin
--    when no admin exists yet. Idempotent and safe to call repeatedly.
CREATE OR REPLACE FUNCTION public.claim_admin_if_unclaimed()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  admin_count int;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  SELECT count(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  IF admin_count > 0 THEN
    RETURN public.has_role(uid, 'admin'::app_role);
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_admin_if_unclaimed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_admin_if_unclaimed() TO authenticated;

-- 2. has_admin: tiny helper so the UI can check whether the workspace has
--    any admin yet (without exposing the user_roles table to anon).
CREATE OR REPLACE FUNCTION public.has_any_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin'); $$;
REVOKE EXECUTE ON FUNCTION public.has_any_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_any_admin() TO authenticated;

-- 3. Lock down knowledge_docs to authenticated users only.
DROP POLICY IF EXISTS "Knowledge docs public read" ON public.knowledge_docs;
CREATE POLICY "Knowledge docs auth read"
  ON public.knowledge_docs FOR SELECT TO authenticated USING (true);

-- 4. Tighten SECURITY DEFINER function EXECUTE grants — keep them callable
--    by signed-in users but block anon.
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.role_play_leaderboard(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.role_play_leaderboard(uuid, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.role_play_popularity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.role_play_popularity() TO authenticated;
