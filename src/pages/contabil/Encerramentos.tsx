import { Fragment, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Badge, Button, Card, CardContent, Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, Input, Label, Progress, Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow, Textarea,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import {
  ArrowUpRight, CheckCircle2, ChevronDown, ChevronRight, Lock, LockOpen, TriangleAlert,
} from "lucide-react";
import { COMPETENCIAS, formatCompetencia, useCompetencia } from "@/lib/competencia";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import ExportarMenu from "@/components/contabil/ExportarMenu";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import {
  destinoTarefa, execKey, fecharPeriodo, modelosDoRegime, normalizarRegime,
  pendenciasCadastro, reabrirPeriodo, resumoFases, useGestao,
} from "@/lib/gestaoStore";
import { pendenciasGuias } from "@/lib/guiasStore";

export default function Encerramentos() {
  const { empresa, empresas } = useEmpresaAtual();
  const { competencia, setCompetencia } = useCompetencia();
  const { modelos, execucoes, fechamentos } = useGestao();
  const navigate = useNavigate();

  const [expandida, setExpandida] = useState<string | null>(null);
  const [fecharAlvo, setFecharAlvo] = useState<string | null>(null);
  const [reabrirAlvo, setReabrirAlvo] = useState<string | null>(null);
  const [responsavel, setResponsavel] = useState("Contabilidade interna");
  const [observacao, setObservacao] = useState("");
  const [motivo, setMotivo] = useState("");

  const empresaId = empresa?.id ?? "";
  const regime = empresa ? normalizarRegime(empresa.regime) : null;
  const ativos = modelosDoRegime(modelos, regime);
  const pend = pendenciasCadastro(empresa?.id ?? null).filter((p) => !p.resolvida && p.critica);

  const statusDe = (c: string, modeloId: string) =>
    execucoes.find((e) => e.key === execKey(empresaId, c, modeloId))?.status ?? "Pendente";

  const linhas = useMemo(
    () =>
      COMPETENCIAS.map((c) => {
        const relevantes = ativos.filter((m) => statusDe(c, m.id) !== "Não se aplica");
        const concluidas = relevantes.filter((m) => statusDe(c, m.id) === "Concluída");
        const pendentes = relevantes.filter((m) => statusDe(c, m.id) !== "Concluída");
        const obrigatoriasPendentes = pendentes.filter((m) => m.obrigatoria);
        return {
          competencia: c,
          total: relevantes.length,
          concluidas: concluidas.length,
          pendentes,
          obrigatoriasPendentes,
          progresso: relevantes.length === 0 ? 0 : Math.round((concluidas.length / relevantes.length) * 100),
          fechado: fechamentos.find((f) => f.key === `${empresaId}|${c}`),
          fases: resumoFases(modelos, execucoes, empresaId, c, regime),
        };
      }).reverse(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ativos, modelos, execucoes, fechamentos, empresaId, regime],
  );

  const alvo = linhas.find((l) => l.competencia === fecharAlvo);
  const bloqueios = alvo
    ? [
        ...pend.map((p) => ({ texto: `Cadastro: ${p.titulo}`, destino: p.destino })),
        ...alvo.obrigatoriasPendentes.map((m) => ({ texto: `Tarefa obrigatória: ${m.titulo}`, destino: destinoTarefa(m) })),
        ...pendenciasGuias(empresaId || null, alvo.competencia).map((t) => ({
          texto: `Guias: ${t}`,
          destino: "/fiscal/guias",
        })),
      ]
    : [];

  const fechadas = linhas.filter((l) => l.fechado).length;
  const mediaProgresso = linhas.length
    ? Math.round(linhas.reduce((s, l) => s + l.progresso, 0) / linhas.length)
    : 0;

  const kpis = [
    { label: "Competências fechadas", valor: `${fechadas}/${linhas.length}` },
    { label: "Em aberto", valor: String(linhas.length - fechadas) },
    { label: "Progresso médio", valor: `${mediaProgresso}%` },
    { label: "Bloqueios de cadastro", valor: String(pend.length) },
  ];

  const exportLinhas = linhas.map((l) => ({
    competencia: formatCompetencia(l.competencia),
    progresso: `${l.progresso}%`,
    concluidas: `${l.concluidas}/${l.total}`,
    situacao: l.fechado ? "Fechado" : "Aberto",
    fechadoEm: l.fechado ? new Date(l.fechado.fechadoEm).toLocaleString("pt-BR") : "—",
    responsavel: l.fechado?.responsavel ?? "—",
    observacao: l.fechado?.observacao || "—",
  }));

  const confirmarFechamento = (forcado: boolean) => {
    if (!empresaId) return toast.error("Selecione uma empresa do grupo.");
    if (!fecharAlvo) return;
    if (!responsavel.trim()) return toast.error("Informe o responsável pelo encerramento.");
    if (bloqueios.length > 0 && !forcado) return;
    if (bloqueios.length > 0 && !observacao.trim())
      return toast.error("Encerramento com pendências exige justificativa.");
    fecharPeriodo({
      empresaId,
      competencia: fecharAlvo,
      responsavel: responsavel.trim(),
      observacao: observacao.trim() || (bloqueios.length ? "Encerrado com pendências" : ""),
    });
    toast.success(`Competência ${formatCompetencia(fecharAlvo)} encerrada.`);
    setFecharAlvo(null);
    setObservacao("");
  };

  const contexto = {
    tela: "Encerramentos",
    modulo: "Preparativos › Serviços",
    empresa: empresa ? { razao: empresa.razao, regime: empresa.regime } : null,
    competenciaSelecionada: formatCompetencia(competencia),
    historico: linhas.map((l) => ({
      competencia: l.competencia,
      progresso: l.progresso,
      situacao: l.fechado ? "Fechado" : "Aberto",
      obrigatoriasPendentes: l.obrigatoriasPendentes.map((m) => m.titulo),
    })),
    bloqueiosCadastro: pend.map((p) => p.titulo),
  };

  return (
    <div className="space-y-6 pb-16">
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/dashboard" className="hover:text-foreground">Início</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/preparativos/servicos" className="hover:text-foreground">Serviços</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Encerramentos</span>
      </nav>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-border bg-card shadow-card">
            <Lock className="h-6 w-6 text-brand-orange" />
          </div>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Preparativos · Serviços
            </div>
            <h1 className="mt-1.5 font-display text-3xl sm:text-4xl">
              Encerra<span className="text-brand-orange">mentos</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {empresa ? empresa.razao : "Nenhuma empresa selecionada"}
              {regime ? ` · ${regime}` : ""} · histórico e bloqueio por competência
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportarMenu
            nome="Encerramentos"
            colunas={[
              { key: "competencia", label: "Competência" },
              { key: "progresso", label: "Progresso" },
              { key: "concluidas", label: "Concluídas" },
              { key: "situacao", label: "Situação" },
              { key: "fechadoEm", label: "Encerrado em" },
              { key: "responsavel", label: "Responsável" },
              { key: "observacao", label: "Observação" },
            ]}
            linhas={exportLinhas}
          />
          <Button
            className="rounded-full bg-brand-orange text-primary-foreground hover:bg-brand-orange/90"
            onClick={() => {
              if (!empresaId) return toast.error("Selecione uma empresa do grupo.");
              setFecharAlvo(competencia);
              setObservacao("");
            }}
          >
            Encerrar {formatCompetencia(competencia)}
          </Button>
        </div>
      </div>

      {empresas.length === 0 && (
        <Card className="rounded-3xl shadow-card">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Cadastre uma empresa do grupo para acompanhar os encerramentos.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="rounded-3xl shadow-card">
            <CardContent className="p-4">
              <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{k.label}</div>
              <div className="mt-1 font-display text-xl">{k.valor}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pend.length > 0 && (
        <Card className="rounded-3xl shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TriangleAlert className="h-4 w-4 text-brand-orange" /> Bloqueios de cadastro
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {pend.map((p) => (
                <li key={p.id}>
                  {p.titulo} — <Link to={p.destino} className="text-brand-orange underline">resolver</Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden rounded-3xl shadow-card">
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]" />
                <TableHead>Competência</TableHead>
                <TableHead>Avanço das tarefas</TableHead>
                <TableHead className="text-right">Concluídas</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Encerrado em</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="text-right w-[240px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((l) => (
                <Fragment key={l.competencia}>
                  <TableRow
                    className={l.competencia === competencia ? "bg-muted/40" : ""}
                  >
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="rounded-full"
                        aria-label={`Detalhar ${formatCompetencia(l.competencia)}`}
                        onClick={() => setExpandida(expandida === l.competencia ? null : l.competencia)}
                      >
                        {expandida === l.competencia
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </TableCell>
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
                      ) : l.obrigatoriasPendentes.length ? (
                        <span className="text-sm text-brand-orange">
                          Aberto · {l.obrigatoriasPendentes.length} obrigatória(s)
                        </span>
                      ) : (
                        <span className="text-sm text-success">Pronto para encerrar</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {l.fechado ? new Date(l.fechado.fechadoEm).toLocaleString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {l.fechado?.responsavel ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full"
                          onClick={() => setCompetencia(l.competencia)}
                        >
                          Selecionar
                        </Button>
                        {l.fechado ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => { setReabrirAlvo(l.competencia); setMotivo(""); }}
                          >
                            <LockOpen className="mr-2 h-4 w-4" /> Reabrir
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="rounded-full bg-brand-orange hover:bg-brand-orange/90"
                            onClick={() => {
                              if (!empresaId) return toast.error("Selecione uma empresa do grupo.");
                              setFecharAlvo(l.competencia);
                              setObservacao("");
                            }}
                          >
                            <Lock className="mr-2 h-4 w-4" /> Encerrar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  {expandida === l.competencia && (
                    <TableRow>
                      <TableCell colSpan={8} className="bg-muted/30">
                        <div className="grid gap-4 p-2 lg:grid-cols-2">
                          <div className="space-y-2">
                            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                              Fases da competência
                            </div>
                            {l.fases.map((f) => (
                              <div key={f.slug} className="rounded-2xl border p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-sm font-medium">{f.title}</span>
                                  <span className="font-mono text-xs">{f.concluidas}/{f.total}</span>
                                </div>
                                <Progress value={f.progresso} className="mt-2 h-1.5" />
                              </div>
                            ))}
                          </div>
                          <div className="space-y-2">
                            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                              Tarefas pendentes
                            </div>
                            {l.pendentes.length === 0 ? (
                              <p className="flex items-center gap-2 text-sm text-success">
                                <CheckCircle2 className="h-4 w-4" /> Todas as tarefas do regime estão concluídas.
                              </p>
                            ) : (
                              l.pendentes.map((m) => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => navigate(destinoTarefa(m))}
                                  className="flex w-full items-start justify-between gap-3 rounded-2xl border p-3 text-left transition-colors hover:bg-muted"
                                >
                                  <span className="min-w-0">
                                    <span className="block text-sm">{m.titulo}</span>
                                    <span className="block text-[11px] text-muted-foreground">
                                      {m.responsavel} · até o dia {m.diaPrazo}
                                      {m.obrigatoria ? " · obrigatória" : ""}
                                    </span>
                                  </span>
                                  <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                </button>
                              ))
                            )}
                          </div>
                          {l.fechado?.observacao ? (
                            <p className="text-xs text-muted-foreground lg:col-span-2">
                              Observação do encerramento: {l.fechado.observacao}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!fecharAlvo} onOpenChange={(o) => !o && setFecharAlvo(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Encerrar {fecharAlvo ? formatCompetencia(fecharAlvo) : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {bloqueios.length > 0 ? (
              <div className="rounded-2xl border p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-brand-orange">
                  <TriangleAlert className="h-4 w-4" /> {bloqueios.length} pendência(s) antes do encerramento
                </div>
                <ul className="mt-2 space-y-1 text-xs">
                  {bloqueios.map((b, i) => (
                    <li key={i}>
                      <Link to={b.destino} className="underline">{b.texto}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" /> Nenhum bloqueio: a competência pode ser encerrada.
              </p>
            )}
            <div className="space-y-2">
              <Label>Responsável *</Label>
              <Input className="rounded-xl" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Observação {bloqueios.length ? "(justificativa obrigatória)" : ""}</Label>
              <Textarea
                className="rounded-xl"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex.: encerrado após conferência do balancete e das guias emitidas."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setFecharAlvo(null)}>
              Cancelar
            </Button>
            <Button
              className="rounded-full bg-brand-orange hover:bg-brand-orange/90"
              onClick={() => confirmarFechamento(bloqueios.length > 0)}
            >
              {bloqueios.length > 0 ? "Encerrar mesmo assim" : "Confirmar encerramento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reabrirAlvo} onOpenChange={(o) => !o && setReabrirAlvo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reabrir {reabrirAlvo ? formatCompetencia(reabrirAlvo) : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motivo da reabertura *</Label>
            <Textarea
              className="rounded-xl"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: nota complementar recebida após o encerramento."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setReabrirAlvo(null)}>
              Cancelar
            </Button>
            <Button
              className="rounded-full bg-brand-orange hover:bg-brand-orange/90"
              onClick={() => {
                if (!motivo.trim()) return toast.error("Informe o motivo da reabertura.");
                reabrirPeriodo(empresaId, reabrirAlvo!);
                toast.success(`Competência ${formatCompetencia(reabrirAlvo!)} reaberta.`, {
                  description: motivo.trim(),
                });
                setReabrirAlvo(null);
                setMotivo("");
              }}
            >
              Confirmar reabertura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssistenteFechamento
        contexto={contexto}
        resumo={`Encerramentos — ${fechadas}/${linhas.length} competências fechadas`}
        rotulo="IA ajudante"
      />
    </div>
  );
}
