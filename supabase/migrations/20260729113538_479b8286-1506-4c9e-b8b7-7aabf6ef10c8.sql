CREATE TABLE public.empresas (
  id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cnpj text NOT NULL DEFAULT '',
  razao text NOT NULL DEFAULT '',
  regime text NOT NULL DEFAULT '',
  atividade text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Ativa',
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas TO authenticated;
GRANT ALL ON public.empresas TO service_role;

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresas select own" ON public.empresas
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Empresas insert own" ON public.empresas
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Empresas update own" ON public.empresas
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Empresas delete own" ON public.empresas
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER empresas_set_updated_at
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX empresas_user_cnpj_idx ON public.empresas (user_id, cnpj);