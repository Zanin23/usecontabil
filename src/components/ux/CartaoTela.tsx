// ============================================================================
// Cartão de tela — o bloco das páginas de visão geral (catálogo de telas).
//
// O mesmo card atende os dois públicos, controlado por `comContexto`:
//   • guiado   → título, o que a tela faz e o que ainda falta cadastrar;
//   • experiente → só título e a linha curta, para bater o olho e entrar.
// ============================================================================
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Info } from "lucide-react";
import { Badge, Card, CardContent, cn } from "@/design-system/mj-design-system-db98fa";
import type { CardTela } from "@/lib/ux/visoes";

export type Accent = "orange" | "blue" | "purple" | "pink";

const accentBg: Record<Accent, string> = {
  orange: "bg-brand-orange/12",
  blue: "bg-brand-blue/12",
  purple: "bg-brand-purple/12",
  pink: "bg-brand-pink/12",
};
const accentText: Record<Accent, string> = {
  orange: "text-brand-orange",
  blue: "text-brand-blue",
  purple: "text-brand-purple",
  pink: "text-brand-pink",
};

export default function CartaoTela({
  card,
  accent = "orange",
  comContexto = true,
  mostrarGrupo = false,
  className,
}: {
  card: CardTela;
  accent?: Accent;
  /** `false` = modo experiente: o card mostra o essencial e nada além disso. */
  comContexto?: boolean;
  mostrarGrupo?: boolean;
  className?: string;
}) {
  const Icone = card.icon;
  const pendencia = card.pendencias[0];
  const outrasPendencias = card.pendencias.length - 1;

  return (
    <Link
      to={card.rota}
      data-rota={card.rota}
      data-tela={card.titulo}
      title={`${card.titulo} — ${card.oQueFaz}`}
      className="group block h-full focus-visible:outline-none"
    >
      <Card
        className={cn(
          "lift h-full rounded-xl border-border/70 transition-all duration-200 group-hover:border-primary/45 group-focus-visible:border-primary/45",
          className,
        )}
      >
        <CardContent className={cn("flex h-full flex-col gap-2", comContexto ? "p-4" : "p-3.5")}>
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "grid shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110",
                comContexto ? "h-9 w-9" : "h-8 w-8",
                accentBg[accent],
              )}
            >
              <Icone className={cn(comContexto ? "h-4 w-4" : "h-3.5 w-3.5", accentText[accent])} />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className={cn("leading-snug text-foreground", comContexto ? "text-sm font-medium" : "text-[13px] font-medium")}>
                  {card.titulo}
                </div>
                <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 -translate-x-1 translate-y-1 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:text-primary group-hover:opacity-100" />
              </div>

              {mostrarGrupo && card.grupo && (
                <div className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/80">
                  {card.grupo}
                </div>
              )}

              <p
                className={cn(
                  "mt-1 text-muted-foreground",
                  comContexto ? "text-[11px] leading-snug" : "text-[11px] leading-snug line-clamp-1",
                )}
              >
                {card.desc ?? card.oQueFaz}
              </p>
            </div>
          </div>

          {comContexto && (
            <>
              {card.temFicha && card.oQueFaz !== card.desc && (
                <p className="flex gap-1.5 text-[11px] leading-snug text-muted-foreground/90">
                  <Info className="mt-px h-3 w-3 shrink-0 text-muted-foreground/70" />
                  <span className="line-clamp-2">{card.oQueFaz}</span>
                </p>
              )}

              {(card.pendencias.length > 0 || card.alimenta.length > 0) && (
                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                  {card.pendencias.length === 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] text-success">
                      <CheckCircle2 className="h-3 w-3" />
                      pronta para uso
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]",
                        card.criticos.length
                          ? "border-destructive/45 bg-destructive/10 text-destructive"
                          : "border-warn/45 bg-warn/10 text-warn",
                      )}
                      title={pendencia?.texto}
                    >
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      falta: {pendencia?.requisito.titulo}
                      {outrasPendencias > 0 && ` +${outrasPendencias}`}
                    </span>
                  )}
                  {card.alimenta.length > 0 && (
                    <Badge
                      variant="outline"
                      className="h-5 rounded-full border-border/80 px-2 text-[10px] text-muted-foreground"
                    >
                      alimenta {card.alimenta.length}
                    </Badge>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
