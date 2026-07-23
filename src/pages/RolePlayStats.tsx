import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Button, Card, CardContent, Badge,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import { ArrowLeft, Trophy, Activity, Users, Clock, Mic } from "lucide-react";
import type { RolePlay } from "@/lib/rolePlay";
import { resolveHeadshot, inferGender } from "@/lib/headshots";

type Session = {
  id: string;
  user_id: string | null;
  status: string;
  difficulty: string;
  total_score: number | null;
  duration_seconds: number | null;
  started_at: string;
  ended_at: string | null;
  scores: Record<string, { score?: number }> | null;
  transcript: { role: string; text: string }[] | null;
};
type LBRow = {
  session_id: string;
  user_id: string | null;
  display_name: string;
  total_score: number;
  difficulty: string;
  duration_seconds: number | null;
  ended_at: string;
};
type Profile = { id: string; display_name: string | null };

const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`);

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function fmtDur(s: number | null) {
  if (!s) return "—";
  const m = Math.floor(s / 60); const ss = s % 60;
  return `${m}m ${ss.toString().padStart(2, "0")}s`;
}

export default function RolePlayStats() {
  const { slug } = useParams<{ slug: string }>();
  const [rp, setRp] = useState<RolePlay | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [leaderboard, setLeaderboard] = useState<LBRow[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: rpData } = await supabase
        .from("role_plays").select("*").eq("slug", slug!).maybeSingle();
      if (cancelled) return;
      if (!rpData) { setLoading(false); return; }
      const rpRow = rpData as unknown as RolePlay;
      setRp(rpRow);

      const [{ data: sess }, { data: lb }, { data: profs }] = await Promise.all([
        supabase
          .from("sessions")
          .select("id, user_id, status, difficulty, total_score, duration_seconds, started_at, ended_at, scores, transcript")
          .eq("role_play_id", rpRow.id)
          .is("parent_session_id", null)
          .order("started_at", { ascending: false })
          .limit(1000),
        supabase.rpc("role_play_leaderboard", { _role_play_id: rpRow.id, _limit: 25 }),
        supabase.from("profiles").select("id, display_name"),
      ]);
      if (cancelled) return;
      setSessions((sess ?? []) as Session[]);
      setLeaderboard((lb ?? []) as LBRow[]);
      const m = new Map<string, string>();
      for (const p of (profs ?? []) as Profile[]) {
        if (p.display_name?.trim()) m.set(p.id, p.display_name.trim());
      }
      setProfiles(m);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const nameOf = (uid: string | null) =>
    !uid ? "Guest" : profiles.get(uid) ?? `User ${uid.slice(0, 8)}`;

  const kpis = useMemo(() => {
    const total = sessions.length;
    const uniqueReps = new Set(sessions.map((s) => s.user_id).filter(Boolean)).size;
    const scored = sessions.filter((s) => typeof s.total_score === "number");
    const avgScore = scored.length
      ? Math.round(scored.reduce((a, s) => a + (s.total_score ?? 0), 0) / scored.length)
      : null;
    const withDur = sessions.filter((s) => (s.duration_seconds ?? 0) > 0);
    const avgDuration = withDur.length
      ? Math.round(withDur.reduce((a, s) => a + (s.duration_seconds ?? 0), 0) / withDur.length)
      : 0;
    const completed = sessions.filter((s) => s.status === "scored" || s.status === "completed").length;
    const completionRate = total ? Math.round((completed / total) * 100) : 0;

    let repWords = 0, buyerWords = 0;
    for (const s of sessions) {
      for (const t of s.transcript ?? []) {
        const w = countWords(t.text ?? "");
        if (t.role === "user") repWords += w;
        else if (t.role === "agent") buyerWords += w;
      }
    }
    const tot = repWords + buyerWords;
    const repTalkPct = tot ? Math.round((repWords / tot) * 100) : null;
    return { total, uniqueReps, avgScore, avgDuration, completionRate, repTalkPct };
  }, [sessions]);

  const categoryStats = useMemo(() => {
    if (!rp) return [];
    const cats = rp.scorecard?.categories ?? [];
    return cats.map((c) => {
      let sum = 0, n = 0;
      for (const s of sessions) {
        const v = s.scores?.[c.key]?.score;
        if (typeof v === "number") { sum += v; n += 1; }
      }
      return { key: c.key, label: c.label, avg: n ? Math.round((sum / n) * 10) / 10 : null, n };
    });
  }, [sessions, rp]);

  const difficultyMix = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sessions) m.set(s.difficulty, (m.get(s.difficulty) ?? 0) + 1);
    return ["easy", "standard", "hard"]
      .map((k) => ({ k, n: m.get(k) ?? 0 }))
      .filter((d) => d.n > 0);
  }, [sessions]);

  if (loading) return <div className="min-h-screen bg-aurora" />;
  if (!rp) return (
    <div className="min-h-screen bg-aurora flex items-center justify-center text-muted-foreground">
      Role-play not found.
    </div>
  );

  return (
    <div className="min-h-screen bg-aurora">
      <header className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link to="/admin"><Button variant="ghost" size="sm" className="rounded-lg"><ArrowLeft className="h-4 w-4 mr-1" />Admin</Button></Link>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Role-play stats</div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-16 space-y-6">
        {/* Hero */}
        <Card className="rounded-xl shadow-elevated">
          <CardContent className="p-6 flex items-center gap-4">
            <img
              src={resolveHeadshot(rp.id, rp.persona?.headshot_url, inferGender(rp.persona), rp.persona?.headshot_index)}
              alt={rp.persona?.first_name ?? rp.name}
              className="w-14 h-14 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl truncate">{rp.name}</h1>
              <div className="text-xs text-muted-foreground truncate">
                {[rp.persona?.first_name, rp.persona?.title, rp.persona?.company].filter(Boolean).join(" · ")}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Badge className="rounded-lg bg-brand-orange/10 text-brand-orange border border-brand-orange/20 hover:bg-brand-orange/10">{rp.topic}</Badge>
              <Link to={`/r/${rp.slug}`} className="text-xs text-muted-foreground hover:text-foreground">/{rp.slug}</Link>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <KpiTile icon={<Activity className="h-4 w-4" />} label="Total runs" value={kpis.total.toString()} />
          <KpiTile icon={<Users className="h-4 w-4" />} label="Unique reps" value={kpis.uniqueReps.toString()} />
          <KpiTile icon={<Trophy className="h-4 w-4" />} label="Avg score" value={kpis.avgScore != null ? `${kpis.avgScore}` : "—"} suffix={kpis.avgScore != null ? "/100" : undefined} />
          <KpiTile icon={<Clock className="h-4 w-4" />} label="Avg duration" value={kpis.avgDuration ? fmtDur(kpis.avgDuration) : "—"} />
          <KpiTile icon={<Activity className="h-4 w-4" />} label="Completion" value={`${kpis.completionRate}%`} />
          <KpiTile icon={<Mic className="h-4 w-4" />} label="Rep talk-time" value={kpis.repTalkPct != null ? `${kpis.repTalkPct}%` : "—"} />
        </div>

        {/* Scorecard averages */}
        <Card className="rounded-2xl shadow-card">
          <CardContent className="p-6 space-y-4">
            <div>
              <h3 className="font-display text-xl">Scorecard <span className="text-brand-orange">averages</span></h3>
              <p className="text-xs text-muted-foreground">Average 1–5 score per dimension across all scored sessions.</p>
            </div>
            {categoryStats.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No scorecard dimensions defined.</p>
            ) : (
              <div className="space-y-3">
                {categoryStats.map((c) => (
                  <div key={c.key} className="space-y-1">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="truncate">{c.label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {c.avg != null ? `${c.avg} / 5` : "—"} <span className="text-xs">({c.n})</span>
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-lg bg-muted overflow-hidden">
                      <div
                        className="h-full bg-brand-orange"
                        style={{ width: `${c.avg != null ? (c.avg / 5) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Difficulty mix */}
        {difficultyMix.length > 0 && (
          <Card className="rounded-2xl shadow-card">
            <CardContent className="p-6 space-y-3">
              <div>
                <h3 className="font-display text-xl">Difficulty mix</h3>
                <p className="text-xs text-muted-foreground">Easy / standard / hard distribution.</p>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-lg ring-1 ring-border">
                {difficultyMix.map((d) => {
                  const pct = (d.n / kpis.total) * 100;
                  const color = d.k === "easy" ? "var(--success)" : d.k === "hard" ? "var(--brand-pink)" : "var(--brand-orange)";
                  return <div key={d.k} style={{ width: `${pct}%`, background: color }} />;
                })}
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                {difficultyMix.map((d) => (
                  <span key={d.k} className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.k === "easy" ? "var(--success)" : d.k === "hard" ? "var(--brand-pink)" : "var(--brand-orange)" }} />
                    <span className="capitalize">{d.k}</span>
                    <span className="text-muted-foreground tabular-nums">{d.n}</span>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard */}
        <Card className="rounded-2xl shadow-card">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-display text-xl"><span className="text-brand-orange">Leaderboard</span></h3>
                <p className="text-xs text-muted-foreground">Top scoring sessions (50+ score required).</p>
              </div>
              <Link to={`/leaderboard/${rp.slug}`}>
                <Button variant="outline" size="sm" className="rounded-lg">Public view</Button>
              </Link>
            </div>
            {leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No qualifying scored runs yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {leaderboard.map((r, i) => (
                  <li key={r.session_id}>
                    <Link
                      to={`/session/${r.session_id}`}
                      className="flex items-center gap-4 p-3 rounded-xl transition hover:bg-muted/50"
                    >
                      <div className="w-8 text-center font-display text-lg">{medal(i)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-sm">{r.display_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(r.ended_at).toLocaleDateString()} · <span className="capitalize">{r.difficulty}</span>
                          {r.duration_seconds ? ` · ${Math.round(r.duration_seconds / 60)}m` : ""}
                        </div>
                      </div>
                      <div className="font-display text-xl tabular-nums">
                        {r.total_score}<span className="text-xs text-muted-foreground"> / 100</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent sessions */}
        <Card className="rounded-2xl shadow-card overflow-hidden">
          <CardContent className="p-0">
            <div className="p-6 pb-3">
              <h3 className="font-display text-xl">Recent sessions</h3>
              <p className="text-xs text-muted-foreground">Latest runs of this role-play.</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rep</TableHead>
                  <TableHead className="w-28">Difficulty</TableHead>
                  <TableHead className="w-24">Score</TableHead>
                  <TableHead className="w-28">Duration</TableHead>
                  <TableHead className="w-36">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                      No sessions yet.
                    </TableCell>
                  </TableRow>
                )}
                {sessions.slice(0, 25).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <Link to={`/session/${s.id}`} className="hover:text-brand-orange transition">
                        {nameOf(s.user_id)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm capitalize">{s.difficulty}</TableCell>
                    <TableCell className="tabular-nums text-sm">
                      {typeof s.total_score === "number" ? `${s.total_score}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{fmtDur(s.duration_seconds)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(s.started_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function KpiTile({
  icon, label, value, suffix,
}: { icon: React.ReactNode; label: string; value: string; suffix?: string }) {
  return (
    <Card className="rounded-2xl shadow-card">
      <CardContent className="p-4 space-y-1">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
          {icon}<span>{label}</span>
        </div>
        <div className="font-display text-2xl tabular-nums">
          {value}{suffix && <span className="text-xs text-muted-foreground ml-1">{suffix}</span>}
        </div>
      </CardContent>
    </Card>
  );
}