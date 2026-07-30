/**
 * Preferências da conta (visual, notificações e ambiente).
 * Store simples com assinantes + persistência em localStorage.
 */
import { useEffect, useState } from "react";

export type Acento = "orange" | "blue" | "purple" | "pink" | "red";
export type Ambiente = "homologacao" | "producao" | "treinamento";
export type Densidade = "confortavel" | "compacta";

export type Preferencias = {
  acento: Acento;
  densidade: Densidade;
  ambiente: Ambiente;
  notifVencimentos: boolean;
  notifFechamento: boolean;
  notifInconsistencias: boolean;
  notifResumoDiario: boolean;
};

export const ACENTOS: { id: Acento; nome: string; varName: string }[] = [
  { id: "orange", nome: "Laranja", varName: "--brand-orange" },
  { id: "blue", nome: "Azul", varName: "--brand-blue" },
  { id: "purple", nome: "Roxo", varName: "--brand-purple" },
  { id: "pink", nome: "Rosa", varName: "--brand-pink" },
  { id: "red", nome: "Vermelho", varName: "--brand-red" },
];

export const AMBIENTES: { id: Ambiente; nome: string; descricao: string }[] = [
  { id: "homologacao", nome: "Homologação", descricao: "Dados de teste — nada é transmitido." },
  { id: "producao", nome: "Produção", descricao: "Operação oficial da empresa." },
  { id: "treinamento", nome: "Treinamento", descricao: "Base isolada para capacitação de equipe." },
];

const CHAVE = "usecontabil.preferencias";

const PADRAO: Preferencias = {
  acento: "orange",
  densidade: "confortavel",
  ambiente: "homologacao",
  notifVencimentos: true,
  notifFechamento: true,
  notifInconsistencias: true,
  notifResumoDiario: false,
};

function carregar(): Preferencias {
  if (typeof window === "undefined") return PADRAO;
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    return bruto ? { ...PADRAO, ...(JSON.parse(bruto) as Partial<Preferencias>) } : PADRAO;
  } catch {
    return PADRAO;
  }
}

let atual = carregar();
const ouvintes = new Set<(p: Preferencias) => void>();

export function aplicarPreferencias(p: Preferencias = atual) {
  if (typeof document === "undefined") return;
  const raiz = document.documentElement;
  const acento = ACENTOS.find((a) => a.id === p.acento) ?? ACENTOS[0];
  // Redireciona o token de acento da marca para a cor escolhida (sempre um token existente).
  if (acento.id === "orange") raiz.style.removeProperty("--brand-orange");
  else raiz.style.setProperty("--brand-orange", `var(${acento.varName})`);
  raiz.dataset.densidade = p.densidade;
  raiz.dataset.ambiente = p.ambiente;
}

export function preferencias() {
  return atual;
}

export function definirPreferencias(patch: Partial<Preferencias>) {
  atual = { ...atual, ...patch };
  try {
    localStorage.setItem(CHAVE, JSON.stringify(atual));
  } catch {
    /* ignore */
  }
  aplicarPreferencias(atual);
  ouvintes.forEach((f) => f(atual));
}

export function redefinirPreferencias() {
  definirPreferencias(PADRAO);
}

/** Hook reativo às preferências da conta. */
export function usePreferencias() {
  const [prefs, setPrefs] = useState(atual);
  useEffect(() => {
    ouvintes.add(setPrefs);
    return () => {
      ouvintes.delete(setPrefs);
    };
  }, []);
  return { prefs, definir: definirPreferencias, redefinir: redefinirPreferencias };
}
