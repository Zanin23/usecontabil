/**
 * Importação de XML nas telas de Documentos fiscais.
 * Achados X1, X3–X7 da validação funcional: o importador aceitava a mesma nota 2×, nota
 * cancelada/denegada como "Autorizada", nota de terceiros, gravava UF "EX" e CFOP de saída
 * em "Notas de entrada" e guardava só o primeiro CFOP.
 */
import { fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { abrirTela, docsFiscais, EMPRESA, prepararAmbiente } from "./telaFiscal";
import { CNPJ_EMPRESA, CNPJ_FORNECEDOR, gerarNFe, type OpcoesNFe } from "./nfeXml";

vi.mock("@/integrations/supabase/client", async () => (await import("./supabaseFalso")).moduloSupabaseFalso());
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

beforeEach(() => {
  // o importador registra no console as recusas esperadas ("XML Import Error"); mantém a saída do teste limpa
  const erroOriginal = console.error.bind(console);
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => { if (!String(args[0]).includes("XML Import Error")) erroOriginal(...args); });
  Object.values(toast).forEach((f) => f.mockClear());
  prepararAmbiente();
});

async function importar(container: HTMLElement, xml: string) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  expect(input).toBeTruthy();
  const antes = toast.success.mock.calls.length + toast.warning.mock.calls.length + toast.error.mock.calls.length;
  fireEvent.change(input, { target: { files: [new File([xml], "nota.xml", { type: "text/xml" })] } });
  await waitFor(() => expect(toast.success.mock.calls.length + toast.warning.mock.calls.length + toast.error.mock.calls.length).toBeGreaterThan(antes));
}

type DocTributario = { ufOrigem: string; ufDestino: string; contribuinte: boolean; valorTotal: number; grupo: string; itens: { ncm?: string; cfop?: string }[] };
const docsTributario = (): DocTributario[] => (JSON.parse(localStorage.getItem("usecontabil.tributario.v1") ?? "{}")[EMPRESA.id]?.documentos ?? []);
const venda = (o: OpcoesNFe = {}) => gerarNFe(o);

describe("Notas de saída", () => {
  it("importa NF-e autorizada da própria empresa (UF de origem/destino vindas do XML, todos os itens)", async () => {
    const { container } = await abrirTela("NotasSaida");
    await importar(container, venda({ itens: [{ desc: "Camiseta", cfop: "5102", valor: 1000 }, { desc: "Calça", cfop: "5102", valor: 500, ncm: "62034200" }] }));
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/importada com sucesso/));
    const [doc] = docsFiscais("saidas");
    expect(doc).toMatchObject({ numero: "5001", status: "Autorizada", cfop: "5102", valor: "1.500,00", participante: "LOJA DO CLIENTE ME" });
    await waitFor(() => expect(docsTributario()).toHaveLength(1));
    const t = docsTributario()[0];
    expect(t).toMatchObject({ ufOrigem: "SP", ufDestino: "BA", contribuinte: true, valorTotal: 1500 }); // antes: ufDestino "EX"
    expect(t.itens).toHaveLength(2); // antes: um item único "Produto(s) da Nota"
    expect(t.itens[1]).toMatchObject({ ncm: "62034200", cfop: "5102" });
  });

  it("a mesma nota importada de novo é ignorada (antes: documento duplicado)", async () => {
    const { container } = await abrirTela("NotasSaida");
    await importar(container, venda());
    await importar(container, venda());
    expect(docsFiscais("saidas")).toHaveLength(1);
    expect(toast.warning).toHaveBeenCalledWith(expect.stringMatching(/já foi importada/), expect.anything());
  });

  it.each([
    ["101", "Cancelada"],
    ["110", "Denegada"],
  ])("NF-e com cStat %s entra como «%s», fora dos totais e sem ir ao motor tributário", async (cStat, status) => {
    const { container } = await abrirTela("NotasSaida");
    await importar(container, venda({ cStat }));
    expect(docsFiscais("saidas")[0]).toMatchObject({ status }); // antes: "Autorizada"
    expect(docsTributario()).toHaveLength(0);
    expect(toast.warning).toHaveBeenCalledWith(expect.stringMatching(/importada com ressalvas/), expect.objectContaining({ description: expect.stringContaining(`cStat ${cStat}`) }));
  });

  it("NF-e de outra empresa é recusada e nada é gravado", async () => {
    const { container } = await abrirTela("NotasSaida");
    await importar(container, venda({ emit: { cnpj: "55666777000181", nome: "OUTRA EMPRESA SA" }, dest: { cnpj: "99000111000165", nome: "TERCEIRO" } }));
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/não é a empresa selecionada/));
    expect(docsFiscais("saidas")).toHaveLength(0);
  });

  it("nota com 2 CFOPs fica com o de maior valor e avisa (antes: só o 1º CFOP)", async () => {
    const { container } = await abrirTela("NotasSaida");
    await importar(container, venda({ itens: [{ desc: "a", cfop: "5102", valor: 1000 }, { desc: "b", cfop: "5405", valor: 3000, cst: "60", pIcms: 0 }] }));
    const [doc] = docsFiscais("saidas");
    expect(doc).toMatchObject({ cfop: "5405", valor: "4.000,00" });
    expect(doc.observacao).toMatch(/CFOPs da nota: 5405.*5102/);
    expect(toast.warning).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ description: expect.stringMatching(/2 CFOPs \(5405, 5102\)/) }));
  });

  it("arquivo que não é NF-e é recusado com mensagem clara", async () => {
    const { container } = await abrirTela("NotasSaida");
    await importar(container, "isto não é um XML");
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/formato inválido/));
    expect(docsFiscais("saidas")).toHaveLength(0);
  });
});

describe("Notas de entrada", () => {
  const compra = (o: OpcoesNFe = {}) => gerarNFe({ emit: { cnpj: CNPJ_FORNECEDOR, nome: "TECIDOS BRASIL LTDA", uf: "SC" }, dest: { cnpj: CNPJ_EMPRESA, nome: "CONFECCOES EXEMPLO LTDA", uf: "SP" }, ...o });

  it("grava o CFOP de ENTRADA (5102 → 1102) e o fornecedor como participante", async () => {
    const { container } = await abrirTela("NotasEntrada");
    await importar(container, compra({ numero: "7001", itens: [{ desc: "Tecido", cfop: "5102", valor: 2500 }] }));
    const [doc] = docsFiscais("entradas");
    expect(doc).toMatchObject({ numero: "7001", status: "Escriturado", cfop: "1102", participante: "TECIDOS BRASIL LTDA", cnpj: CNPJ_FORNECEDOR });
    expect(doc.observacao).toMatch(/CFOP do emitente: 5102/);
    await waitFor(() => expect(docsTributario()).toHaveLength(1));
    expect(docsTributario()[0]).toMatchObject({ ufOrigem: "SC", ufDestino: "SP", grupo: "demais" }); // antes: ufOrigem "EX"
    expect(docsTributario()[0].itens[0].cfop).toBe("1102");
  });

  it("nota em que a empresa não é a destinatária é recusada (ex.: a própria venda)", async () => {
    const { container } = await abrirTela("NotasEntrada");
    await importar(container, venda());
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/destinatário/));
    expect(docsFiscais("entradas")).toHaveLength(0);
  });

  it("NF-e cancelada numa compra não entra como escriturada", async () => {
    const { container } = await abrirTela("NotasEntrada");
    await importar(container, compra({ cStat: "101" }));
    expect(docsFiscais("entradas")[0].status).toBe("Rejeitado");
  });
});
