
CREATE TABLE public.usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE,
  nome text NOT NULL DEFAULT '',
  email text NOT NULL,
  perfil text NOT NULL DEFAULT 'Consulta',
  cargo text NOT NULL DEFAULT '',
  permissoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  duplo_fator boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  situacao text NOT NULL DEFAULT 'ativo',
  ultimo_acesso timestamptz,
  observacao text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX usuarios_email_unique ON public.usuarios (lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios TO authenticated;
GRANT ALL ON public.usuarios TO service_role;

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios read authenticated" ON public.usuarios
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "usuarios admin insert" ON public.usuarios
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "usuarios admin update" ON public.usuarios
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "usuarios admin delete" ON public.usuarios
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER usuarios_set_updated_at
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
