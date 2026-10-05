import { beforeEach, describe, expect, it } from "vitest";
import { setPraticaAtiva } from "@/lib/praticaStore";
import {
  alternarStatusLembreteSimplesMei,
  listarFaturamentosSimplesMei,
  listarLembretesSimplesMei,
  removerFaturamentoSimplesMei,
  salvarFaturamentoSimplesMei,
  salvarLembretesSimplesMei,
} from "@/lib/simplesMeiStore";

beforeEach(() => {
  localStorage.clear();
  setPraticaAtiva(false);
});

describe("controle simplificado Simples & MEI", () => {
  it("registra faturamento por empresa e competência e permite remover", () => {
    const primeiro = salvarFaturamentoSimplesMei({
      empresaId: "EMP-SN",
      data: "2026-10-12",
      tipo: "Serviços",
      descricao: "Serviços prestados",
      valor: 1234.567,
    });
    salvarFaturamentoSimplesMei({
      empresaId: "EMP-MEI",
      data: "2026-09-04",
      tipo: "Comércio/indústria",
      descricao: "Venda de produtos",
      valor: 500,
    });

    expect(primeiro).toMatchObject({ empresaId: "EMP-SN", competencia: "2026-10", valor: 1234.57 });
    expect(listarFaturamentosSimplesMei()).toHaveLength(2);
    removerFaturamentoSimplesMei(primeiro.id);
    expect(listarFaturamentosSimplesMei()).toEqual([expect.objectContaining({ empresaId: "EMP-MEI" })]);
  });

  it("valida empresa, data, descrição e valor antes de gravar", () => {
    expect(() => salvarFaturamentoSimplesMei({
      empresaId: "",
      data: "2026-02-30",
      tipo: "Outro",
      descricao: " ",
      valor: -1,
    })).toThrow("Selecione uma empresa.");
    expect(() => salvarFaturamentoSimplesMei({
      empresaId: "EMP-SN",
      data: "2026-02-30",
      tipo: "Outro",
      descricao: "Receita",
      valor: 10,
    })).toThrow("Informe uma data válida.");
    expect(() => salvarFaturamentoSimplesMei({
      empresaId: "EMP-SN",
      data: "2026-02-10",
      tipo: "Outro",
      descricao: "Receita",
      valor: 0,
    })).toThrow("O valor deve ser maior que zero.");
    expect(listarFaturamentosSimplesMei()).toEqual([]);
  });

  it("gera lembretes idempotentes por empresa e período e permite concluir/reabrir", () => {
    const entrada = {
      empresaId: "EMP-MEI",
      periodo: "2026-10",
      titulo: "Conferir pagamento do DAS-MEI",
      vencimento: "",
      observacao: "Confirmar no portal oficial.",
    };
    expect(salvarLembretesSimplesMei([entrada, entrada])).toEqual({ adicionados: 1, existentes: 1 });
    const [lembrete] = listarLembretesSimplesMei();
    expect(lembrete.status).toBe("Pendente");

    alternarStatusLembreteSimplesMei(lembrete.id);
    expect(listarLembretesSimplesMei()[0].status).toBe("Concluída");
    alternarStatusLembreteSimplesMei(lembrete.id);
    expect(listarLembretesSimplesMei()[0].status).toBe("Pendente");
  });

  it("mantém os dados do modo prática isolados dos dados reais", () => {
    salvarFaturamentoSimplesMei({
      empresaId: "EMP-SN",
      data: "2026-10-01",
      tipo: "Comércio/indústria",
      descricao: "Base real",
      valor: 100,
    });

    setPraticaAtiva(true);
    salvarFaturamentoSimplesMei({
      empresaId: "EMP-SN",
      data: "2026-10-02",
      tipo: "Comércio/indústria",
      descricao: "Base prática",
      valor: 200,
    });
    expect(listarFaturamentosSimplesMei().map((item) => item.descricao)).toEqual(["Base prática"]);

    setPraticaAtiva(false);
    expect(listarFaturamentosSimplesMei().map((item) => item.descricao)).toEqual(["Base real"]);
  });
});
