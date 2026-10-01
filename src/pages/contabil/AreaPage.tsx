import { Link, useParams } from "react-router-dom";
import { Badge, Card, CardContent } from "@/design-system/mj-design-system-db98fa";
import { findArea } from "@/lib/contabilNav";
import PageHeader from "@/components/contabil/PageHeader";

const accentText: Record<string, string> = {
  orange: "text-brand-orange",
  blue: "text-brand-blue",
  purple: "text-brand-purple",
  pink: "text-brand-pink",
};
const accentBg: Record<string, string> = {
  orange: "bg-brand-orange/12",
  blue: "bg-brand-blue/12",
  purple: "bg-brand-purple/12",
  pink: "bg-brand-pink/12",
};

export default function AreaPage() {
  const { area: areaSlug } = useParams();
  const area = findArea(areaSlug);

  if (!area) {
    return <div className="py-24 text-center text-muted-foreground">Área não encontrada.</div>;
  }

  const Icon = area.icon;
  const totalModulos = area.categories.reduce((n, c) => n + c.modules.length, 0);

  // Destaca a segunda palavra do título para manter o efeito visual anterior
  const words = area.title.split(" ");
  const titleFirst = words[0];
  const titleAccent = words.slice(1).join(" ");

  return (
    <div className="space-y-10">
      <PageHeader
        icon={Icon}
        iconAccent={area.accent as any}
        eyebrow={`${area.code} · ${area.eyebrow}`}
        title={titleFirst}
        titleAccent={titleAccent || undefined}
        description={area.blurb}
        badges={
          <>
            <Badge variant="outline" className="rounded-full">
              {area.categories.length} categorias
            </Badge>
            <Badge variant="outline" className="rounded-full">
              {totalModulos} módulos
            </Badge>
          </>
        }
      />

      {/* Categories */}
      <div className="space-y-10">
        {area.categories.map((cat) => (
          <section key={cat.slug} className="space-y-4">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {area.title}
                </div>
                <h2 className="font-display text-2xl mt-1">{cat.title}</h2>
              </div>
              <Link
                to={`/${area.slug}/${cat.slug}`}
                className="text-xs text-muted-foreground hover:text-foreground transition"
              >
                Ver categoria →
              </Link>
            </div>
            <div className="stagger grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {cat.modules.map((m) => {
                const MIcon = m.icon;
                return (
                  <Link key={m.slug} to={`/${area.slug}/${cat.slug}/${m.slug}`} className="group">
                    <Card className="lift h-full rounded-xl border-border/70">
                      <CardContent className="p-4 space-y-3">
                        <span
                          className={`grid h-9 w-9 place-items-center rounded-lg transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110 ${accentBg[area.accent]}`}
                        >
                          <MIcon className={`h-4 w-4 ${accentText[area.accent]}`} />
                        </span>
                        <div className="text-sm font-medium leading-snug">{m.title}</div>
                        <div className="text-[11px] text-muted-foreground line-clamp-2">
                          {m.desc}
                        </div>
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
