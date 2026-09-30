-- Cadastros próprios e escrituração contábil do Use Contábil:
-- clientes e fornecedores (participantes), produtos e serviços, plano de contas, centros de custo,
-- históricos padrão e lançamentos contábeis.
--
-- Armazenamento por documento (jsonb), um registro por linha, isolado por usuário — o mesmo modelo
-- de acesso da tabela `empresas`. O app grava primeiro no navegador e sincroniza com esta tabela
-- (src/lib/nuvemColecoes.ts): enquanto ela não existir, tudo fica só no navegador e sobe sozinho
-- depois que a migração for aplicada.
-- Exclusões são marcas (excluido = true) para chegarem aos outros navegadores do mesmo usuário.

CREATE TABLE IF NOT EXISTS public.contabil_registros (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  colecao text NOT NULL CHECK (colecao ~ '^[a-z][a-z0-9_]{1,40}$'),
  id text NOT NULL CHECK (char_length(id) BETWEEN 1 AND 120),
  empresa_id text,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  excluido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, colecao, id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contabil_registros TO authenticated;
GRANT ALL ON public.contabil_registros TO service_role;

ALTER TABLE public.contabil_registros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contabil registros select own" ON public.contabil_registros
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Contabil registros insert own" ON public.contabil_registros
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Contabil registros update own" ON public.contabil_registros
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Contabil registros delete own" ON public.contabil_registros
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- updated_at marca a versão no servidor: é por ele que cada navegador baixa só o que mudou.
CREATE TRIGGER contabil_registros_set_updated_at
  BEFORE UPDATE ON public.contabil_registros
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS contabil_registros_sync_idx
  ON public.contabil_registros (user_id, colecao, updated_at);
CREATE INDEX IF NOT EXISTS contabil_registros_empresa_idx
  ON public.contabil_registros (user_id, empresa_id)
  WHERE empresa_id IS NOT NULL;
