import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Badge, Button } from "@/design-system/mj-design-system-db98fa";
import {
  LayoutDashboard, Search, Command, Building2, CalendarRange, Bell,
  Settings2, Users2, Wallet, ChevronRight, PanelLeftClose, PanelLeftOpen, ArrowLeft, Menu, X, LogOut,
  SlidersHorizontal,
} from "lucide-react";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { AREAS } from "@/lib/contabilNav";
import { useTema } from "@/lib/tema";
import { supabase } from "@/integrations/supabase/client";
import { limparCacheEmpresas } from "@/lib/empresasStore";
import { COMPETENCIAS, formatCompetencia, useCompetencia } from "@/lib/competencia";
import BuscaTelas from "@/components/contabil/BuscaTelas";
import ConfiguracoesConta from "@/components/contabil/ConfiguracoesConta";
import { AMBIENTES, usePreferencias } from "@/lib/preferencias";

const AREA_ICON = { preparativos: Settings2, financeiro: Wallet } as const;

export default function ContabilShell() {
  const { competencia, setCompetencia } = useCompetencia();
  const { empresas, empresaId, setEmpresaId } = useEmpresaAtual();
  useTema();
  const { prefs } = usePreferencias();
  const [configAberta, setConfigAberta] = useState(false);




  const [usuarioNome, setUsuarioNome] = useState("—");
  const [usuarioPerfil, setUsuarioPerfil] = useState("Usuário");

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!ativo || !user) return;

      const [{ data: perfil }, { data: papeis }] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      if (!ativo) return;

      const nome =
        perfil?.display_name?.trim() ||
        (user.user_metadata?.full_name as string | undefined)?.trim() ||
        user.email?.split("@")[0] ||
        "Usuário";
      setUsuarioNome(nome);
      setUsuarioPerfil(papeis?.some((p) => p.role === "admin") ? "Administrador" : "Usuário");
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const sair = async () => {
    await supabase.auth.signOut();
    limparCacheEmpresas();
    window.location.href = "/auth";
  };

  const [buscaAberta, setBuscaAberta] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [recolhida, setRecolhida] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("uc:sidebar") === "recolhida",
  );
  useEffect(() => {
    localStorage.setItem("uc:sidebar", recolhida ? "recolhida" : "expandida");
  }, [recolhida]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setBuscaAberta((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => setMenuAberto(false), [pathname]);
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
      <aside
        className={`fixed inset-y-0 left-0 z-50 border-r border-border bg-card lg:bg-card/60 backdrop-blur flex flex-col transition-[width,transform] duration-200 ${
          recolhida ? "lg:w-16" : "lg:w-64"
        } w-64 ${menuAberto ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-brand z-10" />
        <div className={`h-14 flex items-center border-b border-border ${recolhida ? "px-3" : "px-5"}`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 shrink-0 rounded-lg bg-brand-orange grid place-items-center shadow-glow">
              <span className="text-primary-foreground font-display text-lg leading-none">U</span>
            </div>
            {!recolhida && (
              <div className="min-w-0 leading-tight">
                <div className="font-display text-base leading-none truncate">
                  Use <span className="text-brand-orange">Contábil</span>
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">
                  v2.4 · corporate
                </div>
              </div>
            )}
          </div>
        </div>


        <nav className={`flex-1 overflow-y-auto py-4 space-y-4 ${recolhida ? "px-2" : "px-3"}`}>
          {/* Dashboard */}
          <NavLink
            to="/dashboard"
            title="Dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg py-2 text-sm border transition ${
                recolhida ? "justify-center px-0" : "px-3"
              } ${
                isActive
                  ? "bg-brand-orange/15 text-foreground border-brand-orange/30"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground border-transparent"
              }`
            }
          >
            {!recolhida && (
              <span className="text-[10px] font-mono text-muted-foreground/70 w-5">01</span>
            )}
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            {!recolhida && <span>Dashboard</span>}
          </NavLink>

          {/* Areas */}
          {AREAS.map((area) => {
            const Icon = area.icon ?? AREA_ICON[area.slug as keyof typeof AREA_ICON] ?? Settings2;
            const isOpen = !recolhida && openArea === area.slug;
            const isActive = currentArea?.slug === area.slug;
            return (
              <div key={area.slug} className="space-y-1">
                <button
                  type="button"
                  title={area.title}
                  onClick={() => {
                    if (recolhida) {
                      setRecolhida(false);
                      setOpenArea(area.slug);
                      return;
                    }
                    setOpenArea(isOpen ? null : area.slug);
                  }}
                  className={`w-full flex items-center gap-3 rounded-lg py-2 text-sm border transition text-left ${
                    recolhida ? "justify-center px-0" : "px-3"
                  } ${
                    isActive
                      ? "bg-brand-orange/15 text-foreground border-brand-orange/30"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground border-transparent"
                  }`}
                >
                  {!recolhida && (
                    <span className="text-[10px] font-mono text-muted-foreground/70 w-5">
                      {area.code}
                    </span>
                  )}
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-brand-orange" : ""}`} />
                  {!recolhida && (
                    <>
                      <span className="flex-1">{area.title}</span>
                      <ChevronRight
                        className={`h-3 w-3 transition ${isOpen ? "rotate-90 text-brand-orange" : "text-muted-foreground/60"}`}
                      />
                    </>
                  )}
                </button>

                {isOpen && (
                  <div className="pl-8 space-y-0.5 border-l border-brand-orange/30 ml-4">
                    <NavLink
                      to={`/${area.slug}`}
                      end
                      className={({ isActive: linkActive }) =>
                        `block rounded-md px-3 py-1.5 text-xs transition ${
                          linkActive
                            ? "text-foreground bg-brand-orange/10 border-l-2 border-brand-orange -ml-px"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
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
                              ? "text-foreground bg-brand-orange/10 border-l-2 border-brand-orange -ml-px"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent"
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

        <div className={`py-4 border-t border-border space-y-2 text-xs ${recolhida ? "px-2" : "px-4"}`}>
          <button
            type="button"
            onClick={() => setRecolhida((v) => !v)}
            title={recolhida ? "Expandir menu" : "Recolher menu"}
            className={`w-full hidden lg:flex items-center gap-2 rounded-lg border border-border py-2 text-muted-foreground hover:text-foreground hover:bg-accent transition ${
              recolhida ? "justify-center px-0" : "px-3"
            }`}
          >
            {recolhida ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span>Recolher menu</span>
              </>
            )}
          </button>

          {!recolhida && (
            <>
              <div className="flex items-center justify-between gap-2 text-muted-foreground">
                <span className="shrink-0">Ambiente</span>
                <button
                  type="button"
                  onClick={() => setConfigAberta(true)}
                  title="Alterar ambiente nas configurações"
                >
                  <Badge variant="outline" className="rounded-md h-5 text-[10px] border-brand-orange/40 text-brand-orange">
                    {(AMBIENTES.find((a) => a.id === prefs.ambiente)?.nome ?? "Ambiente").toUpperCase()}
                  </Badge>
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 text-muted-foreground">
                <span className="shrink-0">Usuário</span>
                <span className="text-foreground font-medium truncate max-w-[60%]" title={usuarioNome}>
                  {usuarioNome}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-muted-foreground">
                <span className="shrink-0">Perfil</span>
                <span className="text-foreground truncate max-w-[60%]" title={usuarioPerfil}>
                  {usuarioPerfil}
                </span>
              </div>
            </>
          )}

        </div>
      </aside>

      {/* Main */}
      {menuAberto && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
          onClick={() => setMenuAberto(false)}
          aria-hidden
        />
      )}

      <div className={`transition-[padding] duration-200 pl-0 ${recolhida ? "lg:pl-16" : "lg:pl-64"}`}>

        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
          <div className="px-4 lg:px-8 h-14 flex items-center gap-2 lg:gap-4">
            <Button
              variant="outline"
              size="sm"
              className="rounded-md h-9 w-9 p-0 shrink-0 lg:hidden"
              aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
              onClick={() => setMenuAberto((v) => !v)}
            >
              {menuAberto ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-md h-9 w-9 p-0 shrink-0"
              aria-label="Voltar para a tela anterior"
              title="Voltar"
              disabled={pathname === "/"}
              onClick={() => {
                const parts = pathname.split("/").filter(Boolean);
                if (parts.length > 1) navigate("/" + parts.slice(0, -1).join("/"));
                else if (parts.length === 1) navigate("/");
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground min-w-0">

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

            <div className="hidden xl:flex items-center gap-2 rounded-md border border-border bg-card px-3 h-9 text-sm min-w-[280px]">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              {empresas.length === 0 ? (
                <NavLink
                  to="/preparativos/cadastros/empresas/novo"
                  className="flex-1 text-muted-foreground hover:text-foreground transition truncate"
                >
                  Nenhuma empresa — cadastrar
                </NavLink>
              ) : (
                <select
                  value={empresaId ?? ""}
                  onChange={(e) => setEmpresaId(e.target.value)}
                  className="bg-transparent outline-none flex-1 text-foreground"
                >
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id} className="bg-card">
                      {e.razao}
                    </option>
                  ))}
                </select>
              )}
            </div>


            <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2 lg:px-3 h-9 text-sm shrink-0">
              <CalendarRange className="h-4 w-4 text-muted-foreground" />
              <select
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                className="bg-transparent outline-none text-foreground"
              >
                {COMPETENCIAS.map((c) => (
                  <option key={c} value={c} className="bg-card">
                    {formatCompetencia(c)}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setBuscaAberta(true)}
              className="hidden lg:flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-card text-sm text-muted-foreground hover:text-foreground transition">
              <Search className="h-4 w-4" />
              <span>Buscar…</span>
              <kbd className="ml-2 inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-mono">
                <Command className="h-3 w-3" />K
              </kbd>
            </button>





            <Button
              variant="outline"
              size="sm"
              className="rounded-md h-9"
              onClick={() => setConfigAberta(true)}
              aria-label="Configurações da conta"
              title="Configurações da conta"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>

            <NotificacoesPainel />


            <Button
              variant="outline"
              size="sm"
              className="rounded-md h-9"
              onClick={sair}
              aria-label="Sair da conta"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>

          </div>
        </header>

        <main className="px-4 lg:px-8 py-6 lg:py-8">
          <Outlet />
        </main>
      </div>

      <BuscaTelas open={buscaAberta} onOpenChange={setBuscaAberta} />
      <ConfiguracoesConta
        open={configAberta}
        onOpenChange={setConfigAberta}
        usuario={usuarioNome}
        perfil={usuarioPerfil}
      />
    </div>
  );
}
