import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Badge, Button, Card, CardContent, Progress, Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { ChevronRight, Lock, LockOpen } from "lucide-react";
import { COMPETENCIAS, formatCompetencia, useCompetencia } from "@/lib/competencia";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { execKey, pendenciasCadastro, reabrirPeriodo, useGestao } from "@/lib/gestaoStore";

export default function Encerramentos() {
  const { empresa, empresas } = useEmpresaAtual();
  const { competencia, setCompetencia } = useCompetencia();
  const { modelos, execucoes, fechamentos } = useGestao();

  const empresaId = empresa?.id ?? "";
  const ativos = modelos.filter((m) => m.ativa);

  const linhas = useMemo(
    () =>
      COMPETENCIAS.map((c) => {
        const relevantes = ativos.filter(
          (m) => execucoes.find((e) => e.key === execKey(empresaId, c, m.id))?.status !== "Não se aplica",
        );
        const concluidas = relevantes.filter(
          (m) => execucoes.find((e) => e.key === execKey(empresaId, c, m.id))?.status === "Concluída",
        ).length;
        const fechado = fechamentos.find((f) => f.key === `${empresaId}|${c}`);
        return {
          competencia: c,
          total: relevantes.length,
          concluidas,
          progresso: relevantes.length === 0 ? 0 : Math.round((concluidas / relevantes.length) * 100),
          fechado,
        };
      }).reverse(),
    [ativos, execucoes, fechamentos, empresaId],
  );

  const pend = pendenciasCadastro(empresa?.id ?? null).filter((p) => !p.resolvida && p.critica);

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/dashboard" className="hover:text-foreground">Início</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/preparativos/servicos" className="hover:text-foreground">Serviços</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Encerramentos</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-card border border-border grid place-items-center shadow-card">
            <Lock className="h-6 w-6 text-brand-orange" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Preparativos · Serviços
            </div>
            <h1 className="font-display text-4xl mt-1.5">Encerramentos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {empresa ? empresa.razao : "Nenhuma empresa selecionada"} · histórico por competência
            </p>
          </div>
        </div>
        <Button asChild className="rounded-full bg-brand-orange text-primary-foreground hover:bg-brand-orange/90">
          <Link to="/preparativos/servicos/gestao">Encerrar competência</Link>
        </Button>
      </div>

      {empresas.length === 0 && (
        <Card className="rounded-2xl border-border/70">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Cadastre uma empresa do grupo para acompanhar os encerramentos.
          </CardContent>
        </Card>
      )}

      {pend.length > 0 && (
        <Card className="rounded-2xl border-border/70">
          <CardContent className="p-5">
            <div className="text-sm font-medium">Bloqueios de cadastro</div>
            <ul className="mt-2 space-y-1 text-sm text-brand-orange">
              {pend.map((p) => (
                <li key={p.id}>
                  {p.titulo} —{" "}
                  <Link to={p.destino} className="underline">resolver</Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl border-border/70 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Competência</TableHead>
              <TableHead>Avanço das tarefas</TableHead>
              <TableHead className="text-right">Concluídas</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Encerrado em</TableHead>
              <TableHead>Observação</TableHead>
              <TableHead className="text-right w-[200px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((l) => (
              <TableRow key={l.competencia} className={l.competencia === competencia ? "bg-muted/40" : ""}>
                <TableCell className="font-mono text-xs">{formatCompetencia(l.competencia)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Progress value={l.progresso} className="h-1.5 w-32" />
                    <span className="font-mono text-xs">{l.progresso}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-xs">{l.concluidas}/{l.total}</TableCell>
                <TableCell>
                  {l.fechado ? (
                    <Badge className="rounded-full" variant="outline">Fechado</Badge>
                  ) : (
                    <span className="text-brand-orange text-sm">Aberto</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.fechado ? new Date(l.fechado.fechadoEm).toLocaleString("pt-BR") : "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{l.fechado?.observacao || "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full"
                      onClick={() => setCompetencia(l.competencia)}
                    >
                      Selecionar
                    </Button>
                    {l.fechado && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => {
                          reabrirPeriodo(empresaId, l.competencia);
                          toast.success("Período reaberto");
                        }}
                      >
                        <LockOpen className="h-4 w-4 mr-2" /> Reabrir
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
