UPDATE public.role_plays
SET persona = jsonb_set(persona, '{headshot_url}', '"/__l5e/assets-v1/125a5fb3-d9e9-4a53-a65d-61a653b2cac5/max-keil.jpg"'::jsonb, true)
WHERE id = 'bc5c5868-c928-4e43-be0f-cc6619ad068d';