import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import {
  Card, CardContent, Badge, Button, Progress, cn,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import {
  ArrowUpRight, ArrowDownRight, RefreshCw, PlayCircle, AlertTriangle, Info,
  AlertOctagon, TrendingUp, ChevronDown, Building2, FileStack, Wallet, Landmark, ShieldAlert,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { brl, empresaDB, useTributario, type DocumentoFiscal, processarDocumento } from "@/lib/tributarioStore";
import { usePratica } from "@/lib/praticaStore";
import AvisoRegime from "@/components/contabil/AvisoRegime";
import { useDocsFiscais, valorBR } from "@/lib/fiscalStore";

const toneMap = {
  success: "text-success",
  warn: "text-warn",
  danger: "text-destructive",
} as const;

const alertIcon = { erro: AlertOctagon, aviso: AlertTriangle, info: Info } as const;
const alertColor = { erro: "text-destructive", aviso: "text-warn", info: "text-brand-blue" } as const;

/** Ícone e cor de cada indicador do topo do painel. */
const KPI_VISUAL: Record<string, { icon: typeof Wallet; chip: string; barra: string }> = {
  "Receita da competência": { icon: Wallet, chip: "bg-primary/12 text-primary", barra: "from-primary to-brand-purple" },
  "Tributos apurados": {
    icon: Landmark,
    chip: "bg-brand-amber/15 text-[hsl(30_90%_36%)] dark:text-brand-amber",
    barra: "from-brand-amber to-brand-pink",
  },
  "Documentos na competência": { icon: FileStack, chip: "bg-brand-blue/12 text-brand-blue", barra: "from-brand-blue to-primary" },
  "Documentos com bloqueio": { icon: ShieldAlert, chip: "bg-destructive/10 text-destructive", barra: "from-destructive to-brand-pink" },
};

function kpiVisual(label: string, tone: keyof typeof toneMap) {
  // "Documentos com bloqueio" fica verde quando não há nenhum bloqueio
  if (label === "Documentos com bloqueio" && tone === "success") {
    return { icon: ShieldAlert, chip: "bg-success/12 text-success", barra: "from-success to-brand-teal" };
  }
  return KPI_VISUAL[label] ?? KPI_VISUAL["Receita da competência"];
}

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
  const { competencia, competenciaFim, isPeriodo, competenciasNoPeriodo } = useCompetencia();
  const { empresa, empresas } = useEmpresaAtual();
  const empresaId = empresa?.id ?? "";
  const [openKpi, setOpenKpi] = useState<string | null>(null);
  const { praticaAtiva: emPratica } = usePratica();

  const docsTributario = useTributario(() => empresaDB(empresaId).documentos, [empresaId]);
  const docsSaida = useDocsFiscais("saidas", empresaId, competenciasNoPeriodo);
  const docsEntrada = useDocsFiscais("entradas", empresaId, competenciasNoPeriodo);
  const docsServTomados = useDocsFiscais("servicos-tomados", empresaId, competenciasNoPeriodo);
  const docsServPrestados = useDocsFiscais("servicos-prestados", empresaId, competenciasNoPeriodo);

  // Filtro radical para garantir que nada de outra empresa ou modo vaze
  const isDocValido = (d: any) => {
    if (!empresaId) return false;
    // Se d.empresaId não bate, descarta
    if (d.empresaId !== empresaId) return false;
    // Se estivermos em modo Real e o ID do doc tiver indicação de prática (ou vice-versa via sufixo de store)
    // Mas os stores já separam por sufixo no localStorage.
    // O problema pode ser o cache do useTributario ou useDocsFiscais.
    return true;
  };

  const documentos = useMemo(() => {
    if (!empresaId) return [];
    // 1. Unificar documentos dos dois principais stores fiscais
    const docsFiscaisStore: DocumentoFiscal[] = [];

    
    const converter = (d: any, grupo: any, tipo: any): DocumentoFiscal => {
      const valor = valorBR(d.valor || d.valorTotal);
      return processarDocumento({
        id: d.id,
        empresaId: d.empresaId,
        competencia: d.competencia,
        grupo: grupo,
        tipo: tipo,
        numero: d.numero || "",
        serie: d.serie || "",
        emissao: d.data?.split('/').reverse().join('-') || d.emissao || "",
        participante: d.participante || "",
        participanteDoc: d.cnpj || d.participanteDoc || "",
        ufOrigem: "SP", 
        ufDestino: "SP",
        contribuinte: true,
        consumidorFinal: false,
        regime: empresa?.regime || "Lucro Presumido",
        itens: [{ id: "it-1", descricao: d.tipo || "Item", tipo: "produto", quantidade: 1, unitario: valor }],
        valorProdutos: valor,
        valorTotal: valor,
        status: (d.status === "Autorizada" || d.status === "Autorizado") ? "Autorizado" : "Rascunho",
        tributos: { icms: valorBR(d.icms), pis: 0, cofins: 0, ipi: 0, iss: 0, irrf: 0, inss: 0, csll: 0, retencoes: 0, icmsSt: 0, difal: 0, fcp: 0, total: valorBR(d.icms) },
        memoria: [],
        regrasAplicadas: [],
        alertas: [],
        eventos: []
      }, empresaId);
    };

    docsSaida.filter(isDocValido).forEach(d => docsFiscaisStore.push(converter(d, "faturamento", "NF-e")));
    docsEntrada.filter(isDocValido).forEach(d => docsFiscaisStore.push(converter(d, "demais", "Nota de entrada")));
    docsServTomados.filter(isDocValido).forEach(d => docsFiscaisStore.push(converter(d, "servicos", "NFS-e")));
    docsServPrestados.filter(isDocValido).forEach(d => docsFiscaisStore.push(converter(d, "servicos", "NFS-e")));

    const idsOperacionais = new Set(docsFiscaisStore.map(d => d.id));
    const docsTributarioFiltrados = docsTributario.filter(d => !idsOperacionais.has(d.id) && isDocValido(d));

    const todosDocumentos = [...docsTributarioFiltrados, ...docsFiscaisStore];

    // Se estivermos em modo prática e não houver documentos no período,
    // mas houver uma empresa selecionada, tentamos popular a base de prática.
    // Isso resolve o problema do dashboard vazio após reset.
    if (emPratica && todosDocumentos.length === 0 && empresaId && competencia === "2026-07") {
       // Não chamamos popularDadosPratica diretamente aqui para evitar loop de render.
       // O botão "Popular base" já existe no Pratica.tsx e o aviso de labs aparece abaixo.
    }


    // FILTRO DE SEGURANÇA RADICAL: Garante que apenas documentos da empresa atual
    // e do MODO ATUAL (Prática ou Real) sejam exibidos.
    // Como os stores já filtram por sufixo no load, aqui fazemos a conferência final.
    return todosDocumentos.filter(d => d.empresaId === empresaId);
  }, [docsTributario, docsSaida, docsEntrada, docsServTomados, docsServPrestados, empresaId, empresa?.regime]);

  const d = useMemo(() => {
    const doMes = documentos.filter((x) => competenciasNoPeriodo.includes(x.competencia) && valido(x));
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
        .filter((x) => competenciasNoPeriodo.includes(x.competencia))
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

  const semEmpresa = !empresaId || empresas.length === 0;
  const semDados = !semEmpresa && d.doMes.length === 0;


  const header = (
    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 lg:gap-6">
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Painel de controle</div>
        <h1 className="font-display text-3xl md:text-4xl mt-2">
          Visão geral <span className="text-brand-orange">contábil</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Competência {isPeriodo ? `${formatCompetencia(competencia)} até ${formatCompetencia(competenciaFim!)}` : formatCompetencia(competencia)} — {empresa ? empresa.razao : "nenhuma empresa cadastrada"}
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
            <div className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto space-y-2">
              <p>
                {semEmpresa
                  ? "A base está zerada. Cadastre a primeira empresa do grupo para que os indicadores, apurações e obrigações passem a ser calculados."
                  : `Nenhum documento fiscal foi escriturado para esta empresa na competência ${isPeriodo ? "selecionada (intervalo)" : formatCompetencia(competencia)}. Lance os documentos para que o painel seja calculado.`}
              </p>
              {isPeriodo && competenciasNoPeriodo.length > 0 && !semEmpresa && (
                <p className="text-xs text-brand-orange bg-brand-orange/5 border border-brand-orange/20 p-2 rounded-lg inline-block">
                  <strong>Aviso:</strong> Você está visualizando o período de <strong>{formatCompetencia(competenciasNoPeriodo[0])}</strong> até <strong>{formatCompetencia(competenciasNoPeriodo[competenciasNoPeriodo.length - 1])}</strong>.
                </p>
              )}
              {!semEmpresa && emPratica && (
                <p className="text-brand-orange font-medium">
                  💡 No modo prática, você pode carregar cenários de treinamento na tela de Laboratórios para ver o sistema em funcionamento.
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
              <Button
                className="rounded-md bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground"
                onClick={() => navigate(semEmpresa ? "/preparativos/cadastros/empresas/novo" : "/fiscal/documentos/saidas")}
              >
                {semEmpresa ? "Cadastrar empresa" : "Lançar documentos"}
              </Button>
              {!semEmpresa && emPratica && (
                <Button
                  variant="outline"
                  className="rounded-md border-brand-orange text-brand-orange hover:bg-brand-orange/10"
                  onClick={() => navigate("/aprender/pratica")}
                >
                  Ir para Laboratórios
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <AvisoRegime />

      {/* KPIs expansíveis */}
      <div className="stagger grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {kpis.map((k) => {
          const open = openKpi === k.label;
          const visual = kpiVisual(k.label, k.tone);
          const KpiIcon = visual.icon;
          return (
            <Card
              key={k.label}
              onClick={() => setOpenKpi(open ? null : k.label)}
              className={cn(
                "lift relative overflow-hidden rounded-xl border bg-card cursor-pointer",
                open ? "border-brand-orange/50 shadow-glow" : "border-border shadow-card",
              )}
            >
              <div className={cn("absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r opacity-90", visual.barra)} />
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", visual.chip)}>
                    <KpiIcon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5 text-xs uppercase tracking-widest text-muted-foreground">{k.label}</div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform duration-300 ${open ? "rotate-180 text-brand-orange" : "text-muted-foreground/60"}`}
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

      <div className="stagger grid grid-cols-1 xl:grid-cols-12 gap-6">
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
