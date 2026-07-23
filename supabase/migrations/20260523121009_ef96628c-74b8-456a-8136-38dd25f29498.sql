ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS lesson_content jsonb;
DELETE FROM public.learning_paths WHERE id = '99e33094-901c-404f-b5b1-d043e5446948';