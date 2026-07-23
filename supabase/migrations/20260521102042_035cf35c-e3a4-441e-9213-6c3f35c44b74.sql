UPDATE public.role_plays
SET persona = jsonb_set(persona, '{headshot_url}', '"/__l5e/assets-v1/8d5e764d-9453-4eac-a6d6-054f30977ac3/amplifying-pain-v2.jpg"'::jsonb)
WHERE id = 'b174cb04-4338-4691-a924-86651e1b41c2';