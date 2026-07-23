import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button, Card, CardContent, Badge } from "@/design-system/mj-design-system-db98fa";
import { ArrowLeft, Trophy } from "lucide-react";
import type { RolePlay } from "@/lib/rolePlay";
import { resolveHeadshot, inferGender } from "@/lib/headshots";
import { useAuthUser } from "@/lib/useAuthUser";

type Row = {
  session_id: string;
  user_id: string | null;
  display_name: string;
  total_score: number;
  difficulty: string;
  duration_seconds: number | null;
  ended_at: string;
};

const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`);

export default function Leaderboard() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuthUser();
  const [rp, setRp] = useState<RolePlay | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rpData } = await supabase
        .from("role_plays").select("*").eq("slug", slug!).maybeSingle();
      if (cancelled) return;
      if (!rpData) { setLoading(false); return; }
      setRp(rpData as unknown as RolePlay);
      const { data: lb } = await supabase.rpc("role_play_leaderboard", {
        _role_play_id: (rpData as { id: string }).id, _limit: 50,
      });
      if (cancelled) return;
      setRows((lb ?? []) as Row[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) return <div className="min-h-screen bg-aurora" />;
  if (!rp) return (
    <div className="min-h-screen bg-aurora flex items-center justify-center text-muted-foreground">Role-play not found.</div>
  );

  return (
    <div className="min-h-screen bg-aurora">
      <header className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link to="/"><Button variant="ghost" size="sm" className="rounded-lg"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Leaderboard</div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pb-16 space-y-6">
        <Card className="rounded-xl shadow-elevated">
          <CardContent className="p-6 flex items-center gap-4">
            <img
              src={resolveHeadshot(rp.id, rp.persona?.headshot_url, inferGender(rp.persona), rp.persona?.headshot_index)}
              alt={rp.persona?.first_name ?? rp.name}
              className="w-14 h-14 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Trophy className="h-4 w-4 text-brand-orange" />
                <h1 className="font-display text-2xl truncate">{rp.name}</h1>
              </div>
              <div className="text-xs text-muted-foreground">{rp.persona?.title}{rp.persona?.company ? ` · ${rp.persona.company}` : ""}</div>
            </div>
            <Badge className="rounded-lg bg-brand-orange/10 text-brand-orange border border-brand-orange/20 hover:bg-brand-orange/10">{rp.topic}</Badge>
          </CardContent>
        </Card>

        {rows.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-10 text-center text-muted-foreground space-y-3">
              <div>No scored calls yet — be the first.</div>
              <Link to="/"><Button className="rounded-lg bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground">Start a call</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl shadow-card">
            <CardContent className="p-2 sm:p-3">
              <ul className="divide-y divide-border">
                {rows.map((r, i) => {
                  const isMine = user && r.user_id === user.id;
                  return (
                    <li key={r.session_id}>
                      <Link
                        to={`/session/${r.session_id}`}
                        className={`flex items-center gap-4 p-3 sm:p-4 rounded-xl transition hover:bg-muted/50 ${isMine ? "bg-brand-orange/5" : ""}`}
                      >
                        <div className="w-8 text-center font-display text-lg">{medal(i)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {r.display_name}{isMine && <span className="text-xs text-brand-orange ml-2">you</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(r.ended_at).toLocaleDateString()} · <span className="capitalize">{r.difficulty}</span>
                            {r.duration_seconds ? ` · ${Math.round(r.duration_seconds / 60)}m` : ""}
                          </div>
                        </div>
                        <div className="font-display text-2xl tabular-nums">
                          {r.total_score}<span className="text-xs text-muted-foreground"> / 100</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}