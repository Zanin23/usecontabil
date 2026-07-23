/**
 * Resolve the workspace's ElevenLabs API key from the connector-managed env var.
 *
 * The key is provided by the ElevenLabs standard connector (linked from the
 * workspace Connectors screen). Returns `null` when the connector is not
 * connected — callers MUST handle this gracefully (e.g. fall back to the
 * browser voice) so a missing key never breaks a live role-play.
 */
export async function getElevenLabsKey(): Promise<string | null> {
  const v = (Deno.env.get("ELEVENLABS_API_KEY") ?? "").trim();
  return v || null;
}

/** Kept for API compatibility with earlier DB-backed resolver. No-op now. */
export function clearElevenLabsKeyCache() {}
