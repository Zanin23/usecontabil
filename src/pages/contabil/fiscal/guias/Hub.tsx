import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, ArrowRight, Banknote, CalendarClock, CheckCircle2, Clock,
  HandCoins, Landmark, Wallet2, type LucideIcon,
} from "lucide-react";
import { Badge, Button, Card, CardContent } from "@/design-system/mj-design-system-db98fa";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import {
  GRUPOS, alertas, brl, calendario, dataBR, diasEntre, economiaCompensacoes,
  hojeISO, resumoGuias, resumoParcelamentos, useGuias, type GrupoSlug,
} from "@/lib/guiasStore";

const ICONES: Record<GrupoSlug, LucideIcon> = {
  darf: Banknote,
  estaduais: Landmark,
  parcelamentos: HandCoins,
  calendario: CalendarClock,
};

function Indicador({ label, valor, hint, destaque }: { label: string; valor: string; hint?: string; destaque?: boolean }) {
  return (
    <div className={`min-w-0 rounded-2xl border p-3 ${destaque ? "border-destructive/40 bg-destructive/5" : "border-border/70"}`}>
      <div className="text-[10px] uppercase tracking-[0.06em] leading-tight break-words text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-mono text-sm break-words ${destaque ? "text-destructive" : ""}`}>{valor}</div>
      {hint && <div className="text-[10px] break-words text-muted-foreground">{hint}</div>}
    </div>
  );
}

export default function GuiasHub() {
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const guias = useGuias(empresa?.id, competencia);
  const hoje = hojeISO();

  const federais = useMemo(() => guias.filter((g) => g.grupo === "darf"), [guias]);
  const estaduais = useMemo(() => guias.filter((g) => g.grupo === "estaduais"), [guias]);
  const rTotal = resumoGuias(guias);
  const rFed = resumoGuias(federais);
  const rEst = resumoGuias(estaduais);
  const parc = resumoParcelamentos(empresa?.id);
  const eventos = calendario(empresa?.id, competencia);
  const avisos = alertas(empresa?.id, competencia);

  const doDia = eventos.filter((e) => e.data === hoje).length;
  const proximos = eventos.filter((e) => e.dias >= 0 && e.dias <= 7).length;
  const atrasadas = eventos.filter((e) => e.dias < 0 && e.status !== "Paga").length;

  const kpis = [
    { label: "Valor total a recolher", valor: brl(rTotal.aRecolher), hint: `${rTotal.abertas} em aberto` },
    { label: "Guias emitidas", valor: String(rTotal.emitidas) },
    { label: "Guias pagas", valor: String(rTotal.pagas), hint: brl(rTotal.pago) },
    { label: "Guias vencidas", valor: String(rTotal.vencidas), destaque: rTotal.vencidas > 0 },
    { label: "Guias em aberto", valor: String(rTotal.abertas) },
    { label: "Próximas do vencimento", valor: String(rTotal.proximas) },
    { label: "Multas acumuladas", valor: brl(rTotal.multa), destaque: rTotal.multa > 0 },
    { label: "Juros acumulados", valor: brl(rTotal.juros), destaque: rTotal.juros > 0 },
    { label: "Economia por compensações", valor: brl(economiaCompensacoes(empresa?.id, competencia)) },
  ];

  const indicadoresPorGrupo: Record<GrupoSlug, { label: string; valor: string; hint?: string; destaque?: boolean }[]> = {
    darf: [
      { label: "Emitidas", valor: String(rFed.emitidas) },
      { label: "Pagas", valor: String(rFed.pagas) },
      { label: "Vencidas", valor: String(rFed.vencidas), destaque: rFed.vencidas > 0 },
      { label: "Em aberto", valor: String(rFed.abertas) },
      { label: "Valor total", valor: brl(rFed.valorTotal) },
      { label: "Multas", valor: brl(rFed.multa) },
      { label: "Juros", valor: brl(rFed.juros) },
      { label: "Compensações", valor: brl(economiaCompensacoes(empresa?.id, competencia)) },
    ],
    estaduais: [
      { label: "Guias estaduais", valor: String(estaduais.length) },
      { label: "Pagamentos", valor: String(rEst.pagas), hint: brl(rEst.pago) },
      { label: "Pendências", valor: String(rEst.abertas + rEst.vencidas), destaque: rEst.vencidas > 0 },
      { label: "Valores", valor: brl(rEst.valorTotal) },
      { label: "Protocolos", valor: String(rEst.conciliadas) },
    ],
    parcelamentos: [
      { label: "Ativos", valor: String(parc.ativos) },
      { label: "Encerrados", valor: String(parc.encerrados) },
      { label: "Parcelas vencidas", valor: String(parc.vencidas), destaque: parc.vencidas > 0 },
      { label: "Parcelas futuras", valor: String(parc.futuras) },
      { label: "Saldo devedor", valor: brl(parc.saldo) },
      { label: "Juros", valor: brl(parc.juros) },
    ],
    calendario: [
      { label: "Próximos vencimentos", valor: String(proximos) },
      { label: "Tributos do mês", valor: String(eventos.length) },
      { label: "Guias atrasadas", valor: String(atrasadas), destaque: atrasadas > 0 },
      { label: "Guias do dia", valor: String(doDia) },
      { label: "Pendências da empresa", valor: String(avisos.filter((a) => a.nivel === "crítico").length) },
    ],
  };

  const rotas: Record<GrupoSlug, string> = {
    darf: "/fiscal/guias/darf",
    estaduais: "/fiscal/guias/estaduais",
    parcelamentos: "/fiscal/guias/parcelamentos",
    calendario: "/fiscal/guias/calendario",
  };

  return (
    <div className="space-y-6 pb-16">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fiscal</div>
        <h1 className="font-display text-3xl sm:text-4xl">
          Guias e <span className="text-brand-orange">recolhimentos</span>
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Ciclo completo dos tributos: geração da guia, multa e juros, pagamento, parcelamentos,
          conciliação financeira e auditoria — com motor próprio por tipo de guia.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary" className="rounded-full">{formatCompetencia(competencia)}</Badge>
          <Badge variant="secondary" className="rounded-full">{empresa?.razao ?? "Nenhuma empresa selecionada"}</Badge>
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link to="/fiscal/guias/calendario"><CalendarClock className="mr-1.5 h-3.5 w-3.5" /> Calendário fiscal</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-9">
        {kpis.map((k) => <Indicador key={k.label} {...k} />)}
      </div>

      <Card className="rounded-3xl border-border/70">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl">Timeline de vencimentos</h2>
            <span className="text-xs text-muted-foreground">{eventos.length} evento(s)</span>
          </div>
          <div className="space-y-2">
            {eventos.slice(0, 8).map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 p-3">
                <span className="font-mono text-xs w-20">{dataBR(e.data)}</span>
                <span className={`h-2 w-2 rounded-full ${e.dias < 0 ? "bg-destructive" : e.dias <= 5 ? "bg-brand-orange" : "bg-success"}`} />
                <span className="min-w-0 flex-1 text-sm break-words">{e.titulo}</span>
                <span className="font-mono text-xs">{brl(e.valor)}</span>
                <Badge variant="secondary" className="rounded-full text-[10px]">
                  {e.dias >= 0 ? `${e.dias} dia(s)` : `${Math.abs(e.dias)} em atraso`}
                </Badge>
              </div>
            ))}
            {eventos.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum vencimento apurado nesta competência.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {GRUPOS.map((g) => {
          const Icone = ICONES[g.slug];
          const inds = indicadoresPorGrupo[g.slug];
          return (
            <Card key={g.slug} className="rounded-3xl border-border/70 transition-shadow hover:shadow-card">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-brand-orange/10 p-3">
                    <Icone className="h-6 w-6 text-brand-orange" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display text-2xl">{g.titulo}</h2>
                    <p className="max-w-md text-sm text-muted-foreground">{g.descricao}</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {inds.map((i) => <Indicador key={i.label} {...i} />)}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.submodulos.slice(0, 8).map((s) => (
                    <Badge key={s} variant="secondary" className="rounded-full text-[10px]">{s}</Badge>
                  ))}
                  {g.submodulos.length > 8 && (
                    <Badge variant="secondary" className="rounded-full text-[10px]">+{g.submodulos.length - 8}</Badge>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button asChild className="rounded-full bg-brand-orange hover:bg-brand-orange/90">
                    <Link to={rotas[g.slug]}>Abrir grupo <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-3xl border-border/70">
        <CardContent className="space-y-3 p-5">
          <h2 className="font-display text-2xl">Alertas inteligentes</h2>
          <div className="grid gap-2 xl:grid-cols-2">
            {avisos.slice(0, 10).map((a) => (
              <div key={a.id} className="flex items-start gap-2 rounded-2xl border border-border/70 p-3">
                {a.nivel === "crítico" ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                ) : a.nivel === "atenção" ? (
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
                )}
                <div className="min-w-0">
                  <div className="text-sm break-words">{a.titulo}</div>
                  <p className="text-xs text-muted-foreground break-words">{a.detalhe}</p>
                </div>
              </div>
            ))}
            {avisos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum alerta ativo.</p>}
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Wallet2 className="h-3 w-3" /> Notificações por sistema, e-mail, Teams, Slack e webhook são simuladas internamente.
          </p>
        </CardContent>
      </Card>

      <AssistenteFechamento
        rotulo="IA ajudante"
        resumo={`Guias e recolhimentos de ${formatCompetencia(competencia)} — ${brl(rTotal.aRecolher)} a recolher.`}
        contexto={{
          tela: "Hub de guias e recolhimentos",
          competencia,
          empresa: empresa?.razao,
          resumo: rTotal,
          parcelamentos: parc,
          proximosVencimentos: eventos.slice(0, 10).map((e) => ({
            data: e.data, evento: e.titulo, valor: e.valor, dias: e.dias, status: e.status,
          })),
          alertas: avisos.slice(0, 10),
        }}
      />
    </div>
  );
}
