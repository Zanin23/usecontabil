// Regime tributário da empresa.
// Regra do sistema: "A definir" (ou vazio) significa NÃO definido — nunca deve
// ser tratado como se fosse um regime escolhido.

export const REGIMES_TRIBUTARIOS = ["Simples Nacional", "Lucro Presumido", "Lucro Real", "MEI"] as const;
export type RegimeCadastro = (typeof REGIMES_TRIBUTARIOS)[number];

/** Valor gravado nos cadastros antigos, feitos quando o formulário não pedia o regime. */
export const REGIME_A_DEFINIR = "A definir";

/** Regime usado pelos cálculos quando a empresa ainda não definiu o seu. */
export const REGIME_PADRAO_CALCULO: RegimeCadastro = "Lucro Presumido";

/** `true` somente quando o texto corresponde a um regime reconhecido. */
export function regimeDefinido(valor?: string | null): boolean {
  const r = (valor ?? "").toLowerCase();
  return /simples|simei|\bmei\b|microempreendedor|presumido|\breal\b/.test(r);
}

export const AVISO_REGIME_INDEFINIDO =
  "Regime tributário não definido no cadastro da empresa — os cálculos estão usando Lucro Presumido por padrão.";
