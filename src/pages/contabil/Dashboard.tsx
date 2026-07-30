import { useState } from "react";
import {
  Card, CardContent, Badge, Button, Progress,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import {
  ArrowUpRight, ArrowDownRight, RefreshCw, PlayCircle, AlertTriangle, Info,
  AlertOctagon, TrendingUp, ChevronDown,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  KPIS, KPI_DETALHES, STATUS_FECHAMENTO, ALERTAS, brl, DRE,
  SERIE_RESULTADO, SERIE_TRIBUTOS, COMPOSICAO_DESPESA, SERIE_LANCAMENTOS_DIA,
} from "@/lib/contabilMock";

const toneMap = {
  success: "text-success",
  warn: "text-warn",
  danger: "text-destructive",
} as const;

const statusMap: Record<string, { label: string; dot: string; text: string; pct: number }> = {
  CONCLUIDO: { label: "Concluído", dot: "bg-success", text: "text-success", pct: 100 },
  EM_ANDAMENTO: { label: "Em andamento", dot: "bg-warn", text: "text-warn", pct: 60 },
  PENDENTE: { label: "Pendente", dot: "bg-muted-foreground", text: "text-muted-foreground", pct: 15 },
  ATRASADO: { label: "Atrasado", dot: "bg-destructive", text: "text-destructive", pct: 30 },
};

const alertIcon = { erro: AlertOctagon, aviso: AlertTriangle, info: Info } as const;
const alertColor = { erro: "text-destructive", aviso: "text-warn", info: "text-brand-blue" } as const;

const C = {
  orange: "var(--brand-orange)",
  blue: "var(--brand-blue)",
  pink: "var(--brand-pink)",
  purple: "var(--brand-purple)",
  muted: "var(--muted-foreground)",
  border: "var(--border)",
  card: "var(--card)",
};

/**
 * Paleta acessível para daltonismo: além de matizes distintos, cada fatia
 * varia em luminosidade e recebe uma textura própria, de modo que o gráfico
 * continua legível em deuteranopia, protanopia e em impressão preto e branco.
 */
const PIE_SERIES = [
  { cor: C.blue, textura: "solido" },
  { cor: C.orange, textura: "diagonal" },
  { cor: "var(--foreground)", textura: "pontos" },
  { cor: C.muted, textura: "grade" },
] as const;

function TexturaFatia({ id, cor, textura }: { id: string; cor: string; textura: string }) {
  if (textura === "solido") {
    return (
      <pattern id={id} patternUnits="userSpaceOnUse" width="8" height="8">
        <rect width="8" height="8" fill={cor} />
      </pattern>
    );
  }
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" width="8" height="8">
      <rect width="8" height="8" fill={cor} />
      {textura === "diagonal" && (
        <path d="M-2 2 L2 -2 M0 8 L8 0 M6 10 L10 6" stroke="var(--card)" strokeWidth="2.2" />
      )}
      {textura === "pontos" && (
        <>
          <circle cx="2" cy="2" r="1.5" fill="var(--card)" />
          <circle cx="6" cy="6" r="1.5" fill="var(--card)" />
        </>
      )}
      {textura === "grade" && (
        <path d="M0 4 H8 M4 0 V8" stroke="var(--card)" strokeWidth="1.6" />
      )}
    </pattern>
  );
}

function SwatchFatia({ cor, textura }: { cor: string; textura: string }) {
  const id = `sw-${textura}`;
  return (
    <svg className="h-3 w-3 shrink-0 rounded-sm" viewBox="0 0 8 8" aria-hidden>
      <defs>
        <TexturaFatia id={id} cor={cor} textura={textura} />
      </defs>
      <rect width="8" height="8" fill={`url(#${id})`} />
      <rect width="8" height="8" fill="none" stroke="var(--border)" strokeWidth="0.8" />
    </svg>
  );
}


const compact = (v: number) =>
  "R$ " + (v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + "k";

function ChartTip({ active, payload, label, money = true }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-elevated">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey ?? p.name} className="flex items-center gap-2 text-xs mt-1">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color ?? p.fill }} />
          <span className="text-muted-foreground capitalize">{p.name}</span>
          <span className="ml-auto font-mono">{money ? brl(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  return (
    <div className="h-10 -mx-1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.map((v, i) => ({ i, v }))}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Dashboard() {
  const [openKpi, setOpenKpi] = useState<string | null>(null);
  const totalDespesa = COMPOSICAO_DESPESA.reduce((s, d) => s + d.valor, 0);
  const totalTributos = SERIE_TRIBUTOS.reduce((s, t) => s + t.valor, 0);
  const concluidos = STATUS_FECHAMENTO.filter((s) => s.status === "CONCLUIDO").length;
  const progressoFechamento = Math.round((concluidos / STATUS_FECHAMENTO.length) * 100);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-6">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Painel de controle</div>
          <h1 className="font-display text-3xl md:text-4xl mt-2">
            Visão geral <span className="text-brand-orange">contábil</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">Competência 07/2026 — Metalúrgica Andrade S.A.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="rounded-md h-9">
            <RefreshCw className="h-4 w-4 mr-1.5" /> Sincronizar ERP
          </Button>
          <Button size="sm" className="rounded-md h-9 bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground">
            <PlayCircle className="h-4 w-4 mr-1.5" /> Iniciar fechamento
          </Button>
        </div>
      </div>

      {/* KPIs expansíveis */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {KPIS.map((k) => {
          const det = KPI_DETALHES[k.label];
          const open = openKpi === k.label;
          return (
            <Card
              key={k.label}
              onClick={() => setOpenKpi(open ? null : k.label)}
              className={`rounded-xl border bg-card cursor-pointer transition ${
                open
                  ? "border-brand-orange/50 shadow-glow"
                  : "border-border shadow-card hover:border-brand-orange/40"
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">{k.label}</div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180 text-brand-orange" : "text-muted-foreground/60"}`}
                  />
                </div>
                <div className="font-display text-3xl mt-3">{k.value}</div>
                <div className={`text-xs mt-2 inline-flex items-center gap-1 ${toneMap[k.tone]}`}>
                  {k.tone === "success" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {k.trend}
                </div>

                {det && !open && <Sparkline data={det.spark} color={C.orange} />}

                {det && open && (
                  <div className="mt-4 pt-4 border-t border-brand-orange/25 space-y-3">
                    <Sparkline data={det.spark} color={C.orange} />
                    <p className="text-xs text-muted-foreground leading-relaxed">{det.resumo}</p>
                    <div className="space-y-1.5">
                      {det.linhas.map((l) => (
                        <div key={l.rotulo} className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-muted-foreground truncate">{l.rotulo}</span>
                          <span className={`font-mono ${l.tom ? toneMap[l.tom] : "text-foreground"}`}>{l.valor}</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-brand-orange">Clique para recolher</div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Gráficos principais */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <Card className="rounded-xl border border-border bg-card shadow-card xl:col-span-8">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-display text-2xl">Receita × despesa × lucro</h2>
                <p className="text-xs text-muted-foreground mt-1">Fev/2026 a Jul/2026 · valores mensais</p>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs text-success">
                <TrendingUp className="h-3.5 w-3.5" /> +27,8% no último mês
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={SERIE_RESULTADO} margin={{ left: 4, right: 4, top: 8 }}>
                  <defs>
                    <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.orange} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={C.orange} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gDes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.blue} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={C.blue} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={compact} tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={64} />
                  <Tooltip content={<ChartTip />} cursor={{ stroke: C.orange, strokeOpacity: 0.3 }} />
                  <Area type="monotone" dataKey="receita" name="Receita" stroke={C.orange} strokeWidth={2} fill="url(#gRec)" />
                  <Area type="monotone" dataKey="despesa" name="Despesa" stroke={C.blue} strokeWidth={2} fill="url(#gDes)" />
                  <Line type="monotone" dataKey="lucro" name="Lucro" stroke={C.pink} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-card shadow-card xl:col-span-4">
          <CardContent className="p-6">
            <h2 className="font-display text-2xl">Composição de despesas</h2>
            <p className="text-xs text-muted-foreground mt-1">Acumulado 2026 · {brl(totalDespesa)}</p>
            <div className="h-48 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {PIE_SERIES.map((s, i) => (
                      <TexturaFatia key={i} id={`fatia-${i}`} cor={s.cor} textura={s.textura} />
                    ))}
                  </defs>
                  <Pie data={COMPOSICAO_DESPESA} dataKey="valor" nameKey="nome" innerRadius={52} outerRadius={78} paddingAngle={3} stroke={C.card} strokeWidth={2}>
                    {COMPOSICAO_DESPESA.map((_, i) => (
                      <Cell key={i} fill={`url(#fatia-${i % PIE_SERIES.length})`} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-3">
              {COMPOSICAO_DESPESA.map((d, i) => {
                const s = PIE_SERIES[i % PIE_SERIES.length];
                return (
                  <div key={d.nome} className="flex items-center gap-2 text-xs">
                    <SwatchFatia cor={s.cor} textura={s.textura} />
                    <span className="text-foreground">{d.nome}</span>
                    <span className="ml-auto font-mono text-foreground">
                      {Math.round((d.valor / totalDespesa) * 100)}%
                    </span>
                  </div>
                );
              })}
            </div>

          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-card shadow-card xl:col-span-5">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-2xl">Tributos a recolher</h2>
                <p className="text-xs text-muted-foreground mt-1">Total {brl(totalTributos)} · próximos 30 dias</p>
              </div>
              <Badge variant="outline" className="rounded-md border-brand-orange/40 text-brand-orange">
                {SERIE_TRIBUTOS.length} guias
              </Badge>
            </div>
            <div className="h-56 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={SERIE_TRIBUTOS} layout="vertical" margin={{ left: 8, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                  <XAxis type="number" tickFormatter={compact} tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="tributo" tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={82} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: "var(--accent)" }} />
                  <Bar dataKey="valor" name="Valor" radius={[0, 6, 6, 0]} fill={C.orange} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-card shadow-card xl:col-span-7">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-2xl">Volume de lançamentos</h2>
                <p className="text-xs text-muted-foreground mt-1">Escrituração diária · julho/2026</p>
              </div>
              <Badge variant="outline" className="rounded-md">623 no mês</Badge>
            </div>
            <div className="h-56 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={SERIE_LANCAMENTOS_DIA}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                  <XAxis dataKey="dia" tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip content={<ChartTip money={false} />} cursor={{ fill: "var(--accent)" }} />
                  <Bar dataKey="qtd" name="Lançamentos" radius={[6, 6, 0, 0]} fill={C.orange} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status de fechamento */}
        <Card className="rounded-xl border border-border bg-card shadow-card xl:col-span-8">
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-6">
              <div className="min-w-0">
                <h2 className="font-display text-2xl">Status de fechamento por módulo</h2>
                <p className="text-xs text-muted-foreground mt-1">Competência 07/2026 · responsáveis atribuídos automaticamente</p>
              </div>
              <div className="w-40 shrink-0">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-mono text-brand-orange">{progressoFechamento}%</span>
                </div>
                <Progress value={progressoFechamento} className="h-1.5 [&>*]:bg-brand-orange" />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="pl-6">Módulo</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="w-32">Avanço</TableHead>
                  <TableHead className="text-right pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {STATUS_FECHAMENTO.map((row) => {
                  const s = statusMap[row.status];
                  return (
                    <TableRow key={row.modulo} className="border-border">
                      <TableCell className="pl-6 font-medium">{row.modulo}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{row.competencia}</TableCell>
                      <TableCell className="text-sm">{row.responsavel}</TableCell>
                      <TableCell>
                        <Progress value={s.pct} className="h-1.5 [&>*]:bg-brand-orange" />
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <span className={`inline-flex items-center gap-2 text-xs ${s.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card className="rounded-xl border border-border bg-card shadow-card xl:col-span-4">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Alertas & integrações</h2>
              <Badge variant="outline" className="rounded-md">{ALERTAS.length}</Badge>
            </div>
            <div className="mt-5 space-y-3">
              {ALERTAS.map((a, i) => {
                const Icon = alertIcon[a.tipo as keyof typeof alertIcon];
                return (
                  <div key={i} className="flex gap-3 rounded-lg border border-border bg-background/50 p-3 transition hover:border-brand-orange/40">
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${alertColor[a.tipo as keyof typeof alertColor]}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{a.titulo}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.detalhe}</div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground/70 mt-1">{a.tempo}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* DRE resumida */}
        <Card className="rounded-xl border border-border bg-card shadow-card xl:col-span-12">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display text-2xl">DRE resumida — acumulado 2026</h2>
                <p className="text-xs text-muted-foreground mt-1">Nível 1 · valores até 31/07/2026</p>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs text-success">
                <TrendingUp className="h-3.5 w-3.5" /> Margem líquida 8,19%
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 font-mono text-sm">
              {DRE.filter((r) => r.nivel === 1).map((r) => (
                <div
                  key={r.conta}
                  className={`flex items-center justify-between border-b border-border/60 py-1.5 ${
                    r.total ? "text-foreground font-medium" : "text-muted-foreground"
                  }`}
                >
                  <span className="truncate">{r.nome}</span>
                  <span className={r.valor < 0 ? "text-destructive" : "text-foreground"}>{brl(r.valor)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
