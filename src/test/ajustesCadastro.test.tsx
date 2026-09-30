/**
 * Pequenos furos do cadastro/seleção de empresa e da competência (achados EM3 e C2).
 *  - EM3: no primeiro acesso de um navegador (cache de empresas vazio) a seleção salva era apagada
 *    e a empresa escolhida nunca voltava — caía sempre na primeira da lista.
 *  - C2: a lista de competências terminava em dez/2027.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", async () => (await import("./supabaseFalso")).moduloSupabaseFalso());

const linhaNuvem = (id: string, razao: string) => ({ id, cnpj: "11.222.333/0001-81", razao, regime: "Simples Nacional", atividade: "—", status: "Ativa", raw: {}, created_at: "2026-02-01T00:00:00Z" });

let falso: typeof import("./supabaseFalso");
beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  // importado DEPOIS do reset: é a mesma instância que o mock do cliente Supabase usa nos componentes
  falso = await import("./supabaseFalso");
  falso.limparSupabaseFalso();
});

describe("seleção da empresa em navegador novo (EM3)", () => {
  it("restaura a empresa salva quando as empresas chegam da nuvem (cache local vazio)", async () => {
    falso.tabelasFalsas.empresas = [linhaNuvem("EMP-1", "Primeira Ltda"), linhaNuvem("EMP-2", "Segunda Ltda")];
    localStorage.setItem("usecontabil.empresaAtual.v1", "EMP-2"); // escolhida antes; cache de empresas vazio
    const { EmpresaProvider, useEmpresaAtual } = await import("@/lib/empresaAtual");
    function Mostra() { const { empresa } = useEmpresaAtual(); return <span data-testid="atual">{empresa?.razao ?? "nenhuma"}</span>; }
    render(<EmpresaProvider><Mostra /></EmpresaProvider>);
    await waitFor(() => expect(screen.getByTestId("atual")).toHaveTextContent("Segunda Ltda")); // antes: "Primeira Ltda"
    expect(localStorage.getItem("usecontabil.empresaAtual.v1")).toBe("EMP-2");
  });

  it("se a empresa salva não existe mais, cai na primeira", async () => {
    falso.tabelasFalsas.empresas = [linhaNuvem("EMP-1", "Primeira Ltda")];
    localStorage.setItem("usecontabil.empresaAtual.v1", "EMP-APAGADA");
    const { EmpresaProvider, useEmpresaAtual } = await import("@/lib/empresaAtual");
    function Mostra() { const { empresa } = useEmpresaAtual(); return <span data-testid="atual">{empresa?.razao ?? "nenhuma"}</span>; }
    render(<EmpresaProvider><Mostra /></EmpresaProvider>);
    await waitFor(() => expect(screen.getByTestId("atual")).toHaveTextContent("Primeira Ltda"));
  });
});

describe("lista de competências (C2)", () => {
  it("vai de jan/2024 a dez/2030, sem buracos", async () => {
    const { COMPETENCIAS } = await import("@/lib/competencia");
    expect(COMPETENCIAS).toHaveLength(84);
    expect(COMPETENCIAS[0]).toBe("2024-01");
    expect(COMPETENCIAS.at(-1)).toBe("2030-12");
    expect(COMPETENCIAS).toContain("2026-07");
    expect(new Set(COMPETENCIAS).size).toBe(84);
  });
});
