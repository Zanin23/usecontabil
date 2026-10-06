/** Fumaça do app real: monta o App inteiro (shell + providers + rotas) no dashboard. */

import { cleanup, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", async () =>
  (await import("./supabaseFalso")).moduloSupabaseFalso(),
);

async function prepararAmbiente() {
  vi.resetModules();
  localStorage.clear();
  const { limparSupabaseFalso, tabelasFalsas, estadoFalso } = await import("./supabaseFalso");
  limparSupabaseFalso();
  estadoFalso.usuario = { id: "user-1", email: "teste@exemplo.com.br", user_metadata: { display_name: "Teste" } };
  tabelasFalsas.user_roles = [{ id: "r1", user_id: "user-1", role: "admin" }];
  tabelasFalsas.profiles = [{ id: "user-1", display_name: "Teste" }];
  localStorage.setItem("usecontabil_competencia", "2026-07");
  const { saveEmpresa } = await import("@/lib/empresasStore");
  await saveEmpresa({
    id: "EMP-1", cnpj: "11.222.333/0001-81", razao: "Confecções Exemplo Ltda",
    regime: "Simples Nacional", atividade: "Confecção", status: "Ativa",
    createdAt: "2026-01-01T00:00:00Z", raw: { cidade: "São Paulo", uf: "SP" },
  });
  localStorage.setItem("usecontabil.empresaAtual.v1", "EMP-1");
}

describe("Fumaça › o app real abre no painel", () => {
  beforeEach(prepararAmbiente);
  it("monta o painel da competência sem erro", async () => {
    window.history.pushState({}, "", "/dashboard");
    const { default: App } = await import("@/App");
    render(<App />);
    await waitFor(() => expect(document.querySelector("h1")?.textContent).toBeTruthy(), { timeout: 20_000 });
    expect(document.querySelector("h1")?.textContent).toMatch(/Visão geral/);
    cleanup();
  });
});
