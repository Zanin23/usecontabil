// ============================================================================
// Painel de pendências — o semáforo do período.
//
// Cada linha diz o que está pendente, quanto é e leva direto para a tela que
// resolve. As verdes existem de propósito: o usuário precisa ver o que está
// certo, e não só o que falta.
// ============================================================================
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { CircleAlert, CircleCheck, OctagonAlert } from "lucide-react";
import {
  Badge, Card, CardContent, cn,
} from "@/design-system/mj-design-system-db98fa";
import { useContexto } from "@/lib/ux/contexto";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { useCompetencia } from "@/lib/competencia";
import { useEtapasFluxo } from "./TrilhaFluxo";
import { documentosPendentes } from "@/lib/escrituracaoStore";

export type Severidade = "critico" | "atencao" | "ok";

export type Pendencia = {
  id: string;
  severidade: Severidade;
  texto: string;
  rota: string;
};

const ICONES = {
  critico: OctagonAlert,
  atencao: CircleAlert,
  ok: CircleCheck,
} as const;

const CORES = {
  critico: "text-destructive",
  atencao: "text-warn",
  ok: "text-success",
} as const;

const BULLETS = { critico: "🔴", atencao: "🟡", ok: "🟢" } as const;

export function usePendencias(): Pendencia[] {
  const { empresaId } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const c = useContexto(empresaId, competencia);
  const etapas = useEtapasFluxo();

  return useMemo(() => {
    const lista: Pendencia[] = [];

    const essenciaisPendentes = etapas.filter((e) => e.essencial && !e.concluida);
    for (const e of essenciaisPendentes) {
      lista.push({
        id: `fluxo-${e.id}`,
        severidade: "critico",
        texto: `${e.titulo} — ${e.acao}`,
        rota: e.rota,
      });
    }

    if (empresaId) {
      const docsPendentes = documentosPendentes(empresaId, competencia);
      if (docsPendentes > 0) {
        lista.push({
          id: "docs-classificacao",
          severidade: "critico",
          texto: `${docsPendentes} documento(s) aguardando classificação ou escrituração`,
          rota: "/fiscal/documentos/entradas",
        });
      }

      if (c.pendenciasCriticasCadastro > 0) {
        lista.push({
          id: "cadastros-incompletos",
          severidade: "atencao",
          texto: `${c.pendenciasCriticasCadastro} cadastro(s) da empresa incompleto(s)`,
          rota: "/preparativos/cadastros/empresas",
        });
      }

      if (c.guiasAbertas > 0) {
        lista.push({
          id: "guias-abertas",
          severidade: "atencao",
          texto: `${c.guiasAbertas} guia(s) em aberto nesta competência`,
          rota: "/fiscal/guias/darf",
        });
      }

      if (c.obrigacoesPendentes > 0) {
        lista.push({
          id: "obrigacoes",
          severidade: "atencao",
          texto: `${c.obrigacoesPendentes} obrigação(ões) acessória(s) pendente(s)`,
          rota: "/fiscal/obrigacoes",
        });
      }

      if (c.escrituracao > 0) {
        lista.push({
          id: "escrituracao-ok",
          severidade: "ok",
          texto: "Escrituração do período gerada",
          rota: "/fiscal/escrituracao/livro-entradas",
        });
      }

      if (c.competenciaEncerrada) {
        lista.push({
          id: "encerrada",
          severidade: "ok",
          texto: "Competência encerrada — alterações só por estorno",
          rota: "/preparativos/servicos/encerramentos",
        });
      }
    }

    const ordem: Record<Severidade, number> = { critico: 0, atencao: 1, ok: 2 };
    return lista.sort((a, b) => ordem[a.severidade] - ordem[b.severidade]);
  }, [c, etapas, empresaId, competencia]);
}

export default function PainelPendencias({ className }: { className?: string }) {
  const pendencias = usePendencias();
  const criticos = pendencias.filter((p) => p.severidade === "critico").length;
  const atencoes = pendencias.filter((p) => p.severidade === "atencao").length;

  return (
    <Card className={cn("rounded-xl border-border/70", className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl">Pendências</h2>
          <div className="flex items-center gap-1.5">
            {criticos > 0 && (
              <Badge variant="outline" className="rounded-md border-destructive/40 text-destructive">
                {criticos} crítica(s)
              </Badge>
            )}
            {atencoes > 0 && (
              <Badge variant="outline" className="rounded-md border-warn/45 text-warn">
                {atencoes} atenção
              </Badge>
            )}
            {criticos === 0 && atencoes === 0 && (
              <Badge variant="outline" className="rounded-md border-success/40 text-success">
                sem pendências
              </Badge>
            )}
          </div>
        </div>

        <ul className="mt-4 space-y-1.5">
          {pendencias.length === 0 && (
            <li className="text-sm text-muted-foreground">
              Nada pendente por enquanto — o período está em dia.
            </li>
          )}
          {pendencias.map((p) => {
            const Icone = ICONES[p.severidade];
            return (
              <li key={p.id}>
                <Link
                  to={p.rota}
                  className="group flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-accent/50"
                >
                  <span aria-hidden className="text-[11px] leading-5">
                    {BULLETS[p.severidade]}
                  </span>
                  <Icone className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", CORES[p.severidade])} />
                  <span className="min-w-0 flex-1 text-sm leading-snug">{p.texto}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
