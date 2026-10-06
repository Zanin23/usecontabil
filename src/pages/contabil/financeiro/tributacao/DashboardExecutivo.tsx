import { useMemo } from "react";
import {
  Badge, Button, Card, CardContent, Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import { Link } from "react-router-dom";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ArrowRight, TrendingUp } from "lucide-react";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import {
  brl, documentosDaCompetencia, empresaDB, fechamentoAtual, regrasVigentes,
  resumoDocumentos, useTributario,
} from "@/lib/tributarioStore";

const CORES = ["#F97316", "#8B5CF6", "#EC4899", "#3B82F6", "#10B981", "#F59E0B"];

export default function DashboardExecutivo() {
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const empresaId = empresa?.id ?? "";

  const docs = useTributario(() => documentosDaCompetencia(empresaId, competencia), [empresaId, competencia]);
  const fech = useTributario(() => fechamentoAtual(empresaId, competencia), [empresaId, competencia]);
  const auditoria = useTributario(() => empresaDB(empresaId).auditoria.slice(0, 8), [empresaId]);
  const regras = useTributario(() => regrasVigentes(empresaId), [empresaId]);
  const r = resumoDocumentos(docs);

  const porTributo = useMemo(() => {
    const map = new Map<string, number>();
    docs.filter((d) => d.status === "Autorizado").forEach((d) =>
      d.memoria.forEach((m) => map.set(m.tributo, (map.get(m.tributo) ?? 0) + m.valor)),
    );
    return [...map.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
  }, [docs]);

  const porTipo = useMemo(() => {
    const map = new Map<string, { tipo: string; valor: number; qtd: number }>();
    docs.forEach((d) => {
      const cur = map.get(d.tipo) ?? { tipo: d.tipo, valor: 0, qtd: 0 };
      cur.valor += d.status === "Autorizado" ? d.valorTotal : 0;
      cur.qtd += 1;
      map.set(d.tipo, cur);
    });
    return [...map.values()].sort((a, b) => b.valor - a.valor);
  }, [docs]);

  const compliance = useMemo(() => {
    if (docs.length === 0) return 100;
    const problemas = docs.filter((d) => d.alertas.length > 0).length;
    return Math.max(0, Math.round(100 - (problemas / docs.length) * 100));
  }, [docs]);

  const kpis = [
    { label: "Faturamento", valor: brl(r.faturado), hint: `${r.autorizados} documentos autorizados` },
    { label: "Tributos apurados", valor: brl(r.tributos), hint: `Carga efetiva ${r.cargaEfetiva.toFixed(2)}%` },
    { label: "Retenções", valor: brl(r.retencoes), hint: "Federais e municipais" },
    { label: "Receita líquida", valor: brl(r.margem), hint: "Faturamento menos tributos" },
    { label: "Documentos pendentes", valor: String(r.pendentes), hint: "Rascunho, processando ou rejeitado" },
    { label: "Documentos cancelados", valor: String(r.cancelados), hint: "Cancelamentos na competência" },
    { label: "Compliance fiscal", valor: `${compliance}%`, hint: `${r.bloqueios} bloqueio(s) ativo(s)` },
    { label: "Competência", valor: fech.status, hint: `${fech.etapasConcluidas.length}/9 etapas concluídas` },
  ];

  const contexto = {
    tela: "Dashboard executivo",
    modulo: "Financeiro › Tributação",
    competencia: formatCompetencia(competencia),
    empresa: empresa ? { razao: empresa.razao, regime: empresa.regime } : null,
    indicadores: r,
    compliance,
    fechamento: fech,
    porTributo,
    regrasAtivas: regras.filter((x) => x.ativa).length,
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Financeiro › Tributação</div>
          <h1 className="font-display text-3xl sm:text-4xl">
            Painel <span className="text-brand-orange">tributário</span>
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Visão consolidada da operação tributária da competência: faturamento, carga fiscal,
            documentos, compliance e estágio do fechamento.
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary" className="rounded-full">{formatCompetencia(competencia)}</Badge>
            <Badge variant="secondary" className="rounded-full">{empresa?.razao ?? "Nenhuma empresa selecionada"}</Badge>
          </div>
        </div>
        <Button asChild className="rounded-lg bg-brand-orange hover:bg-brand-orange/90">
          <Link to="/financeiro/movimentos/conclusao-fiscal">Conclusão fiscal <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl shadow-card">
          <CardContent className="p-5">
            <div className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Composição dos tributos</div>
            {porTributo.length === 0 ? (
              <p className="py-14 text-center text-sm text-muted-foreground">
                Nenhum tributo apurado. Emita documentos em Movimentos para ver a composição.
              </p>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={porTributo} dataKey="valor" nameKey="nome" innerRadius={60} outerRadius={100} paddingAngle={2}>
                      {porTributo.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => brl(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {porTributo.map((t, i) => (
                <span key={t.nome} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]">
                  <span className="h-2 w-2 rounded-full" style={{ background: CORES[i % CORES.length] }} />
                  {t.nome} · {brl(t.valor)}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-card">
          <CardContent className="p-5">
            <div className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Faturamento por documento</div>
            {porTipo.length === 0 ? (
              <p className="py-14 text-center text-sm text-muted-foreground">Sem documentos na competência.</p>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porTipo}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                    <XAxis dataKey="tipo" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v: number) => brl(v)} />
                    <Tooltip formatter={(v: number) => brl(v)} />
                    <Bar dataKey="valor" fill="#F97316" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl shadow-card">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-brand-orange" /> Timeline da operação
          </div>
          {auditoria.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda para esta empresa.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Usuário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditoria.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{new Date(a.data).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-xs">{a.origem}</TableCell>
                    <TableCell className="text-xs">{a.acao}</TableCell>
                    <TableCell className="font-mono text-xs">{a.documento ?? "—"}</TableCell>
                    <TableCell className="text-xs">{a.usuario}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AssistenteFechamento contexto={contexto} resumo={`Dashboard executivo — ${brl(r.faturado)} faturados`} rotulo="IA ajudante" />
    </div>
  );
}
