import { useNavigate } from "react-router-dom";
import { Card, CardContent, Badge } from "@/design-system/mj-design-system-db98fa";
import { ArrowRight, Lock, Pencil, Trash2, Trophy } from "lucide-react";
import type { RolePlay } from "@/lib/rolePlay";
import { resolveHeadshot, inferGender } from "@/lib/headshots";

export function cardTagline(rp: RolePlay) {
  const opener = rp.opening_line?.trim();
  if (opener) return opener;
  const t = (rp.persona as { tagline?: string } | undefined)?.tagline?.trim();
  if (t) return t;
  return `A ${rp.topic.toLowerCase()} call with a ${rp.persona?.title ?? "buyer"}.`;
}

type Props = {
  rp: RolePlay;
  owned?: boolean;
  starting?: boolean;
  onStart: (rp: RolePlay) => void;
  onDelete?: (rp: RolePlay) => void;
};

export default function RolePlayCard({ rp, owned, starting, onStart, onDelete }: Props) {
  const nav = useNavigate();
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => { if (!starting) onStart(rp); }}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !starting) { e.preventDefault(); onStart(rp); } }}
      className="relative rounded-2xl shadow-card hover:shadow-elevated transition flex flex-col cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/60"
    >
      <CardContent className="p-5 space-y-4 flex-1 flex flex-col">
        <div className="flex items-start gap-3">
          <img
            src={resolveHeadshot(rp.id, rp.persona?.headshot_url, inferGender(rp.persona), rp.persona?.headshot_index)}
            alt={rp.persona?.first_name ?? rp.name}
            width={48}
            height={48}
            loading="lazy"
            className="w-12 h-12 rounded-full object-cover shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">{rp.name}</div>
            <div className="text-xs text-muted-foreground truncate">{rp.persona?.title}{rp.persona?.company ? ` · ${rp.persona.company}` : ""}</div>
          </div>
          {owned && onDelete && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); nav(`/edit/${rp.id}`); }}
                className="text-muted-foreground hover:text-foreground p-1 -m-1"
                aria-label="Edit role-play"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(rp); }}
                className="text-muted-foreground hover:text-destructive p-1 -m-1"
                aria-label="Delete role-play"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge className="rounded-lg bg-brand-orange/10 text-brand-orange border border-brand-orange/20 hover:bg-brand-orange/10">{rp.topic}</Badge>
          <Badge variant="outline" className="rounded-lg">{rp.role}</Badge>
          {owned && (rp as RolePlay & { visibility?: string }).visibility === "private" && (
            <Badge variant="outline" className="rounded-full gap-1"><Lock className="h-3 w-3" />Private</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground flex-1 italic break-words">“{cardTagline(rp)}”</p>
        <div className="flex items-center justify-between text-sm font-medium">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); nav(`/leaderboard/${rp.slug}`); }}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition"
            aria-label="View leaderboard"
          >
            <Trophy className="h-3.5 w-3.5" /> Leaderboard
          </button>
          <span className="text-brand-orange inline-flex items-center">
            {starting ? "Opening…" : (<>Open role-play <ArrowRight className="h-4 w-4 ml-1" /></>)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}