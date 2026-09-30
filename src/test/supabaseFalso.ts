/**
 * Supabase falso para testes: nada chega ao backend real.
 * Uso:  vi.mock("@/integrations/supabase/client", async () => (await import("./supabaseFalso")).moduloSupabaseFalso());
 */
export type ChamadaFalsa = { tabela: string; metodo: string; args: unknown[] };
type Resposta = { data: unknown; error: { message: string } | null };

/**
 * O estado vive em globalThis: os testes usam vi.resetModules(), que recarrega este arquivo e criaria
 * várias instâncias — a do teste e a do cliente simulado usado pelos componentes precisam enxergar o mesmo estado.
 */
type Compartilhado = {
  chamadas: ChamadaFalsa[];
  tabelas: Record<string, unknown[]>;
  estado: { usuario: { id: string; email: string; user_metadata?: Record<string, unknown> } | null };
  funcoes: Record<string, (corpo: unknown) => Resposta>;
  rpc: Record<string, (args: unknown) => Resposta>;
};
const G = globalThis as unknown as { __ucSupabaseFalso?: Compartilhado };
const comp: Compartilhado = (G.__ucSupabaseFalso ??= {
  chamadas: [], tabelas: {}, estado: { usuario: { id: "user-1", email: "teste@exemplo.com.br", user_metadata: {} } }, funcoes: {}, rpc: {},
});

export const chamadasSupabase = comp.chamadas;
export const tabelasFalsas = comp.tabelas;
export const estadoFalso = comp.estado;
export const funcoesFalsas = comp.funcoes;
export const rpcFalso = comp.rpc;

/** Query builder: qualquer encadeamento vira uma Promise com `{ data, error }`. */
function consulta(tabela: string, metodoInicial: string, argsIniciais: unknown[]) {
  chamadasSupabase.push({ tabela, metodo: metodoInicial, args: argsIniciais });
  const resolver = () => Promise.resolve({ data: metodoInicial === "select" ? (tabelasFalsas[tabela] ?? []) : null, error: null });
  const builder: unknown = new Proxy(function () {}, {
    get(_alvo, prop) {
      if (prop === "then") { const p = resolver(); return p.then.bind(p); }
      return (...args: unknown[]) => { chamadasSupabase.push({ tabela, metodo: String(prop), args }); return builder; };
    },
  });
  return builder;
}

export function moduloSupabaseFalso() {
  return {
    supabase: {
      auth: {
        getUser: async () => ({ data: { user: estadoFalso.usuario }, error: null }),
        getSession: async () => ({ data: { session: estadoFalso.usuario ? { user: estadoFalso.usuario, access_token: "token" } : null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: async () => ({ error: null }),
      },
      functions: {
        invoke: async (nome: string, opcoes?: { body?: unknown }) => {
          chamadasSupabase.push({ tabela: `fn:${nome}`, metodo: "invoke", args: [opcoes?.body] });
          return funcoesFalsas[nome]?.(opcoes?.body) ?? { data: {}, error: null };
        },
      },
      rpc: async (nome: string, args: unknown) => {
        chamadasSupabase.push({ tabela: `rpc:${nome}`, metodo: "rpc", args: [args] });
        return rpcFalso[nome]?.(args) ?? { data: null, error: { message: `rpc ${nome} não simulada` } };
      },
      from: (tabela: string) => ({
        select: (...a: unknown[]) => consulta(tabela, "select", a),
        insert: (...a: unknown[]) => consulta(tabela, "insert", a),
        upsert: (...a: unknown[]) => consulta(tabela, "upsert", a),
        update: (...a: unknown[]) => consulta(tabela, "update", a),
        delete: (...a: unknown[]) => consulta(tabela, "delete", a),
      }),
    },
  };
}

export function limparSupabaseFalso() {
  chamadasSupabase.length = 0;
  for (const k of Object.keys(tabelasFalsas)) delete tabelasFalsas[k];
  for (const k of Object.keys(rpcFalso)) delete rpcFalso[k];
  for (const k of Object.keys(funcoesFalsas)) delete funcoesFalsas[k];
  estadoFalso.usuario = { id: "user-1", email: "teste@exemplo.com.br", user_metadata: {} };
}
