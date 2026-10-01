// ============================================================================
// Administrativo › Contratos e documentos
// ----------------------------------------------------------------------------
// Motor de gestão contratual, cofre de documentos, certificados digitais e
// agenda administrativa. Inspirado em Domínio, Alterdata, Questor, SCI e TOTVS.
//
// Regras implementadas:
//  R1  Situação do contrato é derivada da vigência: Rascunho, Vigente,
//      A vencer (<= 90 dias), Vencido e Encerrado (rescisão registrada).
//  R2  Renovação automática exige aviso prévio; se o prazo de aviso já passou,
//      o contrato é sinalizado como renovado tacitamente.
//  R3  Reajuste ocorre a cada 12 meses do início da vigência, pelo índice
//      pactuado (IPCA, IGP-M, INPC ou fixo). O sistema projeta o próximo
//      reajuste e o valor futuro.
//  R4  Valor global remanescente = valor mensal × meses restantes de vigência.
//  R5  Aditivos alteram valor e/ou vigência e ficam registrados em histórico
//      auditável (data, tipo, autor e justificativa).
//  R6  Documento com validade vencida não é aceito como comprovação válida.
//  R7  Checklist mensal obrigatório por competência: enquanto houver documento
//      obrigatório ausente ou vencido, a competência fica "não conforme".
//  R8  Certificado digital gera alertas em D-60, D-30 e D-7 da validade.
//  R9  A agenda consolida automaticamente vencimentos de contratos, reajustes,
//      validades de certificados e pendências de documentos, além dos
//      compromissos manuais.
//  R10 Nada é excluído em silêncio: exclusões e baixas passam por confirmação
//      e disparam evento de atualização para todas as telas abertas.
// ============================================================================

import { getStorageSuffix } from "./praticaStore";

export const CONTRATOS_EVENT = "usecontabil:contratos-changed";

const KEY_CONTRATOS = "usecontabil.adm.contratos.v1";
const KEY_DOCUMENTOS = "usecontabil.adm.documentos.v1";
const KEY_CERTIFICADOS = "usecontabil.adm.certificados.v1";
const KEY_AGENDA = "usecontabil.adm.agenda.v1";

/* ================================ utils ================================== */

export const brl = (v: number) =>
  "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const dataBR = (iso: string) => {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
};

export const hojeISO = () => new Date().toISOString().slice(0, 10);

export const diffDias = (alvo: string, base = hojeISO()) =>
  Math.round((new Date(alvo + "T00:00:00").getTime() - new Date(base + "T00:00:00").getTime()) / 86400000);

export const addMeses = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00");
  const dia = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  d.setDate(Math.min(dia, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return d.toISOString().slice(0, 10);
};

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
/** Chave no modo atual: o modo prática grava as mesmas coleções com o sufixo `.pratica`. */
const chaveDe = (base: string) => base + getStorageSuffix();
const round = (v: number) => Math.round(v * 100) / 100;

function ler<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(chaveDe(key));
    if (!raw) {
      window.localStorage.setItem(chaveDe(key), JSON.stringify(fallback));
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
  window.localStorage.setItem(chaveDe(key), JSON.stringify(dados));
  window.dispatchEvent(new CustomEvent(CONTRATOS_EVENT));
}

/* ================================ tipos ================================== */

export type IndiceReajuste = "IPCA" | "IGP-M" | "INPC" | "Sem reajuste";
export type CategoriaContrato =
  | "Prestação de serviços"
  | "Fornecimento"
  | "Locação"
  | "Manutenção"
  | "Software / SaaS"
  | "Seguro"
  | "Trabalhista / PJ";

export type Aditivo = {
  id: string;
  data: string;
  tipo: "Valor" | "Prazo" | "Escopo" | "Rescisão";
  descricao: string;
  valorAnterior?: number;
  valorNovo?: number;
  fimAnterior?: string;
  fimNovo?: string;
  autor: string;
};

export type Contrato = {
  id: string;
  empresaId?: string;
  numero: string;
  contraparte: string;
  documento: string;
  categoria: CategoriaContrato;
  natureza: "Despesa" | "Receita";
  inicio: string;
  fim: string;
  valorMensal: number;
  indice: IndiceReajuste;
  diaVencimento: number;
  avisoPrevioDias: number;
  renovacaoAutomatica: boolean;
  responsavel: string;
  centroCusto: string;
  observacoes?: string;
  rescindidoEm?: string;
  aditivos: Aditivo[];
  criadoEm: string;
};

export type SituacaoContrato = "Vigente" | "A vencer" | "Vencido" | "Encerrado" | "Futuro";

export type ContratoCalculado = Contrato & {
  situacao: SituacaoContrato;
  diasParaFim: number;
  mesesRestantes: number;
  valorGlobalRestante: number;
  valorGlobalTotal: number;
  proximoReajuste: string | null;
  diasParaReajuste: number | null;
  valorReajustado: number;
  prazoAvisoEm: string | null;
  avisoVencido: boolean;
  alertas: string[];
};

export type Documento = {
  id: string;
  empresaId?: string;
  nome: string;
  tipo: string;
  competencia: string; // MM/AAAA ou "—"
  emissao: string;
  validade?: string;
  responsavel: string;
  contratoId?: string;
  tamanhoKb: number;
  tags: string[];
  criadoEm: string;
  /** nome do arquivo anexado (upload local, apenas metadados). */
  arquivoNome?: string;
  arquivoTipo?: string;
};

export type Certificado = {
  id: string;
  empresaId?: string;
  tipo: "e-CNPJ A1" | "e-CNPJ A3" | "e-CPF A1" | "e-CPF A3" | "Certificado NFS-e" | "Procuração e-CAC" | "Procuração estadual";
  titular: string;
  documento: string;
  emissao: string;
  validade: string;
  responsavel: string;
  senhaCofre: boolean;
  observacoes?: string;
};

export type EventoAgenda = {
  id: string;
  data: string;
  titulo: string;
  origem: "Contrato" | "Reajuste" | "Certificado" | "Documento" | "Manual";
  responsavel: string;
  detalhe?: string;
  concluido?: boolean;
  refId?: string;
};

/* ============================ índices de reajuste ======================== */

export const INDICES: Record<IndiceReajuste, number> = {
  IPCA: 4.24,
  "IGP-M": 3.61,
  INPC: 3.98,
  "Sem reajuste": 0,
};

export const CATEGORIAS: CategoriaContrato[] = [
  "Prestação de serviços", "Fornecimento", "Locação", "Manutenção",
  "Software / SaaS", "Seguro", "Trabalhista / PJ",
];

export const TIPOS_DOCUMENTO = [
  "Societário", "Contábil", "Fiscal", "Bancário", "Contratual",
  "Jurídico", "Licença / Alvará", "Seguro", "Outros",
];

/** Documentos exigidos em toda competência mensal (R7). */
export const CHECKLIST_MENSAL: { tipo: string; nome: string; ajuda: string }[] = [
  { tipo: "Bancário", nome: "Extrato bancário", ajuda: "Extrato de todas as contas correntes do mês, base da conciliação." },
  { tipo: "Contábil", nome: "Balancete", ajuda: "Balancete de verificação encerrado da competência." },
  { tipo: "Fiscal", nome: "Relatório de apuração", ajuda: "Resumo dos tributos apurados e guias emitidas no mês." },
  { tipo: "Contratual", nome: "Notas de serviços contratados", ajuda: "NFS-e recebidas dos contratos vigentes no mês." },
];

/* ============================== seeds ==================================== */

const SEED_CONTRATOS: Contrato[] = [
  {
    id: "ct-001", numero: "CT-2024-011", contraparte: "Distribuidora Norte Ltda.",
    documento: "12.345.678/0001-90", categoria: "Fornecimento", natureza: "Despesa",
    inicio: "2024-02-01", fim: "2027-01-31", valorMensal: 18400, indice: "IPCA",
    diaVencimento: 10, avisoPrevioDias: 60, renovacaoAutomatica: true,
    responsavel: "Suprimentos", centroCusto: "CC-101 · Operações",
    observacoes: "Fornecimento contínuo de insumos com reajuste anual por IPCA.",
    aditivos: [], criadoEm: "2024-01-20",
  },
  {
    id: "ct-002", numero: "CT-2025-004", contraparte: "TechCore Sistemas ME",
    documento: "21.876.543/0001-11", categoria: "Software / SaaS", natureza: "Despesa",
    inicio: "2025-05-15", fim: "2027-05-14", valorMensal: 6200, indice: "IGP-M",
    diaVencimento: 5, avisoPrevioDias: 30, renovacaoAutomatica: true,
    responsavel: "TI", centroCusto: "CC-301 · Tecnologia",
    observacoes: "Licenças do ERP e suporte técnico.",
    aditivos: [], criadoEm: "2025-05-02",
  },
  {
    id: "ct-003", numero: "CT-2026-002", contraparte: "Transportes Litoral Ltda.",
    documento: "33.221.114/0001-05", categoria: "Prestação de serviços", natureza: "Despesa",
    inicio: "2026-03-01", fim: "2026-09-30", valorMensal: 9800, indice: "INPC",
    diaVencimento: 15, avisoPrevioDias: 30, renovacaoAutomatica: false,
    responsavel: "Logística", centroCusto: "CC-205 · Distribuição",
    observacoes: "Frete dedicado para a rota Sul.",
    aditivos: [], criadoEm: "2026-02-18",
  },
  {
    id: "ct-004", numero: "CT-2023-007", contraparte: "Imobiliária Praça Central",
    documento: "44.556.677/0001-22", categoria: "Locação", natureza: "Despesa",
    inicio: "2023-09-01", fim: "2028-08-31", valorMensal: 24500, indice: "IGP-M",
    diaVencimento: 5, avisoPrevioDias: 90, renovacaoAutomatica: false,
    responsavel: "Administrativo", centroCusto: "CC-001 · Sede",
    observacoes: "Locação do galpão administrativo e depósito.",
    aditivos: [], criadoEm: "2023-08-10",
  },
  {
    id: "ct-005", numero: "CT-2026-008", contraparte: "Comércio Andes Eireli",
    documento: "55.667.788/0001-33", categoria: "Prestação de serviços", natureza: "Receita",
    inicio: "2026-01-01", fim: "2026-08-31", valorMensal: 32000, indice: "IPCA",
    diaVencimento: 20, avisoPrevioDias: 60, renovacaoAutomatica: true,
    responsavel: "Comercial", centroCusto: "CC-401 · Receita recorrente",
    observacoes: "Contrato de prestação recorrente com faturamento mensal.",
    aditivos: [], criadoEm: "2025-12-12",
  },
];

const SEED_DOCUMENTOS: Documento[] = [
  { id: "doc-1", nome: "Extrato bancário 07/2026", tipo: "Bancário", competencia: "07/2026", emissao: "2026-07-31", responsavel: "Financeiro", tamanhoKb: 420, tags: ["conciliação"], criadoEm: "2026-08-01" },
  { id: "doc-2", nome: "Contrato social consolidado", tipo: "Societário", competencia: "—", emissao: "2024-04-18", responsavel: "Jurídico", tamanhoKb: 1840, tags: ["registro"], criadoEm: "2024-04-20" },
  { id: "doc-3", nome: "Balancete 06/2026", tipo: "Contábil", competencia: "06/2026", emissao: "2026-07-08", responsavel: "Contabilidade", tamanhoKb: 260, tags: ["fechamento"], criadoEm: "2026-07-08" },
  { id: "doc-4", nome: "Alvará de funcionamento", tipo: "Licença / Alvará", competencia: "—", emissao: "2025-09-10", validade: "2026-09-10", responsavel: "Administrativo", tamanhoKb: 310, tags: ["prefeitura"], criadoEm: "2025-09-11" },
  { id: "doc-5", nome: "Apólice de seguro patrimonial", tipo: "Seguro", competencia: "—", emissao: "2025-08-05", validade: "2026-08-05", responsavel: "Administrativo", tamanhoKb: 980, tags: ["renovação"], criadoEm: "2025-08-06" },
  { id: "doc-6", nome: "Relatório de apuração 07/2026", tipo: "Fiscal", competencia: "07/2026", emissao: "2026-08-05", responsavel: "Fiscal", tamanhoKb: 190, tags: ["apuração"], criadoEm: "2026-08-05" },
  { id: "doc-7", nome: "Contrato CT-2024-011 assinado", tipo: "Contratual", competencia: "—", emissao: "2024-02-01", responsavel: "Suprimentos", contratoId: "ct-001", tamanhoKb: 2200, tags: ["assinado"], criadoEm: "2024-02-02" },
];

const SEED_CERTIFICADOS: Certificado[] = [
  { id: "cert-1", tipo: "e-CNPJ A1", titular: "Matriz", documento: "12.345.678/0001-90", emissao: "2026-02-02", validade: "2027-02-02", responsavel: "Contabilidade", senhaCofre: true },
  { id: "cert-2", tipo: "Procuração e-CAC", titular: "Contabilidade interna", documento: "12.345.678/0001-90", emissao: "2026-01-10", validade: "2028-01-10", responsavel: "Contabilidade", senhaCofre: false, observacoes: "Procuração eletrônica com poderes fiscais." },
  { id: "cert-3", tipo: "Certificado NFS-e", titular: "Filial RS", documento: "12.345.678/0002-70", emissao: "2025-08-20", validade: "2026-08-20", responsavel: "TI", senhaCofre: true },
  { id: "cert-4", tipo: "e-CPF A3", titular: "Sócio administrador", documento: "123.456.789-00", emissao: "2024-11-04", validade: "2027-11-04", responsavel: "Jurídico", senhaCofre: false },
];

const SEED_AGENDA: EventoAgenda[] = [
  { id: "ag-1", data: "2026-08-12", titulo: "Reunião de fechamento mensal", origem: "Manual", responsavel: "Controladoria", detalhe: "Revisão de resultado e pendências da competência." },
  { id: "ag-2", data: "2026-08-25", titulo: "Assembleia de sócios", origem: "Manual", responsavel: "Jurídico", detalhe: "Aprovação da distribuição de lucros." },
];

/* ============================== contratos ================================ */

export const listarContratos = () => ler<Contrato>(KEY_CONTRATOS, SEED_CONTRATOS);

export function calcularContrato(c: Contrato, base = hojeISO()): ContratoCalculado {
  const diasParaFim = diffDias(c.fim, base);
  const alertas: string[] = [];

  let situacao: SituacaoContrato;
  if (c.rescindidoEm) situacao = "Encerrado";
  else if (diffDias(c.inicio, base) > 0) situacao = "Futuro";
  else if (diasParaFim < 0) situacao = "Vencido";
  else if (diasParaFim <= 90) situacao = "A vencer";
  else situacao = "Vigente";

  // R3 — próximo aniversário anual da vigência.
  let proximoReajuste: string | null = null;
  if (c.indice !== "Sem reajuste" && situacao !== "Encerrado") {
    for (let ano = 1; ano <= 12; ano++) {
      const alvo = addMeses(c.inicio, ano * 12);
      if (diffDias(alvo, base) >= 0 && diffDias(c.fim, alvo) >= 0) { proximoReajuste = alvo; break; }
    }
  }
  const diasParaReajuste = proximoReajuste ? diffDias(proximoReajuste, base) : null;
  const valorReajustado = round(c.valorMensal * (1 + INDICES[c.indice] / 100));

  // R4 — valor global.
  const mesesRestantes = Math.max(0, Math.ceil(diasParaFim / 30));
  const mesesTotais = Math.max(1, Math.round(diffDias(c.fim, c.inicio) / 30));
  const valorGlobalRestante = round(c.valorMensal * mesesRestantes);
  const valorGlobalTotal = round(c.valorMensal * mesesTotais);

  // R2 — aviso prévio.
  const prazoAvisoEm = c.avisoPrevioDias > 0 ? addMeses(c.fim, 0) : null;
  const diasAviso = diasParaFim - c.avisoPrevioDias;
  const avisoVencido = situacao !== "Encerrado" && diasParaFim >= 0 && diasAviso <= 0;

  if (situacao === "Vencido") alertas.push("Vigência expirada sem aditivo ou renovação formal.");
  if (situacao === "A vencer") alertas.push(`Vence em ${diasParaFim} dia(s) — avalie renovação ou nova cotação.`);
  if (avisoVencido && c.renovacaoAutomatica) alertas.push("Prazo de aviso prévio esgotado: renovação tácita em curso.");
  if (avisoVencido && !c.renovacaoAutomatica) alertas.push("Prazo de aviso prévio esgotado sem renovação automática.");
  if (diasParaReajuste !== null && diasParaReajuste <= 60) {
    alertas.push(`Reajuste por ${c.indice} previsto em ${dataBR(proximoReajuste!)} (${brl(valorReajustado)}).`);
  }

  return {
    ...c, situacao, diasParaFim, mesesRestantes, valorGlobalRestante, valorGlobalTotal,
    proximoReajuste, diasParaReajuste, valorReajustado,
    prazoAvisoEm: prazoAvisoEm ? addMeses(c.fim, 0) : null, avisoVencido, alertas,
  };
}

export const contratosCalculados = (empresaId?: string) =>
  listarContratos()
    .filter((c) => !empresaId || !c.empresaId || c.empresaId === empresaId)
    .map((c) => calcularContrato(c))
    .sort((a, b) => a.fim.localeCompare(b.fim));

export function salvarContrato(dados: Partial<Contrato> & { numero: string; contraparte: string }) {
  if (!dados.numero.trim()) throw new Error("Informe o número do contrato.");
  if (!dados.contraparte.trim()) throw new Error("Informe a contraparte.");
  if (!dados.inicio || !dados.fim) throw new Error("Informe o início e o fim da vigência.");
  if (diffDias(dados.fim, dados.inicio) <= 0) throw new Error("A vigência final deve ser posterior ao início.");
  if (!dados.valorMensal || dados.valorMensal <= 0) throw new Error("Informe um valor mensal maior que zero.");

  const lista = listarContratos();
  const existente = dados.id ? lista.find((c) => c.id === dados.id) : undefined;
  if (!existente && lista.some((c) => c.numero.toLowerCase() === dados.numero.toLowerCase())) {
    throw new Error("Já existe um contrato com este número.");
  }

  const registro: Contrato = {
    id: existente?.id || uid("ct"),
    empresaId: dados.empresaId ?? existente?.empresaId,
    numero: dados.numero.trim(),
    contraparte: dados.contraparte.trim(),
    documento: dados.documento || existente?.documento || "",
    categoria: (dados.categoria || existente?.categoria || "Prestação de serviços") as CategoriaContrato,
    natureza: dados.natureza || existente?.natureza || "Despesa",
    inicio: dados.inicio!, fim: dados.fim!,
    valorMensal: round(dados.valorMensal!),
    indice: (dados.indice || existente?.indice || "IPCA") as IndiceReajuste,
    diaVencimento: dados.diaVencimento ?? existente?.diaVencimento ?? 10,
    avisoPrevioDias: dados.avisoPrevioDias ?? existente?.avisoPrevioDias ?? 30,
    renovacaoAutomatica: dados.renovacaoAutomatica ?? existente?.renovacaoAutomatica ?? false,
    responsavel: dados.responsavel || existente?.responsavel || "Administrativo",
    centroCusto: dados.centroCusto || existente?.centroCusto || "",
    observacoes: dados.observacoes ?? existente?.observacoes,
    rescindidoEm: existente?.rescindidoEm,
    aditivos: existente?.aditivos || [],
    criadoEm: existente?.criadoEm || hojeISO(),
  };

  gravar(KEY_CONTRATOS, existente ? lista.map((c) => (c.id === registro.id ? registro : c)) : [registro, ...lista]);
  return registro;
}

export function excluirContrato(id: string) {
  gravar(KEY_CONTRATOS, listarContratos().filter((c) => c.id !== id));
}

/** R5 — aditivos de valor, prazo, escopo ou rescisão. */
export function registrarAditivo(
  contratoId: string,
  dados: { tipo: Aditivo["tipo"]; descricao: string; valorNovo?: number; fimNovo?: string; data?: string; autor?: string },
) {
  const lista = listarContratos();
  const c = lista.find((x) => x.id === contratoId);
  if (!c) throw new Error("Contrato não encontrado.");
  if (!dados.descricao.trim()) throw new Error("Descreva a justificativa do aditivo.");
  if (dados.tipo === "Valor" && (!dados.valorNovo || dados.valorNovo <= 0)) throw new Error("Informe o novo valor mensal.");
  if (dados.tipo === "Prazo" && !dados.fimNovo) throw new Error("Informe a nova data final de vigência.");
  if (dados.tipo === "Prazo" && dados.fimNovo && diffDias(dados.fimNovo, c.fim) <= 0) {
    throw new Error("A nova vigência deve ser posterior à vigência atual.");
  }

  const aditivo: Aditivo = {
    id: uid("ad"), data: dados.data || hojeISO(), tipo: dados.tipo,
    descricao: dados.descricao.trim(), autor: dados.autor || "Administrativo",
    valorAnterior: dados.tipo === "Valor" ? c.valorMensal : undefined,
    valorNovo: dados.tipo === "Valor" ? round(dados.valorNovo!) : undefined,
    fimAnterior: dados.tipo === "Prazo" ? c.fim : undefined,
    fimNovo: dados.tipo === "Prazo" ? dados.fimNovo : undefined,
  };

  const atualizado: Contrato = {
    ...c,
    valorMensal: aditivo.valorNovo ?? c.valorMensal,
    fim: aditivo.fimNovo ?? c.fim,
    rescindidoEm: dados.tipo === "Rescisão" ? (dados.data || hojeISO()) : c.rescindidoEm,
    aditivos: [aditivo, ...c.aditivos],
  };
  gravar(KEY_CONTRATOS, lista.map((x) => (x.id === contratoId ? atualizado : x)));
  return atualizado;
}

/** Aplica o reajuste projetado como aditivo de valor. */
export function aplicarReajuste(contratoId: string) {
  const c = listarContratos().find((x) => x.id === contratoId);
  if (!c) throw new Error("Contrato não encontrado.");
  if (c.indice === "Sem reajuste") throw new Error("Contrato sem índice de reajuste pactuado.");
  const calc = calcularContrato(c);
  return registrarAditivo(contratoId, {
    tipo: "Valor",
    descricao: `Reajuste anual por ${c.indice} (${INDICES[c.indice].toFixed(2)}%).`,
    valorNovo: calc.valorReajustado,
  });
}

/** Renovação prorroga a vigência em N meses via aditivo de prazo. */
export function renovarContrato(contratoId: string, meses: number) {
  const c = listarContratos().find((x) => x.id === contratoId);
  if (!c) throw new Error("Contrato não encontrado.");
  return registrarAditivo(contratoId, {
    tipo: "Prazo",
    descricao: `Renovação de vigência por ${meses} meses.`,
    fimNovo: addMeses(c.fim, meses),
  });
}

export function resumoContratos(empresaId?: string) {
  const lista = contratosCalculados(empresaId);
  const ativos = lista.filter((c) => c.situacao === "Vigente" || c.situacao === "A vencer");
  const despesaMensal = ativos.filter((c) => c.natureza === "Despesa").reduce((a, c) => a + c.valorMensal, 0);
  const receitaMensal = ativos.filter((c) => c.natureza === "Receita").reduce((a, c) => a + c.valorMensal, 0);
  return {
    total: lista.length,
    ativos: ativos.length,
    aVencer: lista.filter((c) => c.situacao === "A vencer").length,
    vencidos: lista.filter((c) => c.situacao === "Vencido").length,
    despesaMensal: round(despesaMensal),
    receitaMensal: round(receitaMensal),
    liquidoMensal: round(receitaMensal - despesaMensal),
    globalRestante: round(ativos.reduce((a, c) => a + c.valorGlobalRestante, 0)),
    reajustes90: lista.filter((c) => c.diasParaReajuste !== null && c.diasParaReajuste <= 90).length,
  };
}

export function contratosPorCategoria(empresaId?: string) {
  const mapa = new Map<string, number>();
  contratosCalculados(empresaId)
    .filter((c) => c.situacao === "Vigente" || c.situacao === "A vencer")
    .forEach((c) => mapa.set(c.categoria, (mapa.get(c.categoria) || 0) + c.valorMensal));
  return [...mapa.entries()]
    .map(([categoria, valor]) => ({ categoria, valor: round(valor) }))
    .sort((a, b) => b.valor - a.valor);
}

/** Compromisso financeiro dos próximos N meses (contratos vigentes). */
export function projecaoContratual(empresaId?: string, meses = 12) {
  const lista = contratosCalculados(empresaId).filter((c) => c.situacao !== "Encerrado");
  const base = hojeISO();
  return Array.from({ length: meses }, (_, i) => {
    const ref = addMeses(base, i);
    const rotulo = `${ref.slice(5, 7)}/${ref.slice(2, 4)}`;
    let despesa = 0, receita = 0;
    lista.forEach((c) => {
      if (diffDias(ref, c.inicio) < 0 || diffDias(c.fim, ref) < 0) return;
      const valor = c.proximoReajuste && diffDias(ref, c.proximoReajuste) >= 0 ? c.valorReajustado : c.valorMensal;
      if (c.natureza === "Despesa") despesa += valor; else receita += valor;
    });
    return { rotulo, despesa: round(despesa), receita: round(receita), liquido: round(receita - despesa) };
  });
}

/* ============================== documentos =============================== */

export const listarDocumentos = () => ler<Documento>(KEY_DOCUMENTOS, SEED_DOCUMENTOS);

export type DocumentoCalculado = Documento & {
  situacao: "Válido" | "A vencer" | "Vencido" | "Sem validade";
  diasParaVencer: number | null;
};

export function documentosCalculados(empresaId?: string): DocumentoCalculado[] {
  return listarDocumentos()
    .filter((d) => !empresaId || !d.empresaId || d.empresaId === empresaId)
    .map((d) => {
      if (!d.validade) return { ...d, situacao: "Sem validade" as const, diasParaVencer: null };
      const dias = diffDias(d.validade);
      return {
        ...d,
        situacao: dias < 0 ? ("Vencido" as const) : dias <= 60 ? ("A vencer" as const) : ("Válido" as const),
        diasParaVencer: dias,
      };
    })
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

export function salvarDocumento(dados: Partial<Documento> & { nome: string }) {
  if (!dados.nome.trim()) throw new Error("Informe o nome do documento.");
  if (!dados.tipo) throw new Error("Selecione o tipo do documento.");
  if (dados.validade && dados.emissao && diffDias(dados.validade, dados.emissao) <= 0) {
    throw new Error("A validade deve ser posterior à emissão.");
  }
  const lista = listarDocumentos();
  const existente = dados.id ? lista.find((d) => d.id === dados.id) : undefined;
  const registro: Documento = {
    id: existente?.id || uid("doc"),
    empresaId: dados.empresaId ?? existente?.empresaId,
    nome: dados.nome.trim(),
    tipo: dados.tipo!,
    competencia: dados.competencia?.trim() || "—",
    emissao: dados.emissao || hojeISO(),
    validade: dados.validade || undefined,
    responsavel: dados.responsavel || "Administrativo",
    contratoId: dados.contratoId || undefined,
    tamanhoKb: dados.tamanhoKb ?? existente?.tamanhoKb ?? 240,
    tags: dados.tags || existente?.tags || [],
    criadoEm: existente?.criadoEm || hojeISO(),
    arquivoNome: dados.arquivoNome ?? existente?.arquivoNome,
    arquivoTipo: dados.arquivoTipo ?? existente?.arquivoTipo,
  };
  gravar(KEY_DOCUMENTOS, existente ? lista.map((d) => (d.id === registro.id ? registro : d)) : [registro, ...lista]);
  return registro;
}

export function excluirDocumento(id: string) {
  gravar(KEY_DOCUMENTOS, listarDocumentos().filter((d) => d.id !== id));
}

/** R7 — conformidade do checklist mensal por competência. */
export function conformidadeCompetencia(competencia: string, empresaId?: string) {
  const docs = documentosCalculados(empresaId);
  const itens = CHECKLIST_MENSAL.map((item) => {
    const encontrado = docs.find(
      (d) => d.competencia === competencia && d.tipo === item.tipo && d.situacao !== "Vencido",
    );
    return { ...item, ok: Boolean(encontrado), documento: encontrado?.nome };
  });
  const ok = itens.filter((i) => i.ok).length;
  return { itens, ok, total: itens.length, percentual: Math.round((ok / itens.length) * 100) };
}

export function documentosPorTipo(empresaId?: string) {
  const mapa = new Map<string, number>();
  documentosCalculados(empresaId).forEach((d) => mapa.set(d.tipo, (mapa.get(d.tipo) || 0) + 1));
  return [...mapa.entries()].map(([tipo, qtd]) => ({ tipo, qtd })).sort((a, b) => b.qtd - a.qtd);
}

/* ============================= certificados ============================== */

export const listarCertificados = () => ler<Certificado>(KEY_CERTIFICADOS, SEED_CERTIFICADOS);

export type CertificadoCalculado = Certificado & {
  diasParaVencer: number;
  situacao: "Válido" | "Atenção" | "Crítico" | "Vencido";
  alerta: string | null;
};

/** R8 — alertas em D-60, D-30 e D-7. */
export function certificadosCalculados(empresaId?: string): CertificadoCalculado[] {
  return listarCertificados()
    .filter((c) => !empresaId || !c.empresaId || c.empresaId === empresaId)
    .map((c) => {
      const dias = diffDias(c.validade);
      const situacao = dias < 0 ? "Vencido" : dias <= 7 ? "Crítico" : dias <= 30 ? "Atenção" : dias <= 60 ? "Atenção" : "Válido";
      const alerta =
        dias < 0 ? "Vencido — a emissão de documentos eletrônicos pode falhar."
          : dias <= 7 ? "Vence em menos de 7 dias. Renove imediatamente."
            : dias <= 30 ? "Vence em menos de 30 dias. Agende a renovação."
              : dias <= 60 ? "Vence em menos de 60 dias. Inicie o processo de renovação."
                : null;
      return { ...c, diasParaVencer: dias, situacao: situacao as CertificadoCalculado["situacao"], alerta };
    })
    .sort((a, b) => a.diasParaVencer - b.diasParaVencer);
}

export function salvarCertificado(dados: Partial<Certificado> & { titular: string }) {
  if (!dados.titular.trim()) throw new Error("Informe o titular do certificado.");
  if (!dados.emissao || !dados.validade) throw new Error("Informe a emissão e a validade.");
  if (diffDias(dados.validade, dados.emissao) <= 0) throw new Error("A validade deve ser posterior à emissão.");
  const lista = listarCertificados();
  const existente = dados.id ? lista.find((c) => c.id === dados.id) : undefined;
  const registro: Certificado = {
    id: existente?.id || uid("cert"),
    empresaId: dados.empresaId ?? existente?.empresaId,
    tipo: (dados.tipo || existente?.tipo || "e-CNPJ A1") as Certificado["tipo"],
    titular: dados.titular.trim(),
    documento: dados.documento || existente?.documento || "",
    emissao: dados.emissao!, validade: dados.validade!,
    responsavel: dados.responsavel || "Administrativo",
    senhaCofre: dados.senhaCofre ?? existente?.senhaCofre ?? false,
    observacoes: dados.observacoes ?? existente?.observacoes,
  };
  gravar(KEY_CERTIFICADOS, existente ? lista.map((c) => (c.id === registro.id ? registro : c)) : [registro, ...lista]);
  return registro;
}

export function excluirCertificado(id: string) {
  gravar(KEY_CERTIFICADOS, listarCertificados().filter((c) => c.id !== id));
}

/** Renova o certificado por N meses a partir de hoje. */
export function renovarCertificado(id: string, meses = 12) {
  const lista = listarCertificados();
  const c = lista.find((x) => x.id === id);
  if (!c) throw new Error("Certificado não encontrado.");
  const atualizado: Certificado = { ...c, emissao: hojeISO(), validade: addMeses(hojeISO(), meses) };
  gravar(KEY_CERTIFICADOS, lista.map((x) => (x.id === id ? atualizado : x)));
  return atualizado;
}

/* ================================ agenda ================================= */

const listarEventosManuais = () => ler<EventoAgenda>(KEY_AGENDA, SEED_AGENDA);

export function salvarEvento(dados: Partial<EventoAgenda> & { titulo: string; data: string }) {
  if (!dados.titulo.trim()) throw new Error("Informe o compromisso.");
  if (!dados.data) throw new Error("Informe a data.");
  const lista = listarEventosManuais();
  const existente = dados.id ? lista.find((e) => e.id === dados.id) : undefined;
  const registro: EventoAgenda = {
    id: existente?.id || uid("ag"),
    data: dados.data, titulo: dados.titulo.trim(), origem: "Manual",
    responsavel: dados.responsavel || "Administrativo",
    detalhe: dados.detalhe, concluido: dados.concluido ?? existente?.concluido ?? false,
  };
  gravar(KEY_AGENDA, existente ? lista.map((e) => (e.id === registro.id ? registro : e)) : [registro, ...lista]);
  return registro;
}

export function excluirEvento(id: string) {
  gravar(KEY_AGENDA, listarEventosManuais().filter((e) => e.id !== id));
}

export function alternarConclusao(id: string) {
  const lista = listarEventosManuais();
  if (lista.some((e) => e.id === id)) {
    gravar(KEY_AGENDA, lista.map((e) => (e.id === id ? { ...e, concluido: !e.concluido } : e)));
    return;
  }
  // eventos derivados: guardamos a conclusão como registro manual espelhado
  const derivado = agendaDerivada().find((e) => e.id === id);
  if (!derivado) return;
  gravar(KEY_AGENDA, [{ ...derivado, concluido: true }, ...lista]);
}

/** R9 — eventos derivados de contratos, reajustes, certificados e documentos. */
export function agendaDerivada(empresaId?: string): EventoAgenda[] {
  const eventos: EventoAgenda[] = [];

  contratosCalculados(empresaId).forEach((c) => {
    if (c.situacao !== "Encerrado") {
      eventos.push({
        id: `ev-ct-${c.id}`, data: c.fim, origem: "Contrato",
        titulo: `Fim de vigência · ${c.numero} — ${c.contraparte}`,
        responsavel: c.responsavel,
        detalhe: c.renovacaoAutomatica
          ? `Renovação automática com aviso prévio de ${c.avisoPrevioDias} dias.`
          : `Sem renovação automática. Aviso prévio de ${c.avisoPrevioDias} dias.`,
        refId: c.id,
      });
    }
    if (c.proximoReajuste) {
      eventos.push({
        id: `ev-rj-${c.id}`, data: c.proximoReajuste, origem: "Reajuste",
        titulo: `Reajuste por ${c.indice} · ${c.numero}`,
        responsavel: c.responsavel,
        detalhe: `${brl(c.valorMensal)} → ${brl(c.valorReajustado)} (${INDICES[c.indice].toFixed(2)}%).`,
        refId: c.id,
      });
    }
  });

  certificadosCalculados(empresaId).forEach((c) => {
    eventos.push({
      id: `ev-cert-${c.id}`, data: c.validade, origem: "Certificado",
      titulo: `Validade do ${c.tipo} · ${c.titular}`,
      responsavel: c.responsavel,
      detalhe: c.alerta || "Certificado dentro do prazo.",
      refId: c.id,
    });
  });

  documentosCalculados(empresaId)
    .filter((d) => d.validade && d.situacao !== "Válido")
    .forEach((d) => {
      eventos.push({
        id: `ev-doc-${d.id}`, data: d.validade!, origem: "Documento",
        titulo: `Renovação de documento · ${d.nome}`,
        responsavel: d.responsavel,
        detalhe: d.situacao === "Vencido" ? "Documento vencido no cofre." : "Documento próximo do vencimento.",
        refId: d.id,
      });
    });

  return eventos;
}

export function agendaConsolidada(empresaId?: string) {
  const manuais = listarEventosManuais();
  const concluidos = new Set(manuais.filter((e) => e.concluido).map((e) => e.id));
  const derivados = agendaDerivada(empresaId).filter((e) => !manuais.some((m) => m.id === e.id));
  return [...manuais, ...derivados]
    .map((e) => ({ ...e, concluido: e.concluido || concluidos.has(e.id) }))
    .sort((a, b) => a.data.localeCompare(b.data));
}
