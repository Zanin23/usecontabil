import { describe, expect, it } from "vitest";
import {
  lerParametrosRotaDados,
  rotaDaApuracao,
  rotaDasGuiasDaApuracao,
  ROTAS_DADOS,
} from "@/lib/rotasDados";
import type { MotorSlug } from "@/lib/apuracaoStore";

const CONTEXTO = { empresaId: "EMP-1", competencia: "2026-07" };

describe("rotas de dados entre apurações e guias", () => {
  it("define uma origem e um grupo de guias válidos para cada motor", () => {
    const motores: MotorSlug[] = ["pis-cofins", "iss", "irpj-csll", "simples-nacional", "retencoes"];
    expect(motores.map((motor) => ROTAS_DADOS[motor].apuracao)).toEqual([
      "/fiscal/apuracoes/pis-cofins",
      "/fiscal/apuracoes/iss",
      "/fiscal/apuracoes/irpj-csll",
      "/fiscal/apuracoes/simples-nacional",
      "/fiscal/apuracoes/retencoes",
    ]);
    expect(ROTAS_DADOS.iss.grupoGuias).toBe("estaduais");
    expect(motores.filter((motor) => motor !== "iss").every((motor) => ROTAS_DADOS[motor].grupoGuias === "darf")).toBe(true);
  });

  it("encaminha cada apuração ao painel de guias com empresa, competência e filtro de origem", () => {
    const rota = rotaDasGuiasDaApuracao("pis-cofins", CONTEXTO);
    const url = new URL(rota, "https://usecontabil.test");
    expect(url.pathname).toBe("/fiscal/guias/darf");
    expect(url.searchParams.get("motor")).toBe("pis-cofins");
    expect(url.searchParams.get("empresaId")).toBe("EMP-1");
    expect(url.searchParams.get("competencia")).toBe("2026-07");
  });

  it("devolve a guia à tela da apuração de origem com o mesmo contexto", () => {
    const rota = rotaDaApuracao("iss", CONTEXTO);
    const url = new URL(rota, "https://usecontabil.test");
    expect(url.pathname).toBe("/fiscal/apuracoes/iss");
    expect(url.searchParams.get("empresaId")).toBe("EMP-1");
    expect(url.searchParams.get("competencia")).toBe("2026-07");
  });

  it("ignora motor e competência inválidos ao ler links compartilhados", () => {
    expect(lerParametrosRotaDados("?motor=nao-existe&empresaId=%20&competencia=2026-13")).toEqual({
      motor: null,
      empresaId: null,
      competencia: null,
    });
    expect(lerParametrosRotaDados("motor=iss&empresaId=EMP-2&competencia=2026-06")).toEqual({
      motor: "iss",
      empresaId: "EMP-2",
      competencia: "2026-06",
    });
  });
});
