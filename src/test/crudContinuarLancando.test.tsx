/**
 * "Salvar e adicionar outro" nos CRUDs de tabela e de escrituração:
 * o registro é gravado, o diálogo continua aberto e o contexto (anexo, CFOP)
 * se repete — quem lança vários seguidos não reabre o formulário toda vez.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prepararAmbiente } from "./telaFiscal";

vi.mock("@/integrations/supabase/client", async () => (await import("./supabaseFalso")).moduloSupabaseFalso());
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

vi.setConfig({ testTimeout: 30_000 });

beforeEach(() => {
  prepararAmbiente();
  Object.values(toast).forEach((f) => f.mockClear());
});

async function abrir(importar: () => Promise<{ default: React.ComponentType }>) {
  const { EmpresaProvider } = await import("@/lib/empresaAtual");
  const { CompetenciaProvider } = await import("@/lib/competencia");
  const Tela = (await importar()).default;
  return render(
    <MemoryRouter>
      <EmpresaProvider>
        <CompetenciaProvider>
          <Tela />
        </CompetenciaProvider>
      </EmpresaProvider>
    </MemoryRouter>,
  );
}

describe("tabelas de tributação", () => {
  it("adiciona a faixa seguinte mantendo o anexo escolhido", async () => {
    await abrir(() => import("@/pages/contabil/financeiro/TabelaSimplesNacional"));
    fireEvent.click(screen.getAllByRole("button", { name: /Nova faixa/ })[0]);
    const dialogo = await screen.findByRole("dialog");

    fireEvent.change(within(dialogo).getByLabelText(/^Faixa/), { target: { value: "7ª" } });
    fireEvent.change(within(dialogo).getByLabelText(/Receita bruta/), { target: { value: "Até R$ 5.000.000" } });
    fireEvent.change(within(dialogo).getByLabelText(/Alíquota nominal/), { target: { value: "21,50%" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: /Salvar e adicionar outro/ }));

    const { loadLinhas } = await import("@/lib/financeiroStore");
    await waitFor(() => expect(loadLinhas("simples-nacional")).toHaveLength(1));
    expect(loadLinhas("simples-nacional")[0]).toMatchObject({
      anexo: "Anexo I — Comércio",
      faixa: "7ª",
      aliq: "21,50%",
    });

    // Continua aberto, com o anexo repetido e a faixa limpa para o próximo registro.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(within(dialogo).getByLabelText(/^Anexo/)).toHaveTextContent("Anexo I — Comércio");
    expect(within(dialogo).getByLabelText(/^Faixa/)).toHaveValue("");
    expect(within(dialogo).getByLabelText(/Receita bruta/)).toHaveValue("");
  });
});

describe("escrituração", () => {
  it("inclui a linha seguinte mantendo o CFOP", async () => {
    await abrir(() => import("@/pages/contabil/fiscal/escrituracao/LivroEntradas"));
    fireEvent.click(screen.getAllByRole("button", { name: /Nova linha/ })[0]);
    const dialogo = await screen.findByRole("dialog");

    fireEvent.change(within(dialogo).getByLabelText(/Valor contábil/), { target: { value: "1.000,00" } });
    fireEvent.change(within(dialogo).getByLabelText(/Base de ICMS/), { target: { value: "1.000,00" } });
    fireEvent.change(within(dialogo).getByLabelText(/ICMS creditado/), { target: { value: "180,00" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: /Salvar e adicionar outro/ }));

    const { loadLinhas } = await import("@/lib/escrituracaoStore");
    await waitFor(() => expect(loadLinhas("livro-entradas")).toHaveLength(1));
    const linha = loadLinhas("livro-entradas")[0];
    expect(linha).toMatchObject({ cfop: "1102", contabil: "1.000,00", icms: "180,00" });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(within(dialogo).getByLabelText("CFOP")).toHaveTextContent(linha.cfop);
    expect(within(dialogo).getByLabelText(/Valor contábil/)).toHaveValue("");
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringMatching(/formulário aberto para o próximo/),
      expect.anything(),
    );
  });
});
