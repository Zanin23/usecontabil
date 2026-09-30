/**
 * Sem empresa selecionada, nenhuma tela pode mostrar/somar lançamentos de outras empresas.
 * Achado A3/MU2 da validação funcional: o filtro `(!empresaId || d.empresaId === empresaId)`
 * era ignorado quando não havia empresa e "Notas de entrada" listava 6 notas (R$ 26.961,00) de
 * uma empresa que nem existia mais — e, no mesmo navegador, de outro usuário.
 */
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { limparSupabaseFalso } from "./supabaseFalso";

vi.mock("@/integrations/supabase/client", async () => (await import("./supabaseFalso")).moduloSupabaseFalso());

const doc = (id: string, empresaId: string, valor: string) => ({
  id, empresaId, competencia: "2026-07", numero: `NF-e ${id}`, data: "10/07/2026", participante: "Fornecedor", valor, status: "Escriturado", cfop: "1102",
});

beforeEach(() => {
  localStorage.clear();
  limparSupabaseFalso();
  vi.resetModules();
  localStorage.setItem(
    "usecontabil.fiscal.docs.v1",
    JSON.stringify({ entradas: [doc("A1", "EMP-A", "1.000,00"), doc("A2", "EMP-A", "2.000,00"), doc("B1", "EMP-B", "500,00")] }),
  );
  localStorage.setItem(
    "usecontabil.escrituracao.v1",
    JSON.stringify({ "livro-entradas": [{ id: "L1", empresaId: "EMP-A", competencia: "2026-07" }, { id: "L2", empresaId: "EMP-B", competencia: "2026-07" }] }),
  );
  localStorage.setItem(
    "usecontabil.empresaDados.v1",
    JSON.stringify({ certificados: [{ id: "C1", empresaId: "EMP-A" }, { id: "C2", empresaId: "EMP-B" }] }),
  );
});

describe("documentos fiscais", () => {
  it.each([[null], [undefined], [""]])("empresa %j → nenhum documento (antes: todos)", async (semEmpresa) => {
    const { docsDoPeriodo, docsValidos } = await import("@/lib/apuracaoStore");
    expect(docsDoPeriodo("entradas", semEmpresa as string | null | undefined, "2026-07")).toEqual([]);
    expect(docsValidos("entradas", semEmpresa as string | null | undefined, "2026-07")).toEqual([]);
  });

  it("com empresa, só os documentos dela", async () => {
    const { docsDoPeriodo } = await import("@/lib/apuracaoStore");
    expect(docsDoPeriodo("entradas", "EMP-A", "2026-07").map((d) => d.id)).toEqual(["A1", "A2"]);
    expect(docsDoPeriodo("entradas", "EMP-B", "2026-07").map((d) => d.id)).toEqual(["B1"]);
    expect(docsDoPeriodo("entradas", "EMP-X", "2026-07")).toEqual([]);
  });

  it("useDocsFiscais: sem empresa não lista nada; com empresa lista a dela", async () => {
    const { useDocsFiscais } = await import("@/lib/fiscalStore");
    expect(renderHook(() => useDocsFiscais("entradas", null, ["2026-07"])).result.current).toEqual([]);
    expect(renderHook(() => useDocsFiscais("entradas", "EMP-B", ["2026-07"])).result.current.map((d) => d.id)).toEqual(["B1"]);
  });
});

describe("escrituração e cadastros da empresa", () => {
  it("linhas da escrituração não vazam sem empresa", async () => {
    const { linhasDoPeriodo, useEscrituracao } = await import("@/lib/escrituracaoStore");
    expect(linhasDoPeriodo("livro-entradas", null, "2026-07")).toEqual([]);
    expect(linhasDoPeriodo("livro-entradas", "EMP-A", "2026-07").map((l) => l.id)).toEqual(["L1"]);
    expect(renderHook(() => useEscrituracao("livro-entradas", null, "2026-07")).result.current).toEqual([]);
  });

  it("inscrições/certificados/pagamentos não vazam sem empresa", async () => {
    const { loadRegistros } = await import("@/lib/empresaDadosStore");
    expect(loadRegistros("certificados", null)).toEqual([]);
    expect(loadRegistros("certificados", "EMP-A").map((r) => r.id)).toEqual(["C1"]);
  });
});
