import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merges class names with tailwind-merge and clsx.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export function diffDias(a: string, b: string) {
  return Math.round((Date.parse(a) - Date.parse(b)) / 86400000);
}

export function round(n: number) {
  return Math.round(n * 100) / 100;
}

export function moedaBR(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function brl(n: number | string) {
  const val = typeof n === "string" ? parseFloat(n) : n;
  return moedaBR(val || 0);
}


