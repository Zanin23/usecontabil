// ============================================================================
// Selo de requisito: mostra, em uma linha, se um cadastro está pronto ou falta
// e — quando falta — leva o usuário direto para resolver.
// ============================================================================
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/design-system/mj-design-system-db98fa";
import type { EstadoRequisito } from "@/lib/ux/requisitos";

export default function SeloRequisito({
  estado,
  /** `true` mostra o texto explicativo ao lado do nome. */
  detalhado = false,
  className,
}: {
  estado: EstadoRequisito;
  detalhado?: boolean;
  className?: string;
}) {
  const { ok, requisito, texto } = estado;
  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition";
  const estilo = ok
    ? "border-success/40 bg-success/10 text-success"
    : requisito.nivel === "critico"
      ? "border-destructive/45 bg-destructive/10 text-destructive"
      : "border-warn/45 bg-warn/10 text-warn";

  const corpo = (
    <>
      {ok ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className="font-medium">{requisito.titulo}</span>
      {detalhado && texto ? (
        <span className="text-muted-foreground">· {texto}</span>
      ) : null}
    </>
  );

  if (ok) {
    return <span className={cn(base, estilo, className)}>{corpo}</span>;
  }

  return (
    <Link
      to={requisito.destino}
      title={`${requisito.oQue} — clique para resolver`}
      className={cn(base, estilo, "hover:brightness-110", className)}
    >
      {corpo}
    </Link>
  );
}
