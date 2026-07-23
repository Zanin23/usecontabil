import { supabase } from "@/integrations/supabase/client";
import type { RolePlay } from "@/lib/rolePlay";

export type Turn = { role: "agent" | "user"; text: string; at?: number };
export type Dim = { score: number; rationale: string };
export type Category = { key: string; label: string; description?: string };

const STOPWORDS = new Set([
  "the","a","an","and","or","but","if","then","of","to","in","on","for","with","at","by","from","as","is","are","was","were","be","been","being","it","its","this","that","these","those","i","you","we","they","he","she","them","my","your","our","their","me","us","not","no","yes","do","does","did","done","have","has","had","will","would","can","could","should","just","like","really","up","down","out","so","about","into","over","than","then","there","here","what","which","who","how","when","where","why","also","more","most","some","any","all","one","two","three","get","got","go","going","gone","make","made","take","took","say","said","see","saw","good","bad","very","much","many","few","because","while","still","even","too","own","off","onto","via","per","upon","let","lets","ok","okay","hey","yeah","um","uh","mm","hmm",
]);

function tokens(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s']/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Find best matching transcript turn for a rationale (same logic as SessionReport). */
export function findAnchorIndex(rationale: string, transcript: Turn[]): number {
  if (!transcript.length || !rationale) return Math.max(0, transcript.length - 1);
  const rTokens = new Set(tokens(rationale));
  if (rTokens.size === 0) return Math.max(0, transcript.length - 1);
  let bestIdx = -1;
  let bestScore = -1;
  transcript.forEach((t, idx) => {
    const tt = tokens(t.text);
    let overlap = 0;
    for (const w of tt) if (rTokens.has(w)) overlap++;
    const score = overlap + Math.min(tt.length / 10, 1) * 0.1;
    if (score > bestScore) { bestScore = score; bestIdx = idx; }
  });
  return bestIdx >= 0 ? bestIdx : Math.max(0, transcript.length - 1);
}

export function buildRehearsalPrompt(opts: {
  rolePlay: RolePlay;
  dimension: Category;
  parentTranscript: Turn[];
  anchorIndex: number;
  parentDimensionRationale: string;
}): { systemPrompt: string; openingLine: string } {
  const { rolePlay, dimension, parentTranscript, anchorIndex, parentDimensionRationale } = opts;
  const buyer = rolePlay.persona?.first_name || "the buyer";
  const upTo = parentTranscript.slice(0, anchorIndex);
  const transcriptSoFar = upTo
    .map((t) => `${t.role === "agent" ? buyer : "Rep"}: ${t.text}`)
    .join("\n");
  const anchorTurn = parentTranscript[anchorIndex];
  const anchorWasBuyer = anchorTurn?.role === "agent";

  const systemPrompt = `${rolePlay.system_prompt}

--- REHEARSAL CONTEXT (do not break character) ---
You and this rep already had part of a call together. They want to RE-ATTEMPT one specific moment around ${dimension.label.toUpperCase()}.

Here is the conversation you had up to the moment they want to retry:
${transcriptSoFar}

Your job in this rehearsal:
- Stay in character as ${buyer}. Do NOT acknowledge that this is a rehearsal or a do-over.
- Pick up the conversation naturally from where it left off, but lean into the area of ${dimension.label.toLowerCase()} so the rep gets real practice on this specific weakness.
- Coaching note on why this moment matters: "${parentDimensionRationale}". Use this only to inform how you push back — never say it out loud.
- Keep replies short (1-3 sentences), conversational, natural disfluencies allowed.
- Don't run a full call. Stay focused on this beat.`;

  const openingLine = anchorWasBuyer && anchorTurn
    ? anchorTurn.text
    : `So, just picking up where we left off — ${dimension.label.toLowerCase()} — where were you?`;

  return { systemPrompt, openingLine };
}

/** Create a rehearsal child session row and return its id. */
export async function createRehearsalSession(opts: {
  parentSession: {
    id: string;
    user_id: string | null;
    difficulty: string;
    role_play_id: string;
    transcript: Turn[];
    scores: Record<string, Dim> | null;
  };
  rolePlay: RolePlay;
  dimension: Category;
  userId: string;
}): Promise<{ id: string } | { error: string }> {
  const { parentSession, rolePlay, dimension, userId } = opts;
  const parentTranscript = parentSession.transcript ?? [];
  const parentDim = parentSession.scores?.[dimension.key];
  const rationale = parentDim?.rationale ?? "";
  const anchorIndex = findAnchorIndex(rationale, parentTranscript);
  const { systemPrompt, openingLine } = buildRehearsalPrompt({
    rolePlay,
    dimension,
    parentTranscript,
    anchorIndex,
    parentDimensionRationale: rationale,
  });

  const rehearsal_context = {
    dimension: { key: dimension.key, label: dimension.label, description: dimension.description ?? "" },
    anchor_turn_index: anchorIndex,
    parent_dimension_score: parentDim?.score ?? null,
    parent_dimension_rationale: rationale,
    system_prompt_override: systemPrompt,
    opening_line_override: openingLine,
    buyer_name: rolePlay.persona?.first_name ?? "Buyer",
  };

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: userId,
      difficulty: parentSession.difficulty as "easy" | "standard" | "hard",
      role_play_id: parentSession.role_play_id,
      parent_session_id: parentSession.id,
      rehearsal_dimension: dimension.key,
      rehearsal_context,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Failed to create rehearsal" };
  return { id: data.id };
}