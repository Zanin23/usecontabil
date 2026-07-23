import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button, Card, CardContent, Input, Label } from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { Volume2, Check, Mic, Globe2, Plug } from "lucide-react";
import { VOICE_PRESETS, clearVoiceCache } from "@/lib/voicePool";

type Mode = "browser" | "elevenlabs";

/** Light workspace settings — voice mode + default voice.
 *  ElevenLabs auth is provided via the workspace ElevenLabs connector. */
export default function AdminSettings() {
  const [mode, setMode] = useState<Mode>("browser");
  const [voiceId, setVoiceId] = useState<string>(VOICE_PRESETS[0].id);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [customVoiceId, setCustomVoiceId] = useState("");

  useEffect(() => {
    supabase.from("app_settings").select("voice_mode, default_voice_id").maybeSingle()
      .then(({ data }) => {
        if (data?.voice_mode) setMode(data.voice_mode as Mode);
        if (data?.default_voice_id) setVoiceId(data.default_voice_id);
      });
  }, []);

  const preview = async (id: string) => {
    setPreviewingId(id);
    try {
      const { data, error } = await supabase.functions.invoke("mark-tts", {
        body: { text: "This is your default role-play voice.", voiceId: id },
      });
      if (error || !data?.audio) throw new Error(error?.message ?? "TTS failed");
      const url = `data:audio/mpeg;base64,${data.audio}`;
      const audio = new Audio(url);
      await audio.play();
    } catch {
      toast.error("Preview failed — make sure the ElevenLabs connector is connected.");
    } finally {
      setPreviewingId(null);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const finalVoice = customVoiceId.trim() || voiceId;
      const { error } = await supabase.from("app_settings").update({
        voice_mode: mode,
        default_voice_id: finalVoice,
      }).eq("id", true);
      if (error) { toast.error(error.message); return; }
      clearVoiceCache();
      toast.success("Settings saved");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Workspace <span className="text-brand-orange">settings.</span></h1>
        <p className="text-sm text-muted-foreground mt-1">Voice mode applies to every role-play unless an admin overrides it.</p>
      </div>

      <Card className="rounded-2xl shadow-card">
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="font-display text-xl">Voice mode</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode("browser")}
              className={`text-left rounded-2xl border p-4 transition ${mode === "browser" ? "border-brand-orange ring-2 ring-brand-orange/40 bg-card" : "border-border bg-card/60"}`}
            >
              <Globe2 className="h-5 w-5 mb-2" />
              <div className="font-medium">Browser voice</div>
              <div className="text-xs text-muted-foreground mt-1">Free, robotic, no setup.</div>
            </button>
            <button
              type="button"
              onClick={() => setMode("elevenlabs")}
              className={`text-left rounded-2xl border p-4 transition ${mode === "elevenlabs" ? "border-brand-orange ring-2 ring-brand-orange/40 bg-card" : "border-border bg-card/60"}`}
            >
              <Mic className="h-5 w-5 mb-2" />
              <div className="font-medium">ElevenLabs</div>
              <div className="text-xs text-muted-foreground mt-1">Lifelike. <span className="font-medium text-foreground">Requires paid Starter plan ($5/mo)</span> — free tier is blocked from API use.</div>
            </button>
          </div>
        </CardContent>
      </Card>

      {mode === "elevenlabs" && (
        <Card className="rounded-2xl shadow-card">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Plug className="h-5 w-5 text-brand-orange" />
              <h2 className="font-display text-xl">ElevenLabs connector</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              ElevenLabs authentication is provided by the workspace <span className="font-medium text-foreground">ElevenLabs</span> connector — no key to paste here.
              Open the workspace <span className="font-medium text-foreground">Connectors</span> screen to connect, rotate, or disconnect the account.
              Once connected, the key is available to every role-play automatically.
            </p>
            <div className="rounded-md border border-brand-orange/40 bg-brand-orange/10 px-3 py-2.5 text-xs text-foreground">
              <span className="font-medium">Paid Starter plan required ($5/mo).</span>{" "}
              <span className="text-muted-foreground">ElevenLabs blocks API access on the free tier, so voices will fail until the connected account is on a paid plan.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {mode === "elevenlabs" && (
        <Card className="rounded-2xl shadow-card">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="font-display text-xl">Default voice</h2>
              <p className="text-sm text-muted-foreground">Pick one of the library voices (works on any ElevenLabs account), or paste a custom voice ID from your library.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {VOICE_PRESETS.map((v) => (
                <div
                  key={v.id}
                  className={`rounded-2xl border p-4 transition ${voiceId === v.id && !customVoiceId ? "border-brand-orange ring-2 ring-brand-orange/40 bg-card" : "border-border bg-card/60"}`}
                >
                  <button
                    type="button"
                    onClick={() => { setVoiceId(v.id); setCustomVoiceId(""); }}
                    className="text-left w-full"
                  >
                    <div className="font-medium flex items-center gap-2">
                      {v.name}
                      {voiceId === v.id && !customVoiceId && <Check className="h-4 w-4 text-brand-orange" />}
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
            <div>
              <Label>Custom voice ID (optional)</Label>
              <Input
                value={customVoiceId}
                onChange={(e) => setCustomVoiceId(e.target.value)}
                placeholder="e.g. uYXf8XasLslADfZ2MB4u — a cloned voice from your account"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground"
        >
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </div>
  );
}
