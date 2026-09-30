/**
 * Formulário de empresa (achados B1, EM1 e EM2): sem campo de regime (gravava "A definir"), aceitava
 * CNPJ com dígito verificador inválido e sobrescrevia em silêncio uma empresa já cadastrada com o mesmo CNPJ.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", async () => (await import("./supabaseFalso")).moduloSupabaseFalso());
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

let falso: typeof import("./supabaseFalso");
beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  falso = await import("./supabaseFalso");
  falso.limparSupabaseFalso();
  Object.values(toast).forEach((f) => f.mockClear());
});
afterEach(() => vi.restoreAllMocks());

async function abrir() {
  const { default: EmpresaCadastro } = await import("@/pages/contabil/EmpresaCadastro");
  render(
    <MemoryRouter initialEntries={["/preparativos/cadastros/empresas/novo"]}>
      <Routes>
        <Route path="/preparativos/cadastros/empresas/novo" element={<EmpresaCadastro />} />
        <Route path="/preparativos/cadastros/empresas" element={<div>Lista de empresas</div>} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByPlaceholderText("00.000.000/0000-00");
}

const campo = (rotulo: RegExp) => (screen.getByText(rotulo).closest("div.space-y-1\\.5") as HTMLElement).querySelector("input") as HTMLInputElement;
const preencher = (cnpj: string, razao: string) => {
  fireEvent.change(screen.getByPlaceholderText("00.000.000/0000-00"), { target: { value: cnpj } });
  fireEvent.change(campo(/^Razão Social/), { target: { value: razao } });
};
async function escolherRegime(nome: string) {
  const gatilho = screen.getByRole("combobox", { name: /regime tributário/i });
  fireEvent.keyDown(gatilho, { key: "Enter" });
  const opcao = await screen.findByRole("option", { name: nome });
  fireEvent.keyDown(opcao, { key: "Enter" });
  await waitFor(() => expect(screen.getByRole("combobox", { name: /regime tributário/i })).toHaveTextContent(nome));
}
const salvar = () => fireEvent.click(screen.getByRole("button", { name: /salvar cadastro/i }));
const empresasNoCache = (): { regime: string; razao: string; id: string }[] => JSON.parse(localStorage.getItem("usecontabil.empresas.cache.v1") ?? "[]");

describe("Cadastro de empresa", () => {
  it("o formulário pede o regime tributário, com as 4 opções", async () => {
    await abrir();
    const gatilho = screen.getByRole("combobox", { name: /regime tributário/i });
    fireEvent.keyDown(gatilho, { key: "Enter" });
    const opcoes = (await screen.findAllByRole("option")).map((o) => o.textContent);
    expect(opcoes).toEqual(["Simples Nacional", "Lucro Presumido", "Lucro Real", "MEI"]);
  });

  it("sem regime não salva (antes gravava \"A definir\")", async () => {
    await abrir();
    preencher("11.222.333/0001-81", "Confecções Exemplo Ltda");
    salvar();
    expect(toast.error).toHaveBeenCalledWith("Selecione o regime tributário da empresa");
    expect(empresasNoCache()).toHaveLength(0);
  });

  it("CNPJ com dígito verificador inválido não salva (antes só contava 14 dígitos)", async () => {
    await abrir();
    preencher("11.111.111/1111-11", "Empresa Inválida Ltda");
    await escolherRegime("MEI");
    salvar();
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/CNPJ inválido/));
    expect(empresasNoCache()).toHaveLength(0);
  });

  it("cadastro completo grava o regime escolhido na empresa e na nuvem", async () => {
    await abrir();
    preencher("11.222.333/0001-81", "Confecções Exemplo Ltda");
    await escolherRegime("Simples Nacional");
    salvar();
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/cadastrada/)));
    expect(empresasNoCache()[0]).toMatchObject({ razao: "Confecções Exemplo Ltda", regime: "Simples Nacional" });
    const upsert = falso.chamadasSupabase.find((c) => c.tabela === "empresas" && c.metodo === "upsert");
    expect((upsert?.args[0] as { regime: string }).regime).toBe("Simples Nacional");
    expect(await screen.findByText("Lista de empresas")).toBeInTheDocument();
  });

  it("CNPJ já cadastrado: pergunta antes de atualizar a empresa existente (antes sobrescrevia em silêncio)", async () => {
    localStorage.setItem("usecontabil.empresas.cache.v1", JSON.stringify([{ id: "EMP-1", cnpj: "11.222.333/0001-81", razao: "Razão Original Ltda", regime: "Lucro Real", atividade: "—", status: "Ativa", createdAt: "2026-01-01T00:00:00Z", raw: {} }]));
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    await abrir();
    preencher("11.222.333/0001-81", "Outra Razão Social Ltda");
    await escolherRegime("MEI");
    salvar();
    expect(confirmar).toHaveBeenCalledWith(expect.stringMatching(/Já existe uma empresa com este CNPJ: «Razão Original Ltda»/));
    expect(empresasNoCache()[0].razao).toBe("Razão Original Ltda"); // recusou: nada mudou

    confirmar.mockReturnValue(true);
    salvar();
    await waitFor(() => expect(empresasNoCache()[0].razao).toBe("Outra Razão Social Ltda"));
    expect(empresasNoCache()).toHaveLength(1);
  });
});
