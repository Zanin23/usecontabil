import { Badge, Button, Card, CardContent, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/design-system/mj-design-system-db98fa";
import { CheckCircle2, AlertTriangle, XCircle, PlugZap, ArrowRight, Plus, TestTube2 } from "lucide-react";
import { CONECTORES_ERP, MAPEAMENTO_CONTAS } from "@/lib/contabilMock";

const statusMap: Record<string, { cls: string; Icon: typeof CheckCircle2; label: string }> = {
  OK: { cls: "text-success", Icon: CheckCircle2, label: "Conectado" },
  ATENCAO: { cls: "text-warn", Icon: AlertTriangle, label: "Atenção" },
  ERRO: { cls: "text-destructive", Icon: XCircle, label: "Falhou" },
};

export default function IntegracaoERP() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Módulo 06</div>
          <h1 className="font-display text-4xl mt-2">Integração <span className="text-brand-orange">ERP</span></h1>
          <p className="text-sm text-muted-foreground mt-1.5">Conectores bidirecionais e mapeamento DE-PARA de plano de contas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-md h-9"><TestTube2 className="h-4 w-4 mr-1.5" /> Testar conexões</Button>
          <Button size="sm" className="rounded-md h-9 bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground">
            <Plus className="h-4 w-4 mr-1.5" /> Novo conector
          </Button>
        </div>
      </div>

      {/* Conectores */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {CONECTORES_ERP.map((c) => {
          const s = statusMap[c.status];
          return (
            <Card key={c.id} className="rounded-xl border border-border bg-card shadow-card">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="h-9 w-9 rounded-md bg-brand-orange/15 grid place-items-center">
                    <PlugZap className="h-4 w-4 text-brand-orange" />
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-widest ${s.cls}`}>
                    <s.Icon className="h-3 w-3" /> {s.label}
                  </span>
                </div>
                <div>
                  <div className="font-display text-lg">{c.nome}</div>
                  <div className="text-xs text-muted-foreground">{c.ambiente}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border">
                  <div>
                    <div className="text-muted-foreground">Última sync</div>
                    <div className="font-mono mt-0.5">{c.ultimaSync}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Registros</div>
                    <div className="font-mono mt-0.5">{c.registros.toLocaleString("pt-BR")}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Mapeamento de contas */}
      <Card className="rounded-xl border border-border bg-card shadow-card">
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl">Mapeamento de plano de contas</h2>
              <p className="text-xs text-muted-foreground mt-1">TOTVS Protheus → Use Contábil · arraste para vincular</p>
            </div>
            <Badge variant="outline" className="rounded-md">{MAPEAMENTO_CONTAS.length} mapeamentos ativos</Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="pl-6">Campo ERP</TableHead>
                <TableHead>Descrição ERP</TableHead>
                <TableHead className="w-12" />
                <TableHead>Conta destino</TableHead>
                <TableHead className="pr-6">Nome da conta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MAPEAMENTO_CONTAS.map((m) => (
                <TableRow key={m.erpCampo} className="border-border hover:bg-accent/30">
                  <TableCell className="pl-6 font-mono text-xs text-brand-blue">{m.erpCampo}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.erpDesc}</TableCell>
                  <TableCell><ArrowRight className="h-4 w-4 text-brand-orange" /></TableCell>
                  <TableCell className="font-mono text-xs">{m.contaDestino}</TableCell>
                  <TableCell className="pr-6 text-sm">{m.contaNome}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Logs recentes */}
      <Card className="rounded-xl border border-border bg-card shadow-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl">Logs de sincronização</h2>
            <Badge variant="outline" className="rounded-md">Últimas 24h</Badge>
          </div>
          <div className="space-y-1.5 font-mono text-xs">
            {[
              { t: "09:42:11", tag: "OK", msg: "TOTVS/Protheus · POST /notas-entrada · 128 registros · 1.4s" },
              { t: "09:41:58", tag: "OK", msg: "TOTVS/Protheus · POST /titulos-pagar · 44 registros · 0.9s" },
              { t: "09:37:02", tag: "WARN", msg: "Bling · GET /produtos · rate-limit 429, retry em 60s" },
              { t: "09:12:04", tag: "ERR", msg: "Omie · GET /webhooks · timeout 15s · rota /api/v1/webhooks/list" },
              { t: "08:58:22", tag: "OK", msg: "SAP B1 · POST /extrato-bancario · 12 registros · 2.1s" },
            ].map((l, i) => (
              <div key={i} className="flex items-start gap-3 py-1.5 border-b border-border/40 last:border-0">
                <span className="text-muted-foreground">{l.t}</span>
                <span
                  className={`px-1.5 rounded text-[10px] uppercase tracking-widest ${
                    l.tag === "OK" ? "bg-success/15 text-success" : l.tag === "WARN" ? "bg-warn/15 text-warn" : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {l.tag}
                </span>
                <span className="text-muted-foreground">{l.msg}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
