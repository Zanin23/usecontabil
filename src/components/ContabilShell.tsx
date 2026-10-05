import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Badge, Button, cn } from "@/design-system/mj-design-system-db98fa";
import {
  LayoutDashboard, Search, Command, Building2, CalendarRange,
  Settings2, ChevronRight, PanelLeftClose, PanelLeftOpen, ArrowLeft, Menu, X, LogOut, MonitorPlay,
  SlidersHorizontal, FlaskConical, ListTree,
} from "lucide-react";
import NotificacoesPainel from "@/components/contabil/NotificacoesPainel";
import AjudaTela from "@/components/contabil/AjudaTela";
import { usePratica, setPraticaAtiva } from "@/lib/praticaStore";


import { useEmpresaAtual } from "@/lib/empresaAtual";
import { AREAS } from "@/lib/contabilNav";
import { SECOES, secaoDaRota, trilhaDaRota } from "@/lib/ux/navModelo";
import { useTema } from "@/lib/tema";
import { supabase } from "@/integrations/supabase/client";
import { limparCacheEmpresas } from "@/lib/empresasStore";
import { iniciarSincronizacaoNuvem } from "@/lib/nuvemColecoes";
import { COMPETENCIAS, formatCompetencia, useCompetencia } from "@/lib/competencia";
import BuscaTelas from "@/components/contabil/BuscaTelas";
import ConfiguracoesConta from "@/components/contabil/ConfiguracoesConta";
import { AMBIENTES, usePreferencias } from "@/lib/preferencias";
import ApresentacaoSistema from "@/components/contabil/ApresentacaoSistema";

/**
 * Menu lateral (área azul-noite): item com fundo em degradê e barra indicadora animada quando ativo.
 * O <aside> recebe a classe `dark`, então os tokens semânticos (text-foreground etc.) valem para o escuro.
 */
const navItem = (ativo: boolean, recolhida: boolean) =>
  cn(
    "group/nav relative flex w-full items-center gap-3 rounded-xl py-2 text-left text-sm transition-all duration-200",
    recolhida ? "justify-center px-0" : "px-3",
    ativo
      ? "bg-gradient-to-r from-primary/40 via-primary/20 to-transparent text-foreground shadow-[inset_0_0_0_1px_hsl(0_0%_100%/0.07)] before:absolute before:left-0 before:top-1/2 before:h-6 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-gradient-brand before:origin-center before:animate-[bar-in_0.35s_ease-out]"
      : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
  );

/** "Pastilha" do ícone do menu: degradê quando ativo, cresce de leve no hover. */
const navIcone = (ativo: boolean) =>
  cn(
    "grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-all duration-200",
    ativo
      ? "bg-gradient-brand text-white shadow-[0_4px_12px_-2px_hsl(250_80%_60%/0.6)]"
      : "bg-white/[0.06] text-muted-foreground group-hover/nav:scale-110 group-hover/nav:bg-white/10 group-hover/nav:text-foreground",
  );


export default function ContabilShell() {
  const { competencia, setCompetencia, competenciaFim, setCompetenciaFim, isPeriodo } = useCompetencia();
  const { empresas, empresaId, setEmpresaId } = useEmpresaAtual();
  useTema();
  const { prefs } = usePreferencias();
  const [configAberta, setConfigAberta] = useState(false);
  const { praticaAtiva: emPratica } = usePratica();
  const [apresentacaoAberta, setApresentacaoAberta] = useState(false);

  // IMPORTANTE: não existe reset automático da base ao abrir o sistema.
  // Zerar/isolar dados só acontece por ação explícita do usuário (ver lib/resetBase.ts).

  // Cadastros próprios e lançamentos contábeis: gravam no navegador e sincronizam com a nuvem.
  useEffect(() => iniciarSincronizacaoNuvem(), []);

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

  // Menu por processo: abre a seção correspondente à rota atual.
  const secaoAtiva = secaoDaRota(pathname);
  const itemAtivo = trilhaDaRota(pathname);
  const [openArea, setOpenArea] = useState<string | null>(secaoAtiva?.id ?? null);
  useEffect(() => {
    if (secaoAtiva?.id) setOpenArea(secaoAtiva.id);
  }, [secaoAtiva?.id]);

  return (
    <div className="min-h-screen bg-app text-foreground">
      {/* Sidebar */}
      <aside
        className={`dark bg-sidebar text-foreground fixed inset-y-0 left-0 z-50 border-r border-white/5 shadow-[4px_0_24px_-12px_hsl(245_60%_20%/0.5)] flex flex-col transition-[width,transform] duration-300 ease-in-out ${
          recolhida ? "lg:w-20" : "lg:w-64"
        } w-[280px] sm:w-64 ${menuAberto ? "translate-x-0 shadow-2xl" : "-translate-x-full"} lg:translate-x-0 ${
          emPratica ? "ring-2 ring-inset ring-warn/60" : ""
        }`}
      >
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-animated z-10" />
        <div className={`h-14 flex items-center border-b border-border ${recolhida ? "px-3" : "px-5"}`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-9 w-9 shrink-0 rounded-xl bg-gradient-brand grid place-items-center shadow-glow ring-1 ring-white/20 transition-transform duration-300 hover:rotate-6 hover:scale-105">
              <span className="text-white font-display text-lg leading-none">U</span>
            </div>
            {!recolhida && (
              <div className="min-w-0 leading-tight">
                <div className="font-display text-base leading-none truncate">
                  Use{" "}
                  <span className="bg-gradient-to-r from-[hsl(205_100%_78%)] via-[hsl(250_100%_82%)] to-[hsl(300_90%_80%)] bg-clip-text text-transparent">
                    Contábil
                  </span>
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">
                  v2.4 · corporate
                </div>
              </div>
            )}
          </div>
        </div>


        <nav className={`flex-1 overflow-y-auto py-4 space-y-1 ${recolhida ? "px-2" : "px-3"}`}>
          {SECOES.map((secao) => {
            const Icon = secao.icon;
            const isOpen = !recolhida && openArea === secao.id;
            const isActive = secaoAtiva?.id === secao.id;
            const itens = secao.subgrupos.flatMap((s) => s.itens);
            return (
              <div key={secao.id} className="space-y-0.5">
                <button
                  type="button"
                  title={secao.titulo}
                  onClick={() => {
                    if (recolhida) {
                      setRecolhida(false);
                      setOpenArea(secao.id);
                      return;
                    }
                    setOpenArea(isOpen ? null : secao.id);
                  }}
                  className={navItem(isActive, recolhida)}
                >
                  {!recolhida && (
                    <span className="text-[10px] font-mono text-muted-foreground/60 w-5">
                      {secao.codigo}
                    </span>
                  )}
                  <span className={navIcone(isActive)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  {!recolhida && (
                    <>
                      <span className={cn("flex-1", isActive && "font-medium")}>{secao.titulo}</span>
                      <ChevronRight
                        className={`h-3 w-3 transition-transform duration-200 ${isOpen ? "rotate-90 text-foreground" : "text-muted-foreground/60"}`}
                      />
                    </>
                  )}
                </button>

                {isOpen && (
                  <div className="ml-4 space-y-2 border-l border-white/10 pl-2 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    {!recolhida && (
                      <p className="px-3 pb-1 text-[10px] leading-snug text-muted-foreground/70">
                        {secao.resumo}
                      </p>
                    )}
                    {secao.subgrupos.map((sub, i) => (
                      <div key={sub.titulo ?? i} className="space-y-0.5">
                        {sub.titulo && (
                          <div className="px-3 pt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60">
                            {sub.titulo}
                          </div>
                        )}
                        {sub.itens.map((item) => (
                          <NavLink
                            key={item.rota + item.titulo}
                            to={item.rota}
                            title={item.desc ?? item.titulo}
                            className={({ isActive: linkAtivo }) =>
                              `flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-all duration-150 ${
                                linkAtivo
                                  ? "border-l-2 border-primary bg-primary/25 font-medium text-foreground -ml-px"
                                  : "text-muted-foreground hover:translate-x-0.5 hover:bg-white/[0.06] hover:text-foreground"
                              }`
                            }
                          >
                            <item.icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                            <span className="truncate">{item.titulo}</span>
                          </NavLink>
                        ))}
                      </div>
                    ))}
                    {/* Mantém o acesso à visão antiga por área, sem esconder nada. */}
                    {secao.id === "relatorios" && (
                      <div className="pt-2">
                        <NavLink
                          to="/preparativos"
                          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-[11px] text-muted-foreground/70 hover:text-foreground"
                          title="Índice completo de módulos por área"
                        >
                          <ListTree className="h-3.5 w-3.5" />
                          Índice por área (visão clássica)
                        </NavLink>
                      </div>
                    )}
                    {itens.length === 0 && (
                      <p className="px-3 py-1 text-[11px] text-muted-foreground/70">
                        Nenhum item nesta seção.
                      </p>
                    )}
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

          <div className="pt-2">
            {recolhida ? (
              <button
                type="button"
                onClick={() => setApresentacaoAberta(true)}
                title="Ver apresentação do sistema"
                className="w-full flex items-center justify-center h-10 rounded-lg text-brand-orange hover:bg-brand-orange/10 transition"
              >
                <MonitorPlay className="h-5 w-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setApresentacaoAberta(true)}
                className="btn-sheen bg-gradient-brand w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white shadow-[var(--shadow-btn)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-btn-hover)] active:scale-[0.98] transition-all duration-200 group"
              >
                <MonitorPlay className="h-4 w-4 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="font-medium text-sm">Apresentação</span>
              </button>
            )}
          </div>

          {!recolhida && (
            <div className="space-y-2.5 pt-2">
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
            </div>
          )}
        </div>

      </aside>

      {/* Main */}
      {menuAberto && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm animate-in fade-in duration-200 lg:hidden"
          onClick={() => setMenuAberto(false)}
          aria-hidden
        />
      )}

      <div className={`transition-[padding] duration-300 ease-in-out pl-0 ${recolhida ? "lg:pl-20" : "lg:pl-64"}`}>

        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/70 backdrop-blur-xl safe-top">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div className="px-4 lg:px-8 h-16 lg:h-14 flex items-center gap-2 lg:gap-4 max-lg:overflow-x-auto max-lg:[scrollbar-width:none]">
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg h-9 w-9 p-0 shrink-0 lg:hidden"
              aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
              onClick={() => setMenuAberto((v) => !v)}
            >
              {menuAberto ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg h-9 w-9 p-0 shrink-0"
              aria-label="Voltar para a página anterior"
              title="Voltar"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 text-sm font-medium min-w-0 truncate">
              {secaoAtiva ? (
                <>
                  <span className="text-brand-orange shrink-0">{secaoAtiva.codigo}</span>
                  <span className="text-muted-foreground shrink-0">·</span>
                  <span className="truncate">{secaoAtiva.titulo}</span>
                  {itemAtivo && itemAtivo.item.titulo !== secaoAtiva.titulo && (
                    <>
                      <span className="text-muted-foreground shrink-0">/</span>
                      <span className="text-muted-foreground truncate">{itemAtivo.item.titulo}</span>
                    </>
                  )}
                </>
              ) : currentArea ? (
                <>
                  <span className="text-brand-orange shrink-0">{currentArea.code}</span>
                  <span className="text-muted-foreground shrink-0">·</span>
                  <span className="truncate">{currentArea.title}</span>
                </>
              ) : (
                <span className="text-foreground">Use Contábil</span>
              )}
            </div>

            <div className="flex-1" />

            <div className="hidden xl:flex items-center gap-2 rounded-lg border border-border bg-card/80 px-3 h-9 text-sm min-w-[220px] 2xl:min-w-[280px] shadow-sm transition-all hover:border-primary/40 hover:shadow-card focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-ring/10">
              <Building2 className="h-4 w-4 text-primary" />
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


            <div className="flex items-center gap-2 rounded-lg border border-border bg-card/80 px-2 lg:px-3 h-9 text-sm shrink-0 shadow-sm transition-all hover:border-primary/40 hover:shadow-card focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-ring/10">
              <CalendarRange className="h-4 w-4 text-primary" />
              <div className="flex items-center gap-1">
                <select
                  value={competencia}
                  onChange={(e) => setCompetencia(e.target.value)}
                  className="bg-transparent outline-none text-foreground font-medium"
                >
                  {COMPETENCIAS.map((c) => (
                    <option key={c} value={c} className="bg-card">
                      {formatCompetencia(c)}
                    </option>
                  ))}
                </select>
                
                <div className="flex items-center gap-1 ml-1 border-l border-border pl-2">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-tighter">até</span>
                  <select
                    value={competenciaFim ?? ""}
                    onChange={(e) => setCompetenciaFim(e.target.value || null)}
                    className={`bg-transparent outline-none text-xs ${competenciaFim ? "text-brand-orange font-medium" : "text-muted-foreground"}`}
                  >
                    <option value="" className="bg-card">—</option>
                    {COMPETENCIAS.map((c) => (
                      <option key={c} value={c} className="bg-card">
                        {formatCompetencia(c)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={() => setBuscaAberta(true)}
              className="hidden lg:flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card/80 text-sm text-muted-foreground shadow-sm transition-all hover:border-primary/40 hover:text-foreground hover:shadow-card">
              <Search className="h-4 w-4" />
              <span>Buscar…</span>
              <kbd className="ml-2 inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-mono">
                <Command className="h-3 w-3" />K
              </kbd>
            </button>
             <AjudaTela />


            <Button
              variant="outline"
              size="sm"
              className="rounded-lg h-9"
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
              className="rounded-lg h-9"
              onClick={sair}
              aria-label="Sair da conta"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>

          </div>
        </header>

        {emPratica && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-warn/40 bg-warn/10 px-4 py-2 text-xs lg:px-8">
            <span className="flex items-center gap-2">
              <FlaskConical className="h-3.5 w-3.5 text-warn" />
              <strong>Modo prática ativo</strong> — laboratórios de estudo com dados fictícios; nada
              é gravado na competência real.
            </span>
            <div className="flex items-center gap-2">
              <NavLink to="/aprender/pratica" className="underline underline-offset-2">
                Abrir laboratórios
              </NavLink>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full h-7"
                onClick={() => setPraticaAtiva(false)}
              >
                Sair do modo prática
              </Button>
            </div>
          </div>
        )}

        {apresentacaoAberta && (
          <ApresentacaoSistema onFinish={() => setApresentacaoAberta(false)} />
        )}

        <main key={pathname} className="animate-page-enter px-4 lg:px-8 py-6 lg:py-8">

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
