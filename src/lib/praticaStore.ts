/**
 * Modo prática (sandbox de estudo).
 * Guarda a flag e mantém os dados isolados da produção.
 */
import { useEffect, useState } from "react";
import { PRODUTOS_TREINAMENTO, PARCEIROS_TREINAMENTO, CENARIOS_PRATICA } from "./aprendizado/seedPratica";

const CHAVE_ATIVO = "uc:pratica:ativo";
const EVENTO = "usecontabil:pratica-changed";

// Flags globais reativas
let ativo = typeof window !== "undefined" && localStorage.getItem(CHAVE_ATIVO) === "1";

export function isPraticaAtiva() {
  return ativo;
}

export function setPraticaAtiva(v: boolean) {
  ativo = v;
  localStorage.setItem(CHAVE_ATIVO, v ? "1" : "0");
  window.dispatchEvent(new CustomEvent(EVENTO));
}

/**
 * Hook para componentes que precisam reagir à mudança de modo.
 */
export function usePratica() {
  const [valor, setValor] = useState(ativo);

  useEffect(() => {
    const atualizar = () => setValor(ativo);
    window.addEventListener(EVENTO, atualizar);
    return () => window.removeEventListener(EVENTO, atualizar);
  }, []);

  return {
    praticaAtiva: valor,
    setPraticaAtiva,
    produtos: PRODUTOS_TREINAMENTO,
    parceiros: PARCEIROS_TREINAMENTO,
    cenarios: CENARIOS_PRATICA
  };
}

/**
 * Retorna o sufixo da chave de armazenamento baseado no modo atual.
 * Isso garante que dados salvos no modo prática não sobrescrevam a produção.
 */
export function getStorageSuffix() {
  return ativo ? ".pratica" : "";
}
