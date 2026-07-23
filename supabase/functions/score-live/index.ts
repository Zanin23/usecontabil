import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAuth } from "../_shared/requireAuth.ts";
import { knowledgePromptBlock } from "../_shared/knowledge.ts";

type Category = { key: string; label: string; description: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const _authFail = await requireAuth(req);
  if (_authFail) return _authFail;
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
    const { transcript, difficulty, categories, buyerName } = await req.json() as {
      transcript: { role: string; text: string }[];
      difficulty: string;
      categories: Category[];
      buyerName?: string;
    };

    const rubricLines = categories.map((c, i) => `${i + 1}. ${c.key} — ${c.description}`).join("\n");
    const RUBRIC = `Score the salesperson on each dimension 0-5 (0=not yet observed, 1=poor, 5=excellent). Be lenient early — if the call has barely started, scores will be 0-2 and that's fine.\n\n${rubricLines}`;
    const scoresShape = categories
      .map((c) => `    "${c.key}": { "score": 0-5, "summary": "one short line", "working": ["..."], "improve": ["..."] }`)
      .join(",\n");

    const formatted = transcript
      .map((t) => `${t.role === "agent" ? (buyerName ?? "Buyer") : "Rep"}: ${t.text}`)
      .join("\n");

    const prompt = `${RUBRIC}\n\nDifficulty: ${difficulty}\n\nTRANSCRIPT SO FAR:\n${formatted || "(no dialogue yet)"}\n\nReturn ONLY JSON:\n{\n  "scores": {\n${scoresShape}\n  }\n}`;

    const knowledge = await knowledgePromptBlock();
    const systemContent = knowledge
      ? `${knowledge}\n\nYou are a fast sales-coach scoring partial transcripts. Be terse.`
      : "You are a fast sales-coach scoring partial transcripts. Be terse.";
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!resp.ok) {
      const t = await resp.text();
      if (resp.status === 429) throw new Error("Rate limited");
      if (resp.status === 402) throw new Error("AI credits exhausted");
      throw new Error(`AI failed [${resp.status}]: ${t}`);
    }
    const data = await resp.json();
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}");
    } catch {
      parsed = { scores: {} };
    }
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});