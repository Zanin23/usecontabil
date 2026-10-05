// ============================================================================
// Bloqueio por dependência — substitui a "tela vazia" por uma explicação.
//
// Quando uma tela depende de cadastros que ainda não existem, o sistema diz
// exatamente o que falta e oferece o botão que resolve. Opcionalmente o
// usuário pode seguir em frente ("continuar mesmo assim") — nada é escondido.
// ============================================================================
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, CheckCircle2, Lock, ShieldAlert } from "lucide-react";
import {
  Badge, Button, Card, CardContent, cn,
} from "@/design-system/mj-design-system-db98fa";
import { useOrientacao } from "@/lib/ux/useOrientacao";
import type { EstadoRequisito } from "@/lib/ux/requisitos";

/** Monta o link de resolução preservando a rota de origem para o retorno. */
export function linkResolucao(destino: string, voltaPara: string) {
  const sep = destino.includes("?") ? "&" : "?";
  return `${destino}${sep}voltar=${encodeURIComponent(voltaPara)}`;
}

export default function BloqueioDependencias({
  /** Rota avaliada (padrão: a rota atual). */
  rota,
  /** Texto acima da lista (padrão: frase genérica). */
  titulo = "Esta funcionalidade ainda não está pronta para uso",
  /** Quando `true`, mostra o botão "continuar mesmo assim" e avisa em vez de travar. */
  permitirContinuar = false,
  /** Conteúdo renderizado quando o usuário escolhe continuar. */
  children,
  className,
}: {
  rota?: string;
  titulo?: string;
  permitirContinuar?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  const location = useLocation();
  const caminho = rota ?? location.pathname;
  const { criticos, recomendados, tela } = useOrientacao(caminho);
  const [continuar, setContinuar] = useState(false);

  // Sem pendência crítica: não há o que bloquear.
  if (criticos.length === 0) return <>{children ?? null}</>;

  if (continuar) {
    return (
      <>
        {recomendados.length > 0 && (
          <AvisoLeve estados={recomendados} className="mb-4" />
        )}
        {children ?? null}
      </>
    );
  }

  return (
    <Card className={cn("rounded-xl border-warn/40 bg-warn/[0.04]", className)}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-warn/12 text-warn">
            <ShieldAlert className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl">{titulo}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{tela.porQue}</p>
          </div>
          <Badge variant="outline" className="shrink-0 rounded-md border-warn/50 text-warn">
            {criticos.length} pendência(s)
          </Badge>
        </div>

        <div className="mt-5 space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Antes de continuar, você precisa configurar
          </p>
          {criticos.map((e) => (
            <LinhaPendencia key={e.id} estado={e} voltaPara={caminho} critica />
          ))}
        </div>

        {recomendados.length > 0 && (
          <details className="mt-4 rounded-lg border border-border/60 bg-card px-3 py-2">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              Também é recomendado configurar ({recomendados.length}) — melhora o
              resultado, mas não impede o uso
            </summary>
            <div className="mt-3 space-y-2">
              {recomendados.map((e) => (
                <LinhaPendencia key={e.id} estado={e} voltaPara={caminho} />
              ))}
            </div>
          </details>
        )}

        {permitirContinuar && (
          <div className="mt-5 flex items-center gap-3 border-t border-border/60 pt-4">
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => setContinuar(true)}
            >
              Continuar mesmo assim
            </Button>
            <span className="text-xs text-muted-foreground">
              Você poderá usar a tela, mas parte dos dados ficará incompleta.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LinhaPendencia({
  estado,
  voltaPara,
  critica = false,
}: {
  estado: EstadoRequisito;
  voltaPara: string;
  critica?: boolean;
}) {
  const { requisito, texto } = estado;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{requisito.titulo}</span>
          <Badge
            variant="outline"
            className={cn(
              "rounded-md text-[10px]",
              critica ? "border-destructive/40 text-destructive" : "border-warn/40 text-warn",
            )}
          >
            {critica ? "obrigatório" : "recomendado"}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{texto}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/80">{requisito.oQue}</p>
      </div>
      <Button
        asChild
        size="sm"
        className="shrink-0 rounded-lg bg-brand-orange text-primary-foreground hover:bg-brand-orange/90"
      >
        <Link to={linkResolucao(requisito.destino, voltaPara)}>
          {requisito.acao}
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}

/** Aviso discreto (não bloqueante) para pendências recomendadas. */
export function AvisoLeve({
  estados,
  className,
}: {
  estados: EstadoRequisito[];
  className?: string;
}) {
  const location = useLocation();
  if (!estados.length) return null;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border border-warn/35 bg-warn/[0.06] px-3 py-2 text-xs",
        className,
      )}
    >
      <span className="font-medium text-warn">Recomendado configurar:</span>
      {estados.map((e) => (
        <Link
          key={e.id}
          to={linkResolucao(e.requisito.destino, location.pathname)}
          className="rounded-full border border-warn/40 px-2 py-0.5 text-warn hover:bg-warn/10"
        >
          {e.requisito.titulo}
        </Link>
      ))}
    </div>
  );
}

/** Bloco verde quando tudo de que a tela precisa está pronto. */
export function TudoPronto({ className }: { className?: string }) {
  const { estados } = useOrientacao();
  if (!estados.length || estados.some((e) => !e.ok)) return null;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-success/35 bg-success/[0.07] px-3 py-2 text-xs text-success",
        className,
      )}
    >
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
      Tudo o que esta tela precisa já está cadastrado.
      <Lock className="ml-auto h-3 w-3 opacity-60" />
    </div>
  );
}
