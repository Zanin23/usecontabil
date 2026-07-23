import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button, Card, CardContent, Input } from "@/design-system/mj-design-system-db98fa";
import type { RolePlay } from "@/lib/rolePlay";
import { ArrowLeft, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/lib/useAuthUser";
import RolePlayCard from "@/components/RolePlayCard";

const ROLE_LABELS: Record<string, string> = {
  AE: "Account Executives",
  CSM: "Customer Success",
  SA: "Solutions Engineers",
};

export default function Library() {
  const { role: roleParam } = useParams<{ role: string }>();
  const role = (roleParam ?? "AE").toUpperCase();
  const nav = useNavigate();
  const { user } = useAuthUser();
  const [rolePlays, setRolePlays] = useState<RolePlay[]>([]);
  const [popularity, setPopularity] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<string>("all");
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("role_plays").select("*").eq("is_published", true).eq("role", role)
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setRolePlays((data ?? []) as unknown as RolePlay[]);
      });
    supabase.rpc("role_play_popularity").then(({ data }) => {
      const counts: Record<string, number> = {};
      for (const row of (data ?? []) as { role_play_id: string; sessions_count: number }[]) {
        counts[row.role_play_id] = Number(row.sessions_count) || 0;
      }
      setPopularity(counts);
    });
  }, [role]);

  const topics = useMemo(() => Array.from(new Set(rolePlays.map((r) => r.topic))).filter(Boolean), [rolePlays]);

  const filtered = useMemo(() => {
    const arr = rolePlays.filter((r) => {
      if (topic !== "all" && r.topic !== topic) return false;
      if (q) {
        const hay = [r.name, r.role, r.topic, r.persona?.first_name, r.persona?.title, r.persona?.company, r.scenario_brief]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
    return arr.sort((a, b) => {
      const pa = popularity[a.id] ?? 0;
      const pb = popularity[b.id] ?? 0;
      if (pb !== pa) return pb - pa;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [rolePlays, topic, q, popularity]);

  const start = async (rp: RolePlay) => {
    if (!user) {
      nav(`/auth?redirect=/library/${role}`);
      return;
    }
    setStarting(rp.id);
    const { data, error } = await supabase.from("sessions")
      .insert({ user_id: user.id, difficulty: "standard", role_play_id: rp.id })
      .select("id").single();
    setStarting(null);
    if (error || !data) { toast.error(error?.message ?? "Failed to start"); return; }
    nav(`/call/${data.id}`);
  };

  return (
    <div className="min-h-screen bg-aurora">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => nav("/practice")}>
          <ArrowLeft className="h-4 w-4 mr-1" />All role-plays
        </Button>
        <Link to={user ? "/create" : "/auth?redirect=/create"}>
          <Button className="rounded-lg bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground h-10 px-4">
            <Sparkles className="h-4 w-4 mr-1.5" />Build your own
          </Button>
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-16 space-y-8">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{role} library</div>
          <h1 className="font-display text-4xl">Role-plays for <span className="text-brand-orange">{ROLE_LABELS[role] ?? role}.</span></h1>
          <p className="text-muted-foreground">{rolePlays.length} role-play{rolePlays.length === 1 ? "" : "s"} · sorted by most used</p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, topic, company…" className="pl-9 rounded-lg h-11" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setTopic("all")} className={`rounded-lg px-4 py-2 border text-sm transition ${topic === "all" ? "bg-foreground text-background border-foreground" : "bg-card hover:bg-muted border-border"}`}>All topics</button>
            {topics.map((t) => (
              <button key={t} onClick={() => setTopic(t)} className={`rounded-lg px-4 py-2 border text-sm transition ${topic === t ? "bg-foreground text-background border-foreground" : "bg-card hover:bg-muted border-border"}`}>{t}</button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-10 text-center text-muted-foreground">
              No role-plays match. <Link to={user ? "/create" : "/auth?redirect=/create"} className="text-brand-orange underline">Build one of your own</Link>.
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((rp) => (
              <RolePlayCard key={rp.id} rp={rp} starting={starting === rp.id} onStart={start} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}