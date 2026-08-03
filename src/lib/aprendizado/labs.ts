/**
 * Laboratórios do modo prática.
 * Rodam sobre as MESMAS tabelas e funções dos motores de produção
 * (apuracaoStore / tributarioStore) — nenhuma regra fiscal é reimplementada aqui.
 * As entradas são fictícias e ficam apenas na tela; nada é gravado nos stores reais.
 */
import { ANEXO_I, ANEXO_III, ANEXO_V, faixaDe } from "@/lib/apuracaoStore";
import { ALIQ_INTERNA, FCP_PADRAO, UFS, aliquotaInterestadual, type UF } from "@/lib/tributarioStore";

export type LabId = "simples" | "icms-difal";

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
