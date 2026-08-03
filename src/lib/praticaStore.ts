/**
 * Modo prática (sandbox de estudo).
 * Guarda apenas a flag e os cenários fictícios, em chave própria do localStorage.
 * NUNCA escreve nas chaves dos stores de produção — os laboratórios apenas leem
 * as funções de cálculo já existentes nos motores de domínio.
 */
import { useEffect, useState } from "react";

const CHAVE = "uc:pratica:ativo";
const EVENTO = "usecontabil:pratica-changed";

let ativo = typeof window !== "undefined" && localStorage.getItem(CHAVE) === "1";

export function praticaAtiva() {
  return ativo;
}

export function setPraticaAtiva(v: boolean) {
  ativo = v;
  localStorage.setItem(CHAVE, v ? "1" : "0");
  window.dispatchEvent(new CustomEvent(EVENTO));
}

export function usePratica() {
  const [valor, setValor] = useState(ativo);
  useEffect(() => {
    const atualizar = () => setValor(ativo);
    window.addEventListener(EVENTO, atualizar);
    return () => window.removeEventListener(EVENTO, atualizar);
  }, []);
  return { praticaAtiva: valor, setPraticaAtiva };
}
