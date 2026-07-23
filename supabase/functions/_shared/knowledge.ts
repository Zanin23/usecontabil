// Shared loader for the single global knowledge document.
// Module-level cache keeps hot-path latency at zero; TTL lets edits propagate.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const TTL_MS = 60_000;
let cache: { content: string; at: number } | null = null;

function client(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Returns raw markdown content of the global knowledge doc, or "" if unset. */
export async function loadGlobalKnowledge(): Promise<string> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.content;
  try {
    const { data } = await client()
      .from("knowledge_docs")
      .select("content")
      .eq("slug", "global")
      .maybeSingle();
    cache = { content: (data?.content ?? "").trim(), at: Date.now() };
  } catch (_e) {
    cache = { content: "", at: Date.now() };
  }
  return cache.content;
}

/**
 * Wraps the global knowledge content in a clear, model-friendly block.
 * Returns "" if knowledge is empty so callers can safely concatenate.
 */
export async function knowledgePromptBlock(): Promise<string> {
  const content = await loadGlobalKnowledge();
  if (!content) return "";
  return `KNOWLEDGE — Treat the following as a source of truth. When it conflicts with anything else, defer to it.\n\n${content}\n\n--- END KNOWLEDGE ---`;
}