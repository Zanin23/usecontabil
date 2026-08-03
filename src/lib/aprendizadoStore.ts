/**
 * Progresso de estudo da Central de Aprendizado.
 * Cache local otimista + sincronização com a tabela learning_progress.
 * Não contém regra fiscal alguma.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StatusLicao = "vista" | "concluida";
export type Progresso = Record<string, StatusLicao>;

const CHAVE = "uc:aprendizado:progresso";
const EVENTO = "usecontabil:aprendizado-changed";

let cache: Progresso = carregarLocal();

function carregarLocal(): Progresso {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? "{}") as Progresso;
  } catch {
    return {};
  }
}

function persistir() {
  localStorage.setItem(CHAVE, JSON.stringify(cache));
  window.dispatchEvent(new CustomEvent(EVENTO));
}

export function getProgresso(): Progresso {
  return cache;
}

export async function sincronizarProgresso() {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return;
  const { data, error } = await supabase
    .from("learning_progress")
    .select("licao_slug,status")
    .eq("user_id", user.id);
  if (error || !data) return;
  const remoto: Progresso = {};
  for (const linha of data) remoto[linha.licao_slug] = linha.status as StatusLicao;
  // concluída sempre vence "vista"
  const juntos: Progresso = { ...remoto };
  for (const [slug, status] of Object.entries(cache)) {
    if (status === "concluida" || !juntos[slug]) juntos[slug] = status;
  }
  cache = juntos;
  persistir();
}

export async function marcarLicao(slug: string, status: StatusLicao) {
  if (cache[slug] === "concluida" && status === "vista") return;
  cache = { ...cache, [slug]: status };
  persistir();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return;
  const { error } = await supabase
    .from("learning_progress")
    .upsert(
      { user_id: user.id, licao_slug: slug, status, updated_at: new Date().toISOString() },
      { onConflict: "user_id,licao_slug" },
    );
  if (error) console.error("Falha ao salvar progresso de estudo:", error.message);
}

export async function limparProgresso() {
  cache = {};
  persistir();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from("learning_progress").delete().eq("user_id", auth.user.id);
}

export function useProgresso() {
  const [progresso, setProgresso] = useState<Progresso>(cache);

  useEffect(() => {
    const atualizar = () => setProgresso({ ...cache });
    window.addEventListener(EVENTO, atualizar);
    void sincronizarProgresso();
    return () => window.removeEventListener(EVENTO, atualizar);
  }, []);

  return {
    progresso,
    marcar: marcarLicao,
    limpar: limparProgresso,
    concluidas: Object.values(progresso).filter((s) => s === "concluida").length,
  };
}
