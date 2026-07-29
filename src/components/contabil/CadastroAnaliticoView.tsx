import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, ChevronRight, Lock, RefreshCw, Search, ShieldCheck, X,
} from "lucide-react";
import {
  Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Badge, Button, Card, CardContent, Input, Progress, ScrollArea, Select, SelectContent,
  SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetDescription, SheetHeader,
  SheetTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent,
  TabsList, TabsTrigger,
} from "@/design-system/mj-design-system-db98fa";
import ExportarMenu from "@/components/contabil/ExportarMenu";
import {
  CORES_CRIT, READ_ONLY_MSG, agrupar, auditarDominio, brl, qualidadeCadastral,
  somaPor, totalCampo, useDominioFiltrado, useRegistrarAcesso,
  type Campo, type Dominio, type Registro,
} from "@/lib/adminStore";

const CORES = ["var(--brand-orange)", "var(--brand-purple)", "var(--brand-blue)", "var(--brand-pink)", "hsl(var(--muted-foreground))"];

function Kpi({ label, valor, hint }: { label: string; valor: string; hint?: string }) {
  return (
    <Card className="rounded-3xl border-border/70">
      <CardContent className="space-y-1 p-5">
        <div className="text-[10px] uppercase leading-tight tracking-[0.08em] text-muted-foreground break-words">{label}</div>
        <div className="font-display text-3xl break-words">{valor}</div>
        {hint && <div className="text-xs text-muted-foreground break-words">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function celula(d: Dominio, r: Registro, key: string) {
  const campo = d.campos.find((c) => c.key === key);
  const v = r[key];
  if (v === "" || v === null || v === undefined) return <span className="text-muted-foreground">—</span>;
  if (campo?.tipo === "moeda") return brl(Number(v));
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (campo?.tipo === "status" || key === "status") {
    const s = String(v);
    const tom = s.startsWith("Ativ") ? "bg-brand-blue/15 text-brand-blue"
      : s.startsWith("Inativ") ? "bg-muted text-muted-foreground"
      : "bg-destructive/15 text-destructive";
    return <Badge className={`rounded-full border-0 ${tom}`}>{s}</Badge>;
  }
  return String(v);
}

/** Tela analítica genérica, 100% somente leitura, para um domínio cadastral. */
export default function CadastroAnaliticoView({ dominio }: { dominio: Dominio }) {
  useRegistrarAcesso(`Administrativo · ${dominio.titulo}`);
  const [busca, setBusca] = useState("");
  const [facetas, setFacetas] = useState<Record<string, string>>({});
  const [detalhe, setDetalhe] = useState<Registro | null>(null);
  const [relatorio, setRelatorio] = useState<string | null>(null);

  const filtrados = useDominioFiltrado(dominio, busca, facetas);
  const achados = useMemo(() => auditarDominio(dominio), [dominio]);
  const qualidade = qualidadeCadastral(achados, dominio.registros.length);

  const opcoes = useMemo(
    () => Object.fromEntries(dominio.facetas.map((f) => [f.key, agrupar(dominio.registros, f.key).map((x) => x.nome)])),
    [dominio],
  );

  const colunasExport = dominio.campos.map((c) => ({ key: c.key, label: c.label }));
  const ativos = dominio.registros.filter((r) => String(r.status ?? "").startsWith("Ativ")).length;
  const inativos = dominio.registros.filter((r) => String(r.status ?? "").startsWith("Inativ")).length;
  const bloqueados = dominio.registros.filter((r) => String(r.status ?? "") === "Bloqueado").length;

  const valorKey = dominio.slug === "clientes" ? "faturamento"
    : dominio.slug === "fornecedores" ? "compras"
    : dominio.slug === "bancos" ? "saldo"
    : dominio.slug === "produtos-servicos" ? "preco" : "";
  const totalValor = valorKey ? totalCampo(dominio.registros, valorKey) : 0;

  const facetaPrincipal = dominio.facetas[1]?.key ?? dominio.facetas[0].key;
  const distribuicao = agrupar(dominio.registros, facetaPrincipal).slice(0, 10);
  const distribuicao2 = agrupar(dominio.registros, dominio.facetas[dominio.facetas.length - 1].key).slice(0, 6);
  const topValor = valorKey ? somaPor(dominio.registros, dominio.rotulo, valorKey, 7) : [];

  const relSelecionado = dominio.relatorios.find((r) => r.slug === relatorio);
  const relLinhas = relSelecionado ? dominio.registros.filter(relSelecionado.filtro) : [];
  const relAgrupado = relSelecionado?.agrupar ? agrupar(relLinhas, relSelecionado.agrupar) : null;

  const grupos = [...new Set(dominio.campos.map((c) => c.grupo))];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Administrativo · Cadastros analíticos
          </div>
          <h1 className="mt-2 font-display text-4xl">{dominio.titulo}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{dominio.desc}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="rounded-full border-0 bg-muted text-muted-foreground">
            <Lock className="mr-1 h-3 w-3" /> Somente leitura
          </Badge>
          <ExportarMenu nome={`${dominio.titulo}`} colunas={colunasExport} linhas={filtrados} />
        </div>
      </div>

      <Card className="rounded-3xl border-border/70 bg-muted/30">
        <CardContent className="flex flex-wrap items-center gap-3 p-4 text-xs text-muted-foreground">
          <RefreshCw className="h-4 w-4 shrink-0 text-brand-orange" />
          <span>Sincronizado de <strong className="text-foreground">{dominio.sistemaOrigem}</strong> em {dominio.sincronizadoEm}.</span>
          <span className="break-words">{READ_ONLY_MSG}</span>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Registros sincronizados" valor={String(dominio.registros.length)} hint={`${filtrados.length} no filtro atual`} />
        <Kpi label="Ativos" valor={String(ativos)} hint={`${inativos} inativos · ${bloqueados} bloqueados`} />
        <Kpi
          label={valorKey ? (dominio.slug === "bancos" ? "Saldo consolidado" : "Volume 12 meses") : "Inconsistências"}
          valor={valorKey ? brl(totalValor) : String(achados.length)}
        />
        <Kpi label="Qualidade cadastral" valor={`${qualidade}%`} hint={`${achados.length} inconsistências`} />
      </div>

      <Tabs defaultValue="visao">
        <TabsList className="rounded-full">
          <TabsTrigger value="visao" className="rounded-full">Visão geral</TabsTrigger>
          <TabsTrigger value="registros" className="rounded-full">Registros</TabsTrigger>
          <TabsTrigger value="relatorios" className="rounded-full">Relatórios</TabsTrigger>
          <TabsTrigger value="auditoria" className="rounded-full">Auditoria</TabsTrigger>
        </TabsList>

        {/* ------------------------------ visão ------------------------------ */}
        <TabsContent value="visao" className="mt-6 space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-3xl border-border/70">
              <CardContent className="p-5">
                <div className="mb-4 text-sm font-medium">
                  Distribuição por {dominio.facetas.find((f) => f.key === facetaPrincipal)?.label}
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distribuicao} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="nome" type="category" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
                      <Bar dataKey="total" radius={[0, 8, 8, 0]} fill="var(--brand-orange)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border/70">
              <CardContent className="p-5">
                <div className="mb-4 text-sm font-medium">
                  Composição por {dominio.facetas[dominio.facetas.length - 1].label}
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={distribuicao2} dataKey="total" nameKey="nome" innerRadius={50} outerRadius={90} paddingAngle={2}>
                        {distribuicao2.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {distribuicao2.map((d, i) => (
                    <span key={d.nome} className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="h-2 w-2 rounded-full" style={{ background: CORES[i % CORES.length] }} />
                      {d.nome} · {d.total}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {!!topValor.length && (
            <Card className="rounded-3xl border-border/70">
              <CardContent className="p-5">
                <div className="mb-4 text-sm font-medium">
                  {dominio.slug === "bancos" ? "Saldo por conta" : "Top registros por volume financeiro"}
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topValor} margin={{ left: 8, right: 8 }}>
                      <XAxis dataKey="nome" tick={{ fontSize: 10 }} interval={0} height={60} angle={-18} textAnchor="end" />
                      <YAxis tick={{ fontSize: 10 }} width={70} />
                      <Tooltip formatter={(v) => brl(Number(v))} cursor={{ fill: "hsl(var(--muted))" }} />
                      <Bar dataKey="total" radius={[8, 8, 0, 0]} fill="var(--brand-purple)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ---------------------------- registros ---------------------------- */}
        <TabsContent value="registros" className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Pesquisar por nome, código, documento…"
                className="rounded-full pl-9"
              />
            </div>
            {dominio.facetas.map((f) => (
              <Select
                key={f.key}
                value={facetas[f.key] ?? "todos"}
                onValueChange={(v) => setFacetas((s) => ({ ...s, [f.key]: v }))}
              >
                <SelectTrigger className="w-[170px] rounded-full">
                  <SelectValue placeholder={f.label} />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="todos">{f.label}: todos</SelectItem>
                  {(opcoes[f.key] ?? []).map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
            {(busca || Object.values(facetas).some((v) => v && v !== "todos")) && (
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => { setBusca(""); setFacetas({}); }}>
                <X className="h-4 w-4" /> Limpar
              </Button>
            )}
          </div>

          <Card className="rounded-3xl border-border/70">
            <CardContent className="p-0">
              <ScrollArea className="max-h-[560px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {dominio.colunas.map((c) => (
                        <TableHead key={c} className="whitespace-nowrap">
                          {dominio.campos.find((f) => f.key === c)?.label ?? c}
                        </TableHead>
                      ))}
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtrados.map((r, i) => (
                      <TableRow key={`${r[dominio.chave]}-${i}`} className="cursor-pointer" onClick={() => setDetalhe(r)}>
                        {dominio.colunas.map((c) => (
                          <TableCell key={c} className="whitespace-nowrap text-sm">{celula(dominio, r, c)}</TableCell>
                        ))}
                        <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                      </TableRow>
                    ))}
                    {!filtrados.length && (
                      <TableRow>
                        <TableCell colSpan={dominio.colunas.length + 1} className="py-10 text-center text-sm text-muted-foreground">
                          Nenhum registro encontrado para os filtros aplicados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------- relatórios --------------------------- */}
        <TabsContent value="relatorios" className="mt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {dominio.relatorios.map((rel) => {
              const total = dominio.registros.filter(rel.filtro).length;
              const ativo = relatorio === rel.slug;
              return (
                <button
                  key={rel.slug}
                  onClick={() => setRelatorio(ativo ? null : rel.slug)}
                  className={`rounded-3xl border p-4 text-left transition-colors ${ativo ? "border-brand-orange bg-brand-orange/5" : "border-border/70 hover:bg-muted/50"}`}
                >
                  <div className="text-sm font-medium">{rel.titulo}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{rel.desc}</div>
                  <div className="mt-3 font-display text-2xl text-brand-orange">{total}</div>
                </button>
              );
            })}
          </div>

          {relSelecionado && (
            <Card className="rounded-3xl border-border/70">
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{relSelecionado.titulo}</div>
                    <div className="text-xs text-muted-foreground">{relLinhas.length} registros · {dominio.sistemaOrigem}</div>
                  </div>
                  <ExportarMenu nome={`${dominio.titulo} — ${relSelecionado.titulo}`} colunas={colunasExport} linhas={relLinhas} />
                </div>

                {relAgrupado ? (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {relAgrupado.map((g) => (
                      <div key={g.nome} className="flex items-center justify-between rounded-2xl border border-border/70 px-4 py-3 text-sm">
                        <span className="truncate">{g.nome}</span>
                        <span className="font-mono text-brand-orange">{g.total}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <ScrollArea className="max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {dominio.colunas.map((c) => (
                            <TableHead key={c} className="whitespace-nowrap">
                              {dominio.campos.find((f) => f.key === c)?.label ?? c}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {relLinhas.map((r, i) => (
                          <TableRow key={i} className="cursor-pointer" onClick={() => setDetalhe(r)}>
                            {dominio.colunas.map((c) => (
                              <TableCell key={c} className="whitespace-nowrap text-sm">{celula(dominio, r, c)}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ---------------------------- auditoria ---------------------------- */}
        <TabsContent value="auditoria" className="mt-6 space-y-4">
          <Card className="rounded-3xl border-border/70">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Índice de qualidade cadastral</span>
                <span className="font-display text-2xl text-brand-orange">{qualidade}%</span>
              </div>
              <Progress value={qualidade} />
              <div className="flex flex-wrap gap-2 pt-1">
                {dominio.regras.map((regra) => {
                  const n = achados.filter((a) => a.regra === regra.slug).length;
                  return (
                    <Badge key={regra.slug} className="rounded-full border-0 bg-muted text-muted-foreground">
                      <span className="mr-1 h-2 w-2 rounded-full" style={{ background: CORES_CRIT[regra.criticidade] }} />
                      {regra.titulo}: {n}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/70">
            <CardContent className="space-y-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {achados.length ? <AlertTriangle className="h-4 w-4 text-brand-orange" /> : <ShieldCheck className="h-4 w-4 text-brand-blue" />}
                  {achados.length} inconsistências detectadas
                </div>
                <ExportarMenu
                  nome={`Auditoria — ${dominio.titulo}`}
                  colunas={[
                    { key: "cadastro", label: "Cadastro" }, { key: "titulo", label: "Inconsistência" },
                    { key: "criticidade", label: "Criticidade" }, { key: "campo", label: "Campo" },
                    { key: "sugestao", label: "Sugestão" }, { key: "origem", label: "Sistema de origem" },
                  ]}
                  linhas={achados as unknown as Registro[]}
                />
              </div>
              <ScrollArea className="max-h-[520px]">
                <div className="space-y-2 pr-2">
                  {achados.map((a) => (
                    <div key={a.id} className="rounded-2xl border border-border/70 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: CORES_CRIT[a.criticidade] }} />
                        <span className="text-sm font-medium">{a.titulo}</span>
                        <Badge className="rounded-full border-0 bg-muted text-muted-foreground">{a.criticidade}</Badge>
                        <span className="text-xs text-muted-foreground">campo: {a.campo}</span>
                      </div>
                      <div className="mt-1 text-sm">{a.cadastro} <span className="text-muted-foreground">· {a.chave}</span></div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Sugestão: {a.sugestao} · Origem: {a.origem}
                      </div>
                    </div>
                  ))}
                  {!achados.length && (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      Nenhuma inconsistência encontrada neste domínio.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* -------------------------- painel lateral -------------------------- */}
      <Sheet open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {detalhe && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-2xl">
                  {String(detalhe[dominio.rotulo] ?? detalhe[dominio.chave])}
                </SheetTitle>
                <SheetDescription>
                  {dominio.titulo} · {String(detalhe[dominio.chave])} · somente leitura
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 rounded-2xl border border-border/70 bg-muted/40 p-3 text-xs text-muted-foreground">
                <Lock className="mr-1 inline h-3 w-3" /> {READ_ONLY_MSG}
              </div>

              <div className="mt-6 space-y-6">
                {grupos.map((g) => (
                  <div key={g}>
                    <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">{g}</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {dominio.campos.filter((c: Campo) => c.grupo === g).map((c) => (
                        <div key={c.key} className="rounded-2xl border border-border/70 p-3">
                          <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{c.label}</div>
                          <div className="mt-1 break-words text-sm">{celula(dominio, detalhe, c.key)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div>
                  <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">Auditoria do registro</div>
                  <div className="space-y-2">
                    {achados.filter((a) => a.chave === String(detalhe[dominio.chave])).map((a) => (
                      <div key={a.id} className="rounded-2xl border border-border/70 p-3 text-sm">
                        <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: CORES_CRIT[a.criticidade] }} />
                        {a.titulo}
                        <div className="mt-1 text-xs text-muted-foreground">{a.sugestao}</div>
                      </div>
                    ))}
                    {!achados.some((a) => a.chave === String(detalhe[dominio.chave])) && (
                      <div className="text-sm text-muted-foreground">Sem inconsistências para este cadastro.</div>
                    )}
                  </div>
                </div>

                <Link
                  to="/administrativo/auditoria"
                  className="inline-flex items-center gap-1 text-sm text-brand-orange hover:underline"
                >
                  Ver auditoria consolidada <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
