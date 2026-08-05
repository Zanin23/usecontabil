import { supabase } from "@/integrations/supabase/client";
import { setPraticaAtiva } from "./praticaStore";
import { limparCacheEmpresas } from "./empresasStore";

/**
 * Move todos os dados da "Base Real" (produção) para a "Base de Prática" (sandbox),
 * e depois limpa a base real.
 */
export async function migrarBaseRealParaPratica() {
  try {
    const keysParaMigrar: string[] = [];
    const keysParaRemover: string[] = [];

    // 1. Identificar todas as chaves do Use Contábil que não são de prática
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("usecontabil") && !k.endsWith(".pratica")) {
        // Ignorar chaves de preferência/sistema que devem ser comuns
        const ignorar = [
          "usecontabil.tema",
          "usecontabil.som.ui",
          "usecontabil.som.volume",
          "usecontabil.som.digitacao",
          "usecontabil.preferencias",
          "usecontabil.reset.base.v1", // flag de reset
          "uc:sidebar",
          "uc:pratica:ativo",
        ];
        
        if (!ignorar.includes(k)) {
          keysParaMigrar.push(k);
        }
      }
    }

    // 2. Copiar para .pratica e remover original
    keysParaMigrar.forEach(k => {
      const data = localStorage.getItem(k);
      if (data) {
        localStorage.setItem(k + ".pratica", data);
        localStorage.removeItem(k);
      }
    });

    // 3. Casos especiais que usam prefixos diferentes
    const extras = ["uc:notificacoes", "uc:ajuda"]; // se existirem
    extras.forEach(k => {
       const data = localStorage.getItem(k);
       if (data && !k.endsWith(".pratica")) {
         localStorage.setItem(k + ".pratica", data);
         localStorage.removeItem(k);
       }
    });

    // 4. Limpar empresas na nuvem (Supabase)
    // Como o usuário pediu para "limpar a base real", vamos remover as empresas cadastradas.
    // O cache local já foi removido no passo 2 (se estivesse no localStorage).
    const { data: userResp } = await supabase.auth.getUser();
    if (userResp.user) {
      // Tenta deletar as empresas do usuário na nuvem
      await supabase.from("empresas").delete().eq("user_id", userResp.user.id);
    }
    
    // Limpa o cache reativo das empresas
    limparCacheEmpresas();

    // 5. Ativar o modo prática para que o usuário veja os dados migrados imediatamente
    setPraticaAtiva(true);

    return true;
  } catch (error) {
    console.error("Erro na migração de base:", error);
    return false;
  }
}
