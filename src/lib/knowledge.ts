import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "global_knowledge_v1";
const TTL_MS = 5 * 60_000;
let inflight: Promise<string> | null = null;

type Cached = { content: string; at: number };

function readCache(): Cached | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (!parsed || typeof parsed.content !== "string") return null;
    if (Date.now() - parsed.at > TTL_MS) return null;
    return parsed;
  } catch { return null; }
}

function writeCache(content: string) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ content, at: Date.now() })); } catch { /* noop */ }
}

/** Fetch the single global knowledge doc, cached in sessionStorage. Returns "" on any failure. */
export async function getGlobalKnowledge(): Promise<string> {
  const cached = readCache();
  if (cached) return cached.content;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data } = await supabase
        .from("knowledge_docs")
        .select("content")
        .eq("slug", "global")
        .maybeSingle();
      const content = (data?.content ?? "").trim();
      writeCache(content);
      return content;
    } catch {
      writeCache("");
      return "";
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Prepend a knowledge block to a system prompt. No-op if knowledge is empty. */
export function withKnowledge(systemPrompt: string, knowledge: string): string {
  if (!knowledge) return systemPrompt;
  return `KNOWLEDGE — Treat the following as a source of truth. When it conflicts with anything else, defer to it.\n\n${knowledge}\n\n--- END KNOWLEDGE ---\n\n${systemPrompt}`;
}