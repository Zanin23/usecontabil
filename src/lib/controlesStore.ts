// ============================================================================
// Administrativo › Controles internos
// ----------------------------------------------------------------------------
// Motor de governança interna: usuários e permissões, trilha de auditoria,
// centros de custo/rateio, parâmetros do sistema e políticas de alçada.
//
// Regras implementadas:
//  R1  Perfil define permissões-padrão por área; permissões podem ser
//      ajustadas por usuário (exceção explícita, sempre registrada em log).
//  R2  Todo usuário precisa de ao menos uma área liberada. Usuário inativo
//      perde acesso mas mantém histórico na trilha.
//  R3  Segregação de funções: o mesmo usuário não pode ter permissão de
//      "aprovar" e "executar" na mesma área — o motor aponta o conflito.
//  R4  Nenhum registro é alterado em silêncio: criar, editar, excluir,
//      ativar/inativar e mudar parâmetro gravam na trilha de auditoria.
//  R5  Rateio: os percentuais dos centros ativos devem somar 100%. Enquanto
//      não somarem, o painel acusa a diferença.
//  R6  Centro de custo com rateio não pode ser inativado sem redistribuir.
//  R7  Parâmetro sensível (bloqueio de competência, alçada, integrações)
//      exige justificativa na alteração.
//  R8  Alçada: para uma área e um valor, o motor devolve o aprovador da
//      faixa correspondente. Faixas sobrepostas ou lacunas são apontadas.
//  R9  A trilha de auditoria é somente leitura na interface.
// ============================================================================

import { supabase } from "@/integrations/supabase/client";

export const CONTROLES_EVENT = "usecontabil:controles-changed";


const KEY_USR = "usecontabil.adm.controles.usuarios.v1";
const KEY_LOG = "usecontabil.adm.controles.log.v1";
const KEY_CC = "usecontabil.adm.controles.centros.v1";
const KEY_PAR = "usecontabil.adm.controles.parametros.v1";
const KEY_POL = "usecontabil.adm.controles.politicas.v1";

/* ================================ utils ================================== */

export const brl = (v: number) =>
  "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const dataBR = (iso: string) => {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};

export const dataHoraBR = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export const hojeISO = () => new Date().toISOString().slice(0, 10);

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const round = (v: number) => Math.round(v * 100) / 100;

function ler<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      window.localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    const dados = JSON.parse(raw);
    return Array.isArray(dados) ? (dados as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function gravar<T>(key: string, dados: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(dados));
  window.dispatchEvent(new CustomEvent(CONTROLES_EVENT));
}

/* ================================ tipos ================================== */

export const AREAS = ["Preparativos", "Financeiro", "Fiscal", "Administrativo"] as const;
export type Area = (typeof AREAS)[number];

export const ACOES = ["visualizar", "incluir", "editar", "excluir", "aprovar", "encerrar"] as const;
export type AcaoPermissao = (typeof ACOES)[number];

export const PERFIS = ["Controladoria", "Fiscal", "Financeiro", "Administrativo", "Diretoria", "Consulta"] as const;
export type Perfil = (typeof PERFIS)[number];

export type Permissao = { area: Area; acoes: AcaoPermissao[] };

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  cargo: string;
  permissoes: Permissao[];
  duploFator: boolean;
  ativo: boolean;
  ultimoAcesso: string;
  criadoEm: string;
  observacao?: string;
};

export type LogEntrada = {
  id: string;
  data: string;
  usuario: string;
  categoria: "Usuários" | "Centros de custo" | "Parâmetros" | "Políticas" | "Acesso";
  acao: string;
  registro: string;
  detalhe?: string;
  criticidade: "Informativo" | "Relevante" | "Crítico";
};

export type CentroCusto = {
  id: string;
  codigo: string;
  nome: string;
  responsavel: string;
  criterio: string;
  percentual: number;
  natureza: "Produtivo" | "Apoio" | "Comercial" | "Administrativo";
  ativo: boolean;
};

export type Parametro = {
  id: string;
  nome: string;
  valor: string;
  escopo: "Global" | Area;
  sensivel: boolean;
  atualizadoEm: string;
  atualizadoPor: string;
  justificativa?: string;
  descricao: string;
};

export type Politica = {
  id: string;
  nome: string;
  area: Area;
  de: number;
  ate: number | null; // null = sem teto
  aprovador: string;
  duplaAprovacao: boolean;
  ativa: boolean;
};

export const CRITERIOS_RATEIO = [
  "Horas máquina", "Receita líquida", "Headcount", "Área ocupada (m²)",
  "Volume expedido", "Consumo de energia", "Rateio fixo",
];

/* ============================== sementes ================================= */

const perm = (area: Area, acoes: AcaoPermissao[]): Permissao => ({ area, acoes });

// Usuários não têm semente: o cadastro é real e vem do backend (contas de acesso).


const CENTROS_SEED: CentroCusto[] = [
  { id: "cc-01", codigo: "CC-01", nome: "Industrial", responsavel: "Gerência industrial", criterio: "Horas máquina", percentual: 48, natureza: "Produtivo", ativo: true },
  { id: "cc-02", codigo: "CC-02", nome: "Comercial", responsavel: "Diretoria comercial", criterio: "Receita líquida", percentual: 27, natureza: "Comercial", ativo: true },
  { id: "cc-03", codigo: "CC-03", nome: "Administrativo", responsavel: "Controladoria", criterio: "Headcount", percentual: 15, natureza: "Administrativo", ativo: true },
  { id: "cc-04", codigo: "CC-04", nome: "Logística", responsavel: "Supervisão logística", criterio: "Volume expedido", percentual: 8, natureza: "Apoio", ativo: true },
  { id: "cc-05", codigo: "CC-05", nome: "Manutenção", responsavel: "Engenharia", criterio: "Horas máquina", percentual: 2, natureza: "Apoio", ativo: true },
];

const PARAMETROS_SEED: Parametro[] = [
  { id: "par-01", nome: "Bloqueio de competência encerrada", valor: "Ativo", escopo: "Global", sensivel: true, atualizadoEm: "2026-05-12", atualizadoPor: "Marina Costa", descricao: "Impede lançamentos e ajustes em competências já encerradas pela controladoria." },
  { id: "par-02", nome: "Aprovação obrigatória de pagamentos", valor: "Acima de R$ 10.000,00", escopo: "Administrativo", sensivel: true, atualizadoEm: "2026-06-03", atualizadoPor: "Helena Duarte", descricao: "Valor a partir do qual o pagamento exige aprovação conforme a política de alçadas." },
  { id: "par-03", nome: "Importação automática de XML", valor: "Diária às 06h", escopo: "Fiscal", sensivel: false, atualizadoEm: "2026-07-18", atualizadoPor: "Rafael Prado", descricao: "Janela de importação dos documentos fiscais para escrituração." },
  { id: "par-04", nome: "Retenção da trilha de auditoria", valor: "60 meses", escopo: "Global", sensivel: true, atualizadoEm: "2026-02-09", atualizadoPor: "Marina Costa", descricao: "Prazo mínimo de guarda dos registros de auditoria interna." },
  { id: "par-05", nome: "Duplo fator obrigatório", valor: "Perfis Controladoria e Diretoria", escopo: "Global", sensivel: true, atualizadoEm: "2026-04-27", atualizadoPor: "Marina Costa", descricao: "Perfis que exigem segundo fator de autenticação no acesso." },
  { id: "par-06", nome: "Tolerância de divergência na conciliação", valor: "R$ 5,00", escopo: "Financeiro", sensivel: false, atualizadoEm: "2026-06-30", atualizadoPor: "Diego Almeida", descricao: "Diferença aceita para baixa automática na conciliação bancária." },
];

const POLITICAS_SEED: Politica[] = [
  { id: "pol-01", nome: "Pagamento a fornecedor", area: "Administrativo", de: 0, ate: 10_000, aprovador: "Coordenação", duplaAprovacao: false, ativa: true },
  { id: "pol-02", nome: "Pagamento a fornecedor", area: "Administrativo", de: 10_000, ate: 100_000, aprovador: "Diretoria", duplaAprovacao: false, ativa: true },
  { id: "pol-03", nome: "Pagamento a fornecedor", area: "Administrativo", de: 100_000, ate: null, aprovador: "Diretoria + Controladoria", duplaAprovacao: true, ativa: true },
  { id: "pol-04", nome: "Ajuste de apuração fiscal", area: "Fiscal", de: 0, ate: null, aprovador: "Controladoria", duplaAprovacao: false, ativa: true },
  { id: "pol-05", nome: "Baixa de bem do imobilizado", area: "Administrativo", de: 0, ate: 50_000, aprovador: "Controladoria", duplaAprovacao: false, ativa: true },
  { id: "pol-06", nome: "Compra de materiais", area: "Administrativo", de: 0, ate: 20_000, aprovador: "Coordenação", duplaAprovacao: false, ativa: true },
];

const LOG_SEED: LogEntrada[] = [
  { id: "log-01", data: "2026-07-27T09:12:00", usuario: "Rafael Prado", categoria: "Parâmetros", acao: "Encerrou competência", registro: "Fiscal · 06/2026", criticidade: "Crítico", detalhe: "Encerramento após conferência das apurações." },
  { id: "log-02", data: "2026-07-26T17:44:00", usuario: "Marina Costa", categoria: "Parâmetros", acao: "Alterou parâmetro tributário", registro: "Matriz · Regime", criticidade: "Crítico", detalhe: "Lucro Presumido → Lucro Real." },
  { id: "log-03", data: "2026-07-26T11:03:00", usuario: "Carla Mendes", categoria: "Usuários", acao: "Cadastrou fornecedor", registro: "FOR-2016", criticidade: "Informativo" },
  { id: "log-04", data: "2026-07-24T08:55:00", usuario: "Diego Almeida", categoria: "Acesso", acao: "Tentativa de acesso negada", registro: "Fiscal · Apurações", criticidade: "Relevante", detalhe: "Perfil sem permissão na área." },
  { id: "log-05", data: "2026-07-20T14:31:00", usuario: "Helena Duarte", categoria: "Políticas", acao: "Revisou alçada de pagamento", registro: "Administrativo · acima de R$ 100.000", criticidade: "Relevante" },
];

/* =============================== leitura ================================= */

export const listarUsuarios = () => CACHE_USR;
export const listarLog = () =>
  ler<LogEntrada>(KEY_LOG, LOG_SEED).slice().sort((a, b) => b.data.localeCompare(a.data));
export const listarCentros = () => ler<CentroCusto>(KEY_CC, CENTROS_SEED);
export const listarParametros = () => ler<Parametro>(KEY_PAR, PARAMETROS_SEED);
export const listarPoliticas = () => ler<Politica>(KEY_POL, POLITICAS_SEED);

/* ============================== auditoria ================================ */

export function registrarLog(entrada: Omit<LogEntrada, "id" | "data"> & { data?: string }) {
  const atual = ler<LogEntrada>(KEY_LOG, LOG_SEED);
  const novo: LogEntrada = {
    ...entrada,
    id: uid("log"),
    data: entrada.data || new Date().toISOString(),
  };
  gravar(KEY_LOG, [novo, ...atual]);
  return novo;
}

export const resumoLog = () => {
  const log = listarLog();
  const criticos = log.filter((l) => l.criticidade === "Crítico").length;
  const hoje = hojeISO();
  return {
    total: log.length,
    criticos,
    hoje: log.filter((l) => l.data.slice(0, 10) === hoje).length,
    usuarios: new Set(log.map((l) => l.usuario)).size,
    ultima: log[0]?.data || "",
  };
};

/* =============================== usuários ================================ */

export const PERMISSOES_PADRAO: Record<Perfil, Permissao[]> = {
  Controladoria: AREAS.map((a) => perm(a, ["visualizar", "incluir", "editar", "aprovar", "encerrar"])),
  Fiscal: [perm("Fiscal", ["visualizar", "incluir", "editar", "encerrar"]), perm("Financeiro", ["visualizar"])],
  Financeiro: [perm("Financeiro", ["visualizar", "incluir", "editar"]), perm("Administrativo", ["visualizar"])],
  Administrativo: [perm("Administrativo", ["visualizar", "incluir", "editar"]), perm("Preparativos", ["visualizar"])],
  Diretoria: AREAS.map((a) => perm(a, ["visualizar", "aprovar"])),
  Consulta: AREAS.map((a) => perm(a, ["visualizar"])),
};

/** R3 — segregação de funções: executar e aprovar na mesma área. */
export function conflitosSegregacao(u: Usuario) {
  return u.permissoes
    .filter((p) => p.acoes.includes("aprovar") && p.acoes.some((a) => a === "incluir" || a === "editar" || a === "excluir"))
    .map((p) => p.area);
}

/** Divergência entre as permissões do usuário e o padrão do perfil. */
export function excecoesDoPerfil(u: Usuario) {
  const padrao = PERMISSOES_PADRAO[u.perfil] || [];
  const chave = (p: Permissao) => `${p.area}:${p.acoes.slice().sort().join(",")}`;
  const set = new Set(padrao.map(chave));
  return u.permissoes.filter((p) => !set.has(chave(p))).map((p) => p.area);
}

export const areasLiberadas = (u: Usuario) =>
  u.permissoes.filter((p) => p.acoes.length).map((p) => p.area);

/* ------------------------ cadastro real (backend) ------------------------ */

type LinhaUsuario = {
  id: string;
  auth_user_id: string | null;
  nome: string;
  email: string;
  perfil: string;
  cargo: string;
  permissoes: unknown;
  duplo_fator: boolean;
  ativo: boolean;
  ultimo_acesso: string | null;
  observacao: string | null;
  criado_em: string;
};

let CACHE_USR: Usuario[] = [];
let USR_CARREGADO = false;

export const usuariosCarregados = () => USR_CARREGADO;

function mapear(l: LinhaUsuario): Usuario {
  const perfil = (PERFIS as readonly string[]).includes(l.perfil) ? (l.perfil as Perfil) : "Consulta";
  const permissoes = Array.isArray(l.permissoes) ? (l.permissoes as Permissao[]) : [];
  return {
    id: l.id,
    nome: l.nome || l.email,
    email: l.email,
    perfil,
    cargo: l.cargo || "",
    permissoes: permissoes.length ? permissoes : PERMISSOES_PADRAO[perfil],
    duploFator: !!l.duplo_fator,
    ativo: !!l.ativo,
    ultimoAcesso: l.ultimo_acesso || "",
    criadoEm: (l.criado_em || "").slice(0, 10),
    observacao: l.observacao || undefined,
    contaDeAcesso: !!l.auth_user_id,
  };
}

const emitir = () => window.dispatchEvent(new CustomEvent(CONTROLES_EVENT));

async function chamar<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-usuarios", { body });
  if (error) {
    const detalhe = (data as { error?: string } | null)?.error;
    throw new Error(detalhe || "Não foi possível concluir a operação de usuários.");
  }
  if (data && typeof data === "object" && "error" in (data as object)) {
    throw new Error(String((data as { error: string }).error));
  }
  return data as T;
}

/** Traz as contas reais de acesso e o cadastro salvo no backend. */
export async function sincronizarUsuarios() {
  const resp = await chamar<{ usuarios: LinhaUsuario[]; admin: boolean }>({ action: "sync" });
  CACHE_USR = (resp.usuarios || []).map(mapear);
  USR_CARREGADO = true;
  emitir();
  return { usuarios: CACHE_USR, admin: resp.admin };
}

/** Cria a conta de acesso de verdade e devolve a senha provisória. */
export async function convidarUsuario(dados: {
  nome: string; email: string; cargo: string; perfil: Perfil;
  permissoes: Permissao[]; duploFator: boolean; ativo: boolean; observacao?: string;
}) {
  if (!dados.nome.trim()) throw new Error("Informe o nome do usuário.");
  if (!dados.permissoes.filter((p) => p.acoes.length).length) throw new Error("Libere ao menos uma área para o usuário.");
  const resp = await chamar<{ usuario: LinhaUsuario; senhaTemporaria: string }>({ action: "convidar", ...dados });
  registrarLog({
    usuario: "Controladoria", categoria: "Usuários", acao: "Cadastrou usuário",
    registro: dados.nome, criticidade: "Relevante",
    detalhe: `Conta de acesso criada · perfil ${dados.perfil}`,
  });
  await sincronizarUsuarios();
  return resp.senhaTemporaria;
}

export async function atualizarUsuario(id: string, dados: {
  nome: string; cargo: string; perfil: Perfil; permissoes: Permissao[];
  duploFator: boolean; ativo: boolean; observacao?: string;
}) {
  if (!dados.permissoes.filter((p) => p.acoes.length).length) throw new Error("Libere ao menos uma área para o usuário.");
  const { error } = await supabase.from("usuarios").update({
    nome: dados.nome,
    cargo: dados.cargo,
    perfil: dados.perfil,
    permissoes: dados.permissoes as unknown as never,
    duplo_fator: dados.duploFator,
    ativo: dados.ativo,
    observacao: dados.observacao || null,
  }).eq("id", id);
  if (error) throw new Error("Sem permissão para alterar usuários (apenas administradores).");
  registrarLog({
    usuario: "Controladoria", categoria: "Usuários", acao: "Alterou usuário",
    registro: dados.nome, criticidade: "Relevante",
    detalhe: `Perfil ${dados.perfil} · áreas: ${dados.permissoes.filter((p) => p.acoes.length).map((p) => p.area).join(", ")}`,
  });
  await sincronizarUsuarios();
}

export async function alternarUsuario(id: string, autor = "Controladoria") {
  const u = CACHE_USR.find((x) => x.id === id);
  const resp = await chamar<{ ativo: boolean }>({ action: "bloquear", id });
  registrarLog({
    usuario: autor, categoria: "Usuários", acao: resp.ativo ? "Reativou acesso" : "Bloqueou acesso",
    registro: u?.nome || id, criticidade: "Crítico",
  });
  await sincronizarUsuarios();
}

export async function excluirUsuario(id: string, autor = "Controladoria") {
  const u = CACHE_USR.find((x) => x.id === id);
  await chamar({ action: "excluir", id });
  registrarLog({ usuario: autor, categoria: "Usuários", acao: "Excluiu usuário", registro: u?.nome || id, criticidade: "Crítico" });
  await sincronizarUsuarios();
}

export async function redefinirSenhaUsuario(id: string, autor = "Controladoria") {
  const u = CACHE_USR.find((x) => x.id === id);
  const resp = await chamar<{ senhaTemporaria: string }>({ action: "redefinir-senha", id });
  registrarLog({ usuario: autor, categoria: "Usuários", acao: "Redefiniu senha de acesso", registro: u?.nome || id, criticidade: "Crítico" });
  return resp.senhaTemporaria;
}


export function resumoUsuarios() {
  const lista = listarUsuarios();
  const ativos = lista.filter((u) => u.ativo);
  return {
    total: lista.length,
    ativos: ativos.length,
    inativos: lista.length - ativos.length,
    semDuploFator: ativos.filter((u) => !u.duploFator).length,
    conflitos: ativos.filter((u) => conflitosSegregacao(u).length).length,
    aprovadores: ativos.filter((u) => u.permissoes.some((p) => p.acoes.includes("aprovar"))).length,
  };
}

/* ============================ centros de custo =========================== */

export const totalRateio = (lista = listarCentros()) =>
  round(lista.filter((c) => c.ativo).reduce((s, c) => s + c.percentual, 0));

export function salvarCentro(dados: Omit<CentroCusto, "id"> & { id?: string }, autor = "Controladoria") {
  const lista = listarCentros();
  if (!dados.codigo.trim() || !dados.nome.trim()) throw new Error("Informe código e nome do centro de custo.");
  if (dados.percentual < 0 || dados.percentual > 100) throw new Error("O percentual de rateio deve ficar entre 0 e 100.");
  const duplicado = lista.some((c) => c.codigo.toLowerCase() === dados.codigo.trim().toLowerCase() && c.id !== dados.id);
  if (duplicado) throw new Error("Já existe um centro de custo com este código.");
  if (dados.id) {
    const idx = lista.findIndex((c) => c.id === dados.id);
    if (idx < 0) throw new Error("Centro de custo não encontrado.");
    lista[idx] = { ...lista[idx], ...dados, id: dados.id };
    gravar(KEY_CC, lista);
    registrarLog({ usuario: autor, categoria: "Centros de custo", acao: "Alterou centro de custo", registro: `${lista[idx].codigo} · ${lista[idx].nome}`, criticidade: "Relevante", detalhe: `Rateio ${lista[idx].percentual}% por ${lista[idx].criterio}` });
    return lista[idx];
  }
  const novo: CentroCusto = { ...(dados as Omit<CentroCusto, "id">), id: uid("cc") };
  gravar(KEY_CC, [...lista, novo]);
  registrarLog({ usuario: autor, categoria: "Centros de custo", acao: "Cadastrou centro de custo", registro: `${novo.codigo} · ${novo.nome}`, criticidade: "Relevante" });
  return novo;
}

/** R6 — inativar centro com rateio exige zerar o percentual antes. */
export function alternarCentro(id: string, autor = "Controladoria") {
  const lista = listarCentros();
  const c = lista.find((x) => x.id === id);
  if (!c) return;
  if (c.ativo && c.percentual > 0) throw new Error("Redistribua o percentual de rateio antes de inativar este centro.");
  c.ativo = !c.ativo;
  gravar(KEY_CC, lista);
  registrarLog({ usuario: autor, categoria: "Centros de custo", acao: c.ativo ? "Reativou centro de custo" : "Inativou centro de custo", registro: `${c.codigo} · ${c.nome}`, criticidade: "Relevante" });
}

export function excluirCentro(id: string, autor = "Controladoria") {
  const lista = listarCentros();
  const c = lista.find((x) => x.id === id);
  gravar(KEY_CC, lista.filter((x) => x.id !== id));
  if (c) registrarLog({ usuario: autor, categoria: "Centros de custo", acao: "Excluiu centro de custo", registro: `${c.codigo} · ${c.nome}`, criticidade: "Crítico" });
}

/** Distribui automaticamente a diferença até fechar 100% (proporcional). */
export function equalizarRateio(autor = "Controladoria") {
  const lista = listarCentros();
  const ativos = lista.filter((c) => c.ativo);
  if (!ativos.length) throw new Error("Nenhum centro de custo ativo para ratear.");
  const base = ativos.reduce((s, c) => s + c.percentual, 0);
  ativos.forEach((c, i) => {
    c.percentual = base > 0 ? round((c.percentual / base) * 100) : round(100 / ativos.length);
    if (i === ativos.length - 1) {
      const soma = ativos.slice(0, -1).reduce((s, x) => s + x.percentual, 0);
      c.percentual = round(100 - soma);
    }
  });
  gravar(KEY_CC, lista);
  registrarLog({ usuario: autor, categoria: "Centros de custo", acao: "Equalizou rateio", registro: "Todos os centros ativos", criticidade: "Relevante", detalhe: "Percentuais ajustados proporcionalmente para 100%." });
}

/** Simula a apropriação de um valor pelos centros ativos. */
export function simularRateio(valor: number) {
  const ativos = listarCentros().filter((c) => c.ativo);
  const soma = ativos.reduce((s, c) => s + c.percentual, 0) || 1;
  return ativos.map((c) => ({
    centro: `${c.codigo} · ${c.nome}`,
    percentual: c.percentual,
    valor: round((valor * c.percentual) / soma),
  }));
}

/* ============================== parâmetros =============================== */

export function salvarParametro(dados: Omit<Parametro, "atualizadoEm" | "atualizadoPor" | "id"> & { id?: string }, autor = "Controladoria") {
  const lista = listarParametros();
  if (!dados.nome.trim()) throw new Error("Informe o nome do parâmetro.");
  if (dados.sensivel && !dados.justificativa?.trim()) throw new Error("Parâmetro sensível exige justificativa da alteração.");
  if (dados.id) {
    const idx = lista.findIndex((p) => p.id === dados.id);
    if (idx < 0) throw new Error("Parâmetro não encontrado.");
    const anterior = lista[idx].valor;
    lista[idx] = { ...lista[idx], ...dados, id: dados.id, atualizadoEm: hojeISO(), atualizadoPor: autor };
    gravar(KEY_PAR, lista);
    registrarLog({
      usuario: autor, categoria: "Parâmetros", acao: "Alterou parâmetro", registro: lista[idx].nome,
      criticidade: lista[idx].sensivel ? "Crítico" : "Informativo",
      detalhe: `${anterior} → ${lista[idx].valor}${dados.justificativa ? ` · ${dados.justificativa}` : ""}`,
    });
    return lista[idx];
  }
  const novo: Parametro = { ...(dados as Omit<Parametro, "id" | "atualizadoEm" | "atualizadoPor">), id: uid("par"), atualizadoEm: hojeISO(), atualizadoPor: autor };
  gravar(KEY_PAR, [...lista, novo]);
  registrarLog({ usuario: autor, categoria: "Parâmetros", acao: "Criou parâmetro", registro: novo.nome, criticidade: novo.sensivel ? "Crítico" : "Informativo", detalhe: `Valor inicial: ${novo.valor}` });
  return novo;
}

export function excluirParametro(id: string, autor = "Controladoria") {
  const lista = listarParametros();
  const p = lista.find((x) => x.id === id);
  if (p?.sensivel) throw new Error("Parâmetro sensível não pode ser excluído — ajuste o valor.");
  gravar(KEY_PAR, lista.filter((x) => x.id !== id));
  if (p) registrarLog({ usuario: autor, categoria: "Parâmetros", acao: "Excluiu parâmetro", registro: p.nome, criticidade: "Relevante" });
}

/* =============================== políticas =============================== */

export function salvarPolitica(dados: Omit<Politica, "id"> & { id?: string }, autor = "Controladoria") {
  const lista = listarPoliticas();
  if (!dados.nome.trim() || !dados.aprovador.trim()) throw new Error("Informe a política e o aprovador.");
  if (dados.ate !== null && dados.ate <= dados.de) throw new Error("O valor final da faixa deve ser maior que o inicial.");
  if (dados.id) {
    const idx = lista.findIndex((p) => p.id === dados.id);
    if (idx < 0) throw new Error("Política não encontrada.");
    lista[idx] = { ...lista[idx], ...dados, id: dados.id };
    gravar(KEY_POL, lista);
    registrarLog({ usuario: autor, categoria: "Políticas", acao: "Alterou alçada", registro: `${lista[idx].nome} · ${lista[idx].area}`, criticidade: "Crítico", detalhe: `${faixaLabel(lista[idx])} → ${lista[idx].aprovador}` });
    return lista[idx];
  }
  const nova: Politica = { ...(dados as Omit<Politica, "id">), id: uid("pol") };
  gravar(KEY_POL, [...lista, nova]);
  registrarLog({ usuario: autor, categoria: "Políticas", acao: "Criou alçada", registro: `${nova.nome} · ${nova.area}`, criticidade: "Crítico", detalhe: `${faixaLabel(nova)} → ${nova.aprovador}` });
  return nova;
}

export function alternarPolitica(id: string, autor = "Controladoria") {
  const lista = listarPoliticas();
  const p = lista.find((x) => x.id === id);
  if (!p) return;
  p.ativa = !p.ativa;
  gravar(KEY_POL, lista);
  registrarLog({ usuario: autor, categoria: "Políticas", acao: p.ativa ? "Reativou alçada" : "Suspendeu alçada", registro: `${p.nome} · ${faixaLabel(p)}`, criticidade: "Crítico" });
}

export function excluirPolitica(id: string, autor = "Controladoria") {
  const lista = listarPoliticas();
  const p = lista.find((x) => x.id === id);
  gravar(KEY_POL, lista.filter((x) => x.id !== id));
  if (p) registrarLog({ usuario: autor, categoria: "Políticas", acao: "Excluiu alçada", registro: `${p.nome} · ${faixaLabel(p)}`, criticidade: "Crítico" });
}

export const faixaLabel = (p: Politica) =>
  p.ate === null ? `Acima de ${brl(p.de)}` : p.de === 0 ? `Até ${brl(p.ate)}` : `${brl(p.de)} a ${brl(p.ate)}`;

/** R8 — motor de alçada: quem aprova um valor nesta política/área. */
export function avaliarAlcada(nome: string, area: Area, valor: number) {
  const faixas = listarPoliticas().filter((p) => p.ativa && p.nome === nome && p.area === area);
  const faixa = faixas.find((p) => valor > p.de - (p.de === 0 ? 1 : 0) && (p.ate === null || valor <= p.ate));
  return faixa
    ? { encontrada: true as const, aprovador: faixa.aprovador, dupla: faixa.duplaAprovacao, faixa: faixaLabel(faixa) }
    : { encontrada: false as const, aprovador: "", dupla: false, faixa: "" };
}

/** Lacunas e sobreposições nas faixas de cada política ativa. */
export function inconsistenciasAlcadas() {
  const lista = listarPoliticas().filter((p) => p.ativa);
  const grupos = new Map<string, Politica[]>();
  lista.forEach((p) => {
    const k = `${p.nome}__${p.area}`;
    grupos.set(k, [...(grupos.get(k) || []), p]);
  });
  const achados: { politica: string; area: Area; tipo: "Lacuna" | "Sobreposição" | "Sem teto"; detalhe: string }[] = [];
  grupos.forEach((faixas, k) => {
    const [nome, area] = k.split("__") as [string, Area];
    const ord = faixas.slice().sort((a, b) => a.de - b.de);
    if (ord[0].de > 0) achados.push({ politica: nome, area, tipo: "Lacuna", detalhe: `Nenhuma alçada definida abaixo de ${brl(ord[0].de)}.` });
    for (let i = 0; i < ord.length - 1; i++) {
      const atual = ord[i], prox = ord[i + 1];
      if (atual.ate === null) { achados.push({ politica: nome, area, tipo: "Sobreposição", detalhe: `Faixa sem teto antes de ${brl(prox.de)}.` }); continue; }
      if (atual.ate < prox.de) achados.push({ politica: nome, area, tipo: "Lacuna", detalhe: `Valores entre ${brl(atual.ate)} e ${brl(prox.de)} sem aprovador.` });
      if (atual.ate > prox.de) achados.push({ politica: nome, area, tipo: "Sobreposição", detalhe: `Faixas conflitantes em torno de ${brl(prox.de)}.` });
    }
    if (ord[ord.length - 1].ate !== null) achados.push({ politica: nome, area, tipo: "Sem teto", detalhe: `Valores acima de ${brl(ord[ord.length - 1].ate as number)} sem aprovador definido.` });
  });
  return achados;
}
