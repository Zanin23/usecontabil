// localStorage-backed store for the "Fiscal › Escrituração" screens.
// Rows are scoped by empresa (selected company) and competência (YYYY-MM).
// Nada aqui conversa com a Receita — cálculo interno/visual.
import { useEffect, useState } from "react";
import { daEmpresa, loadDocs, moedaBR, valorBR, type DocFiscal } from "@/lib/fiscalStore";
import { getStorageSuffix } from "./praticaStore";

const KEY_BASE = "usecontabil.escrituracao.v1";
/** Chave no modo atual: o modo prática grava com o sufixo `.pratica`. */
const KEY = () => KEY_BASE + getStorageSuffix();

export const ESCRITURACAO_EVENT = "usecontabil:escrituracao-changed";

export type EscSlug =
  | "livro-entradas"
  | "livro-saidas"
  | "apuracao-icms"
  | "apuracao-ipi"
  | "inventario"
  | "ciap";

export type EscLinha = {
  id: string;
  empresaId: string;
  competencia: string;
} & Record<string, string>;

type DB = Partial<Record<EscSlug, EscLinha[]>>;

function notify() {
  window.dispatchEvent(new Event(ESCRITURACAO_EVENT));
}

export function loadDB(): DB {
  try {
    const raw = localStorage.getItem(KEY());
    return raw ? (JSON.parse(raw) as DB) : {};
  } catch {
    return {};
  }
}

function persist(db: DB) {
  localStorage.setItem(KEY(), JSON.stringify(db));
  notify();
}

export function loadLinhas(slug: EscSlug): EscLinha[] {
  return loadDB()[slug] ?? [];
}

export function saveLinha(slug: EscSlug, linha: EscLinha) {
  const db = loadDB();
  const list = [...(db[slug] ?? [])];
  const idx = list.findIndex((l) => l.id === linha.id);
  if (idx >= 0) list[idx] = linha;
  else list.unshift(linha);
  persist({ ...db, [slug]: list });
}

export function removeLinha(slug: EscSlug, id: string) {
  const db = loadDB();
  persist({ ...db, [slug]: (db[slug] ?? []).filter((l) => l.id !== id) });
}

export function limparPeriodoEsc(slug: EscSlug, empresaId: string, competencia: string) {
  const db = loadDB();
  persist({
    ...db,
    [slug]: (db[slug] ?? []).filter(
      (l) => !(l.empresaId === empresaId && l.competencia === competencia),
    ),
  });
}

/** Substitui todas as linhas da empresa/competência (usado pelo "Gerar"). */
export function substituirPeriodo(
  slug: EscSlug,
  empresaId: string,
  competencia: string,
  linhas: EscLinha[],
) {
  const db = loadDB();
  const outros = (db[slug] ?? []).filter(
    (l) => !(l.empresaId === empresaId && l.competencia === competencia),
  );
  persist({ ...db, [slug]: [...linhas, ...outros] });
}

export function novoEscId(prefixo: string) {
  return `${prefixo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function linhasDoPeriodo(slug: EscSlug, empresaId?: string | null, competencia?: string) {
  return loadLinhas(slug).filter(
    (l) =>
      daEmpresa(l.empresaId, empresaId) &&
      (!competencia || l.competencia === competencia),
  );
}

export function useEscrituracao(slug: EscSlug, empresaId?: string | null, competencia?: string) {
  const [linhas, setLinhas] = useState<EscLinha[]>(() => loadLinhas(slug));

  useEffect(() => {
    const refresh = () => setLinhas(loadLinhas(slug));
    refresh();
    window.addEventListener(ESCRITURACAO_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(ESCRITURACAO_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [slug]);

  return linhas.filter(
    (l) =>
      daEmpresa(l.empresaId, empresaId) &&
      (!competencia || l.competencia === competencia),
  );
}

/* --------------------------- regras de CFOP ---------------------------- */

export const CFOP_DESCRICAO: Record<string, string> = {
  "1102": "Compra para comercialização",
  "1202": "Devolução de venda",
  "1352": "Aquisição de serviço de transporte",
  "1403": "Compra para comercialização com ST",
  "1556": "Compra de material de uso e consumo",
  "2102": "Compra para comercialização — interestadual",
  "2352": "Serviço de transporte interestadual",
  "2551": "Compra de bem para o ativo imobilizado",
  "2556": "Uso e consumo — interestadual",
  "5102": "Venda de mercadoria",
  "5202": "Devolução de compra",
  "5405": "Venda de mercadoria com ST (substituído)",
  "5910": "Remessa em bonificação / brinde",
  "5949": "Outra saída não especificada",
  "6102": "Venda de mercadoria — interestadual",
  "6108": "Venda a consumidor final não contribuinte",
  "5933": "Prestação de serviço tributado pelo ISS",
  "5929": "Cupom fiscal / venda no varejo (NFC-e)",
};

/** CFOPs que não geram crédito (uso e consumo, ST, ativo, isentas). */
const SEM_CREDITO = new Set([
  "1403", "2403", "1556", "2556", "1551", "2551", "1910", "2910", "1949", "2949",
]);

/** CFOPs de saída sem débito próprio de ICMS (ST, bonificação, remessa). */
const SEM_DEBITO = new Set([
  "5405", "6404", "5910", "6910", "5949", "6949", "5933", "5929",
]);

export function geraCredito(cfop: string) {
  return !SEM_CREDITO.has((cfop ?? "").trim());
}

export function geraDebito(cfop: string) {
  return !SEM_DEBITO.has((cfop ?? "").trim());
}

export function descricaoCfop(cfop: string) {
  return CFOP_DESCRICAO[(cfop ?? "").trim()] ?? "Operação não classificada";
}

/* ----------------------- derivação dos documentos ---------------------- */

type Acumulado = {
  cfop: string;
  documentos: number;
  contabil: number;
  base: number;
  icms: number;
  ipi: number;
  isentas: number;
  outras: number;
};

function acumular(mapa: Map<string, Acumulado>, cfop: string) {
  const chave = (cfop || "0000").trim();
  if (!mapa.has(chave)) {
    mapa.set(chave, {
      cfop: chave, documentos: 0, contabil: 0, base: 0, icms: 0, ipi: 0, isentas: 0, outras: 0,
    });
  }
  return mapa.get(chave)!;
}

function doPeriodo(docs: DocFiscal[], empresaId: string, competencia: string) {
  return docs.filter(
    (d) =>
      d.empresaId === empresaId &&
      d.competencia === competencia &&
      !/cancelad|denegad/i.test(d.status ?? ""),
  );
}

/** Consolida os documentos fiscais de entrada da competência por CFOP. */
export function gerarLivroEntradas(empresaId: string, competencia: string) {
  const mapa = new Map<string, Acumulado>();

  doPeriodo(loadDocs("entradas"), empresaId, competencia).forEach((d) => {
    const a = acumular(mapa, d.cfop);
    const total = valorBR(d.valor);
    const credito = geraCredito(d.cfop);
    a.documentos += 1;
    a.contabil += total;
    if (credito) {
      a.base += valorBR(d.baseIcms) || total;
      a.icms += valorBR(d.icms);
    } else {
      a.outras += total;
    }
  });

  doPeriodo(loadDocs("transporte"), empresaId, competencia).forEach((d) => {
    const a = acumular(mapa, d.cfop || "1352");
    const total = valorBR(d.valor);
    a.documentos += 1;
    a.contabil += total;
    a.base += total;
    a.icms += valorBR(d.icms);
  });

  doPeriodo(loadDocs("servicos-tomados"), empresaId, competencia).forEach((d) => {
    const a = acumular(mapa, "1933");
    a.documentos += 1;
    a.contabil += valorBR(d.valor);
    a.isentas += valorBR(d.valor);
  });

  return finalizarLivro(mapa, empresaId, competencia, "LVE");
}

/** Consolida os documentos fiscais de saída da competência por CFOP. */
export function gerarLivroSaidas(empresaId: string, competencia: string) {
  const mapa = new Map<string, Acumulado>();

  doPeriodo(loadDocs("saidas"), empresaId, competencia).forEach((d) => {
    const a = acumular(mapa, d.cfop);
    const total = valorBR(d.valor);
    a.documentos += 1;
    a.contabil += total;
    if (geraDebito(d.cfop)) {
      a.base += valorBR(d.baseIcms) || total;
      a.icms += valorBR(d.icms);
    } else {
      a.outras += total;
    }
  });

  doPeriodo(loadDocs("cupons"), empresaId, competencia).forEach((d) => {
    const a = acumular(mapa, "5929");
    const total = valorBR(d.valor) - valorBR(d.cancelados);
    a.documentos += 1;
    a.contabil += total;
    a.base += valorBR(d.baseIcms) || total;
    a.icms += valorBR(d.icms);
  });

  doPeriodo(loadDocs("servicos-prestados"), empresaId, competencia).forEach((d) => {
    const a = acumular(mapa, "5933");
    a.documentos += 1;
    a.contabil += valorBR(d.valor);
    a.isentas += valorBR(d.valor);
  });

  return finalizarLivro(mapa, empresaId, competencia, "LVS");
}

function finalizarLivro(
  mapa: Map<string, Acumulado>,
  empresaId: string,
  competencia: string,
  prefixo: string,
): EscLinha[] {
  return [...mapa.values()]
    .sort((a, b) => a.cfop.localeCompare(b.cfop))
    .map((a) => ({
      id: novoEscId(prefixo),
      empresaId,
      competencia,
      cfop: a.cfop,
      descricao: descricaoCfop(a.cfop),
      documentos: String(a.documentos),
      contabil: moedaBR(a.contabil),
      base: moedaBR(a.base),
      icms: moedaBR(a.icms),
      ipi: moedaBR(a.ipi),
      isentas: moedaBR(a.isentas),
      outras: moedaBR(a.outras),
      origem: "Documentos fiscais",
    }));
}

/** Soma de uma coluna monetária de um conjunto de linhas. */
export function somar(linhas: EscLinha[], key: string) {
  return linhas.reduce((s, l) => s + valorBR(l[key]), 0);
}

/** Crédito de ICMS do ativo (CIAP) apropriado na competência. */
export function creditoCiapDoMes(empresaId: string, competencia: string) {
  return somar(linhasDoPeriodo("ciap", empresaId, competencia), "mes");
}

/** Gera as linhas da apuração de ICMS a partir dos livros da competência. */
export function gerarApuracaoIcms(empresaId: string, competencia: string): EscLinha[] {
  const entradas = linhasDoPeriodo("livro-entradas", empresaId, competencia);
  const saidas = linhasDoPeriodo("livro-saidas", empresaId, competencia);

  const debito = somar(saidas, "icms");
  const credito = somar(entradas, "icms");
  const ciap = creditoCiapDoMes(empresaId, competencia);
  const baseSaidas = somar(saidas, "base");
  const baseEntradas = somar(entradas, "base");
  const saldoAnterior = saldoCredorAnterior(empresaId, competencia);

  const proprio = debito - credito - ciap - saldoAnterior;

  const st = somar(
    saidas.filter((l) => l.cfop === "5405" || l.cfop === "6404"),
    "outras",
  ) * 0.18;

  const difal = somar(
    saidas.filter((l) => l.cfop === "6108" || l.cfop === "6102"),
    "base",
  ) * 0.06;

  return [
    {
      id: novoEscId("APU"), empresaId, competencia,
      tributo: "ICMS próprio",
      base: moedaBR(baseSaidas),
      debito: moedaBR(debito),
      credito: moedaBR(credito + ciap + saldoAnterior),
      apagar: moedaBR(Math.max(proprio, 0)),
      saldoCredor: moedaBR(Math.max(-proprio, 0)),
      status: proprio > 0 ? "A recolher" : "Saldo credor",
      memoria: `Débitos das saídas (R$ ${moedaBR(debito)}) − créditos das entradas (R$ ${moedaBR(credito)}) − CIAP (R$ ${moedaBR(ciap)}) − saldo credor anterior (R$ ${moedaBR(saldoAnterior)}). Base de entradas: R$ ${moedaBR(baseEntradas)}.`,
    },
    {
      id: novoEscId("APU"), empresaId, competencia,
      tributo: "ICMS-ST",
      base: moedaBR(somar(saidas.filter((l) => l.cfop === "5405" || l.cfop === "6404"), "outras")),
      debito: moedaBR(st),
      credito: moedaBR(0),
      apagar: moedaBR(st),
      saldoCredor: moedaBR(0),
      status: st > 0 ? "A recolher" : "Sem movimento",
      memoria: "Operações com substituição tributária (CFOP 5405/6404) — retenção estimada de 18% sobre o valor das saídas sem débito próprio.",
    },
    {
      id: novoEscId("APU"), empresaId, competencia,
      tributo: "DIFAL",
      base: moedaBR(somar(saidas.filter((l) => l.cfop === "6108" || l.cfop === "6102"), "base")),
      debito: moedaBR(difal),
      credito: moedaBR(0),
      apagar: moedaBR(difal),
      saldoCredor: moedaBR(0),
      status: difal > 0 ? "Em conferência" : "Sem movimento",
      memoria: "Diferencial de alíquota das vendas interestaduais a consumidor final — diferença estimada de 6 pontos entre a alíquota interna do destino e a interestadual.",
    },
  ];
}

/** Gera a apuração de IPI a partir da coluna de IPI dos livros. */
export function gerarApuracaoIpi(empresaId: string, competencia: string): EscLinha[] {
  const entradas = linhasDoPeriodo("livro-entradas", empresaId, competencia);
  const saidas = linhasDoPeriodo("livro-saidas", empresaId, competencia);
  const debito = somar(saidas, "ipi");
  const credito = somar(entradas, "ipi");
  const saldo = debito - credito;

  return [
    {
      id: novoEscId("IPI"), empresaId, competencia,
      tributo: "IPI — saídas",
      base: moedaBR(somar(saidas, "contabil")),
      debito: moedaBR(debito),
      credito: moedaBR(0),
      apagar: moedaBR(debito),
      saldoCredor: moedaBR(0),
      status: debito > 0 ? "Apurado" : "Sem movimento",
      memoria: "Soma do IPI destacado nas saídas do livro de saídas da competência.",
    },
    {
      id: novoEscId("IPI"), empresaId, competencia,
      tributo: "IPI — entradas",
      base: moedaBR(somar(entradas, "contabil")),
      debito: moedaBR(0),
      credito: moedaBR(credito),
      apagar: moedaBR(0),
      saldoCredor: moedaBR(0),
      status: credito > 0 ? "Apurado" : "Sem movimento",
      memoria: "Crédito de IPI das entradas de insumos e mercadorias industrializadas.",
    },
    {
      id: novoEscId("IPI"), empresaId, competencia,
      tributo: "Saldo do período",
      base: moedaBR(0),
      debito: moedaBR(Math.max(saldo, 0)),
      credito: moedaBR(Math.max(-saldo, 0)),
      apagar: moedaBR(Math.max(saldo, 0)),
      saldoCredor: moedaBR(Math.max(-saldo, 0)),
      status: saldo > 0 ? "A recolher" : "Saldo credor",
      memoria: `Débitos (R$ ${moedaBR(debito)}) − créditos (R$ ${moedaBR(credito)}). Saldo credor é transportado para a competência seguinte.`,
    },
  ];
}

/** "2026-07" → "2026-06" */
export function competenciaAnterior(competencia: string) {
  const [y, m] = competencia.split("-").map(Number);
  const d = new Date(y, (m || 1) - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Saldo credor de ICMS transportado da competência anterior. */
export function saldoCredorAnterior(empresaId: string, competencia: string) {
  const anterior = linhasDoPeriodo("apuracao-icms", empresaId, competenciaAnterior(competencia));
  return somar(anterior.filter((l) => l.tributo === "ICMS próprio"), "saldoCredor");
}

/** Documentos da competência que ainda não estão escriturados. */
export function documentosPendentes(empresaId: string, competencia: string) {
  const slugs = ["entradas", "saidas", "servicos-tomados", "servicos-prestados", "transporte", "cupons"] as const;
  return slugs.reduce((total, slug) => {
    const docs = loadDocs(slug).filter(
      (d) => d.empresaId === empresaId && d.competencia === competencia,
    );
    return total + docs.filter((d) => /pendente|digita|divergente/i.test(d.status ?? "")).length;
  }, 0);
}
