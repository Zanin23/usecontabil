// ============================================================================
// Assistente de configuração — o "por onde começo?" do painel inicial.
//
// Mostra o progresso real da configuração (calculado sobre os dados existentes,
// nunca gravado em lugar nenhum) e leva o usuário direto ao próximo passo.
// ============================================================================
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, CheckCircle2, ChevronDown, PartyPopper, Sparkles,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, Progress, cn,
} from "@/design-system/mj-design-system-db98fa";
import { useEtapasFluxo } from "./TrilhaFluxo";
import { progressoFluxo, proximaEtapa, type EstadoEtapa } from "@/lib/ux/fluxo";

export default function ConfiguracaoInicial({ className }: { className?: string }) {
  const etapas = useEtapasFluxo();
  const progresso = progressoFluxo(etapas);
  const proxima = proximaEtapa(etapas);
  const completo = progresso.porcentagem === 100;
  const [verTudo, setVerTudo] = useState(!completo);

  return (
    <Card className={cn("rounded-xl border-border/70", className)}>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="font-display text-xl">Configuração inicial</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {completo
                ? "Tudo o que o ciclo mensal precisa já está cadastrado."
                : "Siga a ordem abaixo: cada etapa libera a próxima."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={cn(
                "rounded-md",
                completo ? "border-success/40 text-success" : "border-primary/40 text-primary",
              )}
            >
              {progresso.feitas} de {progresso.total} etapas essenciais
            </Badge>
            <span className="font-mono text-sm text-primary">{progresso.porcentagem}%</span>
          </div>
        </div>

        <Progress
          value={progresso.porcentagem}
          className={cn("mt-3 h-1.5", completo ? "[&>*]:bg-success" : "[&>*]:bg-brand-orange")}
        />

        {completo ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-success/35 bg-success/[0.07] px-4 py-3">
            <PartyPopper className="h-4 w-4 text-success" />
            <span className="text-sm">
              Configuração concluída. O próximo passo é a movimentação do período.
            </span>
            <Button asChild size="sm" className="ml-auto rounded-lg">
              <Link to="/fiscal/documentos/entradas">
                Lançar documentos
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {proxima && (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-primary/35 bg-primary/[0.06] px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                    Continue de onde parou
                  </div>
                  <div className="text-sm font-medium">
                    {proxima.ordem}. {proxima.titulo}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{proxima.porque}</p>
                </div>
                <Button
                  asChild
                  size="sm"
                  className="shrink-0 rounded-lg bg-brand-orange text-primary-foreground hover:bg-brand-orange/90"
                >
                  <Link to={proxima.rota}>
                    {proxima.acaoBotao}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setVerTudo((v) => !v)}
              className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              aria-expanded={verTudo}
            >
              <ChevronDown className={cn("h-3.5 w-3.5 transition", verTudo && "rotate-180")} />
              {verTudo ? "Ocultar checklist" : "Ver checklist completo"}
            </button>

            {verTudo && (
              <ul className="mt-2 divide-y divide-border/60">
                {etapas.map((e) => (
                  <LinhaEtapa key={e.id} etapa={e} />
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function LinhaEtapa({ etapa }: { etapa: EstadoEtapa }) {
  return (
    <li className="flex flex-wrap items-center gap-2 py-2">
      {etapa.concluida ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
      ) : (
        <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground">
          {etapa.ordem}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "text-sm",
            etapa.concluida ? "text-muted-foreground line-through decoration-muted-foreground/40" : "font-medium",
          )}
        >
          {etapa.titulo}
          {!etapa.essencial && (
            <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              opcional
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {etapa.concluida ? etapa.texto : `${etapa.acao} — ${etapa.porque}`}
        </div>
      </div>
      {!etapa.concluida && (
        <Button asChild variant="outline" size="sm" className="h-7 shrink-0 rounded-full px-3 text-xs">
          <Link to={etapa.rota}>
            {etapa.acaoBotao}
            <ArrowRight className="ml-1.5 h-3 w-3" />
          </Link>
        </Button>
      )}
    </li>
  );
}
