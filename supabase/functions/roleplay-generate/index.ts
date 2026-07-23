import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAuth } from "../_shared/requireAuth.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { knowledgePromptBlock } from "../_shared/knowledge.ts";

// All role-plays use a single canonical ElevenLabs voice so the library
// stays consistent across scenarios.
// Gender-locked library voices that ship with every ElevenLabs account.
const FEMALE_VOICES = [
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah" },
  { id: "XB0fDUnXU5powFXDhCwa", label: "Charlotte" },
  { id: "XrExE9yKIg1WjnnlVkGX", label: "Matilda" },
  { id: "cgSgspJ2msm6clMCkdW9", label: "Jessica" },
];
const MALE_VOICES = [
  { id: "onwK4e9ZLuTAKqWW03F9", label: "Daniel" },
  { id: "JBFqnCBsd6RMkjVDRZzb", label: "George" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", label: "Liam" },
  { id: "iP95p4xoKVk53GoZ742B", label: "Chris" },
];

function pickVoice(gender: "male" | "female", used: Set<string>) {
  const pool = gender === "male" ? MALE_VOICES : FEMALE_VOICES;
  const free = pool.filter((v) => !used.has(v.id));
  const choice = (free.length ? free : pool)[Math.floor(Math.random() * (free.length || pool.length))];
  return choice;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const _authFail = await requireAuth(req);
  if (_authFail) return _authFail;

  try {
    const { prompt, role, opening_line, transcript } = await req.json();
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

    const knowledge = await knowledgePromptBlock();
    const baseSystem = `You design realistic B2B sales role-plays for rep training.
Given a single free-form description from a coach, produce a complete role-play spec.

Rules:
- The buyer persona must feel like a real person — pick a first name, exact title, and a real-sounding company (or one implied by the prompt).
- system_prompt is the buyer's full character bible: who they are, what they care about, how they talk, what they push back on, what would actually win them over. Write it as 2nd-person instructions to the LLM playing the buyer. Make them sound like a real person on a real phone call: short sentences, contractions, occasional natural fillers, never theatrical. DO NOT include the buyer's opening line / first utterance anywhere in the system_prompt — the opening_line field below is what the buyer actually says first, and duplicating it inside system_prompt (e.g. "Open with: ...", "Your opening line: ...", "Lead with: ...", a quoted first line at the top of HOW TO BEHAVE) confuses the model. Behavioral guidance for later in the call is fine.
- ALWAYS include a CONVERSATION PROGRESSION / anti-loop rule in the system_prompt under HOW TO BEHAVE. It must say: never repeat the same question or scripted line twice; example lines are one-time examples, not reusable scripts; if the rep partially answered, acknowledge what they answered and ask a NEW narrower follow-up; once a topic has been answered well enough, move on.
- scenario_brief is what the REP sees before the call. Markdown OK. 4-8 short lines covering: who they're calling, what the rep's company sells, the goal of the call, 1-2 known facts about the buyer.
- difficulty_overlays: short additional instructions appended to the buyer's prompt at easy/standard/hard. Easy = friendlier, more open. Hard = more skeptical, more objections, tighter time.
- scorecard: 3-5 categories tailored to the topic. Behavioral, gradable descriptions.
- name: a 2-3 word, plain-English description of what the CALL is about — not the persona, not the company, not the rep's role. Title Case. Examples: "App Sprawl Discovery", "Pricing Pushback", "Renewal Risk Save", "Security Objections", "Exec Buy-In". Max 3 words. Never include a person's name, job title, or company name (those live on the persona and tagline).
- slug: url-safe lowercase-hyphen version of name.
- topic: 1-3 words like "Discovery", "Objection handling", "Demo", "Pricing".
- tagline: ONE short abstract sentence that describes the call at a glance, for the role-play card. Format: "A <call type> with a <buyer archetype>." or similar. Examples: "A discovery call with a skeptical Chief Product Officer.", "A kickoff call focused on success metrics with a non-technical VP.", "A pricing pushback call with a procurement-led CFO." Max ~110 chars. No proper nouns (no company or first names), no markdown.
- gender: "male" or "female" — your best read of the buyer's perceived gender from the first name and persona. Pick the one that sounds most natural for the character; do not default.

If the coach gave you the rep's role or an opening line, respect them exactly.`;
    const system = knowledge ? `${knowledge}\n\n${baseSystem}` : baseSystem;

    const userMsg = `Rep role being trained: ${role ?? "AE"}
${opening_line ? `Opening line the buyer will say first (use verbatim, do not rewrite): "${opening_line}"` : `No opening line provided — write a natural one the BUYER would actually say when they pick up the phone. CRITICAL: opening_line is spoken BY the buyer (the persona you designed), TO the rep. It must be in the buyer's voice. Never write it from the rep's perspective. Never have the buyer greet themselves by their own first name, thank the rep for taking time, or ask about "our platform / our product" — those are rep lines. Good buyer openers sound like: "Hey, this is <BuyerFirstName>." / "Yeah, hi — go ahead." / "You've got five minutes, what've you got?"`}

Coach description:
${prompt}${
  transcript && typeof transcript === "string" && transcript.trim()
    ? `\n\nReference material from a real call (meeting notes or transcript). Mine it for the buyer's voice, objections, vocabulary, and the actual deal context — but do NOT copy it verbatim. Build a realistic role-play that captures the same dynamic:\n"""\n${transcript.slice(0, 12000)}\n"""`
    : ""
}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, { role: "user", content: userMsg }],
        tools: [{
          type: "function",
          function: {
            name: "emit_roleplay",
            description: "Emit a complete role-play spec",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string" },
                slug: { type: "string" },
                topic: { type: "string" },
                tagline: { type: "string" },
                gender: { type: "string", enum: ["male", "female"] },
                persona: {
                  type: "object",
                  properties: {
                    first_name: { type: "string" },
                    title: { type: "string" },
                    company: { type: "string" },
                  },
                  required: ["first_name", "title", "company"],
                  additionalProperties: false,
                },
                system_prompt: { type: "string" },
                scenario_brief: { type: "string" },
                opening_line: { type: "string" },
                difficulty_overlays: {
                  type: "object",
                  properties: {
                    easy: { type: "string" },
                    standard: { type: "string" },
                    hard: { type: "string" },
                  },
                  required: ["easy", "standard", "hard"],
                  additionalProperties: false,
                },
                scorecard: {
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
                        },
                        required: ["key", "label", "description"],
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
              required: ["name", "slug", "topic", "tagline", "gender", "persona", "system_prompt", "scenario_brief", "opening_line", "difficulty_overlays", "scorecard"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "emit_roleplay" } },
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
    let args: Record<string, unknown> | null = null;
    if (call?.function?.arguments) {
      try {
        args = JSON.parse(call.function.arguments);
      } catch {
        return new Response(JSON.stringify({ error: "AI returned malformed tool-call JSON — please retry" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    if (!args) {
      return new Response(JSON.stringify({ error: "no tool call returned" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pick a natural voice that matches the buyer's perceived gender and isn't
    // already used by another role-play — so each role-play in the library
    // sounds like a different real person.
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const used = new Set<string>();
    if (supabaseUrl && serviceKey) {
      try {
        const admin = createClient(supabaseUrl, serviceKey);
        const { data: existing } = await admin.from("role_plays").select("persona");
        for (const row of existing ?? []) {
          const vid = (row as { persona?: { voice_id?: string } }).persona?.voice_id;
          if (vid) used.add(vid);
        }
      } catch { /* fall through to random pick */ }
    }
    const gender = (args.gender === "male" ? "male" : "female") as "male" | "female";
    const voice = pickVoice(gender, used);

    const role_play = {
      slug: args.slug,
      name: args.name,
      role: role ?? "AE",
      topic: args.topic,
      persona: {
        first_name: args.persona.first_name,
        title: args.persona.title,
        company: args.persona.company,
        headshot_url: "",
        voice_id: voice.id,
        voice_label: voice.label,
        tagline: args.tagline,
        gender,
      },
      system_prompt: args.system_prompt,
      difficulty_overlays: args.difficulty_overlays,
      scorecard: { ...args.scorecard, prompt },
      opening_line: opening_line?.trim() ? opening_line.trim() : args.opening_line,
      scenario_brief: args.scenario_brief,
      is_published: true,
    };

    return new Response(JSON.stringify({ role_play }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});