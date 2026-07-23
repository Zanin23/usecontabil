import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VoiceMode = "browser" | "elevenlabs";

let cached: VoiceMode | null = null;
let cachedAt = 0;

/** Workspace voice mode, cached for 60s. Defaults to "browser". */
export async function getVoiceMode(): Promise<VoiceMode> {
  if (cached && Date.now() - cachedAt < 60_000) return cached;
  const { data } = await supabase
    .from("app_settings")
    .select("voice_mode")
    .maybeSingle();
  cached = (data?.voice_mode === "elevenlabs" ? "elevenlabs" : "browser") as VoiceMode;
  cachedAt = Date.now();
  return cached;
}

export function clearVoiceModeCache() { cached = null; cachedAt = 0; }

export function useVoiceMode(): VoiceMode | null {
  const [mode, setMode] = useState<VoiceMode | null>(cached);
  useEffect(() => {
    let alive = true;
    getVoiceMode().then((m) => { if (alive) setMode(m); });
    return () => { alive = false; };
  }, []);
  return mode;
}

/** Speak a line using the browser's built-in SpeechSynthesis. Resolves when audio ends. */
export function speakWithBrowser(text: string, opts?: { rate?: number; pitch?: number }): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) { resolve(); return; }
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = opts?.rate ?? 1;
      u.pitch = opts?.pitch ?? 1;
      // Prefer a natural-sounding English voice when available.
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find((v) => /en-US|en_GB|en-GB/.test(v.lang) && /natural|google|samantha|daniel/i.test(v.name))
        ?? voices.find((v) => v.lang?.startsWith("en"));
      if (preferred) u.voice = preferred;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    } catch { resolve(); }
  });
}

/** Cancel any in-flight browser speech. */
export function cancelBrowserSpeech() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try { window.speechSynthesis.cancel(); } catch { /* noop */ }
  }
}
