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
  hojeISO, resumoGuias, resumoParcelamentos, useGuias, type GrupoSlug, type EventoCalendario,
} from "@/lib/guiasStore";

const ICONES: Partial<Record<GrupoSlug, LucideIcon>> = {
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
  const estaduaisMovements = useMemo(() => guias.filter((g) => g.grupo === "estaduais"), [guias]);
  const rTotal = resumoGuias(guias);
  const rFed = resumoGuias(federais);
  const rEst = resumoGuias(estaduaisMovements);
  const parc = resumoParcelamentos(empresa?.id);
  const eventos = calendario(empresa?.id, competencia) as EventoCalendario[];
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
    { label: "Economia por compensações", valor: brl(economiaCompensacoes(empresa?.id)) },
  ];

  const indicadoresPorGrupo: Partial<Record<GrupoSlug, { label: string; valor: string; hint?: string; destaque?: boolean }[]>> = {
    darf: [
      { label: "Emitidas", valor: String(rFed.emitidas) },
      { label: "Pagas", valor: String(rFed.pagas) },
      { label: "Vencidas", valor: String(rFed.vencidas), destaque: rFed.vencidas > 0 },
      { label: "Em aberto", valor: String(rFed.abertas) },
      { label: "Valor total", valor: brl(rFed.valorTotal) },
      { label: "Multas", valor: brl(rFed.multa) },
      { label: "Juros", valor: brl(rFed.juros) },
      { label: "Compensações", valor: brl(economiaCompensacoes(empresa?.id)) },
    ],
    estaduais: [
      { label: "Guias estaduais", valor: String(estaduaisMovements.length) },
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
      { label: "Pendências da empresa", valor: String(avisos.length) },
    ],
  };

  const rotas: Partial<Record<GrupoSlug, string>> = {
    darf: "/fiscal/guias/darf",
    estaduais: "/fiscal/guias/estaduais",
    parcelamentos: "/fiscal/guias/parcelamentos",
    calendario: "/fiscal/guias/calendario",
  };

  return (
    <div className="space-y-6 pb-16">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fiscal</div>
        <h1 className="font-display text-3xl sm:text-4xl">Guias e Tributos</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary" className="rounded-full">{formatCompetencia(competencia)}</Badge>
          <Badge variant="secondary" className="rounded-full">{empresa?.razao ?? "Nenhuma empresa selecionada"}</Badge>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-9">
        {kpis.map((k) => <Indicador key={k.label} {...k} />)}
      </div>

      <Card className="rounded-3xl border-border/70 bg-brand-orange/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-brand-orange/20 p-2 text-brand-orange">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-xl">Próximo Fechamento</div>
              <p className="text-sm text-muted-foreground">O fechamento da competência atual está com 65% de progresso.</p>
            </div>
          </div>
          <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90">
            Ver plano de ação <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {GRUPOS.map((g: any) => {
          const rota = rotas[g.slug as GrupoSlug] || "#";
          const Icone = ICONES[g.slug as GrupoSlug] || Banknote;
          const inds = indicadoresPorGrupo[g.slug as GrupoSlug] || [];
          return (
            <Card key={g.slug} className="rounded-3xl border-border/70 transition-shadow hover:shadow-card">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-brand-orange/10 p-3">
                    <Icone className="h-6 w-6 text-brand-orange" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display text-2xl">{g.label}</h2>
                    <p className="max-w-md text-sm text-muted-foreground">{g.submodulos.join(" · ")}</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {inds.map((i) => <Indicador key={i.label} {...i} />)}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <div className="flex flex-wrap gap-1.5">
                    {g.submodulos.slice(0, 3).map((s: string) => (
                      <Badge key={s} variant="secondary" className="rounded-full text-[10px]">{s}</Badge>
                    ))}
                  </div>
                  <Link to={rota} className="text-muted-foreground transition-colors hover:text-brand-orange">
                    <Button variant="ghost" size="sm" className="rounded-full text-xs">
                      Gerenciar <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-3xl border-border/70 lg:col-span-2">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl">Alertas e Pendências</h3>
              <Badge variant="outline" className="rounded-full">Fiscal</Badge>
            </div>
            <div className="space-y-4">
              {avisos.length > 0 ? avisos.map((a, i) => (
                <div key={i} className="flex items-start gap-3 rounded-2xl border border-border/50 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-brand-orange" />
                  <div className="text-sm leading-relaxed">{a}</div>
                </div>
              )) : (
                <div className="flex h-24 flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 text-sm text-muted-foreground">
                  Nenhuma pendência crítica identificada.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/70">
          <CardContent className="p-6">
            <h3 className="mb-4 font-display text-xl">Meios de Pagamento</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success" />
                  <span className="text-sm">PIX (Dinâmico)</span>
                </div>
                <Badge variant="secondary" className="rounded-full">Ativo</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success" />
                  <span className="text-sm">Boleto / Cód. Barras</span>
                </div>
                <Badge variant="secondary" className="rounded-full">Ativo</Badge>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-muted" />
                  <span className="text-sm">Cartão Corporativo</span>
                </div>
                <Badge variant="outline" className="rounded-full">Inativo</Badge>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Última conciliação: {dataBR(hoje)}</div>
          </CardContent>
        </Card>
      </div>

      <AssistenteFechamento contexto={{ rTotal, rFed, rEst, parc }} resumo="Hub de guias e tributos fiscais." />
    </div>
  );
}
