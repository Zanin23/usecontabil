import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import {
  Card, CardContent, Badge, Button, Progress,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import {
  ArrowUpRight, ArrowDownRight, RefreshCw, PlayCircle, AlertTriangle, Info,
  AlertOctagon, TrendingUp, ChevronDown, Building2, FileStack,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { brl, empresaDB, useTributario, type DocumentoFiscal } from "@/lib/tributarioStore";

const toneMap = {
  success: "text-success",
  warn: "text-warn",
  danger: "text-destructive",
} as const;

const alertIcon = { erro: AlertOctagon, aviso: AlertTriangle, info: Info } as const;
const alertColor = { erro: "text-destructive", aviso: "text-warn", info: "text-brand-blue" } as const;

const C = {
  orange: "var(--brand-orange)",
  blue: "var(--brand-blue)",
  pink: "var(--brand-pink)",
  muted: "var(--muted-foreground)",
  border: "var(--border)",
  card: "var(--card)",
};

/**
 * Paleta acessível para daltonismo: além de matizes distintos, cada fatia
 * varia em luminosidade e recebe uma textura própria.
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

/* --------------------------- derivações --------------------------- */

const MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function competenciaLabel(comp: string) {
  const [ano, mes] = comp.split("-");
  return `${MES_CURTO[Number(mes) - 1] ?? mes}/${(ano ?? "").slice(2)}`;
}

function competenciasAnteriores(atual: string, qtd: number) {
  const [ano, mes] = atual.split("-").map(Number);
  const lista: string[] = [];
  for (let i = qtd - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(ano, mes - 1 - i, 1));
    lista.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return lista;
}

const eReceita = (d: DocumentoFiscal) => d.grupo === "faturamento" || d.grupo === "servicos";
const valido = (d: DocumentoFiscal) => d.status !== "Cancelado" && d.status !== "Inutilizado";

export default function Dashboard() {
  const navigate = useNavigate();
  const { competencia } = useCompetencia();
  const { empresa, empresas } = useEmpresaAtual();
  const empresaId = empresa?.id ?? "";
  const [openKpi, setOpenKpi] = useState<string | null>(null);

  const documentos = useTributario(() => empresaDB(empresaId).documentos, [empresaId]);

  const d = useMemo(() => {
    const doMes = documentos.filter((x) => x.competencia === competencia && valido(x));
    const receitas = doMes.filter(eReceita);
    const despesas = doMes.filter((x) => !eReceita(x));

    const somaReceita = receitas.reduce((s, x) => s + (x.valorTotal || 0), 0);
    const somaDespesa = despesas.reduce((s, x) => s + (x.valorTotal || 0), 0);

    const tributos = doMes.reduce(
      (acc, x) => {
        const t = x.tributos;
        acc.ICMS += (t?.icms || 0) + (t?.icmsSt || 0) + (t?.difal || 0) + (t?.fcp || 0);
        acc.IPI += t?.ipi || 0;
        acc["PIS/COFINS"] += (t?.pis || 0) + (t?.cofins || 0);
        acc.ISS += t?.iss || 0;
        acc.Retenções += t?.retencoes || 0;
        return acc;
      },
      { ICMS: 0, IPI: 0, "PIS/COFINS": 0, ISS: 0, Retenções: 0 } as Record<string, number>,
    );
    const serieTributos = Object.entries(tributos)
      .filter(([, v]) => v > 0)
      .map(([tributo, valor]) => ({ tributo, valor }))
      .sort((a, b) => b.valor - a.valor);
    const totalTributos = serieTributos.reduce((s, t) => s + t.valor, 0);

    const composicao = Object.entries(
      despesas.reduce<Record<string, number>>((acc, x) => {
        acc[x.tipo] = (acc[x.tipo] || 0) + (x.valorTotal || 0);
        return acc;
      }, {}),
    )
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 4);
    const totalDespesa = composicao.reduce((s, x) => s + x.valor, 0);

    const serieResultado = competenciasAnteriores(competencia, 6).map((comp) => {
      const docs = documentos.filter((x) => x.competencia === comp && valido(x));
      const receita = docs.filter(eReceita).reduce((s, x) => s + (x.valorTotal || 0), 0);
      const despesa = docs.filter((x) => !eReceita(x)).reduce((s, x) => s + (x.valorTotal || 0), 0);
      return { mes: competenciaLabel(comp), receita, despesa, lucro: receita - despesa };
    });

    const porDia = Object.entries(
      doMes.reduce<Record<string, number>>((acc, x) => {
        const dia = (x.emissao || "").slice(8, 10) || "—";
        acc[dia] = (acc[dia] || 0) + 1;
        return acc;
      }, {}),
    )
      .map(([dia, qtd]) => ({ dia, qtd }))
      .sort((a, b) => a.dia.localeCompare(b.dia));

    const porStatus = Object.entries(
      documentos
        .filter((x) => x.competencia === competencia)
        .reduce<Record<string, number>>((acc, x) => {
          acc[x.status] = (acc[x.status] || 0) + 1;
          return acc;
        }, {}),
    ).map(([status, qtd]) => ({ status, qtd }));

    const alertas = doMes.flatMap((doc) =>
      (doc.alertas ?? []).map((a) => ({
        tipo: a.nivel === "bloqueio" ? "erro" : a.nivel === "alerta" ? "aviso" : "info",
        titulo: `${doc.tipo} ${doc.numero || doc.id}`,
        detalhe: a.mensagem,
        tempo: a.regra,
      })),
    );

    const bloqueios = doMes.filter((x) => (x.alertas ?? []).some((a) => a.nivel === "bloqueio")).length;
    const autorizados = doMes.filter((x) => x.status === "Autorizado").length;
    const progresso = doMes.length ? Math.round((autorizados / doMes.length) * 100) : 0;
    const anterior = serieResultado[serieResultado.length - 2]?.receita ?? 0;
    const variacao = anterior ? ((somaReceita - anterior) / anterior) * 100 : 0;

    return {
      doMes, somaReceita, somaDespesa, serieTributos, totalTributos, composicao, totalDespesa,
      serieResultado, porDia, porStatus, alertas: alertas.slice(0, 6), bloqueios, autorizados,
      progresso, variacao,
    };
  }, [documentos, competencia]);

  const kpis = [
    {
      label: "Receita da competência",
      value: brl(d.somaReceita),
      tone: (d.variacao >= 0 ? "success" : "danger") as keyof typeof toneMap,
      trend: `${d.variacao >= 0 ? "+" : ""}${d.variacao.toFixed(1)}% vs. mês anterior`,
      resumo: "Soma dos documentos de faturamento e serviços válidos na competência.",
      linhas: [
        { rotulo: "Documentos de receita", valor: String(d.doMes.filter(eReceita).length) },
        { rotulo: "Despesas e entradas", valor: brl(d.somaDespesa) },
        { rotulo: "Resultado", valor: brl(d.somaReceita - d.somaDespesa) },
      ],
    },
    {
      label: "Tributos apurados",
      value: brl(d.totalTributos),
      tone: "warn" as const,
      trend: `${d.serieTributos.length} tributo(s) com valor`,
      resumo: "Total calculado pelo motor tributário sobre os documentos da competência.",
      linhas: d.serieTributos.map((t) => ({ rotulo: t.tributo, valor: brl(t.valor) })),
    },
    {
      label: "Documentos na competência",
      value: String(d.doMes.length),
      tone: "success" as const,
      trend: `${d.autorizados} autorizados`,
      resumo: "Documentos fiscais escriturados nesta competência para a empresa selecionada.",
      linhas: d.porStatus.map((s) => ({ rotulo: s.status, valor: String(s.qtd) })),
    },
    {
      label: "Documentos com bloqueio",
      value: String(d.bloqueios),
      tone: (d.bloqueios ? "danger" : "success") as keyof typeof toneMap,
      trend: d.bloqueios ? "corrija antes do fechamento" : "nenhum bloqueio",
      resumo: "Documentos reprovados por alguma regra do motor de validação fiscal.",
      linhas: [
        { rotulo: "Alertas totais", valor: String(d.alertas.length) },
        { rotulo: "Avanço do fechamento", valor: `${d.progresso}%` },
      ],
    },
  ];

  const semEmpresa = empresas.length === 0 || !empresa;
  const semDados = !semEmpresa && d.doMes.length === 0;

  const header = (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Painel de controle</div>
        <h1 className="font-display text-3xl md:text-4xl mt-2">
          Visão geral <span className="text-brand-orange">contábil</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Competência {formatCompetencia(competencia)} — {empresa ? empresa.razao : "nenhuma empresa cadastrada"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-md h-9"
          onClick={() => {
            window.dispatchEvent(new Event("storage"));
            toast.success("Dados recarregados", {
              description: `Competência ${formatCompetencia(competencia)}`,
            });
          }}
        >
          <RefreshCw className="h-4 w-4 mr-1.5" /> Atualizar dados
        </Button>
        <Button
          size="sm"
          className="rounded-md h-9 bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground"
          onClick={() => navigate("/preparativos/servicos/gestao")}
        >
          <PlayCircle className="h-4 w-4 mr-1.5" /> Iniciar fechamento
        </Button>
      </div>
    </div>
  );

  if (semEmpresa || semDados) {
    const Icone = semEmpresa ? Building2 : FileStack;
    return (
      <div className="space-y-6">
        {header}
        <Card className="rounded-xl border border-border bg-card shadow-card">
          <CardContent className="p-10 text-center">
            <Icone className="h-8 w-8 mx-auto text-brand-orange" />
            <h2 className="font-display text-2xl mt-4">
              {semEmpresa ? "Nenhuma empresa cadastrada" : "Sem movimento nesta competência"}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
              {semEmpresa
                ? "A base está zerada. Cadastre a primeira empresa do grupo para que os indicadores, apurações e obrigações passem a ser calculados."
                : "Nenhum documento fiscal foi escriturado para esta empresa na competência selecionada. Lance os documentos para que o painel seja calculado."}
            </p>
            <Button
              className="rounded-md mt-6 bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground"
              onClick={() => navigate(semEmpresa ? "/preparativos/empresa/cadastro" : "/fiscal/documentos/notas-saida")}
            >
              {semEmpresa ? "Cadastrar empresa" : "Lançar documentos"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      {/* KPIs expansíveis */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {kpis.map((k) => {
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
                <div className="font-display text-3xl mt-3 break-words">{k.value}</div>
                <div className={`text-xs mt-2 inline-flex items-center gap-1 ${toneMap[k.tone]}`}>
                  {k.tone === "success" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {k.trend}
                </div>

                {open && (
                  <div className="mt-4 pt-4 border-t border-brand-orange/25 space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">{k.resumo}</p>
                    <div className="space-y-1.5">
                      {k.linhas.length ? k.linhas.map((l) => (
                        <div key={l.rotulo} className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-muted-foreground truncate">{l.rotulo}</span>
                          <span className="font-mono text-foreground">{l.valor}</span>
                        </div>
                      )) : <span className="text-xs text-muted-foreground">Sem detalhamento.</span>}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-brand-orange">Clique para recolher</div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <Card className="rounded-xl border border-border bg-card shadow-card xl:col-span-8">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4 gap-4">
              <div className="min-w-0">
                <h2 className="font-display text-2xl">Receita × despesa × lucro</h2>
                <p className="text-xs text-muted-foreground mt-1">Últimas 6 competências · valores mensais</p>
              </div>
              <div className={`inline-flex items-center gap-1.5 text-xs shrink-0 ${d.variacao >= 0 ? "text-success" : "text-destructive"}`}>
                <TrendingUp className="h-3.5 w-3.5" /> {d.variacao >= 0 ? "+" : ""}{d.variacao.toFixed(1)}% no último mês
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.serieResultado} margin={{ left: 4, right: 4, top: 8 }}>
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
            <p className="text-xs text-muted-foreground mt-1">
              Competência {formatCompetencia(competencia)} · {brl(d.totalDespesa)}
            </p>
            {d.composicao.length ? (
              <>
                <div className="h-48 mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        {PIE_SERIES.map((s, i) => (
                          <TexturaFatia key={i} id={`fatia-${i}`} cor={s.cor} textura={s.textura} />
                        ))}
                      </defs>
                      <Pie data={d.composicao} dataKey="valor" nameKey="nome" innerRadius={52} outerRadius={78} paddingAngle={3} stroke={C.card} strokeWidth={2}>
                        {d.composicao.map((_, i) => (
                          <Cell key={i} fill={`url(#fatia-${i % PIE_SERIES.length})`} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 mt-3">
                  {d.composicao.map((item, i) => {
                    const s = PIE_SERIES[i % PIE_SERIES.length];
                    return (
                      <div key={item.nome} className="flex items-center gap-2 text-xs">
                        <SwatchFatia cor={s.cor} textura={s.textura} />
                        <span className="text-foreground truncate">{item.nome}</span>
                        <span className="ml-auto font-mono text-foreground">
                          {Math.round((item.valor / d.totalDespesa) * 100)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-6">Nenhuma entrada ou despesa lançada nesta competência.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-card shadow-card xl:col-span-5">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-display text-2xl">Tributos apurados</h2>
                <p className="text-xs text-muted-foreground mt-1">Total {brl(d.totalTributos)} · competência atual</p>
              </div>
              <Badge variant="outline" className="rounded-md border-brand-orange/40 text-brand-orange shrink-0">
                {d.serieTributos.length} tributos
              </Badge>
            </div>
            {d.serieTributos.length ? (
              <div className="h-56 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={d.serieTributos} layout="vertical" margin={{ left: 8, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                    <XAxis type="number" tickFormatter={compact} tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="tributo" tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={92} />
                    <Tooltip content={<ChartTip />} cursor={{ fill: "var(--accent)" }} />
                    <Bar dataKey="valor" name="Valor" radius={[0, 6, 6, 0]} fill={C.orange} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-6">Nenhum tributo calculado nesta competência.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-card shadow-card xl:col-span-7">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-display text-2xl">Volume de lançamentos</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Escrituração diária · {formatCompetencia(competencia)}
                </p>
              </div>
              <Badge variant="outline" className="rounded-md shrink-0">{d.doMes.length} no mês</Badge>
            </div>
            <div className="h-56 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.porDia}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                  <XAxis dataKey="dia" tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip content={<ChartTip money={false} />} cursor={{ fill: "var(--accent)" }} />
                  <Bar dataKey="qtd" name="Lançamentos" radius={[6, 6, 0, 0]} fill={C.orange} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Situação dos documentos */}
        <Card className="rounded-xl border border-border bg-card shadow-card xl:col-span-8">
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-6">
              <div className="min-w-0">
                <h2 className="font-display text-2xl">Situação dos documentos</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Competência {formatCompetencia(competencia)} · base para o fechamento
                </p>
              </div>
              <div className="w-40 shrink-0">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Autorizados</span>
                  <span className="font-mono text-brand-orange">{d.progresso}%</span>
                </div>
                <Progress value={d.progresso} className="h-1.5 [&>*]:bg-brand-orange" />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="pl-6">Status</TableHead>
                  <TableHead className="w-40">Participação</TableHead>
                  <TableHead className="text-right pr-6">Documentos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.porStatus.map((row) => (
                  <TableRow key={row.status} className="border-border">
                    <TableCell className="pl-6 font-medium">{row.status}</TableCell>
                    <TableCell>
                      <Progress
                        value={Math.round((row.qtd / Math.max(1, d.doMes.length)) * 100)}
                        className="h-1.5 [&>*]:bg-brand-orange"
                      />
                    </TableCell>
                    <TableCell className="pr-6 text-right font-mono">{row.qtd}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card className="rounded-xl border border-border bg-card shadow-card xl:col-span-4">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Alertas fiscais</h2>
              <Badge variant="outline" className="rounded-md">{d.alertas.length}</Badge>
            </div>
            <div className="mt-5 space-y-3">
              {d.alertas.length ? d.alertas.map((a, i) => {
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
              }) : (
                <p className="text-sm text-muted-foreground">Nenhum alerta do motor de regras nesta competência.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resultado resumido */}
        <Card className="rounded-xl border border-border bg-card shadow-card xl:col-span-12">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5 gap-4">
              <div className="min-w-0">
                <h2 className="font-display text-2xl">Resultado resumido</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Competência {formatCompetencia(competencia)} · apurado sobre documentos escriturados
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 font-mono text-sm">
              {[
                { nome: "Receita bruta", valor: d.somaReceita },
                { nome: "Tributos apurados", valor: -d.totalTributos },
                { nome: "Entradas e despesas", valor: -d.somaDespesa },
                { nome: "Resultado da competência", valor: d.somaReceita - d.somaDespesa - d.totalTributos },
              ].map((r) => (
                <div key={r.nome} className="flex items-center justify-between border-b border-border/60 py-1.5">
                  <span className="truncate text-muted-foreground">{r.nome}</span>
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
