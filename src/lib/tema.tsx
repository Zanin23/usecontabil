import { useCallback, useEffect, useState } from "react";

export type Tema = "light" | "dark";
const KEY = "usecontabil.tema";

function temaInicial(): Tema {
  if (typeof window === "undefined") return "light";
  const salvo = window.localStorage.getItem(KEY);
  if (salvo === "light" || salvo === "dark") return salvo;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function aplicar(tema: Tema) {
  const root = document.documentElement;
  root.classList.toggle("dark", tema === "dark");
  root.style.colorScheme = tema;
}

/** Tema claro/escuro persistido em localStorage. */
export function useTema() {
  const [tema, setTema] = useState<Tema>(temaInicial);

  useEffect(() => {
    aplicar(tema);
    window.localStorage.setItem(KEY, tema);
  }, [tema]);

  const alternar = useCallback(() => setTema((t) => (t === "dark" ? "light" : "dark")), []);

  return { tema, setTema, alternar };
}
