
-- Tighten profiles table RLS
DROP POLICY IF EXISTS "Profiles select own" ON public.profiles;
CREATE POLICY "Profiles select own" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- Ensure GRANTs are correct
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
