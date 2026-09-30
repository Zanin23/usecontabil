import { migrarBaseRealParaPratica, deletarTudoGeral } from "./migrationPratica";

/**
 * ATENÇÃO — não existe (e não deve existir) reset automático da base.
 *
 * Antes, o ContabilShell chamava uma rotina de "limpeza única" a cada abertura do sistema,
 * controlada por uma flag no localStorage. Como a flag era por NAVEGADOR (e não por usuário),
 * qualquer primeiro acesso em outro navegador/dispositivo, em aba anônima ou depois de limpar
 * os dados do navegador apagava as empresas do usuário na nuvem (tabela `empresas`) e ligava
 * o modo prática sozinho — contrariando a promessa da tela de login de que os cadastros
 * ficam salvos na nuvem, em qualquer dispositivo.
 *
 * As funções abaixo só podem ser chamadas por uma ação EXPLÍCITA do usuário, sempre atrás de
 * uma caixa de confirmação (Aprender → Prática e Configurações → Zona de Perigo).
 * Teste de regressão (cobre o ContabilShell, onde isso acontecia): src/test/primeiroAcesso.test.tsx.
 */

/**
 * Move a base real (local + nuvem) para o modo prática e limpa a base real.
 * Ação manual: "Isolar dados (Real → Prática)".
 */
export async function forcarLimpezaBaseReal() {
  const ok = await migrarBaseRealParaPratica();
  // Limpar caches reativos após migração
  window.dispatchEvent(new Event("usecontabil:pratica-changed"));
  return ok;
}

/**
 * Limpa TUDO da base de dados (Real e Prática) sem migração.
 * Ação manual da "Zona de Perigo". Deve ser usada com cautela.
 */
export async function resetAbsoluto() {
  return deletarTudoGeral();
}
