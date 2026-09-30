/**
 * Regressão: abrir o sistema pela primeira vez em um navegador (ou aba anônima, ou
 * depois de limpar os dados do navegador) NUNCA pode apagar dados da nuvem.
 *
 * Bug original: o ContabilShell executava, a cada abertura, uma rotina de "reset único"
 * controlada por uma flag no localStorage (por navegador, não por usuário). Em qualquer
 * navegador sem a flag, ela apagava as empresas do usuário na nuvem (tabela `empresas`)
 * e ligava o modo prática sozinha.
 *
 * O Supabase é totalmente simulado aqui: nada chega ao backend real.
 */
import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nuvem = vi.hoisted(() => ({
  /** tabelas em que algum DELETE foi disparado */
  apagadas: [] as string[],
  /** tabelas que foram consultadas (SELECT) */
  consultadas: [] as string[],
  empresas: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      cnpj: "12.345.678/0001-90",
      razao: "Empresa Exemplo Ltda",
      regime: "Simples Nacional",
      atividade: "Confecção de artigos do vestuário",
      status: "Ativa",
      raw: {},
      created_at: "2026-02-01T00:00:00Z",
    },
  ],
}));

vi.mock("@/integrations/supabase/client", () => {
  const USUARIO = { id: "user-1", email: "teste@exemplo.com.br", user_metadata: {} };

  /** Query builder falso: qualquer encadeamento (.select().eq().order()…) vira uma Promise. */
  const consulta = (resultado: { data: unknown; error: null }): unknown => {
    const promessa = Promise.resolve(resultado);
    const builder: unknown = new Proxy(function () {}, {
      get(_alvo, prop) {
        if (prop === "then") return promessa.then.bind(promessa);
        return () => builder;
      },
    });
    return builder;
  };

  return {
    supabase: {
      auth: {
        getUser: async () => ({ data: { user: USUARIO }, error: null }),
        getSession: async () => ({ data: { session: { user: USUARIO, access_token: "t" } } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: async () => ({ error: null }),
      },
      functions: { invoke: async () => ({ data: {}, error: null }) },
      from: (tabela: string) => ({
        select: () => {
          nuvem.consultadas.push(tabela);
          return consulta({ data: tabela === "empresas" ? nuvem.empresas : [], error: null });
        },
        upsert: () => consulta({ data: null, error: null }),
        insert: () => consulta({ data: null, error: null }),
        update: () => consulta({ data: null, error: null }),
        delete: () => {
          nuvem.apagadas.push(tabela);
          return consulta({ data: null, error: null });
        },
      }),
    },
  };
});

import ContabilShell from "@/components/ContabilShell";
import { CompetenciaProvider } from "@/lib/competencia";
import { EmpresaProvider } from "@/lib/empresaAtual";
import { setPraticaAtiva } from "@/lib/praticaStore";
import { forcarLimpezaBaseReal } from "@/lib/resetBase";

describe("primeiro acesso em um navegador novo", () => {
  beforeEach(() => {
    localStorage.clear(); // navegador "virgem": sem nenhuma flag
    setPraticaAtiva(false); // o estado do modo prática também vive em memória no módulo
    nuvem.apagadas.length = 0;
    nuvem.consultadas.length = 0;
  });

  it("não apaga as empresas da nuvem nem liga o modo prática sozinho", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <CompetenciaProvider>
          <EmpresaProvider>
            <ContabilShell />
          </EmpresaProvider>
        </CompetenciaProvider>
      </MemoryRouter>,
    );

    // 1) a sincronização inicial com a nuvem acontece…
    await waitFor(() => expect(nuvem.consultadas).toContain("empresas"));
    // 2) …e damos tempo para qualquer rotina automática de "limpeza" disparar
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    // nenhum DELETE foi enviado ao banco
    expect(nuvem.apagadas).toEqual([]);
    // o modo prática não foi ligado escondido
    expect(localStorage.getItem("uc:pratica:ativo")).not.toBe("1");
    // e a empresa da nuvem continua disponível para o usuário
    expect((await screen.findAllByText("Empresa Exemplo Ltda")).length).toBeGreaterThan(0);
  });
});

describe("ação manual 'Isolar dados (Real → Prática)'", () => {
  beforeEach(() => {
    localStorage.clear();
    setPraticaAtiva(false);
    nuvem.apagadas.length = 0;
  });

  it("continua disponível: só roda quando o usuário confirma, e aí sim limpa a base real", async () => {
    const ok = await forcarLimpezaBaseReal();

    expect(ok).toBe(true);
    // Também apaga a cópia na nuvem dos cadastros próprios e lançamentos (a cópia local foi para a prática).
    expect(nuvem.apagadas).toEqual(["empresas", "contabil_registros"]);
    expect(localStorage.getItem("uc:pratica:ativo")).toBe("1");
  });
});
