// Cadastro de filiais e unidades internas do grupo — armazenamento local (protótipo).
import { useEffect, useState } from "react";

const KEY = "usecontabil.filiais.v1";

export const FILIAIS_EVENT = "usecontabil:filiais-changed";

export type FilialRecord = {
  id: string;
  nome: string;
  tipo: string;
  empresaId: string;
  cnpj: string;
  inscEstadual: string;
  cidade: string;
  uf: string;
  endereco: string;
  responsavel: string;
  email: string;
  telefone: string;
  centroCusto: string;
  status: string;
};

export const TIPOS_UNIDADE = [
  "Matriz",
  "Filial",
  "Unidade fabril",
  "Centro de distribuição",
  "Depósito fechado",
  "Escritório administrativo",
];

export const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR",
  "PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

function notify() {
  window.dispatchEvent(new Event(FILIAIS_EVENT));
}

function persist(list: FilialRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  notify();
}

export function loadFiliais(): FilialRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FilialRecord[]) : [];
  } catch {
    return [];
  }
}

export function getFilial(id: string) {
  return loadFiliais().find((f) => f.id === id);
}

export function saveFilial(rec: FilialRecord) {
  const list = loadFiliais();
  const idx = list.findIndex((f) => f.id === rec.id);
  if (idx >= 0) list[idx] = rec;
  else list.unshift(rec);
  persist(list);
}

export function removeFilial(id: string) {
  persist(loadFiliais().filter((f) => f.id !== id));
}

export function nextFilialId(): string {
  const max = loadFiliais().reduce((acc, f) => {
    const n = Number(f.id.replace(/\D/g, ""));
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `UN-${String(max + 1).padStart(3, "0")}`;
}

export function useFiliais() {
  const [filiais, setFiliais] = useState<FilialRecord[]>(() => loadFiliais());
  useEffect(() => {
    const refresh = () => setFiliais(loadFiliais());
    window.addEventListener(FILIAIS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(FILIAIS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return { filiais, refresh: () => setFiliais(loadFiliais()) };
}
