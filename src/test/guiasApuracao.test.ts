import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listarGuias, useGuias } from "@/lib/guiasStore";
import { saveDoc, type DocFiscal } from "@/lib/fiscalStore";
import { setEstado } from "@/lib/apuracaoStore";
import { setPraticaAtiva } from "@/lib/praticaStore";
import type { EmpresaRecord } from "@/lib/empresasStore";

const fixtures = vi.hoisted(() => ({ empresas: new Map<string, EmpresaRecord>() }));

vi.mock("@/lib/empresaAtual", () => ({
  getEmpresa: (id: string) => fixtures.empresas.get(id),
  useEmpresaAtual: () => ({ empresa: fixtures.empresas.get("EMP-1"), empresaId: "EMP-1", empresas: [], setEmpresaId: vi.fn() }),
}));

vi.mock("@/lib/empresasStore", () => ({
  getEmpresa: (id: string) => fixtures.empresas.get(id),
}));

const EMP = "EMP-1";
const OUTRA_EMP = "EMP-2";
const COMP = "2026-07";

type DadoDoc = Partial<DocFiscal> & Pick<DocFiscal, "id" | "empresaId" | "competencia">;

function documento(dados: DadoDoc): DocFiscal {
  return {
    data: "15/07/2026",
    status: "Autorizada",
    valor: "100.000,00",
    cfop: "5102",
    numero: "1",
    participante: "Cliente Teste",
    ...dados,
  } as DocFiscal;
}

function saida(id = "SAI-1", empresaId = EMP, competencia = COMP, valor = "100.000,00") {
  saveDoc("saidas", documento({ id, empresaId, competencia, valor, status: "Autorizada" }));
}

function servicoPrestado() {
  saveDoc("servicos-prestados", documento({
    id: "SER-P-1",
    empresaId: EMP,
    competencia: COMP,
    status: "Emitida",
    valor: "10.000,00",
    iss: "500,00",
    issRetido: "0,00",
    aliquota: "5,00%",
    municipio: "São Paulo",
  }));
}

function servicoTomadoComRetencoes() {
  saveDoc("servicos-tomados", documento({
    id: "SER-T-1",
    empresaId: EMP,
    competencia: COMP,
    status: "Escriturado",
    valor: "10.000,00",
    irrf: "150,00",
    pccss: "465,00",
    inss: "1.100,00",
    issRetido: "500,00",
  }));
}

function empresa(regime: string, id = EMP) {
  fixtures.empresas.set(id, {
    id,
    razao: `Empresa ${id}`,
    cnpj: "11.222.333/0001-81",
    regime,
    atividade: "Comércio",
    status: "Ativa",
    createdAt: "2026-01-01T00:00:00.000Z",
    raw: {},
  });
}

beforeEach(() => {
  localStorage.clear();
  setPraticaAtiva(false);
  fixtures.empresas.clear();
  empresa("Lucro Presumido");
  empresa("Lucro Presumido", OUTRA_EMP);
});

describe("guias derivadas das apurações fiscais", () => {
  it("gera DARFs com os valores e a competência calculados pelo motor PIS/COFINS", () => {
    saida();
    const guias = listarGuias(EMP, COMP);
    const pis = guias.find((g) => g.origemMotor === "pis-cofins" && g.codigoReceita === "8109");
    const cofins = guias.find((g) => g.origemMotor === "pis-cofins" && g.codigoReceita === "2172");

    expect(pis?.valorOriginal).toBeCloseTo(650, 2);
    expect(cofins?.valorOriginal).toBeCloseTo(3000, 2);
    expect(pis).toMatchObject({ grupo: "darf", competencia: COMP, origemMotor: "pis-cofins" });
    expect(pis?.vencimento).toBe("2026-08-25");
    expect(pis?.memoria[0]).toMatchObject({ campo: expect.any(String), origem: "Apuração de PIS / COFINS" });
    expect(guias.some((g) => g.tipo === "DAS")).toBe(false);
  });

  it("encaminha guias de ISS ao grupo municipal e mantém município e memória de origem", () => {
    servicoPrestado();
    const iss = listarGuias(EMP, COMP).find((g) => g.origemMotor === "iss" && g.tributo === "ISS");

    expect(iss).toMatchObject({
      grupo: "estaduais",
      tipo: "ISS",
      orgao: "Prefeitura de São Paulo",
      origemMotor: "iss",
      origemMotores: ["iss"],
    });
    expect(iss?.valorOriginal).toBe(500);
    expect(iss?.memoria.some((m) => m.regra?.includes("Base"))).toBe(true);
  });

  it("gera o DAS no regime Simples e não duplica PIS/COFINS nem IRPJ/CSLL", () => {
    empresa("Simples Nacional");
    saida("SAI-SN", EMP, COMP, "10.000,00");
    const guias = listarGuias(EMP, COMP);
    const das = guias.find((g) => g.tipo === "DAS");

    expect(das).toMatchObject({ grupo: "darf", tributo: "Simples Nacional", origemMotor: "simples-nacional" });
    expect(das?.valorOriginal).toBeGreaterThan(0);
    expect(guias.some((g) => g.origemMotor === "pis-cofins" || g.origemMotor === "irpj-csll")).toBe(false);
  });

  it("deduplica o ISS retido compartilhado sem perder as duas rotas de origem", () => {
    servicoTomadoComRetencoes();
    const guias = listarGuias(EMP, COMP);
    const issRetido = guias.filter((g) => g.grupo === "estaduais" && g.tributo === "ISS");

    expect(issRetido).toHaveLength(1);
    expect(issRetido[0].valorOriginal).toBe(500);
    expect(issRetido[0].origemMotor).toBe("iss");
    expect(issRetido[0].origemMotores).toEqual(["iss", "retencoes"]);
    expect(guias.some((g) => g.origemMotor === "retencoes" && g.tributo === "IRRF")).toBe(true);
  });

  it("isola empresa e competência e não exibe guias zeradas", () => {
    saida("SAI-A", EMP, "2026-07", "10.000,00");
    saida("SAI-B", OUTRA_EMP, "2026-07", "20.000,00");
    saida("SAI-C", EMP, "2026-06", "5.000,00");

    expect(listarGuias(EMP, "2026-07").every((g) => g.empresaId === EMP && g.competencia === "2026-07")).toBe(true);
    expect(listarGuias(OUTRA_EMP, "2026-07").every((g) => g.empresaId === OUTRA_EMP)).toBe(true);
    expect(listarGuias(EMP, "2026-08")).toEqual([]);
    expect(listarGuias(null, "2026-07")).toEqual([]);
    expect(listarGuias(EMP, "2026-05")).toEqual([]);
  });

  it("atualiza a lista de guias quando uma tela fiscal grava um documento", async () => {
    const { result } = renderHook(() => useGuias(EMP, COMP));
    expect(result.current).toEqual([]);

    act(() => saida("SAI-EVENTO", EMP, COMP, "12.000,00"));

    await waitFor(() => expect(result.current.some((g) => g.codigoReceita === "8109")).toBe(true));
  });

  it("recalcula as guias quando a apuração muda e mantém a identidade da guia", async () => {
    saida("SAI-AJUSTE", EMP, COMP, "10.000,00");
    const { result } = renderHook(() => useGuias(EMP, COMP));
    const antes = result.current.find((g) => g.codigoReceita === "8109");
    expect(antes).toBeDefined();

    act(() => setEstado("pis-cofins", EMP, COMP, {
      ajustes: [{
        id: "AJ-1",
        tipo: "Adição",
        descricao: "Ajuste de teste",
        valor: "1.000,00",
        fundamento: "Teste",
        criadoEm: "2026-07-31T00:00:00.000Z",
      }],
    }));

    await waitFor(() => {
      const depois = result.current.find((g) => g.codigoReceita === "8109");
      expect(depois?.id).toBe(antes?.id);
      expect(depois?.valorOriginal).toBeGreaterThan(antes!.valorOriginal);
    });
  });
});
