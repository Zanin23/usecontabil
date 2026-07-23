CREATE OR REPLACE FUNCTION public.add_admin_by_email(_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can add admins';
  END IF;
  SELECT id INTO uid FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No user found with that email. They need to sign in at least once first.';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  RETURN uid;
END;
$$;

REVOKE ALL ON FUNCTION public.add_admin_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_admin_by_email(text) TO authenticated;