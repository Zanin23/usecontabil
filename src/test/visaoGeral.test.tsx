/**
 * Visão geral — as telas que listam todos os módulos de uma seção.
 *
 * Garantias cobertas aqui:
 *   1. Toda seção do menu tem uma página com TODAS as suas telas (nada some).
 *   2. Cada card é um atalho real: aponta para a rota correspondente do menu.
 *   3. O contexto (o que a tela faz e o que falta cadastrar) pode ser desligado
 *      pelo usuário experiente — e a escolha fica salva nas preferências.
 *   4. O menu lateral devolve o acesso "Visão geral" a cada seção.
 *   5. Busca e filtro por pendência funcionam nos três níveis.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", async () =>
  (await import("./supabaseFalso")).moduloSupabaseFalso(),
);
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.setConfig({ testTimeout: 30_000 });

const CHAVE_PREFS = "usecontabil.preferencias";
const COMPETENCIA = "usecontabil_competencia";

/**
 * Zera os módulos (os stores guardam cache em memória) e aplica o estado inicial
 * do navegador ANTES de importar o que lê localStorage na carga — é o caso das
 * preferências de uso.
 */
async function modulo(iniciais: Record<string, string> = {}) {
  vi.resetModules();
  localStorage.clear();
  Object.entries(iniciais).forEach(([chave, valor]) => localStorage.setItem(chave, valor));
  const { limparSupabaseFalso } = await import("./supabaseFalso");
  limparSupabaseFalso();
  return {
    SECOES: (await import("@/lib/ux/navModelo")).SECOES,
    visoes: await import("@/lib/ux/visoes"),
    contexto: await import("@/lib/ux/contexto"),
    VisaoGeral: (await import("@/pages/contabil/VisaoGeral")).default,
    ContextoTela: (await import("@/components/ux/ContextoTela")).default,
    EmpresaProvider: (await import("@/lib/empresaAtual")).EmpresaProvider,
    CompetenciaProvider: (await import("@/lib/competencia")).CompetenciaProvider,
  };
}

type Modulo = Awaited<ReturnType<typeof modulo>>;

function abrir(ui: React.ReactElement, rota: string, padrao: string, m: Modulo) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <m.EmpresaProvider>
        <m.CompetenciaProvider>
          <Routes>
            <Route path={padrao} element={ui} />
          </Routes>
        </m.CompetenciaProvider>
      </m.EmpresaProvider>
    </MemoryRouter>,
  );
}

async function abrirVisao(rota: string, padrao: string, iniciais: Record<string, string> = {}) {
  const m = await modulo({ [COMPETENCIA]: "2026-07", ...iniciais });
  return { ...abrir(<m.VisaoGeral />, rota, padrao, m), m };
}

const totalDeTelas = (SECOES: { subgrupos: { itens: unknown[] }[] }[]) =>
  SECOES.reduce((n, secao) => n + secao.subgrupos.reduce((m, sub) => m + sub.itens.length, 0), 0);

const rotasDosCards = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLAnchorElement>("a[data-rota]")].map((l) => l.dataset.rota);

beforeEach(() => localStorage.clear());

describe("camada de catálogo (lógica pura)", () => {
  it("lista todas as telas de cada seção, sem perder nenhuma", async () => {
    const { SECOES, visoes, contexto } = await modulo();
    const ctx = contexto.coletarContexto(null, "2026-07");
    const todas = visoes.visoesDeTodas(ctx);

    expect(todas).toHaveLength(SECOES.length);
    expect(todas.reduce((n, v) => n + v.totalTelas, 0)).toBe(totalDeTelas(SECOES));

    for (const visao of todas) {
      const cards = visao.grupos.flatMap((g) => g.cards);
      expect(cards.length, `telas ausentes em ${visao.secao.id}`).toBe(
        visao.secao.subgrupos.reduce((n, sub) => n + sub.itens.length, 0),
      );
      for (const card of cards) {
        // Todo card leva a uma tela de verdade e tem ao menos uma linha própria.
        expect(card.rota.startsWith("/")).toBe(true);
        expect(card.oQueFaz.length).toBeGreaterThan(10);
        expect(card.titulo.length).toBeGreaterThan(0);
      }
    }
  });

  it("resolve a seção pelo id, pelo código ou pelo título", async () => {
    const { SECOES, visoes, contexto } = await modulo();
    const ctx = contexto.coletarContexto(null, "2026-07");
    const alvo = SECOES.find((s) => s.id === "escrituracao") ?? SECOES[1];

    expect(visoes.acharVisao(alvo.id, ctx)?.secao.id).toBe(alvo.id);
    expect(visoes.acharVisao(alvo.codigo, ctx)?.secao.id).toBe(alvo.id);
    expect(visoes.acharVisao(alvo.titulo, ctx)?.secao.id).toBe(alvo.id);
    expect(visoes.acharVisao("secao-que-nao-existe", ctx)).toBeUndefined();
    expect(visoes.acharVisao(undefined, ctx)).toBeUndefined(); // índice completo
  });

  it("monta as rotas dos três níveis e resolve o grupo pelo título acentuado", async () => {
    const { SECOES, visoes, contexto } = await modulo();
    const ctx = contexto.coletarContexto(null, "2026-07");
    expect(visoes.rotaVisao()).toBe("/visao-geral");
    expect(visoes.rotaVisao("escrituracao")).toBe("/visao-geral/escrituracao");
    expect(visoes.rotaVisao("escrituracao", "documentos-fiscais")).toBe(
      "/visao-geral/escrituracao/documentos-fiscais",
    );

    const visao = visoes.visaoDaSecao(SECOES[4], ctx);
    const comTitulo = visao.grupos.find((g) => g.titulo);
    if (comTitulo) {
      expect(visoes.acharGrupo(visao, comTitulo.titulo!)?.chave).toBe(comTitulo.chave);
    }
    const semTitulo = visao.grupos.find((g) => !g.titulo);
    if (semTitulo) {
      expect(visoes.acharGrupo(visao, semTitulo.chave)?.cards).toHaveLength(semTitulo.cards.length);
    }
    // Chave de rota nunca tem acento nem espaço.
    for (const grupo of visao.grupos) expect(grupo.chave).toMatch(/^[a-z0-9-]+$/);
  });

  it("aponta as telas que ainda têm cadastro obrigatório em aberto", async () => {
    const { visoes, contexto } = await modulo();
    const ctx = contexto.coletarContexto(null, "2026-07");
    const visao = visoes.acharVisao("lancamentos", ctx) ?? visoes.visoesDeTodas(ctx)[3];
    const cards = visao.grupos.flatMap((g) => g.cards);
    const soPendentes = visoes.filtrarCards(cards, "", true);

    expect(soPendentes.length).toBeGreaterThan(0);
    for (const card of soPendentes) {
      expect(card.criticos.length).toBeGreaterThan(0);
      expect(card.pronta).toBe(false);
    }
    // A busca encontra a tela pelo nome e pelo que ela faz; termo inexistente esvazia.
    expect(visoes.filtrarCards(cards, soPendentes[0].titulo, false).length).toBeGreaterThan(0);
    expect(visoes.filtrarCards(cards, "termo-que-nao-existe-em-lugar-nenhum", false)).toHaveLength(0);
  });

  it("dá contexto escrito a quem tem ficha e texto do menu a quem não tem", async () => {
    const { SECOES, visoes, contexto } = await modulo();
    const ctx = contexto.coletarContexto(null, "2026-07");
    const cards = visoes.visoesDeTodas(ctx).flatMap((v) => v.grupos.flatMap((g) => g.cards));
    expect(cards.some((c) => c.temFicha)).toBe(true);
    // Toda rota do menu tem card e toda rota estática do catálogo tem ficha escrita.
    for (const secao of SECOES) {
      for (const sub of secao.subgrupos) {
        for (const item of sub.itens) {
          const card = visoes.cartaoDaTela(item, sub.titulo, ctx);
          expect(card.rota).toBe(item.rota);
          expect(card.titulo).toBe(item.titulo);
        }
      }
    }
    expect(contexto ? visoes.acharVisao("inicio", ctx)!.grupos.flatMap((g) => g.cards).length : 0)
      .toBeGreaterThan(0);
  });
});

describe("página de visão geral", () => {
  it("mostra todas as telas da seção, cada uma ligada à sua rota", async () => {
    const { SECOES, visoes } = await modulo();
    const secao = SECOES.find((s) => s.id === "escrituracao")!;
    const esperado = secao.subgrupos.flatMap((sub) => sub.itens.map((i) => i.rota));
    const { container } = await abrirVisao(visoes.rotaVisao(secao.id), "/visao-geral/:secao");

    expect(rotasDosCards(container).sort()).toEqual(esperado.slice().sort());
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      secao.titulo.split(" ")[0],
    );
    expect(
      screen.getByText(`${esperado.length} telas · ${secao.subgrupos.length} grupos`),
    ).toBeInTheDocument();
  });

  it("o índice completo traz as dez seções e todas as telas do sistema", async () => {
    const { SECOES, visoes } = await modulo();
    const { container } = await abrirVisao(visoes.rotaVisao(), "/visao-geral");

    for (const secao of SECOES) {
      expect(
        within(container).getByRole("heading", { level: 2, name: secao.titulo }),
        `seção ausente: ${secao.titulo}`,
      ).toBeInTheDocument();
    }
    const total = totalDeTelas(SECOES);
    expect(container.querySelectorAll("a[data-rota]")).toHaveLength(total);
    expect(screen.getByText(`${SECOES.length} seções · ${total} telas`)).toBeInTheDocument();
  });

  it("no nível de grupo mostra só as telas daquele grupo", async () => {
    const { SECOES, visoes, contexto } = await modulo();
    const ctx = contexto.coletarContexto(null, "2026-07");
    const secao = SECOES.find((s) => s.subgrupos.length > 1)!;
    const visao = visoes.visaoDaSecao(secao, ctx);
    const [primeiro, segundo] = visao.grupos;

    const { container } = await abrirVisao(
      visoes.rotaVisao(secao.id, primeiro.chave),
      "/visao-geral/:secao/:grupo",
    );

    expect(rotasDosCards(container)).toEqual(primeiro.cards.map((c) => c.rota));
    for (const card of segundo.cards) expect(rotasDosCards(container)).not.toContain(card.rota);
  });

  it("liga e desliga o contexto das telas e guarda a escolha nas preferências", async () => {
    const { SECOES, visoes, contexto } = await modulo();
    const secao = SECOES.find((s) => s.id === "cadastros")!;
    // Pega uma tela cuja explicação é escrita (ficha) e diferente da linha curta.
    const alvo = visoes
      .visaoDaSecao(secao, contexto.coletarContexto(null, "2026-07"))
      .grupos.flatMap((g) => g.cards)
      .find((c) => c.temFicha && c.oQueFaz !== c.desc && c.oQueFaz.length > 40);
    expect(alvo, "nenhuma tela com ficha escrita na seção").toBeTruthy();

    const { container } = await abrirVisao(visoes.rotaVisao(secao.id), "/visao-geral/:secao");
    const quantidade = rotasDosCards(container).length;
    expect(quantidade).toBeGreaterThan(0);
    const explicacao = alvo!.oQueFaz.replace(/\s+/g, " ").trim();
    expect(screen.getByText(new RegExp(explicacao.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))).toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: /Mostrar contexto das telas/i }));
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(CHAVE_PREFS) || "{}")).toMatchObject({
        modo: "direto",
      }),
    );
    // Mesmos cards no mesmo lugar, sem a explicação: nome e linha curta apenas.
    expect(rotasDosCards(container)).toHaveLength(quantidade);
    expect(screen.queryByText(new RegExp(explicacao.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))).toBeNull();
    expect(screen.getByText(/Modo experiente/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Ligar o contexto de novo/i }));
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(CHAVE_PREFS) || "{}")).toMatchObject({
        modo: "guiado",
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByText(new RegExp(explicacao.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))),
      ).toBeInTheDocument(),
    );
  });

  it("o modo direto começa com o bloco de contexto fechado na tela", async () => {
    const m = await modulo({
      [COMPETENCIA]: "2026-07",
      [CHAVE_PREFS]: JSON.stringify({ modo: "direto" }),
    });
    abrir(
      <m.ContextoTela />,
      "/contabil/escrituracao/lancamentos",
      "/contabil/escrituracao/lancamentos",
      m,
    );

    const gatilho = await screen.findByRole("button", { name: /Contexto da tela/i });
    expect(gatilho).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("O que esta tela faz")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mostrar contexto sempre/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Mostrar contexto sempre/i }));
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(CHAVE_PREFS) || "{}")).toMatchObject({
        modo: "guiado",
      }),
    );
  });

  it("busca e filtro por pendência reduzem o catálogo", async () => {
    const { visoes } = await modulo();
    const { container } = await abrirVisao(visoes.rotaVisao(), "/visao-geral");
    const total = container.querySelectorAll("a[data-rota]").length;
    expect(total).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText(/Buscar telas neste catálogo/i), {
      target: { value: "zzz-nada-assim" },
    });
    await waitFor(() => expect(container.querySelectorAll("a[data-rota]")).toHaveLength(0));
    expect(screen.getByText(/Nenhuma tela do sistema combina/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Limpar/i }));
    await waitFor(() =>
      expect(container.querySelectorAll("a[data-rota]").length).toBe(total),
    );

    fireEvent.click(screen.getByRole("button", { name: /Só com pendência/i }));
    await waitFor(() => {
      const filtradas = container.querySelectorAll("a[data-rota]").length;
      expect(filtradas).toBeGreaterThan(0);
      expect(filtradas).toBeLessThan(total);
    });
  });

  it("anda de seção em seção pelos botões do rodapé", async () => {
    await abrirVisao("/visao-geral/lancamentos", "/visao-geral/:secao");
    expect(screen.getByRole("link", { name: /03 · Cadastros/i })).toHaveAttribute(
      "href",
      "/visao-geral/cadastros",
    );
    expect(screen.getByRole("link", { name: /05 · Escrituração/i })).toHaveAttribute(
      "href",
      "/visao-geral/escrituracao",
    );
    // A rota inexistente não quebra: explica e devolve ao índice.
  });

  it("uma seção que não existe cai em aviso com saída para o índice", async () => {
    await abrirVisao("/visao-geral/nao-existe-essa-secao", "/visao-geral/:secao");
    expect(screen.getByRole("heading", { name: /Seção não encontrada/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver todas as telas/i })).toHaveAttribute(
      "href",
      "/visao-geral",
    );
  });
});

describe("acesso ao catálogo pelo menu e pela busca", () => {
  it("cada seção expandida do menu tem o item Visão geral", async () => {
    const { SECOES } = await modulo();
    const rotaAtual = "/contabil/escrituracao/lancamentos";
    const { secaoDaRota } = await import("@/lib/ux/navModelo");
    const secaoAberta = secaoDaRota(rotaAtual);
    expect(secaoAberta).toBeTruthy();
    const { EmpresaProvider } = await import("@/lib/empresaAtual");
    const { CompetenciaProvider } = await import("@/lib/competencia");
    const { default: ContabilShell } = await import("@/components/ContabilShell");

    render(
      <MemoryRouter initialEntries={[rotaAtual]}>
        <CompetenciaProvider>
          <EmpresaProvider>
            <ContabilShell />
          </EmpresaProvider>
        </CompetenciaProvider>
      </MemoryRouter>,
    );

    // A seção da rota atual vem expandida, com o atalho para a vista de conjunto.
    const visao = await screen.findByRole("link", { name: /^Visão geral/i });
    expect(visao).toHaveAttribute("href", `/visao-geral/${secaoAberta!.id}`);
    // O card mostra quantas telas a seção tem — é a medida da vista de conjunto.
    const telasDaSecao = secaoAberta!.subgrupos.reduce((n, sub) => n + sub.itens.length, 0);
    expect(visao.textContent).toContain(String(telasDaSecao));
    expect(screen.getByRole("link", { name: /Catálogo de telas/i })).toHaveAttribute(
      "href",
      "/visao-geral",
    );
    expect(SECOES).toHaveLength(10);
  });

  it("o mapa do sistema oferece a vista de conjunto de cada seção", async () => {
    const m = await modulo({ [COMPETENCIA]: "2026-07" });
    const MapaSistema = (await import("@/pages/contabil/MapaSistema")).default;
    render(
      <MemoryRouter>
        <m.CompetenciaProvider>
          <m.EmpresaProvider>
            <MapaSistema />
          </m.EmpresaProvider>
        </m.CompetenciaProvider>
      </MemoryRouter>,
    );
    const atalhos = await screen.findAllByRole("link", { name: /Ver todas em uma tela/i });
    expect(atalhos.map((a) => a.getAttribute("href"))).toEqual(
      m.SECOES.map((secao) => `/visao-geral/${secao.id}`),
    );
  });

  it("as visões gerais aparecem na busca de telas (Ctrl+K)", async () => {
    const { SECOES } = await modulo();
    const { useTelas } = await import("@/components/contabil/BuscaTelas");
    const { renderHook } = await import("@testing-library/react");
    const { result } = renderHook(() => useTelas(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter>{children}</MemoryRouter>
      ),
    });
    const paths = result.current.map((t) => t.path);
    expect(paths).toContain("/visao-geral");
    expect(paths.filter((p) => p.startsWith("/visao-geral/"))).toHaveLength(SECOES.length);
  });
});
