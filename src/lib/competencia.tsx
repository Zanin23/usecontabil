import { createContext, useContext, useMemo, useState, ReactNode } from "react";

export const COMPETENCIAS = [
  "2024-01", "2024-02", "2024-03", "2024-04", "2024-05", "2024-06", "2024-07", "2024-08", "2024-09", "2024-10", "2024-11", "2024-12",
  "2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12",
  "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12",
  "2027-01", "2027-02", "2027-03", "2027-04", "2027-05", "2027-06", "2027-07", "2027-08", "2027-09", "2027-10", "2027-11", "2027-12",
];

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
  const [competencia, setCompetencia] = useState("2026-07");
  const [competenciaFim, setCompetenciaFim] = useState<string | null>(null);

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
