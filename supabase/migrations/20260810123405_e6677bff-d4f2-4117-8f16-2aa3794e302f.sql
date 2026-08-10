
-- Secure sessions table
DROP POLICY IF EXISTS "Sessions select own or anon or admin" ON public.sessions;
CREATE POLICY "Sessions select own or anon or admin" ON public.sessions
  FOR SELECT TO public
  USING (user_id IS NULL OR (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))));

-- Revoke anon access from all user-related tables
REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.usuarios FROM anon;
REVOKE SELECT ON public.empresas FROM anon;
REVOKE SELECT ON public.user_roles FROM anon;
REVOKE SELECT ON public.learning_progress FROM anon;
REVOKE SELECT ON public.role_plays FROM anon;
REVOKE SELECT ON public.user_state FROM anon;
REVOKE SELECT ON public.app_secrets FROM anon;
REVOKE SELECT ON public.app_settings FROM anon;
REVOKE SELECT ON public.knowledge_docs FROM anon;
