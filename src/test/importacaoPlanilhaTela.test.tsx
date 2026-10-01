/**
 * Importação por planilha nas telas: plano de contas (Contábil › Plano de contas) e balancete de
 * abertura (Contábil › Lançamentos), com arquivo .csv escolhido no input de arquivo.
 *
 * A primeira renderização carrega o design system inteiro (vários segundos no CI).
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPRESA, prepararAmbiente } from "./telaFiscal";

vi.mock("@/integrations/supabase/client", async () => (await import("./supabaseFalso")).moduloSupabaseFalso());
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

vi.setConfig({ testTimeout: 30_000 });

beforeEach(() => {
  prepararAmbiente();
  Object.values(toast).forEach((f) => f.mockClear());
});

async function abrir(nome: "PlanoContas" | "Lancamentos") {
  const { EmpresaProvider } = await import("@/lib/empresaAtual");
  const { CompetenciaProvider } = await import("@/lib/competencia");
  const Tela = (await import(`@/pages/contabil/contabilidade/${nome}`)).default;
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

function escolherArquivo(dialogo: HTMLElement, nome: string, conteudo: string) {
  const input = dialogo.querySelector('input[type="file"]') as HTMLInputElement;
  expect(input).toBeTruthy();
  fireEvent.change(input, { target: { files: [new File([conteudo], nome, { type: "text/csv" })] } });
}

describe("Importar plano de contas pela tela", () => {
  it("lê o CSV, mostra a prévia e grava as contas", async () => {
    await abrir("PlanoContas");
    // A tela tem o botão no cabeçalho e no estado vazio: os dois abrem o mesmo diálogo.
    fireEvent.click((await screen.findAllByRole("button", { name: /Importar planilha/ }))[0]);
    const dialogo = await screen.findByRole("dialog");

    escolherArquivo(dialogo, "plano.csv", [
      "Código;Descrição;Tipo;Grupo;Situação",
      "1;ATIVO;Sintética;Ativo;Ativa",
      "1.1;ATIVO CIRCULANTE;Sintética;Ativo;Ativa",
      "1.1.01.001;Caixa geral;Analítica;Ativo;Ativa",
    ].join("\n"));

    expect(await within(dialogo).findByText("Caixa geral")).toBeInTheDocument();
    expect(within(dialogo).getByText("Cabeçalho na linha 1")).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole("button", { name: /Importar 3 conta\(s\)/ }));

    // 3 contas da planilha + 1.1.01, que não veio e entra como sintética.
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/4 conta\(s\) criada\(s\)/), expect.anything()));
    expect(within(dialogo).getByText(/1 conta\(s\) superior\(es\) criada\(s\)/)).toBeInTheDocument();
    const { contaPorCodigo, listarContas } = await import("@/lib/planoContasStore");
    expect(listarContas().map((c) => c.codigo)).toEqual(["1", "1.1", "1.1.01", "1.1.01.001"]);
    expect(contaPorCodigo("1.1.01.001")).toMatchObject({ descricao: "Caixa geral", tipo: "Analítica", origem: "Importação" });
  });

  it("recusa a planilha pela extensão: .xls antigo orienta a salvar como .xlsx ou .csv", async () => {
    await abrir("PlanoContas");
    fireEvent.click((await screen.findAllByRole("button", { name: /Importar planilha/ }))[0]);
    const dialogo = await screen.findByRole("dialog");

    escolherArquivo(dialogo, "plano.xls", "conteúdo binário");

    expect(await within(dialogo).findByText(/não é suportado/i)).toBeInTheDocument();
    const { listarContas } = await import("@/lib/planoContasStore");
    expect(listarContas()).toHaveLength(0);
  });
});

describe("Importar balancete de abertura pela tela", () => {
  it("confere os totais e grava um lançamento do tipo Abertura", async () => {
    const { carregarPlanoModelo } = await import("@/lib/planoContasStore");
    carregarPlanoModelo();
    await abrir("Lancamentos");

    fireEvent.click(await screen.findByRole("button", { name: /Importar abertura/ }));
    const dialogo = await screen.findByRole("dialog");

    escolherArquivo(dialogo, "abertura.csv", [
      "Conta;Débito;Crédito",
      "1.1.01.001;10.000,00;",
      "2.3.01.001;;9.000,00",
    ].join("\n"));

    expect(await within(dialogo).findByText(/Diferença R\$ 1\.000,00/)).toBeInTheDocument();
    expect(within(dialogo).getByRole("button", { name: /Importar lançamento de abertura/ })).toBeDisabled();

    escolherArquivo(dialogo, "abertura.csv", [
      "Conta;Débito;Crédito",
      "1.1.01.001;10.000,00;",
      "2.3.01.001;;10.000,00",
    ].join("\n"));

    expect(await within(dialogo).findByText("Débitos = créditos")).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole("button", { name: /Importar lançamento de abertura/ }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/Lançamento de abertura nº 1 gravado/), expect.anything()));
    const { listarLancamentos } = await import("@/lib/lancamentosStore");
    const [abertura] = listarLancamentos(EMPRESA.id);
    expect(abertura).toMatchObject({ tipo: "Abertura", origem: "Importação", empresaId: EMPRESA.id, numero: 1, data: "2026-07-01" });
    expect(abertura.partidas).toHaveLength(2);
    expect(within(dialogo).getByText(/Lançamento de abertura/)).toBeInTheDocument();
  });
});
