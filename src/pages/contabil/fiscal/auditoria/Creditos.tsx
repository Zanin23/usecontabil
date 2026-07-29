import { useState } from "react";
import { Coins, Download, Search } from "lucide-react";
import {
  Badge, Button, Card, CardContent, Input, Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import {
  CATEGORIAS, brlAud, marcarCredito, resumoCreditos, useOportunidades,
  type Oportunidade,
} from "@/lib/auditoriaStore";

const SITUACOES: Oportunidade["situacao"][] = ["Identificado", "Em levantamento", "Aproveitado", "Prescrito"];

export default function AuditoriaCreditos() {
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const lista = useOportunidades(empresa?.id, competencia);
  const meta = CATEGORIAS.find((c) => c.slug === "creditos")!;
  const [busca, setBusca] = useState("");
  const [tributo, setTributo] = useState("todos");

  const tributos = Array.from(new Set(lista.map((o) => o.tributo)));
  const filtrados = lista.filter(
    (o) =>
      (tributo === "todos" || o.tributo === tributo) &&
      (busca.trim() === "" || `${o.origem} ${o.descricao} ${o.tributo}`.toLowerCase().includes(busca.toLowerCase())),
  );
  const r = resumoCreditos(lista);

  function exportar() {
    const linhas = [
      ["Tributo", "Origem", "Descrição", "Fundamentação", "Documentos", "Valor", "Prazo", "Probabilidade", "Situação"],
      ...lista.map((o) => [
        o.tributo, o.origem, o.descricao, o.fundamentacao, String(o.documentos),
        o.valor.toFixed(2), o.prazo, `${o.probabilidade}%`, o.situacao,
      ]),
    ];
    const csv = linhas.map((l) => l.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `creditos-extemporaneos-${competencia}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Levantamento exportado em CSV.");
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Auditoria fiscal</div>
          <h1 className="flex items-center gap-2 font-display text-3xl sm:text-4xl">
            <Coins className="h-7 w-7 text-brand-orange" /> {meta.titulo}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{meta.descricao}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary" className="rounded-full">{formatCompetencia(competencia)}</Badge>
            <Badge variant="secondary" className="rounded-full">{empresa?.razao ?? "Nenhuma empresa selecionada"}</Badge>
          </div>
        </div>
        <Button variant="outline" className="rounded-full" onClick={exportar}>
          <Download className="mr-1.5 h-4 w-4" /> Exportar levantamento
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Oportunidades", valor: String(r.identificados) },
          { label: "Total identificado", valor: brlAud(r.total) },
          { label: "Recuperável", valor: brlAud(r.recuperavel) },
          { label: "Já aproveitado", valor: brlAud(r.aproveitado) },
          { label: "Prescrito", valor: brlAud(r.prescrito) },
        ].map((k) => (
          <Card key={k.label} className="rounded-3xl border-border/70">
            <CardContent className="space-y-1 p-5">
              <div className="text-[10px] uppercase leading-tight tracking-[0.06em] break-words text-muted-foreground">{k.label}</div>
              <div className="break-words font-display text-2xl">{k.valor}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="rounded-full pl-9"
            placeholder="Buscar por tributo, origem ou descrição"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={tributo} onValueChange={setTributo}>
          <SelectTrigger className="w-[180px] rounded-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tributos</SelectItem>
            {tributos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="rounded-3xl border-border/70">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tributo</TableHead>
                <TableHead>Oportunidade</TableHead>
                <TableHead>Fundamentação</TableHead>
                <TableHead className="text-center">Docs</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Prazo</TableHead>
                <TableHead className="text-center">Probabilidade</TableHead>
                <TableHead className="text-center">Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((o) => (
                <TableRow key={o.id}>
                  <TableCell><Badge variant="secondary" className="rounded-full">{o.tributo}</Badge></TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium break-words">{o.descricao}</div>
                    <div className="text-xs text-muted-foreground break-words">{o.origem}</div>
                  </TableCell>
                  <TableCell className="max-w-[260px] break-words text-xs text-muted-foreground">{o.fundamentacao}</TableCell>
                  <TableCell className="text-center font-mono text-xs">{o.documentos}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{brlAud(o.valor)}</TableCell>
                  <TableCell className="text-center font-mono text-xs">{o.prazo}</TableCell>
                  <TableCell className="text-center font-mono text-xs">{o.probabilidade}%</TableCell>
                  <TableCell className="text-center">
                    <Select
                      value={o.situacao}
                      onValueChange={(v) => {
                        marcarCredito(o.id, v as Oportunidade["situacao"]);
                        toast.success(`Crédito marcado como ${v.toLowerCase()}.`);
                      }}
                    >
                      <SelectTrigger className="w-[150px] rounded-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SITUACOES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {filtrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhuma oportunidade de crédito identificada nesta competência.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AssistenteFechamento
        rotulo="IA ajudante"
        resumo={`Créditos extemporâneos: ${r.identificados} oportunidade(s), ${brlAud(r.recuperavel)} passíveis de recuperação nesta competência.`}
        contexto={{
          modulo: "Auditoria fiscal — créditos extemporâneos",
          empresa: empresa?.razao,
          competencia,
          resumo: r,
          oportunidades: lista.map((o) => ({
            tributo: o.tributo, descricao: o.descricao, valor: o.valor,
            fundamentacao: o.fundamentacao, prazo: o.prazo, situacao: o.situacao,
          })),
        }}
      />
    </div>
  );
}
