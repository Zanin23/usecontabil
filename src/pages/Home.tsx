import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import type { RolePlay } from "@/lib/rolePlay";
import { ArrowRight, LogOut, Briefcase, Headphones, Wrench, Sparkles, Wand2, Search, X, Flame, Clock, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuthUser, displayNameFor } from "@/lib/useAuthUser";
import { useIsAdmin } from "@/lib/adminRole";
import AppShell from "@/components/AppShell";
import { cardTagline } from "@/components/RolePlayCard";
import { resolveHeadshot, inferGender } from "@/lib/headshots";

const ROLE_META: Record<string, { label: string; Icon: typeof Briefcase; tint: string; dot: string }> = {
  AE:  { label: "Account executive",   Icon: Briefcase,  tint: "bg-brand-blue/10",   dot: "bg-brand-blue" },
  CSM: { label: "Customer success",    Icon: Headphones, tint: "bg-[#FF0178]/10",    dot: "bg-[#FF0178]" },
  SA:  { label: "Solutions engineer",  Icon: Wrench,     tint: "bg-[#FF6D1B]/10",    dot: "bg-[#FF6D1B]" },
};

function roleMeta(role: string) {
  return ROLE_META[role] ?? { label: role, Icon: Briefcase, tint: "bg-cream", dot: "bg-foreground/40" };
}

type SortKey = "popular" | "newest" | "mine";

export default function Home() {
  const nav = useNavigate();
  const { user } = useAuthUser();
  const { isAdmin } = useIsAdmin();
  const [rolePlays, setRolePlays] = useState<RolePlay[]>([]);
  const [popularity, setPopularity] = useState<Record<string, number>>({});
  const [starting, setStarting] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | "all">("all");
  const [topicFilter, setTopicFilter] = useState<string | "all">("all");
  const [sort, setSort] = useState<SortKey>("popular");

  useEffect(() => {
    if (!user) { setNeedsSetup(false); return; }
    (async () => {
      const [{ data: settings }, { data: hasAdmin }] = await Promise.all([
        supabase.from("app_settings").select("onboarded_at").maybeSingle(),
        supabase.rpc("has_any_admin"),
      ]);
      const notOnboarded = !settings?.onboarded_at;
      if (notOnboarded && !hasAdmin) { nav("/setup", { replace: true }); return; }
      setNeedsSetup(notOnboarded && isAdmin);
    })();
  }, [user?.id, isAdmin, nav]);

  useEffect(() => {
    supabase.from("role_plays").select("*").eq("is_published", true).order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setRolePlays((data ?? []) as unknown as RolePlay[]);
      });
    supabase.rpc("role_play_popularity").then(({ data }) => {
      const counts: Record<string, number> = {};
      for (const row of (data ?? []) as { role_play_id: string; sessions_count: number }[]) {
        counts[row.role_play_id] = Number(row.sessions_count) || 0;
      }
      setPopularity(counts);
    });
  }, [user?.id]);

  const mineIds = useMemo(
    () => new Set(user ? rolePlays.filter((r) => (r as RolePlay & { created_by?: string }).created_by === user.id).map((r) => r.id) : []),
    [rolePlays, user],
  );

  const topics = useMemo(() => {
    const set = new Set<string>();
    rolePlays.forEach((r) => { if (r.topic) set.add(r.topic); });
    return Array.from(set).sort();
  }, [rolePlays]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rolePlays.filter((r) => {
      if (roleFilter !== "all" && r.role !== roleFilter) return false;
      if (topicFilter !== "all" && r.topic !== topicFilter) return false;
      if (sort === "mine" && !mineIds.has(r.id)) return false;
      if (!q) return true;
      const hay = [r.name, r.topic, r.persona?.first_name, r.persona?.title, r.persona?.company, r.opening_line]
        .filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
    if (sort === "newest") {
      list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sort === "popular") {
      list = [...list].sort((a, b) => {
        const pa = popularity[a.id] ?? 0;
        const pb = popularity[b.id] ?? 0;
        if (pb !== pa) return pb - pa;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }
    return list;
  }, [rolePlays, query, roleFilter, topicFilter, sort, popularity, mineIds]);

  const totalSessions = useMemo(
    () => Object.values(popularity).reduce((s, n) => s + n, 0),
    [popularity],
  );

  const start = async (rp: RolePlay) => {
    if (!user) { nav(`/auth?redirect=/practice`); return; }
    setStarting(rp.id);
    const { data, error } = await supabase.from("sessions")
      .insert({ user_id: user.id, difficulty: "standard", role_play_id: rp.id })
      .select("id").single();
    setStarting(null);
    if (error || !data) { toast.error(error?.message ?? "Failed to start"); return; }
    nav(`/call/${data.id}`);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
  };

  const activeFilters = (roleFilter !== "all") || (topicFilter !== "all") || query.trim().length > 0 || sort === "mine";
  const clearFilters = () => { setRoleFilter("all"); setTopicFilter("all"); setQuery(""); setSort("popular"); };

  const sortTabs: { key: SortKey; label: string; Icon: typeof Flame }[] = [
    { key: "popular", label: "Popular", Icon: Flame },
    { key: "newest",  label: "Newest",  Icon: Clock },
    ...(user && mineIds.size > 0 ? [{ key: "mine" as SortKey, label: "Mine", Icon: UserIcon }] : []),
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-6 md:px-8 py-8 lg:py-10 flex flex-col gap-8">

        {/* Setup banner — top priority */}
        {needsSetup && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="rounded-xl border border-brand-blue/30 bg-brand-blue/5 p-6 flex items-center justify-between gap-4 flex-wrap"
          >
            <div>
              <div className="text-xs uppercase tracking-widest text-brand-blue font-semibold mb-1">Finish setup</div>
              <p className="text-foreground/70">One quick wizard to configure voices. Takes about 30 seconds.</p>
            </div>
            <Link to="/setup" className="px-6 py-3 rounded-lg bg-brand-blue text-white font-medium inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Wand2 className="w-4 h-4" /> Run setup wizard
            </Link>
          </motion.div>
        )}


        {/* Page header */}
        <motion.header
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="flex flex-col gap-3"
        >
          <div className="text-xs uppercase tracking-[0.2em] text-foreground/50 font-semibold">Scenario library</div>
          <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-[-0.02em] leading-[1.05]">
            Find a scenario to practice
          </h1>
          <p className="text-foreground/60 leading-relaxed">
            {rolePlays.length} scenarios · {totalSessions} sessions logged. Filter by role and topic to find the rep your team needs.
          </p>
        </motion.header>

        {/* Filter bar + Build-your-own CTA, side by side */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5 items-stretch"
        >
          <div className="rounded-xl bg-secondary border border-border p-5 md:p-6 flex flex-col gap-5">
            {/* Search + sort */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, persona, company, or topic"
                  className="w-full pl-11 pr-10 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-brand-blue/60 transition-colors"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-cream text-foreground/60"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-background border border-border">
                {sortTabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setSort(t.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 transition-colors ${
                      sort === t.key ? "bg-brand-blue text-white" : "text-foreground/60 hover:text-foreground"
                    }`}
                  >
                    <t.Icon className="w-3.5 h-3.5" /> {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Role + Topic dropdowns, side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-background border border-border focus-within:border-brand-blue/60 transition-colors">
                <span className="text-xs uppercase tracking-widest text-foreground/40 font-semibold shrink-0">Role</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-foreground focus:outline-none cursor-pointer appearance-none"
                >
                  <option value="all">All roles</option>
                  {Object.entries(ROLE_META).map(([key, meta]) => (
                    <option key={key} value={key}>{key} — {meta.label}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-background border border-border focus-within:border-brand-blue/60 transition-colors">
                <span className="text-xs uppercase tracking-widest text-foreground/40 font-semibold shrink-0">Topic</span>
                <select
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                  disabled={topics.length === 0}
                  className="flex-1 bg-transparent text-sm text-foreground focus:outline-none cursor-pointer appearance-none disabled:opacity-50"
                >
                  <option value="all">All topics</option>
                  {topics.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* Result count + clear */}
            <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
              <p className="text-sm text-foreground/60">
                {filtered.length} of {rolePlays.length} scenarios
              </p>
              {activeFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-brand-blue hover:underline inline-flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Clear filters
                </button>
              )}
            </div>
          </div>

          <Link
            to={user ? "/create" : "/auth?redirect=/create"}
            className="group relative overflow-hidden rounded-xl bg-ink text-white p-6 flex flex-col justify-between min-h-[200px] hover:opacity-95 transition-opacity"
          >
            <div className="absolute top-0 right-0 w-[240px] h-[240px] bg-brand-blue blur-[80px] opacity-30 -mr-12 -mt-12" />
            <div className="relative z-10">
              <div className="inline-flex px-3 py-1 rounded-lg border border-white/20 text-xs font-medium mb-3 uppercase tracking-wider">
                Create
              </div>
              <h3 className="font-display text-2xl font-semibold tracking-tight leading-tight mb-1.5">
                Build your own scenario
              </h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Describe a deal, paste notes, or drop a transcript.
              </p>
            </div>
            <span className="relative z-10 inline-flex items-center gap-1.5 text-brand-blue font-semibold text-sm mt-4">
              Start building
            </span>
          </Link>
        </motion.div>


        {/* Results grid — light cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.length === 0 && (
            <div className="md:col-span-2 lg:col-span-3 p-10 rounded-xl bg-secondary border border-border text-foreground/60 text-center">
              <p className="font-display text-xl mb-2">No scenarios match those filters.</p>
              <button onClick={clearFilters} className="text-brand-blue hover:underline text-sm">Clear filters</button>
            </div>
          )}

          {filtered.map((rp, i) => {
            const meta = roleMeta(rp.role);
            const sessions = popularity[rp.id] ?? 0;
            const owned = mineIds.has(rp.id);
            return (
              <motion.button
                key={rp.id}
                type="button"
                onClick={() => start(rp)}
                disabled={starting === rp.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.03, 0.3) }}
                className="group text-left p-6 rounded-xl bg-card border border-border hover:border-brand-blue/40 hover:shadow-card transition-all cursor-pointer flex flex-col min-h-[260px] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/50 relative"
              >
                {owned && (
                  <span className="absolute top-4 right-4 text-[10px] uppercase tracking-widest font-semibold text-brand-blue px-2 py-1 rounded-lg bg-brand-blue/10">
                    Mine
                  </span>
                )}
                <div className="flex items-start gap-4 mb-4">
                  <img
                    src={resolveHeadshot(rp.id, rp.persona?.headshot_url, inferGender(rp.persona), rp.persona?.headshot_index)}
                    alt={rp.persona?.first_name ?? rp.name}
                    width={48}
                    height={48}
                    loading="lazy"
                    className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-border"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-display text-lg font-semibold leading-tight line-clamp-2 text-foreground">{rp.name}</h4>
                    <p className="text-xs text-foreground/50 truncate mt-0.5">
                      {rp.persona?.title}{rp.persona?.company ? ` · ${rp.persona.company}` : ""}
                    </p>
                  </div>
                </div>
                <p className="text-foreground/60 text-sm flex-grow line-clamp-3 italic mb-5">
                  “{cardTagline(rp)}”
                </p>
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-foreground/40 pt-4 border-t border-border">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                    {rp.role} · {rp.topic}
                  </span>
                  <span className="inline-flex items-center gap-1 text-brand-blue group-hover:gap-2 transition-all normal-case tracking-normal">
                    {starting === rp.id ? "Opening…" : sessions > 0 ? `${sessions} runs` : "Start"}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}


function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 transition-colors border ${
        active
          ? "bg-brand-blue text-white border-brand-blue"
          : "bg-background text-foreground/70 border-border hover:text-foreground hover:border-foreground/30"
      }`}
    >
      {children}
    </button>
  );
}
