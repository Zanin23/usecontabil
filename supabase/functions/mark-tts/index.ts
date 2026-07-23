import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAuth } from "../_shared/requireAuth.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { getElevenLabsKey } from "../_shared/elevenlabsKey.ts";

const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah — library voice on every account

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const _authFail = await requireAuth(req);
  if (_authFail) return _authFail;
  try {
    const { text, voiceId, voiceMode } = await req.json() as { text: string; voiceId?: string; voiceMode?: "browser" | "elevenlabs" };
    if (!text) throw new Error("text required");
    // Browser-voice mode: server doesn't synthesize. Client uses speechSynthesis.
    if (voiceMode === "browser") {
      return new Response(JSON.stringify({ browser: true, text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const apiKey = await getElevenLabsKey();
    if (!apiKey) {
      // Soft-fail so the client can fall back to the browser voice without crashing.
      return new Response(JSON.stringify({ browser: true, text, fallback: "missing_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const VOICE_ID = voiceId || DEFAULT_VOICE_ID;


    const resp = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          model_id: "eleven_flash_v2_5",
          voice_settings: { stability: 0.35, similarity_boost: 0.8, style: 0.55, use_speaker_boost: true },
        }),
        signal: AbortSignal.timeout(45000),
      },
    );
    if (!resp.ok) {
      const t = await resp.text();
      let cleanMessage = `Voice synthesis failed (${resp.status})`;
      try {
        const parsed = JSON.parse(t);
        const status = parsed?.detail?.status;
        if (status === "detected_unusual_activity") {
          cleanMessage = "ElevenLabs voice unavailable: Free Tier access has been blocked on this account. Upgrade to a paid ElevenLabs plan to restore voice synthesis.";
        } else if (parsed?.detail?.message) {
          cleanMessage = `Voice synthesis failed: ${parsed.detail.message}`;
        }
      } catch { /* not JSON, use default */ }
      throw new Error(cleanMessage);
    }
    const buf = await resp.arrayBuffer();
    const audio = base64Encode(new Uint8Array(buf));
    return new Response(JSON.stringify({ audio }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});