// ============================================================================
// Administrativo › Compras e suprimentos
// ----------------------------------------------------------------------------
// Motor do ciclo de compras (requisição → cotação → pedido → recebimento),
// inspirado em Domínio, Alterdata, Questor, Fortes, SCI e TOTVS.
//
// Regras implementadas:
//  R1  Requisição nasce em "Rascunho" e só pode ir a aprovação com itens.
//  R2  Somente requisição aprovada pode abrir cotação (vira "Em cotação").
//  R3  Cotação exige ao menos 2 propostas para ser julgada (prática de
//      concorrência mínima). O julgamento respeita o critério escolhido:
//      menor preço, menor prazo ou melhor custo-benefício (preço + frete
//      ponderado pelo prazo).
//  R4  Proposta incompleta (item sem preço) fica desclassificada no ranking.
//  R5  Adjudicar a cotação gera automaticamente o pedido de compra com os
//      preços vencedores e fecha a requisição de origem como "Atendida".
//  R6  Pedido controla recebimento por item: parcial mantém o pedido aberto,
//      total conclui. Quantidade recebida nunca excede a pedida.
//  R7  Pedido recebido (total ou parcial) não pode ser cancelado.
//  R8  Todo número (RQ/CO/PC) é sequencial por tipo e nunca reutilizado.
//  R9  Nada é excluído em silêncio: toda alteração dispara evento para
//      atualizar as telas abertas.
// ============================================================================

export const COMPRAS_EVENT = "usecontabil:compras-changed";

import { getStoreKey } from "./storeUtils";

const KEY_REQ = "usecontabil.adm.compras.requisicoes.v1";
const KEY_COT = "usecontabil.adm.compras.cotacoes.v1";
const KEY_PED = "usecontabil.adm.compras.pedidos.v1";





/* ================================ utils ================================== */

export const brl = (v: number) =>
  "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const dataBR = (iso: string) => {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
};

export const hojeISO = () => new Date().toISOString().slice(0, 10);

export const somarDias = (iso: string, dias: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const round = (v: number) => Math.round(v * 100) / 100;

function ler<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(getStoreKey(key));

    if (!raw) {
      window.localStorage.setItem(getStoreKey(key), JSON.stringify(fallback));
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
  window.localStorage.setItem(getStoreKey(key), JSON.stringify(dados));
  window.dispatchEvent(new CustomEvent(COMPRAS_EVENT));
}

/* ================================ tipos ================================== */

export const UNIDADES = ["UN", "CX", "KG", "L", "M", "M²", "PC", "SV", "HR"] as const;
export const CENTROS_CUSTO = ["Industrial", "Comercial", "Administrativo", "Logística", "TI", "Manutenção"];
export const SETORES = ["Produção", "TI", "Logística", "Financeiro", "Manutenção", "Comercial", "Administrativo"];
export const CONDICOES_PAGAMENTO = ["À vista", "7 dias", "14 dias", "21/28 dias", "28 dias", "30/60 dias", "30/60/90 dias"];
export const TIPOS_FRETE = ["CIF (por conta do fornecedor)", "FOB (por conta do comprador)"] as const;

export type Prioridade = "Baixa" | "Normal" | "Alta" | "Urgente";

export type StatusRequisicao =
  | "Rascunho" | "Aguardando aprovação" | "Aprovada" | "Reprovada" | "Em cotação" | "Atendida" | "Cancelada";

export type StatusCotacao = "Aberta" | "Em análise" | "Adjudicada" | "Deserta" | "Cancelada";

export type StatusPedido =
  | "Aguardando envio" | "Em trânsito" | "Recebido parcial" | "Recebido" | "Cancelado";

export type CriterioJulgamento = "Menor preço" | "Menor prazo" | "Melhor custo-benefício";

export type ItemRequisicao = {
  id: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorEstimado: number;   // unitário estimado pelo solicitante
};

export type Requisicao = {
  id: string;
  empresaId?: string;
  numero: string;
  solicitante: string;
  setor: string;
  centroCusto: string;
  data: string;              // ISO
  necessidade: string;       // ISO — data desejada de entrega
  prioridade: Prioridade;
  justificativa: string;
  contaContabil: string;
  status: StatusRequisicao;
  aprovador?: string;
  aprovadoEm?: string;
  motivoReprovacao?: string;
  itens: ItemRequisicao[];
};

export type Proposta = {
  id: string;
  fornecedor: string;
  cnpj: string;
  contato: string;
  prazoEntregaDias: number;
  condicaoPagamento: string;
  frete: number;            // valor do frete cobrado
  tipoFrete: string;
  validade: string;         // ISO — validade da proposta
  observacoes?: string;
  precos: Record<string, number>;  // itemId → preço unitário
};

export type Cotacao = {
  id: string;
  empresaId?: string;
  numero: string;
  requisicaoId: string;
  requisicaoNumero: string;
  comprador: string;
  abertura: string;
  encerramento: string;
  criterio: CriterioJulgamento;
  status: StatusCotacao;
  itens: ItemRequisicao[];
  propostas: Proposta[];
  vencedoraId?: string;
  pedidoNumero?: string;
};

export type ItemPedido = {
  id: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  precoUnitario: number;
  recebido: number;
};

export type Pedido = {
  id: string;
  empresaId?: string;
  numero: string;
  cotacaoId?: string;
  cotacaoNumero?: string;
  requisicaoNumero?: string;
  fornecedor: string;
  cnpj: string;
  emissao: string;
  previsao: string;
  condicaoPagamento: string;
  frete: number;
  tipoFrete: string;
  centroCusto: string;
  contaContabil: string;
  observacoes?: string;
  status: StatusPedido;
  itens: ItemPedido[];
  recebimentos: { data: string; item: string; quantidade: number; nota: string; responsavel: string }[];
};

/* ============================== seed inicial ============================= */

const item = (descricao: string, unidade: string, quantidade: number, valorEstimado: number): ItemRequisicao =>
  ({ id: uid("it"), descricao, unidade, quantidade, valorEstimado });

const SEED_REQ: Requisicao[] = [
  {
    id: "req-seed-1", numero: "RQ-0412", solicitante: "Bruno Lima", setor: "Produção", centroCusto: "Industrial",
    data: "2026-07-14", necessidade: "2026-08-10", prioridade: "Alta",
    justificativa: "Reposição de matéria-prima para a ordem de produção OP-2291.",
    contaContabil: "1.1.03.001 — Estoque de matéria-prima", status: "Em cotação",
    aprovador: "Marina Costa", aprovadoEm: "2026-07-15",
    itens: [item("Chapa de aço 2mm — 500kg", "KG", 500, 132), item("Eletrodo revestido 3,25mm", "CX", 12, 210)],
  },
  {
    id: "req-seed-2", numero: "RQ-0413", solicitante: "Carla Mendes", setor: "TI", centroCusto: "Administrativo",
    data: "2026-07-16", necessidade: "2026-08-14", prioridade: "Normal",
    justificativa: "Substituição de notebooks com mais de 5 anos de uso.",
    contaContabil: "1.2.01.004 — Computadores e periféricos", status: "Aprovada",
    aprovador: "Marina Costa", aprovadoEm: "2026-07-17",
    itens: [item("Notebook i7 16GB 512GB SSD", "UN", 5, 6_240)],
  },
  {
    id: "req-seed-3", numero: "RQ-0414", solicitante: "Rafael Prado", setor: "Logística", centroCusto: "Logística",
    data: "2026-07-21", necessidade: "2026-08-20", prioridade: "Normal",
    justificativa: "Reposição de embalagens para expedição do 3º trimestre.",
    contaContabil: "1.1.03.005 — Material de embalagem", status: "Aguardando aprovação",
    itens: [item("Caixa de papelão 60x40x40", "UN", 800, 7.4), item("Filme stretch 500mm", "PC", 40, 62)],
  },
];

const SEED_COT: Cotacao[] = [
  {
    id: "cot-seed-1", numero: "CO-0188", requisicaoId: "req-seed-1", requisicaoNumero: "RQ-0412",
    comprador: "Suprimentos", abertura: "2026-07-16", encerramento: "2026-07-30",
    criterio: "Melhor custo-benefício", status: "Em análise",
    itens: SEED_REQ[0].itens,
    propostas: [
      {
        id: "prop-seed-1", fornecedor: "Distribuidora Norte Ltda.", cnpj: "12.345.678/0001-95", contato: "comercial@norte.com.br",
        prazoEntregaDias: 12, condicaoPagamento: "30/60 dias", frete: 1_200, tipoFrete: "CIF (por conta do fornecedor)",
        validade: "2026-08-15",
        precos: { [SEED_REQ[0].itens[0].id]: 128.4, [SEED_REQ[0].itens[1].id]: 198 },
      },
      {
        id: "prop-seed-2", fornecedor: "Aços União S.A.", cnpj: "45.987.123/0001-04", contato: "vendas@acosuniao.com.br",
        prazoEntregaDias: 22, condicaoPagamento: "28 dias", frete: 0, tipoFrete: "CIF (por conta do fornecedor)",
        validade: "2026-08-20",
        precos: { [SEED_REQ[0].itens[0].id]: 126.9, [SEED_REQ[0].itens[1].id]: 216 },
      },
    ],
  },
];

const SEED_PED: Pedido[] = [
  {
    id: "ped-seed-1", numero: "PC-1039", fornecedor: "Comércio Andes Eireli", cnpj: "09.221.554/0001-93",
    emissao: "2026-07-02", previsao: "2026-07-22", condicaoPagamento: "28 dias", frete: 340,
    tipoFrete: "CIF (por conta do fornecedor)", centroCusto: "Administrativo",
    contaContabil: "4.1.02.010 — Material de uso e consumo", status: "Recebido",
    itens: [{ id: uid("ip"), descricao: "Material de escritório — kit trimestral", unidade: "CX", quantidade: 24, precoUnitario: 520, recebido: 24 }],
    recebimentos: [{ data: "2026-07-21", item: "Material de escritório — kit trimestral", quantidade: 24, nota: "NF-e 8842", responsavel: "Almoxarifado" }],
  },
  {
    id: "ped-seed-2", numero: "PC-1043", fornecedor: "TechCore Sistemas ME", cnpj: "31.004.778/0001-00",
    emissao: "2026-07-18", previsao: "2026-08-14", condicaoPagamento: "30/60 dias", frete: 0,
    tipoFrete: "CIF (por conta do fornecedor)", centroCusto: "Administrativo",
    contaContabil: "1.2.01.004 — Computadores e periféricos", status: "Aguardando envio",
    itens: [{ id: uid("ip"), descricao: "Notebook i7 16GB 512GB SSD", unidade: "UN", quantidade: 5, precoUnitario: 6_240, recebido: 0 }],
    recebimentos: [],
  },
];

/* ============================== persistência ============================= */

export const listarRequisicoes = () => ler<Requisicao>(KEY_REQ, SEED_REQ);
export const listarCotacoes = () => ler<Cotacao>(KEY_COT, SEED_COT);
export const listarPedidos = () => ler<Pedido>(KEY_PED, SEED_PED);

function proximoNumero(prefixo: string, existentes: string[], base: number) {
  const nums = existentes
    .map((n) => Number(n.replace(/\D/g, "")))
    .filter((n) => Number.isFinite(n));
  const maior = nums.length ? Math.max(...nums) : base;
  return `${prefixo}-${String(maior + 1).padStart(4, "0")}`;
}

export const novoNumeroRequisicao = () => proximoNumero("RQ", listarRequisicoes().map((r) => r.numero), 400);
export const novoNumeroCotacao = () => proximoNumero("CO", listarCotacoes().map((c) => c.numero), 180);
export const novoNumeroPedido = () => proximoNumero("PC", listarPedidos().map((p) => p.numero), 1_030);

export const novoItem = (): ItemRequisicao => ({ id: uid("it"), descricao: "", unidade: "UN", quantidade: 1, valorEstimado: 0 });

/* ============================== requisições ============================== */

export const totalRequisicao = (r: Requisicao) =>
  round(r.itens.reduce((s, i) => s + i.quantidade * i.valorEstimado, 0));

export function salvarRequisicao(dados: Omit<Requisicao, "id"> & { id?: string }) {
  if (!dados.solicitante.trim()) throw new Error("Informe o solicitante da requisição.");
  const itens = dados.itens.filter((i) => i.descricao.trim());
  if (!itens.length) throw new Error("Inclua ao menos um item na requisição (R1).");
  if (itens.some((i) => i.quantidade <= 0)) throw new Error("Todo item precisa de quantidade maior que zero.");

  const lista = listarRequisicoes();
  const idx = dados.id ? lista.findIndex((r) => r.id === dados.id) : -1;
  const registro: Requisicao = {
    ...dados,
    itens,
    id: dados.id || uid("req"),
    numero: dados.numero || novoNumeroRequisicao(),
  };
  if (idx >= 0) lista[idx] = registro; else lista.unshift(registro);
  gravar(KEY_REQ, lista);
  return registro;
}

export function excluirRequisicao(id: string) {
  const req = listarRequisicoes().find((r) => r.id === id);
  if (req && ["Em cotação", "Atendida"].includes(req.status))
    throw new Error("Requisição já cotada ou atendida não pode ser excluída.");
  gravar(KEY_REQ, listarRequisicoes().filter((r) => r.id !== id));
}

function mudarStatusRequisicao(id: string, patch: Partial<Requisicao>) {
  const lista = listarRequisicoes();
  const idx = lista.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Requisição não encontrada.");
  lista[idx] = { ...lista[idx], ...patch };
  gravar(KEY_REQ, lista);
  return lista[idx];
}

export function enviarParaAprovacao(id: string) {
  const req = listarRequisicoes().find((r) => r.id === id);
  if (!req) throw new Error("Requisição não encontrada.");
  if (req.status !== "Rascunho" && req.status !== "Reprovada")
    throw new Error("Somente rascunho ou requisição reprovada pode ser enviada para aprovação.");
  if (!req.itens.length) throw new Error("Requisição sem itens não pode ser enviada (R1).");
  return mudarStatusRequisicao(id, { status: "Aguardando aprovação", motivoReprovacao: undefined });
}

export const aprovarRequisicao = (id: string, aprovador: string) =>
  mudarStatusRequisicao(id, { status: "Aprovada", aprovador, aprovadoEm: hojeISO(), motivoReprovacao: undefined });

export const reprovarRequisicao = (id: string, aprovador: string, motivo: string) => {
  if (!motivo.trim()) throw new Error("Informe o motivo da reprovação.");
  return mudarStatusRequisicao(id, { status: "Reprovada", aprovador, aprovadoEm: hojeISO(), motivoReprovacao: motivo });
};

export const cancelarRequisicao = (id: string) => mudarStatusRequisicao(id, { status: "Cancelada" });

export function resumoRequisicoes(lista = listarRequisicoes()) {
  const ativas = lista.filter((r) => r.status !== "Cancelada");
  return {
    total: ativas.length,
    aguardando: ativas.filter((r) => r.status === "Aguardando aprovação").length,
    aprovadas: ativas.filter((r) => r.status === "Aprovada").length,
    emCotacao: ativas.filter((r) => r.status === "Em cotação").length,
    valorEstimado: round(ativas.reduce((s, r) => s + totalRequisicao(r), 0)),
  };
}

/* ================================ cotações =============================== */

export function abrirCotacao(requisicaoId: string, comprador: string, criterio: CriterioJulgamento, encerramento: string) {
  const req = listarRequisicoes().find((r) => r.id === requisicaoId);
  if (!req) throw new Error("Requisição não encontrada.");
  if (req.status !== "Aprovada") throw new Error("Somente requisição aprovada abre cotação (R2).");

  const cotacao: Cotacao = {
    id: uid("cot"),
    numero: novoNumeroCotacao(),
    requisicaoId: req.id,
    requisicaoNumero: req.numero,
    comprador: comprador || "Suprimentos",
    abertura: hojeISO(),
    encerramento: encerramento || somarDias(hojeISO(), 10),
    criterio,
    status: "Aberta",
    itens: req.itens.map((i) => ({ ...i })),
    propostas: [],
  };
  gravar(KEY_COT, [cotacao, ...listarCotacoes()]);
  mudarStatusRequisicao(req.id, { status: "Em cotação" });
  return cotacao;
}

function salvarCotacaoRegistro(cot: Cotacao) {
  const lista = listarCotacoes();
  const idx = lista.findIndex((c) => c.id === cot.id);
  if (idx < 0) throw new Error("Cotação não encontrada.");
  lista[idx] = cot;
  gravar(KEY_COT, lista);
  return cot;
}

export function salvarProposta(cotacaoId: string, proposta: Omit<Proposta, "id"> & { id?: string }) {
  const cot = listarCotacoes().find((c) => c.id === cotacaoId);
  if (!cot) throw new Error("Cotação não encontrada.");
  if (cot.status === "Adjudicada") throw new Error("Cotação adjudicada não aceita novas propostas.");
  if (!proposta.fornecedor.trim()) throw new Error("Informe o fornecedor da proposta.");
  if (proposta.prazoEntregaDias <= 0) throw new Error("Prazo de entrega deve ser maior que zero.");

  const registro: Proposta = { ...proposta, id: proposta.id || uid("prop") };
  const propostas = proposta.id
    ? cot.propostas.map((p) => (p.id === proposta.id ? registro : p))
    : [...cot.propostas, registro];
  return salvarCotacaoRegistro({ ...cot, propostas, status: propostas.length >= 2 ? "Em análise" : "Aberta" });
}

export function excluirProposta(cotacaoId: string, propostaId: string) {
  const cot = listarCotacoes().find((c) => c.id === cotacaoId);
  if (!cot) throw new Error("Cotação não encontrada.");
  if (cot.status === "Adjudicada") throw new Error("Cotação adjudicada não pode ser alterada.");
  const propostas = cot.propostas.filter((p) => p.id !== propostaId);
  return salvarCotacaoRegistro({ ...cot, propostas, status: propostas.length >= 2 ? "Em análise" : "Aberta" });
}

export type PropostaAvaliada = {
  proposta: Proposta;
  totalItens: number;
  total: number;            // itens + frete
  completa: boolean;        // R4
  economia: number;         // versus estimativa da requisição
  indice: number;           // menor é melhor, conforme critério (R3)
  posicao: number;
  desclassificada: boolean;
};

export function julgarCotacao(cot: Cotacao): PropostaAvaliada[] {
  const estimado = round(cot.itens.reduce((s, i) => s + i.quantidade * i.valorEstimado, 0));

  const base = cot.propostas.map((p) => {
    const completa = cot.itens.every((i) => Number(p.precos[i.id]) > 0);
    const totalItens = round(cot.itens.reduce((s, i) => s + i.quantidade * (Number(p.precos[i.id]) || 0), 0));
    const total = round(totalItens + (p.frete || 0));
    return { proposta: p, totalItens, total, completa, economia: round(estimado - total), desclassificada: !completa };
  });

  const validas = base.filter((b) => !b.desclassificada);
  const menorTotal = Math.min(...validas.map((v) => v.total), Infinity);
  const menorPrazo = Math.min(...validas.map((v) => v.proposta.prazoEntregaDias), Infinity);

  const comIndice = base.map((b) => {
    let indice = Infinity;
    if (!b.desclassificada) {
      if (cot.criterio === "Menor preço") indice = b.total;
      else if (cot.criterio === "Menor prazo") indice = b.proposta.prazoEntregaDias * 1_000_000 + b.total;
      else {
        // custo-benefício: preço normalizado (70%) + prazo normalizado (30%)
        const rp = menorTotal > 0 ? b.total / menorTotal : 1;
        const rz = menorPrazo > 0 ? b.proposta.prazoEntregaDias / menorPrazo : 1;
        indice = round((rp * 0.7 + rz * 0.3) * 1000);
      }
    }
    return { ...b, indice };
  });

  return comIndice
    .sort((a, b) => a.indice - b.indice)
    .map((b, i) => ({ ...b, posicao: b.desclassificada ? 0 : i + 1 }));
}

export function adjudicarCotacao(cotacaoId: string, propostaId: string, dados: { previsao?: string; centroCusto?: string; contaContabil?: string; observacoes?: string } = {}) {
  const cot = listarCotacoes().find((c) => c.id === cotacaoId);
  if (!cot) throw new Error("Cotação não encontrada.");
  if (cot.status === "Adjudicada") throw new Error("Cotação já adjudicada.");
  if (cot.propostas.length < 2) throw new Error("A cotação exige ao menos 2 propostas para julgamento (R3).");

  const avaliada = julgarCotacao(cot).find((a) => a.proposta.id === propostaId);
  if (!avaliada) throw new Error("Proposta não encontrada.");
  if (avaliada.desclassificada) throw new Error("Proposta incompleta não pode vencer a cotação (R4).");

  const req = listarRequisicoes().find((r) => r.id === cot.requisicaoId);
  const p = avaliada.proposta;
  const pedido: Pedido = {
    id: uid("ped"),
    numero: novoNumeroPedido(),
    cotacaoId: cot.id,
    cotacaoNumero: cot.numero,
    requisicaoNumero: cot.requisicaoNumero,
    fornecedor: p.fornecedor,
    cnpj: p.cnpj,
    emissao: hojeISO(),
    previsao: dados.previsao || somarDias(hojeISO(), p.prazoEntregaDias),
    condicaoPagamento: p.condicaoPagamento,
    frete: p.frete || 0,
    tipoFrete: p.tipoFrete,
    centroCusto: dados.centroCusto || req?.centroCusto || CENTROS_CUSTO[0],
    contaContabil: dados.contaContabil || req?.contaContabil || "",
    observacoes: dados.observacoes,
    status: "Aguardando envio",
    itens: cot.itens.map((i) => ({
      id: uid("ip"), descricao: i.descricao, unidade: i.unidade,
      quantidade: i.quantidade, precoUnitario: Number(p.precos[i.id]) || 0, recebido: 0,
    })),
    recebimentos: [],
  };

  gravar(KEY_PED, [pedido, ...listarPedidos()]);
  salvarCotacaoRegistro({ ...cot, status: "Adjudicada", vencedoraId: p.id, pedidoNumero: pedido.numero });
  if (req) mudarStatusRequisicao(req.id, { status: "Atendida" });   // R5
  return pedido;
}

export function cancelarCotacao(cotacaoId: string) {
  const cot = listarCotacoes().find((c) => c.id === cotacaoId);
  if (!cot) throw new Error("Cotação não encontrada.");
  if (cot.status === "Adjudicada") throw new Error("Cotação adjudicada não pode ser cancelada.");
  salvarCotacaoRegistro({ ...cot, status: "Cancelada" });
  const req = listarRequisicoes().find((r) => r.id === cot.requisicaoId);
  if (req && req.status === "Em cotação") mudarStatusRequisicao(req.id, { status: "Aprovada" });
}

export function resumoCotacoes(lista = listarCotacoes()) {
  const ativas = lista.filter((c) => c.status !== "Cancelada");
  const adjudicadas = ativas.filter((c) => c.status === "Adjudicada");
  const economia = adjudicadas.reduce((s, c) => {
    const v = julgarCotacao(c).find((a) => a.proposta.id === c.vencedoraId);
    return s + (v?.economia || 0);
  }, 0);
  return {
    total: ativas.length,
    abertas: ativas.filter((c) => c.status === "Aberta").length,
    emAnalise: ativas.filter((c) => c.status === "Em análise").length,
    adjudicadas: adjudicadas.length,
    economia: round(economia),
    propostas: ativas.reduce((s, c) => s + c.propostas.length, 0),
  };
}

/* ================================= pedidos =============================== */

export const totalPedido = (p: Pedido) =>
  round(p.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0) + (p.frete || 0));

export const recebidoPedido = (p: Pedido) =>
  round(p.itens.reduce((s, i) => s + i.recebido * i.precoUnitario, 0));

export const percentualRecebido = (p: Pedido) => {
  const qtd = p.itens.reduce((s, i) => s + i.quantidade, 0);
  const rec = p.itens.reduce((s, i) => s + i.recebido, 0);
  return qtd ? Math.round((rec / qtd) * 100) : 0;
};

export function salvarPedido(dados: Omit<Pedido, "id"> & { id?: string }) {
  if (!dados.fornecedor.trim()) throw new Error("Informe o fornecedor do pedido.");
  const itens = dados.itens.filter((i) => i.descricao.trim());
  if (!itens.length) throw new Error("Inclua ao menos um item no pedido.");
  if (itens.some((i) => i.quantidade <= 0 || i.precoUnitario <= 0))
    throw new Error("Todo item precisa de quantidade e preço unitário maiores que zero.");

  const lista = listarPedidos();
  const idx = dados.id ? lista.findIndex((p) => p.id === dados.id) : -1;
  const registro: Pedido = {
    ...dados,
    itens,
    id: dados.id || uid("ped"),
    numero: dados.numero || novoNumeroPedido(),
    recebimentos: dados.recebimentos || [],
  };
  if (idx >= 0) lista[idx] = registro; else lista.unshift(registro);
  gravar(KEY_PED, lista);
  return registro;
}

export function excluirPedido(id: string) {
  const p = listarPedidos().find((x) => x.id === id);
  if (p && p.itens.some((i) => i.recebido > 0)) throw new Error("Pedido com recebimento não pode ser excluído.");
  gravar(KEY_PED, listarPedidos().filter((x) => x.id !== id));
}

export function marcarEmTransito(id: string) {
  const lista = listarPedidos();
  const idx = lista.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error("Pedido não encontrado.");
  if (lista[idx].status !== "Aguardando envio") throw new Error("Somente pedido aguardando envio pode entrar em trânsito.");
  lista[idx] = { ...lista[idx], status: "Em trânsito" };
  gravar(KEY_PED, lista);
}

export function cancelarPedido(id: string) {
  const lista = listarPedidos();
  const idx = lista.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error("Pedido não encontrado.");
  if (lista[idx].itens.some((i) => i.recebido > 0)) throw new Error("Pedido com recebimento não pode ser cancelado (R7).");
  lista[idx] = { ...lista[idx], status: "Cancelado" };
  gravar(KEY_PED, lista);
}

/** R6 — registra recebimento por item; parcial mantém aberto, total conclui. */
export function registrarRecebimento(
  id: string,
  quantidades: Record<string, number>,
  info: { data: string; nota: string; responsavel: string },
) {
  const lista = listarPedidos();
  const idx = lista.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error("Pedido não encontrado.");
  const pedido = lista[idx];
  if (pedido.status === "Cancelado") throw new Error("Pedido cancelado não recebe mercadoria.");
  if (!info.nota.trim()) throw new Error("Informe a nota fiscal do recebimento.");

  const lancamentos: Pedido["recebimentos"] = [];
  const itens = pedido.itens.map((i) => {
    const qtd = Number(quantidades[i.id]) || 0;
    if (qtd <= 0) return i;
    const saldo = i.quantidade - i.recebido;
    if (qtd > saldo) throw new Error(`"${i.descricao}": quantidade recebida excede o saldo de ${saldo} ${i.unidade} (R6).`);
    lancamentos.push({ data: info.data || hojeISO(), item: i.descricao, quantidade: qtd, nota: info.nota, responsavel: info.responsavel || "Almoxarifado" });
    return { ...i, recebido: round(i.recebido + qtd) };
  });
  if (!lancamentos.length) throw new Error("Informe ao menos uma quantidade recebida.");

  const completo = itens.every((i) => i.recebido >= i.quantidade);
  lista[idx] = {
    ...pedido, itens,
    status: completo ? "Recebido" : "Recebido parcial",
    recebimentos: [...pedido.recebimentos, ...lancamentos],
  };
  gravar(KEY_PED, lista);
  return lista[idx];
}

export function resumoPedidos(lista = listarPedidos()) {
  const ativos = lista.filter((p) => p.status !== "Cancelado");
  const hoje = hojeISO();
  return {
    total: ativos.length,
    abertos: ativos.filter((p) => p.status !== "Recebido").length,
    emTransito: ativos.filter((p) => p.status === "Em trânsito").length,
    atrasados: ativos.filter((p) => p.status !== "Recebido" && p.previsao < hoje).length,
    valor: round(ativos.reduce((s, p) => s + totalPedido(p), 0)),
    recebido: round(ativos.reduce((s, p) => s + recebidoPedido(p), 0)),
  };
}

export function pedidosPorFornecedor(lista = listarPedidos()) {
  const mapa = new Map<string, number>();
  lista.filter((p) => p.status !== "Cancelado").forEach((p) => {
    mapa.set(p.fornecedor, round((mapa.get(p.fornecedor) || 0) + totalPedido(p)));
  });
  return [...mapa.entries()].map(([fornecedor, valor]) => ({ fornecedor, valor })).sort((a, b) => b.valor - a.valor);
}
