/**
 * Nome de quem está logado, lido de forma síncrona da sessão guardada pelo Supabase no navegador.
 * Usado pela trilha de auditoria: antes os logs traziam autores fixos no código ("M. Andrade",
 * "Sistema", "Você", "Controladoria") e era impossível saber quem fez cada ação.
 */
export const USUARIO_NAO_IDENTIFICADO = "Usuário não identificado";

type SessaoSalva = { user?: { email?: string; user_metadata?: { display_name?: string; full_name?: string; name?: string } } };

export function usuarioAtual(): string {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const chave = localStorage.key(i);
      if (!chave || !/^sb-.+-auth-token$/.test(chave)) continue;
      const sessao = JSON.parse(localStorage.getItem(chave) ?? "null") as (SessaoSalva & { currentSession?: SessaoSalva }) | null;
      const user = sessao?.user ?? sessao?.currentSession?.user;
      const meta = user?.user_metadata ?? {};
      const nome = meta.display_name || meta.full_name || meta.name || user?.email;
      if (nome) return String(nome);
    }
  } catch {
    /* sessão ilegível: cai no valor padrão */
  }
  return USUARIO_NAO_IDENTIFICADO;
}
