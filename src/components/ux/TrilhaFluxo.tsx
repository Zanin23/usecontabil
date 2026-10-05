// ============================================================================
// Trilha do processo — mostra a sequência do ciclo (cadastro → lançamento →
// apuração → relatório) e destaca em que ponto o usuário está.
//
// Responde "onde eu estou no processo?" e "o que vem depois?".
// ============================================================================
import { Link, useLocation } from "react-router-dom";
import { Check } from "lucide-react";
import { cn } from "@/design-system/mj-design-system-db98fa";
import { useContexto } from "@/lib/ux/contexto";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { useCompetencia } from "@/lib/competencia";
import { avaliarFluxo, type EstadoEtapa } from "@/lib/ux/fluxo";

export function useEtapasFluxo(): EstadoEtapa[] {
  const { empresaId } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const c = useContexto(empresaId, competencia);
  return avaliarFluxo(c);
}

export default function TrilhaFluxo({
  /** Rota considerada como "passo atual" (padrão: a rota aberta). */
  rotaAtual,
  /** Máximo de etapas visíveis antes de agrupar (padrão: todas). */
  limite,
  className,
}: {
  rotaAtual?: string;
  limite?: number;
  className?: string;
}) {
  const location = useLocation();
  const atual = rotaAtual ?? location.pathname;
  const etapas = useEtapasFluxo();
  const visiveis = limite ? etapas.slice(0, limite) : etapas;

  return (
    <ol
      className={cn(
        "flex flex-wrap items-center gap-x-1 gap-y-2 text-xs",
        className,
      )}
      aria-label="Etapas do processo"
    >
      {visiveis.map((e, i) => {
        const aqui = atual === e.rota || atual.startsWith(e.rota + "/");
        return (
          <li key={e.id} className="flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground/50">→</span>}
            <Link
              to={e.rota}
              title={`${e.porque}${e.concluida ? "" : " — pendente"}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition",
                aqui
                  ? "border-primary bg-primary/10 font-medium text-primary"
                  : e.concluida
                    ? "border-success/40 text-success hover:bg-success/10"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {e.concluida ? (
                <Check className="h-3 w-3 shrink-0" />
              ) : (
                <span
                  className={cn(
                    "grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full text-[8px] font-semibold",
                    aqui ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {e.ordem}
                </span>
              )}
              {e.titulo}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
