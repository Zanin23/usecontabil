
-- Fix: usuarios table RLS is too permissive (authenticated users could read all records)
DROP POLICY IF EXISTS "usuarios read authenticated" ON public.usuarios;

-- Only allow users to see their own 'usuario' record OR allow admins to see everything
CREATE POLICY "usuarios read own or admin" ON public.usuarios
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
