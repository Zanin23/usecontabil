// localStorage-backed store for the "Financeiro" tables.
// Tax/parameter tables are shared by the whole group (global scope).
import { getStorageSuffix } from "./praticaStore";

const KEY_BASE = "usecontabil.financeiro.v1";
/** Chave no modo atual: o modo prática grava com o sufixo `.pratica`. */
const KEY = () => KEY_BASE + getStorageSuffix();

export const FINANCEIRO_EVENT = "usecontabil:financeiro-changed";

export type TabelaSlug =
  | "servicos"
  | "simei"
  | "simples-nacional"
  | "lucro-real"
  | "lucro-presumido"
  | "ajuste-apuracao"
  | "ajuste-documento-fiscal"
  | "apuracao-pis-cofins";

export type LinhaTabela = { id: string } & Record<string, string>;

type DB = Partial<Record<TabelaSlug, LinhaTabela[]>>;

function notify() {
  window.dispatchEvent(new Event(FINANCEIRO_EVENT));
}

export function loadDB(): DB {
  try {
    const raw = localStorage.getItem(KEY());
    return raw ? (JSON.parse(raw) as DB) : {};
  } catch {
    return {};
  }
}

function persist(db: DB) {
  localStorage.setItem(KEY(), JSON.stringify(db));
  notify();
}

export function loadLinhas(tabela: TabelaSlug): LinhaTabela[] {
  return loadDB()[tabela] ?? [];
}

export function saveLinha(tabela: TabelaSlug, linha: LinhaTabela) {
  const db = loadDB();
  const list = [...(db[tabela] ?? [])];
  const idx = list.findIndex((l) => l.id === linha.id);
  if (idx >= 0) list[idx] = linha;
  else list.push(linha);
  persist({ ...db, [tabela]: list });
}

export function removeLinha(tabela: TabelaSlug, id: string) {
  const db = loadDB();
  persist({ ...db, [tabela]: (db[tabela] ?? []).filter((l) => l.id !== id) });
}

export function replaceLinhas(tabela: TabelaSlug, linhas: LinhaTabela[]) {
  persist({ ...loadDB(), [tabela]: linhas });
}

export function novoId(prefixo: string) {
  return `${prefixo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Converte "1.234,56" ou "12,5%" em número. */
export function numeroBR(valor?: string) {
  if (!valor) return 0;
  const limpo = valor.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? n : 0;
}

/* ------------------------------- react hook ------------------------------ */
import { useEffect, useState } from "react";

export function useLinhas(tabela: TabelaSlug) {
  const [linhas, setLinhas] = useState<LinhaTabela[]>(() => loadLinhas(tabela));

  useEffect(() => {
    const refresh = () => setLinhas(loadLinhas(tabela));
    refresh();
    window.addEventListener(FINANCEIRO_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(FINANCEIRO_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [tabela]);

  return linhas;
}
