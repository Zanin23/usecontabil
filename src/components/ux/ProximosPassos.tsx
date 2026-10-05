// ============================================================================
// Próximas ações — o "e agora?" depois de salvar um registro.
//
// Em vez de devolver o usuário para uma lista sem contexto, o sistema oferece
// as continuações naturais do processo (cadastrar o endereço, lançar, voltar).
// ============================================================================
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, X, type LucideIcon } from "lucide-react";
import { Button, cn } from "@/design-system/mj-design-system-db98fa";

export type AcaoSucesso = {
  titulo: string;
  rota?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  /** Explicação curta do porquê desta ação (vira tooltip). */
  porque?: string;
  /** `true` para a ação principal (preenchida); as demais ficam em contorno. */
  principal?: boolean;
};

export default function ProximosPassos({
  titulo = "Registro salvo com sucesso",
  descricao,
  acoes,
  onFechar,
  className,
}: {
  titulo?: string;
  descricao?: string;
  acoes: AcaoSucesso[];
  onFechar?: () => void;
  className?: string;
}) {
  if (!acoes.length) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-success/40 bg-success/[0.07] p-4",
        className,
      )}
      role="status"
    >
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-success">{titulo}</div>
          {descricao && (
            <p className="mt-0.5 text-xs text-muted-foreground">{descricao}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {acoes.map((a, i) => {
              const Icone = a.icon;
              const corpo = (
                <>
                  {Icone && <Icone className="mr-1.5 h-3.5 w-3.5" />}
                  {a.titulo}
                  {i === 0 && <ArrowRight className="ml-1.5 h-3 w-3" />}
                </>
              );
              const classes = cn(
                "h-8 rounded-full px-3 text-xs",
                a.principal
                  ? "bg-brand-orange text-primary-foreground hover:bg-brand-orange/90"
                  : "",
              );
              if (a.onClick) {
                return (
                  <Button
                    key={a.titulo}
                    size="sm"
                    variant={a.principal ? "default" : "outline"}
                    className={classes}
                    onClick={a.onClick}
                    title={a.porque}
                  >
                    {corpo}
                  </Button>
                );
              }
              return (
                <Button
                  key={a.titulo}
                  asChild
                  size="sm"
                  variant={a.principal ? "default" : "outline"}
                  className={classes}
                  title={a.porque}
                >
                  <Link to={a.rota ?? "#"}>{corpo}</Link>
                </Button>
              );
            })}
          </div>
        </div>
        {onFechar && (
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="shrink-0 rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
