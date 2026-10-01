/**
 * DRE: origem dos números (correções da análise, seção 6).
 *
 * - nota de entrada (compra) não é receita;
 * - nota cancelada não é devolução: devolução é a nota de devolução por CFOP;
 * - a carteira de títulos do ERP é simulada e só entra no modo prática;
 * - a depreciação é sempre dos bens da empresa selecionada.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reiniciarMemoria } from "./supabaseMemoria";

vi.mock("@/integrations/supabase/client", async () => (await import("./supabaseMemoria")).moduloSupabaseMemoria());

import { __reiniciarNuvemParaTestes } from "@/lib/nuvemColecoes";
import { setPraticaAtiva } from "@/lib/praticaStore";
import { ehNotaDeDevolucao, montarDRE, rastreabilidade } from "@/lib/dreStore";
import { resumoDocumentos, type DocumentoFiscal, type ItemDoc, type Tributos } from "@/lib/tributarioStore";
import { resumoPatrimonio, salvarBem } from "@/lib/patrimonioStore";

const EMP = "EMP-1";
const COMP = "2026-07";

const ZEROS: Tributos = {
  icms: 0, icmsSt: 0, difal: 0, fcp: 0, ipi: 0, pis: 0, cofins: 0, iss: 0, irrf: 0, inss: 0, csll: 0,
  retencoes: 0, total: 0,
};

let sequencia = 0;

function item(cfop?: string): ItemDoc {
  return { id: `item-${++sequencia}`, descricao: "Item", tipo: "produto", quantidade: 1, unitario: 0, cfop };
}

function documento(over: Partial<DocumentoFiscal> & { valorTotal: number }): DocumentoFiscal {
  const { valorTotal, ...resto } = over;
  return {
    id: `doc-${++sequencia}`,
    empresaId: EMP,
    competencia: COMP,
    grupo: "faturamento",
    tipo: "NF-e",
    numero: String(1000 + sequencia),
    serie: "1",
    emissao: "2026-07-10",
    participante: "Cliente Exemplo",
    participanteDoc: "11.222.333/0001-81",
    ufOrigem: "SP",
    ufDestino: "SP",
    contribuinte: true,
    consumidorFinal: false,
    regime: "Lucro Presumido",
    itens: [item()],
    valorProdutos: valorTotal,
    valorTotal,
    status: "Autorizado",
    tributos: { ...ZEROS },
    memoria: [],
    regrasAplicadas: [],
    alertas: [],
    eventos: [],
    ...resto,
  };
}

/** Grava os documentos direto na base da empresa (chave com o sufixo do modo atual). */
function gravarDocumentos(documentos: DocumentoFiscal[], sufixo = "") {
  localStorage.setItem(`usecontabil.tributario.v1${sufixo}`, JSON.stringify({ [EMP]: { documentos } }));
}

const venda = (valor: number) => documento({ valorTotal: valor, itens: [item("5102")] });
const compra = (valor: number) => documento({
  valorTotal: valor, tipo: "Nota de entrada", grupo: "demais", itens: [item("1102")],
});
const devolucao = (valor: number, cfop = "1202") => documento({
  valorTotal: valor, tipo: "Nota de entrada", grupo: "demais", itens: [item(cfop)],
});

beforeEach(() => {
  localStorage.clear();
  setPraticaAtiva(false);
  reiniciarMemoria();
  __reiniciarNuvemParaTestes();
});

describe("Origem das receitas e das deduções", () => {
  it("nota de compra não vira receita nem tributo sobre vendas", () => {
    gravarDocumentos([compra(10_000)]);
    const dre = montarDRE(EMP, COMP);
    expect(dre.receitaBruta).toBe(0);
    expect(dre.receitaLiquida).toBe(0);
    expect(dre.linhas.find((l) => l.chave === "outrasReceitas")?.valor).toBe(0);

    const resumo = resumoDocumentos([compra(10_000)]);
    expect(resumo).toMatchObject({ faturado: 0, tributos: 0, compras: 10_000, autorizados: 1 });
  });

  it("devolução entra pelo CFOP da nota de devolução e nota cancelada não deduz nada", () => {
    const cancelada = { ...venda(7_000), status: "Cancelado" as const };
    gravarDocumentos([venda(5_000), devolucao(1_000), cancelada]);

    const dre = montarDRE(EMP, COMP);
    expect(dre.receitaBruta).toBe(5_000);
    expect(dre.linhas.find((l) => l.chave === "devolucoes")?.valor).toBe(-1_000);
    expect(dre.receitaLiquida).toBe(4_000);

    const rastro = rastreabilidade(EMP, COMP);
    // `autorizados` conta só os documentos de receita; `entradas` traz a nota de devolução.
    expect(rastro).toMatchObject({ documentos: 3, autorizados: 1, entradas: 1 });
  });

  it("só CFOP de devolução deduz: nota de entrada comum e saída com CFOP de venda ficam de fora", () => {
    expect(ehNotaDeDevolucao(devolucao(1_000, "1201"))).toBe(true);
    expect(ehNotaDeDevolucao(devolucao(1_000, "2202"))).toBe(true);
    expect(ehNotaDeDevolucao(devolucao(1_000, "1102"))).toBe(false);
    expect(ehNotaDeDevolucao(venda(1_000))).toBe(false); // saída, não é devolução recebida
    expect(ehNotaDeDevolucao({ ...devolucao(1_000), status: "Cancelado" })).toBe(false);
    // Antes, o regex 1[25]\d{2}|2[25]\d{2} pegava toda nota 12xx/22xx (inclusive compra para revenda).
    expect(ehNotaDeDevolucao(devolucao(1_000, "2101"))).toBe(false);
  });

  it("a carteira simulada do ERP só entra na DRE no modo prática", () => {
    gravarDocumentos([venda(1_000)]);
    const real = montarDRE(EMP, COMP);
    expect(real.linhas.find((l) => l.chave === "cmv")?.valor).toBeCloseTo(0);
    expect(real.linhas.find((l) => l.chave === "despesasAdministrativas")?.valor).toBeCloseTo(0);
    expect(rastreabilidade(EMP, COMP)).toMatchObject({ titulosPagar: 0, dadosSimulados: false });

    setPraticaAtiva(true);
    gravarDocumentos([venda(1_000)], ".pratica");
    const pratica = montarDRE(EMP, COMP);
    expect(pratica.linhas.find((l) => l.chave === "cmv")?.valor).toBeLessThan(0);
    expect(rastreabilidade(EMP, COMP)).toMatchObject({ dadosSimulados: true });
    expect(rastreabilidade(EMP, COMP).titulosPagar).toBeGreaterThan(0);
  });
});

describe("Depreciação por empresa", () => {
  const bem = (patrimonio: string, empresaId?: string, valor = 12_000) =>
    salvarBem({
      patrimonio, descricao: `Bem ${patrimonio}`, empresaId, valorAquisicao: valor, vidaUtilMeses: 12,
      aquisicao: "2026-01-10", inicioOperacao: "2026-01-10",
    });

  it("a DRE de uma empresa não recebe a depreciação de bens de outra (nem dos bens sem empresa)", () => {
    bem("PT-A", "EMP-2");
    bem("PT-B");
    expect(resumoPatrimonio(COMP, EMP).despesaCompetencia).toBe(0);
    expect(montarDRE(EMP, COMP).linhas.find((l) => l.chave === "depreciacao")?.valor).toBeCloseTo(0);
    expect(rastreabilidade(EMP, COMP).bens).toBe(0);

    // R$ 12.000 em 12 meses com 10% de residual: R$ 900 por mês.
    bem("PT-C", EMP, 12_000);
    expect(resumoPatrimonio(COMP, EMP).despesaCompetencia).toBe(900);
    expect(montarDRE(EMP, COMP).linhas.find((l) => l.chave === "depreciacao")?.valor).toBe(-900);
    expect(rastreabilidade(EMP, COMP).bens).toBe(1);
  });
});
