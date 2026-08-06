import { supabase } from "@/integrations/supabase/client";
import { setPraticaAtiva } from "./praticaStore";
import { limparCacheEmpresas } from "./empresasStore";
import { registrarLog } from "./auditoriaStore";
import { FISCAL_EVENT } from "./fiscalStore";
import { TRIBUTARIO_EVENT } from "./tributarioStore";




/**
 * Move todos os dados da "Base Real" (produção) para a "Base de Prática" (sandbox),
 * e depois limpa a base real.
 */
export async function migrarBaseRealParaPratica(manterEmpresaId?: string) {
  try {
    const keysParaMigrar: string[] = [];
    const prefixes = ["usecontabil", "uc:"];

    // 1. Identificar todas as chaves "Reais" (sem sufixo .pratica)
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && prefixes.some(p => k.startsWith(p)) && !k.endsWith(".pratica")) {
        // Ignorar chaves de preferência de UI que devem permanecer na Real
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
          keysParaMigrar.push(k);
        }
      }
    }

    // 2. Migrar (Copia para .pratica)
    keysParaMigrar.forEach(k => {
      const data = localStorage.getItem(k);
      if (data) {
        localStorage.setItem(k + ".pratica", data);
      }
    });

    // 3. LIMPEZA TOTAL DA BASE REAL (Local Storage)
    // Removemos todas as chaves que migramos e garantimos que NADA de dados fiscais reste na real
    keysParaMigrar.forEach(k => {
      localStorage.removeItem(k);
    });

    // Limpeza forçada de chaves conhecidas para evitar qualquer lixo
    const chavesSensiveis = [
      "usecontabil.empresas.cache.v1",
      "usecontabil.empresaAtual.v1",
      "usecontabil.tributario.v1",
      "usecontabil.fiscal.docs.v1",
      "usecontabil.atividades.v1",
      "usecontabil.filiais.v1",
      "usecontabil.gestao.v1",
      "usecontabil.guias.v1",
      "usecontabil.compras.v1",
      "uc:notificacoes",
      "uc:ajuda"
    ];
    chavesSensiveis.forEach(k => localStorage.removeItem(k));

    // 4. Limpar Empresas na Nuvem (Supabase)
    const { data: userResp } = await supabase.auth.getUser();
    if (userResp.user) {
      // Se tivermos um ID de empresa para manter (ex: a que acabamos de popular dados fictícios), 
      // não deletamos tudo indiscriminadamente. Mas aqui o objetivo é limpar a Real.
      await supabase.from("empresas").delete().eq("user_id", userResp.user.id);
    }
    
    // 5. Registrar Log de Auditoria
    const detalheLog = [
      `Chaves migradas: ${keysParaMigrar.length}`,
      `Modo: Real -> Prática`,
      `Empresas reais removidas do cloud: Sim`,
      `Data: ${new Date().toLocaleString("pt-BR")}`
    ].join(" | ");
    
    registrarLog(
      "Isolamento de Base", 
      `Limpeza e migração de dados executada. ${detalheLog}`,
      "Sistema (Migração Automática)"
    );

    // 6. Limpar caches de memória e notificar mudança
    limparCacheEmpresas();
    window.dispatchEvent(new Event(FISCAL_EVENT));
    window.dispatchEvent(new Event(TRIBUTARIO_EVENT));
    window.dispatchEvent(new Event("storage"));


    // 7. Ativar o modo prática imediatamente
    setPraticaAtiva(true);

    return true;
  } catch (error) {
    console.error("Erro na migração de base:", error);
    return false;
  }
}

/**
 * LIMPEZA ABSOLUTA: Remove TUDO da base (Real e Prática) sem migração.
 * Apenas administradores devem ter acesso visual a esta função.
 */
export async function deletarTudoGeral() {
  try {
    // 1. Limpar LocalStorage (TUDO que pertence ao sistema)
    const prefixes = ["usecontabil", "uc:", "sb-"]; 
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (prefixes.some(p => k.startsWith(p)))) {
         keys.push(k);
      }
    }
    keys.forEach(k => localStorage.removeItem(k));

    // 2. Limpar Nuvem (Empresas no Supabase)
    const { data: userResp } = await supabase.auth.getUser();
    if (userResp.user) {
      await supabase.from("empresas").delete().eq("user_id", userResp.user.id);
    }

    // 3. Limpar caches e resetar estado
    limparCacheEmpresas();
    localStorage.removeItem("usecontabil.empresaAtual.v1");
    localStorage.removeItem("usecontabil.empresaAtual.v1.pratica");
    
    window.dispatchEvent(new Event(FISCAL_EVENT));
    window.dispatchEvent(new Event(TRIBUTARIO_EVENT));
    window.dispatchEvent(new Event("storage"));

    
    return true;
  } catch (error) {
    console.error("Erro na limpeza total:", error);
    return false;
  }
}
