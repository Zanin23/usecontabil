/**
 * Modo prática (sandbox de estudo).
 * Guarda apenas a flag e os cenários fictícios, em chave própria do localStorage.
 * NUNCA escreve nas chaves dos stores de produção — os laboratórios apenas leem
 * as funções de cálculo já existentes nos motores de domínio.
 */
import { useEffect, useState } from "react";
import { PRODUTOS_TREINAMENTO, PARCEIROS_TREINAMENTO, CENARIOS_PRATICA } from "./aprendizado/seedPratica";

const CHAVE = "uc:pratica:ativo";
const EVENTO = "usecontabil:pratica-changed";

let ativo = typeof window !== "undefined" && localStorage.getItem(CHAVE) === "1";

export function isPraticaAtiva() {
  return ativo;
}

export function setPraticaAtiva(v: boolean) {
  ativo = v;
  localStorage.setItem(CHAVE, v ? "1" : "0");
  
  // Ao ativar o modo prática, podemos garantir que os dados de semente estão disponíveis
  // mas sem poluir o store de produção. O modo prática é consumido por componentes
  // como AjudaTela e Pratica que usam esses dados de semente.
  
  window.dispatchEvent(new CustomEvent(EVENTO));
}

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

