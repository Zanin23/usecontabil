// Simple localStorage-backed store for user-created empresa records (prototype).
const KEY = "usecontabil.empresas.v1";

export type EmpresaRecord = {
  id: string;
  cnpj: string;
  razao: string;
  regime: string;
  atividade: string;
  status: string;
  createdAt: string;
  raw: Record<string, any>;
};

export function loadEmpresas(): EmpresaRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as EmpresaRecord[]) : [];
  } catch {
    return [];
  }
}

export function getEmpresa(id: string): EmpresaRecord | undefined {
  return loadEmpresas().find((e) => e.id === id);
}

export function saveEmpresa(rec: EmpresaRecord) {
  const list = loadEmpresas();
  const idx = list.findIndex((e) => e.id === rec.id);
  if (idx >= 0) list[idx] = rec;
  else list.unshift(rec);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function removeEmpresa(id: string) {
  const list = loadEmpresas().filter((e) => e.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
}
