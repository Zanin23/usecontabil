/**
 * Conciliação bancária — motor de conciliação extrato x contabilidade.
 *
 * Inspirado nos fluxos de Domínio, Alterdata, Questor e TOTVS:
 *  - importação de extrato (OFX/CNAB simulada)
 *  - motor de match automático (documento, valor+data, valor aproximado)
 *  - tratamento de divergências (baixa manual, lançamento sugerido, pendência)
 *  - fechamento da conta com saldo conciliado
 */

export const CONCILIACAO_EVENT = "usecontabil:conciliacao-changed";
import { usuarioAtual } from "@/lib/usuarioAtual";

const moedaBR = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const brl = (n: number) => `R$ ${moedaBR(n)}`;
export const dataBR = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export type Origem = "Extrato" | "Contábil";
export type TipoMov = "Crédito" | "Débito";

export type ContaBancaria = {
  id: string;
  banco: string;
  codigo: string;
  agencia: string;
  conta: string;
  tipo: "Conta corrente" | "Aplicação" | "Conta pagamento";
  contaContabil: string;
  ativa: boolean;
};

export type Movimento = {
  id: string;
  contaId: string;
  origem: Origem;
  data: string;
  historico: string;
  documento: string;
  tipo: TipoMov;
  valor: number;
  categoria: string;
};

export type Vinculo = {
  id: string;
  contaId: string;
  competencia: string;
  extratoIds: string[];
  contabilIds: string[];
  metodo: "Automático" | "Manual" | "Regra" | "Lançamento sugerido";
  confianca: number;
  criadoEm: string;
  usuario: string;
  observacao?: string;
};

export type Estado = {
  vinculos: Vinculo[];
  fechamentos: Record<string, { fechadoEm: string; usuario: string }>;
  ignorados: string[];
};

const KEY = "usecontabil:conciliacao";

function ler(): Estado {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { vinculos: [], fechamentos: {}, ignorados: [], ...JSON.parse(raw) };
  } catch { /* ignora storage corrompido */ }
  return { vinculos: [], fechamentos: {}, ignorados: [] };
}

function gravar(e: Estado) {
  localStorage.setItem(KEY, JSON.stringify(e));
  window.dispatchEvent(new CustomEvent(CONCILIACAO_EVENT));
}

export function getEstado() {
  return ler();
}

/* ---------------------------------------------------------------- dados */

const BANCOS: Array<Omit<ContaBancaria, "id">> = [
  { banco: "Itaú Unibanco", codigo: "341", agencia: "5678", conta: "98765-4", tipo: "Conta corrente", contaContabil: "1.1.1.02.001", ativa: true },
  { banco: "Bradesco", codigo: "237", agencia: "1234", conta: "12345-6", tipo: "Conta corrente", contaContabil: "1.1.1.02.002", ativa: true },
  { banco: "Banco do Brasil", codigo: "001", agencia: "9012", conta: "45678-9", tipo: "Conta corrente", contaContabil: "1.1.1.02.003", ativa: true },
  { banco: "Santander", codigo: "033", agencia: "3344", conta: "77120-1", tipo: "Aplicação", contaContabil: "1.1.2.01.001", ativa: true },
  { banco: "Caixa Econômica", codigo: "104", agencia: "3456", conta: "00012-3", tipo: "Conta corrente", contaContabil: "1.1.1.02.004", ativa: false },
];

export function contas(): ContaBancaria[] {
  return BANCOS.map((b, i) => ({ ...b, id: `CTA-${String(i + 1).padStart(2, "0")}` }));
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function rng(seed: string) {
  let s = hash(seed) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const HISTORICOS: Array<[string, TipoMov, string]> = [
  ["PIX RECEBIDO CLIENTE", "Crédito", "Recebimento"],
  ["TED RECEBIDA CLIENTE", "Crédito", "Recebimento"],
  ["LIQUIDACAO BOLETO CARTEIRA", "Crédito", "Recebimento"],
  ["PAGTO FORNECEDOR", "Débito", "Fornecedores"],
  ["PIX ENVIADO FORNECEDOR", "Débito", "Fornecedores"],
  ["DARF RECEITA FEDERAL", "Débito", "Tributos"],
  ["GPS / INSS", "Débito", "Tributos"],
  ["FOLHA DE PAGAMENTO", "Débito", "Pessoal"],
  ["TARIFA MANUTENCAO CONTA", "Débito", "Tarifas"],
  ["TARIFA COBRANCA BOLETO", "Débito", "Tarifas"],
  ["IOF S/ OPERACAO", "Débito", "Encargos"],
  ["RENDIMENTO APLICACAO", "Crédito", "Aplicações"],
  ["ESTORNO DE COBRANCA", "Crédito", "Ajustes"],
  ["DEBITO AUTOMATICO ENERGIA", "Débito", "Utilidades"],
];

/** Gera extrato bancário e razão contábil com divergências plausíveis. */
export function movimentos(contaId: string, empresaId: string | null | undefined, competencia: string | string[]) {
  const compRef = Array.isArray(competencia) ? competencia[competencia.length - 1] : (competencia || "");
  const r = rng(`${contaId}|${empresaId ?? "grupo"}|${compRef}`);
  const [y, m] = compRef.split("-").map(Number);
  const diasNoMes = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const qtd = 18 + Math.floor(r() * 10);

  const extrato: Movimento[] = [];
  const contabil: Movimento[] = [];

  for (let i = 0; i < qtd; i++) {
    const [hist, tipo, categoria] = HISTORICOS[Math.floor(r() * HISTORICOS.length)];
    const dia = 1 + Math.floor(r() * diasNoMes);
    const data = `${y}-${String(m + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    const valor = Math.round((80 + r() * 48000) * 100) / 100;
    const documento = `${100000 + Math.floor(r() * 899999)}`;
    const sorte = r();

    const base: Movimento = {
      id: `EXT-${contaId}-${i}`,
      contaId, origem: "Extrato", data, historico: hist, documento, tipo, valor, categoria,
    };
    extrato.push(base);

    // 80% tem par contábil idêntico; 8% valor divergente; 6% data defasada; 6% só no banco
    if (sorte < 0.8) {
      contabil.push({ ...base, id: `CTB-${contaId}-${i}`, origem: "Contábil", historico: `${hist} — razão` });
    } else if (sorte < 0.88) {
      contabil.push({
        ...base, id: `CTB-${contaId}-${i}`, origem: "Contábil",
        historico: `${hist} — razão`, valor: Math.round((valor + (r() > 0.5 ? 1 : -1) * (5 + r() * 240)) * 100) / 100,
      });
    } else if (sorte < 0.94) {
      const d2 = Math.min(diasNoMes, dia + 1 + Math.floor(r() * 3));
      contabil.push({
        ...base, id: `CTB-${contaId}-${i}`, origem: "Contábil",
        historico: `${hist} — razão`, data: `${y}-${String(m + 1).padStart(2, "0")}-${String(d2).padStart(2, "0")}`,
      });
    }
  }

  // lançamentos apenas na contabilidade (não caíram no banco)
  const soContabil = 1 + Math.floor(r() * 3);
  for (let i = 0; i < soContabil; i++) {
    const [hist, tipo, categoria] = HISTORICOS[Math.floor(r() * HISTORICOS.length)];
    const dia = 1 + Math.floor(r() * diasNoMes);
    contabil.push({
      id: `CTB-${contaId}-X${i}`, contaId, origem: "Contábil",
      data: `${y}-${String(m + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`,
      historico: `${hist} — provisão`, documento: `${200000 + Math.floor(r() * 799999)}`,
      tipo, valor: Math.round((150 + r() * 9000) * 100) / 100, categoria,
    });
  }

  const ordenar = (a: Movimento, b: Movimento) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id);
  return { extrato: extrato.sort(ordenar), contabil: contabil.sort(ordenar) };
}

export const saldoDe = (movs: Movimento[]) =>
  movs.reduce((acc, m) => acc + (m.tipo === "Crédito" ? m.valor : -m.valor), 0);

/* ------------------------------------------------------------- vínculos */

export function vinculosDa(contaId: string, competencia: string | string[]) {
  const comps = Array.isArray(competencia) ? competencia : [competencia];
  return ler().vinculos.filter((v) => v.contaId === contaId && comps.includes(v.competencia));
}

export function idsConciliados(contaId: string, competencia: string | string[]) {
  const vs = vinculosDa(contaId, competencia);
  return {
    extrato: new Set(vs.flatMap((v) => v.extratoIds)),
    contabil: new Set(vs.flatMap((v) => v.contabilIds)),
  };
}

function salvarVinculo(v: Vinculo) {
  const e = ler();
  e.vinculos = [...e.vinculos.filter((x) => x.id !== v.id), v];
  gravar(e);
}

export function conciliarManual(
  contaId: string, competencia: string,
  extratoIds: string[], contabilIds: string[],
  observacao?: string,
) {
  salvarVinculo({
    id: `VIN-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    contaId, competencia, extratoIds, contabilIds,
    metodo: "Manual", confianca: 100,
    criadoEm: new Date().toISOString(), usuario: usuarioAtual(), observacao,
  });
}

export function desfazer(vinculoId: string) {
  const e = ler();
  e.vinculos = e.vinculos.filter((v) => v.id !== vinculoId);
  gravar(e);
}

export function limparConta(contaId: string, competencia: string) {
  const e = ler();
  e.vinculos = e.vinculos.filter((v) => !(v.contaId === contaId && v.competencia === competencia));
  delete e.fechamentos[`${contaId}|${competencia}`];
  gravar(e);
}

/** Motor de match automático: documento exato → valor+data → valor com janela de 3 dias. */
export function conciliarAutomatico(
  contaId: string, competencia: string,
  extrato: Movimento[], contabil: Movimento[],
) {
  const já = idsConciliados(contaId, competencia);
  const livresExt = extrato.filter((m) => !já.extrato.has(m.id));
  const livresCtb = contabil.filter((m) => !já.contabil.has(m.id));
  const usados = new Set<string>();
  const novos: Vinculo[] = [];
  const agora = new Date().toISOString();

  const tentar = (
    ext: Movimento,
    criterio: (c: Movimento) => boolean,
    metodo: Vinculo["metodo"],
    confianca: number,
  ) => {
    const par = livresCtb.find((c) => !usados.has(c.id) && criterio(c));
    if (!par) return false;
    usados.add(par.id);
    novos.push({
      id: `VIN-${contaId}-${ext.id}-${novos.length}`,
      contaId, competencia, extratoIds: [ext.id], contabilIds: [par.id],
      metodo, confianca, criadoEm: agora, usuario: "Motor de conciliação",
    });
    return true;
  };

  for (const ext of livresExt) {
    const exato = (c: Movimento) =>
      c.documento === ext.documento && c.valor === ext.valor && c.tipo === ext.tipo;
    const valorData = (c: Movimento) =>
      c.valor === ext.valor && c.data === ext.data && c.tipo === ext.tipo;
    const janela = (c: Movimento) =>
      c.valor === ext.valor && c.tipo === ext.tipo &&
      Math.abs(new Date(c.data).getTime() - new Date(ext.data).getTime()) <= 3 * 86400000;

    tentar(ext, exato, "Automático", 100) ||
      tentar(ext, valorData, "Automático", 96) ||
      tentar(ext, janela, "Regra", 88);
  }

  const e = ler();
  e.vinculos = [...e.vinculos, ...novos];
  gravar(e);
  return novos.length;
}

/* ------------------------------------------------------------ resultado */

export type ResultadoConta = {
  conta: ContaBancaria;
  extrato: Movimento[];
  contabil: Movimento[];
  pendentesExtrato: Movimento[];
  pendentesContabil: Movimento[];
  saldoBanco: number;
  saldoContabil: number;
  diferenca: number;
  conciliados: number;
  total: number;
  percentual: number;
  fechada: boolean;
  status: "Fechada" | "Conciliada" | "Em andamento" | "Divergente" | "Não iniciada";
};

export function resultado(
  conta: ContaBancaria,
  empresaId: string | null | undefined,
  competencia: string | string[],
): ResultadoConta {
  const { extrato, contabil } = movimentos(conta.id, empresaId, competencia);
  const ids = idsConciliados(conta.id, competencia);
  const pendentesExtrato = extrato.filter((m) => !ids.extrato.has(m.id));
  const pendentesContabil = contabil.filter((m) => !ids.contabil.has(m.id));
  const saldoBanco = saldoDe(extrato);
  const saldoContabil = saldoDe(contabil);
  const total = extrato.length + contabil.length;
  const conciliados = ids.extrato.size + ids.contabil.size;
  const comps = Array.isArray(competencia) ? competencia : [competencia];
  const fechada = comps.some(c => Boolean(ler().fechamentos[`${conta.id}|${c}`]));
  const percentual = total ? Math.round((conciliados / total) * 100) : 0;
  const diferenca = Math.round((saldoBanco - saldoContabil) * 100) / 100;

  const status: ResultadoConta["status"] = fechada
    ? "Fechada"
    : percentual === 100
      ? "Conciliada"
      : percentual === 0
        ? "Não iniciada"
        : Math.abs(diferenca) > 0.009
          ? "Divergente"
          : "Em andamento";

  return {
    conta, extrato, contabil, pendentesExtrato, pendentesContabil,
    saldoBanco, saldoContabil, diferenca, conciliados, total, percentual, fechada, status,
  };
}

export function fechar(contaId: string, competencia: string) {
  const e = ler();
  e.fechamentos[`${contaId}|${competencia}`] = { fechadoEm: new Date().toISOString(), usuario: usuarioAtual() };
  gravar(e);
}

export function reabrir(contaId: string, competencia: string) {
  const e = ler();
  delete e.fechamentos[`${contaId}|${competencia}`];
  gravar(e);
}

/** Divergências classificadas para a aba de tratamento. */
export type Divergencia = {
  id: string;
  tipo: "Somente no banco" | "Somente na contabilidade" | "Valor divergente" | "Data divergente";
  criticidade: "Alta" | "Média" | "Baixa";
  data: string;
  historico: string;
  documento: string;
  valor: number;
  sugestao: string;
  movimento: Movimento;
  par?: Movimento;
};

export function divergencias(res: ResultadoConta): Divergencia[] {
  const lista: Divergencia[] = [];

  for (const m of res.pendentesExtrato) {
    const mesmoDoc = res.pendentesContabil.find((c) => c.documento === m.documento);
    const mesmoValor = res.pendentesContabil.find((c) => c.valor === m.valor && c.tipo === m.tipo);
    if (mesmoDoc && mesmoDoc.valor !== m.valor) {
      lista.push({
        id: `DIV-${m.id}`, tipo: "Valor divergente", criticidade: "Alta",
        data: m.data, historico: m.historico, documento: m.documento, valor: m.valor,
        sugestao: `Diferença de ${brl(Math.abs(m.valor - mesmoDoc.valor))} entre extrato e razão — revisar lançamento contábil.`,
        movimento: m, par: mesmoDoc,
      });
    } else if (mesmoValor && mesmoValor.data !== m.data) {
      lista.push({
        id: `DIV-${m.id}`, tipo: "Data divergente", criticidade: "Média",
        data: m.data, historico: m.historico, documento: m.documento, valor: m.valor,
        sugestao: `Lançado em ${dataBR(mesmoValor.data)} e creditado em ${dataBR(m.data)} — conciliar com janela de data.`,
        movimento: m, par: mesmoValor,
      });
    } else {
      lista.push({
        id: `DIV-${m.id}`, tipo: "Somente no banco", criticidade: "Alta",
        data: m.data, historico: m.historico, documento: m.documento, valor: m.valor,
        sugestao: "Gerar lançamento contábil de contrapartida para o movimento bancário.",
        movimento: m,
      });
    }
  }

  const tratados = new Set(lista.map((d) => d.par?.id).filter(Boolean) as string[]);
  for (const c of res.pendentesContabil) {
    if (tratados.has(c.id)) continue;
    lista.push({
      id: `DIV-${c.id}`, tipo: "Somente na contabilidade", criticidade: "Média",
      data: c.data, historico: c.historico, documento: c.documento, valor: c.valor,
      sugestao: "Verificar se o pagamento/recebimento ocorreu — pode ser provisão ainda não liquidada.",
      movimento: c,
    });
  }

  return lista.sort((a, b) => b.valor - a.valor);
}
