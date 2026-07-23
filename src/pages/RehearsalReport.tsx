import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/design-system/mj-design-system-db98fa";
import { ArrowLeft, Loader2, Sparkles, RotateCcw } from "lucide-react";

type Dim = { score: number; rationale: string };
type Turn = { role: string; text: string };
type Session = {
  id: string;
  status: string;
  total_score: number | null;
  scores: Record<string, Dim> | null;
  coaching_summary: string | null;
  transcript: Turn[] | null;
  parent_session_id: string | null;
  rehearsal_dimension: string | null;
  rehearsal_context: {
    dimension?: { key: string; label: string };
    parent_dimension_score?: number | null;
    buyer_name?: string;
  } | null;
};

export default function RehearsalReport() {
  const { id } = useParams<{ id: string }>();
  const [s, setS] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let stopped = false;
    const load = async () => {
      const { data } = await supabase.from("sessions").select("*").eq("id", id).maybeSingle();
      setS(data as unknown as Session);
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel(`rehearsal-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${id}` },
        (payload) => { if (!stopped) setS(payload.new as unknown as Session); })
      .subscribe();
    const t = setInterval(async () => {
      if (stopped) return;
      const { data: latest } = await supabase.from("sessions").select("*").eq("id", id).maybeSingle();
      if (latest) setS(latest as unknown as Session);
      if ((latest as { status?: string } | null)?.status === "rehearsed") { clearInterval(t); stopped = true; }
    }, 4000);
    return () => { clearInterval(t); stopped = true; supabase.removeChannel(channel); };
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-aurora">Loading…</div>;
  if (!s) return <div className="min-h-screen flex items-center justify-center bg-aurora">Not found.</div>;

  const ctx = s.rehearsal_context ?? {};
  const dimLabel = ctx.dimension?.label ?? "this moment";
  const dimKey = ctx.dimension?.key ?? s.rehearsal_dimension ?? "";
  const newScore = dimKey ? s.scores?.[dimKey]?.score : null;
  const oldScore = ctx.parent_dimension_score ?? null;
  const scoring = s.status !== "rehearsed";
  const delta = newScore != null && oldScore != null ? newScore - oldScore : null;

  return (
    <div className="min-h-screen bg-aurora text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-12 space-y-8">
        <div className="flex items-center justify-between">
          <Link to={s.parent_session_id ? `/session/${s.parent_session_id}` : "/"} className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to call debrief
          </Link>
        </div>

        <header className="space-y-2">
          <div className="text-xs uppercase tracking-[0.2em] text-brand-orange inline-flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" /> Rehearsal · private
          </div>
          <h1 className="font-display text-3xl sm:text-4xl leading-tight">
            You re-attempted <span className="text-brand-orange">{dimLabel.toLowerCase()}</span>.
          </h1>
          <p className="text-sm text-muted-foreground">This score is just for you — your leaderboard standing stays based on the original full call.</p>
        </header>

        {scoring ? (
          <div className="rounded-xl border border-brand-orange/20 bg-brand-orange/5 p-6 flex items-start gap-4">
            <div className="shrink-0 mt-0.5 inline-flex items-center justify-center h-10 w-10 rounded-lg bg-brand-orange/15 text-brand-orange">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
            <div>
              <p className="font-display text-xl leading-tight">Grading your rehearsal…</p>
              <p className="text-sm text-muted-foreground mt-1">Takes 10–20 seconds. This page will update automatically.</p>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl shadow-elevated p-8 space-y-6">
            <div className="flex items-end justify-between gap-6 flex-wrap">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">This attempt</div>
                <div className="font-display text-6xl tabular-nums leading-none">{newScore ?? "—"}<span className="text-2xl opacity-40 font-normal">/5</span></div>
              </div>
              {oldScore != null && (
                <div className="text-right">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Original</div>
                  <div className="font-display text-3xl tabular-nums leading-none opacity-70">{oldScore}<span className="text-lg opacity-40 font-normal">/5</span></div>
                  {delta != null && delta !== 0 && (
                    <div className={`mt-1 text-xs font-semibold ${delta > 0 ? "text-success" : "text-brand-pink"}`}>
                      {delta > 0 ? `▲ +${delta}` : `▼ ${delta}`}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="h-px w-full bg-foreground/10" />
            <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap">{s.coaching_summary || "No feedback available."}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-3 justify-center">
          {s.parent_session_id && (
            <Link to={`/session/${s.parent_session_id}`}>
              <Button variant="outline" className="rounded-lg">
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to call debrief
              </Button>
            </Link>
          )}
          {s.parent_session_id && dimKey && (
            <Link to={`/session/${s.parent_session_id}?rehearse=${dimKey}`}>
              <Button className="rounded-lg bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground">
                <RotateCcw className="h-4 w-4 mr-1.5" /> Try this moment again
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}