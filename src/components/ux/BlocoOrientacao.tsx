// ============================================================================
// Bloco de orientação — o conjunto mínimo de contexto colocado no topo das
// telas: retorno ao processo de origem, "entenda esta tela" e, quando falta
// algo, o bloqueio com o botão que resolve.
//
// Um componente só para não repetir a mesma sequência em dezenas de telas.
// ============================================================================
import BloqueioDependencias from "./BloqueioDependencias";
import ContextoTela from "./ContextoTela";
import RetornoProcesso from "./RetornoProcesso";

export default function BlocoOrientacao({
  /** Título do aviso quando houver pendência. */
  titulo,
  /** `false` esconde o botão "continuar mesmo assim" (bloqueio total). */
  permitirContinuar = true,
  className,
}: {
  titulo?: string;
  permitirContinuar?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <RetornoProcesso />
      <ContextoTela />
      <BloqueioDependencias titulo={titulo} permitirContinuar={permitirContinuar} />
    </div>
  );
}
