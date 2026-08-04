// ============================================================================
// Administrativo › Contas e caixa
// ----------------------------------------------------------------------------
// Motor operacional de contas a pagar/receber, tesouraria (caixa e bancos),
// fluxo de caixa projetado e régua de cobrança.
//
// Regras implementadas (inspiradas em Domínio, Alterdata, Questor, TOTVS):
//  R1  Título vencido e não liquidado -> multa de 2% + juros de 1% a.m. pro rata die.
//  R2  Baixa parcial mantém o título em aberto com saldo remanescente.
//  R3  Baixa exige conta de tesouraria; o movimento afeta o saldo da conta.
//  R4  Não se baixa título já liquidado nem com valor maior que o saldo devedor.
//  R5  Aging por faixas: a vencer, 1-15, 16-30, 31-60, 61-90, +90 dias.
//  R6  Régua de cobrança acionada por faixa de atraso (lembrete -> jurídico).
//  R7  Fluxo de caixa projetado = saldo atual + recebíveis - pagáveis por semana.
//  R8  Saldo de caixa negativo projetado gera alerta de necessidade de capital.
//  R9  Toda liquidação é auditável (usuário, data/hora, conta e encargos).
// ============================================================================

import { getStorageSuffix } from "./praticaStore";

export const CONTAS_EVENT = "usecontabil:contas-caixa-changed";
export const KEY_BAIXAS_BASE = "usecontabil.contas.baixas.v1";
export const KEY_BAIXAS = KEY_BAIXAS_BASE + getStorageSuffix();
const KEY_ACOES_BASE = "usecontabil.contas.acoes.v1";
const KEY_MOVS_BASE = "usecontabil.contas.movimentos.v1";

const getAcoesKey = () => KEY_ACOES_BASE + getStorageSuffix();
const getMovsKey = () => KEY_MOVS_BASE + getStorageSuffix();

/* ============================== utils ==================================== */

export const brl = (v: number) =>
  "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const dataBR = (iso: string) => {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
};

export const hojeISO = () => new Date().toISOString().slice(0, 10);

const diffDias = (a: string, b: string) =>
  Math.round((new Date(a + "T00:00:00").getTime() - new Date(b + "T00:00:00").getTime()) / 86400000);

const addDias = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const round = (v: number) => Math.round(v * 100) / 100;

function seed(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const read = <T,>(key: string): T[] => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]") as T[];
  } catch {
    return [];
  }
};
export const write = <T,>(key: string, v: T[]) => {
  localStorage.setItem(key, JSON.stringify(v));
  window.dispatchEvent(new Event(CONTAS_EVENT));
};

/* ============================== tipos ==================================== */

export type TipoTitulo = "pagar" | "receber";

export type Titulo = {
  id: string;
  tipo: TipoTitulo;
  numero: string;
  parcela: string;
  parceiro: string;
  documento: string;
  categoria: string;
  centroCusto: string;
  forma: string;
  emissao: string;
  vencimento: string;
  valor: number;
  origem: string;
};

export type Baixa = {
  id: string;
  tituloId: string;
  data: string;
  valor: number;
  juros: number;
  multa: number;
  desconto: number;
  contaId: string;
  forma: string;
  usuario: string;
  criadoEm: string;
};

export type AcaoCobranca = {
  id: string;
  tituloId: string;
  data: string;
  acao: string;
  observacao: string;
  usuario: string;
};

export type MovimentoCaixa = {
  id: string;
  contaId: string;
  data: string;
  historico: string;
  tipo: "Entrada" | "Saída";
  valor: number;
  origem: string;
};

export type ContaTesouraria = {
  id: string;
  nome: string;
  tipo: "Caixa" | "Conta corrente" | "Aplicação" | "Cartão";
  banco: string;
  agencia: string;
  numero: string;
  saldoInicial: number;
  responsavel: string;
};

export type Situacao = "Em aberto" | "Parcial" | "Liquidado" | "Vencido" | "Vence hoje";

export type TituloCalculado = Titulo & {
  pago: number;
  saldo: number;
  situacao: Situacao;
  diasAtraso: number;
  multa: number;
  juros: number;
  totalDevido: number;
  faixa: string;
  baixas: Baixa[];
};

/* ============================ tesouraria ================================= */

export const CONTAS_TESOURARIA: ContaTesouraria[] = [
  { id: "cx-01", nome: "Caixa matriz", tipo: "Caixa", banco: "—", agencia: "—", numero: "CX-001", saldoInicial: 12_400, responsavel: "Tesouraria" },
  { id: "bb-01", nome: "Banco do Brasil · Movimento", tipo: "Conta corrente", banco: "001", agencia: "1234-5", numero: "98765-4", saldoInicial: 412_880.4, responsavel: "Financeiro" },
  { id: "itau-01", nome: "Itaú · Cobrança", tipo: "Conta corrente", banco: "341", agencia: "0456", numero: "11223-8", saldoInicial: 96_240.1, responsavel: "Financeiro" },
  { id: "sant-01", nome: "Santander · CDB liquidez", tipo: "Aplicação", banco: "033", agencia: "3390", numero: "44120-0", saldoInicial: 280_000, responsavel: "Tesouraria" },
  { id: "card-01", nome: "Cartão corporativo", tipo: "Cartão", banco: "237", agencia: "—", numero: "**** 4417", saldoInicial: -18_320.55, responsavel: "Controladoria" },
];

export const contaPorId = (id: string) => CONTAS_TESOURARIA.find((c) => c.id === id);

/* ============================ geração ==================================== */

const PARCEIROS_PAGAR = [
  "Distribuidora Norte Ltda.", "Energia Sul S.A.", "TechCore Sistemas ME",
  "Transportes Litoral Ltda.", "Aço Prime Indústria", "Prefeitura Municipal",
  "Seguros Vértice S.A.", "Locadora Central Ltda.",
];
const PARCEIROS_RECEBER = [
  "Metalúrgica Andrade S.A.", "Panificadora Real Ltda.", "Comércio Andes Eireli",
  "Rede Atacadista Beta", "Construtora Horizonte", "Farmácias Vida Ltda.",
  "Supermercados Aurora", "Hospital São Lucas",
];
const CATEGORIA_PAGAR = ["Fornecedores", "Utilidades", "Serviços de terceiros", "Impostos e taxas", "Aluguéis", "Frete e logística"];
const CATEGORIA_RECEBER = ["Venda de mercadoria", "Prestação de serviço", "Locação", "Reembolso"];
const CENTROS = ["Administrativo", "Comercial", "Industrial", "Logística"];
const FORMAS = ["Boleto", "PIX", "TED", "Cartão", "Débito automático"];

/**
 * Gera a carteira determinística de títulos da competência.
 * A base é sempre a mesma para o mesmo par (empresa, competência).
 */
export function titulos(tipo: TipoTitulo, empresaId = "geral", competencia = "2026-07"): Titulo[] {
  const rnd = seed(`${tipo}|${empresaId}|${competencia}`);
  const [ano, mes] = competencia.split("-").map(Number);
  const parceiros = tipo === "pagar" ? PARCEIROS_PAGAR : PARCEIROS_RECEBER;
  const categorias = tipo === "pagar" ? CATEGORIA_PAGAR : CATEGORIA_RECEBER;
  const prefixo = tipo === "pagar" ? "AP" : "AR";
  const total = 16 + Math.floor(rnd() * 6);

  return Array.from({ length: total }, (_, i) => {
    const diaVenc = 1 + Math.floor(rnd() * 28);
    const desloc = Math.floor(rnd() * 3) - 1; // vencimentos no mês anterior/atual/seguinte
    const base = new Date(Date.UTC(ano, mes - 1 + desloc, diaVenc));
    const vencimento = base.toISOString().slice(0, 10);
    const emissao = addDias(vencimento, -(15 + Math.floor(rnd() * 30)));
    const valor = round(480 + rnd() * (tipo === "pagar" ? 22_000 : 38_000));
    const parcelas = 1 + Math.floor(rnd() * 3);
    return {
      id: `${prefixo}-${competencia}-${String(i + 1).padStart(3, "0")}`,
      tipo,
      numero: `${prefixo}-${4000 + i * 7 + mes}`,
      parcela: `${1 + Math.floor(rnd() * parcelas)}/${parcelas}`,
      parceiro: parceiros[Math.floor(rnd() * parceiros.length)],
      documento: `${tipo === "pagar" ? "NF" : "NFS"} ${String(10000 + Math.floor(rnd() * 89999))}`,
      categoria: categorias[Math.floor(rnd() * categorias.length)],
      centroCusto: CENTROS[Math.floor(rnd() * CENTROS.length)],
      forma: FORMAS[Math.floor(rnd() * FORMAS.length)],
      emissao,
      vencimento,
      valor,
      origem: "ERP Principal · Sync",
    };
  }).sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

/* ============================ cálculo ==================================== */

/** R1: multa fixa de 2% e juros de 1% a.m. pro rata die sobre o saldo devedor. */
export function encargos(saldo: number, diasAtraso: number) {
  if (diasAtraso <= 0 || saldo <= 0) return { multa: 0, juros: 0 };
  return {
    multa: round(saldo * 0.02),
    juros: round(saldo * (0.01 / 30) * diasAtraso),
  };
}

export function faixaAging(diasAtraso: number) {
  if (diasAtraso <= 0) return "A vencer";
  if (diasAtraso <= 15) return "1 a 15 dias";
  if (diasAtraso <= 30) return "16 a 30 dias";
  if (diasAtraso <= 60) return "31 a 60 dias";
  if (diasAtraso <= 90) return "61 a 90 dias";
  return "Acima de 90 dias";
}

export const FAIXAS = ["A vencer", "1 a 15 dias", "16 a 30 dias", "31 a 60 dias", "61 a 90 dias", "Acima de 90 dias"];

export const baixas = () => read<Baixa>(KEY_BAIXAS);
export const acoes = () => read<AcaoCobranca>(getAcoesKey());
export const movimentosManuais = () => read<MovimentoCaixa>(getMovsKey());

export function calcular(t: Titulo, ref = hojeISO(), todas = baixas()): TituloCalculado {
  const minhas = todas.filter((b) => b.tituloId === t.id);
  const pago = round(minhas.reduce((a, b) => a + b.valor, 0));
  const saldo = round(Math.max(0, t.valor - pago));
  const diasAtraso = saldo > 0 ? Math.max(0, diffDias(ref, t.vencimento)) : 0;
  const { multa, juros } = encargos(saldo, diasAtraso);
  const situacao: Situacao =
    saldo === 0 ? "Liquidado"
      : pago > 0 ? "Parcial"
        : diasAtraso > 0 ? "Vencido"
          : t.vencimento === ref ? "Vence hoje"
            : "Em aberto";
  return {
    ...t, pago, saldo, situacao, diasAtraso, multa, juros,
    totalDevido: round(saldo + multa + juros),
    faixa: faixaAging(diasAtraso),
    baixas: minhas,
  };
}

export function carteira(tipo: TipoTitulo, empresaId?: string, competencia?: string, ref = hojeISO()) {
  const todas = baixas();
  return titulos(tipo, empresaId || "geral", competencia || "2026-07").map((t) => calcular(t, ref, todas));
}

export type ResumoCarteira = {
  total: number;
  aberto: number;
  vencido: number;
  liquidado: number;
  aVencer: number;
  encargos: number;
  qtdVencidos: number;
  qtd: number;
  porFaixa: { faixa: string; valor: number; qtd: number }[];
  porCategoria: { nome: string; valor: number }[];
  porParceiro: { nome: string; valor: number }[];
};

export function resumo(lista: TituloCalculado[]): ResumoCarteira {
  const grupo = (campo: "categoria" | "parceiro") => {
    const m = new Map<string, number>();
    lista.filter((t) => t.saldo > 0).forEach((t) => m.set(t[campo], round((m.get(t[campo]) || 0) + t.saldo)));
    return [...m.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
  };
  return {
    total: round(lista.reduce((a, t) => a + t.valor, 0)),
    aberto: round(lista.reduce((a, t) => a + t.saldo, 0)),
    vencido: round(lista.filter((t) => t.diasAtraso > 0).reduce((a, t) => a + t.saldo, 0)),
    liquidado: round(lista.reduce((a, t) => a + t.pago, 0)),
    aVencer: round(lista.filter((t) => t.saldo > 0 && t.diasAtraso === 0).reduce((a, t) => a + t.saldo, 0)),
    encargos: round(lista.reduce((a, t) => a + t.multa + t.juros, 0)),
    qtdVencidos: lista.filter((t) => t.diasAtraso > 0).length,
    qtd: lista.length,
    porFaixa: FAIXAS.map((faixa) => {
      const itens = lista.filter((t) => t.saldo > 0 && t.faixa === faixa);
      return { faixa, valor: round(itens.reduce((a, t) => a + t.saldo, 0)), qtd: itens.length };
    }),
    porCategoria: grupo("categoria").slice(0, 6),
    porParceiro: grupo("parceiro").slice(0, 6),
  };
}

/* ============================ ações ====================================== */

export type BaixaInput = {
  titulo: TituloCalculado;
  data: string;
  valor: number;
  juros: number;
  multa: number;
  desconto: number;
  contaId: string;
  forma: string;
};

/** R2/R3/R4: valida e registra a liquidação (total ou parcial) do título. */
export function registrarBaixa(input: BaixaInput) {
  const { titulo } = input;
  if (titulo.saldo <= 0) throw new Error("Título já liquidado.");
  if (!input.contaId) throw new Error("Selecione a conta de tesouraria da liquidação.");
  if (input.valor <= 0) throw new Error("Informe um valor de baixa maior que zero.");
  if (input.valor > titulo.saldo + 0.009) throw new Error(`Valor acima do saldo devedor (${brl(titulo.saldo)}).`);
  const nova: Baixa = {
    id: `bx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tituloId: titulo.id,
    data: input.data,
    valor: round(input.valor),
    juros: round(input.juros),
    multa: round(input.multa),
    desconto: round(input.desconto),
    contaId: input.contaId,
    forma: input.forma,
    usuario: "Usuário atual",
    criadoEm: new Date().toISOString(),
  };
  write(KEY_BAIXAS, [...baixas(), nova]);
  return nova;
}

export function estornarBaixa(id: string) {
  write(KEY_BAIXAS, baixas().filter((b) => b.id !== id));
}

export function registrarAcao(a: Omit<AcaoCobranca, "id" | "usuario">) {
  const nova: AcaoCobranca = { ...a, id: `ac-${Date.now()}`, usuario: "Usuário atual" };
  write(getAcoesKey(), [...acoes(), nova]);
  return nova;
}

export function lancarMovimento(m: Omit<MovimentoCaixa, "id" | "origem">) {
  if (m.valor <= 0) throw new Error("Informe um valor maior que zero.");
  if (!m.historico.trim()) throw new Error("Informe o histórico do movimento.");
  const novo: MovimentoCaixa = { ...m, id: `mv-${Date.now()}`, origem: "Lançamento manual" };
  write(getMovsKey(), [...movimentosManuais(), novo]);
  return novo;
}

export function excluirMovimento(id: string) {
  write(getMovsKey(), movimentosManuais().filter((m) => m.id !== id));
}

/* ============================ tesouraria ================================= */

export type SaldoConta = ContaTesouraria & {
  entradas: number;
  saidas: number;
  saldo: number;
  movimentos: MovimentoCaixa[];
};

export function saldos(competencia = "2026-07"): SaldoConta[] {
  const bx = baixas();
  const manuais = movimentosManuais();
  const tits = new Map<string, Titulo>();
  (["pagar", "receber"] as TipoTitulo[]).forEach((tp) =>
    titulos(tp, "geral", competencia).forEach((t) => tits.set(t.id, t)),
  );

  return CONTAS_TESOURARIA.map((c) => {
    const doBaixas: MovimentoCaixa[] = bx
      .filter((b) => b.contaId === c.id)
      .map((b) => {
        const t = tits.get(b.tituloId);
        const entrada = b.tituloId.startsWith("AR");
        return {
          id: b.id,
          contaId: c.id,
          data: b.data,
          historico: `${entrada ? "Recebimento" : "Pagamento"} ${t?.numero || b.tituloId} · ${t?.parceiro || "—"}`,
          tipo: entrada ? "Entrada" : "Saída",
          valor: round(b.valor + b.juros + b.multa - b.desconto),
          origem: "Baixa de título",
        } as MovimentoCaixa;
      });
    const movimentos = [...doBaixas, ...manuais.filter((m) => m.contaId === c.id)]
      .sort((a, b) => b.data.localeCompare(a.data));
    const entradas = round(movimentos.filter((m) => m.tipo === "Entrada").reduce((a, m) => a + m.valor, 0));
    const saidas = round(movimentos.filter((m) => m.tipo === "Saída").reduce((a, m) => a + m.valor, 0));
    return { ...c, entradas, saidas, saldo: round(c.saldoInicial + entradas - saidas), movimentos };
  });
}

/* ============================ fluxo de caixa ============================= */

export type SemanaFluxo = {
  rotulo: string;
  inicio: string;
  fim: string;
  entradas: number;
  saidas: number;
  liquido: number;
  acumulado: number;
};

/** R7/R8: projeção semanal a partir do saldo de tesouraria e dos títulos em aberto. */
export function fluxo(empresaId?: string, competencia = "2026-07", semanas = 8, ref = hojeISO()): SemanaFluxo[] {
  const receber = carteira("receber", empresaId, competencia, ref).filter((t) => t.saldo > 0);
  const pagar = carteira("pagar", empresaId, competencia, ref).filter((t) => t.saldo > 0);
  let acumulado = saldos(competencia).reduce((a, c) => a + c.saldo, 0);
  const base = addDias(ref, -((new Date(ref + "T00:00:00").getDay() + 6) % 7));

  return Array.from({ length: semanas }, (_, i) => {
    const inicio = addDias(base, i * 7);
    const fim = addDias(inicio, 6);
    const dentro = (v: string) => (i === 0 ? v <= fim : v >= inicio && v <= fim);
    const entradas = round(receber.filter((t) => dentro(t.vencimento)).reduce((a, t) => a + t.saldo, 0));
    const saidas = round(pagar.filter((t) => dentro(t.vencimento)).reduce((a, t) => a + t.saldo, 0));
    acumulado = round(acumulado + entradas - saidas);
    return {
      rotulo: `Sem. ${i + 1} · ${dataBR(inicio).slice(0, 5)}`,
      inicio, fim, entradas, saidas,
      liquido: round(entradas - saidas),
      acumulado,
    };
  });
}

/* ============================ cobrança =================================== */

export type Regua = {
  faixa: string;
  acao: string;
  canal: string;
  responsavel: string;
  descricao: string;
};

/** R6: régua padrão de cobrança por faixa de atraso. */
export const REGUA: Regua[] = [
  { faixa: "A vencer", acao: "Lembrete preventivo", canal: "E-mail", responsavel: "Financeiro", descricao: "Aviso 3 dias antes do vencimento com o boleto anexo." },
  { faixa: "1 a 15 dias", acao: "Cobrança amigável", canal: "E-mail + WhatsApp", responsavel: "Financeiro", descricao: "Contato cordial, reenvio do título com encargos calculados." },
  { faixa: "16 a 30 dias", acao: "Contato telefônico", canal: "Telefone", responsavel: "Cobrança", descricao: "Registrar promessa de pagamento e data acordada." },
  { faixa: "31 a 60 dias", acao: "Negociação / parcelamento", canal: "Reunião", responsavel: "Cobrança", descricao: "Proposta formal de acordo com entrada mínima de 20%." },
  { faixa: "61 a 90 dias", acao: "Notificação extrajudicial", canal: "Carta registrada", responsavel: "Jurídico", descricao: "Notificação com prazo de 5 dias e bloqueio comercial do cliente." },
  { faixa: "Acima de 90 dias", acao: "Protesto / jurídico", canal: "Cartório", responsavel: "Jurídico", descricao: "Encaminhar para protesto e avaliar provisão para perdas (PCLD)." },
];

export const reguaDa = (faixa: string) => REGUA.find((r) => r.faixa === faixa) || REGUA[0];

export type Inadimplente = {
  parceiro: string;
  titulos: TituloCalculado[];
  saldo: number;
  encargos: number;
  maiorAtraso: number;
  faixa: string;
  acao: Regua;
  ultimaAcao?: AcaoCobranca;
};

export function inadimplentes(empresaId?: string, competencia?: string, ref = hojeISO()): Inadimplente[] {
  const lista = carteira("receber", empresaId, competencia, ref).filter((t) => t.saldo > 0 && t.diasAtraso > 0);
  const hist = acoes();
  const mapa = new Map<string, TituloCalculado[]>();
  lista.forEach((t) => mapa.set(t.parceiro, [...(mapa.get(t.parceiro) || []), t]));
  return [...mapa.entries()]
    .map(([parceiro, tits]) => {
      const maiorAtraso = Math.max(...tits.map((t) => t.diasAtraso));
      const faixa = faixaAging(maiorAtraso);
      const ids = new Set(tits.map((t) => t.id));
      const ultimaAcao = hist.filter((a) => ids.has(a.tituloId)).sort((a, b) => b.data.localeCompare(a.data))[0];
      return {
        parceiro,
        titulos: tits.sort((a, b) => b.diasAtraso - a.diasAtraso),
        saldo: round(tits.reduce((a, t) => a + t.saldo, 0)),
        encargos: round(tits.reduce((a, t) => a + t.multa + t.juros, 0)),
        maiorAtraso,
        faixa,
        acao: reguaDa(faixa),
        ultimaAcao,
      };
    })
    .sort((a, b) => b.saldo - a.saldo);
}
