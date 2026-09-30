import type { ReactNode } from "react";
import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

/** Faixa discreta para telas cujo resultado é simulado — evita que alguém tome um dado de exemplo por real. */
export default function AvisoSimulacao({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="note"
      className={cn("rounded-xl border border-warn/20 bg-warn/10 p-3 text-xs flex items-start gap-2 text-foreground/80", className)}
    >
      <FlaskConical className="h-4 w-4 text-warn shrink-0 mt-0.5" />
      <span>
        <b>Simulação interna.</b> {children}
      </span>
    </div>
  );
}
