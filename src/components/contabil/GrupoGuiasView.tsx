import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, Banknote, CalendarClock, CheckCircle2, Landmark, RefreshCw,
  Search, Sparkles, Wallet2,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, Input, Progress, Separator,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import GuiaPainel, { corStatus } from "@/components/contabil/GuiaPainel";
import {
  FLUXO, alertas, auditoriaDoGrupo, brl, calendario, conciliarRetornoBancario,
  dataBR, emitirGuia, etapaDoGrupo, grupoDe, kpisDe, listarCompensacoes,
  listarParcelamentos, detalharParcelamento, resumoGuias, useGuias,
  validarGrupo, pendenciasGuias, type Guia, type GrupoSlug,
} from "@/lib/guiasStore";
import { getConfig, setConfig } from "@/lib/apuracaoStore";

const ABAS: [string, string][] = [
  ["resumo", "Resumo"], ["guias", "Guias"], ["pagamentos", "Pagamentos"],
  ["parcelamentos", "Parcelamentos"], ["calendario", "Calendário"],
  ["compensacoes", "Compensações"], ["baixas", "Baixas"],
  ["bancos", "Integrações bancárias"], ["historico", "Histórico"],
  ["auditoria", "Auditoria"], ["config", "Configurações"],
];

function Kpi({ label, valor, hint, destaque }: { label: string; valor: string; hint?: string; destaque?: boolean }) {
  return (
    <div className={`min-w-0 rounded-2xl border p-3 ${destaque ? "border-destructive/40 bg-destructive/5" : "border-border/70"}`}>
      <div className="text-[10px] uppercase tracking-[0.06em] leading-tight break-words text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-mono text-sm break-words ${destaque ? "text-destructive" : ""}`}>{valor}</div>
      {hint && <div className="text-[10px] break-words text-muted-foreground">{hint}</div>}
    </div>
  );
}

export default function GrupoGuiasView({ grupo }: { grupo: GrupoSlug }) {
  const def = grupoDe(grupo);
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const todas = useGuias(empresa?.id, competencia);
  const guias = useMemo(() => todas.filter((g) => g.grupo === grupo), [todas, grupo]);

  const [aba, setAba] = useState("resumo");
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("Todos");
  const [selecionada, setSelecionada] = useState<Guia | null>(null);
  const [cfg, setCfgLocal] = useState(() => getConfig());

  const filtradas = useMemo(
    () =>
      guias.filter(
        (g) =>
          (status === "Todos" || g.status === status) &&
          `${g.tributo} ${g.codigoReceita} ${g.orgao} ${g.numero} ${g.responsavel}`
            .toLowerCase()
            .includes(busca.toLowerCase()),
      ),
    [guias, busca, status],
  );

  const r = resumoGuias(guias);
  const kpis = kpisDe(guias, empresa?.id, competencia);
  const validacoes = validarGrupo(guias, empresa?.id);
  const etapa = etapaDoGrupo(guias);
  const eventos = calendario(empresa?.id, competencia);
  const compensacoes = listarCompensacoes(empresa?.id, competencia);
  const parcelamentos = listarParcelamentos(empresa?.id);
  const avisos = alertas(empresa?.id, competencia);
  const auditoria = auditoriaDoGrupo(guias);
  const pagamentos = guias.flatMap((g) => g.pagamentos.map((p) => ({ ...p, guia: g })));

  const Icone = grupo === "darf" ? Banknote : Landmark;

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fiscal · Guias e recolhimentos</div>
          <h1 className="font-display text-3xl sm:text-4xl flex items-center gap-3">
            <span className="rounded-2xl bg-brand-orange/10 p-2"><Icone className="h-6 w-6 text-brand-orange" /></span>
            {def.titulo}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{def.descricao}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary" className="rounded-full">{formatCompetencia(competencia)}</Badge>
            <Badge variant="secondary" className="rounded-full">{empresa?.razao ?? "Nenhuma empresa selecionada"}</Badge>
            <Badge variant="secondary" className="rounded-full">Etapa {etapa}/10 · {FLUXO[etapa - 1]}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            className="rounded-full bg-brand-orange hover:bg-brand-orange/90"
            onClick={() => {
              guias.filter((g) => !g.emitida).forEach((g) => emitirGuia(g, "Sistema"));
              toast.success("Guias emitidas com código de barras e PIX");
            }}
          >
            <Banknote className="mr-1.5 h-4 w-4" /> Emitir todas
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => {
              const n = conciliarRetornoBancario(guias);
              toast.success(n ? `${n} guia(s) baixadas pelo retorno bancário` : "Nenhuma guia elegível para baixa automática");
            }}
          >
            <RefreshCw className="mr-1.5 h-4 w-4" /> Conciliar retorno
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-9">
        {kpis.map((k) => <Kpi key={k.label} {...k} />)}
      </div>

      <Card className="rounded-3xl border-border/70">
        <CardContent className="space-y-2 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl">Fluxo operacional</h2>
            <span className="text-xs text-muted-foreground">{FLUXO[etapa - 1]}</span>
          </div>
          <Progress value={(etapa / FLUXO.length) * 100} />
          <div className="flex flex-wrap gap-1.5">
            {FLUXO.map((f, i) => (
              <Badge
                key={f}
                variant="secondary"
                className={`rounded-full text-[10px] ${i < etapa ? "bg-brand-orange/15 text-brand-orange" : ""}`}
              >
                {i + 1}. {f}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs value={aba} onValueChange={setAba}>
        <TabsList className="flex h-auto w-full flex-wrap rounded-full">
          {ABAS.map(([v, l]) => (
            <TabsTrigger key={v} value={v} className="rounded-full text-xs">{l}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="resumo" className="mt-4 grid gap-4 xl:grid-cols-2">
          <Card className="rounded-3xl border-border/70">
            <CardContent className="space-y-2 p-5">
              <h3 className="font-display text-xl">Validações</h3>
              {validacoes.map((v) => (
                <div key={v.id} className="rounded-2xl border border-border/70 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    {v.nivel === "erro" ? (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    ) : v.nivel === "advertência" ? (
                      <AlertTriangle className="h-4 w-4 text-brand-orange" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    )}
                    {v.titulo}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{v.detalhe}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-border/70">
            <CardContent className="space-y-2 p-5">
              <h3 className="font-display text-xl">Alertas inteligentes</h3>
              {avisos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum alerta na competência.</p>}
              {avisos.slice(0, 8).map((a) => (
                <div key={a.id} className="rounded-2xl border border-border/70 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`h-2 w-2 rounded-full ${a.nivel === "crítico" ? "bg-destructive" : a.nivel === "atenção" ? "bg-brand-orange" : "bg-brand-blue"}`} />
                    {a.titulo}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{a.detalhe}</p>
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground">
                Notificações ativas: {Object.entries(cfg.notificar).filter(([, v]) => v).map(([k]) => k).join(", ")}.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guias" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Tributo, código, órgão, responsável…"
                className="w-72 rounded-full pl-9"
              />
            </div>
            {["Todos", "Em aberto", "Emitida", "Paga", "Vencida", "Compensada"].map((s) => (
              <Badge
                key={s}
                onClick={() => setStatus(s)}
                className={`cursor-pointer rounded-full ${status === s ? "bg-brand-orange/15 text-brand-orange" : "bg-muted text-muted-foreground"}`}
              >
                {s}
              </Badge>
            ))}
          </div>
          <Card className="rounded-3xl border-border/70">
            <CardContent className="p-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competência</TableHead>
                    <TableHead>Tributo</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Nº da guia</TableHead>
                    <TableHead>Órgão</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Multa</TableHead>
                    <TableHead className="text-right">Juros</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtradas.map((g) => (
                    <TableRow key={g.id} className="cursor-pointer" onClick={() => setSelecionada(g)}>
                      <TableCell className="font-mono text-xs">{g.competencia}</TableCell>
                      <TableCell>{g.tributo}</TableCell>
                      <TableCell className="font-mono text-xs">{g.codigoReceita}</TableCell>
                      <TableCell className="font-mono text-xs">{g.numero}</TableCell>
                      <TableCell className="text-xs">{g.orgao}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{brl(g.valorOriginal)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{brl(g.multa)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{brl(g.juros)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{brl(g.valorFinal)}</TableCell>
                      <TableCell className="font-mono text-xs">{dataBR(g.vencimento)}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={`rounded-full ${corStatus(g.status)}`}>{g.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{g.origem}</TableCell>
                    </TableRow>
                  ))}
                  {filtradas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={12} className="py-8 text-center text-sm text-muted-foreground">
                        Nenhuma guia para os filtros aplicados nesta competência.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagamentos" className="mt-4">
          <Card className="rounded-3xl border-border/70">
            <CardContent className="p-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Guia</TableHead>
                    <TableHead>Meio</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead>Autenticação</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Conciliado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagamentos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{dataBR(p.data)}</TableCell>
                      <TableCell className="text-xs">{p.guia.tipo} · {p.guia.tributo}</TableCell>
                      <TableCell className="text-xs">{p.meio}</TableCell>
                      <TableCell className="text-xs">{p.banco}</TableCell>
                      <TableCell className="font-mono text-xs">{p.autenticacao}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{brl(p.valor)}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={`rounded-full ${p.conciliado ? "bg-success/15 text-success" : "bg-brand-orange/15 text-brand-orange"}`}>
                          {p.conciliado ? "Sim" : "Pendente"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pagamentos.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Nenhum pagamento registrado.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parcelamentos" className="mt-4 space-y-3">
          {parcelamentos.map((p) => {
            const d = detalharParcelamento(p);
            return (
              <Card key={p.id} className="rounded-3xl border-border/70">
                <CardContent className="space-y-2 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display text-xl">{p.tipo}</h3>
                      <p className="text-xs text-muted-foreground">{p.orgao} · processo {p.processo} · {p.tributos}</p>
                    </div>
                    <Badge className={`rounded-full ${p.situacao === "Ativo" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{p.situacao}</Badge>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
                    <Kpi label="Parcelas" valor={`${d.pagas}/${p.parcelas}`} />
                    <Kpi label="Vencidas" valor={String(d.vencidas)} destaque={d.vencidas > 0} />
                    <Kpi label="Futuras" valor={String(d.futuras)} />
                    <Kpi label="Valor da parcela" valor={brl(p.valorParcela)} />
                    <Kpi label="Saldo devedor" valor={brl(d.saldoDevedor)} />
                    <Kpi label="Próximo vencimento" valor={dataBR(d.proximo)} />
                  </div>
                  <Button asChild size="sm" variant="outline" className="rounded-full">
                    <Link to="/fiscal/guias/parcelamentos">Abrir parcelamento</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="calendario" className="mt-4">
          <Card className="rounded-3xl border-border/70">
            <CardContent className="p-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Detalhe</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Prioridade</TableHead>
                    <TableHead className="text-center">Prazo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventos.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs">{dataBR(e.data)}</TableCell>
                      <TableCell className="text-xs">{e.titulo}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.detalhe}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{brl(e.valor)}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={`rounded-full ${e.prioridade === "Alta" ? "bg-destructive/15 text-destructive" : e.prioridade === "Média" ? "bg-brand-orange/15 text-brand-orange" : "bg-muted text-muted-foreground"}`}>
                          {e.prioridade}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {e.dias >= 0 ? `${e.dias} dia(s)` : `${Math.abs(e.dias)} em atraso`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compensacoes" className="mt-4">
          <Card className="rounded-3xl border-border/70">
            <CardContent className="p-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Origem do crédito</TableHead>
                    <TableHead>Tributo compensado</TableHead>
                    <TableHead className="text-right">Crédito</TableHead>
                    <TableHead className="text-right">Utilizado</TableHead>
                    <TableHead className="text-right">Saldo credor</TableHead>
                    <TableHead className="text-center">Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compensacoes.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.documento}</TableCell>
                      <TableCell className="text-xs">{c.tipo}</TableCell>
                      <TableCell className="text-xs">{c.origemCredito}</TableCell>
                      <TableCell className="text-xs">{c.tributoCompensado}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{brl(c.valorCredito)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{brl(c.valorUtilizado)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{brl(c.valorCredito - c.valorUtilizado)}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="rounded-full bg-brand-blue/15 text-brand-blue">{c.situacao}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="baixas" className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Guias conciliadas" valor={String(r.conciliadas)} />
          <Kpi label="Total baixado" valor={brl(r.pago)} />
          <Kpi label="Saldo a recolher" valor={brl(r.aRecolher)} destaque={r.aRecolher > 0} />
          <Kpi label="Baixas pendentes" valor={String(guias.filter((g) => g.pagamentos.some((p) => !p.conciliado)).length)} />
        </TabsContent>

        <TabsContent value="bancos" className="mt-4">
          <Card className="rounded-3xl border-border/70">
            <CardContent className="space-y-3 p-5">
              <h3 className="font-display text-xl">Integrações bancárias</h3>
              {[
                ["PIX", "Pagamento imediato com QR Code dinâmico por guia."],
                ["Open Finance", "Consulta de saldo e confirmação automática de débito."],
                ["CNAB 240 / retorno", "Importação de arquivo de retorno para baixa em lote."],
                ["Tesouraria", "Reserva de caixa e agendamento de pagamentos."],
              ].map(([n, d]) => (
                <div key={n} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 p-3">
                  <div>
                    <div className="text-sm">{n}</div>
                    <p className="text-xs text-muted-foreground">{d}</p>
                  </div>
                  <Badge className="rounded-full bg-success/15 text-success">Simulada</Badge>
                </div>
              ))}
              <Separator />
              <Button
                className="rounded-full bg-brand-orange hover:bg-brand-orange/90"
                onClick={() => {
                  const n = conciliarRetornoBancario(guias);
                  toast.success(n ? `${n} baixa(s) processadas do retorno CNAB` : "Retorno sem novas ocorrências");
                }}
              >
                <Wallet2 className="mr-1.5 h-4 w-4" /> Processar retorno bancário
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <Card className="rounded-3xl border-border/70">
            <CardContent className="p-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guia</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor final</TableHead>
                    <TableHead className="text-right">Pago</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Responsável</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guias.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="text-xs">{g.tipo} · {g.tributo}</TableCell>
                      <TableCell className="font-mono text-xs">{dataBR(g.emissao)}</TableCell>
                      <TableCell className="font-mono text-xs">{dataBR(g.vencimento)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{brl(g.valorFinal)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{brl(g.pago)}</TableCell>
                      <TableCell className="text-center"><Badge className={`rounded-full ${corStatus(g.status)}`}>{g.status}</Badge></TableCell>
                      <TableCell className="text-xs">{g.responsavel}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auditoria" className="mt-4 space-y-2">
          {auditoria.length === 0 && <p className="text-sm text-muted-foreground">Nenhum evento registrado nesta competência.</p>}
          {auditoria.map((l) => (
            <div key={l.id} className="rounded-2xl border border-border/70 p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="secondary" className="rounded-full">{l.acao}</Badge>
                <span className="text-muted-foreground">{new Date(l.em).toLocaleString("pt-BR")} · {l.usuario} · {l.guia}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{l.detalhe}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <Card className="rounded-3xl border-border/70">
            <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
              {[
                ["multaDiaria", "Multa diária", "%"],
                ["multaTeto", "Teto da multa", "%"],
                ["jurosMes", "Juros do mês do pagamento", "%"],
                ["selicMes", "SELIC mensal", "%"],
                ["alertaDias", "Alertar com antecedência (dias)", ""],
                ["aprovacaoAcima", "Exigir aprovação acima de (R$)", ""],
              ].map(([campo, label, sufixo]) => (
                <label key={campo} className="space-y-1">
                  <span className="text-xs text-muted-foreground">{label}{sufixo && ` (${sufixo})`}</span>
                  <Input
                    type="number"
                    step="any"
                    className="rounded-full"
                    value={String((cfg as unknown as Record<string, number>)[campo])}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      const novo = { ...cfg, [campo]: v };
                      setCfgLocal(novo);
                      setConfig({ [campo]: v } as never);
                    }}
                  />
                </label>
              ))}
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Órgãos arrecadadores, códigos de receita, datas de vencimento e regras por regime são
                aplicados automaticamente pelos motores de cada tipo de guia. Todas as ações geram log imutável.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <GuiaPainel guia={selecionada} aberto={!!selecionada} onClose={() => setSelecionada(null)} />

      <AssistenteFechamento
        rotulo="IA ajudante"
        resumo={`${def.titulo} — ${formatCompetencia(competencia)}: ${brl(r.aRecolher)} a recolher.`}
        contexto={{
          tela: `Guias e recolhimentos — ${def.titulo}`,
          competencia,
          empresa: empresa?.razao,
          resumo: r,
          etapa: FLUXO[etapa - 1],
          guias: guias.map((g) => ({
            tributo: g.tributo, codigo: g.codigoReceita, orgao: g.orgao,
            vencimento: g.vencimento, valor: g.valorFinal, status: g.status,
          })),
          validacoes,
          alertas: avisos.slice(0, 10),
        }}
      />
    </div>
  );
}
