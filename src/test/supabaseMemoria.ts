/**
 * Supabase em memória para a tabela `contabil_registros`: aplica filtros (eq/gt), ordenação,
 * paginação (range), upsert pela chave (user_id, colecao, id) e delete — o suficiente para testar a
 * sincronização das coleções sem backend.
 *
 * Uso: vi.mock("@/integrations/supabase/client", async () => (await import("./supabaseMemoria")).moduloSupabaseMemoria());
 * O estado fica em globalThis para sobreviver a vi.resetModules().
 */
export type LinhaRegistro = {
  user_id: string;
  colecao: string;
  id: string;
  empresa_id: string | null;
  dados: Record<string, unknown>;
  excluido: boolean;
  created_at: string;
  updated_at: string;
};

type Erro = { code?: string; message: string };
type Estado = {
  linhas: LinhaRegistro[];
  usuario: { id: string; email?: string } | null;
  tabelaExiste: boolean;
  falha: Erro | null;
  relogio: number;
  chamadas: string[];
  /** Executado no meio de um upsert (simula edição feita enquanto o envio acontece). */
  duranteEnvio: (() => void) | null;
};

const G = globalThis as unknown as { __ucSupabaseMemoria?: Estado };
export const memoria: Estado = (G.__ucSupabaseMemoria ??= {
  linhas: [], usuario: { id: "user-1", email: "teste@exemplo.com.br" }, tabelaExiste: true, falha: null,
  relogio: Date.parse("2026-09-30T12:00:00.000Z"), chamadas: [], duranteEnvio: null,
});

export function reiniciarMemoria() {
  memoria.linhas.length = 0;
  memoria.usuario = { id: "user-1", email: "teste@exemplo.com.br" };
  memoria.tabelaExiste = true;
  memoria.falha = null;
  memoria.relogio = Date.parse("2026-09-30T12:00:00.000Z");
  memoria.chamadas.length = 0;
  memoria.duranteEnvio = null;
}

/** Marca d'água do servidor: cada escrita avança 1 s. */
export const agoraServidor = () => new Date((memoria.relogio += 1000)).toISOString();

const TABELA_AUSENTE: Erro = { code: "PGRST205", message: "Could not find the table 'public.contabil_registros' in the schema cache" };

function erroAtual(): Erro | null {
  if (!memoria.tabelaExiste) return TABELA_AUSENTE;
  return memoria.falha;
}

/** Grava como se fosse outro navegador do mesmo usuário. */
export function gravarRemoto(colecao: string, id: string, dados: Record<string, unknown>, excluido = false, userId = "user-1") {
  const t = agoraServidor();
  const i = memoria.linhas.findIndex((l) => l.user_id === userId && l.colecao === colecao && l.id === id);
  const linha: LinhaRegistro = {
    user_id: userId, colecao, id, empresa_id: (dados.empresaId as string) ?? null, dados, excluido,
    created_at: i >= 0 ? memoria.linhas[i].created_at : t, updated_at: t,
  };
  if (i >= 0) memoria.linhas[i] = linha;
  else memoria.linhas.push(linha);
}

function consultaSelect() {
  const filtros: ((l: LinhaRegistro) => boolean)[] = [];
  let faixa: [number, number] | null = null;
  const builder = {
    eq(coluna: keyof LinhaRegistro, valor: unknown) { filtros.push((l) => l[coluna] === valor); return builder; },
    gt(coluna: keyof LinhaRegistro, valor: string) { filtros.push((l) => Date.parse(String(l[coluna])) > Date.parse(valor)); return builder; },
    order() { return builder; },
    range(de: number, ate: number) { faixa = [de, ate]; return builder; },
    then(ok: (v: unknown) => unknown, falhou?: (e: unknown) => unknown) {
      memoria.chamadas.push("select");
      const erro = erroAtual();
      let resultado: unknown;
      if (erro) resultado = { data: null, error: erro };
      else {
        const visiveis = memoria.linhas
          .filter((l) => l.user_id === memoria.usuario?.id) // RLS
          .filter((l) => filtros.every((f) => f(l)))
          .sort((a, b) => a.updated_at.localeCompare(b.updated_at) || a.id.localeCompare(b.id));
        const pagina = faixa ? visiveis.slice(faixa[0], faixa[1] + 1) : visiveis;
        resultado = { data: pagina.map((l) => ({ id: l.id, dados: structuredClone(l.dados), excluido: l.excluido, updated_at: l.updated_at })), error: null };
      }
      return Promise.resolve(resultado).then(ok, falhou);
    },
  };
  return builder;
}

function consultaDelete() {
  const filtros: ((l: LinhaRegistro) => boolean)[] = [];
  const builder = {
    eq(coluna: keyof LinhaRegistro, valor: unknown) { filtros.push((l) => l[coluna] === valor); return builder; },
    then(ok: (v: unknown) => unknown, falhou?: (e: unknown) => unknown) {
      memoria.chamadas.push("delete");
      const erro = erroAtual();
      if (!erro) {
        const manter = memoria.linhas.filter((l) => !(l.user_id === memoria.usuario?.id && filtros.every((f) => f(l))));
        memoria.linhas.length = 0;
        memoria.linhas.push(...manter);
      }
      return Promise.resolve({ data: null, error: erro }).then(ok, falhou);
    },
  };
  return builder;
}

async function upsert(linhas: Omit<LinhaRegistro, "created_at" | "updated_at">[]) {
  memoria.chamadas.push("upsert");
  const erro = erroAtual();
  if (erro) return { data: null, error: erro };
  if (memoria.duranteEnvio) {
    const f = memoria.duranteEnvio;
    memoria.duranteEnvio = null;
    f();
  }
  for (const r of linhas) {
    if (r.user_id !== memoria.usuario?.id) return { data: null, error: { code: "42501", message: "new row violates row-level security policy" } };
    gravarRemoto(r.colecao, r.id, structuredClone(r.dados), r.excluido, r.user_id);
  }
  return { data: null, error: null };
}

export function moduloSupabaseMemoria() {
  return {
    supabase: {
      auth: {
        getSession: async () => ({ data: { session: memoria.usuario ? { user: memoria.usuario, access_token: "token" } : null } }),
        getUser: async () => ({ data: { user: memoria.usuario }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: async () => ({ error: null }),
      },
      from: (tabela: string) => {
        if (tabela !== "contabil_registros") {
          // Outras tabelas (ex.: empresas) não interessam a estes testes: respondem vazio.
          const vazio = { data: [], error: null };
          const qualquer: unknown = new Proxy(function () {}, {
            get: (_a, prop) => (prop === "then" ? (ok: (v: unknown) => unknown) => Promise.resolve(vazio).then(ok) : () => qualquer),
          });
          return { select: () => qualquer, upsert: async () => ({ data: null, error: null }), delete: () => qualquer, insert: async () => ({ data: null, error: null }), update: () => qualquer };
        }
        return {
          select: () => consultaSelect(),
          upsert: (linhas: Omit<LinhaRegistro, "created_at" | "updated_at">[]) => upsert(linhas),
          delete: () => consultaDelete(),
        };
      },
    },
  };
}
