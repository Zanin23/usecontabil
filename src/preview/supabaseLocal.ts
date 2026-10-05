// ============================================================================
// Cliente Supabase SIMULADO — usado apenas pelo script `npm run dev:preview`.
//
// O sistema real conversa com o backend (Lovable Cloud). Para abrir a
// interface sem login, este arquivo substitui o cliente por uma versão que
// guarda tudo no localStorage do navegador. Ele NUNCA é incluído no build de
// produção: o alias só é criado quando a variável UC_PREVIEW=1 está ligada
// (ver vite.config.ts e o script dev:preview).
//
// Forma suportada: encadeamentos comuns (select/insert/upsert/update/delete,
// eq, in, order, limit, single, maybeSingle). O que não existir aqui simplesmente
// devolve `{ data: null, error: null }`, e cada store já trata isso.
// ============================================================================

const CHAVE_SESSAO = "sb-usecontabil-local-auth-token";
const CHAVE_DB = "uc:preview:db";

type Db = Record<string, Record<string, unknown>[]>;

function uidEstavel() {
  const existente = localStorage.getItem("uc:preview:uid");
  if (existente) return existente;
  const novo = "preview-" + Math.random().toString(36).slice(2, 10);
  localStorage.setItem("uc:preview:uid", novo);
  return novo;
}

const USUARIO = () => ({
  id: uidEstavel(),
  aud: "authenticated",
  role: "authenticated",
  email: "demo@usecontabil.local",
  created_at: new Date().toISOString(),
  user_metadata: { full_name: "Usuário de demonstração" },
});

/** Garante que exista uma "sessão" legível por quem lê o localStorage direto. */
function garantirSessao() {
  const usuario = USUARIO();
  const raw = localStorage.getItem(CHAVE_SESSAO);
  if (!raw) {
    localStorage.setItem(
      CHAVE_SESSAO,
      JSON.stringify({
        access_token: "preview",
        token_type: "bearer",
        expires_in: 86400,
        expires_at: Date.now() + 86400_000,
        refresh_token: "preview",
        user: usuario,
      }),
    );
  }
  return usuario;
}

function lerDb(): Db {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_DB) ?? "{}") as Db;
  } catch {
    return {};
  }
}

function gravarDb(db: Db) {
  try {
    localStorage.setItem(CHAVE_DB, JSON.stringify(db));
  } catch {
    /* cota cheia: segue apenas em memória */
  }
}

/** Semeadura mínima para o sistema abrir liberado. */
function garantirPapeis() {
  const db = lerDb();
  const uid = uidEstavel();
  db.user_roles ??= [{ id: "role-1", user_id: uid, role: "admin" }];
  db.profiles ??= [{ id: uid, display_name: "Usuário de demonstração" }];
  gravarDb(db);
}

function casa(linha: Record<string, unknown>, filtros: { col: string; valor: unknown }[]) {
  return filtros.every((f) => {
    const v = linha[f.col];
    if (Array.isArray(f.valor)) return f.valor.includes(v as never);
    return v === f.valor;
  });
}

type Op = "select" | "insert" | "upsert" | "update" | "delete";

function criarBuilder(tabela: string, op: Op, payload: unknown) {
  const filtros: { col: string; valor: unknown }[] = [];
  let modoUnico: "nenhum" | "single" | "maybeSingle" = "nenhum";

  function executar(): { data: unknown; error: null } {
    const db = lerDb();
    const linhas = db[tabela] ?? [];

    if (op === "select") {
      const resultado = linhas.filter((l) => casa(l, filtros));
      if (modoUnico === "maybeSingle") return { data: resultado[0] ?? null, error: null };
      if (modoUnico === "single") return { data: resultado[0] ?? null, error: null };
      return { data: resultado, error: null };
    }

    if (op === "insert" || op === "upsert") {
      const entrada: Record<string, unknown>[] = (
        Array.isArray(payload) ? payload : [payload]
      ) as Record<string, unknown>[];
      const atual = [...linhas];
      for (const item of entrada) {
        const registro: Record<string, unknown> = {
          ...item,
          user_id: (item.user_id as string) ?? uidEstavel(),
        };
        const id = registro.id as string | undefined;
        const idx =
          id != null
            ? atual.findIndex((l) => l.id === id)
            : atual.findIndex((l) => l.user_id === registro.user_id);
        if (idx >= 0) atual[idx] = { ...atual[idx], ...registro };
        else atual.push(registro);
      }
      gravarDb({ ...db, [tabela]: atual });
      return { data: entrada, error: null };
    }

    if (op === "update") {
      const alvo = linhas.filter((l) => casa(l, filtros));
      const atual = linhas.map((l) =>
        alvo.includes(l) ? { ...l, ...(payload as Record<string, unknown>) } : l,
      );
      gravarDb({ ...db, [tabela]: atual });
      return { data: alvo, error: null };
    }

    // delete
    const restantes = linhas.filter((l) => !casa(l, filtros));
    gravarDb({ ...db, [tabela]: restantes });
    return { data: null, error: null };
  }

  const alvo: Record<string, unknown> = {
    eq: (col: string, valor: unknown) => {
      filtros.push({ col, valor });
      return proxy;
    },
    in: (col: string, valor: unknown) => {
      filtros.push({ col, valor });
      return proxy;
    },
    order: () => proxy,
    limit: () => proxy,
    range: () => proxy,
    single: () => {
      modoUnico = "single";
      return proxy;
    },
    maybeSingle: () => {
      modoUnico = "maybeSingle";
      return proxy;
    },
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(executar()).then(resolve, reject),
    catch: (reject: (e: unknown) => unknown) => Promise.resolve(executar()).catch(reject),
    finally: (fn: () => void) => Promise.resolve(executar()).finally(fn),
  };

  const proxy = new Proxy(alvo, {
    get(_t, prop) {
      if (prop in alvo) return alvo[prop as string];
      // Qualquer outro encadeamento é aceito e ignorado (ex.: .gte, .ilike).
      return () => proxy;
    },
  });

  return proxy;
}

garantirSessao();
garantirPapeis();

export const supabase = {
  auth: {
    async getUser() {
      return { data: { user: garantirSessao() }, error: null };
    },
    async getSession() {
      return {
        data: { session: { access_token: "preview", user: garantirSessao() } },
        error: null,
      };
    },
    onAuthStateChange() {
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    async signOut() {
      return { error: null };
    },
    async signInWithPassword() {
      return { data: { user: garantirSessao(), session: null }, error: null };
    },
    async signUp() {
      return { data: { user: garantirSessao(), session: null }, error: null };
    },
  },
  from(tabela: string) {
    return {
      select: () => criarBuilder(tabela, "select", undefined),
      insert: (payload: unknown) => criarBuilder(tabela, "insert", payload),
      upsert: (payload: unknown) => criarBuilder(tabela, "upsert", payload),
      update: (payload: unknown) => criarBuilder(tabela, "update", payload),
      delete: () => criarBuilder(tabela, "delete", undefined),
    };
  },
  functions: {
    async invoke() {
      return { data: {}, error: null };
    },
  },
  async rpc() {
    return { data: null, error: null };
  },
  storage: {
    from() {
      return {
        upload: async () => ({ data: null, error: null }),
        download: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
      };
    },
  },
};

export default supabase;
