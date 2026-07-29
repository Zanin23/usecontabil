// Store das empresas do grupo.
// Fonte de verdade: banco de dados na nuvem (tabela `empresas`, por usuário).
// O localStorage é apenas um cache local para leitura instantânea/offline.
import { supabase } from "@/integrations/supabase/client";

const CACHE_KEY = "usecontabil.empresas.cache.v1";
const LEGACY_KEYS = ["usecontabil.empresas.v1", "usecontabil.empresas.backup.v1"];

export const EMPRESAS_EVENT = "usecontabil:empresas-changed";

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

function notify() {
  window.dispatchEvent(new Event(EMPRESAS_EVENT));
}

function parseList(raw: string | null): EmpresaRecord[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EmpresaRecord[]) : null;
  } catch {
    return null;
  }
}

function lerCacheLocal(): EmpresaRecord[] {
  const atual = parseList(localStorage.getItem(CACHE_KEY));
  if (atual) return atual;
  for (const k of LEGACY_KEYS) {
    const antigo = parseList(localStorage.getItem(k));
    if (antigo?.length) return antigo;
  }
  return [];
}

let cache: EmpresaRecord[] = (() => {
  try {
    return lerCacheLocal();
  } catch {
    return [];
  }
})();

function gravarCache(list: EmpresaRecord[]) {
  cache = list;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch {
    /* cache é best-effort */
  }
  notify();
}

/* ------------------------------ leitura ------------------------------ */

export function loadEmpresas(): EmpresaRecord[] {
  return cache;
}

export function getEmpresa(id: string): EmpresaRecord | undefined {
  return cache.find((e) => e.id === id);
}

export function findEmpresaPorCnpj(cnpj: string): EmpresaRecord | undefined {
  const alvo = soDigitos(cnpj);
  if (!alvo) return undefined;
  return cache.find((e) => soDigitos(e.cnpj) === alvo);
}

/* ------------------------------- nuvem ------------------------------- */

type Row = {
  id: string;
  cnpj: string;
  razao: string;
  regime: string;
  atividade: string;
  status: string;
  raw: any;
  created_at: string;
};

const toRecord = (r: Row): EmpresaRecord => ({
  id: r.id,
  cnpj: r.cnpj,
  razao: r.razao,
  regime: r.regime,
  atividade: r.atividade,
  status: r.status,
  createdAt: r.created_at,
  raw: (r.raw ?? {}) as Record<string, any>,
});

async function userId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function toRow(rec: EmpresaRecord, uid: string) {
  return {
    id: rec.id,
    user_id: uid,
    cnpj: rec.cnpj ?? "",
    razao: rec.razao ?? "",
    regime: rec.regime ?? "",
    atividade: rec.atividade ?? "",
    status: rec.status ?? "Ativa",
    raw: rec.raw ?? {},
    created_at: rec.createdAt || new Date().toISOString(),
  };
}

/** Baixa as empresas da nuvem e (na primeira vez) sobe os cadastros locais antigos. */
export async function sincronizarEmpresas(): Promise<EmpresaRecord[]> {
  const uid = await userId();
  if (!uid) return cache;

  const { data, error } = await supabase
    .from("empresas")
    .select("id,cnpj,razao,regime,atividade,status,raw,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  let remotas = (data ?? []).map((r) => toRecord(r as Row));

  // Migração única: cadastros que só existiam neste navegador vão para a nuvem.
  const locais = lerCacheLocal();
  const faltantes = locais.filter(
    (l) => !remotas.some((r) => r.id === l.id || (soDigitos(r.cnpj) && soDigitos(r.cnpj) === soDigitos(l.cnpj))),
  );
  if (faltantes.length) {
    const { error: upErr } = await supabase
      .from("empresas")
      .upsert(faltantes.map((f) => toRow(f, uid)));
    if (!upErr) remotas = [...faltantes, ...remotas];
  }

  gravarCache(remotas);
  return remotas;
}

export async function saveEmpresa(rec: EmpresaRecord): Promise<EmpresaRecord> {
  const uid = await userId();
  if (!uid) throw new Error("Faça login para salvar o cadastro na nuvem.");

  // Casa por id ou CNPJ para não duplicar o mesmo cadastro.
  const existente =
    cache.find((e) => e.id === rec.id) ??
    (soDigitos(rec.cnpj) ? cache.find((e) => soDigitos(e.cnpj) === soDigitos(rec.cnpj)) : undefined);
  const final: EmpresaRecord = existente
    ? { ...existente, ...rec, id: existente.id, createdAt: existente.createdAt }
    : rec;

  const { error } = await supabase.from("empresas").upsert(toRow(final, uid));
  if (error) throw new Error(error.message);

  const list = existente
    ? cache.map((e) => (e.id === final.id ? final : e))
    : [final, ...cache];
  gravarCache(list);
  return final;
}

export async function removeEmpresa(id: string): Promise<void> {
  const uid = await userId();
  if (!uid) throw new Error("Faça login para excluir o cadastro.");
  const { error } = await supabase.from("empresas").delete().eq("id", id);
  if (error) throw new Error(error.message);
  gravarCache(cache.filter((e) => e.id !== id));
}

export function limparCacheEmpresas() {
  cache = [];
  try {
    localStorage.removeItem(CACHE_KEY);
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* noop */
  }
  notify();
}
