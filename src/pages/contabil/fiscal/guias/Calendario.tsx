import { useMemo, useState } from "react";
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
  alertas, brl, calendario, dataBR, diasEntre, hojeISO, type EventoCalendario,
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
          <div key={iso} className="min-h-20 rounded-2xl border border-border/70 p-2">
            <div className="font-mono text-xs text-muted-foreground">{String(dia).padStart(2, "0")}</div>
            <div className="mt-1 space-y-1">
              {doDia.slice(0, 3).map((e) => (
                <div
                  key={e.id}
                  className={`truncate rounded-full px-2 py-0.5 text-[10px] ${corPrioridade(e.prioridade)}`}
                  title={`${e.titulo} — ${brl(e.valor)}`}
                >
                  {e.titulo}
                </div>
              ))}
              {doDia.length > 3 && <div className="text-[10px] text-muted-foreground">+{doDia.length - 3}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function GuiasCalendario() {
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const [visao, setVisao] = useState<Visao>("Mês");
  const hoje = hojeISO();

  const eventos = useMemo(() => calendario(empresa?.id, competencia), [empresa, competencia]);
  const avisos = alertas(empresa?.id, competencia);

  const filtrados = useMemo(() => {
    if (visao === "Hoje") return eventos.filter((e) => e.data === hoje);
    if (visao === "Semana") return eventos.filter((e) => e.dias >= 0 && e.dias <= 7);
    if (visao === "Mês") return eventos;
    return eventos;
  }, [eventos, visao, hoje]);

  const atrasadas = eventos.filter((e) => e.dias < 0 && e.status !== "Paga");
  const doDia = eventos.filter((e) => e.data === hoje);
  const proximos = eventos.filter((e) => e.dias >= 0 && e.dias <= 7);

  return (
    <div className="space-y-6 pb-16">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fiscal · Guias e recolhimentos</div>
        <h1 className="font-display text-3xl sm:text-4xl flex items-center gap-3">
          <span className="rounded-2xl bg-brand-orange/10 p-2"><CalendarClock className="h-6 w-6 text-brand-orange" /></span>
          Calendário fiscal
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Agenda tributária por empresa e competência, com prazo legal, responsável, prioridade e
          alertas automáticos de vencimento.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary" className="rounded-full">{formatCompetencia(competencia)}</Badge>
          <Badge variant="secondary" className="rounded-full">{empresa?.razao ?? "Nenhuma empresa selecionada"}</Badge>
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link to="/fiscal/guias">Voltar ao hub</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Indicador label="Próximos vencimentos" valor={String(proximos.length)} />
        <Indicador label="Tributos do mês" valor={String(eventos.length)} />
        <Indicador label="Guias atrasadas" valor={String(atrasadas.length)} destaque={atrasadas.length > 0} />
        <Indicador label="Guias do dia" valor={String(doDia.length)} />
        <Indicador label="Alertas críticos" valor={String(avisos.filter((a) => a.nivel === "crítico").length)} destaque={avisos.some((a) => a.nivel === "crítico")} />
      </div>

      <div className="flex flex-wrap gap-2">
        {VISOES.map((v) => (
          <Badge
            key={v}
            onClick={() => setVisao(v)}
            className={`cursor-pointer rounded-full ${visao === v ? "bg-brand-orange/15 text-brand-orange" : "bg-muted text-muted-foreground"}`}
          >
            {v}
          </Badge>
        ))}
      </div>

      {visao === "Calendário" ? (
        <Card className="rounded-3xl border-border/70">
          <CardContent className="p-5">
            <GradeMes eventos={eventos} competencia={competencia} />
          </CardContent>
        </Card>
      ) : visao === "Linha do tempo" ? (
        <Card className="rounded-3xl border-border/70">
          <CardContent className="space-y-2 p-5">
            {eventos.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 p-3">
                <span className="w-20 font-mono text-xs">{dataBR(e.data)}</span>
                <span className={`h-2 w-2 rounded-full ${e.dias < 0 ? "bg-destructive" : e.dias <= 5 ? "bg-brand-orange" : "bg-success"}`} />
                <span className="min-w-0 flex-1 break-words text-sm">{e.titulo}</span>
                <span className="font-mono text-xs">{brl(e.valor)}</span>
                <Badge className={`rounded-full text-[10px] ${corPrioridade(e.prioridade)}`}>{e.prioridade}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-3xl border-border/70">
          <CardContent className="p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data limite</TableHead>
                  <TableHead>Tributo / evento</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-center">Prioridade</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Prazo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{dataBR(e.data)}</TableCell>
                    <TableCell className="text-xs">{e.titulo}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.detalhe}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{brl(e.valor)}</TableCell>
                    <TableCell className="text-xs">{e.responsavel}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={`rounded-full ${corPrioridade(e.prioridade)}`}>{e.prioridade}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-xs">{e.status}</TableCell>
                    <TableCell className="text-center font-mono text-xs">
                      {e.dias >= 0 ? `${e.dias} dia(s)` : `${Math.abs(e.dias)} em atraso`}
                    </TableCell>
                  </TableRow>
                ))}
                {filtrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum vencimento para esta visão.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-3xl border-border/70">
        <CardContent className="space-y-2 p-5">
          <h2 className="flex items-center gap-2 font-display text-2xl">
            <Bell className="h-5 w-5 text-brand-orange" /> Alertas automáticos
          </h2>
          {avisos.length === 0 && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" /> Nenhum vencimento crítico na competência.
            </p>
          )}
          {avisos.slice(0, 12).map((a) => (
            <div key={a.id} className="flex items-start gap-2 rounded-2xl border border-border/70 p-3">
              {a.nivel === "crítico" ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              ) : (
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
              )}
              <div className="min-w-0">
                <div className="break-words text-sm">{a.titulo}</div>
                <p className="break-words text-xs text-muted-foreground">{a.detalhe}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <AssistenteFechamento
        rotulo="IA ajudante"
        resumo={`Calendário fiscal de ${formatCompetencia(competencia)} com ${eventos.length} vencimento(s).`}
        contexto={{
          tela: "Calendário fiscal de guias",
          competencia,
          empresa: empresa?.razao,
          eventos: eventos.slice(0, 20).map((e) => ({
            data: e.data, evento: e.titulo, valor: e.valor, prioridade: e.prioridade,
            status: e.status, dias: e.dias, responsavel: e.responsavel,
          })),
          alertas: avisos.slice(0, 10),
        }}
      />
    </div>
  );
}
