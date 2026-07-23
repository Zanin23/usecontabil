import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Button, Card, CardContent, Input, Label, Textarea, Badge,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { Trash2, Sparkles, Pencil, Plus, Wand2, Search, Eye, EyeOff, ArrowUpDown, ArrowUp, ArrowDown, Mic, MicOff } from "lucide-react";
import {
  type RolePlay, ROLE_OPTIONS,
} from "@/lib/rolePlay";

type DraftRolePlay = Omit<RolePlay, "created_at"> & { id?: string };

export default function Admin() {
  const [rolePlays, setRolePlays] = useState<RolePlay[]>([]);
  const [role, setRole] = useState<string>("AE");
  const [openingLine, setOpeningLine] = useState("");
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState<DraftRolePlay | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [scInstruction, setScInstruction] = useState("");
  const [scRewriting, setScRewriting] = useState(false);
  const [listFilter, setListFilter] = useState<"all" | "published" | "draft">("all");
  const [listQuery, setListQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<"name" | "role" | "topic" | "persona" | "status" | "updated" | "runs">("updated");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [togglingAgentId, setTogglingAgentId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [runCounts, setRunCounts] = useState<Record<string, number>>({});

  const resetForm = () => {
    setRole("AE");
    setOpeningLine("");
    setPrompt("");
    setDraft(null);
  };

  const load = () => {
    supabase.functions.invoke("roleplay-admin", {
      body: { action: "list" },
    }).then(({ data, error }) => {
      if (error || data?.error) { toast.error(error?.message ?? data?.error); return; }
      setRolePlays((data?.role_plays ?? []) as unknown as RolePlay[]);
    });
  };
  useEffect(() => { load(); }, []);

  // Fetch run counts per role-play for the table view
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("role_play_popularity");
      if (cancelled || !data) return;
      if (error) return;
      const counts: Record<string, number> = {};
      for (const row of data as { role_play_id: string; sessions_count: number }[]) {
        counts[row.role_play_id] = Number(row.sessions_count) || 0;
      }
      setRunCounts(counts);
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-load a role-play into the editor when arriving via ?edit=<id>
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId || rolePlays.length === 0) return;
    const rp = rolePlays.find((r) => r.id === editId);
    if (rp) {
      editExisting(rp);
      setSearchParams({}, { replace: true });
    }
  }, [rolePlays, searchParams]);

  const generate = async () => {
    if (!prompt.trim()) { toast.error("Describe the role-play"); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("roleplay-generate", {
        body: { prompt, role, opening_line: openingLine },
      });
      if (error || data?.error) { toast.error(error?.message ?? data?.error); return; }
      setDraft(data.role_play as DraftRolePlay);
      toast.success("Role-play drafted — review and save");
    } finally { setGenerating(false); }
  };

  const save = async (override?: Partial<DraftRolePlay>) => {
    const base = draft;
    if (!base) { toast.error("Generate a role-play first"); return; }
    const payload = override ? { ...base, ...override } : base;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("roleplay-admin", {
        body: { action: "upsert", role_play: payload },
      });
      if (error || data?.error) { toast.error(error?.message ?? data?.error); return; }
      toast.success(payload.is_published ? "Published" : "Saved as draft");
      resetForm();
      load();
    } finally { setSaving(false); }
  };

  const editExisting = (rp: RolePlay) => {
    setRole(rp.role);
    setOpeningLine(rp.opening_line);
    setPrompt("");
    setDraft({ ...rp } as DraftRolePlay);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateDraft = (patch: Partial<DraftRolePlay>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  };
  const updatePersona = (patch: Partial<DraftRolePlay["persona"]>) => {
    setDraft((d) => (d ? { ...d, persona: { ...d.persona, ...patch } } : d));
  };
  const updateScorecard = (patch: Partial<DraftRolePlay["scorecard"]>) => {
    setDraft((d) => (d ? { ...d, scorecard: { ...d.scorecard, ...patch } } : d));
  };
  const updateCategory = (idx: number, patch: Partial<DraftRolePlay["scorecard"]["categories"][number]>) => {
    setDraft((d) => {
      if (!d) return d;
      const cats = d.scorecard.categories.map((c, i) => (i === idx ? { ...c, ...patch } : c));
      return { ...d, scorecard: { ...d.scorecard, categories: cats } };
    });
  };
  const addCategory = () => {
    setDraft((d) => {
      if (!d) return d;
      const key = `dimension_${d.scorecard.categories.length + 1}`;
      const cats = [...d.scorecard.categories, { key, label: "New dimension", description: "", weight: 1 }];
      return { ...d, scorecard: { ...d.scorecard, categories: cats } };
    });
  };
  const removeCategory = (idx: number) => {
    setDraft((d) => {
      if (!d) return d;
      const cats = d.scorecard.categories.filter((_, i) => i !== idx);
      return { ...d, scorecard: { ...d.scorecard, categories: cats } };
    });
  };

  const rewriteScorecard = async () => {
    if (!draft) return;
    if (!scInstruction.trim()) { toast.error("Describe what to change"); return; }
    setScRewriting(true);
    try {
      const { data, error } = await supabase.functions.invoke("scorecard-generate", {
        body: {
          prompt: scInstruction.trim(),
          existing: draft.scorecard,
          persona: draft.persona,
          role: draft.role,
          topic: draft.topic,
        },
      });
      if (error || data?.error) { toast.error(error?.message ?? data?.error); return; }
      const next = data.scorecard;
      updateScorecard({
        categories: next.categories ?? [],
        red_flag_examples: next.red_flag_examples ?? [],
        green_flag_examples: next.green_flag_examples ?? [],
      });
      setScInstruction("");
      toast.success("Scorecard updated");
    } finally { setScRewriting(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this role-play?")) return;
    const { error } = await supabase.functions.invoke("roleplay-admin", {
      body: { action: "delete", id },
    });
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  };

  const togglePublished = async (rp: RolePlay) => {
    setTogglingId(rp.id);
    try {
      const next = { ...rp, is_published: !rp.is_published } as DraftRolePlay;
      const { data, error } = await supabase.functions.invoke("roleplay-admin", {
        body: { action: "upsert", role_play: next },
      });
      if (error || data?.error) { toast.error(error?.message ?? data?.error); return; }
      toast.success(next.is_published ? "Published" : "Moved to draft");
      setRolePlays((rows) => rows.map((r) => (r.id === rp.id ? { ...r, is_published: !rp.is_published } : r)));
    } finally { setTogglingId(null); }
  };

  const toggleAgent = async (rp: RolePlay) => {
    setTogglingAgentId(rp.id);
    try {
      const next = { ...rp, use_elevenlabs_agent: !rp.use_elevenlabs_agent } as DraftRolePlay;
      const { data, error } = await supabase.functions.invoke("roleplay-admin", {
        body: { action: "upsert", role_play: next },
      });
      if (error || data?.error) { toast.error(error?.message ?? data?.error); return; }
      toast.success(next.use_elevenlabs_agent ? "Voice Agent enabled" : "Voice Agent disabled");
      setRolePlays((rows) => rows.map((r) => (r.id === rp.id ? { ...r, use_elevenlabs_agent: !rp.use_elevenlabs_agent } : r)));
    } finally { setTogglingAgentId(null); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl sm:text-3xl">Create & manage <span className="text-brand-orange">role-plays</span></h2>
        <p className="text-xs text-muted-foreground mt-1">Generate, edit, publish, and tune your role-play library.</p>
      </div>
        <Card className="rounded-2xl shadow-card">
          <CardContent className="p-6 space-y-5">
            <div>
              <h2 className="font-display text-2xl">New role-play</h2>
              <p className="text-sm text-muted-foreground">Just describe it. AI picks the buyer, scenario, prompt, difficulty overlays, and scorecard. Voice is auto-set to the most natural conversational option.</p>
            </div>

            <div className="grid md:grid-cols-[160px_1fr] gap-3">
              <div>
                <Label>Rep role</Label>
                <select
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  value={draft?.role ?? role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    if (draft) updateDraft({ role: e.target.value });
                  }}
                >
                  {ROLE_OPTIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <Label>Opening line (what the buyer says first)</Label>
                <Input
                  value={draft?.opening_line ?? openingLine}
                  onChange={(e) => {
                    setOpeningLine(e.target.value);
                    if (draft) updateDraft({ opening_line: e.target.value });
                  }}
                  placeholder="Hey, thanks for jumping on — what's this about?"
                />
              </div>
            </div>

            <div>
              <Label>Describe the role-play</Label>
              <Textarea
                rows={6}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. AE pitching our AI revenue intelligence tool to Mark, the CPO at Revolut. He's skeptical of yet-another-AI-tool and wants concrete ROI. Score on discovery depth, handling 'we already use Gong', and landing a concrete next step."
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={generate} disabled={generating || !prompt.trim()} className="rounded-lg bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground">
                <Sparkles className="h-4 w-4 mr-1.5" />
                {generating ? "Drafting…" : (draft ? "Regenerate" : "Generate role-play")}
              </Button>
            </div>

            {draft && (
              <div className="rounded-xl border bg-card/60 p-4 space-y-4 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  {draft.id && <Badge variant="outline" className="rounded-lg">Editing</Badge>}
                  <Badge variant="outline" className="rounded-lg">{draft.role}</Badge>
                  <Badge className="rounded-lg bg-brand-orange/10 text-brand-orange border border-brand-orange/20 hover:bg-brand-orange/10">{draft.topic}</Badge>
                  <span className="text-xs text-muted-foreground">/{draft.slug}</span>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label>Name</Label>
                    <Input value={draft.name} onChange={(e) => updateDraft({ name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Slug</Label>
                    <Input value={draft.slug} onChange={(e) => updateDraft({ slug: e.target.value })} />
                  </div>
                  <div>
                    <Label>Buyer first name</Label>
                    <Input value={draft.persona.first_name} onChange={(e) => updatePersona({ first_name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Buyer title</Label>
                    <Input value={draft.persona.title} onChange={(e) => updatePersona({ title: e.target.value })} />
                  </div>
                  <div>
                    <Label>Buyer company</Label>
                    <Input value={draft.persona.company} onChange={(e) => updatePersona({ company: e.target.value })} />
                  </div>
                  <div>
                    <Label>Topic</Label>
                    <Input value={draft.topic} onChange={(e) => updateDraft({ topic: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Opening line</Label>
                  <Textarea rows={2} value={draft.opening_line} onChange={(e) => updateDraft({ opening_line: e.target.value })} />
                </div>
                <div>
                  <Label>Scenario brief</Label>
                  <Textarea rows={4} value={draft.scenario_brief} onChange={(e) => updateDraft({ scenario_brief: e.target.value })} />
                </div>
                <div>
                  <Label>Buyer system prompt</Label>
                  <Textarea rows={8} value={draft.system_prompt} onChange={(e) => updateDraft({ system_prompt: e.target.value })} />
                </div>
                <details open>
                  <summary className="cursor-pointer text-xs uppercase tracking-widest text-muted-foreground">
                    Scorecard ({draft.scorecard.categories.length} categories)
                  </summary>
                  <div className="mt-3 space-y-4">
                    <div className="rounded-lg border bg-background/60 p-3 space-y-2">
                      <Label className="text-xs uppercase tracking-widest text-muted-foreground">Rewrite with AI</Label>
                      <Textarea
                        rows={2}
                        value={scInstruction}
                        onChange={(e) => setScInstruction(e.target.value)}
                        placeholder="e.g. Add a dimension for objection handling. Make 'discovery' worth twice as much. Drop time management."
                      />
                      <div className="flex justify-end">
                        <Button
                          type="button" size="sm"
                          onClick={rewriteScorecard}
                          disabled={scRewriting || !scInstruction.trim()}
                          className="rounded-lg bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground"
                        >
                          <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                          {scRewriting ? "Rewriting…" : "Apply"}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {(() => {
                        const totalW = draft.scorecard.categories.reduce((s, c) => s + (typeof c.weight === "number" && c.weight > 0 ? c.weight : 1), 0) || 1;
                        return draft.scorecard.categories.map((c, idx) => {
                          const w = typeof c.weight === "number" && c.weight > 0 ? c.weight : 1;
                          const pct = Math.round((w / totalW) * 100);
                          return (
                            <div key={idx} className="rounded-lg border bg-background/60 p-3 space-y-2">
                              <div className="grid md:grid-cols-[1fr_2fr_auto] gap-2 items-start">
                                <Textarea
                                  rows={2}
                                  value={c.label}
                                  onChange={(e) => updateCategory(idx, { label: e.target.value })}
                                  placeholder="Label"
                                />
                                <Textarea
                                  rows={2}
                                  value={c.description}
                                  onChange={(e) => updateCategory(idx, { description: e.target.value })}
                                  placeholder="Scoring criterion"
                                />
                                <Button
                                  type="button" variant="ghost" size="sm"
                                  onClick={() => removeCategory(idx)}
                                  aria-label="Remove dimension"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="flex items-center gap-3">
                                <Input
                                  value={c.key}
                                  onChange={(e) => updateCategory(idx, { key: e.target.value })}
                                  placeholder="snake_case_key"
                                  className="w-48 font-mono text-xs"
                                />
                                <div className="flex-1 flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground w-14">Weight</span>
                                  <input
                                    type="range" min={1} max={10} step={1} value={w}
                                    onChange={(e) => updateCategory(idx, { weight: Number(e.target.value) })}
                                    className="flex-1 accent-brand-orange"
                                  />
                                  <span className="w-12 text-right tabular-nums text-xs text-muted-foreground">{pct}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                      <Button
                        type="button" variant="outline" size="sm"
                        onClick={addCategory}
                        className="rounded-lg"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add dimension
                      </Button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs uppercase tracking-widest text-success">Green flag examples</Label>
                        <Textarea
                          rows={5}
                          value={(draft.scorecard.green_flag_examples ?? []).join("\n")}
                          onChange={(e) => updateScorecard({ green_flag_examples: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                          placeholder="One per line"
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-widest text-brand-red">Red flag examples</Label>
                        <Textarea
                          rows={5}
                          value={(draft.scorecard.red_flag_examples ?? []).join("\n")}
                          onChange={(e) => updateScorecard({ red_flag_examples: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                          placeholder="One per line"
                        />
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            )}

            <div className="flex flex-wrap gap-3 justify-end items-center">
              {draft && (
                draft.is_published ? (
                  <Badge className="rounded-lg bg-success/15 text-success border border-success/30 hover:bg-success/15">Published</Badge>
                ) : (
                  <Badge variant="outline" className="rounded-lg border-brand-orange/40 text-brand-orange">Draft</Badge>
                )
              )}
              <Button variant="outline" className="rounded-lg" onClick={resetForm}>Reset</Button>
              {draft?.is_published ? (
                <Button
                  variant="outline"
                  className="rounded-lg"
                  disabled={saving || !draft}
                  onClick={() => save({ is_published: false })}
                >
                  Unpublish & save
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="rounded-lg"
                  disabled={saving || !draft}
                  onClick={() => save({ is_published: true })}
                >
                  {saving ? "Publishing…" : "Save & publish"}
                </Button>
              )}
              <Button onClick={() => save()} disabled={saving || !draft} className="rounded-lg bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground">{saving ? "Saving…" : (draft?.is_published ? "Save changes" : "Save draft")}</Button>
            </div>
          </CardContent>
        </Card>

        <section className="space-y-3">
          {(() => {
            const publishedCount = rolePlays.filter((r) => r.is_published).length;
            const draftCount = rolePlays.length - publishedCount;
            const q = listQuery.trim().toLowerCase();
            const roleOptions = Array.from(new Set(rolePlays.map((r) => r.role).filter(Boolean))).sort();
            const topicOptions = Array.from(new Set(rolePlays.map((r) => r.topic).filter(Boolean))).sort();
            const filtered = rolePlays.filter((rp) => {
              if (listFilter === "published" && !rp.is_published) return false;
              if (listFilter === "draft" && rp.is_published) return false;
              if (roleFilter !== "all" && rp.role !== roleFilter) return false;
              if (topicFilter !== "all" && rp.topic !== topicFilter) return false;
              if (!q) return true;
              return [rp.name, rp.slug, rp.topic, rp.role, rp.persona?.company, rp.persona?.title]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q));
            });
            const personaOf = (rp: RolePlay) =>
              [rp.persona?.first_name, rp.persona?.title, rp.persona?.company].filter(Boolean).join(" · ");
            const updatedOf = (rp: RolePlay) => (rp as RolePlay & { updated_at?: string; created_at?: string }).updated_at
              ?? (rp as RolePlay & { created_at?: string }).created_at
              ?? "";
            const sortVal = (rp: RolePlay): string | number => {
              switch (sortKey) {
                case "name": return (rp.name ?? "").toLowerCase();
                case "role": return (rp.role ?? "").toLowerCase();
                case "topic": return (rp.topic ?? "").toLowerCase();
                case "persona": return personaOf(rp).toLowerCase();
                case "status": return rp.is_published ? 1 : 0;
                case "updated": return updatedOf(rp);
                case "runs": return runCounts[rp.id] ?? 0;
              }
            };
            const sorted = [...filtered].sort((a, b) => {
              const av = sortVal(a); const bv = sortVal(b);
              if (av < bv) return sortDir === "asc" ? -1 : 1;
              if (av > bv) return sortDir === "asc" ? 1 : -1;
              return 0;
            });
            const toggleSort = (k: typeof sortKey) => {
              if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
              else { setSortKey(k); setSortDir(k === "updated" ? "desc" : "asc"); }
            };
            const SortIcon = ({ k }: { k: typeof sortKey }) => {
              if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 opacity-50" />;
              return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
            };
            const SortHeader = ({ k, children, className }: { k: typeof sortKey; children: React.ReactNode; className?: string }) => (
              <TableHead className={className}>
                <button type="button" onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-foreground transition">
                  {children}<SortIcon k={k} />
                </button>
              </TableHead>
            );
            const tabs: { key: typeof listFilter; label: string; count: number }[] = [
              { key: "all", label: "All", count: rolePlays.length },
              { key: "published", label: "Published", count: publishedCount },
              { key: "draft", label: "Drafts", count: draftCount },
            ];
            return (
              <>
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="font-display text-2xl">Existing role-plays</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{sorted.length} of {rolePlays.length} shown</p>
                  </div>
                  {(roleFilter !== "all" || topicFilter !== "all" || listFilter !== "all" || listQuery) && (
                    <button
                      type="button"
                      onClick={() => { setRoleFilter("all"); setTopicFilter("all"); setListFilter("all"); setListQuery(""); }}
                      className="text-xs text-muted-foreground hover:text-foreground transition underline-offset-4 hover:underline"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
                <Card className="rounded-2xl shadow-card">
                  <CardContent className="p-3 flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[220px]">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={listQuery}
                        onChange={(e) => setListQuery(e.target.value)}
                        placeholder="Search name, slug, company, persona…"
                        className="pl-9 rounded-lg border-0 bg-muted/40 focus-visible:bg-background"
                      />
                    </div>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="h-9 px-3 rounded-lg border border-input bg-background text-sm"
                    >
                      <option value="all">All roles</option>
                      {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <select
                      value={topicFilter}
                      onChange={(e) => setTopicFilter(e.target.value)}
                      className="h-9 px-3 rounded-lg border border-input bg-background text-sm max-w-[200px] truncate"
                    >
                      <option value="all">All topics</option>
                      {topicOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <div className="flex gap-1 ml-auto">
                      {tabs.map((t) => (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => setListFilter(t.key)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                            listFilter === t.key
                              ? "bg-brand-orange text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                        >
                          {t.label} <span className="opacity-70 ml-1 tabular-nums">{t.count}</span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl shadow-card overflow-hidden">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <SortHeader k="name">Name</SortHeader>
                          <SortHeader k="role" className="w-24">Role</SortHeader>
                          <SortHeader k="topic" className="w-40">Topic</SortHeader>
                          <SortHeader k="persona">Persona</SortHeader>
                        <SortHeader k="runs" className="w-20">Runs</SortHeader>
                          <SortHeader k="status" className="w-28">Status</SortHeader>
                          <SortHeader k="updated" className="w-32">Updated</SortHeader>
                          <TableHead className="w-32 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sorted.length === 0 && (
                          <TableRow>
                          <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                              No role-plays match.
                            </TableCell>
                          </TableRow>
                        )}
                        {sorted.map((rp) => {
                          const upd = updatedOf(rp);
                        const runs = runCounts[rp.id] ?? 0;
                          return (
                            <TableRow key={rp.id} className="group hover:bg-muted/40 transition-colors">
                              <TableCell className="font-medium">
                              <Link
                                to={`/admin/role-play/${rp.slug}/stats`}
                                className="truncate max-w-[260px] block hover:text-brand-orange transition"
                                title="View stats"
                              >
                                {rp.name}
                              </Link>
                                <div className="text-xs text-muted-foreground truncate max-w-[260px]">/{rp.slug}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="rounded-lg">{rp.role}</Badge>
                              </TableCell>
                              <TableCell className="text-sm">{rp.topic}</TableCell>
                              <TableCell className="text-sm">
                                <div className="truncate max-w-[260px]">{personaOf(rp) || "—"}</div>
                              </TableCell>
                            <TableCell className="text-sm tabular-nums">
                              {runs > 0 ? (
                                <Link
                                  to={`/admin/role-play/${rp.slug}/stats`}
                                  className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-lg bg-muted/60 text-foreground hover:bg-brand-orange/15 hover:text-brand-orange transition"
                                >
                                  {runs}
                                </Link>
                              ) : (
                                <span className="text-muted-foreground/50">—</span>
                              )}
                            </TableCell>
                              <TableCell>
                                {rp.is_published ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs text-success">
                                    <span className="h-1.5 w-1.5 rounded-full bg-success" /> Published
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-xs text-brand-orange">
                                    <span className="h-1.5 w-1.5 rounded-full bg-brand-orange" /> Draft
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground tabular-nums">
                                {upd ? new Date(upd).toLocaleDateString() : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="inline-flex gap-1">
                                  <Button
                                    size="sm" variant="ghost"
                                    disabled={togglingId === rp.id}
                                    onClick={() => togglePublished(rp)}
                                    title={rp.is_published ? "Unpublish (move to draft)" : "Publish"}
                                  >
                                    {rp.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                  <Button
                                    size="sm" variant="ghost"
                                    disabled={togglingAgentId === rp.id}
                                    onClick={() => toggleAgent(rp)}
                                    title={rp.use_elevenlabs_agent ? "Disable Voice Agent (use default stack)" : "Enable ElevenLabs Voice Agent"}
                                    className={rp.use_elevenlabs_agent ? "text-brand-pink" : ""}
                                  >
                                    {rp.use_elevenlabs_agent ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => editExisting(rp)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                                  <Button size="sm" variant="ghost" onClick={() => remove(rp.id)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </section>
    </div>
  );
}