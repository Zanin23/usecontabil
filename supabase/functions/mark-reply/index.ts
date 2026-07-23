import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAuth } from "../_shared/requireAuth.ts";
import { knowledgePromptBlock } from "../_shared/knowledge.ts";

const SPOKEN_STYLE = `You are on a live phone call. Speak the way a real person speaks out loud:
- Reply in short, natural spoken sentences (usually 1-3 sentences).
- Use contractions and the occasional natural filler ("yeah", "right", "hmm", "look").
- Never use markdown, asterisks, bullet points, numbered lists, headings, or stage directions.
- Never describe your own actions in parentheses.`;

const COACH_PROMPT = `You are now stepping out of the buyer roleplay and into coach mode.
Before giving feedback, ask the rep for a brief self-assessment. Be warm but direct. Say something like:
"Alright, before I give you mine — quickly, what's one thing you think you did well, and one thing you'd do differently next time?"
Keep it to 1-2 short sentences. Don't break into feedback yet.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const _authFail = await requireAuth(req);
  if (_authFail) return _authFail;
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
    const { transcript, systemPrompt, difficultyOverlay, mode } = await req.json() as {
      transcript: { role: "agent" | "user"; text: string }[];
      systemPrompt: string;
      difficultyOverlay?: string;
      mode?: "roleplay" | "coach";
    };

    const knowledge = await knowledgePromptBlock();
    const base = mode === "coach"
      ? COACH_PROMPT
      : `${SPOKEN_STYLE}\n\n${systemPrompt}\n\n${difficultyOverlay ?? ""}`;
    const system = knowledge ? `${knowledge}\n\n${base}` : base;
    const messages = [
      { role: "system", content: system },
      ...transcript.map((t) => ({
        role: t.role === "agent" ? "assistant" : "user",
        content: t.text,
      })),
    ];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
      signal: AbortSignal.timeout(60000),
    });
    if (!resp.ok) {
      const text = await resp.text();
      if (resp.status === 429) throw new Error("Rate limited — try again shortly");
      if (resp.status === 402) throw new Error("AI credits exhausted");
      throw new Error(`AI failed [${resp.status}]: ${text}`);
    }
    const data = await resp.json();
    const reply = data?.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});