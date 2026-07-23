import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button, Card, CardContent, Input, Label, Textarea } from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { ArrowRight, Mic, Globe2, Volume2, Check, Sparkles, Upload, FileText, Plug } from "lucide-react";
import { VOICE_PRESETS, clearVoiceCache } from "@/lib/voicePool";
import { useIsAdmin } from "@/lib/adminRole";

type Step = 1 | 2 | 3 | 4;
type Mode = "browser" | "elevenlabs";

/** First-run wizard: pick voice mode, optionally pick default ElevenLabs voice. */
export default function Setup() {
  const nav = useNavigate();
  const { isAdmin, loading, user } = useIsAdmin();
  const [step, setStep] = useState<Step>(1);
  const [mode, setMode] = useState<Mode>("browser");
  const [voiceId, setVoiceId] = useState<string>(VOICE_PRESETS[0].id);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  // Knowledge
  const [knowledge, setKnowledge] = useState("");
  const [knowledgeLoaded, setKnowledgeLoaded] = useState(false);

  useEffect(() => {
    supabase.from("app_settings").select("onboarded_at, voice_mode, default_voice_id").maybeSingle()
      .then(({ data }) => {
        setOnboarded(Boolean(data?.onboarded_at));
        if (data?.voice_mode) setMode(data.voice_mode as Mode);
        if (data?.default_voice_id) setVoiceId(data.default_voice_id);
      });
    supabase.rpc("has_any_admin").then(({ data }) => setHasAdmin(Boolean(data)));
    supabase.from("knowledge_docs").select("content").eq("slug", "global").maybeSingle()
      .then(({ data }) => { setKnowledge(data?.content ?? ""); setKnowledgeLoaded(true); });
  }, []);

  const onKnowledgeFile = async (file: File) => {
    if (file.size > 1_000_000) {
      toast.error("File is too big (max 1 MB). Try pasting the text instead.");
      return;
    }
    try {
      const text = await file.text();
      setKnowledge(text);
      toast.success(`Loaded ${file.name}`);
    } catch {
      toast.error("Couldn't read that file. Try pasting the text instead.");
    }
  };


  const preview = async (id: string) => {
    setPreviewingId(id);
    try {
      const { data, error } = await supabase.functions.invoke("mark-tts", {
        body: { text: "Hi there — this is what I'll sound like in your role-plays.", voiceId: id },
      });
      if (error || !data?.audio) throw new Error(error?.message ?? "TTS failed");
      const url = `data:audio/mpeg;base64,${data.audio}`;
      const audio = new Audio(url);
      audio.onended = () => {};
      await audio.play();
    } catch (e) {
      toast.error("Preview failed — make sure your ElevenLabs key is set first.");
    } finally {
      setPreviewingId(null);
    }
  };

  const finish = async () => {
    setSaving(true);
    try {
      if (!hasAdmin) {
        const { error: claimErr } = await supabase.rpc("claim_admin_if_unclaimed");
        if (claimErr) { toast.error(claimErr.message); return; }
      }
      const { error } = await supabase.from("app_settings").upsert({
        id: true,
        voice_mode: mode,
        default_voice_id: voiceId,
        onboarded_at: new Date().toISOString(),
      }, { onConflict: "id" });
      if (error) { toast.error(error.message); return; }
      const trimmedKnowledge = knowledge.trim();
      if (trimmedKnowledge && user) {
        const { error: kErr } = await supabase
          .from("knowledge_docs")
          .update({ content: trimmedKnowledge, updated_by: user.id })
          .eq("slug", "global");
        if (kErr) { toast.error(`Voice saved, but knowledge didn't save: ${kErr.message}`); return; }
      }
      clearVoiceCache();
      toast.success("Setup complete");
      nav("/practice");
    } finally { setSaving(false); }
  };

  if (loading || hasAdmin === null) return <div className="min-h-screen bg-aurora" />;
  const canRunSetup = isAdmin || (!hasAdmin && !!user);
  if (!canRunSetup) {
    return (
      <div className="min-h-screen bg-aurora flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="font-display text-2xl">Workspace setup</h1>
          <p className="text-muted-foreground text-sm">Only the workspace admin can run the setup wizard.</p>
          <Link to="/"><Button variant="outline" className="rounded-lg">Back home</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-aurora">
      <header className="max-w-2xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Step {step} of 4 {onboarded && "· re-running setup"}
        </div>
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">Skip</Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 pb-16 space-y-6">
        {step === 1 && (
          <Card className="rounded-xl shadow-card">
            <CardContent className="p-8 space-y-5">
              <div>
                <h1 className="font-display text-4xl">Welcome to your <span className="text-brand-orange">role-play trainer.</span></h1>
                <p className="text-muted-foreground mt-3">A few quick choices and you're done.</p>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2"><Check className="h-4 w-4 text-brand-orange mt-0.5" /> Pick how the AI buyer's voice is generated.</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-brand-orange mt-0.5" /> Try a few seed role-plays out of the box.</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-brand-orange mt-0.5" /> Invite reps and let them build their own scenarios.</li>
              </ul>
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} className="rounded-lg bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground">
                  Get started <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="rounded-xl shadow-card">
            <CardContent className="p-8 space-y-5">
              <div>
                <h2 className="font-display text-3xl">Pick a voice mode</h2>
                <p className="text-sm text-muted-foreground mt-1">You can switch any time in Admin → Settings.</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode("browser")}
                  className={`text-left rounded-2xl border p-5 transition ${mode === "browser" ? "border-brand-orange ring-2 ring-brand-orange/40 bg-card" : "border-border bg-card/60 hover:border-foreground/30"}`}
                >
                  <Globe2 className="h-5 w-5 mb-2" />
                  <div className="font-medium">Browser voice <span className="text-brand-orange text-xs ml-1">default</span></div>
                  <div className="text-xs text-muted-foreground mt-1">Free, no setup, no API key. Works out of the box and is the right choice for trying the template, demoing it, or shipping a v1 to your team.</div>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("elevenlabs")}
                  className={`text-left rounded-2xl border p-5 transition ${mode === "elevenlabs" ? "border-brand-orange ring-2 ring-brand-orange/40 bg-card" : "border-border bg-card/60 hover:border-foreground/30"}`}
                >
                  <Mic className="h-5 w-5 mb-2" />
                  <div className="font-medium">ElevenLabs <span className="text-muted-foreground text-xs ml-1">optional · pro voice quality</span></div>
                  <div className="text-xs text-muted-foreground mt-1">Lifelike voices instead of the robotic browser default. Only worth setting up once you're past the trial stage — needs the paid ElevenLabs Starter plan ($5/mo).</div>
                </button>
              </div>
              {mode === "elevenlabs" && (
                <div className="rounded-xl border bg-card/50 p-5 text-sm space-y-4">
                  <div>
                    <div className="font-medium">Connect your ElevenLabs account</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Open the workspace <span className="font-medium text-foreground">Connectors</span> screen and connect <span className="font-medium text-foreground">ElevenLabs</span>. Once connected, the key is available to every role-play automatically — nothing to paste here.
                    </p>
                  </div>

                  <div className="rounded-md border border-brand-orange/40 bg-brand-orange/10 px-3 py-2.5 text-xs text-foreground">
                    <div className="font-medium">Paid ElevenLabs plan required ($5/mo Starter)</div>
                    <div className="text-muted-foreground mt-1">
                      ElevenLabs blocks API access on the free tier — voices will fail with an "unusual activity" error until the connected account is on the <a href="https://elevenlabs.io/pricing" target="_blank" rel="noreferrer" className="underline text-foreground">Starter plan ($5/mo)</a> or higher.
                    </div>
                  </div>
                </div>
              )}


              <div className="flex justify-between pt-2">
                <Button variant="outline" className="rounded-lg" onClick={() => setStep(1)}>Back</Button>
                <Button
                  onClick={() => setStep(3)}
                  className="rounded-lg bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground"
                >
                  Continue <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>

            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="rounded-xl shadow-card">
            <CardContent className="p-8 space-y-5">
              {mode === "elevenlabs" ? (
                <>
                  <div>
                    <h2 className="font-display text-3xl">Pick a default voice</h2>
                    <p className="text-sm text-muted-foreground mt-1">All role-plays will use this voice unless you override it.</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {VOICE_PRESETS.map((v) => (
                      <div
                        key={v.id}
                        className={`rounded-2xl border p-4 transition ${voiceId === v.id ? "border-brand-orange ring-2 ring-brand-orange/40 bg-card" : "border-border bg-card/60"}`}
                      >
                        <button
                          type="button"
                          onClick={() => setVoiceId(v.id)}
                          className="text-left w-full"
                        >
                          <div className="font-medium flex items-center gap-2">
                            {v.name}
                            {voiceId === v.id && <Check className="h-4 w-4 text-brand-orange" />}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{v.blurb}</div>
                        </button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-lg mt-3"
                          disabled={previewingId === v.id}
                          onClick={() => preview(v.id)}
                        >
                          <Volume2 className="h-3.5 w-3.5 mr-1.5" />
                          {previewingId === v.id ? "Playing…" : "Preview"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h2 className="font-display text-3xl">You're all set</h2>
                    <p className="text-sm text-muted-foreground mt-1">Browser voice mode is on — nothing else to configure.</p>
                  </div>
                  <div className="rounded-xl border bg-card/50 p-4 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-brand-orange inline mr-1.5" />
                    Want lifelike voices later? Open <Link to="/admin/settings" className="underline">Admin → Settings</Link> and flip the switch.
                  </div>
                </>
              )}
              <div className="flex justify-between pt-2">
                <Button variant="outline" className="rounded-lg" onClick={() => setStep(2)}>Back</Button>
                <Button onClick={() => setStep(4)} className="rounded-lg bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground">
                  Continue <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card className="rounded-xl shadow-card">
            <CardContent className="p-8 space-y-5">
              <div>
                <h2 className="font-display text-3xl">Tell the AI about your <span className="text-brand-orange">business</span></h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Drop in a page or two about what you sell, who buys it, your pricing, your competitors — whatever helps the AI play a realistic buyer. It uses this in every role-play and every score.
                </p>
              </div>

              <details className="rounded-md border bg-background/50 px-3 py-2 text-xs">
                <summary className="cursor-pointer font-medium text-foreground">What should I put in here?</summary>
                <ul className="list-disc pl-5 text-muted-foreground space-y-1 mt-2">
                  <li>What your product or service is, in plain words</li>
                  <li>Who your typical customer is (role, company size, industry)</li>
                  <li>Common objections you hear on GTM calls</li>
                  <li>Pricing, packages, or how you charge</li>
                  <li>Competitors and how you're different</li>
                  <li>Anything else a new rep would need to know on day one</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  Don't worry about formatting — a plain text file or a GTM deck pasted in works fine. You can come back and edit it any time in Admin → Knowledge.
                </p>
              </details>

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm cursor-pointer hover:border-foreground/30 transition">
                  <Upload className="h-4 w-4" />
                  Upload a file
                  <input
                    type="file"
                    accept=".md,.markdown,.txt,text/plain,text/markdown"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onKnowledgeFile(f); e.currentTarget.value = ""; }}
                  />
                </label>
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> .txt or .md works best — or just type/paste below
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="kb" className="text-xs">Your business notes</Label>
                <Textarea
                  id="kb"
                  value={knowledge}
                  onChange={(e) => setKnowledge(e.target.value)}
                  placeholder={`Example:\n\nWe sell payroll software to US restaurants with 5–50 employees. Plans start at $49/mo. Common objection: "we already use Gusto." We win on shift scheduling + tip reporting.`}
                  className="min-h-[280px] font-mono text-xs rounded-2xl"
                  disabled={!knowledgeLoaded}
                />
                <p className="text-[11px] text-muted-foreground">
                  Optional — you can skip and add it later. The more you add, the more realistic the role-plays.
                </p>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" className="rounded-lg" onClick={() => setStep(3)}>Back</Button>
                <Button onClick={finish} disabled={saving} className="rounded-lg bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground">
                  {saving ? "Saving…" : "Finish setup"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
