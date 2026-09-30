// Conversão de números digitados (pt-BR) — uma única implementação para todo o sistema.

/**
 * Converte o texto digitado em número. Retorna `null` quando não é um número válido.
 *
 * Aceita: "1.234,56" · "1234,56" · "1234.56" (ponto decimal) · "1.5" · "0.99" ·
 *         "10.000" (milhar) · "R$ 1.234,56" · "-50,00" · "(50,00)".
 * Recusa (null): "abc" · "1,234.56" (formato misto ambíguo) · "1.2.3" · "1,2,3" · vazio.
 *
 * Antes, valorBR("1234.56") virava 123456 (×100) e "1.5" virava 15.
 */
export function parseNumeroBR(entrada: unknown): number | null {
  if (typeof entrada === "number") return Number.isFinite(entrada) ? entrada : null;
  let s = String(entrada ?? "").trim();
  if (!s) return null;

  let negativo = false;
  if (/^\(.*\)$/.test(s)) { negativo = true; s = s.slice(1, -1); }
  s = s.replace(/R\$|\s/g, "");
  if (s.startsWith("-")) { negativo = true; s = s.slice(1); }
  else if (s.startsWith("+")) s = s.slice(1);
  if (!/^[\d.,]+$/.test(s)) return null;

  const milharBR = /^\d{1,3}(\.\d{3})+$/;
  let inteiro: string;
  let decimal = "";

  if (s.includes(",")) {
    // vírgula = separador decimal; pontos só podem ser separadores de milhar
    const partes = s.split(",");
    if (partes.length > 2) return null;
    if (partes[0].includes(".") && !milharBR.test(partes[0])) return null;
    if (partes[1]?.includes(".")) return null; // "1,234.56"
    inteiro = partes[0].replace(/\./g, "");
    decimal = partes[1] ?? "";
  } else if (s.includes(".")) {
    const partes = s.split(".");
    if (partes.length === 2 && (partes[1].length !== 3 || /^0/.test(partes[0]) || partes[0] === "")) {
      // "1234.56", "1.5", "0.99", "0.500" → ponto decimal
      inteiro = partes[0];
      decimal = partes[1];
    } else if (milharBR.test(s)) {
      // "10.000", "1.234.567" → milhar (convenção brasileira)
      inteiro = s.replace(/\./g, "");
    } else {
      return null;
    }
  } else {
    inteiro = s;
  }

  const n = Number(`${inteiro || "0"}${decimal ? "." + decimal : ""}`);
  if (!Number.isFinite(n)) return null;
  return negativo ? -n : n;
}

/** Texto para editar um número no campo: vírgula decimal, sem separador de milhar. */
export function formatarNumeroBR(n: number | undefined | null): string {
  return n === undefined || n === null || !Number.isFinite(n) ? "" : String(n).replace(".", ",");
}
