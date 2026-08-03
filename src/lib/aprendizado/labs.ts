/**
 * Laboratórios do modo prática.
 * Rodam sobre as MESMAS tabelas e funções dos motores de produção
 * (apuracaoStore / tributarioStore) — nenhuma regra fiscal é reimplementada aqui.
 * As entradas são fictícias e ficam apenas na tela; nada é gravado nos stores reais.
 */
import { ANEXO_I, ANEXO_III, ANEXO_V, faixaDe } from "@/lib/apuracaoStore";
import { ALIQ_INTERNA, FCP_PADRAO, UFS, aliquotaInterestadual, type UF } from "@/lib/tributarioStore";

export type LabId = "simples" | "icms-difal" | "pis-cofins" | "retencoes";

export type Passo = { label: string; valor: string; destaque?: boolean };

export const LABS: { id: LabId; titulo: string; descricao: string }[] = [
  {
    id: "simples",
    titulo: "Simples Nacional — alíquota efetiva e Fator R",
    descricao:
      "Mude RBT12, receita e folha e veja a faixa, a parcela a deduzir, a alíquota efetiva e a troca entre Anexo III e V.",
  },
  {
    id: "icms-difal",
    titulo: "ICMS interestadual e DIFAL",
    descricao:
      "Escolha origem, destino e origem do produto para ver a alíquota interestadual, a interna do destino, o DIFAL e o FCP.",
  },
];

const rs = (n: number) =>
  "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pc = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 }) + "%";

/* ----------------------------- Lab Simples ----------------------------- */

export type EntradaSimples = {
  rbt12: number;
  receitaComercio: number;
  receitaServicos: number;
  folha12: number;
};

export function simularSimples(e: EntradaSimples) {
  const fatorR = e.rbt12 > 0 ? e.folha12 / e.rbt12 : 0;
  const anexoServicos = fatorR >= 0.28 ? "III" : "V";
  const tabelaServicos = anexoServicos === "III" ? ANEXO_III : ANEXO_V;

  const efetiva = (tabela: typeof ANEXO_I) => {
    const f = faixaDe(tabela, e.rbt12);
    const alq = e.rbt12 > 0 ? (e.rbt12 * f.aliq - f.deduzir) / e.rbt12 : f.aliq;
    return { faixa: f, efetiva: Math.max(0, alq) };
  };

  const com = efetiva(ANEXO_I);
  const serv = efetiva(tabelaServicos);
  const dasComercio = e.receitaComercio * com.efetiva;
  const dasServicos = e.receitaServicos * serv.efetiva;

  const passos: Passo[] = [
    { label: "RBT12 (receita dos 12 meses anteriores)", valor: rs(e.rbt12) },
    { label: "Folha dos 12 meses", valor: rs(e.folha12) },
    { label: "Fator R = folha ÷ RBT12", valor: pc(fatorR * 100) },
    { label: "Anexo dos serviços (≥ 28% → III)", valor: `Anexo ${anexoServicos}`, destaque: true },
    { label: "Anexo I — faixa até", valor: rs(com.faixa.ate) },
    { label: "Anexo I — alíquota nominal", valor: pc(com.faixa.aliq * 100) },
    { label: "Anexo I — parcela a deduzir", valor: rs(com.faixa.deduzir) },
    { label: "Anexo I — alíquota efetiva", valor: pc(com.efetiva * 100), destaque: true },
    { label: `Anexo ${anexoServicos} — alíquota nominal`, valor: pc(serv.faixa.aliq * 100) },
    { label: `Anexo ${anexoServicos} — parcela a deduzir`, valor: rs(serv.faixa.deduzir) },
    { label: `Anexo ${anexoServicos} — alíquota efetiva`, valor: pc(serv.efetiva * 100), destaque: true },
    { label: "DAS sobre comércio", valor: rs(dasComercio) },
    { label: "DAS sobre serviços", valor: rs(dasServicos) },
    { label: "DAS total simulado", valor: rs(dasComercio + dasServicos), destaque: true },
  ];

  return {
    passos,
    total: dasComercio + dasServicos,
    formula: "efetiva = (RBT12 × alíquota nominal − parcela a deduzir) ÷ RBT12",
    comparativo: {
      anexoIII: (() => {
        const f = faixaDe(ANEXO_III, e.rbt12);
        const alq = e.rbt12 > 0 ? (e.rbt12 * f.aliq - f.deduzir) / e.rbt12 : f.aliq;
        return e.receitaServicos * Math.max(0, alq);
      })(),
      anexoV: (() => {
        const f = faixaDe(ANEXO_V, e.rbt12);
        const alq = e.rbt12 > 0 ? (e.rbt12 * f.aliq - f.deduzir) / e.rbt12 : f.aliq;
        return e.receitaServicos * Math.max(0, alq);
      })(),
    },
  };
}

/* ------------------------------ Lab DIFAL ------------------------------ */

export const UFS_LAB: UF[] = UFS;

export type EntradaDifal = {
  origem: UF;
  destino: UF;
  valor: number;
  origemProduto: string;
  fcp: number;
};

export function simularDifal(e: EntradaDifal) {
  const interestadual = aliquotaInterestadual(e.origem, e.destino, e.origemProduto);
  const interna = ALIQ_INTERNA[e.destino] ?? 18;
  const icmsOrigem = (e.valor * interestadual) / 100;
  const difal = Math.max(0, (e.valor * (interna - interestadual)) / 100);
  const fcp = (e.valor * e.fcp) / 100;

  const passos: Passo[] = [
    { label: "Valor da operação", valor: rs(e.valor) },
    { label: "Alíquota interestadual aplicada", valor: pc(interestadual), destaque: true },
    { label: "Alíquota interna do destino", valor: pc(interna) },
    { label: "ICMS devido à origem", valor: rs(icmsOrigem) },
    { label: "DIFAL devido ao destino", valor: rs(difal), destaque: true },
    { label: `FCP do destino (${pc(e.fcp)})`, valor: rs(fcp) },
    { label: "Total de ICMS na operação", valor: rs(icmsOrigem + difal + fcp), destaque: true },
  ];

  return {
    passos,
    total: icmsOrigem + difal + fcp,
    formula: "DIFAL = valor × (alíquota interna do destino − alíquota interestadual); FCP à parte",
  };
}

export const FCP_SUGERIDO = FCP_PADRAO;

/* --------------------------- Lab PIS/COFINS ---------------------------- */

/** Alíquotas dos regimes — mesmas usadas pelo motor apurarPisCofins. */
export const ALIQ_PIS = { cumulativo: 0.0065, naoCumulativo: 0.0165 };
export const ALIQ_COFINS = { cumulativo: 0.03, naoCumulativo: 0.076 };

export type EntradaPisCofins = {
  regime: "cumulativo" | "naoCumulativo";
  receita: number;
  receitaExportacao: number;
  receitaST: number;
  comprasComCredito: number;
  energiaAlugueis: number;
};

export function simularPisCofins(e: EntradaPisCofins) {
  const naoCum = e.regime === "naoCumulativo";
  const aliqPis = naoCum ? ALIQ_PIS.naoCumulativo : ALIQ_PIS.cumulativo;
  const aliqCofins = naoCum ? ALIQ_COFINS.naoCumulativo : ALIQ_COFINS.cumulativo;

  const exclusoes = e.receitaExportacao + e.receitaST;
  const base = Math.max(0, e.receita - exclusoes);
  const pisDeb = base * aliqPis;
  const cofinsDeb = base * aliqCofins;

  const baseCredito = naoCum ? e.comprasComCredito + e.energiaAlugueis : 0;
  const pisCred = baseCredito * aliqPis;
  const cofinsCred = baseCredito * aliqCofins;

  const pisPagar = Math.max(0, pisDeb - pisCred);
  const cofinsPagar = Math.max(0, cofinsDeb - cofinsCred);

  const passos: Passo[] = [
    { label: "Regime", valor: naoCum ? "Não cumulativo (Lucro Real)" : "Cumulativo (Lucro Presumido)", destaque: true },
    { label: "Receita bruta do mês", valor: rs(e.receita) },
    { label: "(−) Exportação (isenta)", valor: rs(e.receitaExportacao) },
    { label: "(−) Receita com substituição tributária/monofásica", valor: rs(e.receitaST) },
    { label: "Base de cálculo", valor: rs(base), destaque: true },
    { label: `PIS débito (${pc(aliqPis * 100)})`, valor: rs(pisDeb) },
    { label: `COFINS débito (${pc(aliqCofins * 100)})`, valor: rs(cofinsDeb) },
    {
      label: "Base de créditos (insumos, energia, aluguéis)",
      valor: naoCum ? rs(baseCredito) : "Não há crédito no cumulativo",
    },
    { label: "PIS crédito", valor: rs(pisCred) },
    { label: "COFINS crédito", valor: rs(cofinsCred) },
    { label: "PIS a recolher (DARF " + (naoCum ? "6912" : "8109") + ")", valor: rs(pisPagar), destaque: true },
    { label: "COFINS a recolher (DARF " + (naoCum ? "5856" : "2172") + ")", valor: rs(cofinsPagar), destaque: true },
    { label: "Total a recolher", valor: rs(pisPagar + cofinsPagar), destaque: true },
  ];

  return {
    passos,
    total: pisPagar + cofinsPagar,
    formula:
      "Base = receita − exclusões; A pagar = Base × alíquota − créditos (créditos só no não cumulativo)",
    comparativo: {
      cumulativo: base * (ALIQ_PIS.cumulativo + ALIQ_COFINS.cumulativo),
      naoCumulativo: Math.max(
        0,
        base * (ALIQ_PIS.naoCumulativo + ALIQ_COFINS.naoCumulativo) -
          (e.comprasComCredito + e.energiaAlugueis) *
            (ALIQ_PIS.naoCumulativo + ALIQ_COFINS.naoCumulativo),
      ),
    },
  };
}

/* ---------------------------- Lab Retenções ---------------------------- */

/** Alíquotas de retenção — mesmas usadas pelo motor apurarRetencoes. */
export const ALIQ_RETENCAO = { irrf: 0.015, csrf: 0.0465, inss: 0.11 };
/** Dispensa de retenção de IRRF para valor igual ou inferior a R$ 10,00 (Lei 9.430/1996, art. 67). */
export const LIMITE_DISPENSA_IRRF = 10;
/** Dispensa da CSRF quando o valor retido no pagamento for igual ou inferior a R$ 10,00. */
export const LIMITE_DISPENSA_CSRF = 10;

export type EntradaRetencoes = {
  valorServico: number;
  cessaoMaoObra: boolean;
  optanteSimples: boolean;
  issRetido: boolean;
  aliqIss: number;
};

export function simularRetencoes(e: EntradaRetencoes) {
  const v = e.valorServico;
  const irrfBruto = e.optanteSimples ? 0 : v * ALIQ_RETENCAO.irrf;
  const csrfBruto = e.optanteSimples ? 0 : v * ALIQ_RETENCAO.csrf;
  const irrf = irrfBruto <= LIMITE_DISPENSA_IRRF ? 0 : irrfBruto;
  const csrf = csrfBruto <= LIMITE_DISPENSA_CSRF ? 0 : csrfBruto;
  const inss = e.cessaoMaoObra ? v * ALIQ_RETENCAO.inss : 0;
  const iss = e.issRetido ? (v * e.aliqIss) / 100 : 0;
  const total = irrf + csrf + inss + iss;

  const passos: Passo[] = [
    { label: "Valor do serviço tomado", valor: rs(v) },
    { label: "Prestador optante pelo Simples Nacional", valor: e.optanteSimples ? "Sim — dispensa IRRF e CSRF" : "Não" },
    { label: `IRRF (${pc(ALIQ_RETENCAO.irrf * 100)})`, valor: rs(irrf) },
    { label: `CSRF — PIS/COFINS/CSLL (${pc(ALIQ_RETENCAO.csrf * 100)})`, valor: rs(csrf) },
    {
      label: `INSS (${pc(ALIQ_RETENCAO.inss * 100)}) — só com cessão de mão de obra`,
      valor: rs(inss),
    },
    { label: `ISS retido (${pc(e.aliqIss)})`, valor: rs(iss) },
    { label: "Total retido", valor: rs(total), destaque: true },
    { label: "Líquido a pagar ao prestador", valor: rs(v - total), destaque: true },
  ];

  return {
    passos,
    total,
    liquido: v - total,
    formula:
      "Retido = IRRF 1,5% + CSRF 4,65% + INSS 11% (cessão de mão de obra) + ISS municipal; dispensa quando o valor retido ≤ R$ 10,00",
  };
}
