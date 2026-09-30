/**
 * Regime tributário: "A definir" NUNCA pode passar por regime escolhido.
 * Achado da validação funcional (B1): o cadastro não tinha campo de regime, gravava "A definir",
 * os cálculos viravam Lucro Presumido em silêncio e o checklist marcava "regime definido ✔".
 */
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { limparSupabaseFalso } from "./supabaseFalso";

vi.mock("@/integrations/supabase/client", async () => (await import("./supabaseFalso")).moduloSupabaseFalso());

const CNPJ_OK = "11.222.333/0001-81";

function empresaNoCache(regime: string) {
  localStorage.setItem(
    "usecontabil.empresas.cache.v1",
    JSON.stringify([{ id: "EMP-1", cnpj: CNPJ_OK, razao: "Confecções Exemplo Ltda", regime, atividade: "—", status: "Ativa", createdAt: "2026-01-01T00:00:00Z", raw: {} }]),
  );
  localStorage.setItem("usecontabil.empresaAtual.v1", "EMP-1");
}

beforeEach(() => {
  localStorage.clear();
  limparSupabaseFalso();
  vi.resetModules();
});

describe("regimeDefinido", () => {
  it.each([
    ["Simples Nacional", true],
    ["Lucro Presumido", true],
    ["Lucro Real", true],
    ["MEI", true],
    ["SIMEI", true],
    ["A definir", false],
    ["", false],
    ["   ", false],
    ["Outro", false],
    [undefined, false],
    [null, false],
  ])("%j → %s", async (valor, esperado) => {
    const { regimeDefinido } = await import("@/lib/regime");
    expect(regimeDefinido(valor as string | null | undefined)).toBe(esperado);
  });
});

describe("validarCadastroEmpresa", () => {
  it("recusa CNPJ vazio, incompleto e com dígito verificador inválido", async () => {
    const { validarCadastroEmpresa } = await import("@/lib/empresaValidacao");
    expect(validarCadastroEmpresa({ cnpj: "", razao: "X", regime: "MEI" })).toMatch(/14 dígitos/);
    expect(validarCadastroEmpresa({ cnpj: "11.222.333", razao: "X", regime: "MEI" })).toMatch(/14 dígitos/);
    expect(validarCadastroEmpresa({ cnpj: "11.111.111/1111-11", razao: "X", regime: "MEI" })).toMatch(/dígitos verificadores/);
    expect(validarCadastroEmpresa({ cnpj: "11.222.333/0001-80", razao: "X", regime: "MEI" })).toMatch(/dígitos verificadores/);
  });

  it("exige razão social e regime escolhido (\"A definir\" não vale)", async () => {
    const { validarCadastroEmpresa } = await import("@/lib/empresaValidacao");
    expect(validarCadastroEmpresa({ cnpj: CNPJ_OK, razao: "  ", regime: "MEI" })).toMatch(/razão social/);
    expect(validarCadastroEmpresa({ cnpj: CNPJ_OK, razao: "X", regime: "" })).toMatch(/regime/);
    expect(validarCadastroEmpresa({ cnpj: CNPJ_OK, razao: "X", regime: "A definir" })).toMatch(/regime/);
  });

  it("aceita cadastro completo", async () => {
    const { validarCadastroEmpresa } = await import("@/lib/empresaValidacao");
    expect(validarCadastroEmpresa({ cnpj: CNPJ_OK, razao: "Confecções Exemplo Ltda", regime: "Simples Nacional" })).toBeNull();
  });
});

describe("checklist de cadastro (gestaoStore)", () => {
  it("'A definir' NÃO conta como regime definido", async () => {
    empresaNoCache("A definir");
    const { pendenciasCadastro } = await import("@/lib/gestaoStore");
    expect(pendenciasCadastro("EMP-1").find((p) => p.id === "regime")?.resolvida).toBe(false);
  });

  it("regime escolhido conta como definido", async () => {
    empresaNoCache("Simples Nacional");
    const { pendenciasCadastro } = await import("@/lib/gestaoStore");
    expect(pendenciasCadastro("EMP-1").find((p) => p.id === "regime")?.resolvida).toBe(true);
  });
});

describe("<AvisoRegime />", () => {
  async function renderizar() {
    const { EmpresaProvider } = await import("@/lib/empresaAtual");
    const { default: AvisoRegime } = await import("@/components/contabil/AvisoRegime");
    return render(
      <MemoryRouter>
        <EmpresaProvider>
          <AvisoRegime />
        </EmpresaProvider>
      </MemoryRouter>,
    );
  }

  it("avisa e leva ao cadastro quando o regime não está definido", async () => {
    empresaNoCache("A definir");
    await renderizar();
    const aviso = await screen.findByRole("alert");
    expect(aviso).toHaveTextContent(/regime tributário não definido/i);
    expect(aviso).toHaveTextContent(/Lucro Presumido por padrão/i);
    expect(screen.getByRole("link", { name: /definir regime/i })).toHaveAttribute("href", "/preparativos/cadastros/empresas/EMP-1");
  });

  it("não aparece quando o regime está definido", async () => {
    empresaNoCache("Lucro Real");
    await renderizar();
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });
});
