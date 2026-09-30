/**
 * Achado H3: uma conta SEM nenhuma empresa já tinha 12 notificações não lidas, incluindo
 * "EFD-Contribuições em atraso — Crítico", "DCTFWeb em atraso — Crítico"…
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { limparSupabaseFalso } from "./supabaseFalso";

vi.mock("@/integrations/supabase/client", async () => (await import("./supabaseFalso")).moduloSupabaseFalso());

beforeEach(() => {
  localStorage.clear();
  limparSupabaseFalso();
  vi.resetModules();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-30T12:00:00"));
  localStorage.setItem(
    "usecontabil.empresas.cache.v1",
    JSON.stringify([{ id: "EMP-1", cnpj: "11.222.333/0001-81", razao: "Confecções Exemplo Ltda", regime: "Simples Nacional", atividade: "—", status: "Ativa", createdAt: "2026-01-01T00:00:00Z", raw: {} }]),
  );
});
afterEach(() => vi.useRealTimers());

describe("gerarNotificacoes", () => {
  it("sem empresa, não gera alertas de obrigações acessórias em atraso", async () => {
    const { gerarNotificacoes } = await import("@/lib/notificacoesStore");
    const obrigacoes = gerarNotificacoes(null, "2026-07").filter((n) => n.id.startsWith("obr-"));
    expect(obrigacoes).toEqual([]); // antes: EFD-Contribuições, DCTFWeb, EFD-Reinf, GIA/DeSTDA/ISS… "em atraso"
  });

  it("com empresa, os alertas de obrigações continuam sendo gerados", async () => {
    const { gerarNotificacoes } = await import("@/lib/notificacoesStore");
    const obrigacoes = gerarNotificacoes("EMP-1", "2026-07").filter((n) => n.id.startsWith("obr-atraso-"));
    expect(obrigacoes.length).toBeGreaterThan(0);
    expect(obrigacoes.every((n) => n.nivel === "critico")).toBe(true);
  });
});
