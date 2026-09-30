/**
 * Confirmação para ações que apagam dados. Os lançamentos do sistema ficam só no navegador, então
 * excluir é irreversível — antes vários botões "Excluir", "Limpar competência" e "Remover" apagavam
 * na hora, sem perguntar. (Mesmo padrão `confirm()` já usado em empresas, contratos, filiais e tarefas.)
 */
export function confirmarExclusao(o: string, detalhe = "Esta ação não pode ser desfeita."): boolean {
  return window.confirm(`Excluir ${o}?\n${detalhe}`);
}

/** Variante para limpezas em massa (ex.: "Limpar competência"). */
export function confirmarLimpeza(o: string, detalhe = "Esta ação não pode ser desfeita."): boolean {
  return window.confirm(`Apagar ${o}?\n${detalhe}`);
}

/** "Carregar demonstração" grava cadastros e notas FICTÍCIOS na empresa selecionada. */
export function confirmarDemonstracao(razaoEmpresa?: string): boolean {
  return window.confirm(
    `Carregar dados de DEMONSTRAÇÃO${razaoEmpresa ? ` em «${razaoEmpresa}»` : ""}?\n` +
      "Serão criados produtos, parceiros e notas fiscais FICTÍCIOS nesta empresa, que entram nas apurações e na DRE. Use apenas em base de teste.",
  );
}
