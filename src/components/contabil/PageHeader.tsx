import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Home, type LucideIcon } from "lucide-react";
import { cn } from "@/design-system/mj-design-system-db98fa";

export type BreadcrumbItem = {
  label: string;
  to?: string;
};

type Accent = "orange" | "blue" | "purple" | "pink";

const accentText: Record<Accent, string> = {
  orange: "text-brand-orange",
  blue: "text-brand-blue",
  purple: "text-brand-purple",
  pink: "text-brand-pink",
};

const accentBg: Record<Accent, string> = {
  orange: "bg-brand-orange/12",
  blue: "bg-brand-blue/12",
  purple: "bg-brand-purple/12",
  pink: "bg-brand-pink/12",
};

/**
 * Cabeçalho padronizado de página.
 * Substitui a duplicação de breadcrumbs e cabeçalhos que existia nas páginas
 * (AreaPage, CategoryPage, ModulePage, hubs e páginas customizadas).
 */
export default function PageHeader({
  trail,
  icon: Icon,
  iconAccent = "orange",
  eyebrow,
  title,
  titleAccent,
  description,
  actions,
  badges,
  compact = false,
  className,
  children,
}: {
  /** Trilha de navegação EXCLUINDO "Início" (que é sempre o primeiro item). */
  trail?: BreadcrumbItem[];
  icon?: LucideIcon;
  iconAccent?: Accent;
  eyebrow?: string;
  title: string;
  /** Parte final do título a ser destacada com a cor de accent. */
  titleAccent?: string;
  description?: string;
  actions?: ReactNode;
  badges?: ReactNode;
  /** Compacto: usado em hubs e subpáginas (h1 menor). */
  compact?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Breadcrumb padronizado e clicável */}
      <nav
        aria-label="Trilha de navegação"
        className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
      >
        <Link
          to="/dashboard"
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:text-foreground hover:bg-accent/60 transition"
          aria-label="Ir para o início"
        >
          <Home className="h-3 w-3" />
          <span className="hidden sm:inline">Início</span>
        </Link>
        {trail?.map((t, i) => (
          <span key={`${t.label}-${i}`} className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
            {t.to ? (
              <Link
                to={t.to}
                className="rounded-md px-1.5 py-0.5 hover:text-foreground hover:bg-accent/60 transition"
              >
                {t.label}
              </Link>
            ) : (
              <span className="px-1.5 py-0.5">{t.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {Icon && (
            <div
              className={cn(
                "grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-border/80 shadow-sm",
                accentBg[iconAccent],
              )}
            >
              <Icon className={cn("h-6 w-6", accentText[iconAccent])} />
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {eyebrow}
              </div>
            )}
            <h1
              className={cn(
                "font-display tracking-tight mt-1",
                compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl",
              )}
            >
              {title}
              {titleAccent && (
                <>
                  {" "}
                  <span className={accentText[iconAccent]}>{titleAccent}</span>
                </>
              )}
            </h1>
            {description && (
              <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}
            {badges && <div className="mt-2.5 flex flex-wrap items-center gap-2">{badges}</div>}
            {children}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 md:justify-end md:pt-1">{actions}</div>
        )}
      </div>
    </div>
  );
}
