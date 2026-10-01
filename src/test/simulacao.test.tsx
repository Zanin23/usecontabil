/**
 * O que é simulação precisa dizer que é simulação (achados A1, A2, A11, A12, G1, G2):
 *  - cartões de categoria mostravam "N registros" vindos de linhas de exemplo do código;
 *  - Administrativo › Cadastros dizia "Sincronizado de ERP Principal · Protheus" (dados fixos no código);
 *  - "Agendar exportação" dizia "Exportação diária agendada", mas não existe envio automático;
 *  - Obrigações e Guias exibiam arquivos/códigos simulados sem aviso;
 *  - "Carregar demonstração" gravava notas fictícias na empresa real sem perguntar.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMPRESA, prepararAmbiente } from "./telaFiscal";

vi.mock("@/integrations/supabase/client", async () => (await import("./supabaseFalso")).moduloSupabaseFalso());
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

beforeEach(() => { prepararAmbiente(); Object.values(toast).forEach((f) => f.mockClear()); });
afterEach(() => vi.restoreAllMocks());

async function comProvedores(ui: React.ReactElement, rota = "/") {
  const { EmpresaProvider } = await import("@/lib/empresaAtual");
  const { CompetenciaProvider } = await import("@/lib/competencia");
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <EmpresaProvider>
        <CompetenciaProvider>{ui}</CompetenciaProvider>
      </EmpresaProvider>
    </MemoryRouter>,
  );
}

describe("páginas de categoria", () => {
  it("não exibem mais \"N registros\" inventado", async () => {
    const { default: CategoryPage } = await import("@/pages/contabil/CategoryPage");
    await comProvedores(<Routes><Route path="/:area/:categoria" element={<CategoryPage />} /></Routes>, "/fiscal/documentos");
    expect(await screen.findByText(/Notas de entrada/)).toBeInTheDocument(); // a página carregou
    expect(screen.queryByText(/\d+ registros/)).not.toBeInTheDocument(); // antes: "6 registros" em cada cartão
  });
});

describe("Administrativo › Cadastros", () => {
  it("diz que são dados de exemplo e não alega sincronização com ERP", async () => {
    const { default: Dominio } = await import("@/pages/contabil/administrativo/Dominio");
    await comProvedores(<Routes><Route path="/administrativo/cadastros/:dominio" element={<Dominio />} /></Routes>, "/administrativo/cadastros/clientes");
    expect(await screen.findByText(/Dados de exemplo \(simulação\)/)).toBeInTheDocument();
    expect(screen.queryByText(/Sincronizado de/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Protheus/)).not.toBeInTheDocument();
  });
});

describe("Obrigações acessórias", () => {
  it("avisa que arquivos, recibos e transmissões são simulados", async () => {
    const { default: SpedFiscal } = await import("@/pages/contabil/fiscal/obrigacoes/SpedFiscal");
    await comProvedores(<SpedFiscal />);
    const aviso = await screen.findByRole("note");
    expect(aviso).toHaveTextContent(/Simulação interna/);
    expect(aviso).toHaveTextContent(/nenhum arquivo SPED\/EFD\/DCTF real/);
  });
});

describe("Exportar › Agendar", () => {
  it("o agendamento é registrado como simulação, sem prometer envio", async () => {
    const { default: ExportarMenu } = await import("@/components/contabil/ExportarMenu");
    render(<ExportarMenu nome="Clientes" colunas={[{ key: "a", label: "A" }]} linhas={[{ a: "1" }]} />);
    fireEvent.keyDown(screen.getByRole("button", { name: /exportar/i }), { key: "Enter" });
    expect(await screen.findByText(/Agendar automática \(simulado\)/)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("menuitem", { name: /diária/i }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/registrado \(simulação\)/), expect.objectContaining({ description: expect.stringMatching(/nenhuma exportação será enviada/) }));
  });
});

describe("Carregar demonstração", () => {
  const produtos = () => JSON.parse(localStorage.getItem("usecontabil.tributario.v1") ?? "{}")[EMPRESA.id]?.produtos ?? [];

  it("pede confirmação e só grava dados fictícios se a pessoa aceitar", async () => {
    // Antes era a tela Financeiro › Produtos (agora cadastro único em Preparativos); o botão continua no Faturamento.
    const { default: Faturamento } = await import("@/pages/contabil/financeiro/movimentos/Faturamento");
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    await comProvedores(<Faturamento />);
    const botao = await screen.findByRole("button", { name: /carregar demonstração/i });
    fireEvent.click(botao);
    expect(confirmar).toHaveBeenCalledWith(expect.stringMatching(/DEMONSTRAÇÃO[\s\S]*FICTÍCIOS/));
    expect(produtos()).toHaveLength(0); // antes: gravava direto

    confirmar.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: /carregar demonstração/i }));
    await waitFor(() => expect(produtos().length).toBeGreaterThan(0));
  });
});
