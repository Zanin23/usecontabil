import { Link, useParams } from "react-router-dom";
import { Card, CardContent } from "@/design-system/mj-design-system-db98fa";
import { ArrowUpRight } from "lucide-react";
import { findCategory } from "@/lib/contabilNav";
import PageHeader from "@/components/contabil/PageHeader";
import NotFound from "@/pages/NotFound";

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

export default function CategoryPage() {
  const { area: areaSlug, categoria } = useParams();
  const { area, category } = findCategory(areaSlug, categoria);

  // Categoria inexistente também é rota inexistente: mostra a 404 do sistema.
  if (!area || !category) return <NotFound />;

  return (
    <div className="space-y-8">
      <PageHeader
        trail={[{ label: area.title, to: `/${area.slug}` }]}
        eyebrow={area.title}
        title={category.title}
        description={`${category.modules.length} módulos disponíveis nesta categoria.`}
      />

      <div className="stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {category.modules.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.slug}
              to={`/${area.slug}/${category.slug}/${m.slug}`}
              className="group"
            >
              <Card className="lift h-full rounded-xl border-border/70">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className={`h-10 w-10 rounded-xl grid place-items-center transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110 ${accentBg[area.accent]}`}>
                      <Icon className={`h-5 w-5 ${accentText[area.accent]}`} />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-1 translate-y-1 transition-all duration-200 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:text-primary group-hover:opacity-100" />
                  </div>
                  <div>
                    <div className="font-medium">{m.title}</div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
