/**
 * Formulário de documento fiscal guiado:
 *   • herança do cadastro de participantes (CNPJ, UF e IE sem redigitar);
 *   • "Salvar e adicionar outro" para lançar uma sequência sem reabrir o diálogo.
 */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { abrirTela, docsFiscais, prepararAmbiente } from "./telaFiscal";

vi.mock("@/integrations/supabase/client", async () => (await import("./supabaseFalso")).moduloSupabaseFalso());
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

beforeEach(() => {
  Object.values(toast).forEach((f) => f.mockClear());
  prepararAmbiente();
});

/** Cadastra um participante no cadastro único, como se o usuário tivesse feito em Preparativos. */
async function semearParticipante(extra: Record<string, unknown> = {}) {
  const { participanteVazio, salvarParticipante } = await import("@/lib/cadastrosStore");
  const resultado = salvarParticipante({
    ...participanteVazio(),
    nome: "Comercial Andrade Ltda",
    documento: "11.222.333/0001-81",
    tipo: "Fornecedor",
    uf: "MG",
    ie: "1234567890",
    indicadorIe: "Contribuinte",
    situacao: "Ativo",
    ...extra,
  } as never);
  expect(resultado.ok).toBe(true);
  return resultado.registro!;
}

async function abrirDialogo(pagina: "NotasEntrada" | "NotasSaida", botao: RegExp) {
  await abrirTela(pagina);
  fireEvent.click(screen.getAllByRole("button", { name: botao })[0]);
  return screen.findByRole("dialog");
}

describe("herança do cadastro de participantes", () => {
  it("traz CNPJ, UF e IE do cadastro ao escolher o fornecedor e trava a redigitação", async () => {
    await semearParticipante();
    const dialogo = await abrirDialogo("NotasEntrada", /Nova entrada/);

    const campoNome = within(dialogo).getByLabelText(/Fornecedor/) as HTMLInputElement;
    expect(campoNome.value).toBe("");

    fireEvent.click(within(dialogo).getByRole("button", { name: /Buscar no cadastro/ }));
    fireEvent.click(await screen.findByText("Comercial Andrade Ltda"));

    await waitFor(() => expect(campoNome.value).toBe("Comercial Andrade Ltda"));
    const cnpj = within(dialogo).getByLabelText(/CNPJ do fornecedor/) as HTMLInputElement;
    expect(cnpj.value).toBe("11.222.333/0001-81");
    expect(cnpj.readOnly).toBe(true); // vem do cadastro: não se digita de novo
    expect((within(dialogo).getByLabelText(/UF do participante/) as HTMLInputElement).value).toBe("MG");
    expect(within(dialogo).getByText(/vieram do cadastro de participantes/)).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringMatching(/Dados de Comercial Andrade Ltda/),
      expect.anything(),
    );
  });

  it("volta a permitir digitar o CNPJ quando o nome é alterado à mão", async () => {
    await semearParticipante();
    const dialogo = await abrirDialogo("NotasEntrada", /Nova entrada/);

    fireEvent.click(within(dialogo).getByRole("button", { name: /Buscar no cadastro/ }));
    fireEvent.click(await screen.findByText("Comercial Andrade Ltda"));
    const cnpj = within(dialogo).getByLabelText(/CNPJ do fornecedor/) as HTMLInputElement;
    await waitFor(() => expect(cnpj.readOnly).toBe(true));

    fireEvent.change(within(dialogo).getByLabelText(/Fornecedor/), {
      target: { value: "Fornecedor Avulso ME" },
    });
    await waitFor(() => expect(cnpj.readOnly).toBe(false));
  });

  it("só lista participantes do papel da tela (nota de saída não sugere fornecedor)", async () => {
    await semearParticipante();
    const { participanteVazio, salvarParticipante } = await import("@/lib/cadastrosStore");
    salvarParticipante({
      ...participanteVazio(),
      nome: "Loja do Cliente ME",
      documento: "33.444.555/0001-81",
      tipo: "Cliente",
      uf: "BA",
      situacao: "Ativo",
    } as never);

    const dialogo = await abrirDialogo("NotasSaida", /Nova nota/);
    fireEvent.click(within(dialogo).getByRole("button", { name: /Buscar no cadastro/ }));

    expect(await screen.findByText("Loja do Cliente ME")).toBeInTheDocument();
    expect(screen.queryByText("Comercial Andrade Ltda")).not.toBeInTheDocument();
  });

  it("leva ao cadastro quando ainda não há participante do papel exigido", async () => {
    const dialogo = await abrirDialogo("NotasSaida", /Nova nota/);
    fireEvent.click(within(dialogo).getByRole("button", { name: /Buscar no cadastro/ }));

    expect(await screen.findByText(/Nenhum cliente cadastrado ainda/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Cadastrar participante/ })).toHaveAttribute(
      "href",
      "/preparativos/cadastros/participantes",
    );
  });
});

describe("salvar e adicionar outro", () => {
  it("grava o documento, mantém o diálogo aberto e repete o cabeçalho", async () => {
    const dialogo = await abrirDialogo("NotasSaida", /Nova nota/);

    fireEvent.change(within(dialogo).getByLabelText(/^Documento/), { target: { value: "NF-e 9001" } });
    fireEvent.change(within(dialogo).getByLabelText(/Destinatário/), { target: { value: "Cliente Um Ltda" } });
    fireEvent.change(within(dialogo).getByLabelText(/Valor total/), { target: { value: "1.200,00" } });
    fireEvent.change(within(dialogo).getByLabelText("CFOP"), { target: { value: "5102" } });

    fireEvent.click(within(dialogo).getByRole("button", { name: /Salvar e adicionar outro/ }));

    await waitFor(() => expect(docsFiscais("saidas")).toHaveLength(1));
    expect(docsFiscais("saidas")[0]).toMatchObject({
      numero: "NF-e 9001",
      participante: "Cliente Um Ltda",
      valor: "1.200,00",
      cfop: "5102",
    });
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringMatching(/formulário aberto para o próximo/),
      expect.anything(),
    );

    // O diálogo continua aberto, com o cabeçalho repetido e os campos do documento limpos.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(within(dialogo).getByLabelText(/^Documento/)).toHaveValue("");
    expect(within(dialogo).getByLabelText(/Valor total/)).toHaveValue("");
    expect(within(dialogo).getByLabelText(/Destinatário/)).toHaveValue("");
    expect(within(dialogo).getByLabelText("CFOP")).toHaveTextContent("5102");
  });

  it("o botão Salvar continua fechando o diálogo", async () => {
    const dialogo = await abrirDialogo("NotasSaida", /Nova nota/);
    fireEvent.change(within(dialogo).getByLabelText(/^Documento/), { target: { value: "NF-e 9002" } });
    fireEvent.change(within(dialogo).getByLabelText(/Destinatário/), { target: { value: "Cliente Dois Ltda" } });
    fireEvent.change(within(dialogo).getByLabelText(/Valor total/), { target: { value: "300,00" } });

    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(docsFiscais("saidas")).toHaveLength(1));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
