import { Link, useParams } from "react-router-dom";
import { Badge, Card, CardContent } from "@/design-system/mj-design-system-db98fa";
import { ChevronRight } from "lucide-react";
import { findArea } from "@/lib/contabilNav";

const accentText: Record<string, string> = {
  orange: "text-brand-orange",
  blue: "text-brand-blue",
  purple: "text-brand-purple",
  pink: "text-brand-pink",
};
const accentBg: Record<string, string> = {
  orange: "bg-brand-orange/15",
  blue: "bg-brand-blue/15",
  purple: "bg-brand-purple/15",
  pink: "bg-brand-pink/15",
};

export default function AreaPage() {
  const { area: areaSlug } = useParams();
  const area = findArea(areaSlug);

  if (!area) {
    return <div className="py-24 text-center text-muted-foreground">Área não encontrada.</div>;
  }

  const Icon = area.icon;
  const totalModulos = area.categories.reduce((n, c) => n + c.modules.length, 0);

  return (
    <div className="space-y-10">
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/dashboard" className="hover:text-foreground">Início</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{area.title}</span>
      </nav>

      {/* Hero */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="flex items-start gap-5">
          <div className={`h-14 w-14 rounded-2xl grid place-items-center shadow-card animate-float ${accentBg[area.accent]}`}>
            <Icon className={`h-7 w-7 ${accentText[area.accent]}`} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {area.code} · {area.eyebrow}
            </div>
            <h1 className="font-display text-5xl mt-2">
              {area.title.split(" ")[0]}{" "}
              <span className={accentText[area.accent]}>{area.title.split(" ").slice(1).join(" ") || "."}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{area.blurb}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="rounded-full">{area.categories.length} categorias</Badge>
          <Badge variant="outline" className="rounded-full">{totalModulos} módulos</Badge>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-10">
        {area.categories.map((cat) => (
          <section key={cat.slug} className="space-y-4">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {area.title}
                </div>
                <h2 className="font-display text-2xl mt-1">{cat.title}</h2>
              </div>
              <Link
                to={`/${area.slug}/${cat.slug}`}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Ver categoria →
              </Link>
            </div>
            <div className="stagger grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {cat.modules.map((m) => {
                const MIcon = m.icon;
                return (
                  <Link key={m.slug} to={`/${area.slug}/${cat.slug}/${m.slug}`} className="group">
                    <Card className="lift h-full rounded-xl border-border/70">
                      <CardContent className="p-4 space-y-3">
                        <span className={`grid h-8 w-8 place-items-center rounded-lg transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110 ${accentBg[area.accent]}`}>
                          <MIcon className={`h-4 w-4 ${accentText[area.accent]}`} />
                        </span>
                        <div className="text-sm font-medium leading-snug">{m.title}</div>
                        <div className="text-[11px] text-muted-foreground line-clamp-2">{m.desc}</div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
