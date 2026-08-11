import { migrarBaseRealParaPratica, deletarTudoGeral } from "./migrationPratica";
import { supabase } from "@/integrations/supabase/client";

const FLAG = "usecontabil.reset.base.v1";

/**
 * Função para resetar a base de dados local na primeira execução (ou via comando).
 * Agora migra os dados reais para o modo prática para evitar perda total de dados
 * caso o usuário já tenha cadastrado algo importante.
 */
export async function limparBaseLocalUmaVez() {
  if (typeof window === "undefined") return;
  
  const resetDone = localStorage.getItem(FLAG);
  
  if (!resetDone) {
    console.log("[ResetBase] Iniciando limpeza da base de dados real...");
    
    // Migra o que existe hoje para a sandbox (prática) antes de limpar a real
    await migrarBaseRealParaPratica();
    
    // Marca como feito
    localStorage.setItem(FLAG, "done");
    console.log("[ResetBase] Base real limpa. Dados preservados no Modo Prática.");
  }
}

/**
 * Força a limpeza imediata da base real movendo para prática.
 */
export async function forcarLimpezaBaseReal() {
  const ok = await migrarBaseRealParaPratica();
  // Limpar caches reativos após migração
  window.dispatchEvent(new Event("usecontabil:pratica-changed"));
  return ok;
}

/**
 * Limpa TUDO da base de dados (Real e Prática) sem migração.
 * Esta função deve ser usada com cautela.
 */
export async function resetAbsoluto() {
  const ok = await deletarTudoGeral();
  if (ok) {
    localStorage.setItem(FLAG, "done");
    return true;
  }
  return false;
}

