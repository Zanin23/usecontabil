import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAuth } from "../_shared/requireAuth.ts";
import { getElevenLabsKey, clearElevenLabsKeyCache } from "../_shared/elevenlabsKey.ts";

/**
 * Verify the workspace's ElevenLabs key is set AND has TTS access.
 * Reads the key via the shared resolver (DB first, then env). Never throws.
 *
 * reason values:
 *  - "missing"        → no key in DB or env
 *  - "invalid"        → ElevenLabs rejected the key
 *  - "no_tts_access"  → key works but Text-to-Speech scope is disabled
 *  - "network"        → couldn't reach ElevenLabs
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const _authFail = await requireAuth(req);
  if (_authFail) return _authFail;

  const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const body = req.headers.get("content-type")?.includes("application/json")
    ? await req.json().catch(() => ({})) as { apiKey?: unknown }
    : {};

  const candidateKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";

  // Always check the freshest stored value when no candidate key is provided.
  if (!candidateKey) clearElevenLabsKeyCache();
  const apiKey = candidateKey || await getElevenLabsKey();
  if (!apiKey) {
    return json({
      ok: false,
      reason: "missing",
      hint: "No ElevenLabs key is configured yet. Paste one in Setup → Voice mode.",
    });
  }

  try {
    // Validate against the exact capability the app needs: Text-to-Speech.
    // Some restricted keys cannot call /v1/user, so a successful TTS request is
    // the only check we trust.
    const TEST_VOICE = "EXAVITQu4vr4xnSDxMaL"; // Sarah — always available
    const ttsResp = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${TEST_VOICE}?output_format=mp3_22050_32`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ text: ".", model_id: "eleven_flash_v2_5" }),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (ttsResp.ok) {
      // drain body so the connection can close
      await ttsResp.arrayBuffer();
      return json({ ok: true });
    }
    const detail = await ttsResp.text().catch(() => "");
    const lowerDetail = detail.toLowerCase();
    const looksLikePermissionIssue =
      ttsResp.status === 403 ||
      lowerDetail.includes("permission") ||
      lowerDetail.includes("scope") ||
      lowerDetail.includes("access") ||
      lowerDetail.includes("text to speech") ||
      lowerDetail.includes("text-to-speech");

    if (looksLikePermissionIssue) {
      return json({
        ok: false,
        reason: "no_tts_access",
        hint: "This key can't generate speech yet. In ElevenLabs → API Keys → edit the key → enable Text to Speech: Has Access, then try again.",
      });
    }

    // Detect ElevenLabs Free Tier unusual-activity block
    let parsedDetail: { detail?: { status?: string; message?: string } } = {};
    try { parsedDetail = JSON.parse(detail); } catch { /* not JSON */ }
    const isUnusualActivity = parsedDetail?.detail?.status === "detected_unusual_activity";

    if (isUnusualActivity) {
      return json({
        ok: false,
        reason: "unusual_activity",
        hint: "ElevenLabs has disabled Free Tier access on this account due to unusual activity detection. This is an ElevenLabs account-level block — a new key won't fix it. You need to upgrade to a paid ElevenLabs plan (Starter is ~$5/mo) to continue using voice synthesis.",
      });
    }

    if (ttsResp.status === 401) {
      return json({
        ok: false,
        reason: "invalid",
        hint: "ElevenLabs rejected this key. Paste it again carefully, or generate a fresh key and retry.",
      });
    }

    return json({
      ok: false,
      reason: "invalid",
      hint: `ElevenLabs returned ${ttsResp.status}. ${detail.slice(0, 200)}`,
    });
  } catch (e) {
    return json({
      ok: false,
      reason: "network",
      hint: e instanceof Error ? e.message : String(e),
    });
  }
});
