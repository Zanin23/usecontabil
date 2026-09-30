/**
 * Motor de regras fiscais: NCM/CFOP/CST são atributos de item de produto.
 * Achado N1 da validação funcional: "Emitir e transmitir" numa NFS-e era sempre bloqueado com
 * "Item sem NCM informado" — o serviço não tem NCM/CFOP, mas os itens eram unidos numa string e o
 * campo vazio do serviço contava. Também: a regra de CST "igual 10" só casava se a lista inteira fosse "10".
 */
import { describe, expect, it } from "vitest";
import { aplicarRegras, REGRAS_NATIVAS, type DocumentoFiscal, type ItemDoc } from "@/lib/tributarioStore";

const item = (p: Partial<ItemDoc>): ItemDoc => ({ id: "i", descricao: "x", tipo: "produto", quantidade: 1, unitario: 100, ...p });
const doc = (itens: ItemDoc[], extra: Partial<DocumentoFiscal> = {}) =>
  ({ id: "d", empresaId: "E", competencia: "2026-07", grupo: "faturamento", tipo: "NF-e", numero: "1", serie: "1", emissao: "2026-07-10",
    participante: "P", participanteDoc: "", ufOrigem: "SP", ufDestino: "SP", contribuinte: true, consumidorFinal: false, regime: "Simples Nacional",
    itens, valorProdutos: 100, valorTotal: 100, status: "Rascunho", tributos: {}, memoria: [], regrasAplicadas: [], alertas: [], eventos: [], ...extra }) as unknown as DocumentoFiscal;

const bloqueios = (d: DocumentoFiscal) => aplicarRegras(d, REGRAS_NATIVAS).alertas.filter((a) => a.nivel === "bloqueio").map((a) => a.regra);
const alertas = (d: DocumentoFiscal) => aplicarRegras(d, REGRAS_NATIVAS).alertas.map((a) => a.regra);

describe("regras de NCM e CFOP", () => {
  it("NFS-e (só serviço, sem NCM nem CFOP) NÃO é bloqueada", () => {
    const nfse = doc([item({ tipo: "servico", descricao: "Serviço de costura" })], { tipo: "NFS-e", grupo: "servicos" });
    expect(bloqueios(nfse)).toEqual([]); // antes: bloqueada por NCM e CFOP
  });

  it("produto sem NCM continua bloqueado", () => {
    expect(bloqueios(doc([item({ cfop: "5102", ncm: "" })]))).toContain("NCM obrigatório em produto");
  });

  it("2 itens de produto, 1 sem NCM → bloqueia (comportamento preservado)", () => {
    expect(bloqueios(doc([item({ ncm: "61091000", cfop: "5102" }), item({ ncm: "", cfop: "5102" })]))).toContain("NCM obrigatório em produto");
  });

  it("2 itens de produto, 1 sem CFOP → bloqueia (comportamento preservado)", () => {
    expect(bloqueios(doc([item({ ncm: "61091000", cfop: "5102" }), item({ ncm: "61091000", cfop: "" })]))).toContain("CFOP obrigatório");
  });

  it("todos os itens completos → sem bloqueio", () => {
    expect(bloqueios(doc([item({ ncm: "61091000", cfop: "5102" }), item({ ncm: "62034200", cfop: "5102" })]))).toEqual([]);
  });

  it("nota mista: o serviço não exige NCM, o produto sem NCM exige", () => {
    const mista = doc([item({ tipo: "servico" }), item({ ncm: "", cfop: "5102" })]);
    expect(bloqueios(mista)).toContain("NCM obrigatório em produto");
    expect(bloqueios(doc([item({ tipo: "servico" }), item({ ncm: "61091000", cfop: "5102" })]))).toEqual([]);
  });
});

describe("regra de CST (ICMS-ST)", () => {
  it("dispara quando QUALQUER item tem CST 10 (antes: só se a lista inteira fosse \"10\")", () => {
    const d = doc([item({ ncm: "1", cfop: "5102", cst: "00" }), item({ ncm: "1", cfop: "5102", cst: "10" })]);
    expect(alertas(d)).toContain("Produto com CEST sujeito à substituição tributária");
  });
  it("não dispara sem CST 10", () => {
    expect(alertas(doc([item({ ncm: "1", cfop: "5102", cst: "00" })]))).not.toContain("Produto com CEST sujeito à substituição tributária");
  });
});
