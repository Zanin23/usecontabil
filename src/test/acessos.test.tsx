/**
 * Liberar/bloquear acesso (achados P4 e P3 da validação funcional).
 * A tela gravava direto em `user_roles`, mas a migration 20260630004049 revogou INSERT/UPDATE/DELETE
 * nessa tabela para o usuário logado — "Liberar" sempre falhava e nenhum usuário novo saía de
 * "Acesso pendente". Agora: Liberar → RPC add_admin_by_email; Bloquear → função admin-usuarios.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { chamadasSupabase, estadoFalso, funcoesFalsas, limparSupabaseFalso, rpcFalso, tabelasFalsas } from "./supabaseFalso";

vi.mock("@/integrations/supabase/client", async () => (await import("./supabaseFalso")).moduloSupabaseFalso());
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

const linha = (id: string, authId: string, nome: string, email: string, ativo = true) => ({
  id, auth_user_id: authId, nome, email, perfil: "Consulta", cargo: "", permissoes: [], duplo_fator: false, ativo,
  ultimo_acesso: null, observacao: null, criado_em: "2026-07-01T00:00:00Z",
});

function preparar({ admins = ["u-admin"], extraBloqueado = false }: { admins?: string[]; extraBloqueado?: boolean } = {}) {
  limparSupabaseFalso();
  Object.values(toast).forEach((f) => f.mockClear());
  estadoFalso.usuario = { id: "u-admin", email: "admin@exemplo.com.br", user_metadata: { display_name: "Admin Teste" } };
  const comOutro = admins.includes("u-outro");
  tabelasFalsas.profiles = [
    { id: "u-admin", display_name: "Admin Teste" },
    { id: "u-pend", display_name: "Pessoa Pendente" },
    ...(comOutro ? [{ id: "u-outro", display_name: "Outro Admin" }] : []),
  ];
  tabelasFalsas.user_roles = admins.map((id) => ({ user_id: id, role: "admin" }));
  funcoesFalsas["admin-usuarios"] = (corpo) => {
    const acao = (corpo as { action?: string })?.action;
    if (acao === "bloquear") return { data: { ativo: false }, error: null };
    return { data: { admin: true, usuarios: [linha("row-admin", "u-admin", "Admin Teste", "admin@exemplo.com.br"), linha("row-pend", "u-pend", "Pessoa Pendente", "pendente@exemplo.com.br"), ...(comOutro ? [linha("row-outro", "u-outro", "Outro Admin", "outro@exemplo.com.br", !extraBloqueado)] : [])] }, error: null };
  };
  rpcFalso.add_admin_by_email = () => ({ data: "u-pend", error: null });
}

async function abrir() {
  const { default: ListaAcessos } = await import("@/components/contabil/ListaAcessos");
  render(<ListaAcessos />);
  await screen.findByText("Pessoa Pendente");
}

afterEach(() => vi.restoreAllMocks());

describe("Configurações › Usuários", () => {
  it("lista e-mail, situação e marca a própria conta", async () => {
    preparar();
    await abrir();
    expect(screen.getByText("pendente@exemplo.com.br")).toBeInTheDocument();
    expect(screen.getByText("PENDENTE")).toBeInTheDocument();
    expect(screen.getByText("(você)")).toBeInTheDocument();
  });

  it("Liberar chama a função add_admin_by_email e NÃO escreve em user_roles pelo navegador", async () => {
    preparar();
    await abrir();
    fireEvent.click(screen.getByRole("button", { name: "Liberar" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Acesso liberado", expect.anything()));
    const rpc = chamadasSupabase.find((c) => c.tabela === "rpc:add_admin_by_email");
    expect(rpc?.args[0]).toEqual({ _email: "pendente@exemplo.com.br" });
    expect(chamadasSupabase.filter((c) => c.tabela === "user_roles" && c.metodo !== "select")).toEqual([]); // antes: insert/delete direto → 403
  });

  it("mostra a mensagem do banco quando a liberação é recusada", async () => {
    preparar();
    rpcFalso.add_admin_by_email = () => ({ data: null, error: { message: "Only admins can add admins" } });
    await abrir();
    fireEvent.click(screen.getByRole("button", { name: "Liberar" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Only admins can add admins")));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("não deixa bloquear a própria conta nem o único administrador ativo", async () => {
    preparar({ admins: ["u-admin"] });
    await abrir();
    const bloquear = screen.getAllByRole("button", { name: "Bloquear" });
    expect(bloquear).toHaveLength(1); // só o admin tem papel; o pendente tem "Liberar"
    expect(bloquear[0]).toBeDisabled();
    expect(bloquear[0]).toHaveAttribute("title", expect.stringMatching(/própria conta/));
  });

  it("bloqueia outro administrador pela função admin-usuarios, com confirmação", async () => {
    preparar({ admins: ["u-admin", "u-outro"] });
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    await abrir();
    const botoes = screen.getAllByRole("button", { name: "Bloquear" });
    const outro = botoes.find((b) => !b.hasAttribute("disabled"))!;
    fireEvent.click(outro);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Acesso bloqueado"));
    expect(confirmar).toHaveBeenCalledWith(expect.stringMatching(/Bloquear o acesso de Outro Admin/));
    const chamada = chamadasSupabase.find((c) => c.tabela === "fn:admin-usuarios" && (c.args[0] as { action?: string }).action === "bloquear");
    expect(chamada?.args[0]).toMatchObject({ action: "bloquear", id: "row-outro" });
  });

  it("conta bloqueada aparece como BLOQUEADO e oferece Desbloquear", async () => {
    preparar({ admins: ["u-admin", "u-outro"], extraBloqueado: true });
    await abrir();
    expect(screen.getByText("BLOQUEADO")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desbloquear" })).toBeEnabled();
  });
});
