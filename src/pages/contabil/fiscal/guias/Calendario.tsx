import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Bell, CalendarClock, CheckCircle2, Clock } from "lucide-react";
import {
  Badge, Button, Card, CardContent,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import {
  alertas, brl, calendario, dataBR, diasEntre, hojeISO, type EventoCalendario, EventoCalendario as EVENTO_KEY
} from "@/lib/guiasStore";

type Visao = "Hoje" | "Semana" | "Mês" | "Ano" | "Linha do tempo" | "Calendário" | "Lista";
const VISOES: Visao[] = ["Hoje", "Semana", "Mês", "Ano", "Linha do tempo", "Calendário", "Lista"];

function corPrioridade(p: string) {
  if (p === "Alta") return "bg-destructive/15 text-destructive";
  if (p === "Média") return "bg-brand-orange/15 text-brand-orange";
  return "bg-muted text-muted-foreground";
}

function Indicador({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className={`min-w-0 rounded-2xl border p-3 ${destaque ? "border-destructive/40 bg-destructive/5" : "border-border/70"}`}>
      <div className="text-[10px] uppercase tracking-[0.06em] leading-tight break-words text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-mono text-sm break-words ${destaque ? "text-destructive" : ""}`}>{valor}</div>
    </div>
  );
}

function GradeMes({ eventos, competencia }: { eventos: EventoCalendario[]; competencia: string }) {
  const [y, m] = competencia.split("-").map(Number);
  const primeiro = new Date(Date.UTC(y, m, 1));
  const dias = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const offset = primeiro.getUTCDay();
  const celulas = [...Array(offset).fill(null), ...Array.from({ length: dias }, (_, i) => i + 1)];
  const mesISO = `${primeiro.getUTCFullYear()}-${String(primeiro.getUTCMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="grid grid-cols-7 gap-2">
      {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
        <div key={d} className="text-center text-[10px] uppercase tracking-[0.06em] text-muted-foreground">{d}</div>
      ))}
      {celulas.map((dia, i) => {
        if (!dia) return <div key={`v-${i}`} />;
        const iso = `${mesISO}-${String(dia).padStart(2, "0")}`;
        const doDia = eventos.filter((e) => e.data === iso);
        return (
          <div key={iso} className={`relative flex aspect-square flex-col items-center justify-center rounded-2xl border p-1 text-xs ${doDia.length > 0 ? "border-brand-orange/30 bg-brand-orange/5" : "border-border/50"}`}>
            <span className={doDia.length > 0 ? "font-bold text-brand-orange" : ""}>{dia}</span>
            {doDia.length > 0 && (
              <div className="mt-1 flex gap-0.5">
                {doDia.map((e) => (
                  <div key={e.id} className={`h-1.5 w-1.5 rounded-full ${e.prioridade === "Alta" ? "bg-destructive" : "bg-brand-orange"}`} title={e.titulo} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CalendarioFiscal() {
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const [visao, setVisao] = useState<Visao>("Calendário");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const sync = () => setTick(t => t + 1);
    window.addEventListener(EVENTO_KEY, sync);
    return () => window.removeEventListener(EVENTO_KEY, sync);
  }, []);

    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarrega quando o store avisa (tick)
  const eventos = useMemo(() => calendario(empresa?.id, competencia), [empresa?.id, competencia, tick]);
  const hoje = hojeISO();
  const avisosLista = alertas(empresa?.id, competencia);

  const kpis = [
    { label: "Próximos 7 dias", valor: String(eventos.filter((e) => e.dias >= 0 && e.dias <= 7).length) },
    { label: "Eventos do mês", valor: String(eventos.length) },
    { label: "Alertas ativos", valor: String(avisosLista.length), destaque: avisosLista.length > 0 },
  ];

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fiscal › Guias</div>
          <h1 className="font-display text-3xl sm:text-4xl">Calendário Fiscal</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary" className="rounded-full">{formatCompetencia(competencia)}</Badge>
            <Badge variant="secondary" className="rounded-full">{empresa?.razao ?? "Sem empresa"}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {VISOES.map((v) => (
            <Button
              key={v}
              variant={visao === v ? "default" : "outline"}
              size="sm"
              onClick={() => setVisao(v)}
              className="h-8 rounded-full text-[10px] uppercase tracking-wider"
            >
              {v}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => <Indicador key={k.label} {...k} />)}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {visao === "Calendário" ? (
            <Card className="rounded-xl border-border/70">
              <CardContent className="p-6">
                <GradeMes eventos={eventos} competencia={competencia} />
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-xl border-border/70">
              <CardContent className="p-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data limite</TableHead>
                      <TableHead>Tributo / evento</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventos.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono text-xs">
                          {dataBR(e.data)}
                          <div className="text-[10px] text-muted-foreground">
                            {e.dias < 0 ? `${Math.abs(e.dias)} dias atrás` : e.dias === 0 ? "Hoje" : `em ${e.dias} dias`}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{e.titulo}</div>
                          <div className="text-[10px] text-muted-foreground">{e.detalhe}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`rounded-full ${corPrioridade(e.prioridade)} border-none text-[10px]`}>
                            {e.prioridade}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-full text-[10px]">
                            {e.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full">
                            <Clock className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {eventos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          Nenhum evento agendado para o período.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="rounded-xl border-border/70 bg-brand-orange/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 font-display text-xl text-brand-orange">
                <Bell className="h-5 w-5" /> Lembretes
              </div>
              <div className="mt-4 space-y-4">
                {avisosLista.length > 0 ? avisosLista.map((a, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-lg bg-brand-orange" />
                    <div className="text-xs leading-relaxed">{a}</div>
                  </div>
                )) : (
                  <div className="text-xs text-muted-foreground">Nenhum aviso importante.</div>
                )}
              </div>
            </CardContent>
          </Card>

          <AssistenteFechamento contexto={{ eventos }} resumo="Análise do calendário fiscal e próximos vencimentos." />
        </div>
      </div>
    </div>
  );
}
