import m1 from "@/assets/headshots/m1.jpg";
import m2 from "@/assets/headshots/m2.jpg";
import m3 from "@/assets/headshots/m3.jpg";
import f1 from "@/assets/headshots/f1.jpg";
import f2 from "@/assets/headshots/f2.jpg";
import f3 from "@/assets/headshots/f3.jpg";

const MALE_POOL = [m1, m2, m3];
const FEMALE_POOL = [f1, f2, f3];
export const HEADSHOT_POOL = [...MALE_POOL, ...FEMALE_POOL];

export type Gender = "male" | "female" | null;

/** Infer gender from a persona-like object. Looks at explicit gender field,
 *  then voice_label (which we populate with "... male" / "... female"). */
export function inferGender(persona?: { gender?: string | null; voice_label?: string | null } | null): Gender {
  const g = persona?.gender?.toLowerCase();
  if (g === "male" || g === "female") return g;
  const label = persona?.voice_label?.toLowerCase() ?? "";
  if (label.includes("female")) return "female";
  if (label.includes("male")) return "male";
  return null;
}

/** FNV-1a 32-bit — distributes small input sets far more evenly than the
 *  previous polynomial hash, so we don't get clusters when there are only
 *  a handful of role-plays in the pool. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic headshot for a role-play; uses persona.headshot_url if set,
 *  else picks from the gender-matched pool by seed. Falls back to combined pool. */
export function resolveHeadshot(
  seed: string,
  override?: string | null,
  gender?: Gender,
  index?: number | null,
): string {
  if (typeof index === "number" && index >= 0 && index < HEADSHOT_POOL.length) {
    return HEADSHOT_POOL[index];
  }
  if (override && override.trim()) return override;
  const pool = gender === "male" ? MALE_POOL : gender === "female" ? FEMALE_POOL : HEADSHOT_POOL;
  return pool[hash(seed) % pool.length];
}