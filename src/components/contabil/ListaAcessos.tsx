import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/design-system/mj-design-system-db98fa";
import { supabase } from "@/integrations/supabase/client";
import { alternarUsuario, sincronizarUsuarios } from "@/lib/controlesStore";
import { displayNameFor, useAuthUser } from "@/lib/useAuthUser";

type LinhaAcesso = {
  id: string; // id da conta (profiles / auth.users)
  nome: string;
  email?: string;
  papeis: string[];
  usuarioId?: string; // linha em `usuarios` (Controles internos) — necessária para bloquear
  bloqueado: boolean;
};

/**
 * Controle de acesso (Configurações › Usuários).
 *
 * Por que não grava em `user_roles` pelo navegador: a migration 20260630004049 revogou
 * INSERT/UPDATE/DELETE nessa tabela para o usuário logado (só service_role e funções
 * SECURITY DEFINER escrevem). O botão antigo fazia insert/delete direto e sempre falhava com
 * "Erro ao liberar acesso" — nenhum usuário novo saía de "Acesso pendente".
 *  - Liberar  → função SQL `add_admin_by_email` (já existe e exige que quem chama seja admin).
 *  - Bloquear → ação `bloquear` da função de borda `admin-usuarios` (ban da conta de acesso).
 * Liberar concede o papel `admin` (o único que existe): acesso total ao sistema.
 */
export default function ListaAcessos() {
  const { user: eu } = useAuthUser();
  const [carregando, setCarregando] = useState(true);
  const [linhas, setLinhas] = useState<LinhaAcesso[]>([]);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data: perfis, error: erroPerfis } = await supabase.from("profiles").select("id, display_name");
    const { data: papeis, error: erroPapeis } = await supabase.from("user_roles").select("user_id, role");
    if (erroPerfis || erroPapeis) {
      toast.error("Erro ao carregar usuários");
      setCarregando(false);
      return;
    }
    // e-mail e situação vêm do cadastro de usuários (função admin-usuarios); se falhar, só perde "Bloquear"/e-mail
    const porConta = new Map<string, { id: string; email: string; ativo: boolean }>();
    try {
      const { usuarios } = await sincronizarUsuarios();
      for (const u of usuarios) if (u.authUserId) porConta.set(u.authUserId, { id: u.id, email: u.email, ativo: u.ativo });
    } catch {
      /* sem e-mails: os botões explicam o que fazer */
    }
    setLinhas(
      (perfis ?? []).map((p) => {
        const cadastro = porConta.get(p.id);
        return {
          id: p.id,
          nome: p.display_name || cadastro?.email || p.id,
          email: cadastro?.email,
          papeis: (papeis ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
          usuarioId: cadastro?.id,
          bloqueado: cadastro ? !cadastro.ativo : false,
        };
      }),
    );
    setCarregando(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const liberar = async (l: LinhaAcesso) => {
    if (!l.email) {
      toast.error("Não foi possível obter o e-mail desta conta. Abra Administrativo › Controles internos › Usuários e tente de novo.");
      return;
    }
    setOcupado(l.id);
    const { error } = await supabase.rpc("add_admin_by_email", { _email: l.email });
    setOcupado(null);
    if (error) {
      toast.error(`Não foi possível liberar o acesso: ${error.message}`);
      return;
    }
    toast.success("Acesso liberado", { description: `${l.nome} entra com acesso total ao sistema.` });
    void carregar();
  };

  const alternarBloqueio = async (l: LinhaAcesso) => {
    if (!l.usuarioId) {
      toast.error("Esta conta ainda não está no cadastro de usuários. Abra Administrativo › Controles internos › Usuários para sincronizar.");
      return;
    }
    if (!l.bloqueado && !window.confirm(`Bloquear o acesso de ${l.nome}?\nA pessoa não consegue mais entrar no sistema até ser desbloqueada.`)) return;
    setOcupado(l.id);
    try {
      await alternarUsuario(l.usuarioId, eu ? displayNameFor(eu) : "Administrador");
      toast.success(l.bloqueado ? "Acesso desbloqueado" : "Acesso bloqueado");
      void carregar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(null);
    }
  };

  if (carregando) return <div className="py-10 text-center text-xs text-muted-foreground">Carregando usuários...</div>;

  const administradores = linhas.filter((l) => l.papeis.includes("admin") && !l.bloqueado).length;

  return (
    <div className="space-y-2">
      {linhas.length === 0 && (
        <div className="py-10 text-center text-xs text-muted-foreground border border-dashed rounded-2xl">Nenhum usuário encontrado.</div>
      )}
      {linhas.map((l) => {
        const liberado = l.papeis.length > 0;
        const ehAdmin = l.papeis.includes("admin");
        const propria = !!eu && eu.id === l.id;
        const ultimoAdmin = ehAdmin && !l.bloqueado && administradores <= 1;
        return (
          <div key={l.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">
                {l.nome} {propria && <span className="text-[10px] font-normal text-muted-foreground">(você)</span>}
              </div>
              <div className="text-[10px] text-muted-foreground flex flex-wrap gap-2">
                {l.email && <span className="truncate">{l.email}</span>}
                {!liberado && <span className="text-destructive uppercase">PENDENTE</span>}
                {liberado && !l.bloqueado && <span className="text-success uppercase">LIBERADO</span>}
                {l.bloqueado && <span className="text-destructive uppercase">BLOQUEADO</span>}
                {ehAdmin && <span className="text-brand-orange font-bold uppercase">ADMIN</span>}
              </div>
            </div>
            {!liberado ? (
              <Button size="sm" className="rounded-full h-8" disabled={ocupado === l.id} onClick={() => liberar(l)}>
                Liberar
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full h-8"
                disabled={ocupado === l.id || (!l.bloqueado && (propria || ultimoAdmin))}
                title={propria ? "Você não pode bloquear a própria conta." : ultimoAdmin ? "É o único administrador ativo." : undefined}
                onClick={() => alternarBloqueio(l)}
              >
                {l.bloqueado ? "Desbloquear" : "Bloquear"}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
