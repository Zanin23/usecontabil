// localStorage-backed store for the "Empresa" module (Preparativos).
// Records are scoped per empresa (company of the group).
const KEY = "usecontabil.empresaDados.v1";

export const EMPRESA_DADOS_EVENT = "usecontabil:empresa-dados-changed";

export type Colecao = "inscricoes" | "pagamentos" | "parametros" | "certificados";

export type Registro = { id: string; empresaId: string } & Record<string, string>;

type DB = Record<Colecao, Registro[]>;

const EMPTY_DB: DB = { inscricoes: [], pagamentos: [], parametros: [], certificados: [] };

function notify() {
  window.dispatchEvent(new Event(EMPRESA_DADOS_EVENT));
}

export function loadDB(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY_DB };
    const parsed = JSON.parse(raw) as Partial<DB>;
    return { ...EMPTY_DB, ...parsed };
  } catch {
    return { ...EMPTY_DB };
  }
}

function persist(db: DB) {
  localStorage.setItem(KEY, JSON.stringify(db));
  notify();
}

export function loadRegistros(colecao: Colecao, empresaId?: string | null): Registro[] {
  const list = loadDB()[colecao] ?? [];
  // Sem empresa selecionada nada casa (antes devolvia os registros de TODAS as empresas).
  return empresaId ? list.filter((r) => r.empresaId === empresaId) : [];
}

export function saveRegistro(colecao: Colecao, rec: Registro) {
  const db = loadDB();
  const list = [...(db[colecao] ?? [])];
  const idx = list.findIndex((r) => r.id === rec.id);
  if (idx >= 0) list[idx] = rec;
  else list.unshift(rec);
  persist({ ...db, [colecao]: list });
}

export function removeRegistro(colecao: Colecao, id: string) {
  const db = loadDB();
  persist({ ...db, [colecao]: (db[colecao] ?? []).filter((r) => r.id !== id) });
}

export function novoId(prefixo: string) {
  return `${prefixo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/* ------------------------------- react hook ------------------------------ */
import { useEffect, useState } from "react";

export function useRegistros(colecao: Colecao, empresaId?: string | null) {
  const [registros, setRegistros] = useState<Registro[]>(() => loadRegistros(colecao, empresaId));

  useEffect(() => {
    const refresh = () => setRegistros(loadRegistros(colecao, empresaId));
    refresh();
    window.addEventListener(EMPRESA_DADOS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EMPRESA_DADOS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [colecao, empresaId]);

  return registros;
}
