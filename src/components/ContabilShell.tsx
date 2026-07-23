import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Badge, Button } from "@/design-system/mj-design-system-db98fa";
import {
  LayoutDashboard, Search, Command, Building2, CalendarRange, Bell,
  Settings2, Users2, Wallet, ChevronRight,
} from "lucide-react";
import { EMPRESAS } from "@/lib/contabilMock";
import { AREAS } from "@/lib/contabilNav";

const accentText: Record<string, string> = {
  orange: "text-brand-orange",
  blue: "text-brand-blue",
  purple: "text-brand-purple",
  pink: "text-brand-pink",
};
const accentBorder: Record<string, string> = {
  orange: "border-brand-orange/30 bg-brand-orange/10",
  blue: "border-brand-blue/30 bg-brand-blue/10",
  purple: "border-brand-purple/30 bg-brand-purple/10",
  pink: "border-brand-pink/30 bg-brand-pink/10",
};

const AREA_ICON = { preparativos: Settings2, pessoal: Users2, financeiro: Wallet } as const;

export default function ContabilShell() {
  const { pathname } = useLocation();
  const seg = pathname.split("/").filter(Boolean);
  const currentAreaSlug = seg[0];
  const currentArea = AREAS.find((a) => a.slug === currentAreaSlug);
  const currentCategorySlug = seg[1];
  const currentCategory = currentArea?.categories.find((c) => c.slug === currentCategorySlug);
  const currentModuleSlug = seg[2];
  const currentModule = currentCategory?.modules.find((m) => m.slug === currentModuleSlug);

  const [openArea, setOpenArea] = useState<string | null>(currentArea?.slug ?? null);
  useEffect(() => {
    if (currentArea?.slug) setOpenArea(currentArea.slug);
  }, [currentArea?.slug]);

  const breadcrumbHeader = (() => {
    if (pathname.startsWith("/dashboard") || pathname === "/") {
      return { code: "01", label: "Dashboard" };
    }
    if (currentArea) {
      return { code: currentArea.code, label: currentArea.title };
    }
    return { code: "—", label: "Use Contábil" };
  })();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-border bg-card/60 backdrop-blur flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-orange grid place-items-center">
              <span className="text-primary-foreground font-display text-lg leading-none">U</span>
            </div>
            <div>
              <div className="font-display text-lg leading-none">
                Use <span className="text-brand-orange">Contábil</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">
                v2.4 · corporate
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {/* Dashboard */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm border transition ${
                isActive
                  ? "bg-brand-orange/15 text-foreground border-brand-orange/30"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground border-transparent"
              }`
            }
          >
            <span className="text-[10px] font-mono text-muted-foreground/70 w-5">01</span>
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </NavLink>

          {/* Areas */}
          {AREAS.map((area) => {
            const Icon = AREA_ICON[area.slug as keyof typeof AREA_ICON];
            const isOpen = openArea === area.slug;
            const isActive = currentArea?.slug === area.slug;
            return (
              <div key={area.slug} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setOpenArea(isOpen ? null : area.slug)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm border transition text-left ${
                    isActive
                      ? `${accentBorder[area.accent]} text-foreground`
                      : "text-muted-foreground hover:bg-accent hover:text-foreground border-transparent"
                  }`}
                >
                  <span className="text-[10px] font-mono text-muted-foreground/70 w-5">
                    {area.code}
                  </span>
                  <Icon className={`h-4 w-4 ${isActive ? accentText[area.accent] : ""}`} />
                  <span className="flex-1">{area.title}</span>
                  <ChevronRight
                    className={`h-3 w-3 transition ${isOpen ? "rotate-90 text-foreground" : "text-muted-foreground/60"}`}
                  />
                </button>

                {isOpen && (
                  <div className="pl-8 space-y-0.5 border-l border-border/60 ml-4">
                    <NavLink
                      to={`/${area.slug}`}
                      end
                      className={({ isActive: linkActive }) =>
                        `block rounded-md px-3 py-1.5 text-xs transition ${
                          linkActive
                            ? "text-foreground bg-accent"
                            : "text-muted-foreground hover:text-foreground"
                        }`
                      }
                    >
                      Visão geral
                    </NavLink>
                    {area.categories.map((cat) => (
                      <NavLink
                        key={cat.slug}
                        to={`/${area.slug}/${cat.slug}`}
                        className={({ isActive }) =>
                          `block rounded-md px-3 py-1.5 text-xs transition ${
                            isActive || currentCategory?.slug === cat.slug
                              ? "text-foreground bg-accent"
                              : "text-muted-foreground hover:text-foreground"
                          }`
                        }
                      >
                        {cat.title}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-border space-y-2 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Ambiente</span>
            <Badge variant="outline" className="rounded-md h-5 text-[10px] border-warn/40 text-warn">
              HOMOLOGAÇÃO
            </Badge>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Usuário</span>
            <span className="text-foreground font-medium">M. Andrade</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Perfil</span>
            <span className="text-foreground">Controller</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="pl-64">
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
          <div className="px-8 h-14 flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
              <span className="font-mono">{breadcrumbHeader.code}</span>
              <span>/</span>
              <span className="text-foreground truncate">{breadcrumbHeader.label}</span>
              {currentCategory && (
                <>
                  <span>/</span>
                  <span className="truncate">{currentCategory.title}</span>
                </>
              )}
              {currentModule && (
                <>
                  <span>/</span>
                  <span className="text-foreground truncate">{currentModule.title}</span>
                </>
              )}
            </div>

            <div className="flex-1" />

            <div className="hidden md:flex items-center gap-2 rounded-md border border-border bg-card px-3 h-9 text-sm min-w-[280px]">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <select className="bg-transparent outline-none flex-1 text-foreground">
                {EMPRESAS.map((e) => (
                  <option key={e.id} value={e.id} className="bg-card">
                    {e.razao}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 h-9 text-sm">
              <CalendarRange className="h-4 w-4 text-muted-foreground" />
              <select className="bg-transparent outline-none text-foreground">
                <option className="bg-card">Out/2024</option>
                <option className="bg-card">Set/2024</option>
                <option className="bg-card">Ago/2024</option>
              </select>
            </div>

            <button className="hidden md:flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-card text-sm text-muted-foreground hover:text-foreground transition">
              <Search className="h-4 w-4" />
              <span>Buscar…</span>
              <kbd className="ml-2 inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-mono">
                <Command className="h-3 w-3" />K
              </kbd>
            </button>

            <Button variant="outline" size="sm" className="rounded-md h-9 relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
            </Button>
          </div>
        </header>

        <main className="px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
