// Módulo de Serviços (Preparativos) — fases, tarefas do fechamento e encerramentos.
// Armazenamento local (protótipo, sem integração com órgãos externos).
import { useEffect, useState } from "react";
import { loadEmpresas, type EmpresaRecord } from "@/lib/empresasStore";
import { loadFiliais } from "@/lib/filiaisStore";
import { documentosPendentes, linhasDoPeriodo, somar } from "@/lib/escrituracaoStore";

const KEY_MODELOS = "usecontabil.tarefaModelos.v1";
const KEY_EXEC = "usecontabil.tarefaExec.v1";
const KEY_FECHAMENTO = "usecontabil.fechamentos.v1";

export const GESTAO_EVENT = "usecontabil:gestao-changed";

export type FaseSlug = "cadastros" | "escrituracao" | "conciliacao" | "apuracao" | "encerramento";

export const FASES: { slug: FaseSlug; title: string; desc: string; ordem: number }[] = [
  { slug: "cadastros", title: "1. Cadastros e parâmetros", desc: "Empresa, unidades, classe de atividade e parâmetros revisados.", ordem: 1 },
  { slug: "escrituracao", title: "2. Escrituração", desc: "Documentos e lançamentos do período registrados.", ordem: 2 },
  { slug: "conciliacao", title: "3. Conciliação", desc: "Contas conciliadas e diferenças tratadas.", ordem: 3 },
  { slug: "apuracao", title: "4. Apuração", desc: "Tributos e resultado apurados na competência.", ordem: 4 },
  { slug: "encerramento", title: "5. Encerramento", desc: "Demonstrações revisadas e período bloqueado.", ordem: 5 },
];

export const PERIODICIDADES = ["Mensal", "Trimestral", "Anual", "Eventual"];

export type TarefaModelo = {
  id: string;
  titulo: string;
  fase: FaseSlug;
  periodicidade: string;
  responsavel: string;
  diaPrazo: number;
  obrigatoria: boolean;
  ativa: boolean;
};

export type TarefaStatus = "Pendente" | "Em andamento" | "Concluída" | "Não se aplica";

export type TarefaExec = {
  key: string; // empresaId|competencia|modeloId
  empresaId: string;
  competencia: string;
  modeloId: string;
  status: TarefaStatus;
  observacao: string;
  atualizadoEm: string;
};

export type Fechamento = {
  key: string; // empresaId|competencia
  empresaId: string;
  competencia: string;
  fechadoEm: string;
  responsavel: string;
  observacao: string;
};

const SEED_MODELOS: TarefaModelo[] = [
  { id: "TRF-001", titulo: "Conferir cadastro e parâmetros da empresa", fase: "cadastros", periodicidade: "Mensal", responsavel: "Contabilidade interna", diaPrazo: 3, obrigatoria: true, ativa: true },
  { id: "TRF-002", titulo: "Revisar unidades e centros de custo ativos", fase: "cadastros", periodicidade: "Mensal", responsavel: "Contabilidade interna", diaPrazo: 3, obrigatoria: true, ativa: true },
  { id: "TRF-003", titulo: "Importar documentos fiscais de entrada", fase: "escrituracao", periodicidade: "Mensal", responsavel: "Fiscal", diaPrazo: 8, obrigatoria: true, ativa: true },
  { id: "TRF-004", titulo: "Importar documentos fiscais de saída", fase: "escrituracao", periodicidade: "Mensal", responsavel: "Fiscal", diaPrazo: 8, obrigatoria: true, ativa: true },
  { id: "TRF-005", titulo: "Lançar despesas e provisões do período", fase: "escrituracao", periodicidade: "Mensal", responsavel: "Contabilidade interna", diaPrazo: 10, obrigatoria: true, ativa: true },
  { id: "TRF-006", titulo: "Conciliação bancária das contas ativas", fase: "conciliacao", periodicidade: "Mensal", responsavel: "Tesouraria", diaPrazo: 12, obrigatoria: true, ativa: true },
  { id: "TRF-007", titulo: "Conciliar contas a pagar e a receber", fase: "conciliacao", periodicidade: "Mensal", responsavel: "Tesouraria", diaPrazo: 14, obrigatoria: true, ativa: true },
  { id: "TRF-008", titulo: "Conferir saldo de estoques", fase: "conciliacao", periodicidade: "Mensal", responsavel: "Controladoria", diaPrazo: 14, obrigatoria: false, ativa: true },
  { id: "TRF-009", titulo: "Apurar tributos do período", fase: "apuracao", periodicidade: "Mensal", responsavel: "Fiscal", diaPrazo: 18, obrigatoria: true, ativa: true },
  { id: "TRF-010", titulo: "Revisar ajustes de apuração", fase: "apuracao", periodicidade: "Mensal", responsavel: "Fiscal", diaPrazo: 18, obrigatoria: false, ativa: true },
  { id: "TRF-011", titulo: "Revisar DRE e balancete", fase: "encerramento", periodicidade: "Mensal", responsavel: "Controladoria", diaPrazo: 20, obrigatoria: true, ativa: true },
  { id: "TRF-012", titulo: "Arquivar relatórios do fechamento", fase: "encerramento", periodicidade: "Mensal", responsavel: "Controladoria", diaPrazo: 22, obrigatoria: true, ativa: true },
];

function notify() {
  window.dispatchEvent(new Event(GESTAO_EVENT));
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// ---------- Modelos de tarefa ----------
export function loadModelos(): TarefaModelo[] {
  const raw = localStorage.getItem(KEY_MODELOS);
  if (!raw) {
    localStorage.setItem(KEY_MODELOS, JSON.stringify(SEED_MODELOS));
    return [...SEED_MODELOS];
  }
  try {
    return JSON.parse(raw) as TarefaModelo[];
  } catch {
    return [...SEED_MODELOS];
  }
}

export function saveModelo(rec: TarefaModelo) {
  const list = loadModelos();
  const idx = list.findIndex((m) => m.id === rec.id);
  if (idx >= 0) list[idx] = rec;
  else list.push(rec);
  localStorage.setItem(KEY_MODELOS, JSON.stringify(list));
  notify();
}

export function removeModelo(id: string) {
  localStorage.setItem(KEY_MODELOS, JSON.stringify(loadModelos().filter((m) => m.id !== id)));
  notify();
}

export function nextModeloId() {
  const max = loadModelos().reduce((acc, m) => {
    const n = Number(m.id.replace(/\D/g, ""));
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `TRF-${String(max + 1).padStart(3, "0")}`;
}

// ---------- Execução das tarefas ----------
export function execKey(empresaId: string, competencia: string, modeloId: string) {
  return `${empresaId}|${competencia}|${modeloId}`;
}

export function loadExecucoes(): TarefaExec[] {
  return read<TarefaExec[]>(KEY_EXEC, []);
}

export function getExecStatus(empresaId: string, competencia: string, modeloId: string): TarefaStatus {
  const found = loadExecucoes().find((e) => e.key === execKey(empresaId, competencia, modeloId));
  return found?.status ?? "Pendente";
}

export function setExecucao(
  empresaId: string,
  competencia: string,
  modeloId: string,
  patch: { status?: TarefaStatus; observacao?: string },
) {
  const list = loadExecucoes();
  const key = execKey(empresaId, competencia, modeloId);
  const idx = list.findIndex((e) => e.key === key);
  const base: TarefaExec =
    idx >= 0
      ? list[idx]
      : { key, empresaId, competencia, modeloId, status: "Pendente", observacao: "", atualizadoEm: "" };
  const next: TarefaExec = { ...base, ...patch, atualizadoEm: new Date().toISOString() };
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  localStorage.setItem(KEY_EXEC, JSON.stringify(list));
  notify();
}

export function resetExecucoes(empresaId: string, competencia: string) {
  const list = loadExecucoes().filter((e) => !(e.empresaId === empresaId && e.competencia === competencia));
  localStorage.setItem(KEY_EXEC, JSON.stringify(list));
  notify();
}

// ---------- Fechamentos ----------
export function loadFechamentos(): Fechamento[] {
  return read<Fechamento[]>(KEY_FECHAMENTO, []);
}

export function getFechamento(empresaId: string, competencia: string) {
  return loadFechamentos().find((f) => f.key === `${empresaId}|${competencia}`);
}

export function fecharPeriodo(rec: Omit<Fechamento, "key" | "fechadoEm">) {
  const list = loadFechamentos();
  const key = `${rec.empresaId}|${rec.competencia}`;
  const next: Fechamento = { ...rec, key, fechadoEm: new Date().toISOString() };
  const idx = list.findIndex((f) => f.key === key);
  if (idx >= 0) list[idx] = next;
  else list.unshift(next);
  localStorage.setItem(KEY_FECHAMENTO, JSON.stringify(list));
  notify();
}

export function reabrirPeriodo(empresaId: string, competencia: string) {
  const list = loadFechamentos().filter((f) => f.key !== `${empresaId}|${competencia}`);
  localStorage.setItem(KEY_FECHAMENTO, JSON.stringify(list));
  notify();
}

// ---------- Pendências de cadastro ----------
export type PendenciaCadastro = {
  id: string;
  titulo: string;
  detalhe: string;
  destino: string;
  critica: boolean;
  resolvida: boolean;
};

export function pendenciasCadastro(empresaId: string | null): PendenciaCadastro[] {
  const empresas = loadEmpresas();
  const empresa: EmpresaRecord | undefined = empresas.find((e) => e.id === empresaId);
  const filiais = loadFiliais().filter((f) => f.empresaId === empresaId);
  const raw = (empresa?.raw ?? {}) as Record<string, any>;
  const has = (v: any) => typeof v === "string" && v.trim().length > 0;

  const items: PendenciaCadastro[] = [
    {
      id: "empresa",
      titulo: "Empresa do grupo cadastrada",
      detalhe: "Dados básicos da empresa registrados.",
      destino: "/preparativos/cadastros/empresas",
      critica: true,
      resolvida: Boolean(empresa),
    },
    {
      id: "cnpj",
      titulo: "CNPJ informado",
      detalhe: "CNPJ é base para a apuração e para os relatórios.",
      destino: "/preparativos/cadastros/empresas",
      critica: true,
      resolvida: has(empresa?.cnpj),
    },
    {
      id: "regime",
      titulo: "Regime tributário definido",
      detalhe: "Define as tabelas de apuração usadas no período.",
      destino: "/preparativos/cadastros/empresas",
      critica: true,
      resolvida: has(empresa?.regime),
    },
    {
      id: "atividade",
      titulo: "Classe de atividade vinculada",
      detalhe: "CNAE principal usado nos resumos por atividade.",
      destino: "/preparativos/cadastros/classe-atividades",
      critica: true,
      resolvida: has(raw.classeAtividadeId) || has(empresa?.atividade),
    },
    {
      id: "unidade",
      titulo: "Ao menos uma unidade ativa",
      detalhe: "Matriz, filial ou unidade operacional cadastrada.",
      destino: "/preparativos/cadastros/filiais",
      critica: true,
      resolvida: filiais.some((f) => f.status === "Ativa"),
    },
    {
      id: "matriz",
      titulo: "Matriz definida",
      detalhe: "Uma das unidades deve ser marcada como matriz.",
      destino: "/preparativos/cadastros/filiais",
      critica: false,
      resolvida: filiais.some((f) => f.tipo === "Matriz"),
    },
    {
      id: "endereco",
      titulo: "Endereço completo",
      detalhe: "Necessário para cabeçalhos de relatórios internos.",
      destino: "/preparativos/empresa/dados-empresa",
      critica: false,
      resolvida: has(raw.cidade) && has(raw.uf),
    },
    {
      id: "responsavel",
      titulo: "Responsável técnico informado",
      detalhe: "Assina os relatórios internos do fechamento.",
      destino: "/preparativos/empresa/dados-empresa",
      critica: false,
      resolvida: has(raw.respNome) || has(raw.responsavel),
    },
  ];

  return items;
}

// ---------- Consolidação ----------
export type FaseResumo = {
  slug: FaseSlug;
  title: string;
  desc: string;
  total: number;
  concluidas: number;
  pendentes: number;
  progresso: number;
};

export function resumoFases(
  modelos: TarefaModelo[],
  execucoes: TarefaExec[],
  empresaId: string | null,
  competencia: string,
): FaseResumo[] {
  return FASES.map((f) => {
    const list = modelos.filter((m) => m.ativa && m.fase === f.slug);
    const relevantes = list.filter((m) => {
      const st = execucoes.find((e) => e.key === execKey(empresaId ?? "", competencia, m.id))?.status;
      return st !== "Não se aplica";
    });
    const concluidas = relevantes.filter(
      (m) => execucoes.find((e) => e.key === execKey(empresaId ?? "", competencia, m.id))?.status === "Concluída",
    ).length;
    const total = relevantes.length;
    return {
      slug: f.slug,
      title: f.title,
      desc: f.desc,
      total,
      concluidas,
      pendentes: total - concluidas,
      progresso: total === 0 ? 100 : Math.round((concluidas / total) * 100),
    };
  });
}

export function useGestao() {
  const [state, setState] = useState(() => ({
    modelos: loadModelos(),
    execucoes: loadExecucoes(),
    fechamentos: loadFechamentos(),
  }));
  useEffect(() => {
    const refresh = () =>
      setState({ modelos: loadModelos(), execucoes: loadExecucoes(), fechamentos: loadFechamentos() });
    window.addEventListener(GESTAO_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(GESTAO_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return state;
}

/**
 * Pendências da fase de Escrituração — derivadas do estado real das telas
 * de Fiscal › Escrituração (livros, apurações, inventário e CIAP).
 */
export function pendenciasEscrituracao(
  empresaId: string | null,
  competencia: string,
): PendenciaCadastro[] {
  if (!empresaId) return [];
  const entradas = linhasDoPeriodo("livro-entradas", empresaId, competencia);
  const saidas = linhasDoPeriodo("livro-saidas", empresaId, competencia);
  const icms = linhasDoPeriodo("apuracao-icms", empresaId, competencia);
  const inventario = linhasDoPeriodo("inventario", empresaId, competencia);
  const ciap = linhasDoPeriodo("ciap", empresaId, competencia);
  const pendentes = documentosPendentes(empresaId, competencia);
  const mes = competencia.split("-")[1];

  const items: PendenciaCadastro[] = [
    {
      id: "docs-pendentes",
      titulo: "Documentos fiscais sem pendência",
      detalhe: pendentes
        ? `${pendentes} documento(s) pendentes ou divergentes na competência.`
        : "Todos os documentos da competência estão escriturados.",
      destino: "/fiscal/documentos/entradas",
      critica: true,
      resolvida: pendentes === 0,
    },
    {
      id: "livro-entradas",
      titulo: "Livro de entradas gerado",
      detalhe: "Entradas consolidadas por CFOP a partir dos documentos.",
      destino: "/fiscal/escrituracao/livro-entradas",
      critica: true,
      resolvida: entradas.length > 0,
    },
    {
      id: "livro-saidas",
      titulo: "Livro de saídas gerado",
      detalhe: "Saídas, cupons e serviços prestados consolidados por CFOP.",
      destino: "/fiscal/escrituracao/livro-saidas",
      critica: true,
      resolvida: saidas.length > 0,
    },
    {
      id: "apuracao-icms",
      titulo: "ICMS apurado",
      detalhe: "Débitos, créditos e saldo do período calculados a partir dos livros.",
      destino: "/fiscal/escrituracao/apuracao-icms",
      critica: true,
      resolvida: icms.length > 0,
    },
    {
      id: "ciap",
      titulo: "CIAP atualizado",
      detalhe: ciap.length
        ? `Crédito de ativo apropriado no mês: R$ ${somar(ciap, "mes").toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`
        : "Sem bens em apropriação — informe se a empresa tiver ativo imobilizado com crédito.",
      destino: "/fiscal/escrituracao/ciap",
      critica: false,
      resolvida: ciap.length > 0,
    },
  ];

  if (mes === "12") {
    items.push({
      id: "inventario",
      titulo: "Inventário anual (Bloco H)",
      detalhe: "Estoque declarado com data-base 31/12.",
      destino: "/fiscal/escrituracao/inventario",
      critica: true,
      resolvida: inventario.length > 0,
    });
  }

  return items;
}
