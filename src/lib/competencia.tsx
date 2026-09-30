import { createContext, useContext, useMemo, useState, useEffect, ReactNode } from "react";

/** Janeiro/2024 a dezembro/2030 (antes a lista terminava em dez/2027 e o sistema ficaria sem períodos). */
export const COMPETENCIAS: string[] = Array.from({ length: 7 * 12 }, (_, i) => `${2024 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`);

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function formatCompetencia(c: string) {
  const [y, m] = c.split("-");
  return `${MESES[Number(m) - 1]}/${y}`;
}

export function competenciaBR(c: string) {
  const [y, m] = c.split("-");
  return `${m}/${y}`;
}

type Ctx = {
  competencia: string;
  competenciaFim: string | null;
  isPeriodo: boolean;
  setCompetencia: (c: string) => void;
  setCompetenciaFim: (c: string | null) => void;
  isInCompetencia: (isoDate: string) => boolean;
  competenciasNoPeriodo: string[];
};

const CompetenciaContext = createContext<Ctx | null>(null);

export function CompetenciaProvider({ children }: { children: ReactNode }) {
  const [competencia, setCompetencia] = useState(() => {
    return localStorage.getItem("usecontabil_competencia") || "2026-07";
  });
  const [competenciaFim, setCompetenciaFim] = useState<string | null>(() => {
    return localStorage.getItem("usecontabil_competencia_fim");
  });

  useEffect(() => {
    localStorage.setItem("usecontabil_competencia", competencia);
  }, [competencia]);

  useEffect(() => {
    if (competenciaFim) {
      localStorage.setItem("usecontabil_competencia_fim", competenciaFim);
    } else {
      localStorage.removeItem("usecontabil_competencia_fim");
    }
  }, [competenciaFim]);

  const competenciasNoPeriodo = useMemo(() => {
    if (!competenciaFim) return [competencia];
    const startIdx = COMPETENCIAS.indexOf(competencia);
    const endIdx = COMPETENCIAS.indexOf(competenciaFim);
    if (startIdx === -1 || endIdx === -1) return [competencia];
    
    const [low, high] = startIdx <= endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
    return COMPETENCIAS.slice(low, high + 1);
  }, [competencia, competenciaFim]);

  const value = useMemo<Ctx>(
    () => ({
      competencia,
      competenciaFim,
      isPeriodo: !!competenciaFim,
      setCompetencia,
      setCompetenciaFim,
      competenciasNoPeriodo,
      isInCompetencia: (isoDate: string) => {
        const docComp = isoDate.slice(0, 7);
        return competenciasNoPeriodo.includes(docComp);
      },
    }),
    [competencia, competenciaFim, competenciasNoPeriodo],
  );
  return <CompetenciaContext.Provider value={value}>{children}</CompetenciaContext.Provider>;
}

export function useCompetencia() {
  const ctx = useContext(CompetenciaContext);
  if (!ctx) throw new Error("useCompetencia must be used within CompetenciaProvider");
  return ctx;
}
