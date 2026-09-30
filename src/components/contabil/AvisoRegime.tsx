import { Link } from "react-router-dom";
import { CircleAlert } from "lucide-react";
import { Button } from "@/design-system/mj-design-system-db98fa";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { AVISO_REGIME_INDEFINIDO, regimeDefinido } from "@/lib/regime";
import { cn } from "@/lib/utils";

/**
 * Aparece quando a empresa selecionada ainda não tem regime tributário definido
 * (cadastros antigos gravaram "A definir"). Os cálculos seguem com Lucro Presumido
 * por padrão — o aviso deixa isso explícito em vez de silencioso.
 */
export default function AvisoRegime({ className }: { className?: string }) {
  const { empresa } = useEmpresaAtual();
  if (!empresa || regimeDefinido(empresa.regime)) return null;
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border border-warn/20 bg-warn/10 p-3 text-xs flex flex-wrap items-center justify-between gap-3",
        className,
      )}
    >
      <span className="flex items-center gap-2 text-foreground/80">
        <CircleAlert className="h-4 w-4 text-warn shrink-0" />
        {AVISO_REGIME_INDEFINIDO}
      </span>
      <Button asChild size="sm" variant="outline" className="rounded-full">
        <Link to={`/preparativos/cadastros/empresas/${empresa.id}`}>Definir regime</Link>
      </Button>
    </div>
  );
}
