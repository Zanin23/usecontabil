/**
 * Ações que apagam dados precisam pedir confirmação (achado U1): "Excluir", "Limpar competência"
 * e "Remover" apagavam na hora, sem perguntar e sem desfazer — e os dados só existem no navegador.
 */
import { fireEvent, waitFor, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { abrirTela, docsFiscais, EMPRESA, prepararAmbiente } from "./telaFiscal";

vi.mock("@/integrations/supabase/client", async () => (await import("./supabaseFalso")).moduloSupabaseFalso());
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }));

const doc = (id: string) => ({ id, empresaId: EMPRESA.id, competencia: "2026-07", numero: `NF-e ${id}`, data: "10/07/2026", participante: "Fornecedor", valor: "100,00", status: "Escriturado", cfop: "1102" });

beforeEach(() => {
  prepararAmbiente();
  localStorage.setItem("usecontabil.fiscal.docs.v1", JSON.stringify({ entradas: [doc("A"), doc("B")] }));
});
afterEach(() => vi.restoreAllMocks());

describe("Documentos fiscais › Excluir", () => {
  it("cancelar na confirmação mantém o documento", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    await abrirTela("NotasEntrada");
    const botoes = await screen.findAllByRole("button", { name: /excluir/i });
    fireEvent.click(botoes[0]);
    expect(confirmar).toHaveBeenCalledWith(expect.stringMatching(/Excluir este documento\?/));
    expect(docsFiscais("entradas")).toHaveLength(2);
  });

  it("confirmar remove só aquele documento", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await abrirTela("NotasEntrada");
    const botoes = await screen.findAllByRole("button", { name: /excluir/i });
    fireEvent.click(botoes[0]);
    await waitFor(() => expect(docsFiscais("entradas")).toHaveLength(1));
  });
});

describe("Documentos fiscais › Limpar competência", () => {
  it("cancelar mantém tudo; a pergunta informa quantos documentos serão apagados", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    await abrirTela("NotasEntrada");
    fireEvent.click(await screen.findByRole("button", { name: /limpar competência/i }));
    expect(confirmar).toHaveBeenCalledWith(expect.stringMatching(/Apagar TODOS os documentos de Jul\/2026[\s\S]*2 documento\(s\)/));
    expect(docsFiscais("entradas")).toHaveLength(2);
  });

  it("confirmar apaga os documentos da competência", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await abrirTela("NotasEntrada");
    fireEvent.click(await screen.findByRole("button", { name: /limpar competência/i }));
    await waitFor(() => expect(docsFiscais("entradas")).toHaveLength(0));
  });
});
