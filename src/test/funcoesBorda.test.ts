/**
 * Funções de borda (supabase/functions) executadas sob o Node com Deno e supabase-js simulados.
 * Achados S1 e S2 da validação funcional:
 *  - admin-usuarios: a ação "sync" respondia a QUALQUER usuário autenticado (inclusive "Acesso pendente")
 *    com nome, e-mail, perfil e permissões de todos, lida com a chave de serviço (contorna o RLS);
 *  - gestao-assistente: não validava o usuário — qualquer chamada com a chave pública usava créditos de IA.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

type Linha = Record<string, unknown>;
const banco = vi.hoisted(() => ({
  tabelas: {} as Record<string, Linha[]>,
  /** token → id do usuário (ausente = JWT inválido / chave pública) */
  tokens: {} as Record<string, string>,
  contasAuth: [] as { id: string; email: string; user_metadata?: Record<string, string>; last_sign_in_at?: string | null }[],
  chamadasIA: 0,
}));

/** Query builder em memória: encadeia filtros e resolve como Promise ({ data, error, count }). */
function consulta(tabela: string) {
  const filtros: [string, unknown][] = []; let alternativas: [string, unknown][] = []; let contar = false; let cabeca = false; let acao: "select" | "insert" | "update" = "select"; let payload: Linha | null = null; let unico = false;
  const linhas = () => (banco.tabelas[tabela] ??= []);
  const executar = () => {
    if (acao === "insert") { linhas().push({ id: `novo-${linhas().length + 1}`, ...payload }); return { data: null, error: null }; }
    const achadas = linhas().filter((l) => filtros.every(([c, v]) => l[c] === v) && (!alternativas.length || alternativas.some(([c, v]) => l[c] === v)));
    if (acao === "update") { achadas.forEach((l) => Object.assign(l, payload)); return { data: null, error: null }; }
    if (unico) return { data: achadas[0] ?? null, error: null };
    return { data: cabeca ? null : achadas, error: null, count: contar ? achadas.length : undefined };
  };
  const b: Record<string, unknown> = {
    select: (_c?: string, o?: { count?: string; head?: boolean }) => { contar = !!o?.count; cabeca = !!o?.head; return b; },
    insert: (l: Linha) => { acao = "insert"; payload = l; return b; },
    update: (l: Linha) => { acao = "update"; payload = l; return b; },
    eq: (c: string, v: unknown) => { filtros.push([c, v]); return b; },
    // .or("auth_user_id.eq.X,email.eq.Y" ) → basta uma das igualdades
    or: (expr: string) => { alternativas = expr.split(",").map((p) => { const [c, v] = p.split(".eq."); return [c, v] as [string, unknown]; }); return b; },
    order: () => b, limit: () => b,
    maybeSingle: () => { unico = true; return b; },
    single: () => { unico = true; return b; },
    then: (ok: (r: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(executar()).then(ok, ko),
  };
  return b;
}

/** createClient simulado, injetado nos stubs de "npm:@supabase/supabase-js@2" (ver vitest.config.ts). */
const criarClienteFalso = (_url: string, chave: string, opcoes?: { global?: { headers?: { Authorization?: string } } }) => {
  const token = (opcoes?.global?.headers?.Authorization ?? "").replace(/^Bearer\s+/i, "");
  return {
    auth: {
      getUser: async () => ({ data: { user: banco.tokens[token] ? { id: banco.tokens[token], email: `${banco.tokens[token]}@x.com` } : null } }),
      admin: {
        listUsers: async () => ({ data: { users: banco.contasAuth }, error: null }),
        updateUserById: async () => ({ error: null }), createUser: async () => ({ data: null, error: null }), deleteUser: async () => ({}),
      },
    },
    from: (t: string) => consulta(t),
    _chave: chave,
  };
};

let manipulador: (req: Request) => Promise<Response>;

async function carregar(funcao: "admin-usuarios" | "gestao-assistente") {
  vi.resetModules();
  vi.stubGlobal("Deno", { serve: (h: typeof manipulador) => { manipulador = h; }, env: { get: (k: string) => ({ SUPABASE_URL: "https://x.supabase.co", SUPABASE_ANON_KEY: "anon", SUPABASE_SERVICE_ROLE_KEY: "service", LOVABLE_API_KEY: "ia" } as Record<string, string>)[k] } });
  await import(/* @vite-ignore */ `../../supabase/functions/${funcao}/index.ts`);
}
const chamar = (corpo: unknown, token?: string) =>
  manipulador(new Request("https://x.supabase.co/functions/v1/f", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(corpo) }));

beforeEach(() => {
  vi.stubGlobal("__createClientFalso", criarClienteFalso);
  banco.tabelas = { user_roles: [], usuarios: [] };
  banco.tokens = { "tk-admin": "admin-1", "tk-pendente": "pend-1" };
  banco.contasAuth = [
    { id: "admin-1", email: "admin@x.com", user_metadata: { display_name: "Admin" } },
    { id: "pend-1", email: "pendente@x.com", user_metadata: { display_name: "Pendente" } },
  ];
  banco.chamadasIA = 0;
  vi.stubGlobal("fetch", vi.fn(async () => { banco.chamadasIA++; return new Response("data: {}\n\ndata: [DONE]\n\n", { status: 200 }); }));
});

describe("admin-usuarios › sync (S1)", () => {
  it("usuário autenticado SEM papel de admin não recebe a lista de usuários", async () => {
    banco.tabelas.user_roles = [{ user_id: "admin-1", role: "admin" }]; // já existe um admin
    await carregar("admin-usuarios");
    const r = await chamar({ action: "sync" }, "tk-pendente");
    expect(r.status).toBe(403); // antes: 200 com nome, e-mail, perfil e permissões de todos
    expect(JSON.stringify(await r.json())).not.toContain("pendente@x.com");
  });

  it("administrador continua recebendo a lista", async () => {
    banco.tabelas.user_roles = [{ user_id: "admin-1", role: "admin" }];
    await carregar("admin-usuarios");
    const r = await chamar({ action: "sync" }, "tk-admin");
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as { usuarios: { email: string }[]; admin: boolean };
    expect(corpo.admin).toBe(true);
    expect(corpo.usuarios.map((u) => u.email).sort()).toEqual(["admin@x.com", "pendente@x.com"]);
  });

  it("primeiro acesso de um backend novo: o primeiro chamador vira admin e consegue sincronizar", async () => {
    await carregar("admin-usuarios"); // nenhum admin ainda
    const r = await chamar({ action: "sync" }, "tk-admin");
    expect(r.status).toBe(200);
    expect(banco.tabelas.user_roles).toEqual([{ id: expect.any(String), user_id: "admin-1", role: "admin" }]);
  });

  it("sem login a função recusa", async () => {
    await carregar("admin-usuarios");
    expect((await chamar({ action: "sync" })).status).toBe(401);
  });
});

describe("gestao-assistente (S2)", () => {
  const corpo = { messages: [{ role: "user", content: "oi" }], contexto: {} };

  it("sem login ou com a chave pública → 401 e nenhum crédito de IA gasto", async () => {
    await carregar("gestao-assistente");
    expect((await chamar(corpo)).status).toBe(401);
    expect((await chamar(corpo, "chave-publica-anon")).status).toBe(401); // antes: seguia para a IA
    expect(banco.chamadasIA).toBe(0);
  });

  it("usuário autenticado mas ainda sem acesso liberado → 403", async () => {
    await carregar("gestao-assistente");
    expect((await chamar(corpo, "tk-pendente")).status).toBe(403);
    expect(banco.chamadasIA).toBe(0);
  });

  it("usuário liberado usa a IA normalmente", async () => {
    banco.tabelas.user_roles = [{ user_id: "admin-1", role: "admin" }];
    await carregar("gestao-assistente");
    const r = await chamar(corpo, "tk-admin");
    expect(r.status).toBe(200);
    expect(r.headers.get("Content-Type")).toBe("text/event-stream");
    expect(banco.chamadasIA).toBe(1);
  });
});
