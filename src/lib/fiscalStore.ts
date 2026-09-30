// localStorage-backed store for the "Fiscal › Documentos fiscais" screens.
// Documents are scoped by empresa (selected company) and competência (YYYY-MM).
import { useEffect, useState } from "react";
import { getStorageSuffix } from "./praticaStore";
import { parseNumeroBR } from "./numeros";

const KEY_BASE = "usecontabil.fiscal.docs.v1";
const getStoreKey = () => KEY_BASE + getStorageSuffix();

export const FISCAL_EVENT = "usecontabil:fiscal-changed";

/**
 * Um lançamento pertence a UMA empresa. Sem empresa selecionada (null / undefined / ""),
 * nada pode casar — antes o filtro era ignorado e as telas mostravam (e somavam) os
 * documentos de todas as empresas, inclusive de empresas já excluídas e de outros usuários
 * que usaram o mesmo navegador.
 */
export function daEmpresa(empresaIdDoRegistro: string | undefined | null, empresaId?: string | null): boolean {
  return !!empresaId && empresaIdDoRegistro === empresaId;
}

export type DocSlug =
  | "entradas"
  | "saidas"
  | "servicos-tomados"
  | "servicos-prestados"
  | "transporte"
  | "cupons"
  | "manifestacao";

export type DocFiscal = {
  id: string;
  empresaId: string;
  competencia: string;
} & Record<string, string>;

type DB = Partial<Record<DocSlug, DocFiscal[]>>;

function notify() {
  window.dispatchEvent(new Event(FISCAL_EVENT));
}

export function loadDB(): DB {
  try {
    const raw = localStorage.getItem(getStoreKey());
    return raw ? (JSON.parse(raw) as DB) : {};
  } catch {
    return {};
  }
}

function persist(db: DB) {
  localStorage.setItem(getStoreKey(), JSON.stringify(db));
  notify();
}

export function loadDocs(slug: DocSlug): DocFiscal[] {
  return loadDB()[slug] ?? [];
}

export function saveDoc(slug: DocSlug, doc: DocFiscal) {
  const db = loadDB();
  const list = [...(db[slug] ?? [])];
  const idx = list.findIndex((d) => d.id === doc.id);
  if (idx >= 0) list[idx] = doc;
  else list.unshift(doc);
  persist({ ...db, [slug]: list });
}

export function saveDocs(slug: DocSlug, docs: DocFiscal[]) {
  const db = loadDB();
  persist({ ...db, [slug]: [...docs, ...(db[slug] ?? [])] });
}

export function removeDoc(slug: DocSlug, id: string) {
  const db = loadDB();
  persist({ ...db, [slug]: (db[slug] ?? []).filter((d) => d.id !== id) });
}

/** Remove todos os documentos da empresa/competência informada. */
export function limparPeriodo(slug: DocSlug, empresaId: string, competencia: string) {
  const db = loadDB();
  persist({
    ...db,
    [slug]: (db[slug] ?? []).filter(
      (d) => !(d.empresaId === empresaId && d.competencia === competencia),
    ),
  });
}

export function novoDocId(prefixo: string) {
  return `${prefixo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** "31/07/2026" → "2026-07" */
export function competenciaDaData(dataBR?: string) {
  const m = (dataBR ?? "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}` : "";
}

/** "2026-07" → "01/07/2026" */
export function primeiroDia(competencia: string) {
  const [y, m] = competencia.split("-");
  return `01/${m}/${y}`;
}

/** Converte "1.234,56" em número. */
export function valorBR(valor?: string) {
  return parseNumeroBR(valor) ?? 0;
}

export const moedaBR = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Gera uma chave de acesso fictícia de 44 dígitos (uso interno/visual). */
export function chaveFicticia() {
  let s = "";
  for (let i = 0; i < 44; i++) s += Math.floor(Math.random() * 10);
  return s;
}

export function formatarChave(chave: string) {
  return (chave ?? "").replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim();
}

/* ------------------------------- react hook ------------------------------ */

export function useDocsFiscais(slug: DocSlug, empresaId?: string | null, competencia?: string | string[]) {
  const [docs, setDocs] = useState<DocFiscal[]>(() => loadDocs(slug));

  useEffect(() => {
    const refresh = () => setDocs(loadDocs(slug));
    refresh();
    window.addEventListener(FISCAL_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(FISCAL_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [slug]);

  return docs.filter(
    (d) =>
      daEmpresa(d.empresaId, empresaId) &&
      (!competencia || (Array.isArray(competencia) ? competencia.includes(d.competencia) : d.competencia === competencia)),
  );
}
