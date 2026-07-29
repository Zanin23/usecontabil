import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, ArrowUpRight, CalendarClock, CheckCircle2, Circle, Download, FileSignature,
  FileText, Loader2, Play, RefreshCw, Search, Send, ShieldCheck, Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  Badge, Button, Card, CardContent, Input, Label, Progress, Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, Table, TableBody,
  TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/design-system/mj-design-system-db98fa";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import { useFiliais } from "@/lib/filiaisStore";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import RegistrosSped from "@/components/contabil/RegistrosSped";
import {
  assinarArquivo, concluirTransmissao, defDe, ETAPAS, gerarArquivo, gerarObrigacao, setObrEstado,
  transmitir, useObrEstado, validarPva, vencimentoBR, diasRestantes,
  type BlocoSped, type ObrSlug, type RegistroSped, type Validacao,
} from "@/lib/obrigacoesStore";

const CORES_STATUS: Record<string, string> = {
  Transmitida: "bg-success/15 text-success",
  "Em processamento": "bg-brand-blue/15 text-brand-blue",
  Rejeitada: "bg-destructive/15 text-destructive",
  "Com inconsistências": "bg-destructive/15 text-destructive",
};

function corStatus(status: string) {
  return CORES_STATUS[status] ?? "bg-brand-orange/15 text-brand-orange";
}

function corValidacao(tipo: Validacao["tipo"]) {
  if (tipo === "erro") return "bg-destructive/15 text-destructive";
  if (tipo === "advertência") return "bg-brand-orange/15 text-brand-orange";
  return "bg-muted text-muted-foreground";
}

export default function ObrigacaoView({ obr }: { obr: ObrSlug }) {
  const def = defDe(obr);
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const estado = useObrEstado(obr, empresa?.id, competencia);
  const filiais = useFiliais().filiais.filter((f) => !empresa || f.empresaId === empresa.id);

  const [filial, setFilial] = useState("todas");
  const [query, setQuery] = useState("");
  const [detalhe, setDetalhe] = useState<{ registro: RegistroSped; bloco: BlocoSped } | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);
  const [progresso, setProgresso] = useState(0);
  const timers = useRef<number[]>([]);

  const g = useMemo(
    () => gerarObrigacao(obr, empresa?.id ?? null, competencia, estado),
    [obr, empresa, competencia, estado],
  );

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const erros = g.validacoes.filter((v) => v.tipo === "erro");
  const advertencias = g.validacoes.filter((v) => v.tipo === "advertência");
  const pendencias = g.validacoes.filter((v) => v.tipo === "pendência");
  const ultimoArquivo = estado.arquivos[0];
  const ultimaTransmissao = estado.transmissoes[0];
  const dias = diasRestantes(obr, competencia);

  function exigeEmpresa() {
    if (!empresa) {
      toast.error("Selecione uma empresa no cabeçalho.");
      return true;
    }
    return false;
  }

  function simular(rotulo: string, duracao: number, fim: () => void) {
    setProcessando(rotulo);
    setProgresso(6);
    const passos = 10;
    for (let i = 1; i <= passos; i++) {
      timers.current.push(
        window.setTimeout(() => setProgresso(Math.round((i / passos) * 100)), (duracao / passos) * i),
      );
    }
    timers.current.push(
      window.setTimeout(() => {
        setProcessando(null);
        setProgresso(0);
        fim();
      }, duracao + 120),
    );
  }

  function acaoGerar() {
    if (exigeEmpresa() || !empresa) return;
    setObrEstado(obr, empresa.id, competencia, { status: "Em geração", etapa: 1 }, {
      acao: "Geração iniciada",
      detalhe: `Importação e validação dos dados de ${formatCompetencia(competencia)}.`,
    });
    simular("Gerando arquivo", 1_400, () => {
      const r = gerarArquivo(obr, empresa.id, competencia);
      if (!r.ok) toast.error(`${r.erros.length} erro(s) impedem a geração. Veja a aba Validações.`);
      else toast.success(`Arquivo ${r.arquivo.nome} gerado na versão ${r.arquivo.versao}.`);
    });
  }

  function acaoValidar() {
    if (exigeEmpresa() || !empresa) return;
    simular("Validando no PVA", 1_100, () => {
      const r = validarPva(obr, empresa.id, competencia);
      if (r.erros.length) toast.error(`PVA acusou ${r.erros.length} erro(s).`);
      else toast.success("Arquivo validado sem erros no PVA.");
    });
  }

  function acaoAssinar() {
    if (exigeEmpresa() || !empresa) return;
    if (!ultimoArquivo) {
      toast.error("Gere o arquivo antes de assinar.");
      return;
    }
    simular("Assinando com certificado", 900, () => {
      const r = assinarArquivo(obr, empresa.id, competencia, ultimoArquivo.id);
      if (!r.ok) toast.error(r.motivo);
      else toast.success(`Arquivo assinado com ${r.assinatura.certificado}.`);
    });
  }

  function acaoTransmitir() {
    if (exigeEmpresa() || !empresa) return;
    if (!ultimoArquivo) {
      toast.error("Gere o arquivo antes de transmitir.");
      return;
    }
    const r = transmitir(obr, empresa.id, competencia, ultimoArquivo.id);
    if (!r.ok) {
      toast.error(r.motivo);
      return;
    }
    const inicio = Date.now();
    simular("Transmitindo ao órgão", 2_000, () => {
      const p = concluirTransmissao(obr, empresa.id, competencia, r.transmissao.id, Date.now() - inicio);
      toast.success(`Protocolo ${p.protocolo} recebido.`);
    });
  }

  function baixar(nome: string) {
    toast.info(`Download simulado de ${nome} — ambiente interno, sem transmissão real.`);
  }

  return (
    <div className="space-y-6 pb-16">
      {/* cabeçalho */}
      <div className="space-y-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Fiscal › Obrigações acessórias
          </div>
          <h1 className="font-display text-3xl sm:text-4xl">
            {def.titulo.split(" ")[0]}{" "}
            <span className="text-brand-orange">{def.titulo.split(" ").slice(1).join(" ")}</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-3xl">{def.descricao}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary" className="rounded-full">{empresa?.razao ?? "Nenhuma empresa"}</Badge>
          <Badge variant="secondary" className="rounded-full">{formatCompetencia(competencia)}</Badge>
          <Badge variant="secondary" className="rounded-full">Layout {estado.versaoLayout || def.layoutVigente}</Badge>
          <Badge variant="secondary" className="rounded-full">{estado.responsavel}</Badge>
          <Badge className={`rounded-full ${corStatus(estado.status)}`}>{estado.status}</Badge>
          <Badge variant="secondary" className="rounded-full">
            Prazo {vencimentoBR(obr, competencia)} · {dias >= 0 ? `${dias} dia(s)` : `${Math.abs(dias)} dia(s) em atraso`}
          </Badge>
          <span className="text-muted-foreground">
            Atualizado em {new Date(estado.atualizadoEm).toLocaleString("pt-BR")}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={filial} onValueChange={setFilial}>
            <SelectTrigger className="h-9 w-56 rounded-full">
              <SelectValue placeholder="Estabelecimento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos os estabelecimentos</SelectItem>
              {filiais.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.nome} · {f.uf}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={acaoGerar} disabled={!!processando} className="rounded-full bg-brand-orange hover:bg-brand-orange/90">
            <Play className="h-4 w-4 mr-2" /> Gerar arquivo
          </Button>
          <Button onClick={acaoValidar} disabled={!!processando} variant="outline" className="rounded-full">
            <ShieldCheck className="h-4 w-4 mr-2" /> Validar no PVA
          </Button>
          <Button onClick={acaoAssinar} disabled={!!processando} variant="outline" className="rounded-full">
            <FileSignature className="h-4 w-4 mr-2" /> Assinar
          </Button>
          <Button onClick={acaoTransmitir} disabled={!!processando} variant="outline" className="rounded-full">
            <Send className="h-4 w-4 mr-2" /> Transmitir
          </Button>
        </div>

        {processando && (
          <Card className="rounded-2xl border-brand-orange/40">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-brand-orange" />
                {processando}…
              </div>
              <Progress value={progresso} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {g.kpis.map((k) => (
          <div
            key={k.label}
            className={`min-w-0 rounded-2xl border p-3 ${k.destaque ? "border-destructive/40 bg-destructive/5" : "border-border/70"}`}
          >
            <div className="text-[10px] uppercase tracking-[0.06em] leading-tight break-words text-muted-foreground">{k.label}</div>
            <div className={`mt-0.5 font-mono text-lg ${k.destaque ? "text-destructive" : ""}`}>{k.valor}</div>
          </div>
        ))}
      </div>

      {/* fluxo operacional */}
      <Card className="rounded-3xl border-border/70">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">Fluxo operacional</h2>
            <Badge variant="secondary" className="rounded-full">
              Etapa {Math.min(estado.etapa + 1, ETAPAS.length)} de {ETAPAS.length}
            </Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {ETAPAS.map((e, i) => {
              const feita = i < estado.etapa;
              const atual = i === estado.etapa;
              return (
                <div
                  key={e}
                  className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs ${
                    atual ? "border-brand-orange/50 bg-brand-orange/5" : "border-border/70"
                  }`}
                >
                  {feita ? (
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  ) : atual ? (
                    <Loader2 className={`h-4 w-4 text-brand-orange shrink-0 ${processando ? "animate-spin" : ""}`} />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="font-mono text-[10px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <span className="truncate">{e}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* abas */}
      <Tabs defaultValue="resumo">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1 rounded-2xl p-1">
          {[
            ["resumo", "Resumo"], ["dados", "Dados"], ["blocos", "Blocos"], ["registros", "Registros"],
            ["validacoes", "Validações"], ["pendencias", "Pendências"], ["advertencias", "Advertências"],
            ["transmissoes", "Transmissões"], ["protocolos", "Protocolos"], ["arquivos", "Arquivos"],
            ["auditoria", "Auditoria"], ["config", "Configurações"],
          ].map(([v, l]) => (
            <TabsTrigger key={v} value={v} className="rounded-full text-xs">{l}</TabsTrigger>
          ))}
        </TabsList>

        {/* Resumo */}
        <TabsContent value="resumo" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-3xl border-border/70">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-display text-xl">Resumo da obrigação</h3>
                {g.resumo.map((r) => (
                  <div key={r.label} className="flex items-center justify-between border-b border-border/50 pb-2 text-sm">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-mono">{r.valor}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1 text-sm">
                  <span className="text-muted-foreground">Órgão receptor</span>
                  <span className="font-mono">{def.orgao}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border/70">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-display text-xl">Cruzamentos inteligentes</h3>
                <p className="text-xs text-muted-foreground">
                  Conferência automática entre fiscal, contábil, apurações e documentos.
                </p>
                {g.cruzamentos.map((c) => (
                  <div key={c.id} className="rounded-xl border border-border/70 p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{c.origem}</span>
                      <Badge className={`rounded-full ${c.situacao === "Conferido" ? "bg-success/15 text-success" : "bg-brand-orange/15 text-brand-orange"}`}>
                        {c.situacao}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground truncate">× {c.destino}</div>
                    <div className="font-mono text-[11px]">
                      diferença R$ {Math.abs(c.diferenca).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-3xl border-border/70">
            <CardContent className="p-5 space-y-2">
              <h3 className="font-display text-xl">Submódulos</h3>
              <div className="flex flex-wrap gap-1.5">
                {def.submodulos.map((s) => (
                  <Badge key={s} variant="secondary" className="rounded-full text-[11px]">{s}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dados */}
        <TabsContent value="dados" className="mt-4">
          <Card className="rounded-3xl border-border/70">
            <CardContent className="p-5">
              <h3 className="font-display text-xl mb-3">Dados utilizados na geração</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fonte</TableHead>
                    <TableHead className="text-center">Registros</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {g.dados.map((d) => (
                    <TableRow key={d.fonte}>
                      <TableCell>{d.fonte}</TableCell>
                      <TableCell className="text-center font-mono">{d.registros}</TableCell>
                      <TableCell className="text-right font-mono">{d.valor}</TableCell>
                      <TableCell className="text-right">
                        <Link to={d.destino} className="text-brand-orange hover:underline inline-flex items-center gap-1 text-xs">
                          abrir <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Blocos */}
        <TabsContent value="blocos" className="mt-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {g.blocos.map((b) => (
              <Card key={b.codigo} className="rounded-2xl border-border/70">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs">Bloco {b.codigo}</span>
                    <Badge variant="secondary" className="rounded-full text-[10px]">
                      {b.obrigatorio ? "obrigatório" : "facultativo"}
                    </Badge>
                  </div>
                  <div className="text-sm">{b.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {b.registros.length} registro(s) ·{" "}
                    {b.registros.reduce((s, r) => s + Math.max(1, r.ocorrencias), 0)} linha(s)
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Registros */}
        <TabsContent value="registros" className="mt-4 space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrar registro (0150, C100, R-2010…)"
              className="rounded-full pl-9"
            />
          </div>
          <RegistrosSped blocos={g.blocos} filtro={query} onSelect={(registro, bloco) => setDetalhe({ registro, bloco })} />
          <p className="text-xs text-muted-foreground">
            Clique em um registro para abrir a memória de geração e rastrear a origem de cada valor.
          </p>
        </TabsContent>

        {/* Validações */}
        <TabsContent value="validacoes" className="mt-4">
          <ListaValidacoes itens={g.validacoes} vazio="Nenhuma validação retornou ocorrência." />
        </TabsContent>
        <TabsContent value="pendencias" className="mt-4">
          <ListaValidacoes itens={pendencias} vazio="Sem pendências de dados nesta competência." />
        </TabsContent>
        <TabsContent value="advertencias" className="mt-4">
          <ListaValidacoes itens={advertencias} vazio="Nenhuma advertência registrada." />
        </TabsContent>

        {/* Transmissões */}
        <TabsContent value="transmissoes" className="mt-4">
          <Card className="rounded-3xl border-border/70">
            <CardContent className="p-5">
              <h3 className="font-display text-xl mb-3">Histórico de transmissões</h3>
              {estado.transmissoes.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Envio</TableHead>
                      <TableHead className="text-center">Versão</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead className="text-right">Tempo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estado.transmissoes.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs">{new Date(t.em).toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-center font-mono">{t.versao}</TableCell>
                        <TableCell>
                          <Badge className={`rounded-full ${corStatus(t.situacao)}`}>{t.situacao}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{t.mensagem}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {t.tempoMs ? `${(t.tempoMs / 1000).toFixed(1)}s` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma transmissão realizada nesta competência.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Protocolos */}
        <TabsContent value="protocolos" className="mt-4">
          <Card className="rounded-3xl border-border/70">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-display text-xl">Protocolos e recibos</h3>
              {estado.transmissoes.filter((t) => t.protocolo).length ? (
                estado.transmissoes
                  .filter((t) => t.protocolo)
                  .map((t) => (
                    <div key={t.id} className="rounded-2xl border border-border/70 p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm text-brand-orange">{t.protocolo}</span>
                        <Button size="sm" variant="outline" className="rounded-full" onClick={() => baixar(`recibo ${t.recibo}`)}>
                          <Download className="h-3.5 w-3.5 mr-1.5" /> Recibo
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Recibo {t.recibo} · versão {t.versao} · {new Date(t.em).toLocaleString("pt-BR")}
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum protocolo recebido ainda.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Arquivos */}
        <TabsContent value="arquivos" className="mt-4 space-y-4">
          <Card className="rounded-3xl border-border/70">
            <CardContent className="p-5">
              <h3 className="font-display text-xl mb-3">Versões geradas</h3>
              {estado.arquivos.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Versão</TableHead>
                      <TableHead>Arquivo</TableHead>
                      <TableHead>Layout</TableHead>
                      <TableHead className="text-right">Linhas</TableHead>
                      <TableHead className="text-right">Tamanho</TableHead>
                      <TableHead>Assinatura</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estado.arquivos.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-center font-mono">{a.versao}</TableCell>
                        <TableCell className="font-mono text-xs">{a.nome}</TableCell>
                        <TableCell className="text-xs">{a.layout}</TableCell>
                        <TableCell className="text-right font-mono">{a.linhas.toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-right font-mono">{a.tamanhoKb} KB</TableCell>
                        <TableCell>
                          <Badge className={`rounded-full ${a.assinado ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                            {a.assinado ? "Assinado" : "Sem assinatura"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="rounded-full" onClick={() => baixar(a.nome)}>
                            <Download className="h-3.5 w-3.5 mr-1.5" /> {a.formato}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum arquivo gerado nesta competência.</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/70">
            <CardContent className="p-5 space-y-2">
              <h3 className="font-display text-xl">Assinaturas digitais</h3>
              {estado.assinaturas.length ? (
                estado.assinaturas.map((a) => (
                  <div key={a.id} className="rounded-xl border border-border/70 p-3 text-xs">
                    <div className="flex items-center gap-2">
                      <FileSignature className="h-3.5 w-3.5 text-brand-orange" />
                      <span>{a.certificado}</span>
                    </div>
                    <div className="text-muted-foreground mt-1">
                      Titular {a.titular} · validade {a.validade} · {new Date(a.em).toLocaleString("pt-BR")} por {a.usuario}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma assinatura. Os certificados vêm de{" "}
                  <Link to="/preparativos/empresa/certificados" className="text-brand-orange hover:underline">
                    Preparativos › Empresa › Certificados
                  </Link>.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Auditoria */}
        <TabsContent value="auditoria" className="mt-4">
          <Card className="rounded-3xl border-border/70">
            <CardContent className="p-5">
              <h3 className="font-display text-xl mb-3">Log de auditoria</h3>
              {estado.log.length ? (
                <div className="space-y-2">
                  {estado.log.map((l) => (
                    <div key={l.id} className="rounded-xl border border-border/70 p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span>{l.acao}</span>
                        <span className="font-mono text-muted-foreground">{new Date(l.em).toLocaleString("pt-BR")}</span>
                      </div>
                      <div className="text-muted-foreground mt-0.5">{l.detalhe} — {l.usuario}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configurações */}
        <TabsContent value="config" className="mt-4 space-y-4">
          <Card className="rounded-3xl border-border/70">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-display text-xl">Parametrização</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Versão do layout</Label>
                  <Select
                    value={estado.versaoLayout || def.layoutVigente}
                    onValueChange={(v) => {
                      if (!empresa) return;
                      setObrEstado(obr, empresa.id, competencia, { versaoLayout: v }, {
                        acao: "Versão de layout alterada",
                        detalhe: `Layout definido como ${v} para reprocessamento.`,
                      });
                      toast.success(`Layout ${v} aplicado.`);
                    }}
                  >
                    <SelectTrigger className="rounded-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {def.layouts.map((l) => (
                        <SelectItem key={l.versao} value={l.versao}>{l.versao} — {l.vigencia}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Responsável</Label>
                  <Input
                    defaultValue={estado.responsavel}
                    onBlur={(e) => {
                      if (!empresa || e.target.value === estado.responsavel) return;
                      setObrEstado(obr, empresa.id, competencia, { responsavel: e.target.value }, {
                        acao: "Responsável alterado",
                        detalhe: `Responsável definido como ${e.target.value}.`,
                      });
                    }}
                    className="rounded-full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Histórico de layouts</div>
                {def.layouts.map((l) => (
                  <div key={l.versao} className="rounded-xl border border-border/70 p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono">{l.versao}</span>
                      <span className="text-muted-foreground">{l.vigencia}</span>
                    </div>
                    <div className="text-muted-foreground mt-0.5">{l.nota}</div>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-border/70 p-3 text-xs text-muted-foreground">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                Módulo interno e visual: geração, assinatura e transmissão são simuladas. Nenhum arquivo é
                enviado a Receita Federal, SEFAZ ou prefeituras.
              </div>

              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  if (!empresa) return;
                  setObrEstado(obr, empresa.id, competencia, { status: "Não iniciada", etapa: 0 }, {
                    acao: "Competência reaberta",
                    detalhe: "Fluxo reiniciado para nova geração.",
                  });
                  toast.info("Fluxo reiniciado.");
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Reabrir e reprocessar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* painel lateral de rastreabilidade */}
      <Sheet open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {detalhe && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-2xl">
                  {detalhe.registro.codigo} — {detalhe.registro.nome}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-5 space-y-4 text-sm">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="rounded-full text-[10px]">Bloco {detalhe.bloco.codigo}</Badge>
                  <Badge variant="secondary" className="rounded-full text-[10px]">Linha {detalhe.registro.linha}</Badge>
                  <Badge variant="secondary" className="rounded-full text-[10px]">{detalhe.registro.ocorrencias} ocorrência(s)</Badge>
                  <Badge variant="secondary" className="rounded-full text-[10px]">{detalhe.registro.memoria.versaoRegra}</Badge>
                </div>

                <Secao titulo="Campos do registro">
                  {detalhe.registro.campos.map((c) => (
                    <Linha key={c.campo} label={c.campo} valor={c.valor} />
                  ))}
                </Secao>

                <Secao titulo="Origem do dado">
                  <Linha label="Tabela" valor={detalhe.registro.origem.tabela} />
                  <Linha label="Documento" valor={detalhe.registro.origem.documento} />
                  <Linha label="Campo" valor={detalhe.registro.origem.campo} />
                </Secao>

                <Secao titulo="Memória de geração">
                  <Linha label="Regra aplicada" valor={detalhe.registro.memoria.regra} />
                  <Linha label="Legislação" valor={detalhe.registro.memoria.legislacao} />
                  <Linha label="Fórmula" valor={detalhe.registro.memoria.formula} />
                  {detalhe.registro.memoria.passos.map((p) => (
                    <Linha key={p.label} label={p.label} valor={p.valor} />
                  ))}
                </Secao>

                <Secao titulo="Rastreabilidade">
                  <Linha label="Empresa" valor={empresa?.razao ?? "—"} />
                  <Linha label="Competência" valor={formatCompetencia(competencia)} />
                  <Linha label="Layout" valor={estado.versaoLayout || def.layoutVigente} />
                  <Linha label="Arquivo" valor={ultimoArquivo?.nome ?? "ainda não gerado"} />
                  <Linha label="Protocolo" valor={ultimaTransmissao?.protocolo || "—"} />
                </Secao>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AssistenteFechamento
        rotulo="IA ajudante"
        resumo={`${def.titulo} em ${formatCompetencia(competencia)} — status ${estado.status}.`}
        contexto={{
          tela: `Obrigação acessória: ${def.titulo}`,
          competencia,
          empresa: empresa?.razao,
          orgao: def.orgao,
          layout: estado.versaoLayout || def.layoutVigente,
          prazo: vencimentoBR(obr, competencia),
          status: estado.status,
          blocos: g.blocos.map((b) => `${b.codigo} — ${b.nome} (${b.registros.length} registros)`),
          erros: erros.map((v) => `${v.codigo} ${v.titulo}`),
          advertencias: advertencias.map((v) => `${v.codigo} ${v.titulo}`),
          pendencias: pendencias.map((v) => `${v.codigo} ${v.titulo}`),
          resumo: g.resumo,
        }}
      />
    </div>
  );
}

function ListaValidacoes({ itens, vazio }: { itens: Validacao[]; vazio: string }) {
  if (!itens.length)
    return (
      <Card className="rounded-3xl border-border/70">
        <CardContent className="p-5 flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-success" /> {vazio}
        </CardContent>
      </Card>
    );
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {itens.map((v) => (
        <Card key={v.id} className="rounded-2xl border-border/70">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-muted-foreground">{v.codigo}</span>
              <Badge className={`rounded-full ${corValidacao(v.tipo)}`}>{v.tipo}</Badge>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${v.tipo === "erro" ? "text-destructive" : "text-brand-orange"}`} />
              <div className="min-w-0">
                <div className="text-sm">{v.titulo}</div>
                <p className="text-xs text-muted-foreground">{v.detalhe}</p>
                {v.destino && (
                  <Link to={v.destino} className="text-xs text-brand-orange hover:underline">
                    Corrigir agora
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/70 p-4 space-y-1.5">
      <div className="text-[10px] uppercase tracking-[0.06em] leading-tight break-words text-muted-foreground">{titulo}</div>
      {children}
    </div>
  );
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-mono text-right break-all">{valor}</span>
    </div>
  );
}
