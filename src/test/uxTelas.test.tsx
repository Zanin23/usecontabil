/**
 * Fumaça das telas que receberam o bloco de orientação.
 *
 * O bloco (`BlocoOrientacao`) é inserido no topo de dezenas de telas — este teste
 * garante que nenhuma delas quebra ao renderizar e que o contexto aparece onde
 * deve. Também protege contra dependência circular entre os componentes de UX.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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
  raw: { cidade: "São Paulo", uf: "SP" },
};

async function preparar() {
  vi.resetModules();
  localStorage.clear();
  const { limparSupabaseFalso } = await import("./supabaseFalso");
  limparSupabaseFalso();
  localStorage.setItem("usecontabil.empresaAtual.v1", EMPRESA.id);
  localStorage.setItem("usecontabil_competencia", "2026-07");
  const { saveEmpresa } = await import("@/lib/empresasStore");
  await saveEmpresa({ ...EMPRESA });
}

/**
 * Monta a tela dentro de uma rota de verdade — várias páginas leem `useParams`
 * (módulo do administrativo, área/categoria/módulo do genérico).
 */
async function abrir(Tela: React.ComponentType, rota: string, padrao = rota) {
  const { EmpresaProvider } = await import("@/lib/empresaAtual");
  const { CompetenciaProvider } = await import("@/lib/competencia");
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <EmpresaProvider>
        <CompetenciaProvider>
          <Routes>
            <Route path={padrao} element={<Tela />} />
          </Routes>
        </CompetenciaProvider>
      </EmpresaProvider>
    </MemoryRouter>,
  );
}

/** Telas que renderizam o bloco de orientação no topo: [nome, rota, padrão, import]. */
type Item = [string, string, string, () => Promise<{ default: React.ComponentType }>];

const TELAS: Item[] = [
  ["contas a pagar", "/administrativo/financeiro-operacional/contas-pagar", "/administrativo/financeiro-operacional/:modulo", () => import("@/pages/contabil/administrativo/ContasCaixa")],
  ["contratos", "/administrativo/contratos/contratos", "/administrativo/contratos/:modulo", () => import("@/pages/contabil/administrativo/ContratosDocumentos")],
  ["patrimônio", "/administrativo/patrimonio/bens", "/administrativo/patrimonio/:modulo", () => import("@/pages/contabil/administrativo/Patrimonio")],
  ["suprimentos", "/administrativo/suprimentos/requisicoes", "/administrativo/suprimentos/:modulo", () => import("@/pages/contabil/administrativo/Suprimentos")],
  ["controles internos", "/administrativo/controles/usuarios", "/administrativo/controles/:modulo", () => import("@/pages/contabil/administrativo/ControlesInternos")],
  ["filiais", "/preparativos/cadastros/filiais", "/preparativos/cadastros/filiais", () => import("@/pages/contabil/Filiais")],
  ["encerramentos", "/preparativos/servicos/encerramentos", "/preparativos/servicos/encerramentos", () => import("@/pages/contabil/Encerramentos")],
  ["gestão do fechamento", "/preparativos/servicos/gestao", "/preparativos/servicos/gestao", () => import("@/pages/contabil/ServicosGestao")],
  ["DRE", "/financeiro/demonstracoes/dre", "/financeiro/demonstracoes/dre", () => import("@/pages/contabil/financeiro/demonstracoes/Dre")],
  ["conciliação", "/financeiro/operacional/conciliacao", "/financeiro/operacional/conciliacao", () => import("@/pages/contabil/financeiro/operacional/ConciliacaoBancaria")],
  ["simples & MEI", "/simples-mei", "/simples-mei", () => import("@/pages/contabil/SimplesMei")],
  ["plano de contas", "/contabil/cadastros/plano-contas", "/contabil/cadastros/plano-contas", () => import("@/pages/contabil/contabilidade/PlanoContas")],
  ["lançamentos", "/contabil/escrituracao/lancamentos", "/contabil/escrituracao/lancamentos", () => import("@/pages/contabil/contabilidade/Lancamentos")],
  ["balancete", "/contabil/relatorios/balancete", "/contabil/relatorios/balancete", () => import("@/pages/contabil/contabilidade/Balancete")],
  ["clientes e fornecedores", "/preparativos/cadastros/participantes", "/preparativos/cadastros/participantes", () => import("@/pages/contabil/preparativos/Participantes")],
  ["notas de entrada", "/fiscal/documentos/entradas", "/fiscal/documentos/entradas", () => import("@/pages/contabil/fiscal/NotasEntrada")],
  ["livro de entradas", "/fiscal/escrituracao/livro-entradas", "/fiscal/escrituracao/livro-entradas", () => import("@/pages/contabil/fiscal/escrituracao/LivroEntradas")],
  ["apurações", "/fiscal/apuracoes", "/fiscal/apuracoes", () => import("@/pages/contabil/fiscal/apuracoes/Hub")],
  ["guias", "/fiscal/guias", "/fiscal/guias", () => import("@/pages/contabil/fiscal/guias/Hub")],
  ["obrigações", "/fiscal/obrigacoes", "/fiscal/obrigacoes", () => import("@/pages/contabil/fiscal/obrigacoes/Hub")],
  ["tabela do simples", "/financeiro/tabelas/simples-nacional", "/financeiro/tabelas/simples-nacional", () => import("@/pages/contabil/financeiro/TabelaSimplesNacional")],
  // Página genérica de módulo: hoje é o fallback de `/:area/:categoria/:modulo`.
  ["módulo genérico", "/administrativo/cadastros/clientes", "/:area/:categoria/:modulo", () => import("@/pages/contabil/ModulePage")],
];

beforeEach(() => {
  vi.useRealTimers();
});

describe("bloco de orientação nas telas", () => {
  it.each(TELAS)("renderiza o contexto em %s sem quebrar", async (_nome, rota, padrao, importar) => {
    await preparar();
    const Tela = (await importar()).default;
    await abrir(Tela, rota, padrao);
    await waitFor(() =>
      expect(screen.getByText("Contexto da tela")).toBeInTheDocument(),
    );
  });

  it("mantém os controles próprios da tela visíveis junto do contexto", async () => {
    await preparar();
    const { default: Lancamentos } = await import("@/pages/contabil/contabilidade/Lancamentos");
    await abrir(Lancamentos, "/contabil/escrituracao/lancamentos");

    // Nada foi escondido: o cabeçalho antigo e as ações continuam na tela.
    expect(screen.getByRole("heading", { name: /Lançamentos contábeis/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Novo lançamento/i })).toBeInTheDocument();
    // E o aviso de dependência aparece porque ainda não há plano de contas.
    expect(
      screen.getByText("Esta funcionalidade ainda não está pronta para uso"),
    ).toBeInTheDocument();
  });
});

describe("preenchimento automático no cadastro de participantes", () => {
  it("traz os dados do CNPJ sem apagar o que o usuário digitou", async () => {
    await preparar();
    const { default: Participantes } = await import("@/pages/contabil/preparativos/Participantes");
    await abrir(Participantes, "/preparativos/cadastros/participantes");

    const { fireEvent, within } = await import("@testing-library/react");
    fireEvent.click(screen.getAllByRole("button", { name: /Novo cadastro/ })[0]);
    const dialogo = await screen.findByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText(/^CNPJ/), {
      target: { value: "11.222.333/0001-81" },
    });

    vi.stubGlobal("fetch", async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        razao_social: "Confecções Exemplo Ltda",
        municipio: "São Paulo",
        uf: "SP",
        cep: "01001000",
        logradouro: "Praça da Sé",
      }),
    }));
    fireEvent.click(within(dialogo).getByRole("button", { name: /Buscar dados/i }));

    await waitFor(() =>
      expect(within(dialogo).getByLabelText(/Nome \/ razão social/)).toHaveValue(
        "Confecções Exemplo Ltda",
      ),
    );
    vi.unstubAllGlobals();
  });
});
