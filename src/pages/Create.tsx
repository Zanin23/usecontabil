import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Button, Card, CardContent, Input, Label, Textarea, Badge,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Upload, Lock, Globe2, X, Phone } from "lucide-react";
import { type RolePlay, ROLE_OPTIONS } from "@/lib/rolePlay";
import { useAuthUser } from "@/lib/useAuthUser";
import { extractTextFromFile } from "@/lib/transcriptFile";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/design-system/mj-design-system-db98fa";

type Draft = Omit<RolePlay, "created_at" | "id">;

export default function Create() {
  const nav = useNavigate();
  const { user, loading } = useAuthUser();

  const [role, setRole] = useState<string>("AE");
  const [openingLine, setOpeningLine] = useState("");
  const [prompt, setPrompt] = useState("");
  const [transcript, setTranscript] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [attentionOpen, setAttentionOpen] = useState(false);
  const [attentionImporting, setAttentionImporting] = useState<string | null>(null);
  const [attentionLink, setAttentionLink] = useState("");

  useEffect(() => {
    if (!loading && !user) nav(`/auth?redirect=${encodeURIComponent("/create")}`, { replace: true });
  }, [loading, user, nav]);

  const importAttentionCall = async (id: string) => {
    setAttentionImporting(id);
    try {
      const { data, error } = await supabase.functions.invoke("attention-calls", {
        body: { action: "get", id },
      });
      if (error || data?.error) { toast.error(error?.message ?? data?.error); return; }
      const text = (data.transcript ?? "").trim();
      if (!text) { toast.error("That call has no transcript yet"); return; }
      setTranscript((prev) => (prev.trim() ? `${prev}\n\n${text}` : text));
      setFileName(`Attention — ${data.title}`);
      setAttentionOpen(false);
      toast.success(`Imported "${data.title}"`);
    } finally { setAttentionImporting(null); }
  };

  const importAttentionFromLink = async () => {
    const raw = attentionLink.trim();
    if (!raw) return;
    const match = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (!match) { toast.error("Paste an Attention call link or ID (UUID)"); return; }
    await importAttentionCall(match[0]);
    setAttentionLink("");
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    setExtracting(true);
    try {
      const text = await extractTextFromFile(file);
      if (!text.trim()) { toast.error("Couldn't read any text from that file"); return; }
      setTranscript((prev) => (prev.trim() ? `${prev}\n\n${text}` : text));
      setFileName(file.name);
      toast.success(`Added ${file.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to read file");
    } finally {
      setExtracting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const generate = async () => {
    if (!prompt.trim() && !transcript.trim()) {
      toast.error("Describe the scenario or add a transcript first");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("roleplay-generate", {
        body: {
          prompt: prompt.trim() || "Build a realistic role-play based on the attached real-call material.",
          role,
          opening_line: openingLine,
          transcript: transcript.trim() || undefined,
        },
      });
      if (error || data?.error) { toast.error(error?.message ?? data?.error); return; }
      setDraft(data.role_play as Draft);
      toast.success("Drafted — review and save");
    } finally { setGenerating(false); }
  };

  const save = async () => {
    if (!draft || !user) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from("role_plays").insert({
        slug: `${draft.slug}-${Math.random().toString(36).slice(2, 6)}`,
        name: draft.name,
        role: draft.role,
        topic: draft.topic,
        persona: draft.persona,
        system_prompt: draft.system_prompt,
        scenario_brief: draft.scenario_brief,
        opening_line: draft.opening_line,
        difficulty_overlays: draft.difficulty_overlays,
        scorecard: draft.scorecard,
        is_published: true,
        visibility,
        created_by: user.id,
      }).select("id").single();
      if (error || !data) { toast.error(error?.message ?? "Save failed"); return; }
      toast.success(visibility === "public" ? "Published" : "Saved to your role-plays");
      nav("/practice");
    } finally { setSaving(false); }
  };

  if (loading || !user) {
    return <div className="min-h-screen bg-aurora" />;
  }

  return (
    <div className="min-h-screen bg-aurora">
      <header className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link to="/practice"><Button variant="ghost" size="sm" className="rounded-lg"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 pb-16 space-y-6">
        <div>
          <h1 className="font-display text-4xl text-foreground">Build a role-play.</h1>
          <p className="text-muted-foreground mt-2 text-sm">Describe the scenario, or drop in notes / a transcript from a real call. We'll turn it into a buyer you can role-play with.</p>
        </div>


        <Card className="rounded-2xl shadow-card">
          <CardContent className="p-6 space-y-5">
            <div className="grid md:grid-cols-[140px_1fr] gap-3">
              <div>
                <Label>Rep role</Label>
                <select
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  {ROLE_OPTIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <Label>Opening line (optional)</Label>
                <Input
                  value={openingLine}
                  onChange={(e) => setOpeningLine(e.target.value)}
                  placeholder="What the buyer says first — leave blank to let AI pick"
                />
              </div>
            </div>

            <div>
              <Label>Describe the scenario</Label>
              <Textarea
                rows={5}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. CSM running a kickoff call with a non-technical VP. The goal is to nail down success metrics. They're worried about adoption from their team."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label>Meeting notes or transcript (optional)</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    onClick={() => setAttentionOpen(true)}
                  >
                    <Phone className="h-3.5 w-3.5 mr-1.5" />
                    Import from Attention
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf"
                    className="hidden"
                    onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    disabled={extracting}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    {extracting ? "Reading…" : "Upload .txt / .md / .pdf"}
                  </Button>
                </div>
              </div>
              {fileName && (
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                  Added <span className="font-medium text-foreground">{fileName}</span>
                  <button
                    type="button"
                    onClick={() => { setFileName(null); setTranscript(""); }}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <X className="h-3 w-3" /> clear
                  </button>
                </div>
              )}
              <Textarea
                rows={6}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste a real call transcript or your raw meeting notes. We'll use it to make the buyer sound like the real person."
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={generate} disabled={generating || (!prompt.trim() && !transcript.trim())} className="rounded-lg bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground">
                <Sparkles className="h-4 w-4 mr-1.5" />
                {generating ? "Drafting…" : (draft ? "Regenerate" : "Generate role-play")}
              </Button>
            </div>

            {draft && (
              <div className="rounded-xl border bg-card/60 p-4 space-y-3 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="rounded-lg">{draft.role}</Badge>
                  <Badge className="rounded-lg bg-brand-orange/10 text-brand-orange border border-brand-orange/20 hover:bg-brand-orange/10">{draft.topic}</Badge>
                  <span className="font-medium">{draft.name}</span>
                </div>
                <div className="text-muted-foreground">{(draft.persona as { tagline?: string })?.tagline ?? draft.scenario_brief.split("\n")[0]}</div>
                <details>
                  <summary className="cursor-pointer text-xs uppercase tracking-widest text-muted-foreground">Scenario brief</summary>
                  <div className="mt-2 whitespace-pre-wrap">{draft.scenario_brief}</div>
                </details>
                <details open>
                  <summary className="cursor-pointer text-xs uppercase tracking-widest text-muted-foreground">Scorecard weights ({draft.scorecard.categories.length})</summary>
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-muted-foreground">Set how much each dimension counts toward the 0–100 score. Heavier = more important.</p>
                    {(() => {
                      const totalW = draft.scorecard.categories.reduce((s, c) => s + (typeof c.weight === "number" && c.weight > 0 ? c.weight : 1), 0) || 1;
                      return draft.scorecard.categories.map((c, idx) => {
                        const w = typeof c.weight === "number" && c.weight > 0 ? c.weight : 1;
                        const pct = Math.round((w / totalW) * 100);
                        return (
                          <div key={c.key} className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{c.label}</div>
                              <div className="text-xs text-muted-foreground truncate">{c.description}</div>
                            </div>
                            <input
                              type="range" min={1} max={10} step={1} value={w}
                              onChange={(e) => {
                                const nextW = Number(e.target.value);
                                setDraft((prev) => {
                                  if (!prev) return prev;
                                  const cats = prev.scorecard.categories.map((cc, i) =>
                                    i === idx ? { ...cc, weight: nextW } : cc);
                                  return { ...prev, scorecard: { ...prev.scorecard, categories: cats } };
                                });
                              }}
                              className="w-32 accent-brand-orange"
                            />
                            <div className="w-10 text-right tabular-nums text-xs text-muted-foreground">{pct}%</div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </details>
              </div>
            )}
          </CardContent>
        </Card>

        {draft && (
          <Card className="rounded-2xl shadow-card">
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="font-display text-2xl">Where should this live?</h2>
                <p className="text-sm text-muted-foreground">You can change this later by recreating it.</p>
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
              <div className="flex justify-end gap-3">
                <Button variant="outline" className="rounded-lg" onClick={() => setDraft(null)}>Discard</Button>
                <Button onClick={save} disabled={saving} className="rounded-lg bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground">
                  {saving ? "Saving…" : visibility === "public" ? "Publish role-play" : "Save to my role-plays"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <Dialog open={attentionOpen} onOpenChange={setAttentionOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import a call from Attention</DialogTitle>
            <DialogDescription>Paste an Attention call link or ID to pull in its transcript.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              autoFocus
              value={attentionLink}
              onChange={(e) => setAttentionLink(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void importAttentionFromLink(); }}
              placeholder="https://app.attention.com/… or call UUID"
            />
            <div className="flex justify-end">
              <Button
                type="button"
                className="rounded-lg bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground"
                disabled={!attentionLink.trim() || attentionImporting !== null}
                onClick={importAttentionFromLink}
              >
                {attentionImporting ? "Importing…" : "Import transcript"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Open the call in Attention and copy its URL — we'll grab the transcript from there.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}