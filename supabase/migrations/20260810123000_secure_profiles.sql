-- Tighten profiles table RLS: only allow users to see their own profile or allow admins to see all.
-- This prevents the "All user account records exposed to any authenticated user" issue.

DROP POLICY IF EXISTS "Profiles select own" ON public.profiles;
CREATE POLICY "Profiles select own" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- Ensure GRANTs are correct as per security guidelines
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
