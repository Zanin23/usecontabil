import { supabase } from "@/integrations/supabase/client";

/** ElevenLabs library voices that ship with every account, grouped by gender.
 *  Voice→gender is a HARD constraint: a male persona always gets a male voice. */
export const FEMALE_VOICES = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
  { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda" },
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica" },
] as const;

export const MALE_VOICES = [
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam" },
  { id: "iP95p4xoKVk53GoZ742B", name: "Chris" },
] as const;

/** Default voice — Sarah, female. */
export const DEFAULT_VOICE_ID = FEMALE_VOICES[0].id;

const FEMALE_IDS = new Set<string>(FEMALE_VOICES.map((v) => v.id));
const MALE_IDS = new Set<string>(MALE_VOICES.map((v) => v.id));

export type Gender = "male" | "female" | null | undefined;

/** Six known-good library voices for the onboarding picker. */
export const VOICE_PRESETS = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", blurb: "Warm, friendly American female" },
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", blurb: "Conversational American female" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", blurb: "Friendly, expressive female" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", blurb: "British, confident male" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", blurb: "British, calm, authoritative male" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", blurb: "Articulate young male" },
] as const;

let cachedDefault: string | null = null;
let cachedAt = 0;

/** Workspace default, cached for 60s. Falls back to Sarah. */
export async function getWorkspaceDefaultVoiceId(): Promise<string> {
  if (cachedDefault && Date.now() - cachedAt < 60_000) return cachedDefault;
  const { data } = await supabase
    .from("app_settings")
    .select("default_voice_id")
    .maybeSingle();
  const v = (data?.default_voice_id ?? "").trim() || DEFAULT_VOICE_ID;
  cachedDefault = v;
  cachedAt = Date.now();
  return v;
}

export function clearVoiceCache() { cachedDefault = null; cachedAt = 0; }

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** Deterministic gender-matched voice pick. */
export function pickVoiceForGender(seed: string, gender: Gender): { id: string; name: string } {
  const pool = gender === "male" ? MALE_VOICES : FEMALE_VOICES;
  return pool[fnv1a(seed) % pool.length];
}

export function voiceMatchesGender(voiceId: string | null | undefined, gender: Gender): boolean {
  if (!voiceId) return false;
  if (gender === "male") return MALE_IDS.has(voiceId);
  if (gender === "female") return FEMALE_IDS.has(voiceId);
  return true; // unknown gender — accept anything
}

/** Resolves the voice for a role-play with gender as a HARD constraint:
 *  if the configured voice doesn't match the persona's gender, we swap it
 *  for a deterministic same-gender library voice. */
export function resolveVoiceId(
  seed: string,
  override?: string | null,
  persona?: { voice_id?: string | null; gender?: string | null } | null,
): string {
  const gender = (persona?.gender?.toLowerCase() === "male" ? "male"
    : persona?.gender?.toLowerCase() === "female" ? "female"
    : null) as Gender;

  const candidate = (override && override.trim()) || (persona?.voice_id?.trim() ?? "");
  if (candidate && voiceMatchesGender(candidate, gender)) return candidate;
  if (gender) return pickVoiceForGender(seed, gender).id;
  return candidate || DEFAULT_VOICE_ID;
}
