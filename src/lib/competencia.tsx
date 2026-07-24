import { createContext, useContext, useMemo, useState, ReactNode } from "react";

export const COMPETENCIAS = [
  "2024-06", "2024-07", "2024-08", "2024-09", "2024-10", "2024-11",
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
  setCompetencia: (c: string) => void;
  isInCompetencia: (isoDate: string) => boolean;
};

const CompetenciaContext = createContext<Ctx | null>(null);

export function CompetenciaProvider({ children }: { children: ReactNode }) {
  const [competencia, setCompetencia] = useState("2024-10");
  const value = useMemo<Ctx>(
    () => ({
      competencia,
      setCompetencia,
      isInCompetencia: (isoDate: string) => isoDate.startsWith(competencia),
    }),
    [competencia],
  );
  return <CompetenciaContext.Provider value={value}>{children}</CompetenciaContext.Provider>;
}

export function useCompetencia() {
  const ctx = useContext(CompetenciaContext);
  if (!ctx) throw new Error("useCompetencia must be used within CompetenciaProvider");
  return ctx;
}
