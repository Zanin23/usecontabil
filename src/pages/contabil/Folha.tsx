import { Badge, Button, Card, CardContent, Progress, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/design-system/mj-design-system-db98fa";
import { Calculator, Upload, FileDown, Send, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { COLABORADORES, brl } from "@/lib/contabilMock";

const STEPS = [
  { n: 1, label: "Preparações", done: true },
  { n: 2, label: "Movimentações", done: true },
  { n: 3, label: "Cálculo & Demonstrações", done: false, active: true },
  { n: 4, label: "Encerramento & eSocial", done: false },
];

const statusMap: Record<string, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  CALCULADO: { label: "Calculado", cls: "text-success", Icon: CheckCircle2 },
  PENDENTE: { label: "Pendente", cls: "text-warn", Icon: Clock },
  ERRO: { label: "Erro", cls: "text-destructive", Icon: AlertCircle },
};

export default function Folha() {
  const totalLiquido = COLABORADORES.reduce((s, c) => s + c.liquido, 0);
  const totalProv = COLABORADORES.reduce((s, c) => s + c.proventos, 0);
  const totalDesc = COLABORADORES.reduce((s, c) => s + c.descontos, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Módulo 03 · Pessoal</div>
          <h1 className="font-display text-4xl mt-2">Folha de <span className="text-brand-orange">Pagamento</span></h1>
          <p className="text-sm text-muted-foreground mt-1.5">Competência 10/2024 · 128 colaboradores ativos · tipo MENSAL</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-md h-9">
            <Upload className="h-4 w-4 mr-1.5" /> Cartão ponto (AFDT)
          </Button>
          <Button size="sm" className="rounded-md h-9 bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground">
            <Calculator className="h-4 w-4 mr-1.5" /> Calcular folha em lote
          </Button>
        </div>
      </div>

      {/* Wizard */}
      <Card className="rounded-xl border border-border bg-card shadow-card">
        <CardContent className="p-5">
          <div className="grid grid-cols-4 gap-3">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex items-start gap-3">
                <div
                  className={`h-8 w-8 rounded-full grid place-items-center text-sm font-medium shrink-0 ${
                    s.done
                      ? "bg-success/20 text-success"
                      : s.active
                      ? "bg-brand-orange text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s.done ? <CheckCircle2 className="h-4 w-4" /> : s.n}
                </div>
                <div className="flex-1">
                  <div className={`text-sm ${s.active ? "font-medium" : ""}`}>{s.label}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                    {s.done ? "Concluído" : s.active ? "Em andamento" : "Aguardando"}
                  </div>
                  {s.active && <Progress value={64} className="h-1 mt-2" />}
                </div>
                {i < STEPS.length - 1 && <div className="hidden xl:block flex-1 h-px bg-border mt-4" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPIs folha */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total proventos", value: brl(totalProv), tone: "text-foreground" },
          { label: "Total descontos", value: brl(totalDesc), tone: "text-destructive" },
          { label: "Líquido a pagar", value: brl(totalLiquido), tone: "text-success" },
          { label: "Encargos patronais", value: brl(totalProv * 0.283), tone: "text-warn" },
        ].map((k) => (
          <Card key={k.label} className="rounded-xl border border-border bg-card shadow-card">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{k.label}</div>
              <div className={`font-mono text-2xl mt-2 ${k.tone}`}>{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Colaboradores */}
      <Card className="rounded-xl border border-border bg-card shadow-card">
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl">Colaboradores — competência 10/2024</h2>
              <p className="text-xs text-muted-foreground mt-1">Cálculo progressivo INSS + IRRF aplicado · desconto simplificado quando mais benéfico</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-md h-8">
                <FileDown className="h-4 w-4 mr-1.5" /> Holerites PDF
              </Button>
              <Button variant="outline" size="sm" className="rounded-md h-8">
                <Send className="h-4 w-4 mr-1.5" /> Disparar S-1200
              </Button>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="pl-6 w-20">Matríc.</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead className="text-right">Salário base</TableHead>
                <TableHead className="text-right">Proventos</TableHead>
                <TableHead className="text-right">Descontos</TableHead>
                <TableHead className="text-right">Líquido</TableHead>
                <TableHead className="pr-6 w-32">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {COLABORADORES.map((c) => {
                const s = statusMap[c.status];
                return (
                  <TableRow key={c.id} className="border-border hover:bg-accent/30">
                    <TableCell className="pl-6 font-mono text-xs text-muted-foreground">{c.matricula}</TableCell>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.cargo}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{brl(c.salario)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{brl(c.proventos)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-destructive">-{brl(c.descontos).replace("R$ ", "R$ ")}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">{brl(c.liquido)}</TableCell>
                    <TableCell className="pr-6">
                      <Badge variant="outline" className={`rounded-md gap-1.5 ${s.cls} border-current/30`}>
                        <s.Icon className="h-3 w-3" /> {s.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
