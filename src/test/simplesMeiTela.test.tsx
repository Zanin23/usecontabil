import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPRESA, prepararAmbiente } from "./telaFiscal";
import { listarFaturamentosSimplesMei } from "@/lib/simplesMeiStore";

vi.mock("@/integrations/supabase/client", async () => (await import("./supabaseFalso")).moduloSupabaseFalso());
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

const EMPRESA_MEI = {
  ...EMPRESA,
  id: "EMP-MEI",
  razao: "Ateliê Exemplo MEI",
  cnpj: "22.333.444/0001-55",
  regime: "MEI",
};
const EMPRESA_FORA_ESCOPO = {
  ...EMPRESA,
  id: "EMP-REAL",
  razao: "Empresa Lucro Real",
  cnpj: "33.444.555/0001-66",
  regime: "Lucro Real",
};

beforeEach(() => {
  prepararAmbiente();
  localStorage.setItem(
    "usecontabil.empresas.cache.v1",
    JSON.stringify([EMPRESA, EMPRESA_MEI, EMPRESA_FORA_ESCOPO]),
  );
  Object.values(toast).forEach((funcao) => funcao.mockClear());
});

async function abrir(rota: string) {
  const { EmpresaProvider } = await import("@/lib/empresaAtual");
  const { CompetenciaProvider } = await import("@/lib/competencia");
  const SimplesMei = (await import("@/pages/contabil/SimplesMei")).default;
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <EmpresaProvider>
        <CompetenciaProvider>
          <SimplesMei />
        </CompetenciaProvider>
      </EmpresaProvider>
    </MemoryRouter>,
  );
}

describe("tela Simples & MEI", () => {
  it("filtra a carteira para empresas do Simples Nacional e MEI", async () => {
    await abrir("/simples-mei/empresas");

    expect(await screen.findByRole("heading", { name: "Confecções Exemplo Ltda" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ateliê Exemplo MEI" })).toBeInTheDocument();
    expect(screen.queryByText("Empresa Lucro Real")).not.toBeInTheDocument();
  });

  it("registra receita manualmente e reflete na lista", async () => {
    await abrir("/simples-mei/receitas");
    fireEvent.click(await screen.findByRole("button", { name: /Registrar faturamento/ }));
    const dialogo = await screen.findByRole("dialog");

    fireEvent.change(within(dialogo).getByLabelText("Empresa"), { target: { value: "EMP-1" } });
    fireEvent.change(within(dialogo).getByLabelText("Data da receita"), { target: { value: "2026-07-14" } });
    fireEvent.change(within(dialogo).getByLabelText("Atividade"), { target: { value: "Serviços" } });
    fireEvent.change(within(dialogo).getByLabelText("Descrição"), { target: { value: "Venda de outubro" } });
    fireEvent.change(within(dialogo).getByLabelText("Valor bruto (R$)"), { target: { value: "2500.50" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar faturamento" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Faturamento registrado."));
    expect(listarFaturamentosSimplesMei()).toEqual([
      expect.objectContaining({ empresaId: "EMP-1", competencia: "2026-07", descricao: "Venda de outubro", valor: 2500.5 }),
    ]);
    expect(await screen.findByText("Venda de outubro")).toBeInTheDocument();
  });
});
