import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAuth } from "../_shared/requireAuth.ts";
import { knowledgePromptBlock } from "../_shared/knowledge.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const _authFail = await requireAuth(req);
  if (_authFail) return _authFail;

  try {
    const { prompt, persona, role, topic, existing } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isEdit = !!existing && Array.isArray(existing?.categories);
    const knowledge = await knowledgePromptBlock();
    const baseSystem = `You design sales role-play scorecards. Return a JSON scorecard with:
- 3 to 6 categories (key: snake_case id, label: short name, description: 1-sentence scoring criterion the LLM grader will follow, weight: integer 1-10 reflecting relative importance)
- 3 to 6 red_flag_examples (short concrete rep behaviors that should LOSE points)
- 3 to 6 green_flag_examples (short concrete rep behaviors that should EARN points)
Tailor everything to the persona and topic. Keep language tight and behavioral.${isEdit ? "\n\nYou are EDITING an existing scorecard. Apply the user's instruction. Preserve unchanged categories (same key, label, description, weight) unless the instruction implies a change. Only add/remove/rename/reweight what the instruction asks for." : ""}`;
    const system = knowledge ? `${knowledge}\n\n${baseSystem}` : baseSystem;

    const existingBlock = isEdit
      ? `\n\nEXISTING SCORECARD (JSON):\n${JSON.stringify(existing, null, 2)}`
      : "";

    const userMsg = `Persona: ${persona?.first_name ?? ""} — ${persona?.title ?? ""} @ ${persona?.company ?? ""}
Rep role being trained: ${role ?? "AE"}
Topic: ${topic ?? ""}${existingBlock}

${isEdit ? "Edit instruction" : "Coach intent"}:
${prompt}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, { role: "user", content: userMsg }],
        tools: [{
          type: "function",
          function: {
            name: "emit_scorecard",
            description: "Emit the scorecard",
            parameters: {
              type: "object",
              properties: {
                categories: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      key: { type: "string" },
                      label: { type: "string" },
                      description: { type: "string" },
                      weight: { type: "integer", minimum: 1, maximum: 10 },
                    },
                    required: ["key", "label", "description", "weight"],
                    additionalProperties: false,
                  },
                },
                red_flag_examples: { type: "array", items: { type: "string" } },
                green_flag_examples: { type: "array", items: { type: "string" } },
              },
              required: ["categories", "red_flag_examples", "green_flag_examples"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "emit_scorecard" } },
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ error: `AI gateway ${res.status}: ${text}` }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    let args: unknown = null;
    if (call?.function?.arguments) {
      try { args = JSON.parse(call.function.arguments); }
      catch (e) {
        return new Response(JSON.stringify({ error: "AI returned malformed scorecard JSON", detail: String((e as Error).message ?? e) }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    if (!args) {
      return new Response(JSON.stringify({ error: "no tool call returned" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ scorecard: { ...args, prompt } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});