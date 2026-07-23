import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button, Badge } from "@/design-system/mj-design-system-db98fa";
import { ArrowLeft, Trophy, ChevronDown, RotateCcw, Loader2, Sparkles, Target, X } from "lucide-react";
import type { RolePlay } from "@/lib/rolePlay";
import { useAuthUser } from "@/lib/useAuthUser";
import { getGuestId } from "@/lib/guestId";
import { toast } from "sonner";
import { createRehearsalSession } from "@/lib/rehearsal";

type Dim = { score: number; rationale: string };
type Turn = { role: string; text: string };
type Session = {
  id: string; difficulty: string; status: string; started_at: string;
  duration_seconds: number | null; total_score: number | null;
  scores: Record<string, Dim> | null; red_flags: string[] | null; green_flags: string[] | null;
  coaching_summary: string | null; transcript: Turn[] | null;
  self_assessment: { did_well?: string; would_improve?: string } | null;
  role_play_id: string | null;
};

const FALLBACK_LABELS: Record<string, string> = {
  discovery_quality: "Discovery quality",
  competitive_positioning: "Competitive positioning",
  business_acumen: "Business acumen / prep",
  time_management: "Time mgmt / adaptability",
  next_steps: "Next steps / close",
};

const STOPWORDS = new Set([
  "the","a","an","and","or","but","if","then","of","to","in","on","for","with","at","by","from","as","is","are","was","were","be","been","being","it","its","this","that","these","those","i","you","we","they","he","she","them","my","your","our","their","me","us","not","no","yes","do","does","did","done","have","has","had","will","would","can","could","should","just","like","really","up","down","out","so","about","into","over","than","then","there","here","what","which","who","how","when","where","why","also","more","most","some","any","all","one","two","three","get","got","go","going","gone","make","made","take","took","say","said","see","saw","good","bad","very","much","many","few","because","while","still","even","too","own","off","onto","via","per","upon","let","lets","ok","okay","hey","yeah","um","uh","mm","hmm",
]);

function tokens(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s']/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function findEvidence(rationale: string, transcript: Turn[], n: number): Turn[] {
  if (!transcript || transcript.length === 0 || !rationale) return [];
  const rTokens = new Set(tokens(rationale));
  if (rTokens.size === 0) return [];
  const scored = transcript.map((t, idx) => {
    const tt = tokens(t.text);
    let overlap = 0;
    for (const w of tt) if (rTokens.has(w)) overlap++;
    const lengthBonus = Math.min(tt.length / 10, 1); // prefer substantive turns
    return { idx, t, score: overlap + lengthBonus * 0.1 };
  });
  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);
  return scored.filter((x) => x.score > 0.3).slice(0, n).map((x) => x.t);
}

export default function SessionReport() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthUser();
  const [s, setS] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [rp, setRp] = useState<Pick<RolePlay, "slug" | "persona" | "scorecard" | "role" | "name" | "id"> | null>(null);
  const [related, setRelated] = useState<Array<Pick<RolePlay, "id" | "slug" | "name" | "topic" | "persona" | "role">>>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [restarting, setRestarting] = useState(false);
  const [rehearsingKey, setRehearsingKey] = useState<string | null>(null);
  const [rehearsals, setRehearsals] = useState<Record<string, { id: string; score: number | null; status: string }>>({});
  const [promptDismissed, setPromptDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return !!localStorage.getItem(`rehearse-prompt-dismissed:${id}`); } catch { return false; }
  });
  const scoreFiredRef = (globalThis as { __sr_ref?: { current: Set<string> } }).__sr_ref ??= { current: new Set<string>() };

  const tryAgain = async () => {
    if (!s?.role_play_id) return;
    setRestarting(true);
    const { data, error } = await supabase.from("sessions")
      .insert({ user_id: user?.id ?? getGuestId(), difficulty: s.difficulty as "easy" | "standard" | "hard", role_play_id: s.role_play_id })
      .select("id").single();
    setRestarting(false);
    if (error || !data) { toast.error(error?.message ?? "Failed to start"); return; }
    nav(`/call/${data.id}`);
  };

  const rehearseMoment = async (dimensionKey: string) => {
    if (!s || !rp || !s.role_play_id) return;
    const category = (rp.scorecard?.categories ?? []).find((c) => c.key === dimensionKey);
    if (!category) { toast.error("Dimension not found"); return; }
    setRehearsingKey(dimensionKey);
    const result = await createRehearsalSession({
      parentSession: {
        id: s.id,
        user_id: (s as unknown as { user_id?: string | null }).user_id ?? null,
        difficulty: s.difficulty,
        role_play_id: s.role_play_id,
        transcript: (s.transcript ?? []) as { role: "agent" | "user"; text: string }[],
        scores: s.scores,
      },
      rolePlay: { ...(rp as unknown as RolePlay), id: s.role_play_id },
      dimension: { key: category.key, label: category.label, description: category.description },
      userId: user?.id ?? getGuestId(),
    });
    setRehearsingKey(null);
    if ("error" in result) { toast.error(result.error); return; }
    nav(`/call/${result.id}`);
  };

  const dismissPrompt = () => {
    setPromptDismissed(true);
    try { localStorage.setItem(`rehearse-prompt-dismissed:${id}`, "1"); } catch { /* noop */ }
  };

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("sessions").select("*").eq("id", id!).single();
      setS(data as unknown as Session);
      setLoading(false);
      const rpId = (data as { role_play_id?: string } | null)?.role_play_id;
      if (rpId) {
        const { data: rpRow } = await supabase.from("role_plays").select("id,slug,name,role,persona,scorecard,use_elevenlabs_agent,system_prompt,opening_line,voice_id").eq("id", rpId).maybeSingle();
        if (rpRow) {
          setRp(rpRow as unknown as Pick<RolePlay, "slug" | "persona" | "scorecard" | "role" | "name" | "id">);
          const roleVal = (rpRow as { role?: string }).role;
          if (roleVal) {
            const { data: sibs } = await supabase.from("role_plays")
              .select("id,slug,name,topic,persona,role")
              .eq("is_published", true)
              .eq("role", roleVal)
              .neq("id", rpId)
              .limit(3);
            setRelated((sibs ?? []) as unknown as Array<Pick<RolePlay, "id" | "slug" | "name" | "topic" | "persona" | "role">>);
          }
        }
      }
      // Load rehearsal child sessions for badges
      const { data: kids } = await supabase
        .from("sessions")
        .select("id, rehearsal_dimension, total_score, status, scores, created_at")
        .eq("parent_session_id", id!)
        .order("created_at", { ascending: false });
      const byDim: Record<string, { id: string; score: number | null; status: string }> = {};
      for (const raw of (kids ?? [])) {
        const k = raw as unknown as { id: string; rehearsal_dimension: string | null; status: string; scores: Record<string, { score?: number }> | null };
        const dk = k.rehearsal_dimension;
        if (!dk || byDim[dk]) continue;
        const sc = (k.scores?.[dk]?.score ?? null) as number | null;
        byDim[dk] = { id: k.id, score: sc, status: k.status };
      }
      setRehearsals(byDim);
    };
    load();

    // Primary: realtime subscription — debrief updates the instant the row changes.
    let stopped = false;
    const channel = supabase
      .channel(`session-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${id}` },
        (payload) => { if (!stopped) setS(payload.new as unknown as Session); })
      .subscribe();

    // Fallback poll (5s) in case realtime drops — also stops once scored.
    const t = setInterval(async () => {
      if (stopped) return;
      const { data: latest } = await supabase.from("sessions").select("*").eq("id", id!).single();
      if (!latest) return;
      setS(latest as unknown as Session);
      if ((latest as { status?: string }).status === "scored") { clearInterval(t); stopped = true; }
    }, 5000);
    const killer = setTimeout(() => { clearInterval(t); stopped = true; }, 180_000);
    return () => {
      clearInterval(t); clearTimeout(killer); stopped = true;
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Deep-link: /session/:id?rehearse=<dimensionKey> auto-kicks rehearsal once data is ready.
  useEffect(() => {
    const key = searchParams.get("rehearse");
    if (!key || !s || !rp) return;
    searchParams.delete("rehearse");
    setSearchParams(searchParams, { replace: true });
    void rehearseMoment(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, rp]);

  // If we landed here on a completed-but-unscored session, kick off scoring.
  // We need the role-play scorecard to do it, so we wait until both are loaded.
  useEffect(() => {
    if (!s || !rp || !id) return;
    if (s.status === "scored" || s.total_score != null) return;
    if (s.status !== "completed") return; // still in progress
    if (scoreFiredRef.current.has(id)) return;
    const sc = (rp as unknown as { scorecard?: { categories?: unknown[]; red_flag_examples?: string[]; green_flag_examples?: string[] } }).scorecard;
    if (!sc?.categories?.length) return;
    scoreFiredRef.current.add(id);
    supabase.functions.invoke("score-session", {
      body: {
        sessionId: id,
        transcript: s.transcript ?? [],
        difficulty: s.difficulty,
        selfAssessment: s.self_assessment ?? null,
        categories: sc.categories,
        redFlagExamples: sc.red_flag_examples ?? [],
        greenFlagExamples: sc.green_flag_examples ?? [],
        buyerName: rp.persona?.first_name,
      },
    }).then(({ error }) => {
      if (error) {
        scoreFiredRef.current.delete(id);
        console.error("[SessionReport] scoring failed", error);
      }
    });
  }, [s, rp, id, scoreFiredRef]);

  const transcript = useMemo(() => (s?.transcript ?? []) as Turn[], [s]);
  const buyerName = rp?.persona?.first_name || "Buyer";

  // Build the dimension list from the role-play scorecard when available, else from the score keys we have.
  const dimensionList = useMemo(() => {
    if (rp?.scorecard?.categories?.length) {
      return rp.scorecard.categories.map((c) => ({ key: c.key, label: c.label, description: c.description }));
    }
    const keys = Object.keys(s?.scores ?? {});
    return keys.map((k) => ({ key: k, label: FALLBACK_LABELS[k] ?? k.replace(/_/g, " "), description: "" }));
  }, [rp, s]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-aurora">Loading…</div>;
  if (!s) return <div className="min-h-screen flex items-center justify-center bg-aurora">Not found.</div>;

  const dims = s.scores ?? {};
  const scoring = s.status !== "scored";
  const durationLabel = s.duration_seconds ? `${Math.max(1, Math.round(s.duration_seconds / 60))} min session` : "Session";
  const rolePlayUsesElevenLabs = (rp as unknown as { use_elevenlabs_agent?: boolean } | null)?.use_elevenlabs_agent !== false;
  const weakDimensions = dimensionList.filter(({ key }) => {
    const sc = dims[key]?.score;
    return sc != null && sc <= 3;
  });
  const showRehearsePrompt = !scoring && !promptDismissed && weakDimensions.length > 0 && rolePlayUsesElevenLabs;

  const toggle = (k: string) => setExpanded((e) => ({ ...e, [k]: !e[k] }));

  return (
    <div className="min-h-screen bg-aurora text-foreground">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-10 lg:py-14">
        <div className="flex items-center justify-between mb-6">
          <Link to={rp?.role ? `/library/${rp.role}` : "/"} className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> {rp?.role ? `${rp.role} role-plays` : "Home"}
          </Link>
          <div className="flex items-center gap-2">
            {s?.role_play_id && (
              <Button onClick={tryAgain} disabled={restarting} variant="outline" size="sm" className="rounded-lg">
                <RotateCcw className="h-4 w-4 mr-1.5" />{restarting ? "Starting…" : "Try it again"}
              </Button>
            )}
            {rp?.slug && (
              <Link to={`/leaderboard/${rp.slug}`}>
                <Button variant="outline" size="sm" className="rounded-lg"><Trophy className="h-4 w-4 mr-1.5" />Leaderboard</Button>
              </Link>
            )}
            <Link to={rp?.role ? `/library/${rp.role}` : "/"}><Button size="sm" className="rounded-lg bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground">Try another {rp?.role ?? ""} call</Button></Link>
          </div>
        </div>

        <main className="space-y-8">
          <header className="flex items-center justify-between gap-4 flex-wrap">
            <h1 className="font-display text-2xl sm:text-3xl italic leading-none">Session debrief</h1>
            <div className="inline-flex items-center gap-2 rounded-lg border border-brand-orange/20 bg-brand-orange/10 px-4 py-1.5">
              <span className="text-[10px] uppercase tracking-widest font-semibold text-brand-orange">Score</span>
              <span className="font-display text-xl tabular-nums leading-none">
                {s.total_score ?? "—"}<span className="text-sm opacity-40 font-normal">/100</span>
              </span>
              {scoring && (
                <span className="ml-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground italic">
                  <Loader2 className="h-3 w-3 animate-spin" /> scoring…
                </span>
              )}
            </div>
          </header>
          <div className="h-px w-full bg-foreground/10" />

          {scoring && (
            <div className="rounded-xl border border-brand-orange/20 bg-brand-orange/5 p-5 sm:p-6 flex items-start gap-4 animate-fade-in-up">
              <div className="shrink-0 mt-0.5 inline-flex items-center justify-center h-10 w-10 rounded-lg bg-brand-orange/15 text-brand-orange">
                <Sparkles className="h-5 w-5 animate-pulse-soft" />
              </div>
              <div className="min-w-0">
                <p className="font-display text-xl leading-tight">Analyzing your call…</p>
                <p className="text-sm text-muted-foreground mt-1">
                  We're scoring every dimension and pulling supporting quotes from the transcript. This usually takes 20–60 seconds — your scorecard will populate here automatically, no need to refresh.
                </p>
                <div className="mt-3 h-1 w-full rounded-full bg-brand-orange/15 overflow-hidden">
                  <div className="h-full w-1/2 rounded-full bg-brand-orange/60 animate-pulse-soft" />
                </div>
              </div>
            </div>
          )}

          {showRehearsePrompt && (
            <div className="rounded-xl border border-brand-orange/30 bg-card p-5 sm:p-6 relative animate-fade-in-up">
              <button
                type="button"
                onClick={dismissPrompt}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-0.5 inline-flex items-center justify-center h-10 w-10 rounded-lg bg-brand-orange/15 text-brand-orange">
                  <Target className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xl leading-tight">Retry a specific moment?</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {weakDimensions.length === 1
                      ? `One area to sharpen: ${weakDimensions[0].label.toLowerCase()}.`
                      : `${weakDimensions.length} areas to sharpen. Pick one and ${buyerName} will pick up the call at that beat.`}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {weakDimensions.map((d) => (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => rehearseMoment(d.key)}
                        disabled={rehearsingKey === d.key}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange border border-brand-orange/30 px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60"
                      >
                        {rehearsingKey === d.key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Target className="h-3 w-3" />}
                        Rehearse: {d.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground italic mt-3">Private practice — doesn't change your scorecard or leaderboard standing.</p>
                </div>
              </div>
            </div>
          )}

          <section id="dimensions" className="space-y-6">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <h2 className="font-display text-3xl sm:text-4xl">Performance scorecard</h2>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground italic">Click a card to expand evidence</span>
            </div>

            <div className="flex flex-col gap-4">
              {dimensionList.map(({ key, label, description }) => {
                const d = dims[key];
                const score = d?.score;
                const rationale = d?.rationale ?? "";
                const isOpen = !!expanded[key];
                const evidence = findEvidence(rationale, transcript, isOpen ? 3 : 1);
                const scoreColor =
                  score == null ? "bg-muted text-muted-foreground border-foreground/10"
                  : score >= 4 ? "bg-success/15 text-success border-success/20"
                  : score >= 3 ? "bg-brand-orange/15 text-brand-orange border-brand-orange/20"
                  : "bg-brand-pink/30 text-foreground border-brand-pink/40";

                return (
                  <article
                    key={key}
                    onClick={() => toggle(key)}
                    className="group cursor-pointer bg-card border border-border rounded-xl p-6 sm:p-8 transition-all duration-300 hover:shadow-elevated hover:-translate-y-0.5"
                    title={isOpen ? "Click to collapse" : "Click to expand"}
                  >
                    <div className="flex items-start justify-between gap-6 mb-5">
                      <div className="space-y-1 min-w-0">
                        <p className="font-display text-2xl leading-tight">{label}</p>
                        {description && <p className="text-xs text-muted-foreground">{description}</p>}
                        {rehearsals[key] && (
                          <Link
                            to={`/rehearse/report/${rehearsals[key].id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold uppercase tracking-wider text-brand-orange hover:underline"
                          >
                            <Target className="h-3 w-3" /> Rehearsed: {rehearsals[key].score ?? "—"}/5
                          </Link>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold tabular-nums border ${scoreColor}`}>
                          {score ?? "—"} <span className="opacity-60 font-medium">/ 5</span>
                        </span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggle(key); }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
                          aria-label={isOpen ? "Collapse" : "Expand"}
                        >
                          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
                      <div className="md:col-span-7">
                        <p className={`text-sm leading-relaxed text-foreground/85 ${isOpen ? "" : "line-clamp-3"}`}>
                          {rationale
                            ? rationale
                            : scoring
                              ? (
                                <span className="block space-y-2">
                                  <span className="block h-3 w-11/12 rounded bg-foreground/10 animate-pulse-soft" />
                                  <span className="block h-3 w-9/12 rounded bg-foreground/10 animate-pulse-soft" />
                                  <span className="block h-3 w-7/12 rounded bg-foreground/10 animate-pulse-soft" />
                                </span>
                              )
                              : <span className="text-muted-foreground italic">No feedback yet for this dimension.</span>}
                        </p>
                        {rationale && rationale.length > 180 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggle(key); }}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-orange hover:text-brand-orange/80 transition"
                          >
                            {isOpen ? "Show less" : "Show more"}
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                          </button>
                        )}
                        {isOpen && score != null && score <= 3 && rolePlayUsesElevenLabs && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); rehearseMoment(key); }}
                            disabled={rehearsingKey === key}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange border border-brand-orange/30 px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60"
                          >
                            {rehearsingKey === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Target className="h-3 w-3" />}
                            Rehearse this moment →
                          </button>
                        )}
                      </div>

                      <div className="md:col-span-5">
                        {evidence.length > 0 ? (
                          <div className="space-y-3">
                            {evidence.map((t, i) => (
                              <div key={i} className="relative bg-background border-l-4 border-brand-orange rounded-2xl p-4 pr-6">
                                <span className="absolute top-1 right-3 font-display text-3xl text-brand-orange/30 leading-none">”</span>
                                <p className="text-[13px] leading-snug italic text-foreground/75">
                                  “{t.text.length > 220 && !isOpen ? `${t.text.slice(0, 220).trim()}…` : t.text}”
                                </p>
                                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-brand-orange">
                                  {t.role === "agent" ? `${buyerName} · buyer` : "You · rep"}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : scoring ? (
                          <div className="space-y-2 bg-background border-l-4 border-brand-orange/30 rounded-2xl p-4">
                            <div className="h-3 w-10/12 rounded bg-foreground/10 animate-pulse-soft" />
                            <div className="h-3 w-8/12 rounded bg-foreground/10 animate-pulse-soft" />
                            <div className="h-3 w-6/12 rounded bg-foreground/10 animate-pulse-soft" />
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center md:justify-end">
                            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">No transcript evidence found</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section id="flags" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-brand-pink/20 p-6 rounded-2xl border border-brand-pink/30">
              <h4 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2 text-success">
                <span className="w-2 h-2 rounded-full bg-success" /> Green flags
              </h4>
              {s.green_flags && s.green_flags.length > 0 ? (
                <ul className="text-sm space-y-1.5 text-foreground/85">{s.green_flags.map((f, i) => <li key={i}>• {f}</li>)}</ul>
              ) : scoring ? (
                <div className="space-y-2">
                  <div className="h-3 w-10/12 rounded bg-foreground/10 animate-pulse-soft" />
                  <div className="h-3 w-8/12 rounded bg-foreground/10 animate-pulse-soft" />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">None detected in this session.</p>
              )}
            </div>
            <div className="bg-brand-orange/10 p-6 rounded-2xl border border-brand-orange/20">
              <h4 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2 text-brand-orange">
                <span className="w-2 h-2 rounded-full bg-brand-orange" /> Red flags
              </h4>
              {s.red_flags && s.red_flags.length > 0 ? (
                <ul className="text-sm space-y-1.5 text-foreground/85">{s.red_flags.map((f, i) => <li key={i}>• {f}</li>)}</ul>
              ) : scoring ? (
                <div className="space-y-2">
                  <div className="h-3 w-9/12 rounded bg-foreground/10 animate-pulse-soft" />
                  <div className="h-3 w-7/12 rounded bg-foreground/10 animate-pulse-soft" />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">None detected.</p>
              )}
            </div>
          </section>

          <div className="flex flex-wrap justify-center lg:hidden gap-3 pt-4">
            {s?.role_play_id && (
              <Button onClick={tryAgain} disabled={restarting} variant="outline" className="rounded-lg h-12 px-6">
                <RotateCcw className="h-4 w-4 mr-1.5" />{restarting ? "Starting…" : "Try it again"}
              </Button>
            )}
            {rp?.slug && (
              <Link to={`/leaderboard/${rp.slug}`}>
                <Button variant="outline" className="rounded-lg h-12 px-6"><Trophy className="h-4 w-4 mr-1.5" />View leaderboard</Button>
              </Link>
            )}
            <Link to={rp?.role ? `/library/${rp.role}` : "/"}><Button className="rounded-lg bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground h-12 px-8">Try another {rp?.role ?? ""} call</Button></Link>
          </div>

          {related.length > 0 && (
            <section className="space-y-4 pt-6">
              <div className="flex items-end justify-between gap-4 border-b border-foreground/10 pb-3">
                <h2 className="font-display text-2xl italic">More {rp?.role} role-plays</h2>
                <Link to={`/library/${rp?.role}`} className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">See all →</Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {related.map((r) => (
                  <Link key={r.id} to={`/r/${r.slug}`} className="group rounded-2xl border border-border bg-card p-5 hover:shadow-card transition">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{r.topic}</div>
                    <div className="font-display text-lg mt-1 group-hover:text-brand-orange transition-colors">{r.name}</div>
                    {r.persona?.first_name && (
                      <div className="text-xs text-muted-foreground mt-2 truncate">{r.persona.first_name}{r.persona.title ? ` · ${r.persona.title}` : ""}</div>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {transcript.length > 0 && (
            <section id="transcript" className="space-y-6 pt-4">
              <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
                <h2 className="font-display text-2xl italic">Full transcript</h2>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{transcript.length} turns</span>
              </div>
              <div className="space-y-6 max-w-3xl">
                {transcript.map((t, i) => (
                  <div key={i} className="space-y-1.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${t.role === "agent" ? "text-brand-orange" : "text-muted-foreground"}`}>
                      {t.role === "agent" ? buyerName : "You"}
                    </span>
                    <p className="text-[15px] leading-relaxed text-foreground/85">{t.text}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
