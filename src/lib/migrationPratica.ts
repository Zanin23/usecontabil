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

    // 2.1 Limpeza Total das chaves de produção (sem sufixo)
    const prefixes = ["usecontabil", "uc:"];
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && prefixes.some(p => k.startsWith(p)) && !k.endsWith(".pratica")) {
        const ignorar = [
          "usecontabil.tema",
          "usecontabil.som.ui",
          "usecontabil.som.volume",
          "usecontabil.som.digitacao",
          "usecontabil.preferencias",
          "usecontabil.reset.base.v1",
          "uc:sidebar",
          "uc:pratica:ativo",
        ];
        if (!ignorar.includes(k)) {
          localStorage.removeItem(k);
        }
      }
    }

    // 3. Limpar chaves legadas específicas
    const keysParaLimparTotalmente = [
      "usecontabil.empresas.cache.v1",
      "usecontabil.empresaAtual.v1",
      "usecontabil.tributario.v1",
      "usecontabil.fiscal.docs.v1",
      "usecontabil.atividades.v1",
      "usecontabil.filiais.v1",
      "usecontabil.gestao.v1",
      "usecontabil.guias.v1",
      "usecontabil.compras.v1",
      "usecontabil.notificacoes",
      "uc:notificacoes",
      "uc:ajuda",
      "usecontabil.empresas.v1",
      "usecontabil.empresas.backup.v1"
    ];

    keysParaLimparTotalmente.forEach(k => {
      localStorage.removeItem(k);
    });

    // 4. Limpar empresas na nuvem (Supabase)
    const { data: userResp } = await supabase.auth.getUser();
    if (userResp.user) {
      await supabase.from("empresas").delete().eq("user_id", userResp.user.id);
    }
    
    // Limpa o cache reativo das empresas
    limparCacheEmpresas();

    // 5. Garantir que a seleção de empresa atual seja resetada
    localStorage.removeItem("usecontabil.empresaAtual.v1");

    // 6. Ativar o modo prática para que o usuário veja os dados migrados imediatamente
    setPraticaAtiva(true);

    return true;
  } catch (error) {
    console.error("Erro na migração de base:", error);
    return false;
  }
}
