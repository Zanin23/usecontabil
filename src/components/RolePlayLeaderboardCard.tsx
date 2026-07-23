import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, Button } from "@/design-system/mj-design-system-db98fa";
import { Trophy, ArrowRight } from "lucide-react";
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

export function RolePlayLeaderboardCard({
  rolePlayId,
  slug,
  limit = 5,
}: {
  rolePlayId: string;
  slug?: string | null;
  limit?: number;
}) {
  const { user } = useAuthUser();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.rpc("role_play_leaderboard", {
        _role_play_id: rolePlayId,
        _limit: limit,
      });
      if (cancelled) return;
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [rolePlayId, limit]);

  return (
    <Card className="rounded-2xl shadow-card">
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2">
            <Trophy className="h-4 w-4 text-brand-orange" />
            <h3 className="font-display text-lg">Leaderboard</h3>
          </div>
          {slug && (
            <Link to={`/leaderboard/${slug}`}>
              <Button variant="ghost" size="sm" className="rounded-lg text-xs">
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          )}
        </div>

        {loading ? (
          <div className="text-xs text-muted-foreground py-4">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-xs text-muted-foreground py-4">No scored calls yet — be the first.</div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r, i) => {
              const isMine = user && r.user_id === user.id;
              return (
                <li key={r.session_id}>
                  <Link
                    to={`/session/${r.session_id}`}
                    className={`flex items-center gap-3 py-2 px-2 rounded-lg transition hover:bg-muted/50 ${isMine ? "bg-brand-orange/5" : ""}`}
                  >
                    <div className="w-6 text-center font-display text-sm">{medal(i)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {r.display_name}
                        {isMine && <span className="text-[10px] text-brand-orange ml-2">you</span>}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        <span className="capitalize">{r.difficulty}</span>
                        {r.duration_seconds ? ` · ${Math.round(r.duration_seconds / 60)}m` : ""}
                      </div>
                    </div>
                    <div className="font-display text-xl tabular-nums">
                      {r.total_score}
                      <span className="text-[10px] text-muted-foreground"> / 100</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}