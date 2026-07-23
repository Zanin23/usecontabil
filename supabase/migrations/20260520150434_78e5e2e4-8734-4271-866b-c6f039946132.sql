
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      NEW.email
    )
  )
  ON CONFLICT (id) DO UPDATE
    SET display_name = COALESCE(
      NULLIF(EXCLUDED.display_name, ''),
      public.profiles.display_name
    );
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: prefer full_name/name from existing auth metadata when current display_name looks like an email
UPDATE public.profiles p
SET display_name = COALESCE(
  NULLIF(u.raw_user_meta_data->>'full_name', ''),
  NULLIF(u.raw_user_meta_data->>'name', ''),
  NULLIF(u.raw_user_meta_data->>'display_name', ''),
  p.display_name
)
FROM auth.users u
WHERE u.id = p.id
  AND (
    p.display_name IS NULL
    OR p.display_name = ''
    OR p.display_name = u.email
    OR p.display_name LIKE '%@%'
  )
  AND (
    NULLIF(u.raw_user_meta_data->>'full_name', '') IS NOT NULL
    OR NULLIF(u.raw_user_meta_data->>'name', '') IS NOT NULL
    OR NULLIF(u.raw_user_meta_data->>'display_name', '') IS NOT NULL
  );

-- Also create profile rows for any existing auth.users that don't yet have one
INSERT INTO public.profiles (id, display_name)
SELECT u.id,
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'display_name', ''),
    NULLIF(u.raw_user_meta_data->>'full_name', ''),
    NULLIF(u.raw_user_meta_data->>'name', ''),
    u.email
  )
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
