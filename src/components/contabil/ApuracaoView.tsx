import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle, ArrowUpRight, CheckCircle2, FileDown, History, Lock, Plus,
  RefreshCw, Search, ShieldCheck, Trash2, Unlock, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Badge, Button, Card, CardContent, Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Sheet, SheetContent, SheetHeader, SheetTitle, Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow, Tabs, TabsContent, TabsList, TabsTrigger, Textarea,
} from "@/design-system/mj-design-system-db98fa";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import AvisoRegime from "@/components/contabil/AvisoRegime";
import { regimeDefinido } from "@/lib/regime";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import AssistenteCampos from "@/components/contabil/AssistenteCampos";
import {
  apurar, novoId, rs, setEstado, useApuracaoEstado,
  type Ajuste, type LinhaDoc, type Memoria, type MotorSlug,
} from "@/lib/apuracaoStore";
import { moedaBR } from "@/lib/fiscalStore";
import { confirmarExclusao } from "@/lib/confirmar";
import { rotaDasGuiasDaApuracao } from "@/lib/rotasDados";
import { useAplicarContextoRotaDados } from "@/lib/useAplicarContextoRotaDados";

const TIPOS_AJUSTE: Ajuste["tipo"][] = [
  "Adição", "Exclusão", "Crédito extemporâneo", "Compensação", "Outros",
];

type ParametroDef = { key: string; label: string; ajuda: string; placeholder?: string };

export default function ApuracaoView({
  motor,
  titulo,
  descricao,
  icone: Icone,
  submodulos,
  parametros = [],
  regras,
}: {
  motor: MotorSlug;
  titulo: string;
  descricao: string;
  icone: LucideIcon;
  submodulos: string[];
  parametros?: ParametroDef[];
  regras: { se: string; entao: string; base: string }[];
}) {
  useAplicarContextoRotaDados();
  const navigate = useNavigate();
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const estado = useApuracaoEstado(motor, empresa?.id, competencia);

  const ap = useMemo(
    () => apurar(motor, empresa?.id ?? null, competencia, estado),
    [motor, empresa, competencia, estado],
  );

  const [query, setQuery] = useState("");
  const [detalhe, setDetalhe] = useState<{ titulo: string; memoria: Memoria; extras?: { label: string; valor: string }[] } | null>(null);
  const [ajusteOpen, setAjusteOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [paramOpen, setParamOpen] = useState(false);
  const [paramDraft, setParamDraft] = useState<Record<string, string>>(estado.parametros);

  const fechada = estado.status === "Fechada";

  const docsFiltrados = ap.documentos.filter((d) =>
    [d.documento, d.participante, d.cfop, d.natureza, d.origem, d.cst]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  function requerEmpresa() {
    if (!empresa) {
      toast.error("Selecione uma empresa no cabeçalho.");
      return true;
    }
    return false;
  }

  function salvarAjuste() {
    if (requerEmpresa() || !empresa) return;
    if (!draft.descricao || !draft.valor) {
      toast.error("Informe descrição e valor do ajuste.");
      return;
    }
    const ajuste: Ajuste = {
      id: draft.id || novoId("aj"),
      tipo: (draft.tipo as Ajuste["tipo"]) || "Adição",
      descricao: draft.descricao,
      valor: draft.valor,
      fundamento: draft.fundamento ?? "",
      criadoEm: new Date().toISOString(),
    };
    const outros = estado.ajustes.filter((a) => a.id !== ajuste.id);
    setEstado(motor, empresa.id, competencia, { ajustes: [ajuste, ...outros] }, {
      acao: draft.id ? "Ajuste alterado" : "Ajuste incluído",
      detalhe: `${ajuste.tipo} — ${ajuste.descricao} (R$ ${ajuste.valor})`,
    });
    setAjusteOpen(false);
    setDraft({});
    toast.success("Ajuste aplicado à apuração.");
  }

  function excluirAjuste(a: Ajuste) {
    if (!empresa) return;
    if (!confirmarExclusao(`o ajuste «${a.descricao}»`)) return;
    setEstado(
      motor, empresa.id, competencia,
      { ajustes: estado.ajustes.filter((x) => x.id !== a.id) },
      { acao: "Ajuste excluído", detalhe: `${a.tipo} — ${a.descricao}` },
    );
    toast.success("Ajuste removido.");
  }

  function fechar() {
    if (requerEmpresa() || !empresa) return;
    const criticas = ap.inconsistencias.filter((i) => i.gravidade === "crítica");
    if (criticas.length) {
      toast.error(`Resolva ${criticas.length} inconsistência(s) crítica(s) antes de fechar.`);
      return;
    }
    setEstado(motor, empresa.id, competencia, { status: "Fechada" }, {
      acao: "Competência fechada",
      detalhe: `Total apurado de ${rs(ap.totalImposto)} em ${formatCompetencia(competencia)}.`,
    });
    toast.success("Apuração fechada e travada para edição.");
  }

  function reabrir() {
    if (!empresa) return;
    setEstado(motor, empresa.id, competencia, { status: "Aberta" }, {
      acao: "Competência reaberta",
      detalhe: "Apuração liberada para novos ajustes.",
    });
    toast.info("Apuração reaberta.");
  }

  function recalcular() {
    if (requerEmpresa() || !empresa) return;
    setEstado(motor, empresa.id, competencia, { status: fechada ? "Fechada" : "Em conferência" }, {
      acao: "Recálculo executado",
      detalhe: `${ap.documentos.length} documento(s) processados — total ${rs(ap.totalImposto)}.`,
    });
    toast.success("Motor executado sobre os documentos da competência.");
  }

  function abrirGuiasGeradas() {
    if (requerEmpresa() || !empresa) return;
    const quantidade = ap.guias.filter((guia) => Number.isFinite(guia.valor) && guia.valor > 0.009).length;
    if (quantidade === 0) {
      toast.info("Esta apuração não gerou valores a recolher nesta competência.");
      return;
    }
    navigate(rotaDasGuiasDaApuracao(motor, { empresaId: empresa.id, competencia }));
    toast.success(`${quantidade} guia(s) calculada(s) a partir desta apuração. A emissão é apenas ilustrativa.`);
  }

  function salvarParametros() {
    if (requerEmpresa() || !empresa) return;
    setEstado(motor, empresa.id, competencia, { parametros: paramDraft }, {
      acao: "Parâmetros atualizados",
      detalhe: Object.entries(paramDraft).map(([k, v]) => `${k}=${v}`).join("; ") || "—",
    });
    setParamOpen(false);
    toast.success("Parâmetros aplicados ao motor.");
  }

  const abas = [
    "Resumo", "Documentos", "Cálculos", "Ajustes", "Retenções",
    "Obrigações", "Guias", "Auditoria", "Parâmetros",
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-brand-orange/10 p-3">
            <Icone className="h-6 w-6 text-brand-orange" />
          </div>
          <div>
            <h1 className="font-display text-3xl sm:text-4xl">{titulo}</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">{descricao}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="rounded-full">{formatCompetencia(competencia)}</Badge>
              <Badge variant="secondary" className="rounded-full">{empresa?.razao ?? "Nenhuma empresa"}</Badge>
              <Badge variant="secondary" className="rounded-full">
                {regimeDefinido(empresa?.regime) ? `Regime: ${ap.regime}` : `Regime não definido (usando ${ap.regime})`}
              </Badge>
              <Badge
                className={`rounded-full ${fechada ? "bg-success/15 text-success" : "bg-brand-orange/15 text-brand-orange"}`}
              >
                {estado.status}
              </Badge>
              <span>Responsável: {estado.responsavel}</span>
              <span>· Atualizado em {new Date(estado.atualizadoEm).toLocaleString("pt-BR")}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full" onClick={recalcular}>
            <RefreshCw className="h-4 w-4 mr-2" /> Recalcular
          </Button>
          {fechada ? (
            <Button variant="outline" className="rounded-full" onClick={reabrir}>
              <Unlock className="h-4 w-4 mr-2" /> Reabrir
            </Button>
          ) : (
            <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={fechar}>
              <Lock className="h-4 w-4 mr-2" /> Fechar apuração
            </Button>
          )}
        </div>
      </div>

      <AvisoRegime />

      {!empresa && (
        <Card className="rounded-2xl border-border/70">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Selecione uma empresa no cabeçalho para o motor processar os documentos da competência.
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ap.kpis.map((k) => (
          <Card
            key={k.label}
            className={`rounded-2xl border-border/70 ${k.destaque ? "bg-brand-orange/5 border-brand-orange/40" : ""}`}
          >
            <CardContent className="p-4">
              <div className="text-[11px] uppercase tracking-[0.08em] leading-tight break-words text-muted-foreground">{k.label}</div>
              <div className={`mt-1 font-display text-2xl ${k.destaque ? "text-brand-orange" : ""}`}>{k.valor}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="Resumo">
        <TabsList className="flex w-full flex-wrap justify-start gap-1 rounded-full">
          {abas.map((a) => (
            <TabsTrigger key={a} value={a} className="rounded-full text-xs">{a}</TabsTrigger>
          ))}
        </TabsList>

        {/* ------------------------------ RESUMO ---------------------------- */}
        <TabsContent value="Resumo" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="rounded-2xl border-border/70 lg:col-span-2">
              <CardContent className="p-5 space-y-3">
                <h2 className="font-display text-2xl">Resumo da apuração</h2>
                <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                  {ap.resumo.map((r) => (
                    <div key={r.label} className="flex items-baseline justify-between border-b border-border/50 py-1.5">
                      <span className="text-sm text-muted-foreground">{r.label}</span>
                      <span className="font-mono text-sm">{r.valor}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border/70">
              <CardContent className="p-5 space-y-3">
                <h2 className="font-display text-xl">Fluxo do motor</h2>
                <ol className="space-y-1.5 text-xs text-muted-foreground">
                  {[
                    "Receber documentos fiscais", "Validar status e competência", "Verificar CST e CFOP",
                    "Identificar natureza da receita", "Reconhecer o regime tributário", "Aplicar regras fiscais",
                    "Calcular créditos e débitos", "Aplicar retenções e benefícios", "Gerar memória de cálculo",
                    "Gerar guias e obrigações", "Fechar a competência",
                  ].map((p, i) => (
                    <li key={p} className="flex gap-2">
                      <span className="font-mono text-brand-orange">{String(i + 1).padStart(2, "0")}</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl border-border/70">
            <CardContent className="p-5 space-y-3">
              <h2 className="font-display text-xl">Inconsistências e pendências</h2>
              {ap.inconsistencias.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" /> Nenhuma inconsistência detectada nesta competência.
                </div>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {ap.inconsistencias.map((i) => (
                    <div key={i.id} className="flex items-start gap-3 rounded-xl border border-border/70 p-3">
                      <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${i.gravidade === "crítica" ? "text-destructive" : "text-brand-orange"}`} />
                      <div className="min-w-0">
                        <div className="text-sm">{i.titulo}</div>
                        <p className="text-xs text-muted-foreground">{i.detalhe}</p>
                        {i.destino && (
                          <Link to={i.destino} className="text-xs text-brand-orange hover:underline">
                            Abrir tela de origem
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/70">
            <CardContent className="p-5">
              <h2 className="font-display text-xl mb-2">Submódulos cobertos</h2>
              <div className="flex flex-wrap gap-2">
                {submodulos.map((s) => (
                  <Badge key={s} variant="secondary" className="rounded-full">{s}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------- DOCUMENTOS -------------------------- */}
        <TabsContent value="Documentos" className="mt-4 space-y-3">
          <Card className="rounded-2xl border-border/70">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar documento, participante, CFOP ou natureza..."
                    className="pl-9 rounded-full"
                  />
                </div>
                <Badge variant="secondary" className="rounded-full">{docsFiltrados.length} documento(s)</Badge>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {["Data", "Documento", "Participante", "Modelo", "CFOP", "CST", "Natureza", "Valor contábil", "Base", "Alíquota", "Crédito", "Débito", "Status", "Origem"].map((c) => (
                        <TableHead key={c} className="whitespace-nowrap text-xs">{c}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docsFiltrados.map((d) => (
                      <TableRow
                        key={`${d.origem}-${d.id}`}
                        className="cursor-pointer"
                        onClick={() => abrirDoc(d, setDetalhe)}
                      >
                        <TableCell className="font-mono text-xs whitespace-nowrap">{d.data}</TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap">{d.documento}</TableCell>
                        <TableCell className="text-xs max-w-[180px] truncate">{d.participante}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{d.modelo}</TableCell>
                        <TableCell className="font-mono text-xs">{d.cfop}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{d.cst}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{d.natureza}</TableCell>
                        <TableCell className="font-mono text-xs text-right">{moedaBR(d.contabil)}</TableCell>
                        <TableCell className="font-mono text-xs text-right">{moedaBR(d.base)}</TableCell>
                        <TableCell className="font-mono text-xs text-right">{d.aliquota}</TableCell>
                        <TableCell className="font-mono text-xs text-right">{moedaBR(d.credito)}</TableCell>
                        <TableCell className="font-mono text-xs text-right">{moedaBR(d.debito)}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="secondary"
                            className={`rounded-full text-[10px] ${d.status === "Considerado" ? "bg-success/15 text-success" : d.status === "Excluído" ? "bg-muted text-muted-foreground" : "bg-brand-orange/15 text-brand-orange"}`}
                          >
                            {d.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap text-muted-foreground">{d.origem}</TableCell>
                      </TableRow>
                    ))}
                    {!docsFiltrados.length && (
                      <TableRow>
                        <TableCell colSpan={14} className="py-10 text-center text-sm text-muted-foreground">
                          Nenhum documento processado nesta competência.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                Clique em qualquer linha para abrir a memória de cálculo e rastrear a origem de cada valor.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------------------- CÁLCULOS --------------------------- */}
        <TabsContent value="Cálculos" className="mt-4">
          <TabelaCalculos ap={ap} setDetalhe={setDetalhe} grupos={["Resultado", "Débito", "Crédito", "Exclusão", "Retenção"]} />
        </TabsContent>

        {/* ------------------------------ AJUSTES --------------------------- */}
        <TabsContent value="Ajustes" className="mt-4 space-y-3">
          <Card className="rounded-2xl border-border/70">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-xl">Ajustes da apuração</h2>
                <Button
                  className="rounded-full bg-brand-orange hover:bg-brand-orange/90"
                  disabled={fechada}
                  onClick={() => { setDraft({ tipo: "Adição" }); setAjusteOpen(true); }}
                >
                  <Plus className="h-4 w-4 mr-2" /> Novo ajuste
                </Button>
              </div>
              {estado.ajustes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum ajuste manual. Adições, exclusões, compensações e créditos extemporâneos entram aqui e alteram a base automaticamente.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Fundamento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-24" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estado.ajustes.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell><Badge variant="secondary" className="rounded-full text-[10px]">{a.tipo}</Badge></TableCell>
                        <TableCell className="text-sm">{a.descricao}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{a.fundamento || "—"}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{a.valor}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost" size="sm" className="rounded-full" disabled={fechada}
                            onClick={() => excluirAjuste(a)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------------------- RETENÇÕES -------------------------- */}
        <TabsContent value="Retenções" className="mt-4">
          <TabelaCalculos ap={ap} setDetalhe={setDetalhe} grupos={["Retenção", "Crédito"]} vazio="Nenhuma retenção nesta apuração." />
        </TabsContent>

        {/* ---------------------------- OBRIGAÇÕES -------------------------- */}
        <TabsContent value="Obrigações" className="mt-4">
          <Card className="rounded-2xl border-border/70">
            <CardContent className="p-5">
              <h2 className="font-display text-xl mb-3">Obrigações acessórias geradas</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Obrigação</TableHead>
                    <TableHead>Conteúdo</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ap.obrigacoes.map((o) => (
                    <TableRow key={o.nome}>
                      <TableCell className="text-sm">{o.nome}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{o.base}</TableCell>
                      <TableCell className="font-mono text-xs">{o.prazo}</TableCell>
                      <TableCell><Badge variant="secondary" className="rounded-full text-[10px]">{o.situacao}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------- GUIAS ---------------------------- */}
        <TabsContent value="Guias" className="mt-4">
          <Card className="rounded-2xl border-border/70">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl">Guias de recolhimento</h2>
                <Button
                  variant="outline" className="rounded-full"
                  onClick={abrirGuiasGeradas}
                >
                  <FileDown className="h-4 w-4 mr-2" /> Gerar guias
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guia</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ap.guias.map((g) => (
                    <TableRow key={g.nome}>
                      <TableCell className="text-sm">{g.nome}</TableCell>
                      <TableCell className="font-mono text-xs">{g.codigo}</TableCell>
                      <TableCell className="font-mono text-xs">{g.vencimento}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{rs(g.valor)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/40">
                    <TableCell colSpan={3} className="text-sm font-medium">Total da competência</TableCell>
                    <TableCell className="text-right font-mono text-sm">{rs(ap.guias.reduce((s, g) => s + g.valor, 0))}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------------------- AUDITORIA -------------------------- */}
        <TabsContent value="Auditoria" className="mt-4 space-y-4">
          <Card className="rounded-2xl border-border/70">
            <CardContent className="p-5 space-y-3">
              <h2 className="font-display text-xl">Regras aplicadas nesta competência</h2>
              <div className="space-y-2">
                {regras.map((r) => (
                  <div key={r.se} className="rounded-xl border border-border/70 p-3 text-xs">
                    <div><span className="font-mono text-brand-orange">SE</span> {r.se}</div>
                    <div><span className="font-mono text-brand-orange">ENTÃO</span> {r.entao}</div>
                    <div className="mt-1 text-muted-foreground">{r.base}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/70">
            <CardContent className="p-5 space-y-3">
              <h2 className="font-display text-xl flex items-center gap-2">
                <History className="h-4 w-4 text-brand-orange" /> Log de auditoria
              </h2>
              {estado.log.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum evento registrado nesta competência.</p>
              ) : (
                <div className="space-y-2">
                  {estado.log.map((l) => (
                    <div key={l.id} className="rounded-xl border border-border/70 p-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="secondary" className="rounded-full text-[10px]">{l.acao}</Badge>
                        <span className="font-mono text-muted-foreground">{new Date(l.em).toLocaleString("pt-BR")}</span>
                        <span className="text-muted-foreground">· {l.usuario}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{l.detalhe}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------- PARÂMETROS -------------------------- */}
        <TabsContent value="Parâmetros" className="mt-4">
          <Card className="rounded-2xl border-border/70">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl">Parâmetros do motor</h2>
                <Button
                  className="rounded-full bg-brand-orange hover:bg-brand-orange/90"
                  disabled={fechada || !parametros.length}
                  onClick={() => { setParamDraft(estado.parametros); setParamOpen(true); }}
                >
                  Editar parâmetros
                </Button>
              </div>
              {parametros.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Este motor usa apenas os parâmetros da empresa (regime, atividade e alíquotas cadastradas).
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {parametros.map((p) => (
                    <div key={p.key} className="rounded-xl border border-border/70 p-3">
                      <div className="text-sm">{p.label}</div>
                      <div className="font-mono text-lg">{estado.parametros[p.key] || "—"}</div>
                      <p className="text-xs text-muted-foreground">{p.ajuda}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                {regimeDefinido(empresa?.regime) ? (
                  <>Regime reconhecido automaticamente pelo cadastro da empresa: <strong>{ap.regime}</strong>.</>
                ) : (
                  <>Regime <strong>não definido</strong> no cadastro da empresa — usando <strong>{ap.regime}</strong> por padrão.</>
                )}{" "}
                Altere em Preparativos › Cadastros › Empresas (lápis da empresa).
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* painel lateral da memória de cálculo */}
      <Sheet open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex flex-wrap items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand-orange" /> Memória de cálculo
            </SheetTitle>
          </SheetHeader>
          {detalhe && (
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <div className="text-[11px] uppercase tracking-[0.08em] leading-tight break-words text-muted-foreground">Origem</div>
                <div>{detalhe.titulo}</div>
              </div>
              {detalhe.extras?.length ? (
                <div className="grid grid-cols-2 gap-2">
                  {detalhe.extras.map((e) => (
                    <div key={e.label} className="rounded-xl border border-border/70 p-2">
                      <div className="text-[11px] text-muted-foreground">{e.label}</div>
                      <div className="font-mono text-sm">{e.valor}</div>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="rounded-xl border border-border/70 p-3 space-y-1">
                <div className="text-[11px] uppercase tracking-[0.08em] leading-tight break-words text-muted-foreground">Regra aplicada</div>
                <div className="text-xs">{detalhe.memoria.regra}</div>
              </div>
              <div className="rounded-xl border border-border/70 p-3 space-y-1">
                <div className="text-[11px] uppercase tracking-[0.08em] leading-tight break-words text-muted-foreground">Legislação</div>
                <div className="text-xs">{detalhe.memoria.legislacao}</div>
              </div>
              <div className="rounded-xl border border-border/70 p-3 space-y-1">
                <div className="text-[11px] uppercase tracking-[0.08em] leading-tight break-words text-muted-foreground">Fórmula</div>
                <div className="font-mono text-xs">{detalhe.memoria.formula}</div>
              </div>
              <div className="rounded-xl border border-border/70 p-3">
                <div className="text-[11px] uppercase tracking-[0.08em] leading-tight break-words text-muted-foreground mb-2">Passos</div>
                {detalhe.memoria.passos.map((p) => (
                  <div key={p.label} className="flex justify-between border-b border-border/40 py-1 text-xs">
                    <span className="text-muted-foreground">{p.label}</span>
                    <span className="font-mono">{p.valor}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <Badge variant="secondary" className="rounded-full">Versão da regra {detalhe.memoria.versaoRegra}</Badge>
                <Badge variant="secondary" className="rounded-full">{estado.responsavel}</Badge>
                <Badge variant="secondary" className="rounded-full">{new Date(estado.atualizadoEm).toLocaleString("pt-BR")}</Badge>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* diálogo de ajuste */}
      <Dialog open={ajusteOpen} onOpenChange={setAjusteOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Novo ajuste da apuração</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={draft.tipo ?? "Adição"} onValueChange={(v) => setDraft({ ...draft, tipo: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_AJUSTE.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Input
                  className="rounded-xl"
                  value={draft.descricao ?? ""}
                  onChange={(e) => setDraft({ ...draft, descricao: e.target.value })}
                  placeholder="Ex.: exclusão de receita monofásica"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input
                  className="rounded-xl font-mono"
                  value={draft.valor ?? ""}
                  onChange={(e) => setDraft({ ...draft, valor: e.target.value })}
                  placeholder="12.480,00"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fundamento legal</Label>
                <Textarea
                  className="rounded-xl"
                  value={draft.fundamento ?? ""}
                  onChange={(e) => setDraft({ ...draft, fundamento: e.target.value })}
                  placeholder="Ex.: Lei 10.147/2000 — produtos monofásicos"
                />
              </div>
            </div>
            <AssistenteCampos
              titulo={`Ajustes de ${titulo}`}
              campos={[
                { key: "tipo", label: "Tipo do ajuste", options: TIPOS_AJUSTE, ajuda: "Define se soma ou reduz a base de cálculo." },
                { key: "descricao", label: "Descrição", required: true, ajuda: "Identificação do ajuste na memória de cálculo." },
                { key: "valor", label: "Valor", required: true, ajuda: "Valor em reais que será aplicado à apuração." },
                { key: "fundamento", label: "Fundamento legal", ajuda: "Base legal que sustenta o ajuste em eventual fiscalização." },
              ]}
              draft={draft}
              contextoExtra={{ motor, competencia, regime: ap.regime }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setAjusteOpen(false)}>Cancelar</Button>
            <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={salvarAjuste}>Aplicar ajuste</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* diálogo de parâmetros */}
      <Dialog open={paramOpen} onOpenChange={setParamOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Parâmetros do motor</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              {parametros.map((p) => (
                <div key={p.key} className="space-y-1.5">
                  <Label>{p.label}</Label>
                  <Input
                    className="rounded-xl font-mono"
                    value={paramDraft[p.key] ?? ""}
                    placeholder={p.placeholder}
                    onChange={(e) => setParamDraft({ ...paramDraft, [p.key]: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">{p.ajuda}</p>
                </div>
              ))}
            </div>
            <AssistenteCampos
              titulo={`Parâmetros de ${titulo}`}
              campos={parametros.map((p) => ({ key: p.key, label: p.label, ajuda: p.ajuda }))}
              draft={paramDraft}
              contextoExtra={{ motor, competencia, regime: ap.regime }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setParamOpen(false)}>Cancelar</Button>
            <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={salvarParametros}>Salvar parâmetros</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssistenteFechamento
        rotulo="IA ajudante"
        resumo={`Apuração de ${titulo} em ${formatCompetencia(competencia)}: ${ap.documentos.length} documento(s), total de ${rs(ap.totalImposto)}.`}
        contexto={{
          motor,
          titulo,
          regime: ap.regime,
          competencia,
          empresa: empresa?.razao,
          status: estado.status,
          kpis: ap.kpis,
          resumo: ap.resumo,
          calculos: ap.calculos.map((c) => ({ descricao: c.descricao, valor: c.valor, regra: c.memoria.regra })),
          inconsistencias: ap.inconsistencias,
          guias: ap.guias,
        }}
      />
    </div>
  );
}

function abrirDoc(
  d: LinhaDoc,
  setDetalhe: (v: { titulo: string; memoria: Memoria; extras?: { label: string; valor: string }[] }) => void,
) {
  setDetalhe({
    titulo: `${d.modelo} ${d.documento} — ${d.participante}`,
    memoria: d.memoria,
    extras: [
      { label: "Data", valor: d.data },
      { label: "CFOP / CST", valor: `${d.cfop} / ${d.cst}` },
      { label: "Valor contábil", valor: rs(d.contabil) },
      { label: "Base de cálculo", valor: rs(d.base) },
      { label: "Crédito", valor: rs(d.credito) },
      { label: "Débito", valor: rs(d.debito) },
    ],
  });
}

function TabelaCalculos({
  ap, setDetalhe, grupos, vazio,
}: {
  ap: ReturnType<typeof apurar>;
  setDetalhe: (v: { titulo: string; memoria: Memoria; extras?: { label: string; valor: string }[] }) => void;
  grupos: string[];
  vazio?: string;
}) {
  const linhas = ap.calculos.filter((c) => grupos.includes(c.grupo));
  return (
    <Card className="rounded-2xl border-border/70">
      <CardContent className="p-5">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Linha de cálculo</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead className="text-right">Base</TableHead>
              <TableHead className="text-right">Alíquota</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((c) => (
              <TableRow
                key={c.id}
                className="cursor-pointer"
                onClick={() =>
                  setDetalhe({
                    titulo: c.descricao,
                    memoria: c.memoria,
                    extras: [
                      { label: "Base", valor: rs(c.base) },
                      { label: "Alíquota", valor: c.aliquota },
                      { label: "Valor", valor: rs(c.valor) },
                      { label: "Grupo", valor: c.grupo },
                    ],
                  })
                }
              >
                <TableCell className="text-sm">{c.descricao}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="rounded-full text-[10px]">{c.grupo}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-xs">{moedaBR(c.base)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{c.aliquota}</TableCell>
                <TableCell className="text-right font-mono text-sm">{moedaBR(c.valor)}</TableCell>
                <TableCell className="text-right"><ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" /></TableCell>
              </TableRow>
            ))}
            {!linhas.length && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  {vazio ?? "Sem linhas de cálculo nesta competência."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <p className="mt-2 text-xs text-muted-foreground">
          Clique em qualquer linha para abrir regra, legislação, fórmula e memória de cálculo.
        </p>
      </CardContent>
    </Card>
  );
}
