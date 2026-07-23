import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { knowledgePromptBlock } from "../_shared/knowledge.ts";

type Turn = { role: string; text: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { sessionId } = await req.json() as { sessionId: string };
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const service = createClient(supaUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // --- AuthZ: confirm caller owns this rehearsal session (or is admin).
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(
      supaUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: session, error: sErr } = await service
      .from("sessions")
      .select("id, user_id, transcript, rehearsal_context, parent_session_id, rehearsal_dimension")
      .eq("id", sessionId)
      .maybeSingle();
    if (sErr || !session) throw new Error(sErr?.message ?? "Rehearsal session not found");
    if (!session.parent_session_id) throw new Error("Not a rehearsal session");
    if (session.user_id !== userData.user.id) {
      const { data: roleRow } = await service
        .from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
      if (!roleRow) {
        return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const ctx = (session.rehearsal_context ?? {}) as {
      dimension?: { key: string; label: string; description?: string };
      buyer_name?: string;
      parent_dimension_score?: number | null;
      parent_dimension_rationale?: string;
    };
    const dim = ctx.dimension;
    if (!dim?.key) throw new Error("Rehearsal context missing dimension");

    const transcript = (session.transcript ?? []) as Turn[];
    const buyerName = ctx.buyer_name || "Buyer";

    const formatted = transcript.length
      ? transcript.map((t) => `${t.role === "agent" ? buyerName : "Rep"}: ${t.text}`).join("\n")
      : "(no dialogue captured)";

    const knowledge = await knowledgePromptBlock();
    const baseSystemPrompt = `You are a tough-but-fair sales coach scoring a SHORT rehearsal slice of a longer call. The rep is re-attempting one specific moment from a prior call. Focus ONLY on the dimension below.

DIMENSION: ${dim.label}${dim.description ? ` — ${dim.description}` : ""}

In the original call, the rep scored ${ctx.parent_dimension_score ?? "?"}/5 on this dimension. The coaching note then was: "${ctx.parent_dimension_rationale ?? "(none)"}".

Now score JUST this rehearsal attempt 1-5 on the same dimension. Be specific, reference the rehearsal transcript, and tell them whether this attempt is better or worse than their original — and why.`;
    const systemPrompt = knowledge ? `${knowledge}\n\n${baseSystemPrompt}` : baseSystemPrompt;

    const userPrompt = `REHEARSAL TRANSCRIPT (only this slice):\n${formatted}\n\nReturn ONLY a JSON object with this exact shape:\n{\n  "score": 1-5,\n  "rationale": "2-4 sentences. Lead with whether this rehearsal beat the original. Quote a moment from the rehearsal. End with one concrete suggestion."\n}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      if (aiResp.status === 429) throw new Error("Rate limit — please retry shortly");
      if (aiResp.status === 402) throw new Error("AI credits exhausted — add credits in Settings");
      throw new Error(`AI request failed [${aiResp.status}]: ${text}`);
    }

    const aiData = await aiResp.json();
    const content = aiData?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");
    let parsed: { score?: number; rationale?: string };
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("AI returned malformed JSON — please retry");
    }
    const rawScore = Number(parsed?.score ?? 0);
    const clamped = Math.max(1, Math.min(5, Math.round(rawScore)));
    const rationale = String(parsed?.rationale ?? "").trim();

    const { error: updErr } = await service
      .from("sessions")
      .update({
        scores: { [dim.key]: { score: clamped, rationale } },
        total_score: clamped * 20,
        coaching_summary: rationale,
        status: "rehearsed",
      })
      .eq("id", sessionId);
    if (updErr) throw new Error(`DB update failed: ${updErr.message}`);

    return new Response(JSON.stringify({ success: true, score: clamped, rationale }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("score-rehearsal error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});