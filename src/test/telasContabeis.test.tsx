/**
 * Telas do cadastro único (Preparativos › Cadastros) e do núcleo contábil (Contábil).
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { abrirTela, EMPRESA, prepararAmbiente } from "./telaFiscal";
import { CNPJ_CLIENTE, gerarNFe } from "./nfeXml";

vi.mock("@/integrations/supabase/client", async () => (await import("./supabaseFalso")).moduloSupabaseFalso());
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

// A primeira renderização carrega o design system inteiro (vários segundos no CI).
vi.setConfig({ testTimeout: 30_000 });

beforeEach(() => {
  prepararAmbiente();
  Object.values(toast).forEach((f) => f.mockClear());
});

const TELAS = {
  PlanoContas: () => import("@/pages/contabil/contabilidade/PlanoContas"),
  Participantes: () => import("@/pages/contabil/preparativos/Participantes"),
  Lancamentos: () => import("@/pages/contabil/contabilidade/Lancamentos"),
  Balancete: () => import("@/pages/contabil/contabilidade/Balancete"),
  Razao: () => import("@/pages/contabil/contabilidade/Razao"),
};

async function abrir(nome: keyof typeof TELAS) {
  const { EmpresaProvider } = await import("@/lib/empresaAtual");
  const { CompetenciaProvider } = await import("@/lib/competencia");
  const Tela = (await TELAS[nome]()).default;
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

async function escolherNoSelect(nome: RegExp | string, opcao: string) {
  const gatilho = screen.getByRole("combobox", { name: nome });
  fireEvent.keyDown(gatilho, { key: "Enter" });
  const item = await screen.findByRole("option", { name: opcao });
  fireEvent.keyDown(item, { key: "Enter" });
  await waitFor(() => expect(screen.getByRole("combobox", { name: nome })).toHaveTextContent(opcao));
}

function escolherNaBusca(nome: string, termo: string) {
  const campo = screen.getByRole("combobox", { name: nome });
  fireEvent.focus(campo);
  fireEvent.change(campo, { target: { value: termo } });
  fireEvent.keyDown(campo, { key: "Enter" });
}

describe("Plano de contas", () => {
  it("começa vazio, carrega o modelo e busca por nome", async () => {
    await abrir("PlanoContas");
    expect(screen.getByText(/O plano de contas está vazio/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Carregar plano modelo \(\d+ contas\)/ }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/conta\(s\) do plano modelo incluída/), expect.anything()));
    expect(await screen.findByText("ATIVO CIRCULANTE")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "Buscar conta" }), { target: { value: "bancos conta" } });
    expect(await screen.findByText("Bancos conta movimento")).toBeInTheDocument();
    expect(screen.queryByText("Caixa geral")).not.toBeInTheDocument();
  });

  it("não deixa excluir conta com subcontas", async () => {
    const { carregarPlanoModelo } = await import("@/lib/planoContasStore");
    carregarPlanoModelo();
    await abrir("PlanoContas");
    fireEvent.click(await screen.findByRole("button", { name: "Excluir conta 1.1" }));
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/subcontas/));
  });
});

describe("Clientes e fornecedores", () => {
  it("mostra os erros no formulário e grava quando corrigido", async () => {
    await abrir("Participantes");
    fireEvent.click(screen.getAllByRole("button", { name: /Novo cadastro/ })[0]);
    const dialogo = await screen.findByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText(/Nome \/ razão social/), { target: { value: "Distribuidora Norte Ltda" } });
    fireEvent.change(within(dialogo).getByLabelText(/^CNPJ/), { target: { value: "11.222.333/0001-80" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar" }));
    const alerta = await within(dialogo).findByRole("alert");
    expect(alerta).toHaveTextContent(/CNPJ inválido/);
    expect(alerta).toHaveTextContent(/Informe a UF/);

    fireEvent.change(within(dialogo).getByLabelText(/^CNPJ/), { target: { value: "11.222.333/0001-81" } });
    fireEvent.mouseDown(within(dialogo).getByRole("tab", { name: "Endereço e contato" }));
    await escolherNoSelect("UF", "SP");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/Distribuidora Norte Ltda cadastrado/)));
    expect(await screen.findByText("11.222.333/0001-81")).toBeInTheDocument();
  });

  it("a importação do XML de uma venda cadastra o cliente e os produtos", async () => {
    const { container } = await abrirTela("NotasSaida");
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const xml = gerarNFe({ itens: [{ desc: "Camiseta básica", cfop: "5102", valor: 1000 }, { desc: "Bermuda", cfop: "5102", valor: 500, ncm: "62034200" }] });
    fireEvent.change(input, { target: { files: [new File([xml], "nota.xml", { type: "text/xml" })] } });
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith(expect.stringMatching(/cliente LOJA DO CLIENTE ME cadastrado · 2 produto\(s\)/), expect.anything()));
    const { listarParticipantes, listarProdutos } = await import("@/lib/cadastrosStore");
    expect(listarParticipantes()).toEqual([expect.objectContaining({ documento: "33.444.555/0001-81", tipo: "Cliente", uf: "BA", origem: "XML de NF-e" })]);
    expect(listarProdutos().map((p) => p.descricao).sort()).toEqual(["Bermuda", "Camiseta básica"]);
    expect(CNPJ_CLIENTE).toBe("33444555000181");
  });
});

describe("Lançamentos contábeis, balancete e razão", () => {
  it("faz um lançamento pela tela e ele aparece no balancete", async () => {
    const { carregarPlanoModelo } = await import("@/lib/planoContasStore");
    carregarPlanoModelo();
    await abrir("Lancamentos");
    fireEvent.click(screen.getAllByRole("button", { name: /Novo lançamento/ })[0]);
    const dialogo = await screen.findByRole("dialog");

    fireEvent.change(within(dialogo).getByLabelText("Data *"), { target: { value: "2026-07-01" } });
    fireEvent.change(within(dialogo).getByLabelText("Histórico *"), { target: { value: "Integralização de capital" } });
    escolherNaBusca("Conta da linha 1", "1.1.01.010");
    fireEvent.change(within(dialogo).getByRole("textbox", { name: "Valor da linha 1" }), { target: { value: "10.000,00" } });
    escolherNaBusca("Conta da linha 2", "2.3.01.001");
    fireEvent.change(within(dialogo).getByRole("textbox", { name: "Valor da linha 2" }), { target: { value: "9.999,99" } });
    expect(within(dialogo).getByText(/Diferença: 0,01/)).toBeInTheDocument();

    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar lançamento" }));
    expect(await within(dialogo).findByRole("alert")).toHaveTextContent(/não batem/);

    // "Equilibrar" cria uma linha com a diferença (a conta dela precisa ser escolhida)…
    fireEvent.click(within(dialogo).getByRole("button", { name: /Equilibrar diferença/ }));
    expect(await within(dialogo).findByRole("textbox", { name: "Valor da linha 3" })).toHaveValue("0,01");
    await waitFor(() => expect(within(dialogo).getByText("Débitos = créditos")).toBeInTheDocument());
    // …mas aqui o certo é corrigir o valor digitado: remove a linha extra e acerta a linha 2.
    fireEvent.click(within(dialogo).getByRole("button", { name: "Remover linha 3" }));
    fireEvent.change(within(dialogo).getByRole("textbox", { name: "Valor da linha 2" }), { target: { value: "10.000,00" } });
    await waitFor(() => expect(within(dialogo).getByText("Débitos = créditos")).toBeInTheDocument());
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar lançamento" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Lançamento nº 1 salvo.", expect.anything()));
    expect(await screen.findByText("Integralização de capital")).toBeInTheDocument();

    const { gerarBalancete } = await import("@/lib/lancamentosStore");
    const bal = gerarBalancete(EMPRESA.id, "2026-07-01", "2026-07-31", { ocultarZeradas: true });
    expect(bal.totais).toMatchObject({ debitos: 10000, creditos: 10000 });
  });

  it("balancete e razão mostram o movimento com débito = crédito", async () => {
    const { carregarPlanoModelo, contaPorCodigo } = await import("@/lib/planoContasStore");
    const { salvarLancamento } = await import("@/lib/lancamentosStore");
    carregarPlanoModelo();
    const id = (c: string) => contaPorCodigo(c)!.id;
    const r = salvarLancamento({
      id: "", empresaId: EMPRESA.id, numero: 0, data: "2026-07-05", tipo: "Normal", historico: "Venda à vista", origem: "Manual",
      partidas: [{ id: "", contaId: id("1.1.01.001"), tipo: "D", valor: 350 }, { id: "", contaId: id("3.1.01.001"), tipo: "C", valor: 350 }],
    });
    expect(r.ok).toBe(true);

    const bal = await abrir("Balancete");
    expect(await screen.findByText("Débitos = créditos no período")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Caixa geral" })).toHaveAttribute("href", `/contabil/relatorios/razao?conta=${id("1.1.01.001")}`);
    bal.unmount();

    await abrir("Razao");
    escolherNaBusca("Conta do razão", "1.1.01.001");
    expect(await screen.findByText("Venda à vista")).toBeInTheDocument();
    expect(screen.getByText("3.1.01.001 Venda de mercadorias")).toBeInTheDocument();
    expect(screen.getAllByText("350,00 D").length).toBeGreaterThan(0);
  });
});
