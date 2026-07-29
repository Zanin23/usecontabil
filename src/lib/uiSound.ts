/**
 * Sons de interface sutis (clique e digitação).
 * Gerados via WebAudio — sem arquivos externos.
 * Preferência persistida em localStorage.
 */

const CHAVE = "usecontabil.som.ui";

let ctx: AudioContext | null = null;
let ativo = typeof window !== "undefined" ? localStorage.getItem(CHAVE) !== "off" : true;
let ultimo = 0;

const ouvintes = new Set<(v: boolean) => void>();

export function somAtivo() {
  return ativo;
}

export function definirSom(v: boolean) {
  ativo = v;
  try {
    localStorage.setItem(CHAVE, v ? "on" : "off");
  } catch {
    /* ignore */
  }
  ouvintes.forEach((f) => f(v));
  if (v) tocar("click");
}

export function assinarSom(f: (v: boolean) => void) {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

function contexto(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

type Tipo = "click" | "key" | "space";

const PERFIS: Record<Tipo, { freq: number; dur: number; vol: number; tipo: OscillatorType }> = {
  click: { freq: 620, dur: 0.05, vol: 0.035, tipo: "triangle" },
  key: { freq: 1180, dur: 0.028, vol: 0.018, tipo: "sine" },
  space: { freq: 760, dur: 0.034, vol: 0.022, tipo: "sine" },
};

export function tocar(tipo: Tipo) {
  if (!ativo) return;
  const agora = performance.now();
  if (agora - ultimo < 18) return; // evita sobreposição em digitação rápida
  ultimo = agora;

  const ac = contexto();
  if (!ac) return;

  const { freq, dur, vol, tipo: onda } = PERFIS[tipo];
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const t = ac.currentTime;

  osc.type = onda;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + dur);

  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

let instalado = false;

/** Liga os listeners globais de clique e digitação. */
export function instalarSonsUI() {
  if (instalado || typeof document === "undefined") return;
  instalado = true;

  document.addEventListener(
    "pointerdown",
    (e) => {
      const alvo = e.target as HTMLElement | null;
      if (!alvo) return;
      const interativo = alvo.closest(
        "button, a, [role='button'], [role='option'], [role='menuitem'], [role='tab'], input[type='checkbox'], input[type='radio'], select, summary, label",
      );
      if (interativo) tocar("click");
    },
    { capture: true, passive: true },
  );

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const alvo = e.target as HTMLElement | null;
      const editavel =
        alvo &&
        (alvo.tagName === "INPUT" ||
          alvo.tagName === "TEXTAREA" ||
          alvo.isContentEditable ||
          alvo.getAttribute("role") === "combobox");
      if (!editavel) return;

      if (e.key === "Enter" || e.key === "Tab") tocar("click");
      else if (e.key === " " || e.key === "Backspace") tocar("space");
      else if (e.key.length === 1) tocar("key");
    },
    { capture: true, passive: true },
  );
}
