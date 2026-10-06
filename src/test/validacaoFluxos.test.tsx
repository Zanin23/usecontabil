/**
 * VALIDAÇÃO FUNCIONAL — fluxos de trabalho pelas telas de verdade.
 *
 * Cada bloco percorre um ciclo completo como um usuário faria: abrir a tela,
 * preencher o cadastro, salvar, conferir o reflexo em outra tela, ALTERAR o
 * registro gravado, gerar o documento/saída e, quando o fluxo permite, excluir.
 *
 * Complementa os testes existentes cobrindo as telas que ainda não eram
 * exercitadas por nenhum teste (inscrições, pagamentos, parâmetros,
 * certificados, centros de custo, históricos, produtos/serviços e diário).
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COMPETENCIA_VALIDACAO, EMPRESA_VALIDACAO, prepararAmbienteBase, prepararAmbienteCompleto, prepararAmbienteOperacional } from "./validacaoAmbiente";

vi.mock("@/integrations/supabase/client", async () =>
  (await import("./supabaseFalso")).moduloSupabaseFalso(),
);
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

vi.setConfig({ testTimeout: 40_000 });

beforeEach(() => Object.values(toast).forEach((f) => f.mockClear()));
afterEach(() => vi.restoreAllMocks());

/** Monta a tela numa rota de verdade, com empresa e competência selecionadas. */
async function abrir(importar: () => Promise<{ default: React.ComponentType }>, rota: string, padrao = rota) {
  cleanup(); // cada tela é uma montagem limpa (evita títulos "grudados" da tela anterior)
  const { EmpresaProvider } = await import("@/lib/empresaAtual");
  const { CompetenciaProvider } = await import("@/lib/competencia");
  const Tela = (await importar()).default;
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

const telas = {
  inscricoes: () => import("@/pages/contabil/EmpresaInscricoes"),
  parametros: () => import("@/pages/contabil/EmpresaParametros"),
  certificados: () => import("@/pages/contabil/EmpresaCertificados"),
  participantes: () => import("@/pages/contabil/preparativos/Participantes"),
  produtos: () => import("@/pages/contabil/preparativos/ProdutosServicos"),
  centros: () => import("@/pages/contabil/contabilidade/CentrosCusto"),
  historicos: () => import("@/pages/contabil/contabilidade/HistoricosPadrao"),
  diario: () => import("@/pages/contabil/contabilidade/Diario"),
} as const;

/** Botão principal da tela (o mesmo rótulo aparece no cabeçalho e no estado vazio). */
function botao(rotulo: RegExp, indice = 0) {
  return screen.getAllByRole("button", { name: rotulo })[indice];
}

/** Escolhe uma opção em qualquer `Select` do Radix (pelo rótulo do gatilho). */
async function escolherNoSelect(nome: RegExp | string, opcao: string) {
  const gatilho = screen.getByRole("combobox", { name: nome });
  fireEvent.keyDown(gatilho, { key: "Enter" });
  const item = await screen.findByRole("option", { name: opcao });
  fireEvent.keyDown(item, { key: "Enter" });
  await waitFor(() => expect(screen.getByRole("combobox", { name: nome })).toHaveTextContent(opcao));
}

/** Igual a `escolherNoSelect`, mas limitado a um diálogo. */
async function escolherNoSelectNoEscopo(escopo: HTMLElement, nome: string, opcao: string) {
  const gatilho = within(escopo).getByRole("combobox", { name: nome });
  fireEvent.keyDown(gatilho, { key: "Enter" });
  const item = await screen.findByRole("option", { name: opcao });
  fireEvent.keyDown(item, { key: "Enter" });
  await waitFor(() => expect(within(escopo).getByRole("combobox", { name: nome })).toHaveTextContent(opcao));
}

/* ================================================================== */
/* 1. Configuração da empresa (Preparativos › Empresa)                 */
/* ================================================================== */

describe("Configuração › Inscrições", () => {
  beforeEach(prepararAmbienteBase);

  it("cadastra, altera e exclui uma inscrição", async () => {
    const { loadRegistros } = await import("@/lib/empresaDadosStore");
    await abrir(telas.inscricoes, "/preparativos/empresa/inscricoes");
    expect(await screen.findByText(/Nenhum registro cadastrado/)).toBeInTheDocument();

    // Criar
    fireEvent.click(botao(/Nova inscrição/));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText(/Número/), { target: { value: "9075541230" } });
    fireEvent.change(within(dialogo).getByLabelText(/Órgão emissor/), { target: { value: "SEFAZ/PR" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(loadRegistros("inscricoes", EMPRESA_VALIDACAO.id)).toHaveLength(1));
    expect(await screen.findByText("9075541230")).toBeInTheDocument();

    // Alterar
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    const edicao = await screen.findByRole("dialog");
    fireEvent.change(within(edicao).getByLabelText(/Número/), { target: { value: "9075549999" } });
    fireEvent.click(within(edicao).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(loadRegistros("inscricoes", EMPRESA_VALIDACAO.id)[0].numero).toBe("9075549999"));
    expect(await screen.findByText("9075549999")).toBeInTheDocument();

    // Excluir (com confirmação)
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(confirmar).toHaveBeenCalled();
    await waitFor(() => expect(loadRegistros("inscricoes", EMPRESA_VALIDACAO.id)).toHaveLength(0));
  });

  it("não grava sem os campos obrigatórios", async () => {
    const { loadRegistros } = await import("@/lib/empresaDadosStore");
    await abrir(telas.inscricoes, "/preparativos/empresa/inscricoes");
    fireEvent.click(botao(/Nova inscrição/));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/Preencha/)));
    expect(loadRegistros("inscricoes", EMPRESA_VALIDACAO.id)).toHaveLength(0);
  });
});

describe("Configuração › Parâmetros e certificados", () => {
  beforeEach(prepararAmbienteBase);

  it("grava parâmetro fiscal com o grupo escolhido", async () => {
    const { loadRegistros } = await import("@/lib/empresaDadosStore");
    await abrir(telas.parametros, "/preparativos/empresa/parametros");
    fireEvent.click(botao(/Novo parâmetro/));
    const dialogo = await screen.findByRole("dialog");
    await escolherNoSelect("Grupo", "Fiscal");
    fireEvent.change(within(dialogo).getByLabelText(/^Parâmetro/), { target: { value: "CSOSN padrão de saída" } });
    fireEvent.change(within(dialogo).getByLabelText(/^Valor/), { target: { value: "101" } });
    fireEvent.change(within(dialogo).getByLabelText(/Vigente a partir/), { target: { value: "2026-01-01" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(loadRegistros("parametros", EMPRESA_VALIDACAO.id)).toHaveLength(1));
    expect(loadRegistros("parametros", EMPRESA_VALIDACAO.id)[0]).toMatchObject({
      grupo: "Fiscal", parametro: "CSOSN padrão de saída", valor: "101", vigencia: "2026-01-01",
    });
    expect(await screen.findByText("CSOSN padrão de saída")).toBeInTheDocument();
  });

  it("certificado exige titular e validade antes de gravar", async () => {
    const { loadRegistros } = await import("@/lib/empresaDadosStore");
    await abrir(telas.certificados, "/preparativos/empresa/certificados");
    fireEvent.click(botao(/Novo certificado/));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/Preencha/)));
    expect(loadRegistros("certificados", EMPRESA_VALIDACAO.id)).toHaveLength(0);

    fireEvent.change(within(dialogo).getByLabelText(/Titular/), { target: { value: "CONFECCOES EXEMPLO LTDA:11222333000181" } });
    fireEvent.change(within(dialogo).getByLabelText(/Validade/), { target: { value: "2027-01-15" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(loadRegistros("certificados", EMPRESA_VALIDACAO.id)).toHaveLength(1));
    expect(loadRegistros("certificados", EMPRESA_VALIDACAO.id)[0]).toMatchObject({ tipo: "A1", validade: "2027-01-15" });
  });
});

/* ================================================================== */
/* 2. Cadastros do grupo                                              */
/* ================================================================== */

describe("Cadastros › Produtos e serviços", () => {
  beforeEach(prepararAmbienteBase);

  it("cadastra produto, corrige a validação, altera e exclui", async () => {
    const { listarProdutos } = await import("@/lib/cadastrosStore");
    await abrir(telas.produtos, "/preparativos/cadastros/produtos-servicos");
    expect(await screen.findByText(/Nenhum produto ou serviço/)).toBeInTheDocument();

    fireEvent.click(botao(/Novo produto|Novo item|Novo|Adicionar/));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(within(dialogo).getByRole("alert")).toHaveTextContent(/descri/i));

    // O formulário abre como Serviço; para mercadoria é preciso trocar o tipo (o NCM só aparece em Produto).
    await escolherNoSelectNoEscopo(dialogo, "Tipo", "Produto");
    fireEvent.change(within(dialogo).getByLabelText(/Descrição/), { target: { value: "Camiseta básica" } });
    fireEvent.change(within(dialogo).getByLabelText(/NCM/), { target: { value: "61091000" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(listarProdutos()).toHaveLength(1));
    expect(listarProdutos()[0]).toMatchObject({ descricao: "Camiseta básica", ncm: "61091000", situacao: "Ativo" });
    expect(await screen.findByText("Camiseta básica")).toBeInTheDocument();

    // Alterar
    fireEvent.click(screen.getByRole("button", { name: /Editar/ }));
    const edicao = await screen.findByRole("dialog");
    fireEvent.change(within(edicao).getByLabelText(/Preço padrão/), { target: { value: "39,90" } });
    fireEvent.click(within(edicao).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(listarProdutos()[0].precoPadrao).toBeCloseTo(39.9));

    // Excluir
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: /Excluir/ }));
    await waitFor(() => expect(listarProdutos()).toHaveLength(0));
  });
});

describe("Cadastros › Clientes e fornecedores", () => {
  beforeEach(async () => {
    await prepararAmbienteOperacional();
  });

  it("altera o cadastro herdado e mostra o reflexo na lista", async () => {
    const { listarParticipantes } = await import("@/lib/cadastrosStore");
    await abrir(telas.participantes, "/preparativos/cadastros/participantes");
    expect(await screen.findByText("Lojas Vestir Bem Ltda.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Editar Lojas Vestir Bem Ltda." }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText(/Nome \/ razão social/), { target: { value: "Lojas Vestir Bem S.A." } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(listarParticipantes().find((p) => p.codigo === "CLI-001")?.nome).toBe("Lojas Vestir Bem S.A."),
    );
    expect(await screen.findByText("Lojas Vestir Bem S.A.")).toBeInTheDocument();
  });
});

/* ================================================================== */
/* 3. Núcleo contábil                                                 */
/* ================================================================== */

describe("Contábil › Centros de custo e históricos", () => {
  beforeEach(async () => {
    await prepararAmbienteBase();
    const { carregarPlanoModelo } = await import("@/lib/planoContasStore");
    carregarPlanoModelo();
  });

  it("cria, altera e exclui centro de custo", async () => {
    const { listarCentros } = await import("@/lib/planoContasStore");
    await abrir(telas.centros, "/contabil/cadastros/centros-custo");

    fireEvent.click(botao(/Novo centro|Adicionar|Novo/));
    let dialogo = await screen.findByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText(/Código/), { target: { value: "CC-ADM" } });
    fireEvent.change(within(dialogo).getByLabelText(/Descrição/), { target: { value: "Administrativo" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(listarCentros().some((c) => c.codigo === "CC-ADM")).toBe(true));

    fireEvent.click(screen.getByRole("button", { name: "Editar Administrativo" }));
    dialogo = await screen.findByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText(/Descrição/), { target: { value: "Administrativo e diretoria" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(listarCentros().find((c) => c.codigo === "CC-ADM")?.descricao).toBe("Administrativo e diretoria"),
    );

    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Excluir Administrativo e diretoria" }));
    await waitFor(() => expect(listarCentros().some((c) => c.codigo === "CC-ADM")).toBe(false));
  });

  it("cria histórico padrão e recusa código repetido", async () => {
    const { listarHistoricos } = await import("@/lib/planoContasStore");
    await abrir(telas.historicos, "/contabil/cadastros/historicos");
    fireEvent.click(botao(/Novo histórico|Adicionar|Novo/));
    let dialogo = await screen.findByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText(/Código/), { target: { value: "HP-001" } });
    fireEvent.change(within(dialogo).getByLabelText(/Texto/), { target: { value: "Venda de mercadorias conforme NF {documento}" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(listarHistoricos().some((h) => h.codigo === "HP-001")).toBe(true));

    fireEvent.click(botao(/Novo histórico|Adicionar|Novo/));
    dialogo = await screen.findByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText(/Código/), { target: { value: "HP-001" } });
    fireEvent.change(within(dialogo).getByLabelText(/Texto/), { target: { value: "Outro texto" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(within(dialogo).getByRole("alert")).toHaveTextContent(/existe|repetido|já/i));
    expect(listarHistoricos().filter((h) => h.codigo === "HP-001")).toHaveLength(1);
  });
});

describe("Contábil › Diário", () => {
  beforeEach(prepararAmbienteOperacional);

  it("mostra o lançamento da competência com as partidas e os totais", async () => {
    const { listarLancamentos } = await import("@/lib/lancamentosStore");
    expect(listarLancamentos(EMPRESA_VALIDACAO.id).length).toBeGreaterThan(0);

    await abrir(telas.diario, "/contabil/relatorios/diario");
    expect(await screen.findByText(/Recebimento de vendas/)).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/1\.250,50/);
  });
});

/* ================================================================== */
/* 4. Fiscal: da nota de saída ao arquivo do SPED                     */
/* ================================================================== */

describe("Fiscal › Documentos, escrituração e obrigação", () => {
  beforeEach(prepararAmbienteOperacional);

  it("lança a nota de saída pela tela e ela entra no livro de saídas", async () => {
    const { loadDocs } = await import("@/lib/fiscalStore");
    const { linhasDoPeriodo } = await import("@/lib/escrituracaoStore");

    // 1) Nota de saída lançada à mão, herdando os dados do cadastro de participantes.
    await abrir(() => import("@/pages/contabil/fiscal/NotasSaida"), "/fiscal/documentos/saidas");
    fireEvent.click(botao(/Nova nota/));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText(/^Documento/), { target: { value: "NF-e 22140" } });
    fireEvent.change(within(dialogo).getByLabelText(/Data de emissão/), { target: { value: "05/07/2026" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: /Buscar no cadastro/ }));
    fireEvent.click(await screen.findByText("Lojas Vestir Bem Ltda."));
    await waitFor(() => expect((within(dialogo).getByLabelText(/CNPJ do destinatário/) as HTMLInputElement).readOnly).toBe(true));
    fireEvent.change(within(dialogo).getByLabelText(/Valor total/), { target: { value: "3.200,00" } });
    fireEvent.change(within(dialogo).getByLabelText(/ICMS debitado/), { target: { value: "576,00" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(loadDocs("saidas")).toHaveLength(1));
    expect(loadDocs("saidas")[0]).toMatchObject({
      numero: "NF-e 22140", data: "05/07/2026", cfop: "5102", valor: "3.200,00", status: "Autorizada",
    });
    expect(await screen.findByText("NF-e 22140")).toBeInTheDocument();

    // 2) O livro de saídas passa a enxergar o documento.
    await abrir(() => import("@/pages/contabil/fiscal/escrituracao/LivroSaidas"), "/fiscal/escrituracao/livro-saidas");
    const [gerarLivro] = await screen.findAllByRole("button", { name: /Gerar dos documentos/ });
    fireEvent.click(gerarLivro);
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/linha\(s\) geradas/)),
    );

    const linhas = linhasDoPeriodo("livro-saidas", EMPRESA_VALIDACAO.id, COMPETENCIA_VALIDACAO);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({ cfop: "5102", documentos: "1", contabil: "3.200,00", icms: "576,00" });
    expect(screen.getAllByText("5102").length).toBeGreaterThan(0);
    expect(screen.getAllByText("R$ 3.200,00").length).toBeGreaterThan(0);
  });

  it("apura o ICMS a partir dos livros da competência", async () => {
    // entrada (crédito) e saída (débito) da mesma competência
    const fiscal = await import("@/lib/fiscalStore");
    fiscal.saveDoc("saidas", {
      id: "saida-1", empresaId: EMPRESA_VALIDACAO.id, competencia: COMPETENCIA_VALIDACAO,
      numero: "NF-e 22140", data: "05/07/2026", participante: "Lojas Vestir Bem Ltda.", cfop: "5102",
      valor: "3.200,00", baseIcms: "3.200,00", icms: "576,00", status: "Autorizada",
    } as never);
    fiscal.saveDoc("entradas", {
      id: "entrada-1", empresaId: EMPRESA_VALIDACAO.id, competencia: COMPETENCIA_VALIDACAO,
      numero: "NF-e 9311", data: "08/07/2026", participante: "Malharia Cianorte S.A.", cfop: "1102",
      valor: "1.000,00", baseIcms: "1.000,00", icms: "120,00", status: "Escriturado",
    } as never);

    // Os geradores devolvem as linhas; quem grava no período é `substituirPeriodo`
    // (é o que o botão "Gerar dos documentos" das telas de escrituração faz).
    const { gerarLivroEntradas, gerarLivroSaidas, linhasDoPeriodo, substituirPeriodo } = await import("@/lib/escrituracaoStore");
    substituirPeriodo("livro-entradas", EMPRESA_VALIDACAO.id, COMPETENCIA_VALIDACAO, gerarLivroEntradas(EMPRESA_VALIDACAO.id, COMPETENCIA_VALIDACAO));
    substituirPeriodo("livro-saidas", EMPRESA_VALIDACAO.id, COMPETENCIA_VALIDACAO, gerarLivroSaidas(EMPRESA_VALIDACAO.id, COMPETENCIA_VALIDACAO));

    await abrir(() => import("@/pages/contabil/fiscal/escrituracao/ApuracaoIcms"), "/fiscal/escrituracao/apuracao-icms");
    const [apurar] = await screen.findAllByRole("button", { name: /Apurar competência/ });
    fireEvent.click(apurar);
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/linha\(s\) geradas/)),
    );

    const apuracao = linhasDoPeriodo("apuracao-icms", EMPRESA_VALIDACAO.id, COMPETENCIA_VALIDACAO);
    expect(apuracao.length).toBeGreaterThan(0);
    // ICMS próprio = débito das saídas (576) − crédito das entradas (120) = 456 a recolher
    expect(apuracao.find((l) => l.tributo === "ICMS próprio")).toMatchObject({
      debito: "576,00", credito: "120,00", apagar: "456,00", status: "A recolher",
    });
    expect(screen.getAllByText(/ICMS/).length).toBeGreaterThan(0);
  });

  it("bloqueia o SPED sem os requisitos e depois gera o arquivo quando eles existem", async () => {
    const { gerarObrigacao, getObrEstado } = await import("@/lib/obrigacoesStore");

    // Sem contador, sem certificado, sem documentos e sem apuração: a tela aponta o que falta.
    const estado = getObrEstado("sped-fiscal", EMPRESA_VALIDACAO.id, COMPETENCIA_VALIDACAO);
    const pendente = gerarObrigacao("sped-fiscal", EMPRESA_VALIDACAO.id, COMPETENCIA_VALIDACAO, estado);
    const erros = pendente.validacoes.filter((v) => v.tipo === "erro");
    expect(erros.length).toBeGreaterThan(0);
    expect(erros.map((e) => e.id)).toEqual(expect.arrayContaining(["v-contador", "v-cert"]));
    expect(erros.every((e) => e.destino || e.id === "v-empresa")).toBe(true); // todo erro diz onde resolver

    // O usuário resolve: contador no cadastro da empresa, certificado e apuração de ICMS.
    const { getEmpresa, saveEmpresa } = await import("@/lib/empresasStore");
    await saveEmpresa({ ...getEmpresa(EMPRESA_VALIDACAO.id)!, raw: { ...getEmpresa(EMPRESA_VALIDACAO.id)!.raw, contador: "Helio Zanin Neto — CRC/PR 0455123" } });
    const dados = await import("@/lib/empresaDadosStore");
    dados.saveRegistro("certificados", {
      id: dados.novoId("CRT"), empresaId: EMPRESA_VALIDACAO.id,
      titular: "CONFECCOES EXEMPLO LTDA:11222333000181", tipo: "A1", ac: "AC Certisign RFB G5",
      emissao: "2026-01-15", validade: "2027-01-15", uso: "SPED · NF-e", situacao: "Ativo",
    });

    const fiscal = await import("@/lib/fiscalStore");
    fiscal.saveDoc("saidas", {
      id: "saida-1", empresaId: EMPRESA_VALIDACAO.id, competencia: COMPETENCIA_VALIDACAO,
      numero: "NF-e 22140", data: "05/07/2026", participante: "Lojas Vestir Bem Ltda.", cfop: "5102",
      valor: "3.200,00", baseIcms: "3.200,00", icms: "576,00", status: "Autorizada",
      chave: fiscal.chaveFicticia(), // registro C100 exige a chave de 44 posições
    } as never);
    fiscal.saveDoc("entradas", {
      id: "entrada-1", empresaId: EMPRESA_VALIDACAO.id, competencia: COMPETENCIA_VALIDACAO,
      numero: "NF-e 9311", data: "08/07/2026", participante: "Malharia Cianorte S.A.", cfop: "1102",
      valor: "1.000,00", baseIcms: "1.000,00", icms: "120,00", status: "Escriturado",
      chave: fiscal.chaveFicticia(),
    } as never);
    const { gerarLivroEntradas, gerarLivroSaidas, linhasDoPeriodo, saveLinha, substituirPeriodo } = await import("@/lib/escrituracaoStore");
    substituirPeriodo("livro-entradas", EMPRESA_VALIDACAO.id, COMPETENCIA_VALIDACAO, gerarLivroEntradas(EMPRESA_VALIDACAO.id, COMPETENCIA_VALIDACAO));
    substituirPeriodo("livro-saidas", EMPRESA_VALIDACAO.id, COMPETENCIA_VALIDACAO, gerarLivroSaidas(EMPRESA_VALIDACAO.id, COMPETENCIA_VALIDACAO));
    await abrir(() => import("@/pages/contabil/fiscal/escrituracao/ApuracaoIcms"), "/fiscal/escrituracao/apuracao-icms");
    const [apurar] = await screen.findAllByRole("button", { name: /Apurar competência/ });
    fireEvent.click(apurar);
    await waitFor(() => expect(linhasDoPeriodo("apuracao-icms", EMPRESA_VALIDACAO.id, COMPETENCIA_VALIDACAO).length).toBeGreaterThan(0));
    gerarLivroSaidas(EMPRESA_VALIDACAO.id, COMPETENCIA_VALIDACAO);
    gerarLivroEntradas(EMPRESA_VALIDACAO.id, COMPETENCIA_VALIDACAO);

    // Inventário (bloco H) preenchido à mão na tela.
    saveLinha("inventario", {
      id: "", empresaId: EMPRESA_VALIDACAO.id, competencia: COMPETENCIA_VALIDACAO,
      item: "Camiseta malha algodão 30.1", codigo: "CAM-001", ncm: "61091000", unidade: "PC",
      qtd: "120", unitario: "34,90", total: "4.188,00", propriedade: "Próprio em meu poder",
    } as never);

    const agora = gerarObrigacao("sped-fiscal", EMPRESA_VALIDACAO.id, COMPETENCIA_VALIDACAO, getObrEstado("sped-fiscal", EMPRESA_VALIDACAO.id, COMPETENCIA_VALIDACAO));
    const aindaErro = agora.validacoes.filter((v) => v.tipo === "erro");
    expect(aindaErro.map((e) => e.titulo)).toEqual([]);

    // E o arquivo sai pela tela.
    await abrir(() => import("@/pages/contabil/fiscal/obrigacoes/SpedFiscal"), "/fiscal/obrigacoes/sped-fiscal");
    expect(document.querySelector("h1")?.textContent).toMatch(/SPED/);
    const [gerarArquivo] = await screen.findAllByRole("button", { name: /Gerar arquivo/ });
    fireEvent.click(gerarArquivo);
    await waitFor(
      () => expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/gerado/i)),
      { timeout: 15_000 },
    );
  });
});

/* ================================================================== */
/* 5. Fechamento: encerrar competência e bloquear a escrita            */
/* ================================================================== */

describe("Fechamento › Encerramento da competência", () => {
  beforeEach(prepararAmbienteOperacional);

  it("encerra o período e impede novo lançamento na competência fechada", async () => {
    const { fecharPeriodo, getFechamento } = await import("@/lib/gestaoStore");
    const { salvarLancamento, listarLancamentos } = await import("@/lib/lancamentosStore");
    const { listarContas } = await import("@/lib/planoContasStore");
    const contas = listarContas().filter((c) => c.tipo === "Analítica" && c.situacao === "Ativa");

    await abrir(
      () => import("@/pages/contabil/Encerramentos"),
      "/preparativos/servicos/encerramentos",
    );
    expect(screen.getAllByText(/Encerrar/).length).toBeGreaterThan(0);

    fecharPeriodo({
      empresaId: EMPRESA_VALIDACAO.id,
      competencia: COMPETENCIA_VALIDACAO,
      responsavel: "Validação",
      observacao: "Encerrado pela validação automática",
    });
    expect(getFechamento(EMPRESA_VALIDACAO.id, COMPETENCIA_VALIDACAO)).toBeTruthy();

    const antes = listarLancamentos(EMPRESA_VALIDACAO.id).length;
    const r = salvarLancamento({
      id: "", empresaId: EMPRESA_VALIDACAO.id, numero: 0, data: `${COMPETENCIA_VALIDACAO}-20`,
      tipo: "Normal", historico: "Lançamento após o fechamento", origem: "Manual",
      partidas: [
        { id: "", contaId: contas[0].id, tipo: "D", valor: 10 },
        { id: "", contaId: contas[1].id, tipo: "C", valor: 10 },
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.erros?.join(" ")).toMatch(/encerrada/i);
    expect(listarLancamentos(EMPRESA_VALIDACAO.id)).toHaveLength(antes);
  });
});

/* ================================================================== */
/* 6. Relatórios: balancete, diário, razão e DRE                       */
/* ================================================================== */

describe("Relatórios › Balancete, Diário, Razão e DRE", () => {
  beforeEach(prepararAmbienteOperacional);

  it("confere o balancete e o diário com o lançamento da competência", async () => {
    const { listarContas } = await import("@/lib/planoContasStore");
    const { fimDaCompetencia, gerarBalancete, listarLancamentos } = await import("@/lib/lancamentosStore");
    const receita = listarContas().find((c) => c.tipo === "Analítica" && c.codigo.startsWith("3.1.01.001"));
    expect(receita, "o plano modelo precisa da conta de venda 3.1.01.001").toBeTruthy();
    expect(listarLancamentos(EMPRESA_VALIDACAO.id)).toHaveLength(1);

    // O balancete fecha (débito = crédito) e mostra a conta de receita.
    const bal = gerarBalancete(EMPRESA_VALIDACAO.id, `${COMPETENCIA_VALIDACAO}-01`, fimDaCompetencia(COMPETENCIA_VALIDACAO), {
      ocultarZeradas: false,
    });
    expect(bal.totais.debitos).toBeCloseTo(1250.5, 2);
    expect(bal.totais.creditos).toBeCloseTo(1250.5, 2);
    expect(bal.linhas.some((l) => l.conta.codigo === receita!.codigo)).toBe(true);

    await abrir(() => import("@/pages/contabil/contabilidade/Balancete"), "/contabil/relatorios/balancete");
    expect(document.querySelector("h1")?.textContent).toMatch(/Balancete/);
    expect(await screen.findByText(receita!.codigo)).toBeInTheDocument();
    expect(screen.getAllByText("1.250,50").length).toBeGreaterThan(0);

    // O diário lista o lançamento e as duas partidas.
    await abrir(() => import("@/pages/contabil/contabilidade/Diario"), "/contabil/relatorios/diario");
    expect(document.querySelector("h1")?.textContent).toMatch(/Diário/);
    expect(await screen.findByText(/Recebimento de vendas da competência/)).toBeInTheDocument();
    expect(screen.getAllByText(receita!.codigo).length).toBeGreaterThan(0);
  });

  it("monta o razão de uma conta e a DRE da competência", async () => {
    const { listarContas } = await import("@/lib/planoContasStore");
    const { fimDaCompetencia, gerarRazao } = await import("@/lib/lancamentosStore");
    const receita = listarContas().find((c) => c.tipo === "Analítica" && c.codigo.startsWith("3.1.01.001"))!;

    const razao = gerarRazao(EMPRESA_VALIDACAO.id, receita.id, `${COMPETENCIA_VALIDACAO}-01`, fimDaCompetencia(COMPETENCIA_VALIDACAO));
    expect(razao.linhas).toHaveLength(1);
    expect(razao.linhas[0].credito).toBeCloseTo(1250.5, 2);

    await abrir(
      () => import("@/pages/contabil/contabilidade/Razao"),
      `/contabil/relatorios/razao?conta=${receita.id}`,
      "/contabil/relatorios/razao",
    );
    expect(document.querySelector("h1")?.textContent).toMatch(/Razão/);
    await waitFor(() => expect(document.body.textContent).toContain(receita.codigo));
    expect(document.body.textContent).toContain("Venda de mercadorias");

    // A DRE fecha o resultado da competência a partir dos documentos fiscais.
    await abrir(() => import("@/pages/contabil/financeiro/demonstracoes/Dre"), "/financeiro/demonstracoes/dre");
    expect(document.querySelector("h1")?.textContent).toMatch(/DRE/);
    expect((await screen.findAllByText(/Comparativo/)).length).toBeGreaterThan(0);
    expect(screen.getByText(/Confecções Exemplo Ltda/)).toBeInTheDocument();
  });
});

/* ================================================================== */
/* 7. Obrigações: ECD (com contador e certificado válidos)             */
/* ================================================================== */

describe("Obrigações › ECD", () => {
  beforeEach(prepararAmbienteCompleto);

  it("gera, assina, valida no PVA e transmite a ECD do ano-base", async () => {
    const obr = await import("@/lib/obrigacoesStore");
    const estado = () => obr.getObrEstado("ecd-ecf", EMPRESA_VALIDACAO.id, COMPETENCIA_VALIDACAO);
    const validacoes = () =>
      obr.gerarObrigacao("ecd-ecf", EMPRESA_VALIDACAO.id, COMPETENCIA_VALIDACAO, estado()).validacoes;

    expect(validacoes().filter((v) => v.tipo === "erro")).toEqual([]);

    await abrir(() => import("@/pages/contabil/fiscal/obrigacoes/EcdEcf"), "/fiscal/obrigacoes/ecd-ecf");
    expect(document.querySelector("h1")?.textContent).toMatch(/ECD/);

    const [gerar] = screen.getAllByRole("button", { name: /Gerar arquivo/ });
    fireEvent.click(gerar);
    await waitFor(() => expect(estado().arquivos.length).toBe(1), { timeout: 20_000 });
    const arquivo = estado().arquivos[0];
    expect(arquivo.formato).toBe("TXT");
    expect(arquivo.linhas).toBeGreaterThan(0);

    // Assinatura, validação no PVA e transmissão: mesmas ações dos botões da tela.
    const assinatura = obr.assinarArquivo("ecd-ecf", EMPRESA_VALIDACAO.id, COMPETENCIA_VALIDACAO, arquivo.id);
    expect(assinatura.ok).toBe(true);
    expect(estado().assinaturas.length).toBe(1);
    expect(estado().arquivos[0].assinado).toBe(true);
    expect(estado().status).toBe("Assinada");

    const pva = obr.validarPva("ecd-ecf", EMPRESA_VALIDACAO.id, COMPETENCIA_VALIDACAO);
    expect(pva.erros).toEqual([]);

    const envio = obr.transmitir("ecd-ecf", EMPRESA_VALIDACAO.id, COMPETENCIA_VALIDACAO, arquivo.id);
    expect(envio.ok).toBe(true);
    expect(estado().transmissoes.length).toBe(1);

    const transmissao = estado().transmissoes[0];
    const conclusao = obr.concluirTransmissao("ecd-ecf", EMPRESA_VALIDACAO.id, COMPETENCIA_VALIDACAO, transmissao.id, 2_000);
    expect(conclusao.protocolo).not.toBe("");
    expect(conclusao.recibo).not.toBe("");
    expect(estado().status).toBe("Transmitida");
    expect(estado().transmissoes[0].recibo).not.toBe("");
  });
});

/* ================================================================== */
/* 8. Cadastro da empresa: alterar o cadastro mestre e conferir        */
/* ================================================================== */

describe("Preparativos › Cadastro da empresa", () => {
  beforeEach(prepararAmbienteOperacional);

  it("altera a razão social pela tela e o novo valor vale para as outras telas", async () => {
    const { getEmpresa } = await import("@/lib/empresasStore");
    expect(getEmpresa(EMPRESA_VALIDACAO.id)?.razao).toBe(EMPRESA_VALIDACAO.razao);

    await abrir(
      () => import("@/pages/contabil/EmpresaCadastro"),
      `/preparativos/cadastros/empresas/${EMPRESA_VALIDACAO.id}`,
      "/preparativos/cadastros/empresas/:id",
    );
    await waitFor(() => expect(screen.getAllByDisplayValue(EMPRESA_VALIDACAO.razao).length).toBeGreaterThan(0), { timeout: 10_000 });

    const campo = screen.getAllByDisplayValue(EMPRESA_VALIDACAO.razao)[0];
    fireEvent.change(campo, { target: { value: "Confecções Exemplo Ltda (matriz)" } });
    fireEvent.click(screen.getByRole("button", { name: /Salvar Cadastro/ }));

    await waitFor(() => expect(getEmpresa(EMPRESA_VALIDACAO.id)?.razao).toBe("Confecções Exemplo Ltda (matriz)"));
    const salvo = getEmpresa(EMPRESA_VALIDACAO.id)!;
    expect(salvo.cnpj).toBe(EMPRESA_VALIDACAO.cnpj);
    expect(salvo.regime).toBe(EMPRESA_VALIDACAO.regime);
    expect((salvo.raw as Record<string, string>).cidade).toBe("Apucarana");

    // Reabrindo a tela, o cadastro já vem com o valor alterado.
    await abrir(
      () => import("@/pages/contabil/EmpresaCadastro"),
      `/preparativos/cadastros/empresas/${EMPRESA_VALIDACAO.id}`,
      "/preparativos/cadastros/empresas/:id",
    );
    expect(await screen.findByDisplayValue("Confecções Exemplo Ltda (matriz)", {}, { timeout: 10_000 })).toBeInTheDocument();
  });
});
