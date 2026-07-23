import { useState } from "react";
import { Badge, Button, Card, CardContent } from "@/design-system/mj-design-system-db98fa";
import { FileDown, FileSpreadsheet, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { DRE, brl } from "@/lib/contabilMock";

const REPORTS = ["Balancete", "Balanço Patrimonial", "DRE", "DFC", "DLPA", "DVA"];
const NIVEIS = [1, 2, 3, 4, 5];

export default function Demonstracoes() {
  const [report, setReport] = useState("DRE");
  const [nivel, setNivel] = useState(2);
  const [comparativo, setComparativo] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (conta: string) => {
    const s = new Set(collapsed);
    s.has(conta) ? s.delete(conta) : s.add(conta);
    setCollapsed(s);
  };

  const rows = DRE.filter((r) => r.nivel <= nivel);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Módulo 05</div>
          <h1 className="font-display text-4xl mt-2">Demonstrações <span className="text-brand-orange">contábeis</span></h1>
          <p className="text-sm text-muted-foreground mt-1.5">Acumulado 01/01/2024 a 31/10/2024 · exportação SPED ECD</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-md h-9"><FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel</Button>
          <Button variant="outline" size="sm" className="rounded-md h-9"><FileText className="h-4 w-4 mr-1.5" /> SPED ECD</Button>
          <Button size="sm" className="rounded-md h-9 bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground">
            <FileDown className="h-4 w-4 mr-1.5" /> PDF assinado
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <Card className="rounded-xl border border-border bg-card shadow-card">
        <CardContent className="p-4 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Relatório</div>
            <div className="flex rounded-md border border-border overflow-hidden">
              {REPORTS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReport(r)}
                  className={`px-3 py-1.5 text-xs transition ${r === report ? "bg-brand-orange text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Nível</div>
            <div className="flex rounded-md border border-border overflow-hidden">
              {NIVEIS.map((n) => (
                <button
                  key={n}
                  onClick={() => setNivel(n)}
                  className={`w-8 py-1.5 text-xs font-mono transition ${n === nivel ? "bg-brand-orange text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={comparativo} onChange={(e) => setComparativo(e.target.checked)} className="accent-brand-orange" />
            <span className="text-muted-foreground">Comparativo período anterior</span>
          </label>

          <div className="flex-1" />
          <Badge variant="outline" className="rounded-md">Período aberto</Badge>
        </CardContent>
      </Card>

      {/* Report */}
      <Card className="rounded-xl border border-border bg-card shadow-card">
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-border">
            <div className="font-display text-2xl">{report} — Metalúrgica Andrade S.A.</div>
            <div className="text-xs text-muted-foreground mt-1">CNPJ 12.345.678/0001-90 · valores em Reais (R$) · não auditado</div>
          </div>

          <div className="px-6 py-2 text-xs uppercase tracking-widest text-muted-foreground grid grid-cols-12 border-b border-border py-3">
            <div className="col-span-6">Conta</div>
            <div className="col-span-3 text-right">Acum. 2024</div>
            {comparativo && <div className="col-span-3 text-right">Acum. 2023</div>}
          </div>

          <div className="px-6 py-3 font-mono text-sm">
            {rows.map((r) => {
              const isCollapsed = collapsed.has(r.conta);
              const indent = (r.nivel - 1) * 20;
              const previous = r.valor * (0.85 + (r.conta.length % 5) * 0.03);
              return (
                <div
                  key={r.conta}
                  className={`grid grid-cols-12 py-2 border-b border-border/40 ${
                    r.total ? "bg-brand-orange/5 border-y border-brand-orange/20 font-medium text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <div className="col-span-6 flex items-center gap-1" style={{ paddingLeft: indent }}>
                    {r.nivel < 3 ? (
                      <button onClick={() => toggle(r.conta)} className="text-muted-foreground hover:text-foreground">
                        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    ) : (
                      <span className="w-3.5" />
                    )}
                    <span className="text-[10px] text-muted-foreground/70 w-20">{r.conta}</span>
                    <span className={r.total ? "text-foreground" : ""}>{r.nome}</span>
                  </div>
                  <div className={`col-span-3 text-right ${r.valor < 0 ? "text-destructive" : ""}`}>{brl(r.valor)}</div>
                  {comparativo && (
                    <div className={`col-span-3 text-right ${previous < 0 ? "text-destructive/70" : "text-muted-foreground/70"}`}>{brl(previous)}</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="px-6 py-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Gerado em 04/11/2024 09:42 por M. Andrade (Controller)</span>
            <span className="font-mono">Hash SPED: 8f2a·4c11·9d3b·71e0</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
