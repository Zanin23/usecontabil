import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Card, CardContent, Badge, Input,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  ScrollArea, Tabs, TabsList, TabsTrigger,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import {
  Search, ExternalLink, ChevronDown, ChevronRight,
  Activity, Users, Trophy, Clock, CheckCircle2, Mic,
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  ComposedChart, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const EXCLUDED_USER_IDS = new Set<string>([]);

type Session = {
  id: string;
  user_id: string | null;
  role_play_id: string | null;
  status: string;
  difficulty: string;
  total_score: number | null;
  duration_seconds: number | null;
  started_at: string;
  ended_at: string | null;
  transcript: { role: string; text: string }[] | null;
  scores: Record<string, { score?: number; rationale?: string }> | null;
  green_flags: string[] | null;
  red_flags: string[] | null;
};
type RP = { id: string; name: string; slug: string; role: string; topic: string };
type Profile = { id: string; display_name: string | null };

type Range = "7d" | "30d" | "90d" | "all";
const RANGE_DAYS: Record<Range, number | null> = { "7d": 7, "30d": 30, "90d": 90, all: null };

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "var(--success)",
  standard: "var(--brand-orange)",
  hard: "var(--brand-pink)",
};

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export default function AdminReporting() {
  const [loading, setLoading] = useState(true);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [rps, setRps] = useState<RP[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [openUser, setOpenUser] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("30d");

  useEffect(() => {
    supabase.functions.invoke("roleplay-admin", { body: { action: "report" } })
      .then(({ data, error }) => {
        if (error || data?.error) { toast.error(error?.message ?? data?.error); return; }
        const rawProfiles: Profile[] = (data?.profiles ?? []).filter(
          (p: Profile) => !EXCLUDED_USER_IDS.has(p.id) && !!p.display_name?.trim(),
        );
        const namedIds = new Set(rawProfiles.map((p) => p.id));
        const raw: Session[] = data?.sessions ?? [];
        setAllSessions(raw.filter((s) => s.user_id && namedIds.has(s.user_id)));
        setRps(data?.role_plays ?? []);
        setProfiles(rawProfiles);
      })
      .finally(() => setLoading(false));
  }, []);

  const rpById = useMemo(() => new Map(rps.map((r) => [r.id, r])), [rps]);
  const userById = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  // Time-filtered sessions powering KPIs & charts. Tables stay on full data.
  const sessions = useMemo(() => {
    const days = RANGE_DAYS[range];
    if (!days) return allSessions;
    const cutoff = Date.now() - days * 86_400_000;
    return allSessions.filter((s) => new Date(s.started_at).getTime() >= cutoff);
  }, [allSessions, range]);

  // Daily activity includes ALL sessions (guests too), not just named users.
  const [allSessionsAny, setAllSessionsAny] = useState<Session[]>([]);
  useEffect(() => {
    supabase
      .from("sessions")
      .select("id, user_id, role_play_id, status, difficulty, total_score, duration_seconds, started_at, ended_at")
      .order("started_at", { ascending: false })
      .limit(2000)
      .then(({ data }) => setAllSessionsAny((data ?? []) as Session[]));
  }, []);
  const sessionsForActivity = useMemo(() => {
    const days = RANGE_DAYS[range];
    if (!days) return allSessionsAny;
    const cutoff = Date.now() - days * 86_400_000;
    return allSessionsAny.filter((s) => new Date(s.started_at).getTime() >= cutoff);
  }, [allSessionsAny, range]);

  const labelForUser = (uid: string | null) => {
    if (!uid) return "Guest";
    const p = userById.get(uid);
    return p?.display_name?.trim() || `User ${uid.slice(0, 8)}`;
  };

  // Aggregate by role-play
  const rpStats = useMemo(() => {
    const m = new Map<string, { rp: RP | undefined; runs: number; scored: number; sumScore: number; last: string }>();
    for (const s of sessions) {
      const id = s.role_play_id ?? "_unknown";
      const cur = m.get(id) ?? { rp: rpById.get(id), runs: 0, scored: 0, sumScore: 0, last: s.started_at };
      cur.runs += 1;
      if (typeof s.total_score === "number") { cur.scored += 1; cur.sumScore += s.total_score; }
      if (s.started_at > cur.last) cur.last = s.started_at;
      m.set(id, cur);
    }
    return [...m.entries()]
      .map(([id, v]) => ({ id, name: v.rp?.name ?? "(deleted)", slug: v.rp?.slug, role: v.rp?.role, topic: v.rp?.topic, runs: v.runs, avg: v.scored ? Math.round(v.sumScore / v.scored) : null, last: v.last }))
      .sort((a, b) => b.runs - a.runs);
  }, [sessions, rpById]);

  // Aggregate by user
  const userStats = useMemo(() => {
    const m = new Map<string, { runs: number; scored: number; sumScore: number; last: string }>();
    for (const s of sessions) {
      const id = s.user_id ?? "_guest";
      const cur = m.get(id) ?? { runs: 0, scored: 0, sumScore: 0, last: s.started_at };
      cur.runs += 1;
      if (typeof s.total_score === "number") { cur.scored += 1; cur.sumScore += s.total_score; }
      if (s.started_at > cur.last) cur.last = s.started_at;
      m.set(id, cur);
    }
    const q = query.trim().toLowerCase();
    return [...m.entries()]
      .map(([id, v]) => ({
        id,
        name: id === "_guest" ? "Guest" : labelForUser(id),
        runs: v.runs,
        avg: v.scored ? Math.round(v.sumScore / v.scored) : null,
        last: v.last,
      }))
      .filter((u) => !q || u.name.toLowerCase().includes(q))
      .sort((a, b) => b.runs - a.runs);
  }, [sessions, query, userById]);

  const sessionsForUser = (uid: string) =>
    allSessions
      .filter((s) => (uid === "_guest" ? !s.user_id : s.user_id === uid))
      .sort((a, b) => (a.started_at < b.started_at ? 1 : -1));

  const fmtDate = (iso: string) => new Date(iso).toLocaleString();
  const fmtDur = (s: number | null) => {
    if (!s) return "—";
    const m = Math.floor(s / 60); const ss = s % 60;
    return `${m}:${ss.toString().padStart(2, "0")}`;
  };

  // ----- KPI tiles -----
  const kpis = useMemo(() => {
    const total = sessions.length;
    const uniqueReps = new Set(sessions.map((s) => s.user_id).filter(Boolean)).size;
    const scored = sessions.filter((s) => typeof s.total_score === "number");
    const avgScore = scored.length ? Math.round(scored.reduce((a, s) => a + (s.total_score ?? 0), 0) / scored.length) : null;
    const withDur = sessions.filter((s) => (s.duration_seconds ?? 0) > 0);
    const avgDuration = withDur.length ? Math.round(withDur.reduce((a, s) => a + (s.duration_seconds ?? 0), 0) / withDur.length) : 0;
    const completed = sessions.filter((s) => s.status === "scored" || s.status === "completed").length;
    const completionRate = total ? Math.round((completed / total) * 100) : 0;

    // Talk-time ratio from transcripts (rep words ÷ total words across all sessions)
    let repWords = 0, buyerWords = 0, repTurns = 0, buyerTurns = 0;
    for (const s of sessions) {
      const turns = s.transcript ?? [];
      for (const t of turns) {
        const w = countWords(t.text ?? "");
        if (t.role === "user") { repWords += w; repTurns++; }
        else if (t.role === "agent") { buyerWords += w; buyerTurns++; }
      }
    }
    const totalWords = repWords + buyerWords;
    const repTalkPct = totalWords ? Math.round((repWords / totalWords) * 100) : null;

    return { total, uniqueReps, avgScore, avgDuration, completionRate, repTalkPct, repWords, buyerWords, repTurns, buyerTurns };
  }, [sessions]);

  // ----- Daily run series (with avg score per day for combo chart) -----
  const dailySeries = useMemo(() => {
    const m = new Map<string, number>();
    const sm = new Map<string, { sum: number; n: number }>();
    for (const s of sessionsForActivity) {
      const d = new Date(s.started_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      m.set(key, (m.get(key) ?? 0) + 1);
      if (typeof s.total_score === "number") {
        const cur = sm.get(key) ?? { sum: 0, n: 0 };
        cur.sum += s.total_score; cur.n += 1; sm.set(key, cur);
      }
    }
    const sorted = [...m.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
    if (sorted.length === 0) return [];
    const first = new Date(sorted[0][0]);
    const last = new Date(sorted[sorted.length - 1][0]);
    const out: { date: string; runs: number; avg: number | null; label: string }[] = [];
    for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const sx = sm.get(key);
      out.push({
        date: key,
        runs: m.get(key) ?? 0,
        avg: sx ? Math.round(sx.sum / sx.n) : null,
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      });
    }
    return out;
  }, [sessionsForActivity]);

  // ----- Difficulty distribution -----
  const difficultyData = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sessions) m.set(s.difficulty, (m.get(s.difficulty) ?? 0) + 1);
    return ["easy", "standard", "hard"]
      .map((k) => ({ name: k, value: m.get(k) ?? 0 }))
      .filter((d) => d.value > 0);
  }, [sessions]);

  // ----- Dimension averages across all scored sessions -----
  const dimensionData = useMemo(() => {
    const m = new Map<string, { sum: number; n: number; label: string }>();
    for (const s of sessions) {
      if (!s.scores) continue;
      for (const [key, val] of Object.entries(s.scores)) {
        const score = val?.score;
        if (typeof score !== "number") continue;
        const cur = m.get(key) ?? { sum: 0, n: 0, label: key.replace(/_/g, " ") };
        cur.sum += score; cur.n += 1; m.set(key, cur);
      }
    }
    return [...m.entries()]
      .map(([key, v]) => ({ key, label: v.label, avg: Math.round((v.sum / v.n) * 10) / 10, n: v.n }))
      .sort((a, b) => b.avg - a.avg);
  }, [sessions]);

  // ----- Top reps by activity (chart) -----
  const topReps = useMemo(() => {
    const m = new Map<string, { runs: number; sum: number; scored: number }>();
    for (const s of sessions) {
      if (!s.user_id) continue;
      const cur = m.get(s.user_id) ?? { runs: 0, sum: 0, scored: 0 };
      cur.runs++;
      if (typeof s.total_score === "number") { cur.sum += s.total_score; cur.scored++; }
      m.set(s.user_id, cur);
    }
    return [...m.entries()]
      .map(([id, v]) => ({ name: labelForUser(id), runs: v.runs, avg: v.scored ? Math.round(v.sum / v.scored) : 0 }))
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 8);
  }, [sessions, userById]);

  // ----- Per-rep talk-time leaderboard (lowest rep talk % = best listener) -----
  const talkTimeLeaderboard = useMemo(() => {
    const m = new Map<string, { rep: number; buyer: number; sessions: number }>();
    for (const s of sessions) {
      if (!s.user_id) continue;
      const turns = s.transcript ?? [];
      if (!turns.length) continue;
      let r = 0, b = 0;
      for (const t of turns) {
        const w = countWords(t.text ?? "");
        if (t.role === "user") r += w;
        else if (t.role === "agent") b += w;
      }
      if (r + b === 0) continue;
      const cur = m.get(s.user_id) ?? { rep: 0, buyer: 0, sessions: 0 };
      cur.rep += r; cur.buyer += b; cur.sessions += 1;
      m.set(s.user_id, cur);
    }
    return [...m.entries()]
      .map(([id, v]) => {
        const total = v.rep + v.buyer;
        return {
          id,
          name: labelForUser(id),
          sessions: v.sessions,
          repWords: v.rep,
          buyerWords: v.buyer,
          repPct: Math.round((v.rep / total) * 100),
        };
      })
      .filter((r) => r.repWords + r.buyerWords >= 200) // skip noisy tiny samples
      .sort((a, b) => a.repPct - b.repPct);
  }, [sessions, userById]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading reporting…</p>;

  const tooltipStyle = { background: "var(--background)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 };
  const labelStyle = { color: "var(--foreground)", fontWeight: 600 };

  const fmtMinSec = (s: number) => {
    const m = Math.floor(s / 60); const ss = s % 60;
    return `${m}m ${ss.toString().padStart(2, "0")}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header + range filter */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl">Reporting</h2>
          <p className="text-xs text-muted-foreground mt-1">Live performance across reps and role-plays.</p>
        </div>
        <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
          <TabsList className="rounded-lg">
            <TabsTrigger className="rounded-lg" value="7d">7 days</TabsTrigger>
            <TabsTrigger className="rounded-lg" value="30d">30 days</TabsTrigger>
            <TabsTrigger className="rounded-lg" value="90d">90 days</TabsTrigger>
            <TabsTrigger className="rounded-lg" value="all">All time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPI tiles */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <KpiTile icon={<Activity className="h-4 w-4" />} label="Sessions" value={kpis.total.toString()} accent="brand-orange" />
        <KpiTile icon={<Users className="h-4 w-4" />} label="Active reps" value={kpis.uniqueReps.toString()} accent="brand-purple" />
        <KpiTile icon={<Trophy className="h-4 w-4" />} label="Avg score" value={kpis.avgScore != null ? `${kpis.avgScore}` : "—"} suffix={kpis.avgScore != null ? "/100" : undefined} accent="success" />
        <KpiTile icon={<Clock className="h-4 w-4" />} label="Avg duration" value={kpis.avgDuration ? fmtMinSec(kpis.avgDuration) : "—"} accent="brand-blue" />
        <KpiTile icon={<CheckCircle2 className="h-4 w-4" />} label="Completion" value={`${kpis.completionRate}%`} accent="success" />
        <KpiTile icon={<Mic className="h-4 w-4" />} label="Rep talk-time" value={kpis.repTalkPct != null ? `${kpis.repTalkPct}%` : "—"} accent="brand-pink" />
      </div>

      {/* Charts row 1: daily activity + score trend */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-2xl shadow-card lg:col-span-2">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="font-display text-xl">Daily activity</h3>
                <p className="text-xs text-muted-foreground">Sessions started each day.</p>
              </div>
              <Badge variant="outline" className="rounded-lg">{sessionsForActivity.length} in window</Badge>
            </div>
            {dailySeries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No sessions in this window.</p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="runsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--brand-orange)" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="var(--brand-orange)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={28} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
                    <Area type="monotone" dataKey="runs" stroke="var(--brand-orange)" strokeWidth={2} fill="url(#runsFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Role-play usage */}
      <Card className="rounded-2xl shadow-card flex flex-col h-[70vh] min-h-[480px]">
        <CardContent className="p-6 pb-3 space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl">Role-play usage</h2>
              <p className="text-xs text-muted-foreground">Most-used role-plays across all reps.</p>
            </div>
            <Badge variant="outline" className="rounded-lg shrink-0">{sessions.length} sessions</Badge>
          </div>
        </CardContent>
        <ScrollArea className="flex-1 px-6 pb-6">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Role-play</TableHead>
                <TableHead className="w-14 text-right">Runs</TableHead>
                <TableHead className="w-14 text-right">Avg</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rpStats.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">No sessions yet.</TableCell></TableRow>
              )}
              {rpStats.map((r) => (
                <TableRow
                  key={r.id}
                  className={r.slug ? "cursor-pointer hover:bg-muted/40 transition-colors" : ""}
                  onClick={r.slug ? () => { window.location.href = `/r/${r.slug}`; } : undefined}
                >
                  <TableCell className="font-medium align-top">
                    {r.slug ? (
                      <Link to={`/r/${r.slug}`} className="hover:underline inline-flex items-start gap-1" onClick={(e) => e.stopPropagation()}>
                        <span className="break-words">{r.name}</span> <ExternalLink className="h-3 w-3 opacity-60 shrink-0 mt-1" />
                      </Link>
                    ) : r.name}
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2">
                      {r.role && <span>{r.role}</span>}
                      {r.topic && <span>· {r.topic}</span>}
                      <span>· {fmtDate(r.last)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.runs}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.avg ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Talk-time analysis */}
      <Card className="rounded-2xl shadow-card">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-display text-xl">Talk-time analysis</h3>
              <p className="text-xs text-muted-foreground">Words spoken across all sessions in this window. Aim for reps to listen more than they talk.</p>
            </div>
            <Badge variant="outline" className="rounded-lg">
              {(kpis.repWords + kpis.buyerWords).toLocaleString()} words analyzed
            </Badge>
          </div>
          {kpis.repTalkPct == null ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No transcripts available yet.</p>
          ) : (
            <>
              <div className="flex h-10 w-full overflow-hidden rounded-lg ring-1 ring-border">
                <div className="bg-brand-orange flex items-center justify-center text-xs font-semibold text-primary-foreground" style={{ width: `${kpis.repTalkPct}%` }}>
                  Rep {kpis.repTalkPct}%
                </div>
                <div className="bg-brand-purple/80 flex items-center justify-center text-xs font-semibold text-white" style={{ width: `${100 - kpis.repTalkPct}%` }}>
                  Buyer {100 - kpis.repTalkPct}%
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <StatBlock label="Rep words" value={kpis.repWords.toLocaleString()} />
                <StatBlock label="Buyer words" value={kpis.buyerWords.toLocaleString()} />
                <StatBlock label="Rep turns" value={kpis.repTurns.toLocaleString()} />
                <StatBlock label="Buyer turns" value={kpis.buyerTurns.toLocaleString()} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Talk-time leaderboard */}
      {talkTimeLeaderboard.length > 0 && (
        <Card className="rounded-2xl shadow-card">
          <CardContent className="p-6 space-y-4">
            <div>
              <h3 className="font-display text-xl">Talk-time <span className="text-brand-orange">leaderboard</span></h3>
              <p className="text-xs text-muted-foreground">Reps ranked by lowest rep talk %. Lower = better listener. Min 200 words across the window.</p>
            </div>
            <div className="space-y-2">
              {talkTimeLeaderboard.map((r, i) => (
                <div key={r.id} className="flex items-center gap-3">
                  <div className="w-6 text-right text-sm font-semibold tabular-nums text-muted-foreground">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-medium">{r.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {r.sessions} {r.sessions === 1 ? "session" : "sessions"} · {(r.repWords + r.buyerWords).toLocaleString()} words
                      </span>
                    </div>
                    <div className="mt-1 flex h-6 w-full overflow-hidden rounded-lg ring-1 ring-border">
                      <div
                        className="bg-brand-orange flex items-center justify-center text-[10px] font-semibold text-primary-foreground"
                        style={{ width: `${r.repPct}%` }}
                      >
                        {r.repPct >= 12 ? `Rep ${r.repPct}%` : ""}
                      </div>
                      <div
                        className="bg-brand-purple/80 flex items-center justify-center text-[10px] font-semibold text-white"
                        style={{ width: `${100 - r.repPct}%` }}
                      >
                        {100 - r.repPct >= 12 ? `Buyer ${100 - r.repPct}%` : ""}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top reps chart */}
      {topReps.length > 0 && (
        <Card className="rounded-2xl shadow-card">
          <CardContent className="p-6 space-y-4">
            <div>
              <h3 className="font-display text-xl">Most active reps</h3>
              <p className="text-xs text-muted-foreground">Sessions in this window, with average score overlaid.</p>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={topReps} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} interval={0} angle={-15} textAnchor="end" height={56} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={28} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={32} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
                  <Bar yAxisId="left" dataKey="runs" name="Sessions" fill="var(--brand-orange)" radius={[8, 8, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="avg" name="Avg score" stroke="var(--brand-purple)" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing detail tables */}
      <Card className="rounded-2xl shadow-card flex flex-col h-[70vh] min-h-[480px]">
        <CardContent className="p-6 pb-3 space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-display text-xl">Rep activity</h2>
              <p className="text-xs text-muted-foreground">Click a row to see every role-play.</p>
            </div>
            <div className="relative w-full sm:w-56">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search rep…" className="pl-9 rounded-lg h-9" />
            </div>
          </div>
        </CardContent>
        <ScrollArea className="flex-1 px-6 pb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-6"></TableHead>
                <TableHead>Rep</TableHead>
                <TableHead className="w-16 text-right">Runs</TableHead>
                <TableHead className="w-16 text-right">Avg</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userStats.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">No reps yet.</TableCell></TableRow>
              )}
              {userStats.map((u) => {
                const open = openUser === u.id;
                return (
                  <Fragment key={u.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => setOpenUser(open ? null : u.id)}
                    >
                      <TableCell>{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                      <TableCell className="font-medium">
                        {u.name}
                        <div className="text-[11px] text-muted-foreground mt-0.5">{fmtDate(u.last)}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{u.runs}</TableCell>
                      <TableCell className="text-right tabular-nums">{u.avg ?? "—"}</TableCell>
                    </TableRow>
                    {open && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell></TableCell>
                        <TableCell colSpan={3} className="py-3">
                          <div className="space-y-1">
                            {sessionsForUser(u.id).map((s) => {
                              const rp = s.role_play_id ? rpById.get(s.role_play_id) : null;
                              return (
                                <Link
                                  key={s.id}
                                  to={`/session/${s.id}`}
                                  className="flex items-start justify-between gap-3 text-xs rounded-md px-2 py-1 -mx-2 hover:bg-muted/60 transition-colors"
                                >
                                  <div className="flex items-start gap-2 min-w-0 flex-1">
                                    <Badge variant="outline" className="rounded-lg text-[10px] shrink-0 mt-0.5">{s.difficulty}</Badge>
                                    <span className="break-words">{rp?.name ?? "(deleted)"}</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-muted-foreground tabular-nums shrink-0">
                                    <span>{fmtDur(s.duration_seconds)}</span>
                                    <span className="w-8 text-right">{s.total_score ?? "—"}</span>
                                    <ExternalLink className="h-3 w-3 text-brand-orange" />
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
}

const ACCENTS: Record<string, string> = {
  "brand-orange": "bg-brand-orange/10 text-brand-orange",
  "brand-purple": "bg-brand-purple/10 text-brand-purple",
  "brand-pink": "bg-brand-pink/30 text-foreground",
  "brand-blue": "bg-brand-blue/10 text-brand-blue",
  success: "bg-success/15 text-success",
};

function KpiTile({
  icon, label, value, suffix, accent = "brand-orange",
}: { icon: React.ReactNode; label: string; value: string; suffix?: string; accent?: keyof typeof ACCENTS }) {
  return (
    <Card className="rounded-2xl shadow-card">
      <CardContent className="p-4 sm:p-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
          <span className={`inline-flex items-center justify-center h-7 w-7 rounded-lg ${ACCENTS[accent] ?? ACCENTS["brand-orange"]}`}>{icon}</span>
        </div>
        <div className="font-display text-2xl sm:text-3xl leading-none tabular-nums">
          {value}
          {suffix && <span className="text-sm opacity-40 font-normal ml-1">{suffix}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-xl tabular-nums mt-1">{value}</div>
    </div>
  );
}