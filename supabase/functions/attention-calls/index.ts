import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAuth } from "../_shared/requireAuth.ts";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/attention";

// Attention returns the transcript in several shapes depending on endpoint:
//   * list endpoint: a flat string ("SimpleTranscript")
//   * single endpoint (default): a v1/v2-style object  { final: [ { speaker, sentence | words } ] }
//   * single endpoint with detailedTranscript=true: an array of { speaker:{name}, words:[{text}] }
// Normalize all of these to a plain "Speaker: sentence" newline-delimited string.
function transcriptToString(t: unknown): string {
  if (!t) return "";
  if (typeof t === "string") return t;
  const segToLine = (seg: Record<string, unknown>) => {
    const sp = seg.speaker as unknown;
    const speaker = typeof sp === "string"
      ? sp
      : (sp && typeof sp === "object" && "name" in sp ? String((sp as { name?: string }).name ?? "") : "");
    const sentence = typeof seg.sentence === "string" ? seg.sentence : "";
    const words = Array.isArray(seg.words)
      ? (seg.words as Array<{ text?: string }>).map((w) => w?.text ?? "").filter(Boolean).join(" ")
      : "";
    const text = sentence || words;
    if (!text) return "";
    return speaker ? `${speaker}: ${text}` : text;
  };
  if (Array.isArray(t)) {
    return t.map((s) => segToLine(s as Record<string, unknown>)).filter(Boolean).join("\n");
  }
  if (typeof t === "object") {
    const obj = t as Record<string, unknown>;
    const final = (obj.final ?? (obj.v2 as Record<string, unknown> | undefined)?.final
      ?? (obj.v1 as Record<string, unknown> | undefined)?.final) as unknown;
    if (Array.isArray(final)) {
      return final.map((s) => segToLine(s as Record<string, unknown>)).filter(Boolean).join("\n");
    }
  }
  return "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const _authFail = await requireAuth(req);
  if (_authFail) return _authFail;

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const ATTENTION_API_KEY = Deno.env.get("ATTENTION_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!ATTENTION_API_KEY) throw new Error("ATTENTION_API_KEY not configured — connect Attention");

    const headers = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": ATTENTION_API_KEY,
    };

    const body = (await req.json().catch(() => ({ action: "list" }))) as
      { action?: string; id?: string; page?: number; query?: string; deep?: boolean; debug?: boolean };
    const { action, id, page, query, deep } = body;

    if (action === "get") {
      // Accept either a raw UUID or anything containing one (e.g. an Attention URL).
      const uuid = typeof id === "string"
        ? (id.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0] ?? id.trim())
        : "";
      if (!uuid) {
        return new Response(JSON.stringify({ error: "id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const res = await fetch(
        `${GATEWAY_URL}/conversations/${encodeURIComponent(uuid)}?detailedTranscript=true`,
        { headers },
      );
      if (!res.ok) {
        const t = await res.text();
        if (res.status === 404) {
          return new Response(JSON.stringify({ error: "Call not found in Attention" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`Attention get failed [${res.status}]: ${t}`);
      }
      const json = await res.json();
      // Single-conversation endpoint returns `{ attributes: {...} }` (sometimes
      // wrapped in `{ data: ... }` for vnd.api+json). Support both shapes.
      const a = ((json?.data?.attributes ?? json?.attributes ?? json?.data ?? json) ?? {}) as Record<string, unknown>;
      const transcript = transcriptToString(a.transcript);
      return new Response(JSON.stringify({
        id: (json?.id as string | undefined) ?? (json?.data?.id as string | undefined),
        title: (a.title as string) ?? "Untitled call",
        transcript,
        attendees: ((a.attendees as Array<{ name?: string; email?: string }>) ?? [])
          .map((x) => x.name ?? x.email ?? ""),
        finished_at: (a.finishedAt as string) ?? null,
        duration: (a.mediaDuration as number) ?? null,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // list — Attention's API has no server-side search, so:
    //   * No query: paginate 25 at a time (newest first).
    //   * Query: fan-out fetch up to SCAN_PAGES pages and filter title/attendees server-side.
    const q = typeof query === "string" ? query.trim().toLowerCase() : "";
    const PAGE_SIZE = 25;
    const SHALLOW_PAGES = 80;   // ~2,000 most recent calls (default search)
    const DEEP_CONCURRENCY = 12;

    const fetchPage = async (n: number) => {
      const url = new URL(`${GATEWAY_URL}/conversations`);
      url.searchParams.set("page", String(n));
      url.searchParams.set("size", String(PAGE_SIZE));
      const r = await fetch(url.toString(), { headers });
      if (!r.ok) throw new Error(`Attention list failed [${r.status}]`);
      return r.json();
    };

    const toCall = (row: { id: string; attributes: Record<string, unknown> }) => {
      const a = row.attributes ?? {};
      return {
        id: row.id,
        title: (a.title as string) ?? "Untitled call",
        attendees: ((a.attendees as Array<{ name?: string; email?: string }>) ?? [])
          .map((x) => x.name ?? x.email ?? "").filter(Boolean) as string[],
        finished_at: (a.finishedAt as string) ?? null,
        duration: (a.mediaDuration as number) ?? null,
        has_transcript: transcriptToString(a.transcript).length > 50,
      };
    };

    if (q) {
      const first = await fetchPage(1);
      const totalPagesAvail = Number(first?.meta?.pageCount ?? 1);
      const cap = deep ? totalPagesAvail : Math.min(totalPagesAvail, SHALLOW_PAGES);
      // Stream pages in concurrency-limited batches and keep ONLY matches to stay
      // within the edge function's memory limit (200+ pages of raw JSON is too big).
      const matchOf = (row: { id: string; attributes: Record<string, unknown> }) => {
        const c = toCall(row);
        return c.title.toLowerCase().includes(q) || c.attendees.some((n) => n.toLowerCase().includes(q))
          ? c : null;
      };
      const matches: ReturnType<typeof toCall>[] = [];
      let scanned = 0;
      const consume = (j: { data?: unknown[] }) => {
        const rows = (j?.data ?? []) as Array<{ id: string; attributes: Record<string, unknown> }>;
        scanned += rows.length;
        for (const r of rows) {
          const m = matchOf(r);
          if (m) matches.push(m);
          if (matches.length >= 200) break;
        }
      };
      consume(first);
      const pagesToFetch = Array.from({ length: Math.max(0, cap - 1) }, (_, i) => i + 2);
      for (let i = 0; i < pagesToFetch.length && matches.length < 200; i += DEEP_CONCURRENCY) {
        const batch = pagesToFetch.slice(i, i + DEEP_CONCURRENCY);
        const results = await Promise.all(batch.map((n) => fetchPage(n)));
        for (const r of results) consume(r);
      }
      return new Response(JSON.stringify({
        calls: matches.slice(0, 100),
        page: 1,
        page_count: 1,
        scanned,
        total_records: first?.meta?.totalRecords ?? null,
        truncated: cap < totalPagesAvail,
        deep: Boolean(deep),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const p = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const json = await fetchPage(p);
    return new Response(JSON.stringify({
      calls: (json.data ?? []).map(toCall),
      page: json?.meta?.pageNumber ?? p,
      page_count: json?.meta?.pageCount ?? 1,
      total_records: json?.meta?.totalRecords ?? null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});