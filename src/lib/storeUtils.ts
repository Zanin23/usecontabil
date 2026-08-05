import { getStorageSuffix } from "./praticaStore";

/**
 * Retorna a chave de armazenamento (localStorage) ajustada 
 * conforme o modo atual (Real ou Prática).
 */
export function getStoreKey(baseKey: string): string {
  return baseKey + getStorageSuffix();
}
