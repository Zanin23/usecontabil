/**
 * Experiência guiada: assistente de configuração, pendências, contexto da tela,
 * bloqueio por dependência e retorno automático ao processo de origem.
 *
 * São as garantias pedidas na revisão de UX: o sistema diz o que falta, onde
 * cadastrar, o que aquilo alimenta e qual é o próximo passo.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", async () =>
  (await import("./supabaseFalso")).moduloSupabaseFalso(),
);
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.setConfig({ testTimeout: 30_000 });

const EMPRESA = {
  id: "EMP-1",
  cnpj: "11.222.333/0001-81",
  razao: "Confecções Exemplo Ltda",
  regime: "Simples Nacional",
  atividade: "Confecção",
  status: "Ativa",
  createdAt: "2026-01-01T00:00:00Z",
  raw: {},
};

/**
 * Cada teste começa do zero. `vi.resetModules()` é essencial: os stores guardam
 * cache em memória, e sem ele o cenário de um teste vazaria para o seguinte.
 */
async function preparar(opcoes: { comFilial?: boolean; comPlano?: boolean } = {}) {
  vi.resetModules();
  localStorage.clear();
  const { limparSupabaseFalso } = await import("./supabaseFalso");
  limparSupabaseFalso();
  localStorage.setItem("usecontabil.empresaAtual.v1", EMPRESA.id);
  localStorage.setItem("usecontabil_competencia", "2026-07");
  const { saveEmpresa } = await import("@/lib/empresasStore");
  await saveEmpresa({ ...EMPRESA });
  if (opcoes.comFilial) {
    const { saveFilial } = await import("@/lib/filiaisStore");
    saveFilial({
      id: "FL-1", nome: "Matriz", tipo: "Matriz", empresaId: EMPRESA.id, cnpj: EMPRESA.cnpj,
      inscEstadual: "", cidade: "São Paulo", uf: "SP", endereco: "", responsavel: "", email: "",
      telefone: "", centroCusto: "", status: "Ativa",
    });
  }
  if (opcoes.comPlano) {
    const { salvarConta } = await import("@/lib/planoContasStore");
    salvarConta({
      id: "", codigo: "1", descricao: "Ativo", tipo: "Sintética", natureza: "Devedora",
      grupo: "Ativo", situacao: "Ativa", exigeCentroCusto: false, origem: "Manual",
    });
    salvarConta({
      id: "", codigo: "1.1", descricao: "Caixa", tipo: "Analítica", natureza: "Devedora",
      grupo: "Ativo", situacao: "Ativa", exigeCentroCusto: false, origem: "Manual",
    });
  }
}

async function abrir(componente: React.ReactNode, rota = "/dashboard") {
  const { EmpresaProvider } = await import("@/lib/empresaAtual");
  const { CompetenciaProvider } = await import("@/lib/competencia");
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <EmpresaProvider>
        <CompetenciaProvider>{componente}</CompetenciaProvider>
      </EmpresaProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.useRealTimers();
});

describe("assistente de configuração inicial", () => {
  it("mostra o checklist na ordem do fluxo e aponta o primeiro passo", async () => {
    await preparar();
    const { default: ConfiguracaoInicial } = await import("@/components/ux/ConfiguracaoInicial");
    await abrir(<ConfiguracaoInicial />);

    expect(screen.getByText("Configuração inicial")).toBeInTheDocument();
    expect(screen.getByText("Continue de onde parou")).toBeInTheDocument();
    // A primeira etapa pendente é a unidade (a empresa já veio com regime definido).
    expect(screen.getAllByText(/Cadastrar matriz e filiais/).length).toBeGreaterThan(0);
    // O botão que resolve está a um clique.
    const botoes = screen.getAllByRole("link", { name: /Cadastrar unidade/i });
    expect(botoes.some((b) => b.getAttribute("href") === "/preparativos/cadastros/filiais")).toBe(
      true,
    );
  });

  it("avança o progresso conforme os cadastros são feitos", async () => {
    await preparar({ comFilial: true, comPlano: true });
    const { default: ConfiguracaoInicial } = await import("@/components/ux/ConfiguracaoInicial");
    await abrir(<ConfiguracaoInicial />);

    // Empresa, regime, unidade e plano de contas já estão prontos.
    await waitFor(() =>
      expect(screen.getByText(/de \d+ etapas essenciais/i).textContent).toMatch(/4 de/),
    );
    expect(screen.getAllByText(/Clientes e fornecedores/i).length).toBeGreaterThan(0);
  });
});

describe("painel de pendências", () => {
  it("lista o que falta com link direto para a tela que resolve", async () => {
    await preparar();
    const { default: PainelPendencias } = await import("@/components/ux/PainelPendencias");
    await abrir(<PainelPendencias />);

    const clientes = screen.getByRole("link", { name: /Clientes e fornecedores/i });
    expect(clientes).toHaveAttribute("href", "/preparativos/cadastros/participantes");
    expect(screen.getByRole("link", { name: /Lançar os documentos fiscais/i })).toHaveAttribute(
      "href",
      "/fiscal/documentos/entradas",
    );
  });
});

describe("contexto da tela", () => {
  it("explica o que a tela faz e o que precisa estar cadastrado antes", async () => {
    await preparar();
    const { default: ContextoTela } = await import("@/components/ux/ContextoTela");
    await abrir(<ContextoTela />, "/contabil/escrituracao/lancamentos");

    expect(screen.getByText("Contexto da tela")).toBeInTheDocument();
    expect(screen.getByText("O que esta tela faz")).toBeInTheDocument();
    expect(
      screen.getByText(/Partidas dobradas por empresa/, { exact: false }),
    ).toBeInTheDocument();
    // Requisito pendente aparece como selo clicável que leva à solução.
    const plano = screen.getByRole("link", { name: /Plano de contas com contas analíticas/i });
    expect(plano).toHaveAttribute("href", "/contabil/cadastros/plano-contas");
    // E o próximo passo do processo fica visível.
    expect(screen.getByRole("link", { name: /Conferir balancete/i })).toHaveAttribute(
      "href",
      "/contabil/relatorios/balancete",
    );
  });

  it("mostra de onde vêm e para onde vão os dados", async () => {
    await preparar();
    const { default: ContextoTela } = await import("@/components/ux/ContextoTela");
    await abrir(<ContextoTela />, "/fiscal/documentos/entradas");

    expect(screen.getByText(/De onde vêm os dados exibidos aqui/i)).toBeInTheDocument();
    expect(screen.getByText(/O que esta tela alimenta/i)).toBeInTheDocument();
    const alimenta = screen.getAllByRole("link", { name: /Livro de entradas/i });
    expect(alimenta.some((l) => l.getAttribute("href") === "/fiscal/escrituracao/livro-entradas")).toBe(
      true,
    );
  });
});

describe("bloqueio por dependência", () => {
  it("avisa o que falta e permite resolver sem procurar a tela", async () => {
    await preparar();
    const { default: BloqueioDependencias } = await import("@/components/ux/BloqueioDependencias");
    await abrir(
      <BloqueioDependencias>
        <div>conteúdo da tela</div>
      </BloqueioDependencias>,
      "/contabil/relatorios/balancete",
    );

    expect(
      screen.getByText("Esta funcionalidade ainda não está pronta para uso"),
    ).toBeInTheDocument();
    const resolver = screen.getByRole("link", { name: /Abrir plano de contas/i });
    // O destino carrega a rota de origem para o retorno automático.
    expect(resolver.getAttribute("href")).toContain("voltar=%2Fcontabil%2Frelatorios%2Fbalancete");
  });

  it("não bloqueia quando todos os requisitos estão atendidos", async () => {
    await preparar();
    const { default: BloqueioDependencias } = await import("@/components/ux/BloqueioDependencias");
    // Cadastro de participantes depende apenas de a empresa existir.
    await abrir(
      <BloqueioDependencias>
        <div>conteúdo da tela</div>
      </BloqueioDependencias>,
      "/preparativos/cadastros/participantes",
    );
    expect(screen.getByText("conteúdo da tela")).toBeInTheDocument();
    expect(
      screen.queryByText("Esta funcionalidade ainda não está pronta para uso"),
    ).not.toBeInTheDocument();
  });

  it("permite seguir em frente de forma explícita quando o usuário decide", async () => {
    await preparar({ comFilial: true, comPlano: true });
    const { default: BloqueioDependencias } = await import("@/components/ux/BloqueioDependencias");
    await abrir(
      <BloqueioDependencias permitirContinuar>
        <div>conteúdo da tela</div>
      </BloqueioDependencias>,
      "/contabil/relatorios/balancete",
    );
    // Sem lançamentos no período a tela avisa, mas não esconde o conteúdo para sempre.
    expect(
      screen.getByText("Esta funcionalidade ainda não está pronta para uso"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Continuar mesmo assim/i }));
    expect(screen.getByText("conteúdo da tela")).toBeInTheDocument();
  });
});

describe("retorno ao processo de origem", () => {
  it("mostra a faixa e devolve o usuário ao processo anterior", async () => {
    await preparar();
    const { default: RetornoProcesso } = await import("@/components/ux/RetornoProcesso");
    await abrir(
      <RetornoProcesso resolvendo="cadastrar o plano de contas" />,
      "/contabil/cadastros/plano-contas?voltar=%2Fcontabil%2Fescrituracao%2Flancamentos",
    );

    expect(screen.getByText(/cadastrar o plano de contas/i)).toBeInTheDocument();
    const voltar = screen.getByRole("button", { name: /Voltar para Lançamentos contábeis/i });
    expect(voltar).toBeInTheDocument();
  });

  it("não aparece quando não há processo de origem", async () => {
    await preparar();
    const { default: RetornoProcesso } = await import("@/components/ux/RetornoProcesso");
    await abrir(<RetornoProcesso />, "/contabil/cadastros/plano-contas");
    expect(screen.queryByRole("button", { name: /Voltar para/i })).not.toBeInTheDocument();
  });
});

describe("mapa do sistema", () => {
  it("mostra as correntes de dependência e o estado de cada tela", async () => {
    await preparar();
    const { default: MapaSistema } = await import("@/pages/contabil/MapaSistema");
    await abrir(<MapaSistema />, "/mapa-sistema");

    expect(screen.getByText("Por onde começar")).toBeInTheDocument();
    expect(screen.getByText("O que depende do quê")).toBeInTheDocument();
    expect(screen.getByText("Cadeia contábil")).toBeInTheDocument();
    expect(screen.getByText("Cadeia fiscal")).toBeInTheDocument();
    expect(screen.getByText("Cadeia financeira")).toBeInTheDocument();

    // Navegação por processo continua acessível a partir do mapa.
    const lancamentos = screen.getAllByRole("link", { name: /Lançamentos contábeis/i })[0];
    expect(lancamentos).toHaveAttribute("href", "/contabil/escrituracao/lancamentos");
  });
});

describe("menu lateral por processo", () => {
  it("mostra as seções na ordem do ciclo e abre a seção da rota atual", async () => {
    await preparar();
    const { default: ContabilShell } = await import("@/components/ContabilShell");
    await abrir(<ContabilShell />, "/contabil/escrituracao/lancamentos");

    // As dez seções do ciclo estão no menu.
    for (const titulo of [
      "Início",
      "Configuração",
      "Cadastros",
      "Lançamentos",
      "Escrituração",
      "Apuração e recolhimento",
      "Conciliação e auditoria",
      "Relatórios",
      "Fechamento",
      "Aprender",
    ]) {
      expect(screen.getAllByText(titulo).length, `seção ausente: ${titulo}`).toBeGreaterThan(0);
    }

    // A seção da rota aberta vem expandida, com os itens do processo e o item ativo.
    const lancamentos = screen.getByRole("link", { name: /^Lançamentos contábeis$/i });
    expect(lancamentos).toHaveAttribute("href", "/contabil/escrituracao/lancamentos");
    expect(screen.getByRole("link", { name: /Notas de entrada/i })).toHaveAttribute(
      "href",
      "/fiscal/documentos/entradas",
    );
    // O cabeçalho indica o caminho dentro do processo (seção + item).
    expect(screen.getAllByText("Lançamentos").length).toBeGreaterThan(0);

    // As demais seções ficam recolhidas: o menu não vira uma lista de dezenas de itens.
    expect(screen.queryByRole("link", { name: /^Plano de contas$/i })).not.toBeInTheDocument();
  });
});
