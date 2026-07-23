import { Card, CardContent, Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/design-system/mj-design-system-db98fa";
import { ArrowUpRight, ArrowDownRight, RefreshCw, PlayCircle, AlertTriangle, Info, AlertOctagon, TrendingUp } from "lucide-react";
import { KPIS, STATUS_FECHAMENTO, ALERTAS, brl, DRE } from "@/lib/contabilMock";

const toneMap = {
  success: "text-success",
  warn: "text-warn",
  danger: "text-destructive",
} as const;

const statusMap: Record<string, { label: string; dot: string; text: string }> = {
  CONCLUIDO: { label: "Concluído", dot: "bg-success", text: "text-success" },
  EM_ANDAMENTO: { label: "Em andamento", dot: "bg-warn", text: "text-warn" },
  PENDENTE: { label: "Pendente", dot: "bg-muted-foreground", text: "text-muted-foreground" },
  ATRASADO: { label: "Atrasado", dot: "bg-destructive", text: "text-destructive" },
};

const alertIcon = {
  erro: AlertOctagon,
  aviso: AlertTriangle,
  info: Info,
} as const;

const alertColor = {
  erro: "text-destructive",
  aviso: "text-warn",
  info: "text-brand-blue",
} as const;

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Painel de controle</div>
          <h1 className="font-display text-4xl mt-2">
            Visão geral <span className="text-brand-orange">contábil</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">Competência 10/2024 — Metalúrgica Andrade S.A.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-md h-9">
            <RefreshCw className="h-4 w-4 mr-1.5" /> Sincronizar ERP
          </Button>
          <Button size="sm" className="rounded-md h-9 bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground">
            <PlayCircle className="h-4 w-4 mr-1.5" /> Iniciar fechamento
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {KPIS.map((k) => (
          <Card key={k.label} className="rounded-xl border border-border bg-card shadow-card">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{k.label}</div>
              <div className="font-display text-3xl mt-3">{k.value}</div>
              <div className={`text-xs mt-2 inline-flex items-center gap-1 ${toneMap[k.tone]}`}>
                {k.tone === "success" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {k.trend}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Status de fechamento */}
        <Card className="rounded-xl border border-border bg-card shadow-card xl:col-span-8">
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl">Status de fechamento por módulo</h2>
                <p className="text-xs text-muted-foreground mt-1">Competência 10/2024 · responsáveis atribuídos automaticamente</p>
              </div>
              <Badge variant="outline" className="rounded-md">6 módulos</Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="pl-6">Módulo</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Atualizado</TableHead>
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
                      <TableCell className="text-xs text-muted-foreground">{row.atualizado}</TableCell>
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
                  <div key={i} className="flex gap-3 rounded-lg border border-border bg-background/50 p-3">
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
                <h2 className="font-display text-2xl">DRE resumida — acumulado 2024</h2>
                <p className="text-xs text-muted-foreground mt-1">Nível 1 · valores até 31/10/2024</p>
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
