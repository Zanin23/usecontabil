import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Button, Card, CardContent, Input, Label, Textarea, Badge,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { ArrowLeft, Lock, Globe2, Plus, Trash2 } from "lucide-react";
import { type RolePlay, ROLE_OPTIONS } from "@/lib/rolePlay";
import { useAuthUser } from "@/lib/useAuthUser";

type Visibility = "private" | "public";

export default function Edit() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { user, loading } = useAuthUser();

  const [loadingRp, setLoadingRp] = useState(true);
  const [rp, setRp] = useState<RolePlay | null>(null);
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav(`/auth?redirect=${encodeURIComponent(`/edit/${id}`)}`, { replace: true });
  }, [loading, user, nav, id]);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const { data, error } = await supabase.from("role_plays").select("*").eq("id", id).maybeSingle();
      if (error || !data) { toast.error(error?.message ?? "Not found"); nav("/"); return; }
      const row = data as unknown as RolePlay & { created_by?: string; visibility?: Visibility; is_published?: boolean };
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (row.created_by !== user.id && !isAdmin) { toast.error("You don't have access to edit this role-play"); nav("/"); return; }
      setRp(row);
      setVisibility((row.visibility as Visibility) ?? "private");
      setIsPublished(row.is_published ?? true);
      setLoadingRp(false);
    })();
  }, [id, user, nav]);

  const update = <K extends keyof RolePlay>(key: K, value: RolePlay[K]) => {
    setRp((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const updatePersona = (key: string, value: string) => {
    setRp((prev) => prev ? { ...prev, persona: { ...prev.persona, [key]: value } } : prev);
  };

  const updateCategory = (idx: number, patch: Partial<{ key: string; label: string; description: string; weight: number }>) => {
    setRp((prev) => {
      if (!prev) return prev;
      const categories = prev.scorecard.categories.map((c, i) => i === idx ? { ...c, ...patch } : c);
      return { ...prev, scorecard: { ...prev.scorecard, categories } };
    });
  };

  const addCategory = () => {
    setRp((prev) => {
      if (!prev) return prev;
      const categories = [...prev.scorecard.categories, { key: `cat_${Date.now()}`, label: "New category", description: "", weight: 1 }];
      return { ...prev, scorecard: { ...prev.scorecard, categories } };
    });
  };

  const removeCategory = (idx: number) => {
    setRp((prev) => {
      if (!prev) return prev;
      const categories = prev.scorecard.categories.filter((_, i) => i !== idx);
      return { ...prev, scorecard: { ...prev.scorecard, categories } };
    });
  };

  const save = async () => {
    if (!rp || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("role_plays").update({
        name: rp.name,
        role: rp.role,
        topic: rp.topic,
        persona: rp.persona,
        system_prompt: rp.system_prompt,
        scenario_brief: rp.scenario_brief,
        opening_line: rp.opening_line,
        difficulty_overlays: rp.difficulty_overlays,
        scorecard: rp.scorecard,
        is_published: isPublished,
        visibility,
        voice_id: rp.voice_id ?? null,
      }).eq("id", rp.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Role-play updated");
      nav("/");
    } finally { setSaving(false); }
  };

  if (loading || loadingRp || !rp) return <div className="min-h-screen bg-aurora" />;

  const totalW = rp.scorecard.categories.reduce((s, c) => s + (typeof c.weight === "number" && c.weight > 0 ? c.weight : 1), 0) || 1;
  const persona = rp.persona as RolePlay["persona"] & { tagline?: string };

  return (
    <div className="min-h-screen bg-aurora">
      <header className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link to="/"><Button variant="ghost" size="sm" className="rounded-lg"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Edit role-play</div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pb-16 space-y-6">
        <div>
          <h1 className="font-display text-4xl">Edit <span className="text-brand-orange">{rp.name}.</span></h1>
          <p className="text-muted-foreground mt-2 text-sm">Refine the scenario, persona, and scorecard. Changes apply to future runs.</p>
        </div>

        <Card className="rounded-2xl shadow-card">
          <CardContent className="p-6 space-y-5">
            <div className="grid md:grid-cols-[140px_1fr] gap-3">
              <div>
                <Label>Rep role</Label>
                <select
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  value={rp.role}
                  onChange={(e) => update("role", e.target.value)}
                >
                  {ROLE_OPTIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <Label>Topic</Label>
                <Input value={rp.topic} onChange={(e) => update("topic", e.target.value)} />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Role-play name</Label>
                <Input value={rp.name} onChange={(e) => update("name", e.target.value)} />
              </div>
              <div>
                <Label>Opening line</Label>
                <Input value={rp.opening_line} onChange={(e) => update("opening_line", e.target.value)} />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <Label>Persona first name</Label>
                <Input value={persona.first_name ?? ""} onChange={(e) => updatePersona("first_name", e.target.value)} />
              </div>
              <div>
                <Label>Title</Label>
                <Input value={persona.title ?? ""} onChange={(e) => updatePersona("title", e.target.value)} />
              </div>
              <div>
                <Label>Company</Label>
                <Input value={persona.company ?? ""} onChange={(e) => updatePersona("company", e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Tagline (card preview)</Label>
              <Input value={persona.tagline ?? ""} onChange={(e) => updatePersona("tagline", e.target.value)} placeholder="Short hook shown on the role-play card" />
            </div>

            <div>
              <Label>Scenario brief</Label>
              <Textarea rows={5} value={rp.scenario_brief} onChange={(e) => update("scenario_brief", e.target.value)} />
            </div>

            <div>
              <Label>ElevenLabs voice ID (optional)</Label>
              <Input
                value={rp.voice_id ?? ""}
                onChange={(e) => update("voice_id", e.target.value)}
                placeholder="Leave blank to auto-pick from the gender-matched pool"
              />
              <p className="text-xs text-muted-foreground mt-1">Paste a specific ElevenLabs voice ID to pin this role-play's voice. Otherwise one is picked automatically.</p>
            </div>

            <div>
              <Label>System prompt (buyer behavior)</Label>
              <Textarea rows={8} value={rp.system_prompt} onChange={(e) => update("system_prompt", e.target.value)} className="font-mono text-xs" />
              <p className="text-xs text-muted-foreground mt-1">This is the full instruction set the AI buyer follows during a call.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-card">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl">Scorecard</h2>
                <p className="text-sm text-muted-foreground">How reps are graded after the call. Weights determine each category's share of the 0–100 score.</p>
              </div>
              <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={addCategory}>
                <Plus className="h-3.5 w-3.5 mr-1" />Add category
              </Button>
            </div>

            <div className="space-y-3">
              {rp.scorecard.categories.map((c, idx) => {
                const w = typeof c.weight === "number" && c.weight > 0 ? c.weight : 1;
                const pct = Math.round((w / totalW) * 100);
                return (
                  <div key={c.key ?? idx} className="rounded-xl border bg-card/60 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <Input value={c.label} onChange={(e) => updateCategory(idx, { label: e.target.value })} placeholder="Category name" />
                        <Textarea rows={2} value={c.description} onChange={(e) => updateCategory(idx, { description: e.target.value })} placeholder="What good looks like" />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCategory(idx)}
                        className="text-muted-foreground hover:text-destructive p-1"
                        aria-label="Remove category"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16">Weight</span>
                      <input
                        type="range" min={1} max={10} step={1} value={w}
                        onChange={(e) => updateCategory(idx, { weight: Number(e.target.value) })}
                        className="flex-1 accent-brand-orange"
                      />
                      <Badge variant="outline" className="rounded-lg tabular-nums">{pct}%</Badge>
                    </div>
                  </div>
                );
              })}
              {rp.scorecard.categories.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No scoring categories yet. Add one to start grading reps.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-card">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="font-display text-2xl">Visibility</h2>
              <p className="text-sm text-muted-foreground">Control who can run this role-play.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVisibility("private")}
                className={`text-left rounded-2xl border p-4 transition ${visibility === "private" ? "border-brand-orange ring-2 ring-brand-orange/40 bg-card" : "border-border bg-card/60 hover:border-foreground/30"}`}
              >
                <Lock className="h-5 w-5 mb-2" />
                <div className="font-medium">Just for me</div>
                <div className="text-xs text-muted-foreground mt-1">Only you see it, in your "My role-plays" section.</div>
              </button>
              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={`text-left rounded-2xl border p-4 transition ${visibility === "public" ? "border-brand-orange ring-2 ring-brand-orange/40 bg-card" : "border-border bg-card/60 hover:border-foreground/30"}`}
              >
                <Globe2 className="h-5 w-5 mb-2" />
                <div className="font-medium">Publish publicly</div>
                <div className="text-xs text-muted-foreground mt-1">Anyone on the home page can run this role-play.</div>
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="accent-brand-orange" />
              Published (uncheck to take it offline without deleting)
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" className="rounded-lg" onClick={() => nav("/")}>Cancel</Button>
              <Button onClick={save} disabled={saving} className="rounded-lg bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground">
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}