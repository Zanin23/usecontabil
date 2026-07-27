// Cadastro de classes de atividade (CNAE) — armazenamento local (protótipo).
const KEY = "usecontabil.atividades.v1";

export const ATIVIDADES_EVENT = "usecontabil:atividades-changed";

export type AtividadeRecord = {
  id: string;
  cnae: string;
  descricao: string;
  tipo: string;
  grupo: string;
  aliqIss: string;
  status: string;
};

export const TIPOS_ATIVIDADE = [
  "Indústria",
  "Comércio",
  "Serviços",
  "Transporte",
  "Construção",
  "Agro",
];

const SEED: AtividadeRecord[] = [
  { id: "CA-001", cnae: "2521-7/00", descricao: "Fabricação de tanques e reservatórios metálicos", tipo: "Indústria", grupo: "Indústria metalúrgica", aliqIss: "—", status: "Ativa" },
  { id: "CA-002", cnae: "4711-3/02", descricao: "Comércio varejista de mercadorias em geral", tipo: "Comércio", grupo: "Comércio varejista", aliqIss: "—", status: "Ativa" },
  { id: "CA-003", cnae: "6202-3/00", descricao: "Desenvolvimento e licenciamento de softwares", tipo: "Serviços", grupo: "Serviços de TI", aliqIss: "2,50%", status: "Ativa" },
  { id: "CA-004", cnae: "4930-2/02", descricao: "Transporte rodoviário de carga intermunicipal", tipo: "Transporte", grupo: "Transporte rodoviário", aliqIss: "—", status: "Ativa" },
  { id: "CA-005", cnae: "6920-6/01", descricao: "Atividades de contabilidade", tipo: "Serviços", grupo: "Serviços profissionais", aliqIss: "5,00%", status: "Ativa" },
];

function notify() {
  window.dispatchEvent(new Event(ATIVIDADES_EVENT));
}

function persist(list: AtividadeRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  notify();
}

export function loadAtividades(): AtividadeRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(SEED));
      return [...SEED];
    }
    return JSON.parse(raw) as AtividadeRecord[];
  } catch {
    return [...SEED];
  }
}

export function getAtividade(id: string) {
  return loadAtividades().find((a) => a.id === id);
}

export function saveAtividade(rec: AtividadeRecord) {
  const list = loadAtividades();
  const idx = list.findIndex((a) => a.id === rec.id);
  if (idx >= 0) list[idx] = rec;
  else list.unshift(rec);
  persist(list);
}

export function removeAtividade(id: string) {
  persist(loadAtividades().filter((a) => a.id !== id));
}

export function nextAtividadeId(): string {
  const list = loadAtividades();
  const max = list.reduce((acc, a) => {
    const n = Number(a.id.replace(/\D/g, ""));
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `CA-${String(max + 1).padStart(3, "0")}`;
}

export function formatAtividade(a: AtividadeRecord) {
  return `${a.cnae} — ${a.descricao}`;
}

// Hook reativo — recarrega quando o cadastro muda em qualquer tela.
import { useEffect, useState } from "react";

export function useAtividades() {
  const [atividades, setAtividades] = useState<AtividadeRecord[]>(() => loadAtividades());
  useEffect(() => {
    const refresh = () => setAtividades(loadAtividades());
    window.addEventListener(ATIVIDADES_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(ATIVIDADES_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return { atividades, refresh: () => setAtividades(loadAtividades()) };
}
