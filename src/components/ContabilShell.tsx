import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Badge, Button } from "@/design-system/mj-design-system-db98fa";
import {
  LayoutDashboard,
  BookOpenCheck,
  Users2,
  Radio,
  FileBarChart2,
  Cable,
  Search,
  Command,
  Building2,
  CalendarRange,
  Bell,
} from "lucide-react";
import { EMPRESAS } from "@/lib/contabilMock";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, code: "01" },
  { to: "/lancamentos", label: "Central Contábil", icon: BookOpenCheck, code: "02" },
  { to: "/folha", label: "Módulo Pessoal", icon: Users2, code: "03" },
  { to: "/esocial", label: "Central eSocial", icon: Radio, code: "04" },
  { to: "/demonstracoes", label: "Demonstrações", icon: FileBarChart2, code: "05" },
  { to: "/integracao", label: "Integração ERP", icon: Cable, code: "06" },
];

export default function ContabilShell() {
  const { pathname } = useLocation();
  const active = NAV.find((n) => pathname.startsWith(n.to)) ?? NAV[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-60 border-r border-border bg-card/60 backdrop-blur flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-orange grid place-items-center">
              <span className="text-primary-foreground font-display text-lg leading-none">U</span>
            </div>
            <div>
              <div className="font-display text-lg leading-none">Use <span className="text-brand-orange">Contábil</span></div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">v2.4 · corporate</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-brand-orange/15 text-foreground border border-brand-orange/30"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground border border-transparent"
                }`
              }
            >
              <span className="text-[10px] font-mono text-muted-foreground/70 w-5">{item.code}</span>
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-border space-y-2 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Ambiente</span>
            <Badge variant="outline" className="rounded-md h-5 text-[10px] border-warn/40 text-warn">HOMOLOGAÇÃO</Badge>
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
      <div className="pl-60">
        {/* Global header with empresa/competencia selector */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
          <div className="px-8 h-14 flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{active.code}</span>
              <span>/</span>
              <span className="text-foreground">{active.label}</span>
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
