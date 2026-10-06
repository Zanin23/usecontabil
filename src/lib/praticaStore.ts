/**
 * Modo prática (sandbox de estudo).
 * Guarda a flag e mantém os dados isolados da produção.
 */
import { useEffect, useState } from "react";
import { PRODUTOS_TREINAMENTO, PARCEIROS_TREINAMENTO, CENARIOS_PRATICA } from "./aprendizado/seedPratica";

const CHAVE_ATIVO = "uc:pratica:ativo";
const CHAVE_EMPRESAS = "uc:pratica:empresas.v1";
const EVENTO = "usecontabil:pratica-changed";

// Flags globais reativas
let ativo = typeof window !== "undefined" ? localStorage.getItem(CHAVE_ATIVO) === "1" : false;

export function isPraticaAtiva() {
  return ativo;
}

export function setPraticaAtiva(v: boolean) {
  ativo = v;
  localStorage.setItem(CHAVE_ATIVO, v ? "1" : "0");
  
  // Limpa cache de memória de outros stores se necessário via evento
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: { ativa: v } }));
}

/**
 * Funções para gerenciar empresas exclusivas do modo prática (armazenadas apenas localmente).
 */
/** Empresa do modo prática: cadastro local, sem os vínculos da nuvem. */
export type EmpresaPratica = {
  id: string;
  cnpj?: string;
  razao?: string;
  regime?: string;
  [chave: string]: unknown;
};

export function loadEmpresasPratica(): EmpresaPratica[] {
  try {
    const raw = localStorage.getItem(CHAVE_EMPRESAS);
    if (!raw) return [];
    const lista: unknown = JSON.parse(raw);
    return Array.isArray(lista) ? (lista as EmpresaPratica[]) : [];
  } catch {
    return [];
  }
}

export function saveEmpresasPratica(list: EmpresaPratica[]) {
  localStorage.setItem(CHAVE_EMPRESAS, JSON.stringify(list));
  window.dispatchEvent(new Event("usecontabil:empresas-changed"));
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
