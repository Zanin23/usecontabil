import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Banknote, CalendarClock, ChevronRight,
  Download, Filter, HandCoins, Landmark, Plus, Receipt, RotateCcw, Search, TrendingUp, Wallet2,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle,
  Input, Label, Progress, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Tabs, TabsContent, TabsList, TabsTrigger, Textarea,
} from "@/design-system/mj-design-system-db98fa";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { toast } from "sonner";
import AssistenteCampos from "@/components/contabil/AssistenteCampos";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { useCompetencia } from "@/lib/competencia";
import { confirmarExclusao } from "@/lib/confirmar";
import BlocoOrientacao from "@/components/ux/BlocoOrientacao";
import {
  CONTAS_EVENT, CONTAS_TESOURARIA, REGUA, brl, carteira, contaPorId, dataBR,
  estornarBaixa, excluirMovimento, fluxo, hojeISO, inadimplentes, lancarMovimento,
  registrarAcao, registrarBaixa, resumo, saldos,
  type TipoTitulo, type TituloCalculado,
} from "@/lib/contasCaixaStore";

/* ============================ apoio visual =============================== */

const TELAS: Record<string, { titulo: string; desc: string; icon: typeof Receipt }> = {
  "contas-pagar": { titulo: "Contas a pagar", desc: "Carteira de obrigações, liquidações e encargos por vencimento.", icon: ArrowUpRight },
  "contas-receber": { titulo: "Contas a receber", desc: "Recebíveis por cliente, aging e baixas com encargos.", icon: ArrowDownRight },
  caixa: { titulo: "Caixa e tesouraria", desc: "Saldos de caixa, bancos e aplicações com movimento auditável.", icon: Wallet2 },
  "fluxo-caixa": { titulo: "Fluxo de caixa", desc: "Projeção semanal de entradas, saídas e saldo acumulado.", icon: TrendingUp },
  cobranca: { titulo: "Cobrança e inadimplência", desc: "Régua de cobrança, aging por cliente e histórico de ações.", icon: HandCoins },
};

function Kpi({
  label, valor, hint, tom,
}: { label: string; valor: string; hint?: string; tom?: "alerta" | "ok" | "destaque" }) {
  const borda =
    tom === "alerta" ? "border-destructive/40 bg-destructive/5"
      : tom === "ok" ? "border-emerald-500/40 bg-emerald-500/5"
        : tom === "destaque" ? "border-brand-orange/40 bg-brand-orange/5"
          : "border-border/70";
  const cor = tom === "alerta" ? "text-destructive" : tom === "ok" ? "text-emerald-600 dark:text-emerald-400" : tom === "destaque" ? "text-brand-orange" : "";
  return (
    <div className={`min-w-0 rounded-2xl border p-4 ${borda}`}>
      <div className="text-[10px] uppercase leading-tight tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className={`mt-1 break-words font-mono text-lg ${cor}`}>{valor}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

const corSituacao = (s: string) =>
  s === "Liquidado" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
    : s === "Vencido" ? "bg-destructive/15 text-destructive"
      : s === "Parcial" ? "bg-brand-orange/15 text-brand-orange"
        : s === "Vence hoje" ? "bg-warn/15 text-warn"
          : "bg-muted text-muted-foreground";

const CHART_TOOLTIP = {
  contentStyle: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    fontSize: 12,
    color: "var(--foreground)",
  },
} as const;

/* ============================ baixa de título ============================ */

function DialogBaixa({
  titulo, tipo, onClose,
}: { titulo: TituloCalculado | null; tipo: TipoTitulo; onClose: () => void }) {
  const [data, setData] = useState(hojeISO());
  const [valor, setValor] = useState("");
  const [juros, setJuros] = useState("");
  const [multa, setMulta] = useState("");
  const [desconto, setDesconto] = useState("0");
  const [contaId, setContaId] = useState(CONTAS_TESOURARIA[1].id);
  const [forma, setForma] = useState("PIX");

  useEffect(() => {
    if (!titulo) return;
    setData(hojeISO());
    setValor(String(titulo.saldo.toFixed(2)));
    setJuros(String(titulo.juros.toFixed(2)));
    setMulta(String(titulo.multa.toFixed(2)));
    setDesconto("0");
  }, [titulo]);

  if (!titulo) return null;
  const n = (v: string) => Number(String(v).replace(",", ".")) || 0;
  const totalPago = n(valor) + n(juros) + n(multa) - n(desconto);

  const salvar = () => {
    try {
      registrarBaixa({
        titulo, data, valor: n(valor), juros: n(juros), multa: n(multa),
        desconto: n(desconto), contaId, forma,
      });
      toast.success(`Baixa registrada · ${brl(totalPago)} em ${contaPorId(contaId)?.nome}`);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível registrar a baixa.");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {tipo === "pagar" ? "Baixa de pagamento" : "Baixa de recebimento"}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-2xl border border-border/70 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{titulo.parceiro}</span>
            <Badge variant="secondary" className="rounded-full">{titulo.numero} · parcela {titulo.parcela}</Badge>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
            <div>Vencimento<div className="font-mono text-foreground">{dataBR(titulo.vencimento)}</div></div>
            <div>Saldo devedor<div className="font-mono text-foreground">{brl(titulo.saldo)}</div></div>
            <div>Atraso<div className="font-mono text-foreground">{titulo.diasAtraso} dia(s)</div></div>
            <div>Total com encargos<div className="font-mono text-brand-orange">{brl(titulo.totalDevido)}</div></div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Data da baixa</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Valor principal</Label>
            <Input value={valor} onChange={(e) => setValor(e.target.value)} className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Desconto</Label>
            <Input value={desconto} onChange={(e) => setDesconto(e.target.value)} className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Juros (1% a.m.)</Label>
            <Input value={juros} onChange={(e) => setJuros(e.target.value)} className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Multa (2%)</Label>
            <Input value={multa} onChange={(e) => setMulta(e.target.value)} className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Forma</Label>
            <Select value={forma} onValueChange={setForma}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["PIX", "TED", "Boleto", "Dinheiro", "Cartão", "Débito automático"].map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Conta de tesouraria</Label>
            <Select value={contaId} onValueChange={setContaId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONTAS_TESOURARIA.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-2xl border border-brand-orange/40 bg-brand-orange/5 p-3">
            <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Total da liquidação</div>
            <div className="mt-1 font-mono text-lg text-brand-orange">{brl(totalPago)}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <AssistenteCampos
            titulo={tipo === "pagar" ? "Baixa de contas a pagar" : "Baixa de contas a receber"}
            campos={[
              { key: "data", label: "Data da baixa", ajuda: "Data efetiva do pagamento/recebimento — é ela que define o cálculo de juros e o movimento no caixa." },
              { key: "valor", label: "Valor principal", ajuda: "Parte do saldo devedor que está sendo liquidada. Menor que o saldo gera baixa parcial." },
              { key: "juros", label: "Juros", ajuda: "1% ao mês pro rata die sobre o saldo, contados da data de vencimento." },
              { key: "multa", label: "Multa", ajuda: "2% sobre o saldo devedor quando há atraso." },
              { key: "desconto", label: "Desconto", ajuda: "Abatimento negociado (pontualidade, acordo comercial)." },
              { key: "conta", label: "Conta de tesouraria", ajuda: "Caixa, banco ou cartão que recebeu/pagou o valor. Afeta o saldo da conta." },
              { key: "forma", label: "Forma", ajuda: "Meio utilizado. Usada na conciliação bancária do módulo Financeiro." },
            ]}
            draft={{ data, valor, juros, multa, desconto, conta: contaId, forma }}
            contextoExtra={{ titulo: titulo.numero, parceiro: titulo.parceiro, saldo: titulo.saldo }}
          />
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-full" onClick={onClose}>Cancelar</Button>
            <Button className="rounded-lg bg-brand-orange hover:bg-brand-orange/90" onClick={salvar}>
              Confirmar baixa
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================ carteira =================================== */

function Carteira({ tipo }: { tipo: TipoTitulo }) {
  const { empresa } = useEmpresaAtual();
  const { competencia, competenciasNoPeriodo, isPeriodo, competenciaFim } = useCompetencia();
  const [tick, setTick] = useState(0);
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState("todas");
  const [alvo, setAlvo] = useState<TituloCalculado | null>(null);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    window.addEventListener(CONTAS_EVENT, refresh);
    return () => window.removeEventListener(CONTAS_EVENT, refresh);
  }, [refresh]);

  const lista = useMemo(
    () => carteira(tipo, empresa?.id, competenciasNoPeriodo),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tipo, empresa, competenciasNoPeriodo, tick],
  );
  const r = useMemo(() => resumo(lista), [lista]);

  const filtrada = lista.filter((t) => {
    const okBusca = !busca || `${t.parceiro} ${t.numero} ${t.documento} ${t.categoria}`.toLowerCase().includes(busca.toLowerCase());
    const okSit =
      situacao === "todas" ? true
        : situacao === "abertos" ? t.saldo > 0
          : situacao === "vencidos" ? t.diasAtraso > 0
            : situacao === "liquidados" ? t.saldo === 0
              : true;
    return okBusca && okSit;
  });

  const percLiquidado = r.total ? Math.round((r.liquidado / r.total) * 100) : 0;
  const historico = lista.flatMap((t) => t.baixas.map((b) => ({ b, t }))).sort((a, b) => b.b.criadoEm.localeCompare(a.b.criadoEm));
  const rotulo = tipo === "pagar" ? "pagar" : "receber";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Carteira do período" valor={brl(r.total)} hint={`${r.qtd} títulos`} />
        <Kpi label={`Em aberto a ${rotulo}`} valor={brl(r.aberto)} tom="destaque" />
        <Kpi label="Vencidos" valor={brl(r.vencido)} hint={`${r.qtdVencidos} título(s)`} tom={r.vencido > 0 ? "alerta" : undefined} />
        <Kpi label="Encargos calculados" valor={brl(r.encargos)} hint="Multa 2% + juros 1% a.m." />
        <Kpi label="Liquidado" valor={brl(r.liquidado)} hint={`${percLiquidado}% da carteira`} tom="ok" />
      </div>

      <Tabs defaultValue="titulos">
        <TabsList className="rounded-full">
          <TabsTrigger value="titulos" className="rounded-full">Títulos</TabsTrigger>
          <TabsTrigger value="aging" className="rounded-full">Aging</TabsTrigger>
          <TabsTrigger value="analise" className="rounded-full">Análise</TabsTrigger>
          <TabsTrigger value="historico" className="rounded-full">Histórico de baixas</TabsTrigger>
        </TabsList>

        <TabsContent value="titulos" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por parceiro, título, documento ou categoria" className="pl-9" />
            </div>
            <Select value={situacao} onValueChange={setSituacao}>
              <SelectTrigger className="w-[190px]"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as situações</SelectItem>
                <SelectItem value="abertos">Somente em aberto</SelectItem>
                <SelectItem value="vencidos">Somente vencidos</SelectItem>
                <SelectItem value="liquidados">Somente liquidados</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="rounded-full" onClick={() => toast.success("Relação exportada em CSV.")}>
              <Download className="mr-2 h-4 w-4" />Exportar
            </Button>
          </div>

          <Card className="rounded-xl shadow-card">
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>{tipo === "pagar" ? "Fornecedor" : "Cliente"}</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="font-mono">Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">Encargos</TableHead>
                    <TableHead className="text-center">Situação</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrada.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">
                        {t.numero}
                        <div className="text-[10px] text-muted-foreground">{t.documento} · {t.parcela}</div>
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate">{t.parceiro}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.categoria}<div className="text-[10px]">{t.centroCusto}</div></TableCell>
                      <TableCell className="font-mono text-xs">
                        {dataBR(t.vencimento)}
                        {t.diasAtraso > 0 && <div className="text-[10px] text-destructive">{t.diasAtraso} d. atraso</div>}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{brl(t.valor)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{brl(t.saldo)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-brand-orange">
                        {t.multa + t.juros > 0 ? brl(t.multa + t.juros) : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`rounded-full ${corSituacao(t.situacao)}`} variant="secondary">{t.situacao}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {t.saldo > 0 ? (
                          <Button size="sm" className="rounded-lg bg-brand-orange hover:bg-brand-orange/90" onClick={() => setAlvo(t)}>
                            <Banknote className="mr-1.5 h-3.5 w-3.5" />Baixar
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Liquidado</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtrada.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">Nenhum título encontrado com os filtros atuais.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aging" className="mt-4 space-y-4">
          <Card className="rounded-xl shadow-card">
            <CardContent className="space-y-4 p-6">
              <div>
                <h3 className="font-display text-xl">Aging da carteira</h3>
                <p className="text-sm text-muted-foreground">Saldo em aberto distribuído por faixa de vencimento.</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={r.porFaixa}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="faixa" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                    <Tooltip {...CHART_TOOLTIP} formatter={(v: number) => brl(Number(v))} />
                    <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                      {r.porFaixa.map((f, i) => (
                        <Cell key={f.faixa} fill={i === 0 ? "var(--brand-blue)" : i > 3 ? "var(--destructive)" : "var(--brand-orange)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                {r.porFaixa.map((f) => (
                  <Kpi key={f.faixa} label={f.faixa} valor={brl(f.valor)} hint={`${f.qtd} título(s)`} tom={f.faixa !== "A vencer" && f.valor > 0 ? "alerta" : undefined} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analise" className="mt-4 grid gap-4 lg:grid-cols-2">
          {[{ t: "Concentração por categoria", d: r.porCategoria }, { t: tipo === "pagar" ? "Maiores fornecedores" : "Maiores clientes", d: r.porParceiro }].map((bloco) => {
            const maior = Math.max(1, ...bloco.d.map((x) => x.valor));
            return (
              <Card key={bloco.t} className="rounded-xl shadow-card">
                <CardContent className="space-y-4 p-6">
                  <h3 className="font-display text-xl">{bloco.t}</h3>
                  <div className="space-y-3">
                    {bloco.d.map((x) => (
                      <div key={x.nome} className="space-y-1">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="truncate">{x.nome}</span>
                          <span className="shrink-0 font-mono text-xs">{brl(x.valor)}</span>
                        </div>
                        <Progress value={(x.valor / maior) * 100} className="h-1.5" />
                      </div>
                    ))}
                    {bloco.d.length === 0 && <p className="text-sm text-muted-foreground">Sem saldo em aberto no período.</p>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <Card className="rounded-xl shadow-card">
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono">Data</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead className="text-right">Principal</TableHead>
                    <TableHead className="text-right">Encargos</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Estorno</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historico.map(({ b, t }) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs">{dataBR(b.data)}</TableCell>
                      <TableCell className="text-xs">{t.numero}<div className="text-[10px] text-muted-foreground">{t.parceiro}</div></TableCell>
                      <TableCell className="text-xs">{contaPorId(b.contaId)?.nome || b.contaId}</TableCell>
                      <TableCell className="text-xs">{b.forma}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{brl(b.valor)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{brl(b.juros + b.multa)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{brl(b.valor + b.juros + b.multa - b.desconto)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="rounded-full" onClick={() => { estornarBaixa(b.id); toast.success("Baixa estornada."); }}>
                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />Estornar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {historico.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">Nenhuma baixa registrada nesta competência.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DialogBaixa titulo={alvo} tipo={tipo} onClose={() => setAlvo(null)} />
    </div>
  );
}

/* ============================ tesouraria ================================= */

function CaixaTesouraria() {
  const { competencia, competenciasNoPeriodo, isPeriodo, competenciaFim } = useCompetencia();
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    window.addEventListener(CONTAS_EVENT, refresh);
    return () => window.removeEventListener(CONTAS_EVENT, refresh);
  }, [refresh]);

  const contas = useMemo(() => saldos(competenciasNoPeriodo), [competenciasNoPeriodo, tick]);
  const [contaId, setContaId] = useState(contas[0]?.id);
  const conta = contas.find((c) => c.id === contaId)!;
  const total = contas.reduce((a, c) => a + c.saldo, 0);
  const disponivel = contas.filter((c) => c.tipo !== "Cartão").reduce((a, c) => a + c.saldo, 0);

  const [novo, setNovo] = useState({ data: hojeISO(), historico: "", tipo: "Entrada" as "Entrada" | "Saída", valor: "" });
  const lancar = () => {
    try {
      lancarMovimento({
        contaId, data: novo.data, historico: novo.historico, tipo: novo.tipo,
        valor: Number(novo.valor.replace(",", ".")) || 0,
      });
      toast.success("Movimento lançado na conta.");
      setNovo({ data: hojeISO(), historico: "", tipo: "Entrada", valor: "" });
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível lançar o movimento.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Saldo consolidado" valor={brl(total)} hint={`${contas.length} contas monitoradas`} tom="destaque" />
        <Kpi label="Disponibilidade imediata" valor={brl(disponivel)} hint="Caixa, bancos e aplicações" tom="ok" />
        <Kpi label="Entradas no período" valor={brl(contas.reduce((a, c) => a + c.entradas, 0))} />
        <Kpi label="Saídas no período" valor={brl(contas.reduce((a, c) => a + c.saidas, 0))} tom="alerta" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <Card className="rounded-xl shadow-card">
          <CardContent className="space-y-2 p-4">
            <div className="px-2 pb-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">Contas</div>
            {contas.map((c) => (
              <button
                key={c.id}
                onClick={() => setContaId(c.id)}
                className={`w-full rounded-2xl border p-3 text-left transition-colors ${c.id === contaId ? "border-brand-orange bg-brand-orange/5" : "border-border/70 hover:bg-muted/50"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm">{c.nome}</span>
                  <Badge variant="secondary" className="shrink-0 rounded-full text-[10px]">{c.tipo}</Badge>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-mono">{c.banco !== "—" ? `ag ${c.agencia} · cc ${c.numero}` : c.numero}</span>
                  <span className={`font-mono ${c.saldo < 0 ? "text-destructive" : "text-foreground"}`}>{brl(c.saldo)}</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-xl shadow-card">
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{conta.tipo} · {conta.responsavel}</div>
                  <h3 className="font-display text-2xl">{conta.nome}</h3>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Saldo atual</div>
                  <div className={`font-mono text-2xl ${conta.saldo < 0 ? "text-destructive" : "text-brand-orange"}`}>{brl(conta.saldo)}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Kpi label="Saldo inicial" valor={brl(conta.saldoInicial)} />
                <Kpi label="Entradas" valor={brl(conta.entradas)} tom="ok" />
                <Kpi label="Saídas" valor={brl(conta.saidas)} tom="alerta" />
              </div>

              <div className="rounded-2xl border border-border/70 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">Lançamento manual de caixa</span>
                  <AssistenteCampos
                    titulo="Lançamento de movimento de caixa"
                    campos={[
                      { key: "data", label: "Data", ajuda: "Data em que o dinheiro efetivamente entrou ou saiu da conta." },
                      { key: "historico", label: "Histórico", ajuda: "Descrição objetiva do movimento (ex.: tarifa bancária, suprimento de caixa)." },
                      { key: "tipo", label: "Tipo", ajuda: "Entrada aumenta o saldo; Saída reduz. Movimentos de títulos são gerados automaticamente pelas baixas." },
                      { key: "valor", label: "Valor", ajuda: "Valor bruto do movimento, sempre positivo." },
                    ]}
                    draft={{ ...novo }}
                    contextoExtra={{ conta: conta.nome, saldoAtual: conta.saldo }}
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                  <Input type="date" value={novo.data} onChange={(e) => setNovo({ ...novo, data: e.target.value })} />
                  <Input className="sm:col-span-2" placeholder="Histórico" value={novo.historico} onChange={(e) => setNovo({ ...novo, historico: e.target.value })} />
                  <Select value={novo.tipo} onValueChange={(v) => setNovo({ ...novo, tipo: v as "Entrada" | "Saída" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Entrada">Entrada</SelectItem>
                      <SelectItem value="Saída">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Input className="font-mono" placeholder="0,00" value={novo.valor} onChange={(e) => setNovo({ ...novo, valor: e.target.value })} />
                    <Button className="rounded-lg bg-brand-orange hover:bg-brand-orange/90" onClick={lancar}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-card">
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono">Data</TableHead>
                    <TableHead>Histórico</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conta.movimentos.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs">{dataBR(m.data)}</TableCell>
                      <TableCell className="text-sm">{m.historico}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.origem}</TableCell>
                      <TableCell className={`text-right font-mono text-xs ${m.tipo === "Entrada" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                        {m.tipo === "Entrada" ? "+" : "−"}{brl(m.valor)}
                      </TableCell>
                      <TableCell className="text-right">
                        {m.origem === "Lançamento manual" ? (
                          <Button size="sm" variant="outline" className="rounded-full" onClick={() => { if (!confirmarExclusao("este movimento")) return; excluirMovimento(m.id); toast.success("Movimento excluído."); }}>Excluir</Button>
                        ) : <span className="text-[11px] text-muted-foreground">Automático</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {conta.movimentos.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Sem movimentos nesta conta. Baixas de títulos aparecem aqui automaticamente.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ============================ fluxo de caixa ============================= */

function FluxoCaixa() {
  const { empresa } = useEmpresaAtual();
  const { competencia, competenciasNoPeriodo } = useCompetencia();
  const [tick, setTick] = useState(0);
  const [semanas, setSemanas] = useState("8");
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    window.addEventListener(CONTAS_EVENT, refresh);
    return () => window.removeEventListener(CONTAS_EVENT, refresh);
  }, [refresh]);

  const dados = useMemo(
    () => fluxo(empresa?.id, competenciasNoPeriodo, Number(semanas)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [empresa, competenciasNoPeriodo, semanas, tick],
  );
  const saldoAtual = useMemo(() => saldos(competenciasNoPeriodo).reduce((a, c) => a + c.saldo, 0), [competenciasNoPeriodo, tick]);
  const pior = dados.reduce((min, s) => (s.acumulado < min.acumulado ? s : min), dados[0]);
  const entradas = dados.reduce((a, s) => a + s.entradas, 0);
  const saidas = dados.reduce((a, s) => a + s.saidas, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Saldo de partida" valor={brl(saldoAtual)} hint="Tesouraria consolidada" tom="destaque" />
        <Kpi label="Entradas projetadas" valor={brl(entradas)} tom="ok" />
        <Kpi label="Saídas projetadas" valor={brl(saidas)} tom="alerta" />
        <Kpi
          label="Pior saldo projetado"
          valor={brl(pior?.acumulado ?? 0)}
          hint={pior?.rotulo}
          tom={(pior?.acumulado ?? 0) < 0 ? "alerta" : "ok"}
        />
      </div>

      {(pior?.acumulado ?? 0) < 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="text-sm">
            <div className="font-medium text-destructive">Necessidade de capital de giro projetada</div>
            <p className="text-muted-foreground">
              O saldo acumulado fica negativo em {pior.rotulo} ({brl(pior.acumulado)}). Avalie antecipar recebíveis,
              renegociar vencimentos com fornecedores ou acionar limite de crédito antes desta data.
            </p>
          </div>
        </div>
      )}

      <Card className="rounded-xl shadow-card">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="font-display text-xl">Projeção semanal</h3>
              <p className="text-sm text-muted-foreground">Saldo acumulado = tesouraria + recebíveis em aberto − pagáveis em aberto.</p>
            </div>
            <Select value={semanas} onValueChange={setSemanas}>
              <SelectTrigger className="w-[170px]"><CalendarClock className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
              <SelectContent>
                {["4", "8", "12", "16"].map((s) => <SelectItem key={s} value={s}>{s} semanas</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dados}>
                <defs>
                  <linearGradient id="grad-acum" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand-orange)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--brand-orange)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                <Tooltip {...CHART_TOOLTIP} formatter={(v: number) => brl(Number(v))} />
                <Area type="monotone" dataKey="acumulado" stroke="var(--brand-orange)" strokeWidth={2} fill="url(#grad-acum)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dados}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                <Tooltip {...CHART_TOOLTIP} formatter={(v: number) => brl(Number(v))} />
                <Bar dataKey="entradas" fill="var(--brand-blue)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="saidas" fill="var(--destructive)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-card">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Semana</TableHead>
                <TableHead className="font-mono">Período</TableHead>
                <TableHead className="text-right">Entradas</TableHead>
                <TableHead className="text-right">Saídas</TableHead>
                <TableHead className="text-right">Líquido</TableHead>
                <TableHead className="text-right">Saldo acumulado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.map((s) => (
                <TableRow key={s.inicio}>
                  <TableCell className="text-sm">{s.rotulo}</TableCell>
                  <TableCell className="font-mono text-xs">{dataBR(s.inicio)} a {dataBR(s.fim)}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">{brl(s.entradas)}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-destructive">{brl(s.saidas)}</TableCell>
                  <TableCell className={`text-right font-mono text-xs ${s.liquido < 0 ? "text-destructive" : ""}`}>{brl(s.liquido)}</TableCell>
                  <TableCell className={`text-right font-mono text-xs ${s.acumulado < 0 ? "text-destructive" : "text-brand-orange"}`}>{brl(s.acumulado)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================ cobrança =================================== */

function Cobranca() {
  const { empresa } = useEmpresaAtual();
  const { competencia, competenciasNoPeriodo, isPeriodo, competenciaFim } = useCompetencia();
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    window.addEventListener(CONTAS_EVENT, refresh);
    return () => window.removeEventListener(CONTAS_EVENT, refresh);
  }, [refresh]);

  const lista = useMemo(
    () => inadimplentes(empresa?.id, competenciasNoPeriodo),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [empresa, competenciasNoPeriodo, tick],
  );
  const [alvo, setAlvo] = useState<string | null>(null);
  const [obs, setObs] = useState("");
  const selecionado = lista.find((i) => i.parceiro === alvo);

  const total = lista.reduce((a, i) => a + i.saldo, 0);
  const encargos = lista.reduce((a, i) => a + i.encargos, 0);
  const criticos = lista.filter((i) => i.maiorAtraso > 60);

  const registrar = () => {
    if (!selecionado) return;
    selecionado.titulos.forEach((t) =>
      registrarAcao({ tituloId: t.id, data: hojeISO(), acao: selecionado.acao.acao, observacao: obs || selecionado.acao.descricao }),
    );
    toast.success(`Ação "${selecionado.acao.acao}" registrada para ${selecionado.parceiro}.`);
    setObs("");
    setAlvo(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Inadimplência total" valor={brl(total)} hint={`${lista.length} cliente(s)`} tom={total > 0 ? "alerta" : "ok"} />
        <Kpi label="Encargos acumulados" valor={brl(encargos)} hint="Multa + juros exigíveis" />
        <Kpi label="Casos críticos" valor={String(criticos.length)} hint="Acima de 60 dias de atraso" tom={criticos.length ? "alerta" : "ok"} />
        <Kpi label="Provisão sugerida (PCLD)" valor={brl(criticos.reduce((a, i) => a + i.saldo, 0))} hint="Regra: atraso > 60 dias" tom="destaque" />
      </div>

      <Tabs defaultValue="clientes">
        <TabsList className="rounded-full">
          <TabsTrigger value="clientes" className="rounded-full">Clientes em atraso</TabsTrigger>
          <TabsTrigger value="regua" className="rounded-full">Régua de cobrança</TabsTrigger>
        </TabsList>

        <TabsContent value="clientes" className="mt-4 space-y-3">
          {lista.map((i) => (
            <Card key={i.parceiro} className="rounded-xl shadow-card">
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-xl">{i.parceiro}</h3>
                      <Badge variant="secondary" className="rounded-full bg-destructive/15 text-destructive">{i.faixa}</Badge>
                      <Badge variant="secondary" className="rounded-full">{i.acao.acao}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {i.acao.descricao} · Canal: {i.acao.canal} · Responsável: {i.acao.responsavel}
                    </p>
                    {i.ultimaAcao && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Última ação: {i.ultimaAcao.acao} em {dataBR(i.ultimaAcao.data)} — {i.ultimaAcao.observacao}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg text-destructive">{brl(i.saldo)}</div>
                    <div className="text-[11px] text-muted-foreground">{i.titulos.length} título(s) · maior atraso {i.maiorAtraso} d.</div>
                    <Button size="sm" className="mt-2 rounded-lg bg-brand-orange hover:bg-brand-orange/90" onClick={() => setAlvo(i.parceiro)}>
                      Registrar ação
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {i.titulos.map((t) => (
                    <div key={t.id} className="rounded-2xl border border-border/70 px-3 py-2 text-xs">
                      <span className="font-mono">{t.numero}</span>
                      <span className="mx-2 text-muted-foreground">venc. {dataBR(t.vencimento)}</span>
                      <span className="font-mono">{brl(t.saldo)}</span>
                      <span className="ml-2 text-brand-orange">+{brl(t.multa + t.juros)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {lista.length === 0 && (
            <Card className="rounded-xl shadow-card">
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                Nenhum recebível vencido nesta competência. Carteira em dia.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="regua" className="mt-4">
          <Card className="rounded-xl shadow-card">
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Faixa de atraso</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Regra aplicada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {REGUA.map((r) => (
                    <TableRow key={r.faixa}>
                      <TableCell className="text-sm">{r.faixa}</TableCell>
                      <TableCell className="text-sm">{r.acao}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.canal}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.responsavel}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.descricao}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selecionado} onOpenChange={(o) => !o && setAlvo(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display text-2xl">Registrar ação de cobrança</DialogTitle></DialogHeader>
          {selecionado && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-border/70 p-3 text-sm">
                <div className="font-medium">{selecionado.parceiro}</div>
                <div className="text-xs text-muted-foreground">
                  {selecionado.acao.acao} · {selecionado.faixa} · {brl(selecionado.saldo)} em aberto
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Observação do contato</Label>
                <Textarea rows={4} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: falado com o financeiro, promessa de pagamento para 10/08." />
              </div>
              <div className="flex items-center justify-between gap-2">
                <AssistenteCampos
                  titulo="Ação de cobrança"
                  campos={[
                    { key: "acao", label: "Ação", ajuda: "Etapa da régua sugerida pela faixa de atraso do cliente." },
                    { key: "observacao", label: "Observação", ajuda: "Registro do contato: com quem falou, o que foi acordado e a data prometida." },
                  ]}
                  draft={{ acao: selecionado.acao.acao, observacao: obs }}
                  contextoExtra={{ cliente: selecionado.parceiro, saldo: selecionado.saldo, atraso: selecionado.maiorAtraso }}
                />
                <div className="flex gap-2">
                  <Button variant="outline" className="rounded-full" onClick={() => setAlvo(null)}>Cancelar</Button>
                  <Button className="rounded-lg bg-brand-orange hover:bg-brand-orange/90" onClick={registrar}>Registrar</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================ página ===================================== */

const AJUDA_TELA = {
  "contas-pagar": [
    { key: "titulo", label: "Título", ajuda: "Documento de obrigação (NF do fornecedor, taxa, contrato) com número e parcela." },
    { key: "vencimento", label: "Vencimento", ajuda: "Data limite de pagamento. Após ela incidem multa de 2% e juros de 1% a.m." },
    { key: "saldo", label: "Saldo devedor", ajuda: "Valor original menos as baixas já registradas. Baixa parcial mantém o título aberto." },
    { key: "aging", label: "Aging", ajuda: "Distribuição do saldo por faixa de atraso — base para negociação com fornecedores." },
    { key: "conta", label: "Conta de tesouraria", ajuda: "Conta que suporta o pagamento; o saldo é atualizado automaticamente." },
  ],
  "contas-receber": [
    { key: "titulo", label: "Título", ajuda: "Recebível gerado por NFS-e/NF-e de venda, com número e parcela." },
    { key: "vencimento", label: "Vencimento", ajuda: "Data acordada de recebimento; define o início da contagem de atraso." },
    { key: "encargos", label: "Encargos", ajuda: "Multa de 2% e juros de 1% a.m. pro rata die exigíveis do cliente." },
    { key: "aging", label: "Aging", ajuda: "Faixas de atraso que acionam a régua de cobrança automaticamente." },
    { key: "baixa", label: "Baixa", ajuda: "Registro do recebimento; gera entrada na conta de tesouraria escolhida." },
  ],
  caixa: [
    { key: "conta", label: "Conta de tesouraria", ajuda: "Caixa físico, conta corrente, aplicação ou cartão corporativo." },
    { key: "saldoInicial", label: "Saldo inicial", ajuda: "Posição de abertura da conta na competência." },
    { key: "movimento", label: "Movimento", ajuda: "Entradas e saídas. As baixas de títulos entram aqui automaticamente." },
    { key: "manual", label: "Lançamento manual", ajuda: "Tarifas, rendimentos, suprimentos e sangrias que não vêm de títulos." },
  ],
  "fluxo-caixa": [
    { key: "saldoPartida", label: "Saldo de partida", ajuda: "Soma dos saldos atuais de todas as contas de tesouraria." },
    { key: "projecao", label: "Projeção", ajuda: "Recebíveis e pagáveis em aberto alocados na semana do vencimento." },
    { key: "acumulado", label: "Saldo acumulado", ajuda: "Saldo de partida somado ao líquido de cada semana. Negativo indica necessidade de caixa." },
  ],
  cobranca: [
    { key: "faixa", label: "Faixa de atraso", ajuda: "Aging do maior título vencido do cliente; define a etapa da régua." },
    { key: "acao", label: "Ação de cobrança", ajuda: "Etapa recomendada: lembrete, contato, negociação, notificação ou protesto." },
    { key: "pcld", label: "Provisão (PCLD)", ajuda: "Saldo com atraso superior a 60 dias, candidato a provisão para perdas." },
  ],
} as const;

export default function ContasCaixa() {
  const { modulo } = useParams();
  const tela = TELAS[modulo || ""];

  if (!tela) {
    return (
      <div className="py-24 text-center space-y-4">
        <h1 className="font-display text-3xl">Tela não encontrada</h1>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/administrativo/financeiro-operacional">Voltar para Contas e caixa</Link>
        </Button>
      </div>
    );
  }

  const Icon = tela.icon;

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/dashboard" className="hover:text-foreground">Início</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/administrativo" className="hover:text-foreground">Administrativo</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/administrativo/financeiro-operacional" className="hover:text-foreground">Contas e caixa</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{tela.titulo}</span>
      </nav>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-card shadow-card">
            <Icon className="h-6 w-6 text-brand-orange" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Administrativo · Contas e caixa</div>
            <h1 className="mt-1.5 font-display text-4xl">{tela.titulo}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{tela.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/financeiro/operacional/conciliacao">
              <Landmark className="mr-2 h-4 w-4" />Conciliação bancária
            </Link>
          </Button>
          <AssistenteCampos
            titulo={tela.titulo}
            campos={[...(AJUDA_TELA[modulo as keyof typeof AJUDA_TELA] || [])]}
            contextoExtra={{ modulo: tela.titulo, area: "Administrativo · Contas e caixa" }}
          />
        </div>
      </div>

      <BlocoOrientacao />

      {modulo === "contas-pagar" && <Carteira tipo="pagar" />}
      {modulo === "contas-receber" && <Carteira tipo="receber" />}
      {modulo === "caixa" && <CaixaTesouraria />}
      {modulo === "fluxo-caixa" && <FluxoCaixa />}
      {modulo === "cobranca" && <Cobranca />}
    </div>
  );
}
