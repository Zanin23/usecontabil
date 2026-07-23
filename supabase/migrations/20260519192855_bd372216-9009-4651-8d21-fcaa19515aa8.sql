
-- Backfill any existing rows missing a persona voice_id
UPDATE public.role_plays
SET persona = persona || jsonb_build_object('voice_id', 'onwK4e9ZLuTAKqWW03F9', 'voice_label', 'Daniel — British male, calm')
WHERE persona->>'voice_id' IS NULL OR persona->>'voice_id' = '';

-- Trigger function: ensure persona.voice_id is always set
CREATE OR REPLACE FUNCTION public.ensure_role_play_voice_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.persona IS NULL OR jsonb_typeof(NEW.persona) <> 'object' THEN
    NEW.persona := '{}'::jsonb;
  END IF;
  IF NEW.persona->>'voice_id' IS NULL OR NEW.persona->>'voice_id' = '' THEN
    NEW.persona := NEW.persona || jsonb_build_object(
      'voice_id', 'onwK4e9ZLuTAKqWW03F9',
      'voice_label', COALESCE(NEW.persona->>'voice_label', 'Daniel — British male, calm')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_role_plays_ensure_voice_id ON public.role_plays;
CREATE TRIGGER trg_role_plays_ensure_voice_id
BEFORE INSERT OR UPDATE ON public.role_plays
FOR EACH ROW
EXECUTE FUNCTION public.ensure_role_play_voice_id();
