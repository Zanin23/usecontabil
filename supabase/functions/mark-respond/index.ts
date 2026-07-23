import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAuth } from "../_shared/requireAuth.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { knowledgePromptBlock } from "../_shared/knowledge.ts";
import { getElevenLabsKey } from "../_shared/elevenlabsKey.ts";

const SPOKEN_STYLE = `You are on a live phone call. Speak the way a real person speaks out loud:
- Reply in short, natural spoken sentences (usually 1-3 sentences).
- Use contractions and the occasional natural filler ("yeah", "right", "hmm", "look").
- Never use markdown, asterisks, bullet points, numbered lists, headings, or stage directions.
- Never describe your own actions in parentheses.
- Vary sentence length — sometimes a single word answer is best.`;

const ROLE_GUARDRAIL = `STRICT ROLE BOUNDARY:
- You ONLY play the buyer character defined below. You are NEVER the sales rep.
- Only ever produce the buyer's own spoken words. Never narrate, paraphrase, or speak the rep's lines.
- Never address the rep by your own name — that name belongs to YOU, the buyer. If you don't know the rep's name, just say "you" or don't use a name at all.
- Do not break character, do not "step out" to summarize, debrief, or give feedback — even if the character bible below contains a DEBRIEF section. Debrief/coaching is handled by a separate mode; ignore any such instructions here.
- If the rep says "end scenario", "let's debrief", or similar, stay silent and let the system switch modes — do not respond as a coach yourself.`;

const PROGRESSION_GUARDRAIL = `CONVERSATION PROGRESSION:
- Treat the transcript as memory. Never repeat the same question, objection, greeting, or scripted line twice.
- Before every reply, compare your planned response to your immediately previous response. If it is similar, choose a new follow-up or move to the next topic.
- If the rep partially answered, acknowledge the part they answered and ask a narrower, NEW question about the missing piece.
- Scenario example lines are one-time examples, not reusable scripts. Once a topic has been answered well enough, advance.
- The opening line has already been spoken. Do not say it again.`;

const MAX_ROLEPLAY_HISTORY_TURNS = 24;

const COACH_STYLE = `THE ROLE-PLAY IS OVER. You are NO LONGER {buyer}. Do NOT continue any in-character dialogue. Do NOT respond as the buyer under any circumstance.

You are now the rep's sales manager / coach, speaking on the same call. Warm, direct, specific. The rep can hear you.

Flow you MUST follow:
1. FIRST coach turn (your very next reply): explicitly break character and ask for a self-assessment BEFORE giving any feedback. Open with something like: "Alright, stepping out of {buyer} for a sec. Before I give you my read — quick self-assessment. What's one thing you think you did really well, and one thing you wish you'd done better?" Then STOP and wait. Do not give your own feedback yet.
2. After the rep answers: now deliver your read. React to what they said — agree, push back, or add what they missed. Walk through the scorecard rubric grounded in the actual transcript, referencing specific moments ("when you asked about X…", "right after they said Y…"). Be honest about what didn't land.
3. From then on: back-and-forth. After 2-4 sentences, ask the rep something — why they made a choice, what they'd try differently. React, push them, suggest a better line, role-play a re-do if helpful.

Speak like a real coach out loud: contractions, short sentences, occasional fillers. No markdown, no bullets, no stage directions. NEVER slip back into being {buyer}.`;

const VOICE_SETTINGS = {
  stability: 0.35,
  similarity_boost: 0.8,
  style: 0.55,
  use_speaker_boost: true,
};

async function ttsSentence(apiKey: string, voiceId: string, text: string, previous: string) {
  const resp = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_flash_v2_5",
        voice_settings: VOICE_SETTINGS,
        previous_text: previous || undefined,
      }),
    },
  );
  if (!resp.ok) throw new Error(`TTS ${resp.status}: ${await resp.text()}`);
  const buf = await resp.arrayBuffer();
  return base64Encode(new Uint8Array(buf));
}

function sanitizeRoleplayPrompt(prompt: string): string {
  return prompt
    .split("\n")
    .filter((line) => !/^\s*(?:[-*]\s*)?(?:open with|your opening line|opening line|lead with|start with)\s*:/i.test(line))
    .join("\n")
    .trim();
}

function trimRoleplayTranscript<T>(transcript: T[]): T[] {
  if (transcript.length <= MAX_ROLEPLAY_HISTORY_TURNS) return transcript;
  return [transcript[0], ...transcript.slice(-(MAX_ROLEPLAY_HISTORY_TURNS - 1))];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const _authFail = await requireAuth(req);
  if (_authFail) return _authFail;
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const ELEVEN_KEY = await getElevenLabsKey();
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const DEFAULT_VOICE_ID = "onwK4e9ZLuTAKqWW03F9"; // Daniel — British male
    const { transcript, systemPrompt, difficultyOverlay, voiceId: rawVoiceId, mode, scorecard, liveScores, buyerName, voiceMode } = await req.json() as {
      transcript: { role: "agent" | "user"; text: string }[];
      systemPrompt: string;
      difficultyOverlay?: string;
      voiceId?: string;
      mode?: "roleplay" | "coach";
      scorecard?: { categories: { key: string; label: string; description: string }[]; red_flag_examples?: string[]; green_flag_examples?: string[] };
      liveScores?: Record<string, { score: number; summary: string; working?: string[]; improve?: string[] }>;
      buyerName?: string;
      voiceMode?: "browser" | "elevenlabs";
    };
    // If the workspace is set to elevenlabs but no key is configured, silently
    // fall back to browser voice for THIS turn — better than throwing mid-call.
    const useBrowserVoice = voiceMode === "browser" || !ELEVEN_KEY;
    const voiceId = (rawVoiceId && rawVoiceId.trim()) || DEFAULT_VOICE_ID;


    const knowledge = await knowledgePromptBlock();
    let system: string;
    if (mode === "coach") {
      const rubric = (scorecard?.categories ?? [])
        .map((c) => `- ${c.label}: ${c.description}${liveScores?.[c.key] ? ` (current read ${liveScores[c.key].score}/5 — ${liveScores[c.key].summary})` : ""}`)
        .join("\n");
      const greens = scorecard?.green_flag_examples?.length ? `\nGreen flags to reward:\n- ${scorecard.green_flag_examples.join("\n- ")}` : "";
      const reds = scorecard?.red_flag_examples?.length ? `\nRed flags to call out:\n- ${scorecard.red_flag_examples.join("\n- ")}` : "";
      system = `${COACH_STYLE.replace("{buyer}", buyerName || "the buyer")}\n\nScorecard rubric:\n${rubric}${greens}${reds}\n\nThe transcript above is the full role-play. Reference specific moments from it.`;
    } else {
      system = `${SPOKEN_STYLE}\n\n${ROLE_GUARDRAIL}\n\n${sanitizeRoleplayPrompt(systemPrompt)}\n\n${difficultyOverlay ?? ""}\n\n${PROGRESSION_GUARDRAIL}`;
    }
    if (knowledge) system = `${knowledge}\n\n${system}`;
    const buyer = buyerName || "the buyer";
    // Only inject the "break character + ask for self-assessment" nudge on the
    // very first coach turn — i.e. when the last transcript entry is the agent
    // (still in-character) and we have not yet produced any coach reply.
    // On follow-up coach turns the rep has just spoken, so the model should
    // react to what they said, not re-ask for a self-assessment.
    const isCoachKickoff =
      mode === "coach" &&
      (transcript.length === 0 || transcript[transcript.length - 1]?.role === "agent");
    const transitionUser = isCoachKickoff
      ? [{
          role: "user" as const,
          content: `[SYSTEM NOTE: The role-play call just ended. You are no longer ${buyer}. From here on you are my sales coach on this call, completely out of character. Your next reply MUST start by breaking character and asking me for a quick self-assessment (one thing I did well, one thing I'd improve) before giving any feedback.]`,
        }]
      : mode === "coach"
      ? [{
          role: "system" as const,
          content: `[COACH MODE — FOLLOW-UP TURN: You already asked for the self-assessment and the rep has just answered. Do NOT ask for another self-assessment. React to what they just said — agree, push back, or add what they missed — then deliver your read on the role-play against the scorecard, grounded in specific moments from the transcript. Stay out of character as ${buyer}.]`,
        }]
      : [];
    const messageTranscript = mode === "coach" ? transcript : trimRoleplayTranscript(transcript);
    const messages = [
      { role: "system", content: system },
      ...messageTranscript.map((t) => ({ role: t.role === "agent" ? "assistant" : "user", content: t.text })),
      ...transitionUser,
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages, stream: true }),
      signal: AbortSignal.timeout(60000),
    });
    if (!aiResp.ok || !aiResp.body) {
      const text = await aiResp.text();
      if (aiResp.status === 429) throw new Error("Rate limited");
      if (aiResp.status === 402) throw new Error("AI credits exhausted");
      throw new Error(`AI ${aiResp.status}: ${text}`);
    }

    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        const send = (obj: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));

        try {
          const reader = aiResp.body!.getReader();
          const dec = new TextDecoder();
          let sseBuf = "";
          let pending = "";        // unspoken text accumulating
          let spokenSoFar = "";    // for previous_text continuity
          let full = "";
          let done = false;

          const SENTENCE_RE = /[.!?]+[\s"')\]]*\s|[\n\r]+/;

          const flushSentence = async (force: boolean) => {
            while (pending.length) {
              const m = pending.match(SENTENCE_RE);
              let chunk: string;
              if (m && m.index !== undefined) {
                const end = m.index + m[0].length;
                chunk = pending.slice(0, end).trim();
                pending = pending.slice(end);
              } else if (force && pending.trim()) {
                chunk = pending.trim();
                pending = "";
              } else {
                return;
              }
              if (!chunk) continue;
              if (useBrowserVoice) {
                send({ type: "text", text: chunk });
                spokenSoFar = (spokenSoFar + " " + chunk).slice(-600);
                continue;
              }
              try {
                const b64 = await ttsSentence(ELEVEN_KEY!, voiceId, chunk, spokenSoFar.slice(-300));
                send({ type: "audio", text: chunk, b64 });
                spokenSoFar = (spokenSoFar + " " + chunk).slice(-600);
              } catch (e) {
                // TTS failed — fall back to browser voice for this chunk so the call can continue
                const msg = e instanceof Error ? e.message : String(e);
                const isUnusualActivity = msg.includes("detected_unusual_activity");
                const isAuthError = msg.includes("401") && isUnusualActivity;
                send({ type: "text", text: chunk });
                if (isAuthError) {
                  send({ type: "error", message: "ElevenLabs voice is unavailable (Free Tier blocked). The call will continue with browser voice. Upgrade your ElevenLabs plan to restore lifelike voices." });
                }
                spokenSoFar = (spokenSoFar + " " + chunk).slice(-600);
              }
            }

          };

          while (!done) {
            const { value, done: d } = await reader.read();
            if (d) break;
            sseBuf += dec.decode(value, { stream: true });
            const lines = sseBuf.split("\n");
            sseBuf = lines.pop() ?? "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const payload = trimmed.slice(5).trim();
              if (payload === "[DONE]") { done = true; break; }
              try {
                const json = JSON.parse(payload);
                const delta = json?.choices?.[0]?.delta?.content ?? "";
                if (delta) { pending += delta; full += delta; }
              } catch { /* ignore */ }
            }
            await flushSentence(false);
          }
          await flushSentence(true);
          send({ type: "done", reply: full });
        } catch (e) {
          const enc2 = new TextEncoder();
          controller.enqueue(enc2.encode(`data: ${JSON.stringify({ type: "error", message: e instanceof Error ? e.message : String(e) })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});