/**
 * Coleções de registros com gravação local imediata e sincronização com a nuvem.
 *
 * Usado pelos cadastros próprios do sistema (clientes e fornecedores, produtos e serviços, plano de
 * contas, centros de custo, históricos padrão) e pelos lançamentos contábeis.
 *
 * - Cada coleção grava no localStorage do navegador (com o sufixo do modo prática). A tela lê e
 *   grava de forma síncrona, como o restante do sistema.
 * - Com sessão ativa e fora do modo prática, as alterações sobem para a tabela `contabil_registros`
 *   (Supabase, isolada por usuário) e o que foi alterado em outro navegador desce para este.
 * - Sem a tabela (migração ainda não aplicada) ou sem internet, tudo continua funcionando só no
 *   navegador; o que ficou pendente sobe na próxima sincronização.
 * - Exclusões viram marcas (`excluido = true`) para chegar aos outros navegadores.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStorageSuffix, isPraticaAtiva } from "./praticaStore";

export const TABELA_NUVEM = "contabil_registros";
/** Disparado quando os dados de qualquer coleção mudam (gravação local ou vinda da nuvem). */
export const COLECOES_EVENT = "usecontabil:colecoes-changed";
/** Disparado quando o estado da sincronização muda. */
export const NUVEM_STATUS_EVENT = "usecontabil:nuvem-status";
const EVENTO_PRATICA = "usecontabil:pratica-changed";

const PREFIXO = "usecontabil.col.";
const TAMANHO_LOTE = 500;
const TAMANHO_PAGINA = 1000;
/** Sobreposição ao baixar alterações, para não perder linhas gravadas no mesmo instante. */
const SOBREPOSICAO_MS = 2000;
/** Com a tabela ausente, não insiste a cada gravação. */
const ESPERA_INDISPONIVEL_MS = 5 * 60_000;

export type RegistroBase = { id: string; criadoEm?: string; atualizadoEm?: string };

type EstadoColecao<T> = {
  itens: Record<string, T>;
  /** id → marca única da versão local ainda não enviada. */
  pendentes: Record<string, string>;
  /** id → marca única da exclusão local ainda não enviada. */
  exclusoes: Record<string, string>;
  /** Maior `updated_at` remoto já aplicado (menos a sobreposição). */
  cursor?: string;
};

export type Colecao<T extends RegistroBase> = {
  nome: string;
  listar: () => T[];
  obter: (id: string) => T | undefined;
  salvar: (registro: T) => T;
  salvarVarios: (registros: T[]) => T[];
  remover: (id: string) => void;
  removerVarios: (ids: string[]) => void;
};

/* ------------------------------------------------------------------ */
/* Armazenamento local                                                 */
/* ------------------------------------------------------------------ */

const cache = new Map<string, EstadoColecao<unknown>>();
const colecoes = new Map<string, Colecao<RegistroBase>>();

/**
 * Id do usuário da sessão guardada pelo Supabase neste navegador (leitura síncrona). O cache local
 * de cada coleção é separado por usuário: quem entra com outra conta no mesmo navegador não vê — nem
 * envia para a própria nuvem — os dados da conta anterior.
 */
let uidEmCache: { valor: string | null; em: number } | null = null;
export function uidDaSessaoLocal(): string | null {
  if (uidEmCache && Date.now() - uidEmCache.em < 2000) return uidEmCache.valor;
  let valor: string | null = null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const chave = localStorage.key(i);
      if (!chave || !/^sb-.+-auth-token$/.test(chave)) continue;
      const sessao = JSON.parse(localStorage.getItem(chave) ?? "null") as { user?: { id?: string }; currentSession?: { user?: { id?: string } } } | null;
      const id = sessao?.user?.id ?? sessao?.currentSession?.user?.id;
      if (id) {
        valor = String(id);
        break;
      }
    }
  } catch {
    valor = null;
  }
  uidEmCache = { valor, em: Date.now() };
  return valor;
}

const chaveReal = (nome: string) => {
  const uid = uidDaSessaoLocal();
  return `${PREFIXO}${nome}.v1${uid ? `.u.${uid}` : ""}`;
};
let sequencia = 0;
/** Marca única por gravação (duas gravações no mesmo milissegundo não se confundem). */
const novaMarca = (agora: string) => `${agora}#${++sequencia}`;
const chaveAtual = (nome: string) => chaveReal(nome) + getStorageSuffix();

function vazio<T>(): EstadoColecao<T> {
  return { itens: {}, pendentes: {}, exclusoes: {} };
}

function lerEstado<T>(chave: string): EstadoColecao<T> {
  const emCache = cache.get(chave);
  if (emCache) return emCache as EstadoColecao<T>;
  let estado = vazio<T>();
  try {
    const raw = localStorage.getItem(chave);
    if (raw) {
      const p = JSON.parse(raw) as Partial<EstadoColecao<T>>;
      estado = { itens: p.itens ?? {}, pendentes: p.pendentes ?? {}, exclusoes: p.exclusoes ?? {}, cursor: p.cursor };
    }
  } catch {
    /* dado ilegível: começa vazio, sem apagar o que está gravado */
  }
  cache.set(chave, estado as EstadoColecao<unknown>);
  return estado;
}

/** Grava primeiro no navegador; só atualiza a memória se deu certo (cota cheia lança erro). */
function gravarEstado<T>(chave: string, estado: EstadoColecao<T>, nome: string) {
  localStorage.setItem(chave, JSON.stringify(estado));
  cache.set(chave, estado as EstadoColecao<unknown>);
  window.dispatchEvent(new CustomEvent(COLECOES_EVENT, { detail: { colecao: nome } }));
}

/** Esquece o que está em memória (ex.: depois de limpar o localStorage por fora). */
export function limparCacheColecoes() {
  cache.clear();
  uidEmCache = null;
}

export function criarColecao<T extends RegistroBase>(nome: string): Colecao<T> {
  const existente = colecoes.get(nome);
  if (existente) return existente as unknown as Colecao<T>;

  const salvarVarios = (registros: T[]): T[] => {
    if (!registros.length) return [];
    const chave = chaveAtual(nome);
    const atual = lerEstado<T>(chave);
    const agora = new Date().toISOString();
    const itens = { ...atual.itens };
    const pendentes = { ...atual.pendentes };
    const exclusoes = { ...atual.exclusoes };
    const salvos = registros.map((r) => {
      const anterior = itens[r.id];
      const final = { ...r, criadoEm: r.criadoEm ?? anterior?.criadoEm ?? agora, atualizadoEm: agora } as T;
      itens[r.id] = final;
      pendentes[r.id] = novaMarca(agora);
      delete exclusoes[r.id];
      return final;
    });
    gravarEstado(chave, { ...atual, itens, pendentes, exclusoes }, nome);
    agendarSincronizacao();
    return salvos;
  };

  const removerVarios = (ids: string[]) => {
    if (!ids.length) return;
    const chave = chaveAtual(nome);
    const atual = lerEstado<T>(chave);
    const agora = new Date().toISOString();
    const itens = { ...atual.itens };
    const pendentes = { ...atual.pendentes };
    const exclusoes = { ...atual.exclusoes };
    for (const id of ids) {
      delete itens[id];
      delete pendentes[id];
      exclusoes[id] = novaMarca(agora);
    }
    gravarEstado(chave, { ...atual, itens, pendentes, exclusoes }, nome);
    agendarSincronizacao();
  };

  const col: Colecao<T> = {
    nome,
    listar: () => Object.values(lerEstado<T>(chaveAtual(nome)).itens),
    obter: (id) => lerEstado<T>(chaveAtual(nome)).itens[id],
    salvarVarios,
    salvar: (registro) => salvarVarios([registro])[0],
    removerVarios,
    remover: (id) => removerVarios([id]),
  };
  colecoes.set(nome, col as unknown as Colecao<RegistroBase>);
  // Módulos carregados depois da abertura (telas sob demanda) baixam logo o que já está na nuvem.
  agendarSincronizacao(200);
  return col;
}

/**
 * Hook: recalcula `seletor` sempre que alguma coleção muda (nesta aba, em outra aba, pela nuvem
 * ou ao entrar/sair do modo prática).
 */
export function useColecoes<R>(seletor: () => R, deps: unknown[] = []): R {
  const [valor, setValor] = useState<R>(seletor);
  useEffect(() => {
    const atualizar = () => setValor(seletor());
    const aoMudarStorage = (e: Event) => {
      const chave = (e as StorageEvent).key;
      if (!chave || chave.startsWith(PREFIXO) || chave.startsWith("sb-")) limparCacheColecoes();
      atualizar();
    };
    atualizar();
    window.addEventListener(COLECOES_EVENT, atualizar);
    window.addEventListener(EVENTO_PRATICA, atualizar);
    window.addEventListener("storage", aoMudarStorage);
    return () => {
      window.removeEventListener(COLECOES_EVENT, atualizar);
      window.removeEventListener(EVENTO_PRATICA, atualizar);
      window.removeEventListener("storage", aoMudarStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return valor;
}

/* ------------------------------------------------------------------ */
/* Sincronização                                                       */
/* ------------------------------------------------------------------ */

export type StatusNuvem =
  | "local" // sem sessão: dados só neste navegador
  | "pratica" // modo prática: nunca sobe para a nuvem
  | "sincronizando"
  | "sincronizado"
  | "pendente" // há alterações locais aguardando envio
  | "indisponivel" // tabela da nuvem ainda não criada (migração pendente)
  | "erro"; // falha de rede ou do servidor: tenta de novo depois

export type EstadoNuvem = {
  status: StatusNuvem;
  ultimaSincronizacao?: string;
  erro?: string;
  /** Registros alterados ou excluídos neste navegador que ainda não subiram. */
  pendencias: number;
};

let estadoNuvem: Omit<EstadoNuvem, "pendencias"> = { status: "local" };
let emAndamento: Promise<StatusNuvem> | null = null;
let repetirDepois = false;
let iniciado = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let indisponivelDesde = 0;
let ultimaTentativa = 0;

function contarPendencias(): number {
  let total = 0;
  for (const nome of colecoes.keys()) {
    const est = lerEstado<RegistroBase>(chaveReal(nome));
    total += Object.keys(est.pendentes).length + Object.keys(est.exclusoes).length;
  }
  return total;
}

export function estadoDaNuvem(): EstadoNuvem {
  return { ...estadoNuvem, pendencias: isPraticaAtiva() ? 0 : contarPendencias() };
}

function definir(status: StatusNuvem, extra: Partial<Omit<EstadoNuvem, "status" | "pendencias">> = {}): StatusNuvem {
  estadoNuvem = { ...estadoNuvem, erro: undefined, ...extra, status };
  window.dispatchEvent(new Event(NUVEM_STATUS_EVENT));
  return status;
}

type ErroSupabase = { code?: string; message?: string };

/** A tabela ainda não existe no banco (migração não aplicada). */
export function ehTabelaAusente(e: unknown): boolean {
  const erro = (e ?? {}) as ErroSupabase;
  const msg = String(erro.message ?? "");
  return erro.code === "PGRST205" || erro.code === "42P01" || /could not find the table|relation .* does not exist|schema cache/i.test(msg);
}

type LinhaNuvem = { id: string; dados: unknown; excluido: boolean; updated_at: string };

async function enviar(nome: string, uid: string) {
  const chave = chaveReal(nome);
  const est = lerEstado<RegistroBase & { empresaId?: string }>(chave);
  const idsSalvos = Object.keys(est.pendentes).filter((id) => est.itens[id]);
  const idsExcluidos = Object.keys(est.exclusoes);
  if (!idsSalvos.length && !idsExcluidos.length) return;

  const enviadosSalvos = Object.fromEntries(idsSalvos.map((id) => [id, est.pendentes[id]]));
  const enviadosExcluidos = Object.fromEntries(idsExcluidos.map((id) => [id, est.exclusoes[id]]));
  const linhas = [
    ...idsSalvos.map((id) => ({
      user_id: uid, colecao: nome, id, empresa_id: est.itens[id].empresaId ?? null, dados: est.itens[id], excluido: false,
    })),
    ...idsExcluidos.map((id) => ({ user_id: uid, colecao: nome, id, empresa_id: null, dados: {}, excluido: true })),
  ];
  for (let i = 0; i < linhas.length; i += TAMANHO_LOTE) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela criada por migração; tipos gerados depois
    const { error } = await (supabase as any).from(TABELA_NUVEM).upsert(linhas.slice(i, i + TAMANHO_LOTE), { onConflict: "user_id,colecao,id" });
    if (error) throw error;
  }

  // Só limpa a pendência se o registro não mudou de novo enquanto era enviado.
  const atual = lerEstado<RegistroBase>(chave);
  const pendentes = { ...atual.pendentes };
  const exclusoes = { ...atual.exclusoes };
  for (const id of idsSalvos) if (pendentes[id] === enviadosSalvos[id]) delete pendentes[id];
  for (const id of idsExcluidos) if (exclusoes[id] === enviadosExcluidos[id]) delete exclusoes[id];
  gravarEstado(chave, { ...atual, pendentes, exclusoes }, nome);
}

async function baixar(nome: string, uid: string) {
  const chave = chaveReal(nome);
  const desde = lerEstado<RegistroBase>(chave).cursor ?? "1970-01-01T00:00:00.000Z";
  const recebidas: LinhaNuvem[] = [];
  for (let pagina = 0; ; pagina++) {
    const inicio = pagina * TAMANHO_PAGINA;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela criada por migração; tipos gerados depois
    const { data, error } = await (supabase as any)
      .from(TABELA_NUVEM)
      .select("id,dados,excluido,updated_at")
      .eq("user_id", uid)
      .eq("colecao", nome)
      .gt("updated_at", desde)
      .order("updated_at", { ascending: true })
      .order("id", { ascending: true })
      .range(inicio, inicio + TAMANHO_PAGINA - 1);
    if (error) throw error;
    const linhas = (data ?? []) as LinhaNuvem[];
    recebidas.push(...linhas);
    if (linhas.length < TAMANHO_PAGINA) break;
  }
  if (!recebidas.length) return;

  const atual = lerEstado<RegistroBase>(chave);
  const itens = { ...atual.itens };
  let maior = 0;
  for (const r of recebidas) {
    const t = Date.parse(r.updated_at);
    if (Number.isFinite(t) && t > maior) maior = t;
    // Alteração local ainda não enviada vence a versão da nuvem.
    if (atual.pendentes[r.id] || atual.exclusoes[r.id]) continue;
    if (r.excluido) delete itens[r.id];
    else itens[r.id] = { ...(r.dados as RegistroBase), id: r.id };
  }
  const anterior = atual.cursor ? Date.parse(atual.cursor) : 0;
  const cursor = maior ? new Date(Math.max(anterior, maior - SOBREPOSICAO_MS)).toISOString() : atual.cursor;
  gravarEstado(chave, { ...atual, itens, cursor }, nome);
}

async function executarSincronizacao(): Promise<StatusNuvem> {
  ultimaTentativa = Date.now();
  if (isPraticaAtiva()) return definir("pratica");
  let uid: string | undefined;
  try {
    const { data } = await supabase.auth.getSession();
    uid = data.session?.user?.id;
  } catch {
    uid = undefined;
  }
  if (!uid) return definir("local");
  const dono = uidDaSessaoLocal();
  if (dono && dono !== uid) {
    return definir("erro", { erro: "A sessão deste navegador mudou de usuário. Recarregue a página." });
  }
  definir("sincronizando");
  try {
    for (const nome of colecoes.keys()) {
      await enviar(nome, uid);
      await baixar(nome, uid);
    }
    indisponivelDesde = 0;
    return definir(contarPendencias() ? "pendente" : "sincronizado", { ultimaSincronizacao: new Date().toISOString() });
  } catch (e) {
    if (ehTabelaAusente(e)) {
      indisponivelDesde = Date.now();
      return definir("indisponivel", { erro: "A tabela contabil_registros ainda não existe no banco (migração pendente)." });
    }
    const msg = (e as ErroSupabase)?.message ?? String(e);
    return definir("erro", { erro: msg });
  }
}

/** Envia o que está pendente e baixa as alterações da nuvem. Chamadas simultâneas são agrupadas. */
export function sincronizarNuvem(): Promise<StatusNuvem> {
  if (emAndamento) {
    repetirDepois = true;
    return emAndamento;
  }
  emAndamento = executarSincronizacao().finally(() => {
    emAndamento = null;
    if (repetirDepois) {
      repetirDepois = false;
      agendarSincronizacao(500);
    }
  });
  return emAndamento;
}

/** Agenda uma sincronização (agrupando gravações seguidas). Só age depois de `iniciarSincronizacaoNuvem`. */
export function agendarSincronizacao(atrasoMs = 1500) {
  if (!iniciado) return;
  if (isPraticaAtiva()) {
    definir("pratica");
    return;
  }
  if (estadoNuvem.status === "indisponivel" && Date.now() - indisponivelDesde < ESPERA_INDISPONIVEL_MS) {
    definir("indisponivel", { erro: estadoNuvem.erro });
    return;
  }
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void sincronizarNuvem();
  }, atrasoMs);
}

/**
 * Liga a sincronização automática: ao entrar, ao voltar para a aba, ao reconectar e a cada 2 min.
 * Chamado uma vez pelo ContabilShell. Retorna a função que desliga.
 */
export function iniciarSincronizacaoNuvem(): () => void {
  if (iniciado) return () => {};
  iniciado = true;
  void sincronizarNuvem();

  const { data: sub } = supabase.auth.onAuthStateChange((_evento, sessao) => {
    if (sessao) agendarSincronizacao(300);
    else definir("local");
  });
  const aoVoltar = () => {
    if (Date.now() - ultimaTentativa > 30_000) agendarSincronizacao(300);
  };
  const aoTrocarModo = () => {
    if (isPraticaAtiva()) definir("pratica");
    else agendarSincronizacao(300);
  };
  window.addEventListener("focus", aoVoltar);
  window.addEventListener("online", aoVoltar);
  window.addEventListener(EVENTO_PRATICA, aoTrocarModo);
  const intervalo = setInterval(() => {
    if (typeof document === "undefined" || document.visibilityState === "visible") agendarSincronizacao(0);
  }, 120_000);

  return () => {
    iniciado = false;
    sub.subscription.unsubscribe();
    window.removeEventListener("focus", aoVoltar);
    window.removeEventListener("online", aoVoltar);
    window.removeEventListener(EVENTO_PRATICA, aoTrocarModo);
    clearInterval(intervalo);
    if (timer) clearTimeout(timer);
    timer = null;
  };
}

/** Hook com o estado da sincronização (para o selo "nuvem" das telas). */
export function useEstadoNuvem(): EstadoNuvem {
  const [valor, setValor] = useState<EstadoNuvem>(estadoDaNuvem);
  useEffect(() => {
    const atualizar = () => setValor(estadoDaNuvem());
    atualizar();
    window.addEventListener(NUVEM_STATUS_EVENT, atualizar);
    window.addEventListener(COLECOES_EVENT, atualizar);
    window.addEventListener(EVENTO_PRATICA, atualizar);
    return () => {
      window.removeEventListener(NUVEM_STATUS_EVENT, atualizar);
      window.removeEventListener(COLECOES_EVENT, atualizar);
      window.removeEventListener(EVENTO_PRATICA, atualizar);
    };
  }, []);
  return valor;
}

/**
 * Apaga da nuvem os registros do usuário (usado pelas ações explícitas "Isolar dados" e
 * "Deletar tudo", depois da confirmação). Ignora a ausência da tabela.
 */
export async function apagarRegistrosDaNuvem(uid: string): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela criada por migração; tipos gerados depois
    await (supabase as any).from(TABELA_NUVEM).delete().eq("user_id", uid);
  } catch {
    /* tabela ausente ou offline: nada a apagar agora */
  }
  limparCacheColecoes();
}

/** Somente para testes: volta o módulo ao estado inicial. */
export function __reiniciarNuvemParaTestes() {
  estadoNuvem = { status: "local" };
  emAndamento = null;
  repetirDepois = false;
  iniciado = false;
  if (timer) clearTimeout(timer);
  timer = null;
  indisponivelDesde = 0;
  ultimaTentativa = 0;
  cache.clear();
  uidEmCache = null;
}
