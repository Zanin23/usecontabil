// Motor da DRE (Demonstração do Resultado do Exercício).
// A DRE é derivada — não há digitação de saldos: as linhas vêm dos documentos
// fiscais (receita e tributos sobre vendas), da carteira de contas a pagar
// (custos e despesas), do patrimônio (depreciação) e das baixas financeiras
// (juros/multas). Ajustes manuais de encerramento são persistidos localmente.

import { useEffect, useState } from "react";
import {
  documentosDaCompetencia,
  empresaDB,
  type DocumentoFiscal,
} from "@/lib/tributarioStore";
import { baixas, titulos } from "@/lib/contasCaixaStore";
import { resumoPatrimonio } from "@/lib/patrimonioStore";

export const DRE_EVENT = "usecontabil:dre-changed";

const KEY_AJUSTES = "usecontabil.dre.ajustes.v1";

export const brl = (v: number) =>
  (v < 0 ? "-R$ " : "R$ ") +
  Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const pctFmt = (v: number) =>
  `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

const round = (v: number) => Math.round(v * 100) / 100;

/* ============================ ajustes manuais ============================= */

export type AjusteDRE = {
  id: string;
  empresaId: string;
  competencia: string;
  linha: LinhaChave;
  historico: string;
  valor: number;
  usuario: string;
  criadoEm: string;
};

function readAjustes(): AjusteDRE[] {
  try {
    const raw = localStorage.getItem(KEY_AJUSTES);
    return raw ? (JSON.parse(raw) as AjusteDRE[]) : [];
  } catch {
    return [];
  }
}

function writeAjustes(lista: AjusteDRE[]) {
  localStorage.setItem(KEY_AJUSTES, JSON.stringify(lista));
  window.dispatchEvent(new Event(DRE_EVENT));
}

export function ajustes(empresaId: string, competencia: string | string[]) {
  const comps = Array.isArray(competencia) ? competencia : [competencia];
  return readAjustes().filter((a) => a.empresaId === empresaId && comps.includes(a.competencia));
}

export function salvarAjuste(a: Omit<AjusteDRE, "id" | "usuario" | "criadoEm"> & { id?: string }) {
  const lista = readAjustes();
  const usuario = localStorage.getItem("usecontabil.usuario") || "Usuário interno";
  if (a.id) {
    const idx = lista.findIndex((x) => x.id === a.id);
    if (idx >= 0) lista[idx] = { ...lista[idx], ...a, id: a.id };
  } else {
    lista.push({
      ...a,
      id: `DRE-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      usuario,
      criadoEm: new Date().toISOString(),
    });
  }
  writeAjustes(lista);
}

export function removerAjuste(id: string) {
  writeAjustes(readAjustes().filter((a) => a.id !== id));
}

/* ============================== estrutura ================================= */

export type LinhaChave =
  | "receitaMercadorias"
  | "receitaServicos"
  | "outrasReceitas"
  | "devolucoes"
  | "tributosVendas"
  | "cmv"
  | "csp"
  | "despesasAdministrativas"
  | "despesasComerciais"
  | "despesasTributarias"
  | "outrasDespesas"
  | "depreciacao"
  | "receitasFinanceiras"
  | "despesasFinanceiras"
  | "irpjCsll";

export const LINHAS_AJUSTAVEIS: { chave: LinhaChave; rotulo: string }[] = [
  { chave: "receitaMercadorias", rotulo: "Receita de mercadorias" },
  { chave: "receitaServicos", rotulo: "Receita de serviços" },
  { chave: "outrasReceitas", rotulo: "Outras receitas operacionais" },
  { chave: "devolucoes", rotulo: "Devoluções e cancelamentos" },
  { chave: "tributosVendas", rotulo: "Tributos sobre vendas" },
  { chave: "cmv", rotulo: "CMV — custo das mercadorias vendidas" },
  { chave: "csp", rotulo: "CSP — custo dos serviços prestados" },
  { chave: "despesasAdministrativas", rotulo: "Despesas administrativas" },
  { chave: "despesasComerciais", rotulo: "Despesas comerciais" },
  { chave: "despesasTributarias", rotulo: "Despesas tributárias" },
  { chave: "outrasDespesas", rotulo: "Outras despesas operacionais" },
  { chave: "depreciacao", rotulo: "Depreciação e amortização" },
  { chave: "receitasFinanceiras", rotulo: "Receitas financeiras" },
  { chave: "despesasFinanceiras", rotulo: "Despesas financeiras" },
  { chave: "irpjCsll", rotulo: "IRPJ e CSLL" },
];

export type TipoLinha = "receita" | "deducao" | "custo" | "despesa" | "subtotal" | "resultado";

export type LinhaDRE = {
  chave: string;
  rotulo: string;
  tipo: TipoLinha;
  nivel: 0 | 1;
  valor: number;
  /** Análise vertical: % sobre a receita operacional bruta. */
  av: number;
  /** Análise horizontal: variação % contra a competência anterior. */
  ah: number | null;
  anterior: number;
  origem: string;
  ajuste: number;
};

export type DRE = {
  competencia: string;
  linhas: LinhaDRE[];
  receitaBruta: number;
  receitaLiquida: number;
  lucroBruto: number;
  ebitda: number;
  ebit: number;
  lair: number;
  lucroLiquido: number;
  margemBruta: number;
  margemEbitda: number;
  margemLiquida: number;
};

const CUSTO_CATEGORIAS = ["Fornecedores", "Frete e logística"];
const ADMIN_CATEGORIAS = ["Utilidades", "Aluguéis"];
const COMERCIAL_CATEGORIAS = ["Serviços de terceiros"];
const TRIBUTARIA_CATEGORIAS = ["Impostos e taxas"];

const TRIBUTOS_SOBRE_VENDAS = ["ICMS", "ICMS-ST", "PIS", "COFINS", "ISS", "IPI", "DIFAL", "FCP", "FCP-ST"];

export function competenciaAnterior(competencia: string) {
  const [ano, mes] = competencia.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function tributosSobreVendas(docs: DocumentoFiscal[]) {
  return round(
    docs
      .filter((d) => d.status === "Autorizado")
      .reduce(
        (s, d) =>
          s + d.memoria.filter((m) => TRIBUTOS_SOBRE_VENDAS.includes(m.tributo)).reduce((x, m) => x + m.valor, 0),
        0,
      ),
  );
}

type Base = {
  receitaMercadorias: number;
  receitaServicos: number;
  outrasReceitas: number;
  devolucoes: number;
  tributosVendas: number;
  cmv: number;
  csp: number;
  despesasAdministrativas: number;
  despesasComerciais: number;
  despesasTributarias: number;
  outrasDespesas: number;
  depreciacao: number;
  receitasFinanceiras: number;
  despesasFinanceiras: number;
  irpjCsll: number;
};

function baseCompetencia(empresaId: string, competencia: string | string[]): Base {
  const docs = documentosDaCompetencia(empresaId, competencia);
  const autorizados = docs.filter((d) => d.status === "Autorizado");

  const receitaServicos = round(
    autorizados.filter((d) => d.grupo === "servicos").reduce((s, d) => s + d.valorTotal, 0),
  );
  const receitaMercadorias = round(
    autorizados.filter((d) => d.grupo === "faturamento").reduce((s, d) => s + d.valorTotal, 0),
  );
  const outrasReceitas = round(
    autorizados.filter((d) => d.grupo === "demais").reduce((s, d) => s + d.valorTotal, 0),
  );
  const devolucoes = round(
    docs.filter((d) => d.status === "Cancelado").reduce((s, d) => s + d.valorTotal, 0),
  );

  const pagar = titulos("pagar", empresaId || "geral", competencia);
  const somaCat = (cats: string[]) =>
    round(pagar.filter((t) => cats.includes(t.categoria)).reduce((s, t) => s + t.valor, 0));

  const todasBaixas = baixas();
  const idsPagar = new Set(pagar.map((t) => t.id));
  const receber = titulos("receber", empresaId || "geral", competencia);
  const idsReceber = new Set(receber.map((t) => t.id));

  const despesasFinanceiras = round(
    todasBaixas
      .filter((b) => idsPagar.has(b.tituloId))
      .reduce((s, b) => s + b.juros + b.multa, 0),
  );
  const receitasFinanceiras = round(
    todasBaixas
      .filter((b) => idsReceber.has(b.tituloId))
      .reduce((s, b) => s + b.juros + b.multa, 0),
  );

  const depreciacao = round(resumoPatrimonio(competencia).despesaCompetencia);

  const irpjCsll = round(
    autorizados.reduce(
      (s, d) =>
        s +
        d.memoria
          .filter((m) => m.tributo === "IRPJ" || m.tributo === "CSLL")
          .reduce((x, m) => x + m.valor, 0),
      0,
    ),
  );

  return {
    receitaMercadorias,
    receitaServicos,
    outrasReceitas,
    devolucoes,
    tributosVendas: tributosSobreVendas(docs),
    cmv: somaCat(CUSTO_CATEGORIAS),
    csp: 0,
    despesasAdministrativas: somaCat(ADMIN_CATEGORIAS),
    despesasComerciais: somaCat(COMERCIAL_CATEGORIAS),
    despesasTributarias: somaCat(TRIBUTARIA_CATEGORIAS),
    outrasDespesas: 0,
    depreciacao,
    receitasFinanceiras,
    despesasFinanceiras,
    irpjCsll,
  };
}

function aplicarAjustes(base: Base, lista: AjusteDRE[]): Base {
  const out = { ...base };
  lista.forEach((a) => {
    if (a.linha in out) out[a.linha] = round(out[a.linha] + a.valor);
  });
  return out;
}

function totalAjuste(lista: AjusteDRE[], linha: LinhaChave) {
  return round(lista.filter((a) => a.linha === linha).reduce((s, a) => s + a.valor, 0));
}

/** Monta a DRE gerencial da competência, com comparativo do mês anterior. */
export function montarDRE(empresaId: string, competencia: string | string[]): DRE {
  const listaAjustes = ajustes(empresaId, competencia);
  const compUnica = Array.isArray(competencia) ? competencia[competencia.length - 1] : competencia;
  const anteriorComp = competenciaAnterior(compUnica);

  const b = aplicarAjustes(baseCompetencia(empresaId, competencia), listaAjustes);
  const p = aplicarAjustes(
    baseCompetencia(empresaId, anteriorComp),
    ajustes(empresaId, anteriorComp),
  );

  const calc = (x: Base) => {
    const receitaBruta = round(x.receitaMercadorias + x.receitaServicos + x.outrasReceitas);
    const deducoes = round(x.devolucoes + x.tributosVendas);
    const receitaLiquida = round(receitaBruta - deducoes);
    const custos = round(x.cmv + x.csp);
    const lucroBruto = round(receitaLiquida - custos);
    const despesas = round(
      x.despesasAdministrativas + x.despesasComerciais + x.despesasTributarias + x.outrasDespesas,
    );
    const ebitda = round(lucroBruto - despesas);
    const ebit = round(ebitda - x.depreciacao);
    const resultadoFinanceiro = round(x.receitasFinanceiras - x.despesasFinanceiras);
    const lair = round(ebit + resultadoFinanceiro);
    const lucroLiquido = round(lair - x.irpjCsll);
    return {
      receitaBruta, deducoes, receitaLiquida, custos, lucroBruto,
      despesas, ebitda, ebit, resultadoFinanceiro, lair, lucroLiquido,
    };
  };

  const c = calc(b);
  const cp = calc(p);

  const av = (v: number) => (c.receitaBruta > 0 ? round((v / c.receitaBruta) * 100) : 0);
  const ah = (atual: number, ant: number) =>
    ant === 0 ? (atual === 0 ? 0 : null) : round(((atual - ant) / Math.abs(ant)) * 100);

  const L = (
    chave: string,
    rotulo: string,
    tipo: TipoLinha,
    nivel: 0 | 1,
    valor: number,
    anterior: number,
    origem: string,
    ajuste = 0,
  ): LinhaDRE => ({
    chave, rotulo, tipo, nivel, valor, anterior, origem, ajuste,
    av: av(valor),
    ah: ah(valor, anterior),
  });

  const aj = (k: LinhaChave) => totalAjuste(listaAjustes, k);

  const linhas: LinhaDRE[] = [
    L("receitaBruta", "Receita operacional bruta", "subtotal", 0, c.receitaBruta, cp.receitaBruta, "Documentos autorizados"),
    L("receitaMercadorias", "Venda de mercadorias e produtos", "receita", 1, b.receitaMercadorias, p.receitaMercadorias, "Movimentos › Faturamento", aj("receitaMercadorias")),
    L("receitaServicos", "Prestação de serviços", "receita", 1, b.receitaServicos, p.receitaServicos, "Movimentos › Serviços", aj("receitaServicos")),
    L("outrasReceitas", "Outras receitas operacionais", "receita", 1, b.outrasReceitas, p.outrasReceitas, "Movimentos › Demais documentos", aj("outrasReceitas")),

    L("deducoes", "(-) Deduções da receita bruta", "subtotal", 0, -c.deducoes, -cp.deducoes, "Tributos e cancelamentos"),
    L("devolucoes", "Devoluções e cancelamentos", "deducao", 1, -b.devolucoes, -p.devolucoes, "Documentos cancelados", aj("devolucoes")),
    L("tributosVendas", "Tributos sobre vendas (ICMS, IPI, ISS, PIS/COFINS)", "deducao", 1, -b.tributosVendas, -p.tributosVendas, "Memória de cálculo dos documentos", aj("tributosVendas")),

    L("receitaLiquida", "= Receita operacional líquida", "resultado", 0, c.receitaLiquida, cp.receitaLiquida, "Bruta menos deduções"),

    L("custos", "(-) Custos", "subtotal", 0, -c.custos, -cp.custos, "Contas a pagar por categoria"),
    L("cmv", "CMV — custo das mercadorias vendidas", "custo", 1, -b.cmv, -p.cmv, "Fornecedores e frete", aj("cmv")),
    L("csp", "CSP — custo dos serviços prestados", "custo", 1, -b.csp, -p.csp, "Ajuste manual", aj("csp")),

    L("lucroBruto", "= Lucro bruto", "resultado", 0, c.lucroBruto, cp.lucroBruto, "Receita líquida menos custos"),

    L("despesas", "(-) Despesas operacionais", "subtotal", 0, -c.despesas, -cp.despesas, "Contas a pagar por categoria"),
    L("despesasAdministrativas", "Administrativas", "despesa", 1, -b.despesasAdministrativas, -p.despesasAdministrativas, "Utilidades e aluguéis", aj("despesasAdministrativas")),
    L("despesasComerciais", "Comerciais", "despesa", 1, -b.despesasComerciais, -p.despesasComerciais, "Serviços de terceiros", aj("despesasComerciais")),
    L("despesasTributarias", "Tributárias", "despesa", 1, -b.despesasTributarias, -p.despesasTributarias, "Impostos e taxas", aj("despesasTributarias")),
    L("outrasDespesas", "Outras despesas operacionais", "despesa", 1, -b.outrasDespesas, -p.outrasDespesas, "Ajuste manual", aj("outrasDespesas")),

    L("ebitda", "= EBITDA (resultado operacional)", "resultado", 0, c.ebitda, cp.ebitda, "Lucro bruto menos despesas"),

    L("depreciacao", "(-) Depreciação e amortização", "despesa", 0, -b.depreciacao, -p.depreciacao, "Administrativo › Patrimônio", aj("depreciacao")),
    L("ebit", "= EBIT (resultado antes do financeiro)", "resultado", 0, c.ebit, cp.ebit, "EBITDA menos depreciação"),

    L("resultadoFinanceiro", "(+/-) Resultado financeiro", "subtotal", 0, c.resultadoFinanceiro, cp.resultadoFinanceiro, "Baixas de títulos"),
    L("receitasFinanceiras", "Receitas financeiras (juros e multas recebidos)", "receita", 1, b.receitasFinanceiras, p.receitasFinanceiras, "Baixas de contas a receber", aj("receitasFinanceiras")),
    L("despesasFinanceiras", "Despesas financeiras (juros e multas pagos)", "despesa", 1, -b.despesasFinanceiras, -p.despesasFinanceiras, "Baixas de contas a pagar", aj("despesasFinanceiras")),

    L("lair", "= Resultado antes do IRPJ/CSLL", "resultado", 0, c.lair, cp.lair, "EBIT mais resultado financeiro"),
    L("irpjCsll", "(-) IRPJ e CSLL", "despesa", 0, -b.irpjCsll, -p.irpjCsll, "Apurações fiscais", aj("irpjCsll")),
    L("lucroLiquido", "= Lucro líquido do período", "resultado", 0, c.lucroLiquido, cp.lucroLiquido, "Resultado final da competência"),
  ];

  return {
    competencia: Array.isArray(competencia) ? `${competencia[0]}~${competencia[competencia.length - 1]}` : competencia,
    linhas,
    receitaBruta: c.receitaBruta,
    receitaLiquida: c.receitaLiquida,
    lucroBruto: c.lucroBruto,
    ebitda: c.ebitda,
    ebit: c.ebit,
    lair: c.lair,
    lucroLiquido: c.lucroLiquido,
    margemBruta: c.receitaLiquida > 0 ? round((c.lucroBruto / c.receitaLiquida) * 100) : 0,
    margemEbitda: c.receitaLiquida > 0 ? round((c.ebitda / c.receitaLiquida) * 100) : 0,
    margemLiquida: c.receitaLiquida > 0 ? round((c.lucroLiquido / c.receitaLiquida) * 100) : 0,
  };
}

/** Série de resultados das últimas N competências (para o gráfico de evolução). */
export function evolucao(empresaId: string, competencia: string | string[], meses = 6) {
  const compRef = Array.isArray(competencia) ? competencia[competencia.length - 1] : competencia;
  const comps: string[] = [];
  let c = compRef;
  for (let i = 0; i < meses; i += 1) {
    comps.unshift(c);
    c = competenciaAnterior(c);
  }
  return comps.map((comp) => {
    const base = aplicarAjustes(baseCompetencia(empresaId, comp), ajustes(empresaId, comp));
    const receitaBruta = base.receitaMercadorias + base.receitaServicos + base.outrasReceitas;
    const receitaLiquida = receitaBruta - base.devolucoes - base.tributosVendas;
    const lucroBruto = receitaLiquida - base.cmv - base.csp;
    const ebitda =
      lucroBruto -
      (base.despesasAdministrativas + base.despesasComerciais + base.despesasTributarias + base.outrasDespesas);
    const lucroLiquido =
      ebitda - base.depreciacao + base.receitasFinanceiras - base.despesasFinanceiras - base.irpjCsll;
    const [ano, mes] = comp.split("-");
    return {
      competencia: comp,
      rotulo: `${mes}/${ano.slice(2)}`,
      receitaLiquida: round(receitaLiquida),
      ebitda: round(ebitda),
      lucroLiquido: round(lucroLiquido),
    };
  });
}

/** Quantidade de documentos e títulos que sustentam a DRE — usado no rodapé de rastreabilidade. */
export function rastreabilidade(empresaId: string, competencia: string | string[]) {
  const docs = documentosDaCompetencia(empresaId, competencia);
  const pagar = titulos("pagar", empresaId || "geral", competencia);
  return {
    documentos: docs.length,
    autorizados: docs.filter((d) => d.status === "Autorizado").length,
    titulosPagar: pagar.length,
    bens: resumoPatrimonio(competencia).qtdAtivos,
    regras: empresaDB(empresaId).auditoria.length,
  };
}

/* ================================ hook ==================================== */

export function useDRE<T>(fn: () => T, deps: unknown[]): T {
  const [valor, setValor] = useState<T>(fn);
  useEffect(() => {
    const refresh = () => setValor(fn());
    refresh();
    const eventos = [
      DRE_EVENT,
      "usecontabil:tributario-changed",
      "usecontabil:contas-caixa-changed",
      "usecontabil:patrimonio-changed",
      "storage",
    ];
    eventos.forEach((e) => window.addEventListener(e, refresh));
    return () => eventos.forEach((e) => window.removeEventListener(e, refresh));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return valor;
}
