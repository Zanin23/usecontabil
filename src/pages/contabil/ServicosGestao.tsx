import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Badge, Button, Card, CardContent, Input, Progress, Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowUpRight, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, Circle,
  Lock, LockOpen, RotateCcw,
} from "lucide-react";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import {
  FASES, TarefaStatus, destinoTarefa, execKey, fecharPeriodo, modelosDoRegime, normalizarRegime,
  pendenciasCadastro, pendenciasEscrituracao, reabrirPeriodo, resetExecucoes, resumoFases,
  setExecucao, useGestao,
} from "@/lib/gestaoStore";
import { pendenciasObrigacoes } from "@/lib/obrigacoesStore";

const STATUS: TarefaStatus[] = ["Pendente", "Em andamento", "Concluída", "Não se aplica"];

const statusClass = (s: TarefaStatus) =>
  s === "Concluída"
    ? "text-success"
    : s === "Em andamento"
      ? "text-brand-orange"
      : s === "Não se aplica"
        ? "text-muted-foreground"
        : "text-foreground";

export default function ServicosGestao() {
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const { modelos, execucoes, fechamentos } = useGestao();
  const [faseFiltro, setFaseFiltro] = useState<string>("todas");
  const [obsFechamento, setObsFechamento] = useState("");
  const [faseAberta, setFaseAberta] = useState<string | null>(null);

  const empresaId = empresa?.id ?? "";
  const fechado = fechamentos.find((f) => f.key === `${empresaId}|${competencia}`);
  const regime = empresa ? normalizarRegime(empresa.regime) : null;

  const pendCadastro = useMemo(() => pendenciasCadastro(empresa?.id ?? null), [empresa, execucoes]);
  const pendEscrituracao = useMemo(
    () => pendenciasEscrituracao(empresa?.id ?? null, competencia),
    [empresa, competencia, execucoes],
  );
  const pendObrigacoes = useMemo(
    () => pendenciasObrigacoes(empresa?.id ?? null, competencia),
    [empresa, competencia, execucoes],
  );
  const cadastrosPendentes = pendCadastro.filter((p) => !p.resolvida);
  const bloqueios = [
    ...cadastrosPendentes,
    ...pendEscrituracao.filter((p) => !p.resolvida),
    ...pendObrigacoes.filter((p) => !p.resolvida),
  ].filter((p) => p.critica);

  const ativos = useMemo(() => modelosDoRegime(modelos, regime), [modelos, regime]);
  const statusOf = (modeloId: string): TarefaStatus =>
    execucoes.find((e) => e.key === execKey(empresaId, competencia, modeloId))?.status ?? "Pendente";

  const fases = useMemo(
    () => resumoFases(modelos, execucoes, empresaId, competencia, regime),
    [modelos, execucoes, empresaId, competencia, regime],
  );

  const relevantes = ativos.filter((m) => statusOf(m.id) !== "Não se aplica");
  const concluidas = relevantes.filter((m) => statusOf(m.id) === "Concluída").length;
  const progresso = relevantes.length === 0 ? 0 : Math.round((concluidas / relevantes.length) * 100);
  const tarefasPendentes = relevantes.filter((m) => statusOf(m.id) !== "Concluída");
  const obrigatoriasPendentes = tarefasPendentes.filter((m) => m.obrigatoria);

  const podeFechar = empresa && bloqueios.length === 0 && obrigatoriasPendentes.length === 0;

  const listaTarefas = ativos.filter((m) => faseFiltro === "todas" || m.fase === faseFiltro);

  const handleStatus = (modeloId: string, status: TarefaStatus) => {
    if (!empresa) { toast.error("Selecione uma empresa do grupo"); return; }
    if (fechado) { toast.error("Período fechado. Reabra para alterar tarefas."); return; }
    setExecucao(empresa.id, competencia, modeloId, { status });
  };

  const handleFechar = () => {
    if (!empresa) return;
    if (!podeFechar) {
      toast.error("Resolva os bloqueios antes de encerrar o período");
      return;
    }
    fecharPeriodo({
      empresaId: empresa.id,
      competencia,
      responsavel: "Contabilidade interna",
      observacao: obsFechamento,
    });
    setObsFechamento("");
    toast.success(`Competência ${formatCompetencia(competencia)} encerrada`);
  };

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/dashboard" className="hover:text-foreground">Início</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/preparativos" className="hover:text-foreground">Preparativos</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/preparativos/servicos" className="hover:text-foreground">Serviços</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Gestão</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-card border border-border grid place-items-center shadow-card">
            <ClipboardList className="h-6 w-6 text-brand-orange" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Preparativos · Serviços
            </div>
            <h1 className="font-display text-4xl mt-1.5">Gestão do fechamento</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              {empresa ? empresa.razao : "Nenhuma empresa selecionada"} · competência{" "}
              {formatCompetencia(competencia)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/preparativos/servicos/cadastro-tarefas">Cadastro de tarefas</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/preparativos/servicos/encerramentos">Encerramentos</Link>
          </Button>
        </div>
      </div>

      {!empresa && (
        <Card className="rounded-2xl border-border/70">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Cadastre e selecione uma empresa do grupo para acompanhar o fechamento.{" "}
            <Link to="/preparativos/cadastros/empresas/novo" className="text-brand-orange hover:underline">
              Cadastrar empresa
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-2xl border-border/70">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Avanço</div>
            <div className="font-display text-3xl mt-2">{progresso}%</div>
            <Progress value={progresso} className="mt-3 h-1.5" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/70">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tarefas pendentes</div>
            <div className="font-display text-3xl mt-2 text-brand-orange">{tarefasPendentes.length}</div>
            <p className="text-xs text-muted-foreground mt-2">{obrigatoriasPendentes.length} obrigatórias</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/70">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Cadastros faltantes</div>
            <div className={`font-display text-3xl mt-2 ${cadastrosPendentes.length ? "text-brand-orange" : "text-success"}`}>
              {cadastrosPendentes.length}
            </div>
            <p className="text-xs text-muted-foreground mt-2">{bloqueios.length} bloqueiam o encerramento</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/70">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Situação</div>
            <div className={`font-display text-3xl mt-2 ${fechado ? "text-success" : "text-foreground"}`}>
              {fechado ? "Fechado" : "Aberto"}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {fechado
                ? `Encerrado em ${new Date(fechado.fechadoEm).toLocaleDateString("pt-BR")}`
                : "Período em andamento"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl border-border/70 lg:col-span-2">
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-2xl">Passos do fechamento</h2>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-full">
                  {regime ? `Regime: ${regime}` : "Sem empresa selecionada"}
                </Badge>
                <Badge variant="outline" className="rounded-full">{FASES.length} fases</Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Clique em um passo para ver e atualizar as tarefas ligadas a ele. A lista muda conforme o
              regime tributário da empresa selecionada.
            </p>
            <div className="space-y-3">
              {fases.map((f) => {
                const aberta = faseAberta === f.slug;
                return (
                  <div key={f.slug} className="rounded-2xl border border-border/70">
                    <button
                      type="button"
                      onClick={() => setFaseAberta(aberta ? null : f.slug)}
                      aria-expanded={aberta}
                      className="w-full text-left p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-start gap-2 min-w-0">
                          {aberta ? (
                            <ChevronDown className="h-4 w-4 mt-0.5 shrink-0 text-brand-orange" />
                          ) : (
                            <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-medium">{f.title}</div>
                            <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`font-mono text-sm ${f.progresso === 100 ? "text-success" : "text-brand-orange"}`}>
                            {f.progresso}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {f.concluidas}/{f.total} tarefas
                          </div>
                        </div>
                      </div>
                      <Progress value={f.progresso} className="mt-3 h-1.5" />
                    </button>

                    {aberta && (
                      <div className="border-t border-border/70 p-4 space-y-3">
                        {f.tarefas.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            Nenhuma tarefa desta fase se aplica ao regime atual.
                          </p>
                        )}
                        {f.tarefas.map((m) => {
                          const st = statusOf(m.id);
                          const destino = destinoTarefa(m);
                          return (
                            <div
                              key={m.id}
                              className="flex flex-col gap-3 rounded-xl border border-border/70 p-3 md:flex-row md:items-center md:justify-between"
                            >
                              <button
                                type="button"
                                onClick={() => navigate(destino)}
                                title="Abrir a tela responsável por esta tarefa"
                                className="min-w-0 flex-1 text-left rounded-lg transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring p-1"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-[11px] text-muted-foreground">{m.id}</span>
                                  <span className="text-sm">{m.titulo}</span>
                                  <ArrowUpRight className="h-3.5 w-3.5 text-brand-orange" />
                                  {m.obrigatoria && (
                                    <Badge variant="outline" className="rounded-full text-[10px]">Obrigatória</Badge>
                                  )}
                                  {m.regimes?.length ? (
                                    <Badge variant="secondary" className="rounded-full text-[10px]">
                                      {m.regimes.join(" · ")}
                                    </Badge>
                                  ) : null}
                                </div>
                                {m.detalhe && (
                                  <p className="text-xs text-muted-foreground mt-1">{m.detalhe}</p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {m.responsavel} · {m.periodicidade} · prazo dia {m.diaPrazo} ·{" "}
                                  <span className="text-brand-orange">abrir tela responsável</span>
                                </p>
                              </button>
                              <Select value={st} onValueChange={(v) => handleStatus(m.id, v as TarefaStatus)}>
                                <SelectTrigger className={`h-9 w-full md:w-[180px] rounded-full ${statusClass(st)}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70">
          <CardContent className="p-5 space-y-3">
            <h2 className="font-display text-2xl">Pendências de cadastro</h2>
            {pendCadastro.map((p) => (
              <div key={p.id} className="flex items-start gap-3 rounded-xl border border-border/70 p-3">
                {p.resolvida ? (
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                ) : p.critica ? (
                  <AlertTriangle className="h-4 w-4 text-brand-orange mt-0.5 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-sm">{p.titulo}</div>
                  <p className="text-xs text-muted-foreground">{p.detalhe}</p>
                  {!p.resolvida && (
                    <Link to={p.destino} className="text-xs text-brand-orange hover:underline">
                      Resolver agora
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {pendEscrituracao.length ? (
          <Card className="rounded-2xl border-border/70 lg:col-span-2">
            <CardContent className="p-5 space-y-3">
              <h2 className="font-display text-2xl">Pendências de escrituração</h2>
              <p className="text-xs text-muted-foreground">
                Estado real das telas de Fiscal › Escrituração em {formatCompetencia(competencia)}.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {pendEscrituracao.map((p) => (
                  <div key={p.id} className="flex items-start gap-3 rounded-xl border border-border/70 p-3">
                    {p.resolvida ? (
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    ) : p.critica ? (
                      <AlertTriangle className="h-4 w-4 text-brand-orange mt-0.5 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm">{p.titulo}</div>
                      <p className="text-xs text-muted-foreground">{p.detalhe}</p>
                      {!p.resolvida && (
                        <Link to={p.destino} className="text-xs text-brand-orange hover:underline">
                          Resolver agora
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {pendObrigacoes.length ? (
          <Card className="rounded-2xl border-border/70 lg:col-span-2">
            <CardContent className="p-5 space-y-3">
              <h2 className="font-display text-2xl">Obrigações acessórias</h2>
              <p className="text-xs text-muted-foreground">
                Situação de geração, validação e transmissão em {formatCompetencia(competencia)}.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {pendObrigacoes.map((p) => (
                  <div key={p.id} className="flex items-start gap-3 rounded-xl border border-border/70 p-3">
                    {p.resolvida ? (
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    ) : p.critica ? (
                      <AlertTriangle className="h-4 w-4 text-brand-orange mt-0.5 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm">{p.titulo}</div>
                      <p className="text-xs text-muted-foreground">{p.detalhe}</p>
                      {!p.resolvida && (
                        <Link to={p.destino} className="text-xs text-brand-orange hover:underline">
                          Abrir obrigação
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>


      <Card className="rounded-2xl border-border/70 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm">Atividades da competência</span>
          <div className="flex items-center gap-2">
            <Select value={faseFiltro} onValueChange={setFaseFiltro}>
              <SelectTrigger className="h-9 w-[220px] rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as fases</SelectItem>
                {FASES.map((f) => <SelectItem key={f.slug} value={f.slug}>{f.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="rounded-full"
              disabled={!empresa || Boolean(fechado)}
              onClick={() => {
                if (!empresa) return;
                if (!confirm("Reiniciar o andamento das tarefas desta competência?")) return;
                resetExecucoes(empresa.id, competencia);
                toast.success("Andamento reiniciado");
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" /> Reiniciar
            </Button>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Tarefa</TableHead>
              <TableHead>Fase</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead className="text-right">Prazo</TableHead>
              <TableHead>Obrigatória</TableHead>
              <TableHead className="w-[190px]">Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listaTarefas.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                  Nenhuma tarefa ativa nesta fase.
                </TableCell>
              </TableRow>
            )}
            {listaTarefas.map((m) => {
              const st = statusOf(m.id);
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs">{m.id}</TableCell>
                  <TableCell>{m.titulo}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {FASES.find((f) => f.slug === m.fase)?.title}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{m.responsavel}</TableCell>
                  <TableCell className="text-right font-mono text-xs">Dia {m.diaPrazo}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.obrigatoria ? "Sim" : "Não"}</TableCell>
                  <TableCell>
                    <Select value={st} onValueChange={(v) => handleStatus(m.id, v as TarefaStatus)}>
                      <SelectTrigger className={`h-9 rounded-full ${statusClass(st)}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Card className="rounded-2xl border-border/70">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            {fechado ? <Lock className="h-5 w-5 text-success" /> : <LockOpen className="h-5 w-5 text-brand-orange" />}
            <h2 className="font-display text-2xl">Encerramento da competência</h2>
          </div>
          {fechado ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Competência {formatCompetencia(competencia)} encerrada em{" "}
                {new Date(fechado.fechadoEm).toLocaleString("pt-BR")}
                {fechado.observacao ? ` · ${fechado.observacao}` : ""}
              </p>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  reabrirPeriodo(fechado.empresaId, fechado.competencia);
                  toast.success("Período reaberto");
                }}
              >
                Reabrir período
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {bloqueios.map((b) => (
                  <div key={b.id} className="text-sm text-brand-orange flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> {b.titulo} pendente
                  </div>
                ))}
                {obrigatoriasPendentes.map((t) => (
                  <div key={t.id} className="text-sm text-brand-orange flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Tarefa obrigatória pendente: {t.titulo}
                  </div>
                ))}
                {podeFechar && (
                  <div className="text-sm text-success flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Todos os requisitos atendidos.
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  value={obsFechamento}
                  onChange={(e) => setObsFechamento(e.target.value)}
                  placeholder="Observação do encerramento (opcional)"
                  className="flex-1 min-w-[240px] rounded-full bg-card"
                />
                <Button
                  className="rounded-full bg-brand-orange text-primary-foreground hover:bg-brand-orange/90"
                  disabled={!podeFechar}
                  onClick={handleFechar}
                >
                  <Lock className="h-4 w-4 mr-2" /> Encerrar competência
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AssistenteFechamento
        resumo={`${empresa ? empresa.razao : "Sem empresa"} · ${formatCompetencia(competencia)}`}
        contexto={{
          empresa: empresa
            ? { razao: empresa.razao, cnpj: empresa.cnpj, regime: empresa.regime }
            : null,
          competencia: formatCompetencia(competencia),
          periodoFechado: Boolean(fechado),
          progressoGeral: `${progresso}%`,
          fases: fases.map((f) => ({
            fase: f.title,
            objetivo: f.desc,
            concluidas: f.concluidas,
            total: f.total,
            progresso: `${f.progresso}%`,
          })),
          pendenciasCadastro: pendCadastro
            .filter((p) => !p.resolvida)
            .map((p) => ({ item: p.titulo, detalhe: p.detalhe, tela: p.destino, bloqueia: p.critica })),
          tarefasPendentes: tarefasPendentes.map((m) => ({
            codigo: m.id,
            tarefa: m.titulo,
            fase: FASES.find((f) => f.slug === m.fase)?.title,
            responsavel: m.responsavel,
            prazoDia: m.diaPrazo,
            obrigatoria: m.obrigatoria,
            situacao: statusOf(m.id),
          })),
          podeEncerrar: Boolean(podeFechar),
        }}
      />
    </div>
  );
}
