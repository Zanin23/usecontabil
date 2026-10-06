import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Search, type LucideIcon } from "lucide-react";
import {
  Badge, Button, Card, CardContent, Input, Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import InconsistenciaPainel from "@/components/contabil/InconsistenciaPainel";
import {
  CATEGORIAS, CORES, CRITICIDADES, SITUACOES, brlAud, expressaoDe, logAuditoria,
  reprocessar, resumoAchados, useAuditoria, useRegras,
  type AchadoResolvido, type CatSlug,
} from "@/lib/auditoriaStore";

function Indicador({ label, valor, hint, destaque }: { label: string; valor: string; hint?: string; destaque?: boolean }) {
  return (
    <div className={`min-w-0 rounded-2xl border p-3 ${destaque ? "border-destructive/40 bg-destructive/5" : "border-border/70"}`}>
      <div className="text-[10px] uppercase leading-tight tracking-[0.06em] break-words text-muted-foreground">{label}</div>
      <div className={`mt-0.5 break-words font-mono text-sm ${destaque ? "text-destructive" : ""}`}>{valor}</div>
      {hint && <div className="text-[10px] break-words text-muted-foreground">{hint}</div>}
    </div>
  );
}

export default function CategoriaAuditoriaView({
  slug,
  icone: Icone,
  titulo,
}: {
  slug: CatSlug;
  icone: LucideIcon;
  /** Nome da tela exibido no h1; quando ausente, usa o título da categoria. */
  titulo?: string;
}) {
  const navigate = useNavigate();
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const todos = useAuditoria(empresa?.id, competencia);
  const catalogo = useRegras().filter((x) => x.grupo === slug);
  const meta = CATEGORIAS.find((c) => c.slug === slug)!;

  const [busca, setBusca] = useState("");
  const [crit, setCrit] = useState("todas");
  const [sit, setSit] = useState("todas");
  const [aberto, setAberto] = useState<AchadoResolvido | null>(null);

  const achados = useMemo(
    () => todos.filter((a) => a.grupo === slug),
    [todos, slug],
  );

  const filtrados = useMemo(
    () =>
      achados.filter(
        (a) =>
          (crit === "todas" || a.criticidade === crit) &&
          (sit === "todas" || a.situacao === sit) &&
          (busca.trim() === "" ||
            `${a.documento} ${a.participante} ${a.regra} ${a.regraId} ${a.tributo}`
              .toLowerCase()
              .includes(busca.toLowerCase())),
      ),
    [achados, crit, sit, busca],
  );

  const r = resumoAchados(achados);
  const log = logAuditoria().slice(0, 20);

  const indicadoresPorSlug: Record<CatSlug, { label: string; valor: string; destaque?: boolean }[]> = {
    "xml-escrituracao": [
      { label: "XML importados", valor: String(achados.length ? new Set(achados.map((a) => a.documento)).size : 0) },
      { label: "XML não escriturados", valor: String(achados.filter((a) => a.regraId === "AUD-XML-001").length), destaque: true },
      { label: "Escrituração sem XML", valor: String(achados.filter((a) => a.regraId === "AUD-XML-002").length) },
      { label: "Documentos divergentes", valor: String(achados.filter((a) => a.regraId.startsWith("AUD-XML-00") && ["6", "7", "8"].includes(a.regraId.slice(-1))).length) },
      { label: "Cancelados", valor: String(achados.filter((a) => a.regraId === "AUD-XML-004").length) },
      { label: "Denegados", valor: String(achados.filter((a) => a.regraId === "AUD-XML-005").length) },
      { label: "Duplicidades", valor: String(achados.filter((a) => a.regraId === "AUD-XML-011").length) },
      { label: "Pendências", valor: String(r.abertos), destaque: r.abertos > 0 },
    ],
    classificacao: [
      { label: "Classificações incorretas", valor: String(achados.length) },
      { label: "CFOP incompatíveis", valor: String(achados.filter((a) => a.regraId === "AUD-CLS-002").length), destaque: true },
      { label: "NCM inválidos", valor: String(achados.filter((a) => a.regraId === "AUD-CLS-001").length) },
      { label: "CST inconsistentes", valor: String(achados.filter((a) => ["AUD-CLS-004", "AUD-CLS-005"].includes(a.regraId)).length) },
      { label: "CEST ausentes", valor: String(achados.filter((a) => a.regraId === "AUD-CLS-003").length) },
      { label: "Sem tributação definida", valor: String(achados.filter((a) => a.regraId === "AUD-CLS-010").length) },
      { label: "Benefícios sem fundamento", valor: String(achados.filter((a) => a.regraId === "AUD-CLS-007").length) },
      { label: "Valor envolvido", valor: brlAud(r.valorEmRisco) },
    ],
    creditos: [],
    certidoes: [],
  };

  function executar() {
    if (!empresa) return toast.error("Selecione uma empresa para auditar.");
    reprocessar(empresa.id, competencia, `Auditoria de ${meta.titulo}`);
    toast.success("Auditoria reprocessada com as regras vigentes.");
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Auditoria fiscal</div>
          <h1 className="flex items-center gap-2 font-display text-3xl sm:text-4xl">
            <Icone className="h-7 w-7 text-brand-orange" /> {titulo ?? meta.titulo}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{titulo ? `${meta.titulo} — ${meta.descricao}` : meta.descricao}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary" className="rounded-full">{formatCompetencia(competencia)}</Badge>
            <Badge variant="secondary" className="rounded-full">{empresa?.razao ?? "Nenhuma empresa selecionada"}</Badge>
            <Badge variant="secondary" className="rounded-full">Score {r.score}/100</Badge>
          </div>
        </div>
        <Button className="rounded-lg bg-brand-orange hover:bg-brand-orange/90" onClick={executar}>
          <RefreshCw className="mr-1.5 h-4 w-4" /> Executar auditoria
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-8">
        {indicadoresPorSlug[slug].map((i) => <Indicador key={i.label} {...i} />)}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {meta.submodulos.map((s) => (
          <Badge key={s} variant="secondary" className="rounded-full text-[10px]">{s}</Badge>
        ))}
      </div>

      <Tabs defaultValue="inconsistencias">
        <TabsList className="flex w-full flex-wrap justify-start rounded-full">
          <TabsTrigger className="rounded-full" value="inconsistencias">Inconsistências</TabsTrigger>
          <TabsTrigger className="rounded-full" value="regras">Regras aplicadas</TabsTrigger>
          <TabsTrigger className="rounded-full" value="criticidade">Criticidade</TabsTrigger>
          <TabsTrigger className="rounded-full" value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="inconsistencias" className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="rounded-full pl-9"
                placeholder="Buscar documento, fornecedor, regra ou tributo"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <Select value={crit} onValueChange={setCrit}>
              <SelectTrigger className="w-[170px] rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as criticidades</SelectItem>
                {CRITICIDADES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sit} onValueChange={setSit}>
              <SelectTrigger className="w-[160px] rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as situações</SelectItem>
                {SITUACOES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Card className="rounded-xl border-border/70">
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Participante</TableHead>
                    <TableHead>Regra</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-center">Criticidade</TableHead>
                    <TableHead className="text-right">Valor envolvido</TableHead>
                    <TableHead className="text-center">Situação</TableHead>
                    <TableHead>Responsável</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((a) => (
                    <TableRow key={a.id} className="cursor-pointer" onClick={() => setAberto(a)}>
                      <TableCell className="font-mono text-xs">{a.documento}</TableCell>
                      <TableCell className="text-sm">{a.participante}</TableCell>
                      <TableCell className="text-sm">
                        <span className="font-mono text-[10px] text-muted-foreground">{a.regraId}</span>
                        <div className="break-words">{a.regra}</div>
                      </TableCell>
                      <TableCell className="text-xs">{a.categoria}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={`rounded-full ${CORES[a.criticidade]}`}>{a.criticidade}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{brlAud(a.valor)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="rounded-full text-[10px]">{a.situacao}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{a.responsavel}</TableCell>
                    </TableRow>
                  ))}
                  {filtrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                        Nenhuma inconsistência nesta categoria para a competência selecionada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regras" className="mt-4">
          <Card className="rounded-xl border-border/70">
            <CardContent className="space-y-2 p-5">
              {catalogo.map((x) => {
                const ocorrencias = achados.filter((a) => a.regraId === x.id).length;
                return (
                  <div key={x.id} className="rounded-2xl border border-border/70 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10px] text-muted-foreground">{x.id}</span>
                          <span className="font-medium">{x.nome}</span>
                          <Badge className={`rounded-full ${CORES[x.criticidade]}`}>{x.criticidade}</Badge>
                          {!x.ativa && <Badge variant="secondary" className="rounded-full text-[10px]">inativa</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{x.descricao}</p>
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground break-words">SE {expressaoDe(x)}</p>
                      </div>
                      <Badge variant="secondary" className="rounded-full">{ocorrencias} ocorrência(s)</Badge>
                    </div>
                  </div>
                );
              })}
              <div className="pt-2">
                <Button variant="outline" className="rounded-full" onClick={() => navigate("/fiscal/auditoria/regras")}>
                  Abrir motor de regras
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="criticidade" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {CRITICIDADES.map((c) => {
              const qtd = achados.filter((a) => a.criticidade === c).length;
              const valor = achados.filter((a) => a.criticidade === c).reduce((s, a) => s + a.valor, 0);
              return (
                <Card key={c} className="rounded-xl border-border/70">
                  <CardContent className="space-y-1 p-5">
                    <Badge className={`rounded-full ${CORES[c]}`}>{c}</Badge>
                    <div className="font-display text-3xl">{qtd}</div>
                    <div className="font-mono text-xs text-muted-foreground">{brlAud(valor)}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <Card className="rounded-xl border-border/70">
            <CardContent className="space-y-2 p-5">
              {log.map((l) => (
                <div key={l.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 p-3 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">
                    {new Date(l.data).toLocaleString("pt-BR")}
                  </span>
                  <Badge variant="secondary" className="rounded-full text-[10px]">{l.acao}</Badge>
                  <span className="min-w-0 flex-1 break-words">{l.detalhe}</span>
                  <span className="text-xs text-muted-foreground">{l.usuario}</span>
                </div>
              ))}
              {log.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <InconsistenciaPainel
        achado={aberto}
        onFechar={() => setAberto(null)}
        onReprocessar={executar}
      />

      <AssistenteFechamento
        rotulo="IA ajudante"
        resumo={`Auditoria fiscal — ${meta.titulo}. ${r.total} achado(s), sendo ${r.criticos} crítico(s) e ${r.abertos} em aberto. Score de conformidade ${r.score}/100.`}
        contexto={{
          modulo: "Auditoria fiscal",
          categoria: meta.titulo,
          empresa: empresa?.razao,
          competencia,
          resumo: r,
          regras: catalogo.map((x) => ({ id: x.id, nome: x.nome, criticidade: x.criticidade, legislacao: x.legislacao })),
          achados: achados.slice(0, 25).map((a) => ({
            regra: a.regra, documento: a.documento, criticidade: a.criticidade,
            situacao: a.situacao, sugestao: a.sugestao,
          })),
        }}
      />
    </div>
  );
}
