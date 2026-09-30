/**
 * Trilha de auditoria com o usuário real (achado AUD1): os logs traziam autores fixos no código
 * ("M. Andrade" em apurações e obrigações, "Sistema" nas guias, "Você" na conciliação,
 * "Controladoria" nos cadastros de usuários).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { limparSupabaseFalso } from "./supabaseFalso";

vi.mock("@/integrations/supabase/client", async () => (await import("./supabaseFalso")).moduloSupabaseFalso());

const sessao = (user: Record<string, unknown>) => localStorage.setItem("sb-abcdefgh-auth-token", JSON.stringify({ access_token: "t", user }));

beforeEach(() => {
  localStorage.clear();
  limparSupabaseFalso();
  vi.resetModules();
});

describe("usuarioAtual()", () => {
  it("usa o nome de exibição da sessão; depois nome completo; depois e-mail", async () => {
    const { usuarioAtual } = await import("@/lib/usuarioAtual");
    sessao({ email: "maria@exemplo.com.br", user_metadata: { display_name: "Maria Contadora", full_name: "Maria da Silva" } });
    expect(usuarioAtual()).toBe("Maria Contadora");
    sessao({ email: "maria@exemplo.com.br", user_metadata: { full_name: "Maria da Silva" } });
    expect(usuarioAtual()).toBe("Maria da Silva");
    sessao({ email: "maria@exemplo.com.br", user_metadata: {} });
    expect(usuarioAtual()).toBe("maria@exemplo.com.br");
  });

  it("sem sessão ou com sessão ilegível, avisa que não há usuário identificado (em vez de inventar um nome)", async () => {
    const { usuarioAtual, USUARIO_NAO_IDENTIFICADO } = await import("@/lib/usuarioAtual");
    expect(usuarioAtual()).toBe(USUARIO_NAO_IDENTIFICADO);
    localStorage.setItem("sb-abcdefgh-auth-token", "{isto não é json");
    expect(usuarioAtual()).toBe(USUARIO_NAO_IDENTIFICADO);
  });
});

describe("registro de ações", () => {
  it("apuração: o log e o responsável carregam quem está logado (antes: \"M. Andrade\")", async () => {
    sessao({ email: "joao@exemplo.com.br", user_metadata: { display_name: "João Fiscal" } });
    const { setEstado, getEstado } = await import("@/lib/apuracaoStore");
    setEstado("simples-nacional", "EMP-1", "2026-07", {}, { acao: "Apuração fechada", detalhe: "teste" });
    const estado = getEstado("simples-nacional", "EMP-1", "2026-07");
    expect(estado.log[0]).toMatchObject({ usuario: "João Fiscal", acao: "Apuração fechada" });
    expect(estado.responsavel).toBe("João Fiscal");
  });

  it("nenhum autor fixo sobrou nos motores de apuração e obrigações", async () => {
    const fs = await import("node:fs");
    for (const arq of ["src/lib/apuracaoStore.ts", "src/lib/obrigacoesStore.ts", "src/lib/guiasStore.ts", "src/lib/conciliacaoStore.ts"]) {
      expect(fs.readFileSync(arq, "utf8"), arq).not.toMatch(/usuario: "(M\. Andrade|Sistema|Você)"|USUARIO = "/);
    }
  });
});
