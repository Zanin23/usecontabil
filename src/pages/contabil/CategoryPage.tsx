import { Link, useParams } from "react-router-dom";
import { Badge, Card, CardContent } from "@/design-system/mj-design-system-db98fa";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { findCategory } from "@/lib/contabilNav";

const accentText: Record<string, string> = {
  orange: "text-brand-orange",
  blue: "text-brand-blue",
  purple: "text-brand-purple",
  pink: "text-brand-pink",
};

export default function CategoryPage() {
  const { area: areaSlug, categoria } = useParams();
  const { area, category } = findCategory(areaSlug, categoria);

  if (!area || !category) {
    return (
      <div className="py-24 text-center text-muted-foreground">Categoria não encontrada.</div>
    );
  }

  return (
    <div className="space-y-8">
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/dashboard" className="hover:text-foreground">Início</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to={`/${area.slug}`} className="hover:text-foreground">{area.title}</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{category.title}</span>
      </nav>

      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {area.title}
        </div>
        <h1 className="font-display text-4xl mt-2">
          {category.title}{" "}
          <span className={accentText[area.accent]}>·</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          {category.modules.length} módulos disponíveis nesta categoria.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {category.modules.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.slug}
              to={`/${area.slug}/${category.slug}/${m.slug}`}
              className="group"
            >
              <Card className="h-full rounded-2xl border-border/70 hover:border-foreground/30 hover:shadow-elevated transition">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-xl bg-accent grid place-items-center">
                      <Icon className={`h-5 w-5 ${accentText[area.accent]}`} />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                  </div>
                  <div>
                    <div className="font-medium">{m.title}</div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.desc}</p>
                  </div>
                  <Badge variant="outline" className="rounded-full text-[10px]">
                    {m.rows.length} registros
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
