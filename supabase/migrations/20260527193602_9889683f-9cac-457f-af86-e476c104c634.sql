CREATE TABLE public.app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_secrets TO authenticated;
GRANT ALL ON public.app_secrets TO service_role;

ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_secrets admin read"
  ON public.app_secrets FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "app_secrets admin insert"
  ON public.app_secrets FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "app_secrets admin update"
  ON public.app_secrets FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "app_secrets admin delete"
  ON public.app_secrets FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Lets any signed-in user check whether the workspace has configured the
-- ElevenLabs key, without exposing the value.
CREATE OR REPLACE FUNCTION public.has_elevenlabs_key()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_secrets
    WHERE key = 'ELEVENLABS_API_KEY' AND length(coalesce(value,'')) > 0
  );
$$;
