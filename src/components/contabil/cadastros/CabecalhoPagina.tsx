import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, type LucideIcon } from "lucide-react";
import StatusNuvem from "./StatusNuvem";

type Trilha = { rotulo: string; para?: string };

/** Trilha de navegação + título das telas de cadastros e contabilidade. */
export default function CabecalhoPagina({
  trilha, icone: Icone, titulo, descricao, acoes, children,
}: {
  trilha: Trilha[];
  icone: LucideIcon;
  titulo: string;
  descricao: string;
  acoes?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <nav aria-label="Trilha" className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link to="/dashboard" className="hover:text-foreground">Início</Link>
        {trilha.map((t) => (
          <span key={t.rotulo} className="flex items-center gap-2">
            <ChevronRight className="h-3 w-3" />
            {t.para ? <Link to={t.para} className="hover:text-foreground">{t.rotulo}</Link> : <span>{t.rotulo}</span>}
          </span>
        ))}
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{titulo}</span>
      </nav>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-border bg-card shadow-card">
            <Icone className="h-6 w-6 text-brand-orange" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {trilha.map((t) => t.rotulo).join(" · ")}
            </div>
            <h1 className="mt-1.5 font-display text-3xl sm:text-4xl">{titulo}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{descricao}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusNuvem />
              {children}
            </div>
          </div>
        </div>
        {acoes ? <div className="flex flex-wrap items-center gap-2 md:max-w-[55%] md:justify-end">{acoes}</div> : null}
      </div>
    </div>
  );
}
