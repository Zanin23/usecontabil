import { ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/design-system/mj-design-system-db98fa";
import { useIsAdmin } from "@/lib/adminRole";
import { ArrowLeft, BarChart3, Sparkles, BookOpen, ShieldCheck, Settings } from "lucide-react";

type NavItem = { to: string; label: string; icon: ReactNode };
type NavGroup = { label: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    label: "Role-plays",
    items: [
      { to: "/admin/role-plays/reporting", label: "Reporting", icon: <BarChart3 className="h-4 w-4" /> },
      { to: "/admin/role-plays/manage", label: "Create & manage", icon: <Sparkles className="h-4 w-4" /> },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/admin/settings", label: "Workspace settings", icon: <Settings className="h-4 w-4" /> },
      { to: "/admin/knowledge", label: "Knowledge", icon: <BookOpen className="h-4 w-4" /> },
      { to: "/admin/admins", label: "Admins", icon: <ShieldCheck className="h-4 w-4" /> },
    ],
  },
];

function NavLinkItem({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-lg px-3.5 py-2 text-sm transition ${
          isActive
            ? "bg-brand-orange text-primary-foreground"
            : "text-foreground/75 hover:bg-card hover:text-foreground"
        }`
      }
    >
      <span className="opacity-90">{item.icon}</span>
      {item.label}
    </NavLink>
  );
}

export default function AdminShell() {
  const { isAdmin, loading, user } = useIsAdmin();
  const { pathname } = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-aurora flex items-center justify-center text-sm text-muted-foreground">
        Loading admin…
      </div>
    );
  }
  if (!user) {
    return (
      <div className="min-h-screen bg-aurora flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-display text-2xl">Sign in required</h1>
          <p className="text-muted-foreground text-sm">Admin tools require an authenticated session.</p>
          <Link to="/auth"><Button className="rounded-lg bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground">Sign in</Button></Link>
        </div>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-aurora flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-display text-2xl">Admins only</h1>
          <p className="text-muted-foreground text-sm">You don't have access to this area.</p>
          <Link to="/"><Button variant="outline" className="rounded-lg">Back to app</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-aurora">
      <header className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/"><Button variant="ghost" size="sm" className="rounded-lg"><ArrowLeft className="h-4 w-4 mr-1" />App</Button></Link>
          <h1 className="font-display text-2xl sm:text-3xl">Admin <span className="text-brand-orange">console</span></h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 pb-16 grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-5 lg:sticky lg:top-4 self-start">
          {GROUPS.map((g) => (
            <div key={g.label} className="space-y-1.5">
              <div className="px-3.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
                {g.label}
              </div>
              <nav className="flex flex-col gap-1">
                {g.items.map((item) => <NavLinkItem key={item.to} item={item} />)}
              </nav>
            </div>
          ))}
        </aside>

        <main key={pathname} className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
