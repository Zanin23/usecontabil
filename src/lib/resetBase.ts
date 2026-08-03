// Limpeza única da base local de cadastros (protótipo).
// Mantém apenas preferências de interface (tema, som, sidebar, ambiente).
const FLAG = "usecontabil.reset.base.v1";

const PRESERVAR = [
  FLAG,
  "usecontabil.tema",
  "usecontabil.som.ui",
  "usecontabil.som.volume",
  "usecontabil.som.digitacao",
  "usecontabil.preferencias",
  "uc:sidebar",
];

export function limparBaseLocalUmaVez() {
  try {
    if (localStorage.getItem(FLAG)) return;
    const chaves: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("usecontabil.") && !PRESERVAR.includes(k)) chaves.push(k);
    }
    chaves.forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(FLAG, new Date().toISOString());
  } catch {
    /* best-effort */
  }
}
