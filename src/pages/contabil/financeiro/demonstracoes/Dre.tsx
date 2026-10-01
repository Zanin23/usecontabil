import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Badge, Button, Card, CardContent, Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea,
} from "@/design-system/mj-design-system-db98fa";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ArrowRight, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import { confirmarExclusao } from "@/lib/confirmar";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import ExportarMenu from "@/components/contabil/ExportarMenu";
import {
  LINHAS_AJUSTAVEIS, ajustes, brl, competenciaAnterior, evolucao, montarDRE, pctFmt,
  rastreabilidade, removerAjuste, salvarAjuste, useDRE, type LinhaChave,
} from "@/lib/dreStore";

const vazio = { linha: "cmv" as LinhaChave, historico: "", valor: "" };

export default function Dre() {
  const { empresa } = useEmpresaAtual();
  const { competencia, competenciaFim, isPeriodo, competenciasNoPeriodo } = useCompetencia();
  const empresaId = empresa?.id ?? "";
  const [modo, setModo] = useState<"gerencial" | "comparativo">("gerencial");
  const [dialogo, setDialogo] = useState(false);
  const [form, setForm] = useState(vazio);

  const dre = useDRE(() => montarDRE(empresaId, competenciasNoPeriodo), [empresaId, competenciasNoPeriodo]);
  const serie = useDRE(() => evolucao(empresaId, competenciasNoPeriodo, 6), [empresaId, competenciasNoPeriodo]);
  const lista = useDRE(() => ajustes(empresaId, competenciasNoPeriodo), [empresaId, competenciasNoPeriodo]);
  const rastro = useDRE(() => rastreabilidade(empresaId, competenciasNoPeriodo), [empresaId, competenciasNoPeriodo]);

  const anterior = competenciaAnterior(competencia);

  const kpis = [
    { label: "Receita líquida", valor: brl(dre.receitaLiquida), hint: `Bruta ${brl(dre.receitaBruta)}` },
    { label: "Lucro bruto", valor: brl(dre.lucroBruto), hint: `Margem bruta ${pctFmt(dre.margemBruta)}` },
    { label: "EBITDA", valor: brl(dre.ebitda), hint: `Margem EBITDA ${pctFmt(dre.margemEbitda)}` },
    { label: "Lucro líquido", valor: brl(dre.lucroLiquido), hint: `Margem líquida ${pctFmt(dre.margemLiquida)}` },
  ];

  const linhasExport = useMemo(
    () =>
      dre.linhas.map((l) => ({
        conta: (l.nivel === 1 ? "   " : "") + l.rotulo,
        valor: brl(l.valor),
        av: pctFmt(l.av),
        anterior: brl(l.anterior),
        ah: l.ah === null ? "—" : pctFmt(l.ah),
      })),
    [dre],
  );

  const salvar = () => {
    const valor = Number(form.valor.replace(/\./g, "").replace(",", "."));
    if (!form.historico.trim()) { toast.error("Informe o histórico do ajuste."); return; }
    if (!Number.isFinite(valor) || valor === 0) { toast.error("Informe um valor diferente de zero."); return; }
    salvarAjuste({ empresaId, competencia, linha: form.linha, historico: form.historico.trim(), valor });
    toast.success("Ajuste de encerramento lançado", { description: `${form.historico} · ${brl(valor)}` });
    setForm(vazio);
    setDialogo(false);
  };

  const contexto = {
    tela: "DRE — Demonstração do Resultado",
    modulo: "Financeiro › Demonstrações",
    competencia: isPeriodo ? `${formatCompetencia(competencia)} até ${formatCompetencia(competenciaFim!)}` : formatCompetencia(competencia),
    empresa: empresa ? { razao: empresa.razao, regime: empresa.regime } : null,
    resultado: {
      receitaBruta: dre.receitaBruta,
      receitaLiquida: dre.receitaLiquida,
      lucroBruto: dre.lucroBruto,
      ebitda: dre.ebitda,
      lucroLiquido: dre.lucroLiquido,
      margemBruta: dre.margemBruta,
      margemEbitda: dre.margemEbitda,
      margemLiquida: dre.margemLiquida,
    },
    linhas: dre.linhas.map((l) => ({ conta: l.rotulo, valor: l.valor, av: l.av, ah: l.ah })),
    ajustesManuais: lista.length,
    evolucao: serie,
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Financeiro › Demonstrações</div>
          <h1 className="font-display text-3xl sm:text-4xl">
            DRE — demonstração do <span className="text-brand-orange">resultado</span>
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Resultado da competência apurado a partir dos documentos fiscais, da carteira de contas a
            pagar, da depreciação do imobilizado e das baixas financeiras — com análise vertical,
            horizontal e ajustes de encerramento.
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary" className="rounded-full">{isPeriodo ? `${formatCompetencia(competencia)} até ${formatCompetencia(competenciaFim!)}` : formatCompetencia(competencia)}</Badge>
            <Badge variant="secondary" className="rounded-full">{empresa?.razao ?? "Nenhuma empresa selecionada"}</Badge>
            <Badge variant="secondary" className="rounded-full">Comparativo {formatCompetencia(anterior)}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportarMenu
            nome={`DRE ${isPeriodo ? `${formatCompetencia(competencia)}-${formatCompetencia(competenciaFim!)}` : formatCompetencia(competencia)}`}
            colunas={[
              { key: "conta", label: "Conta" },
              { key: "valor", label: "Competência" },
              { key: "av", label: "AV %" },
              { key: "anterior", label: "Anterior" },
              { key: "ah", label: "AH %" },
            ]}
            linhas={linhasExport}
          />
          <Button onClick={() => setDialogo(true)} className="rounded-lg bg-brand-orange hover:bg-brand-orange/90">
            <Plus className="mr-1 h-4 w-4" /> Ajuste de encerramento
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="rounded-xl shadow-card">
            <CardContent className="p-4">
              <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{k.label}</div>
              <div className="mt-1 break-words font-display text-xl">{k.valor}</div>
              <div className="text-[11px] text-muted-foreground">{k.hint}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-xl shadow-card">
        <CardContent className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Evolução do resultado — últimas 6 competências
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={serie} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} vertical={false} />
                <XAxis dataKey="rotulo" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={70}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                />
                <Tooltip formatter={(v: number) => brl(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="receitaLiquida" name="Receita líquida" fill="#F97316" radius={[6, 6, 0, 0]} />
                <Bar dataKey="ebitda" name="EBITDA" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                <Line dataKey="lucroLiquido" name="Lucro líquido" stroke="#0EA5E9" strokeWidth={2} dot />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-card">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-4">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Demonstração do resultado — {isPeriodo ? `${formatCompetencia(competencia)} até ${formatCompetencia(competenciaFim!)}` : formatCompetencia(competencia)}
            </div>
            <div className="flex gap-2">
              {(["gerencial", "comparativo"] as const).map((m) => (
                <Button
                  key={m}
                  size="sm"
                  variant={modo === m ? "default" : "outline"}
                  className={modo === m ? "rounded-lg bg-brand-orange hover:bg-brand-orange/90" : "rounded-full"}
                  onClick={() => setModo(m)}
                >
                  {m === "gerencial" ? "Gerencial" : "Comparativo"}
                </Button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[38%]">Conta</TableHead>
                  <TableHead className="text-right">Competência</TableHead>
                  <TableHead className="text-right">AV %</TableHead>
                  {modo === "comparativo" && <TableHead className="text-right">{formatCompetencia(anterior)}</TableHead>}
                  {modo === "comparativo" && <TableHead className="text-right">AH %</TableHead>}
                  {modo === "gerencial" && <TableHead className="hidden lg:table-cell">Origem</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {dre.linhas.map((l) => {
                  const destaque = l.tipo === "resultado";
                  const subtotal = l.tipo === "subtotal";
                  return (
                    <TableRow
                      key={l.chave}
                      className={destaque ? "bg-muted/60" : subtotal ? "bg-muted/25" : undefined}
                    >
                      <TableCell
                        className={`${l.nivel === 1 ? "pl-8 text-muted-foreground" : ""} ${destaque || subtotal ? "font-medium" : ""}`}
                      >
                        <span className="break-words">{l.rotulo}</span>
                        {l.ajuste !== 0 && (
                          <Badge variant="secondary" className="ml-2 rounded-full text-[10px]">
                            ajuste {brl(l.ajuste)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono tabular-nums ${destaque ? "font-semibold" : ""} ${l.valor < 0 ? "text-destructive" : ""}`}
                      >
                        {brl(l.valor)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                        {pctFmt(l.av)}
                      </TableCell>
                      {modo === "comparativo" && (
                        <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                          {brl(l.anterior)}
                        </TableCell>
                      )}
                      {modo === "comparativo" && (
                        <TableCell className="text-right font-mono tabular-nums">
                          {l.ah === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 ${l.ah >= 0 ? "text-brand-orange" : "text-destructive"}`}>
                              {l.ah >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {pctFmt(l.ah)}
                            </span>
                          )}
                        </TableCell>
                      )}
                      {modo === "gerencial" && (
                        <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">{l.origem}</TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t px-5 py-3 text-[11px] text-muted-foreground">
            <span>{rastro.autorizados} documento(s) de receita · {rastro.entradas} de entrada</span>
            <span>·</span>
            <span>{rastro.titulosPagar} títulos a pagar</span>
            <span>·</span>
            <span>{rastro.bens} bens em depreciação</span>
            {rastro.dadosSimulados ? (
              <>
                <span>·</span>
                <span className="text-warn">dados de exemplo (modo prática)</span>
              </>
            ) : null}
            <Link to="/financeiro/movimentos/conclusao-fiscal" className="ml-auto inline-flex items-center gap-1 text-brand-orange">
              Conclusão fiscal <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-card">
        <CardContent className="p-5">
          <div className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Ajustes de encerramento da competência
          </div>
          {lista.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhum ajuste lançado. Use “Ajuste de encerramento” para provisões, reclassificações e
              lançamentos que não vêm dos movimentos.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[620px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Linha da DRE</TableHead>
                    <TableHead>Histórico</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lista.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm">
                        {LINHAS_AJUSTAVEIS.find((x) => x.chave === a.linha)?.rotulo ?? a.linha}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.historico}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{brl(a.valor)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.usuario}</TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="rounded-full"
                          onClick={() => {
                            if (!confirmarExclusao("este ajuste")) return;
                            removerAjuste(a.id);
                            toast.success("Ajuste removido");
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogo} onOpenChange={setDialogo}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajuste de encerramento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Linha da DRE</Label>
              <Select value={form.linha} onValueChange={(v) => setForm({ ...form, linha: v as LinhaChave })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LINHAS_AJUSTAVEIS.map((l) => (
                    <SelectItem key={l.chave} value={l.chave}>{l.rotulo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Histórico</Label>
              <Textarea
                value={form.historico}
                onChange={(e) => setForm({ ...form, historico: e.target.value })}
                placeholder="Ex.: provisão de férias da competência"
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Valor</Label>
              <Input
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                placeholder="12.500,00"
                inputMode="decimal"
              />
              <p className="text-[11px] text-muted-foreground">
                Use valor positivo para aumentar a linha e negativo para reduzi-la.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setDialogo(false)}>Cancelar</Button>
            <Button className="rounded-lg bg-brand-orange hover:bg-brand-orange/90" onClick={salvar}>Lançar ajuste</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssistenteFechamento
        contexto={contexto}
        resumo={`DRE de ${formatCompetencia(competencia)} — receita líquida ${brl(dre.receitaLiquida)}, EBITDA ${brl(dre.ebitda)} e lucro líquido ${brl(dre.lucroLiquido)}.`}
        rotulo="IA da DRE"
      />
    </div>
  );
}
