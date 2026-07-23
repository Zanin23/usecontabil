-- Drop self-referential write policies on user_roles
DROP POLICY IF EXISTS "user_roles admin insert" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles admin update" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles admin delete" ON public.user_roles;

-- Revoke direct table writes from client roles; only service_role and
-- SECURITY DEFINER functions (claim_admin_if_unclaimed, add_admin_by_email)
-- may mutate user_roles going forward.
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon;

-- SELECT policy (read own row, or admin reads all) remains intact.
-- No INSERT/UPDATE/DELETE policy = denied for all non-service callers.
