import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Bell, CalendarClock, CheckCircle2, Clock } from "lucide-react";
import {
  Badge, Card, CardContent, Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia, COMPETENCIAS } from "@/lib/competencia";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import { monitorar, prioridadeDe, type LinhaMonitor } from "@/lib/obrigacoesStore";

function corPrioridade(p: string) {
  if (p === "Alta") return "bg-destructive/15 text-destructive";
  if (p === "Média") return "bg-brand-orange/15 text-brand-orange";
  return "bg-muted text-muted-foreground";
}

export default function AgendaFiscal() {
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();

  const linhas = useMemo(() => {
    const anteriores = COMPETENCIAS.filter((c) => c <= competencia).slice(-3);
    return anteriores
      .flatMap((c) => monitorar(empresa?.id ?? null, c))
      .sort((a, b) => a.dias - b.dias);
  }, [empresa, competencia]);

  const alertas = linhas.filter((l) => l.status !== "Transmitida" && l.dias <= 7);

  return (
    <div className="space-y-6 pb-16">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Fiscal › Obrigações acessórias
        </div>
        <h1 className="font-display text-3xl sm:text-4xl">
          Agenda <span className="text-brand-orange">fiscal</span>
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Prazos legais das três últimas competências, com prioridade, responsável, dias restantes e
          alertas automáticos.
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary" className="rounded-full">{formatCompetencia(competencia)}</Badge>
          <Badge variant="secondary" className="rounded-full">{empresa?.razao ?? "Nenhuma empresa selecionada"}</Badge>
        </div>
      </div>

      {alertas.length > 0 && (
        <Card className="rounded-3xl border-brand-orange/40 bg-brand-orange/5">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-brand-orange" />
              <h2 className="font-display text-xl">Alertas automáticos</h2>
            </div>
            {alertas.map((l) => (
              <div key={`${l.obr}-${l.competencia}`} className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-3.5 w-3.5 text-brand-orange shrink-0" />
                <Link to={`/fiscal/obrigacoes/${l.obr}`} className="hover:underline">
                  {l.titulo} — {formatCompetencia(l.competencia)}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {l.dias >= 0 ? `vence em ${l.dias} dia(s)` : `${Math.abs(l.dias)} dia(s) em atraso`} · {l.prazo}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="rounded-3xl border-border/70">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="h-4 w-4 text-brand-orange" />
            <h2 className="font-display text-2xl">Calendário de entregas</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Obrigação</TableHead>
                <TableHead>Competência</TableHead>
                <TableHead>Prazo legal</TableHead>
                <TableHead className="text-center">Dias</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="text-center">Prioridade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((l: LinhaMonitor) => (
                <TableRow key={`${l.obr}-${l.competencia}`}>
                  <TableCell>
                    <Link to={`/fiscal/obrigacoes/${l.obr}`} className="hover:text-brand-orange">
                      {l.titulo}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{formatCompetencia(l.competencia)}</TableCell>
                  <TableCell className="font-mono text-xs">{l.prazo}</TableCell>
                  <TableCell className="text-center font-mono text-xs">
                    {l.status === "Transmitida" ? "—" : l.dias}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      {l.status === "Transmitida" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      {l.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.responsavel}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={`rounded-full ${corPrioridade(prioridadeDe(l))}`}>
                      {prioridadeDe(l)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AssistenteFechamento
        rotulo="IA ajudante"
        resumo={`Agenda fiscal com ${linhas.length} entregas monitoradas.`}
        contexto={{
          tela: "Agenda fiscal das obrigações acessórias",
          competencia,
          empresa: empresa?.razao,
          entregas: linhas.map((l) => ({
            obrigacao: l.titulo,
            competencia: l.competencia,
            prazo: l.prazo,
            dias: l.dias,
            status: l.status,
            prioridade: prioridadeDe(l),
          })),
        }}
      />
    </div>
  );
}
