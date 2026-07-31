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

/** Regimes tributários atendidos pelas tarefas do fechamento. */
export type RegimeTributario =
  | "Simples Nacional"
  | "MEI"
  | "Lucro Presumido"
  | "Lucro Real"
  | "Outro";

export const REGIMES_TAREFA: RegimeTributario[] = [
  "Simples Nacional",
  "MEI",
  "Lucro Presumido",
  "Lucro Real",
  "Outro",
];

/** Normaliza o texto livre do cadastro da empresa em um regime conhecido. */
export function normalizarRegime(valor?: string | null): RegimeTributario {
  const r = (valor ?? "").toLowerCase();
  if (r.includes("mei") || r.includes("simei") || r.includes("microempreendedor")) return "MEI";
  if (r.includes("simples")) return "Simples Nacional";
  if (r.includes("presumido")) return "Lucro Presumido";
  if (r.includes("real")) return "Lucro Real";
  return "Outro";
}

export type TarefaModelo = {
  id: string;
  titulo: string;
  fase: FaseSlug;
  periodicidade: string;
  responsavel: string;
  diaPrazo: number;
  obrigatoria: boolean;
  ativa: boolean;
  /** Vazio/ausente = vale para todos os regimes. */
  regimes?: RegimeTributario[];
  detalhe?: string;
  destino?: string;
};

/** A tarefa se aplica ao regime informado? */
export function aplicaAoRegime(m: TarefaModelo, regime: RegimeTributario | null) {
  if (!m.regimes || m.regimes.length === 0) return true;
  if (!regime) return false;
  return m.regimes.includes(regime);
}

/** Tarefas ativas válidas para o regime da empresa selecionada. */
export function modelosDoRegime(modelos: TarefaModelo[], regime: RegimeTributario | null) {
  return modelos.filter((m) => m.ativa && aplicaAoRegime(m, regime));
}

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
  { id: "TRF-001", titulo: "Conferir cadastro e parâmetros da empresa", fase: "cadastros", periodicidade: "Mensal", responsavel: "Contabilidade interna", diaPrazo: 3, obrigatoria: true, ativa: true, destino: "/preparativos/cadastros/empresas" },
  { id: "TRF-002", titulo: "Revisar unidades e centros de custo ativos", fase: "cadastros", periodicidade: "Mensal", responsavel: "Contabilidade interna", diaPrazo: 3, obrigatoria: true, ativa: true, destino: "/preparativos/cadastros/filiais" },
  { id: "TRF-003", titulo: "Importar documentos fiscais de entrada", fase: "escrituracao", periodicidade: "Mensal", responsavel: "Fiscal", diaPrazo: 8, obrigatoria: true, ativa: true, destino: "/fiscal/documentos/entradas" },
  { id: "TRF-004", titulo: "Importar documentos fiscais de saída", fase: "escrituracao", periodicidade: "Mensal", responsavel: "Fiscal", diaPrazo: 8, obrigatoria: true, ativa: true, destino: "/fiscal/documentos/saidas" },
  { id: "TRF-005", titulo: "Lançar despesas e provisões do período", fase: "escrituracao", periodicidade: "Mensal", responsavel: "Contabilidade interna", diaPrazo: 10, obrigatoria: true, ativa: true, destino: "/financeiro/movimentos/demais-documentos" },
  { id: "TRF-006", titulo: "Conciliação bancária das contas ativas", fase: "conciliacao", periodicidade: "Mensal", responsavel: "Tesouraria", diaPrazo: 12, obrigatoria: true, ativa: true, destino: "/financeiro/operacional/conciliacao-bancaria" },
  { id: "TRF-007", titulo: "Conciliar contas a pagar e a receber", fase: "conciliacao", periodicidade: "Mensal", responsavel: "Tesouraria", diaPrazo: 14, obrigatoria: true, ativa: true, destino: "/administrativo/financeiro-operacional/contas-receber" },
  { id: "TRF-008", titulo: "Conferir saldo de estoques", fase: "conciliacao", periodicidade: "Mensal", responsavel: "Controladoria", diaPrazo: 14, obrigatoria: false, ativa: true, destino: "/fiscal/escrituracao/inventario" },
  { id: "TRF-009", titulo: "Apurar tributos do período", fase: "apuracao", periodicidade: "Mensal", responsavel: "Fiscal", diaPrazo: 18, obrigatoria: true, ativa: true, destino: "/fiscal/apuracoes" },
  { id: "TRF-010", titulo: "Revisar ajustes de apuração", fase: "apuracao", periodicidade: "Mensal", responsavel: "Fiscal", diaPrazo: 18, obrigatoria: false, ativa: true, destino: "/financeiro/tabelas/ajuste-apuracao" },
  { id: "TRF-011", titulo: "Revisar DRE e balancete", fase: "encerramento", periodicidade: "Mensal", responsavel: "Controladoria", diaPrazo: 20, obrigatoria: true, ativa: true, destino: "/financeiro/demonstracoes/dre" },
  { id: "TRF-012", titulo: "Arquivar relatórios do fechamento", fase: "encerramento", periodicidade: "Mensal", responsavel: "Controladoria", diaPrazo: 22, obrigatoria: true, ativa: true, destino: "/financeiro/movimentos/conclusao-fiscal" },

  // ---- Simples Nacional ----
  { id: "SN-001", titulo: "Confirmar opção pelo Simples Nacional e anexos aplicáveis", fase: "cadastros", periodicidade: "Mensal", responsavel: "Fiscal", diaPrazo: 3, obrigatoria: true, ativa: true, regimes: ["Simples Nacional"], detalhe: "Verifique a opção vigente, os CNAEs permitidos e os anexos (I a V) de cada atividade.", destino: "/preparativos/cadastros/classe-atividades" },
  { id: "SN-002", titulo: "Conferir CSOSN e CRT 1 nos documentos emitidos", fase: "cadastros", periodicidade: "Mensal", responsavel: "Fiscal", diaPrazo: 5, obrigatoria: true, ativa: true, regimes: ["Simples Nacional"], detalhe: "Optantes usam CSOSN (101, 102, 500...) e CRT 1 — CST de regime normal gera rejeição.", destino: "/fiscal/auditoria/classificacao" },
  { id: "SN-003", titulo: "Segregar receitas por anexo, atividade e mercado", fase: "escrituracao", periodicidade: "Mensal", responsavel: "Fiscal", diaPrazo: 8, obrigatoria: true, ativa: true, regimes: ["Simples Nacional"], detalhe: "Separe comércio, indústria e serviços, além de receitas com ST, monofásicas, imunes e exportação.", destino: "/financeiro/movimentos/faturamento" },
  { id: "SN-004", titulo: "Conferir retenções de ISS e INSS sobre serviços", fase: "escrituracao", periodicidade: "Mensal", responsavel: "Fiscal", diaPrazo: 10, obrigatoria: true, ativa: true, regimes: ["Simples Nacional"], detalhe: "Serviços com retenção reduzem o valor do DAS na parcela correspondente ao ISS.", destino: "/fiscal/apuracoes/retencoes" },
  { id: "SN-005", titulo: "Atualizar RBT12 e verificar sublimite estadual", fase: "apuracao", periodicidade: "Mensal", responsavel: "Fiscal", diaPrazo: 15, obrigatoria: true, ativa: true, regimes: ["Simples Nacional"], detalhe: "A receita bruta dos 12 meses anteriores define a faixa; ultrapassar o sublimite joga ICMS/ISS para fora do DAS.", destino: "/fiscal/apuracoes/simples-nacional" },
  { id: "SN-006", titulo: "Apurar o DAS no cálculo do PGDAS-D", fase: "apuracao", periodicidade: "Mensal", responsavel: "Fiscal", diaPrazo: 17, obrigatoria: true, ativa: true, regimes: ["Simples Nacional"], detalhe: "Aplique alíquota efetiva por anexo e confira a repartição dos tributos.", destino: "/fiscal/apuracoes/simples-nacional" },
  { id: "SN-007", titulo: "Apurar ICMS-ST, DIFAL e antecipação fora do DAS", fase: "apuracao", periodicidade: "Mensal", responsavel: "Fiscal", diaPrazo: 17, obrigatoria: false, ativa: true, regimes: ["Simples Nacional"], detalhe: "Substituição tributária, DIFAL de compras interestaduais e antecipação são recolhidos em guia própria.", destino: "/financeiro/tributacao/difal" },
  { id: "SN-008", titulo: "Transmitir a declaração PGDAS-D da competência", fase: "apuracao", periodicidade: "Mensal", responsavel: "Fiscal", diaPrazo: 20, obrigatoria: true, ativa: true, regimes: ["Simples Nacional"], detalhe: "Transmissão até o dia 20 do mês seguinte, mesmo sem movimento.", destino: "/fiscal/obrigacoes/agenda" },
  { id: "SN-009", titulo: "Emitir e conferir a guia do DAS", fase: "apuracao", periodicidade: "Mensal", responsavel: "Fiscal", diaPrazo: 20, obrigatoria: true, ativa: true, regimes: ["Simples Nacional"], detalhe: "Confira valor, competência e código de barras antes do pagamento.", destino: "/fiscal/guias/darf" },
  { id: "SN-010", titulo: "Monitorar excesso de receita e desenquadramento", fase: "encerramento", periodicidade: "Mensal", responsavel: "Controladoria", diaPrazo: 22, obrigatoria: false, ativa: true, regimes: ["Simples Nacional"], detalhe: "Acompanhe o limite anual de R$ 4,8 milhões e o excesso de 20% que antecipa o desenquadramento.", destino: "/financeiro/tributacao/dashboard-executivo" },
  { id: "SN-011", titulo: "Entregar a DEFIS do exercício anterior", fase: "encerramento", periodicidade: "Anual", responsavel: "Fiscal", diaPrazo: 31, obrigatoria: false, ativa: true, regimes: ["Simples Nacional"], detalhe: "Declaração de Informações Socioeconômicas e Fiscais — entrega até 31 de março.", destino: "/financeiro/tributacao/defis" },

  // ---- MEI / SIMEI ----
  { id: "MEI-001", titulo: "Conferir enquadramento no SIMEI e ocupações permitidas", fase: "cadastros", periodicidade: "Mensal", responsavel: "Contabilidade interna", diaPrazo: 3, obrigatoria: true, ativa: true, regimes: ["MEI"], detalhe: "Valide o CCMEI, as ocupações permitidas e a existência de uma única empresa por titular.", destino: "/preparativos/cadastros/empresas" },
  { id: "MEI-002", titulo: "Registrar o relatório mensal de receitas brutas", fase: "escrituracao", periodicidade: "Mensal", responsavel: "Contabilidade interna", diaPrazo: 10, obrigatoria: true, ativa: true, regimes: ["MEI"], detalhe: "Relatório obrigatório até o dia 20 do mês seguinte, com receitas com e sem nota fiscal.", destino: "/financeiro/movimentos/faturamento" },
  { id: "MEI-003", titulo: "Separar receitas de comércio, indústria e serviços", fase: "escrituracao", periodicidade: "Mensal", responsavel: "Contabilidade interna", diaPrazo: 10, obrigatoria: true, ativa: true, regimes: ["MEI"], detalhe: "A separação define a composição do DAS-SIMEI (ICMS e/ou ISS).", destino: "/financeiro/movimentos/servicos" },
  { id: "MEI-004", titulo: "Arquivar notas fiscais emitidas e de compras", fase: "escrituracao", periodicidade: "Mensal", responsavel: "Contabilidade interna", diaPrazo: 12, obrigatoria: false, ativa: true, regimes: ["MEI"], detalhe: "Guarde as notas de entrada e as notas emitidas para PJ como comprovação da receita.", destino: "/fiscal/documentos/entradas" },
  { id: "MEI-005", titulo: "Gerar o DAS-SIMEI de valor fixo", fase: "apuracao", periodicidade: "Mensal", responsavel: "Contabilidade interna", diaPrazo: 18, obrigatoria: true, ativa: true, regimes: ["MEI"], detalhe: "Valor fixo mensal: INSS sobre o salário mínimo mais ICMS e/ou ISS conforme a atividade.", destino: "/financeiro/tabelas/simei" },
  { id: "MEI-006", titulo: "Confirmar o pagamento do DAS até o dia 20", fase: "apuracao", periodicidade: "Mensal", responsavel: "Tesouraria", diaPrazo: 20, obrigatoria: true, ativa: true, regimes: ["MEI"], detalhe: "Atraso gera multa e juros e afeta a contagem da carência do INSS.", destino: "/fiscal/guias/calendario" },
  { id: "MEI-007", titulo: "Acompanhar o limite anual de receita do MEI", fase: "encerramento", periodicidade: "Mensal", responsavel: "Controladoria", diaPrazo: 22, obrigatoria: true, ativa: true, regimes: ["MEI"], detalhe: "Limite anual de R$ 81 mil (proporcional no ano de abertura); excesso acima de 20% desenquadra retroativamente.", destino: "/financeiro/tabelas/simei" },
  { id: "MEI-008", titulo: "Entregar a DASN-SIMEI do ano anterior", fase: "encerramento", periodicidade: "Anual", responsavel: "Contabilidade interna", diaPrazo: 31, obrigatoria: false, ativa: true, regimes: ["MEI"], detalhe: "Declaração anual simplificada, entregue até 31 de maio, com a receita bruta total do ano.", destino: "/fiscal/obrigacoes/agenda" },
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
    const stored = JSON.parse(raw) as TarefaModelo[];
    // Modelos novos do sistema (ex.: tarefas por regime) entram sem apagar
    // as personalizações já feitas pelo usuário.
    const faltantes = SEED_MODELOS.filter((s) => !stored.some((m) => m.id === s.id));
    if (faltantes.length) {
      const merged = [...stored, ...faltantes];
      localStorage.setItem(KEY_MODELOS, JSON.stringify(merged));
      return merged;
    }
    return stored;
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
  /** Tarefas ativas da fase já filtradas pelo regime da empresa. */
  tarefas: TarefaModelo[];
};

export function resumoFases(
  modelos: TarefaModelo[],
  execucoes: TarefaExec[],
  empresaId: string | null,
  competencia: string,
  regime: RegimeTributario | null = null,
): FaseResumo[] {
  return FASES.map((f) => {
    const list = modelos.filter((m) => m.ativa && m.fase === f.slug && aplicaAoRegime(m, regime));
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
      tarefas: list,
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
