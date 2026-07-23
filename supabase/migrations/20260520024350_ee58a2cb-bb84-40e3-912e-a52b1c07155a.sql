DROP FUNCTION IF EXISTS public.ensure_role_play_voice_id() CASCADE;
UPDATE public.role_plays SET persona = persona - 'voice_id' - 'voice_label' WHERE persona ? 'voice_id' OR persona ? 'voice_label';