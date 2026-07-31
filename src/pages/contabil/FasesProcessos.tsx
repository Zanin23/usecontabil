import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Badge, Button, Card, CardContent, Progress, Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import { ChevronRight, Workflow } from "lucide-react";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import { FASES, execKey, normalizarRegime, resumoFases, useGestao } from "@/lib/gestaoStore";

export default function FasesProcessos() {
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const { modelos, execucoes, fechamentos } = useGestao();
  const empresaId = empresa?.id ?? "";
  const regime = empresa ? normalizarRegime(empresa.regime) : null;
  const fechado = fechamentos.some((f) => f.key === `${empresaId}|${competencia}`);

  const fases = useMemo(
    () => resumoFases(modelos, execucoes, empresaId, competencia, regime),
    [modelos, execucoes, empresaId, competencia, regime],
  );

  const faseAtual = fases.find((f) => f.progresso < 100) ?? fases[fases.length - 1];

  const statusOf = (modeloId: string) =>
    execucoes.find((e) => e.key === execKey(empresaId, competencia, modeloId))?.status ?? "Pendente";

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/dashboard" className="hover:text-foreground">Início</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/preparativos/servicos" className="hover:text-foreground">Serviços</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Fases e processos</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-card border border-border grid place-items-center shadow-card">
            <Workflow className="h-6 w-6 text-brand-orange" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Preparativos · Serviços
            </div>
            <h1 className="font-display text-4xl mt-1.5">Fases e processos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {empresa ? empresa.razao : "Nenhuma empresa selecionada"} · {formatCompetencia(competencia)}
              {fechado ? " · período encerrado" : ""}
            </p>
          </div>
        </div>
        <Button asChild className="rounded-full bg-brand-orange text-primary-foreground hover:bg-brand-orange/90">
          <Link to="/preparativos/servicos/gestao">Ir para a gestão</Link>
        </Button>
      </div>

      <Card className="rounded-2xl border-border/70">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fase atual</div>
              <div className="font-display text-2xl mt-1">{faseAtual?.title ?? "—"}</div>
            </div>
            <Badge variant="outline" className="rounded-full">{faseAtual?.progresso ?? 0}% concluído</Badge>
          </div>
          <Progress value={faseAtual?.progresso ?? 0} className="mt-4 h-1.5" />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {FASES.map((f) => {
          const resumo = fases.find((r) => r.slug === f.slug)!;
          const tarefas = resumo.tarefas;
          return (
            <Card key={f.slug} className="rounded-2xl border-border/70">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{f.title}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                  </div>
                  <span className={`font-mono text-sm ${resumo.progresso === 100 ? "text-success" : "text-brand-orange"}`}>
                    {resumo.progresso}%
                  </span>
                </div>
                <Progress value={resumo.progresso} className="h-1.5" />
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarefa</TableHead>
                      <TableHead className="text-right">Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tarefas.map((m) => {
                      const st = statusOf(m.id);
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="text-sm">{m.titulo}</TableCell>
                          <TableCell
                            className={`text-right text-xs ${st === "Concluída" ? "text-success" : st === "Em andamento" ? "text-brand-orange" : "text-muted-foreground"}`}
                          >
                            {st}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
