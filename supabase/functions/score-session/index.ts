import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { knowledgePromptBlock } from "../_shared/knowledge.ts";

type Category = { key: string; label: string; description: string; weight?: number };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { sessionId, transcript, difficulty, selfAssessment, categories, redFlagExamples, greenFlagExamples, buyerName } = await req.json() as {
      sessionId: string;
      transcript: { role: string; text: string }[];
      difficulty: string;
      selfAssessment?: { did_well?: string; would_improve?: string };
      categories: Category[];
      redFlagExamples?: string[];
      greenFlagExamples?: string[];
      buyerName?: string;
    };
    if (!sessionId || !Array.isArray(transcript)) {
      return new Response(JSON.stringify({ error: "sessionId and transcript required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supaUrl = Deno.env.get("SUPABASE_URL")!;

    // --- AuthZ: confirm the caller actually owns this session (or is admin)
    // before we use the service role to overwrite it. Without this any
    // authenticated user could pass an arbitrary sessionId.
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
    const serviceClient = createClient(supaUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: ownerRow } = await serviceClient
      .from("sessions").select("user_id").eq("id", sessionId).maybeSingle();
    if (!ownerRow) {
      return new Response(JSON.stringify({ success: false, error: "Session not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (ownerRow.user_id !== userData.user.id) {
      const { data: roleRow } = await serviceClient
        .from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
      if (!roleRow) {
        return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const cats = categories ?? [];
    const weightFor = (c: Category) => {
      const w = typeof c.weight === "number" && c.weight > 0 ? c.weight : 1;
      return w;
    };
    const weightSum = cats.reduce((s, c) => s + weightFor(c), 0) || 1;
    const rubricLines = cats
      .map((c, i) => `${i + 1}. ${c.key} (weight ${Math.round((weightFor(c) / weightSum) * 100)}%) — ${c.description}`)
      .join("\n");
    const RUBRIC = `Score the salesperson on each dimension 1-5 (1=poor, 5=excellent). The dimensions are weighted — heavier dimensions matter more for the overall result.\n\n${rubricLines}\n\nRED FLAGS to detect (only include the ones that actually happened):\n${(redFlagExamples ?? []).map((f) => `- ${f}`).join("\n")}\n\nGREEN FLAGS to detect (only include the ones that actually happened):\n${(greenFlagExamples ?? []).map((f) => `- ${f}`).join("\n")}`;
    const scoresShape = cats
      .map((c) => `    "${c.key}": { "score": 1-5, "rationale": "..." }`)
      .join(",\n");

    // Format transcript for the model
    const formatted = transcript
      .map((t) => `${t.role === "agent" ? (buyerName ?? "Buyer") : "Rep"}: ${t.text}`)
      .join("\n");

    const knowledge = await knowledgePromptBlock();
    const baseSystemPrompt = `You are an expert sales coach evaluating a role-play discovery call. The buyer was played by an AI. Be tough but fair. Use the transcript only — don't invent facts.\n\nDifficulty was: ${difficulty}.\n\nYOUR JOB IS TO COACH, NOT NARRATE. Every per-dimension rationale must be forward-looking advice the rep can act on next time. Do NOT just describe what happened or restate what the rep said. Instead, tell them what to do differently and, where possible, give a concrete example of a better question, reframe, or response they could have used at a specific moment in the call. Quote the buyer or rep only briefly to anchor the advice ("When ${buyerName ?? "the buyer"} said X, a stronger move would have been Y — for example: '…'").\n\nIf the rep already executed a dimension well, still add one specific way to level it up further.\n\nThe rep also gave a self-assessment. If their self-assessment shows good self-awareness, call that out positively. If they're way off (blind spots), call that out gently in the coaching summary.`;
    const systemPrompt = knowledge ? `${knowledge}\n\n${baseSystemPrompt}` : baseSystemPrompt;

    const sa = selfAssessment;
    const saBlock = sa
      ? `\n\nREP SELF-ASSESSMENT:\n- Did well: ${sa.did_well || "(skipped)"}\n- Would improve: ${sa.would_improve || "(skipped)"}`
      : "";

    const userPrompt = `${RUBRIC}\n\nTRANSCRIPT:\n${formatted || "(no dialogue captured)"}${saBlock}\n\nReturn ONLY a JSON object with this exact shape:\n{\n  "scores": {\n${scoresShape}\n  },\n  "red_flags": ["..."],\n  "green_flags": ["..."],\n  "coaching_summary": "2-4 sentences of specific, actionable coaching. Reference the rep's self-assessment if relevant."\n}\n\nRationale rules (MANDATORY):\n- Lead with the coaching point ("Next time, …" / "A stronger move would be …" / "Try …").\n- Include at least one concrete, specific recommendation — ideally a sample question or phrase in quotes the rep could literally say.\n- Tie the advice to a specific moment in the transcript so it's not generic.\n- Avoid pure recap ("You asked about budget and they answered…"). Recap is only allowed as a short setup for the advice that follows.\n\nThe overall total will be computed server-side from the per-dimension scores and weights — do not include a total in your response.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
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

    let parsed: { scores?: Record<string, { score?: number; rationale?: string }>; red_flags?: string[]; green_flags?: string[]; coaching_summary?: string };
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("AI returned malformed JSON — please retry");
    }

    // Compute weighted total 0-100 from per-dimension scores
    let weighted = 0;
    for (const c of cats) {
      const raw = Number(parsed?.scores?.[c.key]?.score ?? 0);
      const clamped = Math.max(0, Math.min(5, raw));
      weighted += (clamped / 5) * weightFor(c);
    }
    const total100 = Math.round((weighted / weightSum) * 100);

    // Persist scores using the service-role client we created above for the
    // ownership check (avoids double-instantiation).
    const { error: updateErr } = await serviceClient
      .from("sessions")
      .update({
        scores: parsed.scores,
        total_score: total100,
        red_flags: parsed.red_flags ?? [],
        green_flags: parsed.green_flags ?? [],
        coaching_summary: parsed.coaching_summary ?? "",
        self_assessment: sa ?? null,
        status: "scored",
      })
      .eq("id", sessionId);

    if (updateErr) throw new Error(`DB update failed: ${updateErr.message}`);

    return new Response(JSON.stringify({ success: true, ...parsed, total_score: total100 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("score-session error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});