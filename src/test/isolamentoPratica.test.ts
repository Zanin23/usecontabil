/**
 * Item 13 da análise: o modo prática precisa isolar todas as coleções.
 *
 * Cada store escreve na chave do modo atual (`getStorageSuffix()`), então o que é gravado estudando
 * não aparece na produção — e o que já existia na produção não é lido no modo prática.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reiniciarMemoria } from "./supabaseMemoria";

vi.mock("@/integrations/supabase/client", async () => (await import("./supabaseMemoria")).moduloSupabaseMemoria());

import { __reiniciarNuvemParaTestes } from "@/lib/nuvemColecoes";
import { getStorageSuffix, setPraticaAtiva } from "@/lib/praticaStore";

const EMP = "EMP-1";
const tem = (chave: string) => localStorage.getItem(chave) !== null;

beforeEach(() => {
  localStorage.clear();
  setPraticaAtiva(false);
  reiniciarMemoria();
  __reiniciarNuvemParaTestes();
});

describe("Modo prática isolado", () => {
  it("escreve as coleções na chave do modo atual, nunca na do outro modo", async () => {
    expect(getStorageSuffix()).toBe("");

    // Produção: a carga de exemplo do patrimônio, um ajuste de DRE e uma linha do financeiro.
    const { listarBens, salvarBem } = await import("@/lib/patrimonioStore");
    const { salvarAjuste } = await import("@/lib/dreStore");
    const { saveLinha } = await import("@/lib/financeiroStore");

    listarBens();
    salvarAjuste({ empresaId: EMP, competencia: "2026-07", linha: "cmv", historico: "Produção", valor: 123 });
    saveLinha("clientes" as never, { id: "prod-1", nome: "Cliente da produção" });

    expect(tem("usecontabil.adm.patrimonio.bens.v1")).toBe(true);
    expect(tem("usecontabil.dre.ajustes.v1")).toBe(true);
    expect(tem("usecontabil.financeiro.v1")).toBe(true);
    expect(tem("usecontabil.adm.patrimonio.bens.v1.pratica")).toBe(false);

    // Modo prática: as mesmas operações vão para as chaves `.pratica` e a produção fica intacta.
    setPraticaAtiva(true);
    expect(getStorageSuffix()).toBe(".pratica");

    const bensProducao = localStorage.getItem("usecontabil.adm.patrimonio.bens.v1");
    const ajustesProducao = localStorage.getItem("usecontabil.dre.ajustes.v1");
    const financeiroProducao = localStorage.getItem("usecontabil.financeiro.v1");

    salvarBem({ patrimonio: "PT-TREINO", descricao: "Bem de treino", valorAquisicao: 1_000, vidaUtilMeses: 12 });
    salvarAjuste({ empresaId: EMP, competencia: "2026-07", linha: "cmv", historico: "Treino", valor: 999 });
    saveLinha("clientes" as never, { id: "pratica-1", nome: "Cliente do treino" });

    expect(tem("usecontabil.adm.patrimonio.bens.v1.pratica")).toBe(true);
    expect(tem("usecontabil.dre.ajustes.v1.pratica")).toBe(true);
    expect(tem("usecontabil.financeiro.v1.pratica")).toBe(true);
    expect(localStorage.getItem("usecontabil.adm.patrimonio.bens.v1")).toBe(bensProducao);
    expect(localStorage.getItem("usecontabil.dre.ajustes.v1")).toBe(ajustesProducao);
    expect(localStorage.getItem("usecontabil.financeiro.v1")).toBe(financeiroProducao);
    // O bem de treino não aparece na produção.
    expect(localStorage.getItem("usecontabil.adm.patrimonio.bens.v1.pratica")).toContain("Bem de treino");
    expect(bensProducao ?? "").not.toContain("Bem de treino");
  });

  it("os registros de treino não vazam para a produção ao voltar o modo", async () => {
    setPraticaAtiva(true);
    const { saveLinha, loadLinhas } = await import("@/lib/financeiroStore");
    saveLinha("clientes" as never, { id: "pratica-1", nome: "Cliente do treino" });
    expect(loadLinhas("clientes" as never)).toHaveLength(1);

    setPraticaAtiva(false);
    expect(loadLinhas("clientes" as never)).toHaveLength(0);
    expect(tem("usecontabil.financeiro.v1")).toBe(false);
  });

  it("cobre os 11 stores do item 13 (chave do modo atual em todos eles)", async () => {
    setPraticaAtiva(true);
    const { registrarAcesso } = await import("@/lib/adminStore");
    const { setEstado } = await import("@/lib/apuracaoStore");
    const { fechar } = await import("@/lib/conciliacaoStore");
    const { listarContratos } = await import("@/lib/contratosStore");
    const { listarParametros } = await import("@/lib/controlesStore");
    const { saveRegistro } = await import("@/lib/empresaDadosStore");
    const { saveLinha: salvarLinhaEsc } = await import("@/lib/escrituracaoStore");
    const { salvarAjuste } = await import("@/lib/dreStore");
    const { saveLinha: salvarLinhaFin } = await import("@/lib/financeiroStore");
    const { saveFilial } = await import("@/lib/filiaisStore");
    const { listarBens } = await import("@/lib/patrimonioStore");

    registrarAcesso("Plano de contas", "Consulta");
    setEstado("pis-cofins", EMP, "2026-07", {});
    fechar("CTA-01", "2026-07");
    listarContratos();
    listarParametros();
    saveRegistro("cadastros" as never, { id: "r-1", empresaId: EMP, nome: "Treino" } as never);
    salvarLinhaEsc("livro-saidas", { id: "l-1", empresaId: EMP, competencia: "2026-07", numero: "1" });
    saveFilial({
      id: "f-1", nome: "Unidade de treino", tipo: "Filial", empresaId: EMP, cnpj: "", inscEstadual: "",
      cidade: "", uf: "SP", endereco: "", responsavel: "", email: "", telefone: "", centroCusto: "", status: "Ativa",
    });
    salvarAjuste({ empresaId: EMP, competencia: "2026-07", linha: "cmv", historico: "Treino", valor: 1 });
    salvarLinhaFin("clientes" as never, { id: "fin-1", nome: "Cliente do treino" });
    listarBens();

    const esperadas = [
      "usecontabil.admin.acessos.v1",
      "usecontabil.apuracoes.v1",
      "usecontabil:conciliacao",
      "usecontabil.adm.contratos.v1",
      "usecontabil.adm.controles.parametros.v1",
      "usecontabil.empresaDados.v1",
      "usecontabil.escrituracao.v1",
      "usecontabil.filiais.v1",
      "usecontabil.dre.ajustes.v1",
      "usecontabil.financeiro.v1",
      "usecontabil.adm.patrimonio.bens.v1",
    ];
    for (const chave of esperadas) {
      expect(tem(`${chave}.pratica`), chave).toBe(true);
      expect(tem(chave), chave).toBe(false);
    }
  });
});
