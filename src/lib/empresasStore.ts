// Store das empresas do grupo, persistido no navegador.
// Escrita defensiva: nunca sobrescreve a lista quando a leitura falha e
// confere o gravado logo após salvar (evita perda silenciosa de cadastros).
const KEY = "usecontabil.empresas.v1";
const BACKUP_KEY = "usecontabil.empresas.backup.v1";
const CORRUPT_KEY = "usecontabil.empresas.corrompido.v1";

export const EMPRESAS_EVENT = "usecontabil:empresas-changed";

function notify() {
  window.dispatchEvent(new Event(EMPRESAS_EVENT));
}

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

export const soDigitos = (v: string) => (v ?? "").replace(/\D/g, "");

function parseList(raw: string | null): EmpresaRecord[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EmpresaRecord[]) : null;
  } catch {
    return null;
  }
}

/** Lê a lista; se o conteúdo principal estiver corrompido, recupera o backup. */
export function loadEmpresas(): EmpresaRecord[] {
  try {
    const principal = localStorage.getItem(KEY);
    const lista = parseList(principal);
    if (lista) return lista;

    // Conteúdo inválido: guarda para diagnóstico e tenta o backup.
    if (principal) localStorage.setItem(CORRUPT_KEY, principal);
    const backup = parseList(localStorage.getItem(BACKUP_KEY));
    if (backup) {
      localStorage.setItem(KEY, JSON.stringify(backup));
      return backup;
    }
    return [];
  } catch {
    return [];
  }
}

export function getEmpresa(id: string): EmpresaRecord | undefined {
  return loadEmpresas().find((e) => e.id === id);
}

export function findEmpresaPorCnpj(cnpj: string): EmpresaRecord | undefined {
  const alvo = soDigitos(cnpj);
  if (!alvo) return undefined;
  return loadEmpresas().find((e) => soDigitos(e.cnpj) === alvo);
}

function persist(list: EmpresaRecord[]) {
  const payload = JSON.stringify(list);
  try {
    localStorage.setItem(KEY, payload);
  } catch (e) {
    throw new Error(
      "Não foi possível salvar: o armazenamento do navegador está cheio ou bloqueado. Libere espaço ou desative a navegação anônima.",
    );
  }
  // Confere se realmente ficou gravado (modo anônimo/quota podem falhar em silêncio).
  if (localStorage.getItem(KEY) !== payload) {
    throw new Error("Não foi possível confirmar a gravação do cadastro no navegador.");
  }
  try {
    localStorage.setItem(BACKUP_KEY, payload);
  } catch {
    /* backup é best-effort */
  }
  notify();
}

export function saveEmpresa(rec: EmpresaRecord) {
  const list = loadEmpresas();
  // Casa por id ou, na falta dele, pelo CNPJ — evita cadastros duplicados
  // que depois "somem" da lista por serem sobrescritos.
  let idx = list.findIndex((e) => e.id === rec.id);
  if (idx < 0 && soDigitos(rec.cnpj)) {
    idx = list.findIndex((e) => soDigitos(e.cnpj) === soDigitos(rec.cnpj));
  }
  if (idx >= 0) list[idx] = { ...list[idx], ...rec, id: list[idx].id };
  else list.unshift(rec);
  persist(list);
  return idx >= 0 ? list[idx] : rec;
}

export function removeEmpresa(id: string) {
  persist(loadEmpresas().filter((e) => e.id !== id));
}
