/**
 * VALIDAÇÃO COMPLETA DE ROTAS E TELAS — varredura de navegador simulado.
 *
 * Monta o **App real** (sistema inteiro: shell, providers, rotas, telas) num
 * navegador simulado e percorre todas as telas do sistema, uma a uma, com uma
 * empresa de verdade carregada nos stores. Para cada rota ele confere:
 *
 *   1. a tela monta (não fica em branco nem presa no Suspense);
 *   2. não aparece a página 404 do sistema;
 *   3. não cai no gate de acesso ("Acesso pendente");
 *   4. existe um título (`h1`) — cabeçalho padrão da tela;
 *   5. nenhum erro de JavaScript/React foi lançado durante a renderização;
 *   6. o título da tela corresponde ao item de menu que aponta para ela.
 *
 * Uso:
 *   npm run validar:telas           # roda a varredura
 *   UC_RELATORIO=/tmp/x.json npm run validar:telas   # grava o relatório JSON
 *
 * A varredura é opt-in (`UC_VALIDACAO=1`) para não pesar o `npm test` do dia a
 * dia: são ~150 montagens de página inteira.
 */
import { readFileSync } from "node:fs";
import { writeFileSync } from "node:fs";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AREAS } from "@/lib/contabilNav";
import { SECOES } from "@/lib/ux/navModelo";

vi.mock("@/integrations/supabase/client", async () =>
  (await import("./supabaseFalso")).moduloSupabaseFalso(),
);

const RODAR = process.env.UC_VALIDACAO === "1";
const ARQUIVO_RELATORIO = process.env.UC_RELATORIO ?? "/tmp/uc-validacao-rotas.json";
const ESPERA_TELA = 20_000;

type Situacao = "ok" | "aviso" | "falha";

type Resultado = {
  rota: string;
  esperado: string;
  titulo: string;
  situacao: Situacao;
  ms: number;
  texto: number;
  observacoes: string[];
  erros: string[];
};

const resultados: Resultado[] = [];

/* ------------------------------------------------------------------ */
/* Inventário de rotas                                                  */
/* ------------------------------------------------------------------ */

type Alvo = { rota: string; esperado: string; grupo: string };

function rotasDoMenu(): Alvo[] {
  const alvos: Alvo[] = [];
  for (const secao of SECOES) {
    for (const sub of secao.subgrupos) {
      for (const item of sub.itens) {
        alvos.push({ rota: item.rota, esperado: item.titulo, grupo: `${secao.codigo} ${secao.titulo}` });
      }
    }
  }
  return alvos;
}

function rotasClassicas(): Alvo[] {
  const alvos: Alvo[] = [];
  // O catálogo clássico (áreas/categorias) e o menu atual apontam para as mesmas
  // URLs em vários casos. Validar a mesma rota duas vezes só gera expectativa
  // conflitante de título: quando o menu já cobre a URL, ela fica só no menu.
  const cobertasPeloMenu = new Set(rotasDoMenu().map((a) => a.rota));
  for (const area of AREAS) {
    const rotaArea = `/${area.slug}`;
    if (!cobertasPeloMenu.has(rotaArea)) {
      alvos.push({ rota: rotaArea, esperado: area.title, grupo: "Rotas clássicas" });
    }
    for (const categoria of area.categories) {
      const rota = `/${area.slug}/${categoria.slug}`;
      if (cobertasPeloMenu.has(rota)) continue;
      alvos.push({ rota, esperado: categoria.title, grupo: "Rotas clássicas" });
    }
  }
  return alvos;
}

function rotasEspeciais(): Alvo[] {
  const alvos: Alvo[] = [
    { rota: "/", esperado: "Visão geral contábil", grupo: "Especiais" },
    { rota: "/dashboard", esperado: "Visão geral contábil", grupo: "Especiais" },
    { rota: "/mapa-sistema", esperado: "Mapa do sistema", grupo: "Especiais" },
    { rota: "/visao-geral", esperado: "Catálogo de telas", grupo: "Especiais" },
    { rota: "/aprender/glossario", esperado: "Glossário", grupo: "Especiais" },
    { rota: "/aprender/pratica", esperado: "Modo prática", grupo: "Especiais" },
    { rota: "/simples-mei/receitas", esperado: "", grupo: "Especiais" },
    { rota: "/simples-mei/empresas", esperado: "", grupo: "Especiais" },
    { rota: "/simples-mei/obrigacoes", esperado: "", grupo: "Especiais" },
    { rota: "/preparativos/cadastros/empresas/novo", esperado: "", grupo: "Especiais" },
    { rota: "/preparativos/empresa/dados-empresa/novo", esperado: "", grupo: "Especiais" },
    { rota: "/preparativos/cadastros/empresas/EMP-1", esperado: "", grupo: "Especiais" },
    { rota: "/financeiro/cadastros", esperado: "Cadastros", grupo: "Especiais" },
    { rota: "/financeiro/cadastros/produtos", esperado: "", grupo: "Especiais" },
    { rota: "/financeiro/cadastros/clientes-fornecedores", esperado: "", grupo: "Especiais" },
    { rota: "/financeiro/cadastros/servicos", esperado: "", grupo: "Especiais" },
    { rota: "/administrativo/cadastros", esperado: "", grupo: "Especiais" },
  ];
  for (const secao of SECOES) {
    alvos.push({ rota: `/visao-geral/${secao.id}`, esperado: "", grupo: "Visão geral" });
    const grupo = secao.subgrupos.find((s) => s.titulo)?.titulo;
    if (grupo) {
      const chave = grupo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      alvos.push({ rota: `/visao-geral/${secao.id}/${chave}`, esperado: "", grupo: "Visão geral" });
    }
  }
  // Domínios cadastrais reais (ver `DominioSlug` em src/lib/adminStore.ts).
  for (const dominio of ["clientes", "fornecedores", "produtos-servicos", "bancos", "plano-gerencial", "condicoes-pagamento"]) {
    alvos.push({ rota: `/administrativo/cadastros/${dominio}`, esperado: "", grupo: "Domínios administrativos" });
  }
  return alvos;
}

/* ------------------------------------------------------------------ */
/* Ambiente                                                             */
/* ------------------------------------------------------------------ */

/** Empresa do grupo em operação e em conformidade (contador, certificado e filial). */
async function prepararAmbiente() {
  const { prepararAmbienteCompleto } = await import("./validacaoAmbiente");
  await prepararAmbienteCompleto();
}

/* ------------------------------------------------------------------ */
/* Navegação                                                            */
/* ------------------------------------------------------------------ */

type Observador = { erros: string[]; interromper: () => void };

/** Captura erros de JS e chamadas de console.error durante a navegação. */
function observar(): Observador {
  const erros: string[] = [];
  const erroOriginal = console.error;
  console.error = (...args: unknown[]) => {
    const texto = args.map((a) => (a instanceof Error ? `${a.name}: ${a.message}` : String(a))).join(" ");
    if (/Element type is invalid|is not a function|Cannot read|undefined is not|is not defined|TypeError|ReferenceError|Maximum update depth|Objects are not valid as a React child/.test(texto)) {
      erros.push(texto.slice(0, 400));
    }
    erroOriginal(...args);
  };
  const aoErro = (e: ErrorEvent) => erros.push(`${e.message}`.slice(0, 400));
  window.addEventListener("error", aoErro);
  return {
    erros,
    interromper: () => {
      console.error = erroOriginal;
      window.removeEventListener("error", aoErro);
    },
  };
}

function tituloAtual() {
  const h1 = document.querySelector("main h1") ?? document.querySelector("h1");
  return (h1?.textContent ?? "").trim();
}

function normalizar(v: string) {
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Abre a rota montando o app do zero — é o mais próximo de uma carga real de
 * página e evita confundir a tela anterior com a atual.
 */
async function abrir(rota: string): Promise<number> {
  const inicio = Date.now();
  cleanup(); // desmonta a tela anterior: cada rota é uma carga limpa
  window.history.pushState({}, "", rota);
  const { default: App } = await import("@/App");
  render(<App />);
  await waitFor(
    () => {
      const corpo = document.body.textContent ?? "";
      if (/Página não encontrada/.test(corpo) && corpo.length < 4000) return;
      if (tituloAtual()) return;
      expect(corpo.length, "tela ainda vazia").toBeGreaterThan(0);
      throw new Error("tela sem título");
    },
    { timeout: ESPERA_TELA, interval: 60 },
  );
  return Date.now() - inicio;
}

/** Verifica uma rota e registra o resultado (não lança: o relatório consolida). */
async function verificar(alvo: Alvo): Promise<Resultado> {
  const observador = observar();
  const resultado: Resultado = {
    rota: alvo.rota,
    esperado: alvo.esperado,
    titulo: "",
    situacao: "ok",
    ms: 0,
    texto: 0,
    observacoes: [],
    erros: [],
  };
  try {
    resultado.ms = await abrir(alvo.rota);
  } catch (erro) {
    // Segunda tentativa: um novo carregamento da tela.
    cleanup();
    try {
      resultado.ms = await abrir(alvo.rota);
      resultado.observacoes.push("montou só na segunda tentativa");
    } catch (erro2) {
      resultado.situacao = "falha";
      resultado.erros.push(`não montou: ${(erro2 as Error).message ?? erro2}`);
    }
  }

  resultado.titulo = tituloAtual();
  const corpo = (document.body.textContent ?? "").replace(/\s+/g, " ");
  resultado.texto = corpo.length;
  resultado.erros.push(...observador.erros);
  observador.interromper();

  if (resultado.situacao !== "falha") {
    if (/Página não encontrada/.test(corpo) && corpo.length < 4000) {
      resultado.situacao = "falha";
      resultado.erros.push("caiu na página 404 do sistema");
    } else if (/Acesso pendente/.test(corpo)) {
      resultado.situacao = "falha";
      resultado.erros.push("caiu no gate de acesso (usuário sem papel)");
    } else if (!resultado.titulo) {
      resultado.situacao = "falha";
      resultado.erros.push("nenhum cabeçalho (h1) foi renderizado");
    } else if (resultado.esperado && !normalizar(resultado.titulo).includes(normalizar(resultado.esperado))) {
      resultado.situacao = "aviso";
      resultado.observacoes.push(`título "${resultado.titulo}" não casa com o menu ("${resultado.esperado}")`);
    }
    if (resultado.texto < 600) {
      resultado.situacao = resultado.situacao === "falha" ? "falha" : "aviso";
      resultado.observacoes.push(`conteúdo muito curto (${resultado.texto} caracteres) — tela possivelmente vazia`);
    }
  }
  if (resultado.erros.length && resultado.situacao === "ok") resultado.situacao = "aviso";
  return resultado;
}

/* ------------------------------------------------------------------ */
/* Execução                                                             */
/* ------------------------------------------------------------------ */

const MENU = rotasDoMenu();
const CLASSICAS = rotasClassicas();
const ESPECIAIS = rotasEspeciais();

/** Agrupa por seção do menu para dar diagnósticos legíveis e testes curtos. */
function emLotes<T extends { grupo: string }>(alvos: T[]): { nome: string; alvos: T[] }[] {
  const mapa = new Map<string, T[]>();
  for (const alvo of alvos) {
    const lista = mapa.get(alvo.grupo) ?? [];
    lista.push(alvo);
    mapa.set(alvo.grupo, lista);
  }
  return [...mapa.entries()].map(([nome, alvos]) => ({ nome, alvos }));
}

async function rodarLote(nome: string, alvos: Alvo[]) {
  const falhas: string[] = [];
  for (const alvo of alvos) {
    const r = await verificar(alvo);
    resultados.push(r);
    const marca = r.situacao === "ok" ? "✓" : r.situacao === "aviso" ? "!" : "✗";
    console.log(`${marca} [${nome}] ${r.rota} → "${r.titulo}" (${r.ms}ms, ${r.texto} car., heap ${Math.round(process.memoryUsage().heapUsed / 1048576)}MB)${r.erros.length ? ` | erros: ${r.erros.join(" ~ ")}` : ""}${r.observacoes.length ? ` | ${r.observacoes.join(" ~ ")}` : ""}`);
    if (r.situacao === "falha") falhas.push(`${r.rota}: ${r.erros.join(" | ")}`);
  }
  expect(falhas, `telas que não abriram em ${nome}`).toEqual([]);
}

describe.skipIf(!RODAR)("validação completa: rotas e telas", () => {
  beforeAll(() => {
    process.env.TZ = "America/Sao_Paulo";
  });
  beforeEach(async () => {
    cleanup();
    await prepararAmbiente();
  });
  afterAll(() => {
    const falhas = resultados.filter((r) => r.situacao === "falha");
    const avisos = resultados.filter((r) => r.situacao === "aviso");
    writeFileSync(
      ARQUIVO_RELATORIO,
      JSON.stringify(
        {
          geradoEm: new Date().toISOString(),
          total: resultados.length,
          ok: resultados.length - falhas.length - avisos.length,
          avisos: avisos.length,
          falhas: falhas.length,
          resultados,
        },
        null,
        2,
      ),
    );
    console.log(`\nRELATÓRIO: ${ARQUIVO_RELATORIO} | telas: ${resultados.length} | sem problema: ${resultados.length - falhas.length - avisos.length} | avisos: ${avisos.length} | falhas: ${falhas.length}`);
  });

  for (const lote of emLotes(MENU)) {
    it(`menu — ${lote.nome}`, async () => {
      await rodarLote(lote.nome, lote.alvos);
    }, 300_000);
  }

  it("rotas clássicas (áreas e categorias)", async () => {
    await rodarLote("Rotas clássicas", CLASSICAS);
  }, 300_000);

  it("rotas especiais, catálogo e visões gerais", async () => {
    await rodarLote("Especiais", ESPECIAIS.filter((a) => !a.grupo.startsWith("Visão geral")));
    await rodarLote("Visão geral", ESPECIAIS.filter((a) => a.grupo.startsWith("Visão geral")));
    await rodarLote("Domínios administrativos", ESPECIAIS.filter((a) => a.grupo === "Domínios administrativos"));
  }, 300_000);

  it("rota inexistente de 1 segmento cai na página 404 (validação negativa)", async () => {
    await abrir("/rota-que-nao-existe-em-2026");
    await waitFor(() => expect(document.body.textContent).toContain("Página não encontrada"), { timeout: 15_000 });
  }, 60_000);

  it("rota inexistente de 4 segmentos cai na página 404 (validação negativa)", async () => {
    await abrir("/rota/que/nao/existe-em-2026");
    await waitFor(() => expect(document.body.textContent).toContain("Página não encontrada"), { timeout: 15_000 });
  }, 60_000);

  it("o inventário de rotas não pode ficar vazio", () => {
    expect(MENU.length).toBeGreaterThan(90);
    expect(readFileSync("src/App.tsx", "utf8")).toContain("<Route path=\"/dashboard\"");
  });
});
