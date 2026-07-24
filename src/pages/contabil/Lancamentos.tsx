import { useMemo, useState } from "react";
import { Badge, Button, Card, CardContent, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/design-system/mj-design-system-db98fa";
import { Save, Upload, Zap, Filter, Lock, CircleCheck, CircleAlert } from "lucide-react";
import { LANCAMENTOS, brl } from "@/lib/contabilMock";
import { competenciaBR, useCompetencia } from "@/lib/competencia";

const origemColor: Record<string, string> = {
  MANUAL: "bg-muted text-muted-foreground",
  ERP: "bg-brand-blue/15 text-brand-blue",
  OFX: "bg-brand-purple/15 text-brand-purple",
};

export default function Lancamentos() {
  const [filtro, setFiltro] = useState("");
  const { competencia, isInCompetencia } = useCompetencia();
  const rows = useMemo(
    () =>
      LANCAMENTOS.filter((l) => isInCompetencia(l.data)).filter((l) =>
        (l.historico + l.debito + l.credito + l.debitoNome + l.creditoNome)
          .toLowerCase()
          .includes(filtro.toLowerCase()),
      ),
    [filtro, isInCompetencia],
  );

  const totalDebitos = rows.reduce((s, r) => s + r.valor, 0);
  const totalCreditos = rows.reduce((s, r) => s + r.valor, 0);
  const diff = Math.abs(totalDebitos - totalCreditos);
  const balanceado = diff < 0.01;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Módulo 02</div>
          <h1 className="font-display text-4xl mt-2">Livro <span className="text-brand-orange">Diário</span></h1>
          <p className="text-sm text-muted-foreground mt-1.5">Lançamentos em massa · partidas dobradas · atalhos de teclado</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          Período {competenciaBR(competencia)} — filtro ativo
        </div>
      </div>

      {/* Novo lançamento inline */}
      <Card className="rounded-xl border border-border bg-card shadow-card">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-brand-orange" />
            <h2 className="font-display text-xl">Novo lançamento</h2>
            <span className="text-xs text-muted-foreground">Use <kbd className="mx-1 px-1.5 py-0.5 rounded border border-border font-mono text-[10px]">Tab</kbd> para navegar · <kbd className="mx-1 px-1.5 py-0.5 rounded border border-border font-mono text-[10px]">Ctrl+S</kbd> para salvar</span>
          </div>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-2">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Data</label>
              <Input defaultValue="31/07/2026" className="h-9 rounded-md mt-1 font-mono text-sm" />
            </div>
            <div className="col-span-3">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Conta débito</label>
              <Input placeholder="1.1.02.001 — Bco Itaú" className="h-9 rounded-md mt-1 font-mono text-sm" />
            </div>
            <div className="col-span-3">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Conta crédito</label>
              <Input placeholder="3.1.01.001 — Receita vendas" className="h-9 rounded-md mt-1 font-mono text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Valor (R$)</label>
              <Input placeholder="0,00" className="h-9 rounded-md mt-1 font-mono text-sm text-right" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Centro custo</label>
              <Input placeholder="Comercial-SP" className="h-9 rounded-md mt-1 text-sm" />
            </div>
            <div className="col-span-10">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Histórico</label>
              <Input placeholder="Histórico padrão + complemento livre" className="h-9 rounded-md mt-1 text-sm" />
            </div>
            <div className="col-span-2 flex items-end gap-2">
              <Button variant="outline" className="h-9 rounded-md flex-1">
                <Upload className="h-4 w-4 mr-1.5" /> OFX
              </Button>
              <Button className="h-9 rounded-md flex-1 bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground">
                <Save className="h-4 w-4 mr-1.5" /> Salvar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="rounded-xl border border-border bg-card shadow-card">
        <CardContent className="p-0">
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar por conta, histórico ou ID…"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="h-9 max-w-md rounded-md"
            />
            <div className="flex-1" />
            <Badge variant="outline" className="rounded-md">{rows.length} registros</Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="pl-5 w-24">ID</TableHead>
                <TableHead className="w-28">Data</TableHead>
                <TableHead>Débito</TableHead>
                <TableHead>Crédito</TableHead>
                <TableHead>Histórico</TableHead>
                <TableHead className="w-32">Centro</TableHead>
                <TableHead className="w-24">Origem</TableHead>
                <TableHead className="pr-5 text-right w-40">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((l) => (
                <TableRow key={l.id} className="border-border hover:bg-accent/30">
                  <TableCell className="pl-5 font-mono text-xs text-muted-foreground">{l.id}</TableCell>
                  <TableCell className="font-mono text-xs">{l.data.split("-").reverse().join("/")}</TableCell>
                  <TableCell>
                    <div className="font-mono text-xs text-muted-foreground">{l.debito}</div>
                    <div className="text-sm">{l.debitoNome}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-xs text-muted-foreground">{l.credito}</div>
                    <div className="text-sm">{l.creditoNome}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{l.historico}</TableCell>
                  <TableCell className="text-xs">{l.centro}</TableCell>
                  <TableCell>
                    <span className={`inline-flex text-[10px] uppercase tracking-widest px-2 py-0.5 rounded ${origemColor[l.origem]}`}>{l.origem}</span>
                  </TableCell>
                  <TableCell className="pr-5 text-right font-mono">{brl(l.valor)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className={`px-5 py-4 border-t border-border flex items-center justify-between text-sm font-mono ${balanceado ? "" : "bg-destructive/10"}`}>
            <div className="flex items-center gap-2">
              {balanceado ? <CircleCheck className="h-4 w-4 text-success" /> : <CircleAlert className="h-4 w-4 text-destructive" />}
              <span className={balanceado ? "text-success" : "text-destructive font-medium"}>
                {balanceado ? "Partidas dobradas balanceadas" : `Desequilíbrio de ${brl(diff)}`}
              </span>
            </div>
            <div className="flex items-center gap-8 text-xs">
              <div><span className="text-muted-foreground">Σ Débitos </span><span className="text-foreground">{brl(totalDebitos)}</span></div>
              <div><span className="text-muted-foreground">Σ Créditos </span><span className="text-foreground">{brl(totalCreditos)}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
