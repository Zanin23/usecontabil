import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { Button, Card, CardContent, Badge, Progress, Sheet, SheetContent, SheetHeader, SheetTitle } from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { Mic, PhoneOff, Sparkles, ArrowLeft, ClipboardCheck, ChevronDown, Pencil } from "lucide-react";
import type { RolePlay } from "@/lib/rolePlay";
import { resolveHeadshot, inferGender } from "@/lib/headshots";
import { resolveVoiceId } from "@/lib/voicePool";
import { useVoiceMode, speakWithBrowser, cancelBrowserSpeech } from "@/lib/voiceMode";
// VoiceAgentCall removed — template uses the standard mark-tts pipeline only.
import { useAuthUser } from "@/lib/useAuthUser";


type Difficulty = "easy" | "standard" | "hard";
type Turn = { role: "agent" | "user"; text: string; at: number };
type DimLive = { score: number; summary: string; working: string[]; improve: string[] };
type LiveScores = Record<string, DimLive>;

type SR = {
  continuous: boolean; interimResults: boolean; lang: string;
  onstart?: (() => void) | null;
  onaudiostart?: (() => void) | null;
  onresult: ((e: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] & { length: number } }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void; stop: () => void; abort?: () => void;
};
type SRCtor = new () => SR;
type WindowWithSR = typeof window & { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };

const isEmbeddedWindow = () => {
  if (typeof window === "undefined") return false;
  try { return window.self !== window.top; } catch { return true; }
};

const micPolicyAllows = () => {
  if (typeof document === "undefined") return true;
  const doc = document as Document & {
    permissionsPolicy?: { allowsFeature?: (feature: string) => boolean };
    featurePolicy?: { allowsFeature?: (feature: string) => boolean };
  };
  try { return doc.permissionsPolicy?.allowsFeature?.("microphone") ?? doc.featurePolicy?.allowsFeature?.("microphone") ?? true; } catch { return true; }
};

const readMicPermission = async () => {
  try {
    const result = await navigator.permissions?.query({ name: "microphone" as PermissionName });
    return result?.state ?? "unknown";
  } catch { return "unknown"; }
};

const speechErrorMessage = async (error: string) => {
  if (error === "audio-capture") return "Microphone capture failed — check your browser/system mic input, then try again.";
    if (error === "not-allowed" || error === "service-not-allowed") {
      const permission = await readMicPermission();
      if (permission === "granted") return "Speech recognition needs a fresh click to resume. Click Retry microphone to continue.";
      return "Microphone blocked — allow mic access for this exact tab/site, then try again.";
    }
  if (error === "network") return "Speech recognition lost connection — refresh and try again.";
  return `Microphone error: ${error}`;
};

export default function Call() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuthUser();
  const voiceMode = useVoiceMode();
  const isBrowserVoice = voiceMode === "browser";
  useEffect(() => {
    if (!authLoading && !user) {
      nav(`/auth?redirect=/call/${sessionId ?? ""}`, { replace: true });
    }
  }, [authLoading, user, nav, sessionId]);
  const [rolePlay, setRolePlay] = useState<RolePlay | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("standard");
  const [rehearsal, setRehearsal] = useState<{
    parentSessionId: string;
    dimensionKey: string;
    dimensionLabel: string;
    systemPromptOverride: string;
    openingLineOverride: string;
  } | null>(null);
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState<"idle" | "roleplay" | "choosing" | "coach" | "ending">("idle");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [liveScores, setLiveScores] = useState<LiveScores | null>(null);
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [briefOpen, setBriefOpen] = useState(true);
  
  const [starting, setStarting] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const startingRef = useRef(false);
  const openerAudioRef = useRef<{ text: string; url: string } | null>(null);

  const transcriptRef = useRef<Turn[]>([]);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef<number>(Date.now());
  const recogRef = useRef<SR | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const phaseRef = useRef(phase);
  const scoringInflight = useRef(false);
  const lastScoredLen = useRef(0);
  const pendingUserTextRef = useRef("");
  const silenceTimerRef = useRef<number | null>(null);
  const speakingRef = useRef(false);
  const thinkingRef = useRef(false);
  const manualStopRef = useRef(false);
  const micBlockedRef = useRef(false);
  const listenRestartTimerRef = useRef<number | null>(null);
  const pendingSpeechRestartRef = useRef(false);
  const recognitionEverStartedRef = useRef(false);
  const recognitionRunIdRef = useRef(0);
  const playQueueRef = useRef<Promise<void>>(Promise.resolve());
  const activeAudiosRef = useRef<HTMLAudioElement[]>([]);
  const abortStreamRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  

  useEffect(() => {
    const el = transcriptScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript]);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { speakingRef.current = speaking; }, [speaking]);
  useEffect(() => { thinkingRef.current = thinking; }, [thinking]);
  const resolvedVoiceId = useMemo(() => {
    if (!rolePlay) return undefined;
    return resolveVoiceId(rolePlay.id, rolePlay.voice_id ?? rolePlay.persona?.voice_id, rolePlay.persona);
  }, [rolePlay]);

  const effectiveOpeningLine = useMemo(() => rolePlay?.opening_line || "", [rolePlay]);
  const effectiveSystemPrompt = useMemo(() => rolePlay?.system_prompt || "", [rolePlay]);

  const clearListenRestartTimer = useCallback(() => {
    if (!listenRestartTimerRef.current) return;
    window.clearTimeout(listenRestartTimerRef.current);
    listenRestartTimerRef.current = null;
  }, []);

  const failMic = useCallback((message: string) => {
    micBlockedRef.current = true;
    manualStopRef.current = true;
    pendingSpeechRestartRef.current = false;
    clearListenRestartTimer();
    setListening(false);
    setMicError(message);
    toast.error(message);
  }, [clearListenRestartTimer]);

  const promptMicRetry = useCallback((message = "Speech recognition needs a fresh click to resume. Click Retry microphone to continue.") => {
    micBlockedRef.current = true;
    manualStopRef.current = true;
    pendingSpeechRestartRef.current = false;
    clearListenRestartTimer();
    setListening(false);
    setMicError(message);
  }, [clearListenRestartTimer]);

  const handleRecognitionStartFailure = useCallback((error: unknown) => {
    const err = error as { name?: string; message?: string };
    console.warn("[speech] start failed", { name: err?.name, message: err?.message });
    if (err?.name === "InvalidStateError") return;
    promptMicRetry(err?.name === "NotAllowedError" || err?.name === "SecurityError"
      ? "Speech recognition needs a fresh click to resume. Click Retry microphone to continue."
      : "Speech recognition paused. Click Retry microphone to continue.");
  }, [promptMicRetry]);

  const openStandaloneCall = useCallback(() => {
    const opened = window.open(window.location.href, "_blank");
    if (!opened) {
      toast.error("Pop-up blocked — open this role-play in a new tab to allow microphone access.");
      return;
    }
    try { opened.opener = null; } catch { /* noop */ }
    try { opened.focus(); } catch { /* noop */ }
    toast.message("Opened in a new tab — click Start role-play there to allow the microphone.");
  }, []);


  // Hard teardown on unmount: cancel any in-flight stream, stop all queued
  // audio, and clear the play chain so we don't leak HTMLAudio elements or
  // keep speaking after the user has navigated away.
  useEffect(() => () => {
    cancelledRef.current = true;
    try { abortStreamRef.current?.abort(); } catch { /* noop */ }
    try { audioRef.current?.pause(); } catch { /* noop */ }
    for (const a of activeAudiosRef.current) { try { a.pause(); } catch { /* noop */ } }
    activeAudiosRef.current = [];
    playQueueRef.current = Promise.resolve();
  }, []);


  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      const { data: sess, error } = await supabase
        .from("sessions")
        .select("difficulty, role_play_id, parent_session_id, rehearsal_dimension, rehearsal_context")
        .eq("id", sessionId)
        .single();
      if (error || !sess) { toast.error("Session not found"); nav("/"); return; }
      setDifficulty(sess.difficulty as Difficulty);
      if (!sess.role_play_id) { toast.error("This session has no role-play attached"); nav("/"); return; }
      const { data: rp, error: rpErr } = await supabase.from("role_plays").select("*").eq("id", sess.role_play_id).single();
      if (rpErr || !rp) { toast.error("Role-play missing"); nav("/"); return; }
      const baseRp = rp as unknown as RolePlay;
      const ctx = (sess as { parent_session_id?: string | null; rehearsal_dimension?: string | null; rehearsal_context?: Record<string, unknown> | null }).rehearsal_context;
      const parentId = (sess as { parent_session_id?: string | null }).parent_session_id;
      if (parentId && ctx) {
        const sysOverride = (ctx.system_prompt_override as string) || baseRp.system_prompt;
        const openOverride = (ctx.opening_line_override as string) || baseRp.opening_line;
        const dim = (ctx.dimension as { key: string; label: string } | undefined);
        setRolePlay({ ...baseRp, system_prompt: sysOverride, opening_line: openOverride });
        setRehearsal({
          parentSessionId: parentId,
          dimensionKey: dim?.key ?? (sess as { rehearsal_dimension?: string }).rehearsal_dimension ?? "",
          dimensionLabel: dim?.label ?? "this moment",
          systemPromptOverride: sysOverride,
          openingLineOverride: openOverride,
        });
      } else {
        setRolePlay(baseRp);
      }
    })();
  }, [sessionId, nav]);

  useEffect(() => {
    if (phase === "idle") { setElapsed(0); return; }
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [phase]);


  // Prefetch the opening-line TTS as soon as the role-play loads, so the
  // first click on "Start role-play" only pays for the mic permission +
  // audio.play() — not a 1-3s ElevenLabs round-trip.
  useEffect(() => {
    if (!rolePlay || phase !== "idle") return;
    if (isBrowserVoice) return; // no server prefetch in browser-voice mode
    const text = effectiveOpeningLine || `Hey, thanks for jumping on the call. How do you want to run this?`;
    if (openerAudioRef.current?.text === text) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("mark-tts", {
          body: { text, voiceId: resolvedVoiceId },
        });
        if (cancelled || error || !data?.audio) return;
        openerAudioRef.current = { text, url: `data:audio/mpeg;base64,${data.audio}` };
      } catch { /* prefetch is best-effort */ }
    })();
    return () => { cancelled = true; };
  }, [rolePlay, phase, resolvedVoiceId, effectiveOpeningLine, isBrowserVoice]);


  const pushTurn = (turn: Turn) => {
    transcriptRef.current = [...transcriptRef.current, turn];
    setTranscript(transcriptRef.current);
  };

  const speak = useCallback(async (text: string) => {
    try {
      speakingRef.current = true;
      setSpeaking(true);
      if (isBrowserVoice) {
        await speakWithBrowser(text);
        return;
      }
      // Use the prefetched opener audio if it matches — eliminates the
      // TTS round-trip from the click-to-voice latency on session start.
      let url: string;
      const cached = openerAudioRef.current;
      if (cached && cached.text === text) {
        url = cached.url;
        openerAudioRef.current = null; // one-shot
      } else {
        const { data, error } = await supabase.functions.invoke("mark-tts", {
          body: { text, voiceId: resolvedVoiceId },
        });
        if (error || !data?.audio) throw new Error(error?.message ?? "TTS failed");
        url = `data:audio/mpeg;base64,${data.audio}`;
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Voice failed");
    } finally {
      speakingRef.current = false;
      setSpeaking(false);
      audioRef.current = null;
    }
  }, [resolvedVoiceId, isBrowserVoice]);


  const enqueueAudio = useCallback((b64: string) => {
    if (cancelledRef.current) return Promise.resolve();
    const audio = new Audio(`data:audio/mpeg;base64,${b64}`);
    activeAudiosRef.current.push(audio);
    playQueueRef.current = playQueueRef.current.then(
      () => new Promise<void>((resolve) => {
        if (cancelledRef.current) { resolve(); return; }
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      }),
    );
    return playQueueRef.current;
  }, []);

  const stopAllAudio = useCallback(() => {
    cancelledRef.current = true;
    try { abortStreamRef.current?.abort(); } catch { /* noop */ }
    for (const a of activeAudiosRef.current) { try { a.pause(); } catch { /* noop */ } }
    activeAudiosRef.current = [];
    playQueueRef.current = Promise.resolve();
    cancelBrowserSpeech();
  }, []);


  const askMarkStreaming = useCallback(async (mode: "roleplay" | "coach" = "roleplay") => {
    if (!rolePlay) return;
    cancelledRef.current = false;
    const ac = new AbortController();
    abortStreamRef.current = ac;
    setThinking(true);
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mark-respond`;
    const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const { data: sess } = await supabase.auth.getSession();
    const accessToken = sess?.session?.access_token ?? anon;
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: anon,
        },
        body: JSON.stringify({
          transcript: transcriptRef.current,
          systemPrompt: effectiveSystemPrompt,
          difficultyOverlay: rolePlay.difficulty_overlays?.[difficulty] ?? "",
          voiceId: resolvedVoiceId,
          mode,
          scorecard: mode === "coach" ? rolePlay.scorecard : undefined,
          liveScores: mode === "coach" ? liveScores ?? undefined : undefined,
          buyerName: rolePlay.persona?.first_name,
          voiceMode: isBrowserVoice ? "browser" : "elevenlabs",
        }),
        signal: ac.signal,
      });
      if (!resp.ok || !resp.body) throw new Error(`Stream failed (${resp.status})`);
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let firstAudio = true;
      let fullReply = "";
      let lastPlay: Promise<void> = Promise.resolve();
      while (true) {
        if (cancelledRef.current) { try { reader.cancel(); } catch { /* noop */ } break; }
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          let evt: { type: string; b64?: string; text?: string; reply?: string; message?: string };
          try { evt = JSON.parse(line.slice(5).trim()); } catch { continue; }
          if (evt.type === "audio" && evt.b64) {
            if (firstAudio) { firstAudio = false; setThinking(false); setSpeaking(true); }
            fullReply += (fullReply ? " " : "") + (evt.text ?? "");
            lastPlay = enqueueAudio(evt.b64);
          } else if (evt.type === "text" && evt.text) {
            if (firstAudio) { firstAudio = false; setThinking(false); setSpeaking(true); }
            fullReply += (fullReply ? " " : "") + evt.text;
            const chunk = evt.text;
            lastPlay = lastPlay.then(() => cancelledRef.current ? Promise.resolve() : speakWithBrowser(chunk));
          } else if (evt.type === "error") {
            toast.error(evt.message ?? "Stream error");
          } else if (evt.type === "done") {
            if (evt.reply) fullReply = evt.reply;
          }
        }
      }
      if (!cancelledRef.current && fullReply.trim()) pushTurn({ role: "agent", text: fullReply.trim(), at: Date.now() });
      if (!cancelledRef.current) await lastPlay;
    } catch (e) {
      if (!cancelledRef.current) toast.error(e instanceof Error ? e.message : "Reply failed");
    } finally {
      setThinking(false);
      setSpeaking(false);
      abortStreamRef.current = null;
    }
  }, [difficulty, rolePlay, enqueueAudio, liveScores, effectiveSystemPrompt, resolvedVoiceId, isBrowserVoice]);


  const commitUserTurn = useCallback(() => {
    const text = pendingUserTextRef.current.trim();
    pendingUserTextRef.current = "";
    if (silenceTimerRef.current) { window.clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (!text) return;
    pushTurn({ role: "user", text, at: Date.now() });
    askMarkStreaming(phaseRef.current === "coach" ? "coach" : "roleplay");
  }, [askMarkStreaming]);

  const startListening = useCallback(() => {
    if (micBlockedRef.current) return;
    const w = window as WindowWithSR;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { toast.error("Browser speech recognition not supported. Try Chrome."); return; }
    const runId = recognitionRunIdRef.current + 1;
    recognitionRunIdRef.current = runId;
    clearListenRestartTimer();
    setMicError(null);
    if (recogRef.current) { try { recogRef.current.abort?.(); } catch { /* noop */ } }
    const r = new Ctor();
    r.continuous = true; r.interimResults = true; r.lang = "en-US";
    r.onstart = () => { recognitionEverStartedRef.current = true; setListening(true); console.info("[speech] start"); };
    r.onaudiostart = () => { recognitionEverStartedRef.current = true; console.info("[speech] audio-start"); };
    r.onresult = (e) => {
      if (speakingRef.current || thinkingRef.current) return;
      let finalChunk = ""; let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]; const txt = res[0].transcript;
        if (res.isFinal) finalChunk += txt; else interim += txt;
      }
      if (finalChunk) pendingUserTextRef.current = (pendingUserTextRef.current + " " + finalChunk).trim();
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      if (pendingUserTextRef.current || interim) {
        // End-of-utterance detection: wait long enough that natural mid-sentence
        // pauses (breath, "umm", thinking) don't trigger a premature commit.
        // Browser SpeechRecognition emits interim results every ~200-500ms, and
        // anything under ~1s feels like a barge-in to the user. Use a shorter
        // wait only when the trailing text ends with sentence-ending punctuation.
        const endsWithPunct = /[.!?]\s*$/.test(pendingUserTextRef.current);
        const wait = endsWithPunct ? 900 : 1500;
        silenceTimerRef.current = window.setTimeout(() => { commitUserTurn(); }, wait);
      }
    };
    r.onend = () => {
      console.info("[speech] end", {
        manualStop: manualStopRef.current,
        micBlocked: micBlockedRef.current,
        phase: phaseRef.current,
        speaking: speakingRef.current,
        thinking: thinkingRef.current,
      });
      setListening(false);
      if (runId !== recognitionRunIdRef.current) return;
      if (!manualStopRef.current && !micBlockedRef.current && (phaseRef.current === "roleplay" || phaseRef.current === "coach")) {
        if (speakingRef.current || thinkingRef.current) {
          pendingSpeechRestartRef.current = true;
          return;
        }
        clearListenRestartTimer();
        listenRestartTimerRef.current = window.setTimeout(() => {
          if (runId !== recognitionRunIdRef.current || manualStopRef.current || micBlockedRef.current || (phaseRef.current !== "roleplay" && phaseRef.current !== "coach")) return;
          try { r.start(); } catch (err) { handleRecognitionStartFailure(err); }
        }, 500);
      }
    };
    r.onerror = async (e) => {
      console.error("[speech] error", e.error);
      if (e.error === "no-speech" || e.error === "aborted") return;
      if ((e.error === "not-allowed" || e.error === "service-not-allowed") && recognitionEverStartedRef.current) {
        promptMicRetry(await speechErrorMessage(e.error));
        return;
      }
      failMic(await speechErrorMessage(e.error));
    };
    recogRef.current = r;
    manualStopRef.current = false;
    pendingSpeechRestartRef.current = false;
    recognitionEverStartedRef.current = false;
    try { r.start(); } catch (err) { setListening(false); handleRecognitionStartFailure(err); }
  }, [clearListenRestartTimer, commitUserTurn, failMic, handleRecognitionStartFailure, promptMicRetry]);

  const stopListening = useCallback(() => {
    manualStopRef.current = true;
    pendingSpeechRestartRef.current = false;
    recognitionRunIdRef.current += 1;
    clearListenRestartTimer();
    if (silenceTimerRef.current) { window.clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    try { recogRef.current?.abort?.(); } catch { /* noop */ }
    try { recogRef.current?.stop(); } catch { /* noop */ }
    recogRef.current = null;
    setListening(false);
  }, [clearListenRestartTimer]);

  useEffect(() => {
    if ((phase !== "roleplay" && phase !== "coach") || speaking || thinking || listening || manualStopRef.current || micBlockedRef.current || !pendingSpeechRestartRef.current) return;
    pendingSpeechRestartRef.current = false;
    clearListenRestartTimer();
    listenRestartTimerRef.current = window.setTimeout(() => {
      if (manualStopRef.current || micBlockedRef.current || speakingRef.current || thinkingRef.current || (phaseRef.current !== "roleplay" && phaseRef.current !== "coach")) return;
      try { recogRef.current?.start(); } catch (err) { handleRecognitionStartFailure(err); }
    }, 500);
  }, [phase, speaking, thinking, listening, clearListenRestartTimer, handleRecognitionStartFailure]);

  const startSession = async () => {
    if (!rolePlay) return;
    // Guard against double-clicks: TTS and speech recognition take a moment, and
    // each extra click would re-queue the opening line.
    if (startingRef.current || phase !== "idle") return;
    startingRef.current = true;
    setStarting(true);
    micBlockedRef.current = false;
    manualStopRef.current = false;
    setMicError(null);
    clearListenRestartTimer();
    void readMicPermission().then((permission) => console.info("[speech] environment", {
      embedded: isEmbeddedWindow(),
      micPolicyAllows: micPolicyAllows(),
      permission,
      origin: window.location.origin,
    }));
    startListening();
    startRef.current = Date.now();
    setPhase("roleplay");
    const opener = effectiveOpeningLine || `Hey, thanks for jumping on the call. How do you want to run this?`;
    pushTurn({ role: "agent", text: opener, at: Date.now() });
    // Release the button as soon as the request is in flight — phase===roleplay
    // already prevents re-entry, and the cached opener typically plays instantly.
    setStarting(false);
    void speak(opener);
  };

  // Live scoring
  useEffect(() => {
    if (phase !== "roleplay" || !rolePlay) return;
    const tick = async () => {
      if (scoringInflight.current) return;
      if (transcriptRef.current.length === lastScoredLen.current) return;
      if (transcriptRef.current.length < 2) return;
      scoringInflight.current = true;
      lastScoredLen.current = transcriptRef.current.length;
      try {
        const { data, error } = await supabase.functions.invoke("score-live", {
          body: {
            transcript: transcriptRef.current,
            difficulty,
            categories: rolePlay.scorecard.categories,
            buyerName: rolePlay.persona?.first_name,
          },
        });
        if (!error && data?.scores) setLiveScores(data.scores as LiveScores);
      } catch { /* silent */ } finally {
        scoringInflight.current = false;
      }
    };
    const interval = setInterval(tick, 60_000);
    const initial = setTimeout(tick, 30_000);
    return () => { clearInterval(interval); clearTimeout(initial); };
  }, [phase, difficulty, rolePlay]);

  const endRoleplay = async () => {
    stopListening();
    try { audioRef.current?.pause(); } catch { /* noop */ }
    stopAllAudio();
    setPhase("choosing");
  };

  const startCoaching = async () => {
    setPhase("coach");
    // Re-enable auto-listen for coach mode — stopListening() earlier set the
    // manual-stop flag which would otherwise prevent the mic from coming
    // back on after the coach's opening turn.
    manualStopRef.current = false;
    await askMarkStreaming("coach");
    if (!micBlockedRef.current && phaseRef.current === "coach") startListening();
  };

  const submitAndScore = async () => {
    if (!rolePlay) return;
    setPhase("ending");
    stopListening();
    try { audioRef.current?.pause(); } catch { /* noop */ }
    stopAllAudio();
    const duration = Math.floor((Date.now() - startRef.current) / 1000);
    const finalTranscript = transcriptRef.current;
    try {
      await supabase.from("sessions").update({
        ended_at: new Date().toISOString(),
        duration_seconds: duration,
        transcript: finalTranscript,
        status: "completed",
      }).eq("id", sessionId!);
      const { error } = await supabase.functions.invoke("score-session", {
        body: {
          sessionId,
          transcript: finalTranscript,
          difficulty,
          selfAssessment: null,
          categories: rolePlay.scorecard.categories,
          redFlagExamples: rolePlay.scorecard.red_flag_examples,
          greenFlagExamples: rolePlay.scorecard.green_flag_examples,
          buyerName: rolePlay.persona?.first_name,
        },
      });
      if (error) throw error;
      nav(`/session/${sessionId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scoring failed");
      nav(`/session/${sessionId}`);
    }
  };

  const mins = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const secs = (elapsed % 60).toString().padStart(2, "0");
  const orbState = useMemo(() => {
    if (speaking) return "speaking";
    if (thinking) return "thinking";
    if (listening) return "listening";
    return "idle";
  }, [speaking, thinking, listening]);

  if (!rolePlay) {
    return <div className="min-h-screen bg-aurora flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  // ElevenLabs Agents path stripped in template — always use the standard pipeline.

  const buyerName = rolePlay.persona?.first_name || "Buyer";
  const headshot = resolveHeadshot(rolePlay.id, rolePlay.persona?.headshot_url, inferGender(rolePlay.persona), rolePlay.persona?.headshot_index);
  const HeadshotImg = ({ size }: { size: number }) => (
    <img src={headshot} alt={buyerName} width={size} height={size} style={{ width: size, height: size }} className="rounded-full object-cover" />
  );

  const categories = rolePlay.scorecard.categories;
  const openDim = openCat ? liveScores?.[openCat] : null;

  return (
    <div className="min-h-screen bg-aurora flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-lg"
            onClick={() => {
              if (phase === "roleplay" || phase === "coach" || phase === "choosing") {
                if (!confirm("Leave the call? Your progress won't be saved.")) return;
              }
              stopListening();
              
              try { audioRef.current?.pause(); } catch { /* noop */ }
              stopAllAudio();
              nav(rolePlay?.role ? `/library/${rolePlay.role}` : "/");
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />Home
          </Button>
          <HeadshotImg size={40} />
          <div>
            <div className="text-sm font-medium">{buyerName} · {rolePlay.persona?.company}</div>
            <Badge className="rounded-lg capitalize text-xs bg-brand-orange/10 text-brand-orange border border-brand-orange/20 hover:bg-brand-orange/10">{difficulty}</Badge>
          </div>
        </div>
        <div className="font-display text-2xl tabular-nums">{mins}:{secs}</div>
      </header>

      <main className={`flex-1 max-w-7xl mx-auto w-full px-6 pb-8 gap-6 ${phase === "idle" ? "flex flex-col" : "grid lg:grid-cols-[minmax(0,1fr)_380px]"}`}>
        <div className="flex flex-col items-center justify-start gap-6 pt-4 min-w-0">
          {phase === "idle" && (
            <div className="w-full max-w-3xl mt-6 space-y-8">
              <div className="text-center space-y-3">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">The scenario</div>
                <h1 className="font-display text-4xl sm:text-5xl leading-[1.05]">
                  <span className="text-brand-orange">{rolePlay.name}</span>
                </h1>
                <p className="text-muted-foreground text-base max-w-xl mx-auto">{rolePlay.topic}</p>
                <div className="pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    onClick={() => nav(`/edit/${rolePlay.id}`)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit role-play
                  </Button>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4">
                <Button onClick={startSession} disabled={starting} className="rounded-lg bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground h-14 px-8 text-base disabled:opacity-70">
                  <Mic className="h-5 w-5 mr-2" /> {starting ? "Starting…" : "Start role-play"}
                </Button>
                {micError && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="max-w-md text-center text-xs text-destructive">
                      {micError}
                    </div>
                    <Button
                      variant="outline"
                      className="rounded-lg"
                      onClick={() => {
                        micBlockedRef.current = false;
                        manualStopRef.current = false;
                        pendingSpeechRestartRef.current = false;
                        setMicError(null);
                        startListening();
                      }}
                    >
                      Retry microphone
                    </Button>
                  </div>
                )}
              </div>

              <Card className="rounded-xl shadow-elevated overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 px-6 py-5 bg-gradient-soft border-b border-border">
                    <HeadshotImg size={56} />
                    <div className="min-w-0">
                      <div className="font-medium text-base truncate">{buyerName} · {rolePlay.persona?.title}</div>
                      <div className="text-muted-foreground text-xs truncate">{rolePlay.persona?.company} · {rolePlay.role} role-play</div>
                    </div>
                  </div>
                  <div className="px-6 py-6 text-[15px] leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
                    {rolePlay.scenario_brief}
                  </div>
                </CardContent>
              </Card>

              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-2xl bg-card border border-border p-4 shadow-card">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">1. Talk</div>
                  <div className="text-foreground/80">Hit start and just speak — {buyerName} replies when you pause.</div>
                </div>
                <div className="rounded-2xl bg-card border border-border p-4 shadow-card">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">2. Track</div>
                  <div className="text-foreground/80">The live scorecard updates every minute as you go.</div>
                </div>
                <div className="rounded-2xl bg-card border border-border p-4 shadow-card">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">3. Debrief</div>
                  <div className="text-foreground/80">End the call and {buyerName} switches to coach mode.</div>
                </div>
              </div>

              <div className="text-center space-y-2">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">You'll be scored on</div>
                <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
                  {categories.map((c) => (
                    <span key={c.key} className="rounded-lg bg-card border border-border px-3 py-1 text-xs text-foreground/80 shadow-card">
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {phase !== "idle" && (
            <>
              <div className="relative mt-6">
                <div className={`w-56 h-56 rounded-lg transition-all duration-300 ${
                  orbState === "speaking" ? "bg-gradient-brand shadow-glow scale-105" :
                  orbState === "thinking" ? "bg-card shadow-elevated animate-pulse" :
                  orbState === "listening" ? "bg-card shadow-elevated ring-4 ring-brand-orange/40 animate-pulse-soft" :
                  "bg-card shadow-card"
                }`} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <HeadshotImg size={160} />
                </div>
              </div>
              <div className="text-sm text-muted-foreground h-5">
                {orbState === "speaking" ? `${buyerName} is speaking…` :
                 orbState === "thinking" ? `${buyerName} is thinking…` :
                 orbState === "listening" ? "Listening…" : "Your turn"}
              </div>

              {micError && (
                <div className="flex flex-col items-center gap-2 max-w-md text-center">
                  <div className="text-xs text-destructive">{micError}</div>
                  <Button
                    variant="outline"
                    className="rounded-lg"
                    onClick={() => {
                      micBlockedRef.current = false;
                      manualStopRef.current = false;
                      setMicError(null);
                      startListening();
                    }}
                  >
                    Retry microphone
                  </Button>
                </div>
              )}

              {phase === "roleplay" && (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button onClick={endRoleplay} variant="outline" className="rounded-lg h-14 px-6">
                    <PhoneOff className="h-5 w-5 mr-2" /> End call
                  </Button>
                </div>
              )}

              {phase === "coach" && (
                <Card className="rounded-2xl w-full max-w-xl shadow-elevated">
                  <CardContent className="p-6 space-y-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                      <Sparkles className="h-4 w-4 text-brand-orange" /> Coach mode · {buyerName} stepped out of character
                    </div>
                    <p className="text-sm text-foreground/85">
                      {orbState === "speaking" ? `${buyerName} is coaching you — just listen, then respond out loud.` :
                       orbState === "thinking" ? `${buyerName} is thinking through your answer…` :
                       `Just talk back out loud — answer their question, push back, or ask for a re-do. When you're done debriefing, hit the button below to grade the call.`}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button onClick={submitAndScore} className="flex-1 rounded-lg bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground h-12">
                        <ClipboardCheck className="h-5 w-5 mr-2" /> End debrief & grade my call
                      </Button>
                    </div>
                    <div className="text-[11px] text-muted-foreground">This ends coaching and takes you to your full scorecard.</div>
                  </CardContent>
                </Card>
              )}

              {phase === "choosing" && (
                <Card className="rounded-2xl w-full max-w-xl shadow-elevated">
                  <CardContent className="p-6 space-y-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                      <Sparkles className="h-4 w-4 text-brand-orange" /> Call complete
                    </div>
                    <p className="text-sm text-foreground/85">
                      Want a quick debrief with {buyerName} first, or jump straight to your scorecard?
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button onClick={startCoaching} variant="outline" className="flex-1 rounded-lg h-12">
                        <Sparkles className="h-5 w-5 mr-2" /> Quick coaching chat
                      </Button>
                      <Button onClick={submitAndScore} className="flex-1 rounded-lg bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground h-12">
                        <ClipboardCheck className="h-5 w-5 mr-2" /> View my scorecard
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {phase === "ending" && (
                <div className="text-sm text-muted-foreground animate-pulse">Scoring your call…</div>
              )}


              <Card ref={transcriptScrollRef} className="rounded-2xl w-full max-w-2xl shadow-card max-h-64 overflow-y-auto">
                <CardContent className="p-4 space-y-2">
                  {transcript.length === 0 ? <p className="text-sm text-muted-foreground">Transcript will appear here.</p> : (
                    transcript.map((t, i) => (
                      <div key={i} className="text-sm">
                        <span className={t.role === "agent" ? "text-brand-orange font-medium" : "text-foreground font-medium"}>{t.role === "agent" ? buyerName : "You"}:</span>{" "}
                        <span className="text-foreground">{t.text}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {phase !== "idle" && (
          <aside className="space-y-2 lg:sticky lg:top-4 lg:self-start min-w-0">
            <Card className="rounded-2xl shadow-card">
              <CardContent className="p-0">
                <button
                  type="button"
                  onClick={() => setBriefOpen((v) => !v)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">Scenario</div>
                    <div className="text-sm font-medium truncate">{rolePlay.name}</div>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${briefOpen ? "rotate-180" : ""}`} />
                </button>
                {briefOpen && (
                  <div className="px-4 pb-4 text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap break-words border-t border-border pt-3">
                    {rolePlay.scenario_brief}
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground px-1 pt-2">Live scorecard</div>
            {categories.map((c) => {
              const d = liveScores?.[c.key];
              const hasScore = !!d;
              return (
                <button key={c.key} onClick={() => hasScore && setOpenCat(c.key)} disabled={!hasScore} className="w-full text-left">
                  <Card className={`rounded-2xl shadow-card transition ${hasScore ? "hover:shadow-elevated cursor-pointer" : "opacity-60"}`}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="text-sm font-medium flex-1 leading-snug">{c.label}</div>
                        <div className="font-display text-base tabular-nums shrink-0">
                          {d?.score ?? "—"}<span className="text-[10px] text-muted-foreground">/5</span>
                        </div>
                      </div>
                      <Progress value={(d?.score ?? 0) * 20} className="h-1.5" />
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </aside>
        )}
      </main>

      <Sheet open={!!openCat} onOpenChange={(o) => !o && setOpenCat(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">{categories.find((c) => c.key === openCat)?.label}</SheetTitle>
          </SheetHeader>
          {openDim && (
            <div className="space-y-6 mt-6">
              <div className="flex items-baseline gap-2">
                <div className="font-display text-5xl">{openDim.score}</div>
                <div className="text-muted-foreground">/ 5</div>
              </div>
              <p className="text-sm">{openDim.summary}</p>
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-widest text-success">What's working</div>
                {openDim.working?.length ? <ul className="space-y-1 text-sm">{openDim.working.map((x, i) => <li key={i}>• {x}</li>)}</ul> : <p className="text-sm text-muted-foreground">Nothing yet.</p>}
              </div>
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-widest text-brand-red">What to improve</div>
                {openDim.improve?.length ? <ul className="space-y-1 text-sm">{openDim.improve.map((x, i) => <li key={i}>• {x}</li>)}</ul> : <p className="text-sm text-muted-foreground">Nothing yet.</p>}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

    </div>
  );
}
