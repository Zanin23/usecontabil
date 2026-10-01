/**
 * Itens 14 e 16 da análise, no nível do motor:
 *
 * - 14: não existe "Reavaliação" no patrimônio (vedada desde a Lei 11.638/2007) — o retorno do bem
 *   baixado é registrado como "Estorno de baixa";
 * - 16: a GIA-SP/GIA-ST não é mais gerada e a obrigação federal é a DCTFWeb (a DCTF mensal foi
 *   substituída), nos catálogos e no gerador.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reiniciarMemoria } from "./supabaseMemoria";

vi.mock("@/integrations/supabase/client", async () => (await import("./supabaseMemoria")).moduloSupabaseMemoria());

import { __reiniciarNuvemParaTestes } from "@/lib/nuvemColecoes";
import { setPraticaAtiva } from "@/lib/praticaStore";
import { baixarBem, bensCalculados, estornarBaixa, listarMovimentos, salvarBem } from "@/lib/patrimonioStore";
import { CATALOGO, defDe, estadoObrPadrao, gerarObrigacao, type ObrEstado } from "@/lib/obrigacoesStore";

const EMP = "EMP-1";
const COMP = "2026-07";

beforeEach(() => {
  localStorage.clear();
  setPraticaAtiva(false);
  reiniciarMemoria();
  __reiniciarNuvemParaTestes();
});

describe("Patrimônio — estorno de baixa no lugar da reavaliação", () => {
  it("registra o retorno do bem como \"Estorno de baixa\"", () => {
    const bem = salvarBem({
      patrimonio: "PT-1", descricao: "Prensa hidráulica", empresaId: EMP,
      valorAquisicao: 24_000, vidaUtilMeses: 24, aquisicao: "2026-01-10", inicioOperacao: "2026-01-10",
    });
    bensCalculados(COMP, EMP);

    baixarBem(bem.id, { data: "2026-07-10", motivo: "Venda", valor: 8_000, documento: "NF-e 10 4471" }, COMP);
    expect(listarMovimentos()[0]).toMatchObject({ bemId: bem.id, tipo: "Baixa" });

    estornarBaixa(bem.id);
    const movimentos = listarMovimentos().filter((m) => m.bemId === bem.id);
    expect(movimentos[0].tipo).toBe("Estorno de baixa"); // antes: "Reavaliação"
    expect(movimentos.map((m) => m.tipo)).not.toContain("Reavaliação");
    expect(movimentos[0].descricao).toMatch(/retornou ao imobilizado/);
    expect(bensCalculados(COMP, EMP).find((b) => b.id === bem.id)?.situacao).not.toBe("Baixado");
  });
});

describe("Obrigações acessórias atualizadas", () => {
  const estado = (): ObrEstado => estadoObrPadrao("estaduais");

  it("não gera nada de GIA e cita as obrigações vigentes", () => {
    const geracao = gerarObrigacao("estaduais", EMP, COMP, estado());
    const texto = JSON.stringify(geracao);
    expect(texto).not.toMatch(/GIA/);
    expect(geracao.blocos.length).toBeGreaterThan(0);
    expect(geracao.resumo.some((r) => /UFs envolvidas/.test(r.label))).toBe(true);

    const estaduais = defDe("estaduais");
    expect(estaduais.sigla).not.toMatch(/GIA/);
    expect(estaduais.descricao).toMatch(/GIA-SP foi dispensada/i);
    expect(estaduais.submodulos.join(" ")).not.toMatch(/GIA/);
    expect(CATALOGO.map((o) => o.slug)).not.toContain("gia" as never);
  });

  it("a obrigação federal é a DCTFWeb (DCTF mensal não existe mais)", () => {
    const dctfweb = defDe("dctfweb");
    expect(dctfweb.titulo).toBe("DCTFWeb");
    expect(dctfweb.sigla).toBe("DCTFWeb");
    expect(CATALOGO.some((o) => o.sigla === "DCTF")).toBe(false);
    expect(CATALOGO.some((o) => /DCTF mensal/i.test(o.titulo) || /DCTF mensal/i.test(o.descricao))).toBe(false);
    expect(gerarObrigacao("dctfweb", EMP, COMP, estado()).blocos.length).toBeGreaterThan(0);
  });
});
