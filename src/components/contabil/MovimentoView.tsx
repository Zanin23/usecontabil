import { useMemo, useState } from "react";
import {
  Badge, Button, Card, CardContent, Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Sheet, SheetContent, SheetHeader, SheetTitle, Switch, Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow, Tabs, TabsContent, TabsList, TabsTrigger, Textarea,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import {
  AlertTriangle, Ban, CheckCircle2, Clock, Copy, Database, FileText, Info, Loader2,
  Plus, Search, Sparkles, Trash2, XCircle, type LucideIcon,
} from "lucide-react";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import {
  brl, carregarDemonstracao, dataBR, documentosDaCompetencia, novoId, processarDocumento,
  removerDocumento, resumoDocumentos, salvarDocumento, transitarDocumento, TIPOS_POR_GRUPO,
  totalDoc, UFS, useTributario, type DocStatus, type DocumentoFiscal, type DocTipo,
  type GrupoMovimento, type ItemDoc, type UF,
} from "@/lib/tributarioStore";

const STATUS_CORES: Record<DocStatus, string> = {
  Rascunho: "bg-muted text-muted-foreground",
  Processando: "bg-brand-blue/15 text-brand-blue",
  Autorizado: "bg-success/15 text-success",
  Rejeitado: "bg-destructive/15 text-destructive",
  Cancelado: "bg-destructive/10 text-destructive",
  Inutilizado: "bg-muted text-muted-foreground",
  Substituído: "bg-brand-purple/15 text-brand-purple",
};

function Kpi({ label, valor, hint, destaque }: { label: string; valor: string; hint?: string; destaque?: boolean }) {
  return (
    <Card className="rounded-3xl shadow-card">
      <CardContent className="p-4 min-w-0">
        <div className="text-[10px] uppercase tracking-[0.08em] leading-tight break-words text-muted-foreground">{label}</div>
        <div className={`mt-1 font-display text-xl break-words ${destaque ? "text-destructive" : ""}`}>{valor}</div>
        {hint ? <div className="text-[11px] text-muted-foreground break-words">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

export default function MovimentoView({
  grupo, titulo, descricao, icone: Icone, dicas,
}: {
  grupo: GrupoMovimento;
  titulo: string;
  descricao: string;
  icone: LucideIcon;
  dicas: string[];
}) {
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const empresaId = empresa?.id ?? "";

  const docs = useTributario(
    () => documentosDaCompetencia(empresaId, competencia, grupo),
    [empresaId, competencia, grupo],
  );

  const [query, setQuery] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [open, setOpen] = useState(false);
  const [detalhe, setDetalhe] = useState<DocumentoFiscal | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);
  const [draft, setDraft] = useState<DocumentoFiscal | null>(null);

  const filtrados = useMemo(
    () =>
      docs.filter((d) => {
        const okStatus = statusFiltro === "todos" || d.status === statusFiltro;
        const alvo = `${d.tipo} ${d.numero} ${d.participante} ${d.participanteDoc}`.toLowerCase();
        return okStatus && alvo.includes(query.toLowerCase());
      }),
    [docs, query, statusFiltro],
  );

  const r = resumoDocumentos(docs);

  const novoDoc = (): DocumentoFiscal => ({
    id: novoId("doc"),
    empresaId,
    competencia,
    grupo,
    tipo: TIPOS_POR_GRUPO[grupo][0],
    numero: String(10000 + docs.length + 1),
    serie: "1",
    emissao: `${competencia}-${String(new Date().getDate()).padStart(2, "0")}`,
    participante: "",
    participanteDoc: "",
    ufOrigem: "SP",
    ufDestino: "SP",
    contribuinte: true,
    consumidorFinal: false,
    regime: empresa?.regime || "Lucro Presumido",
    itens: [{ id: novoId("it"), descricao: "", tipo: grupo === "servicos" ? "servico" : "produto", quantidade: 1, unitario: 0, aliqIss: grupo === "servicos" ? 5 : undefined }],
    valorProdutos: 0,
    valorTotal: 0,
    status: "Rascunho",
    tributos: { icms: 0, icmsSt: 0, difal: 0, fcp: 0, ipi: 0, pis: 0, cofins: 0, iss: 0, irrf: 0, inss: 0, csll: 0, retencoes: 0, total: 0 },
    memoria: [],
    regrasAplicadas: [],
    alertas: [],
    eventos: [],
  });

  const abrirNovo = () => {
    if (!empresaId) return toast.error("Selecione uma empresa no topo da tela.");
    setDraft(novoDoc());
    setOpen(true);
  };

  const previa = useMemo(() => {
    if (!draft) return null;
    const total = totalDoc(draft.itens);
    return processarDocumento({ ...draft, valorProdutos: total, valorTotal: total }, empresaId);
  }, [draft, empresaId]);

  const setItem = (id: string, patch: Partial<ItemDoc>) =>
    setDraft((d) => (d ? { ...d, itens: d.itens.map((i) => (i.id === id ? { ...i, ...patch } : i)) } : d));

  const salvar = (emitir: boolean) => {
    if (!draft || !previa) return;
    if (!draft.participante.trim()) return toast.error("Informe o participante do documento.");
    if (previa.valorTotal <= 0) return toast.error("Inclua ao menos um item com valor.");
    const bloqueio = previa.alertas.find((a) => a.nivel === "bloqueio");
    if (emitir && bloqueio) return toast.error(`Bloqueio do motor de regras: ${bloqueio.mensagem}`);

    const doc = salvarDocumento(empresaId, { ...previa, status: emitir ? "Processando" : "Rascunho" }, emitir ? "Documento enviado para autorização" : "Rascunho salvo");
    setOpen(false);
    if (!emitir) return toast.success("Rascunho salvo com o cálculo tributário atualizado.");

    setProcessando(doc.id);
    toast.info("Transmitindo para a SEFAZ…");
    window.setTimeout(() => {
      transitarDocumento(empresaId, doc.id, "Autorizado", "Autorização simulada (ambiente interno)");
      setProcessando(null);
      toast.success(`${doc.tipo} ${doc.numero} autorizado. Tributos: ${brl(doc.tributos.total)}`);
    }, 1200);
  };

  const contexto = {
    tela: titulo,
    modulo: "Financeiro › Movimentos",
    competencia: formatCompetencia(competencia),
    empresa: empresa ? { razao: empresa.razao, cnpj: empresa.cnpj, regime: empresa.regime } : null,
    resumo: r,
    documentos: docs.slice(0, 20).map((d) => ({
      tipo: d.tipo, numero: d.numero, participante: d.participante, valor: d.valorTotal,
      status: d.status, tributos: d.tributos.total, alertas: d.alertas.map((a) => a.mensagem),
    })),
    orientacoes: dicas,
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-2xl bg-brand-orange/15 grid place-items-center shrink-0">
            <Icone className="h-5 w-5 text-brand-orange" />
          </div>
          <div>
            <h1 className="font-display text-2xl leading-tight">{titulo}</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">{descricao}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary" className="rounded-full">{formatCompetencia(competencia)}</Badge>
              <Badge variant="secondary" className="rounded-full">{empresa?.razao ?? "Nenhuma empresa selecionada"}</Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {docs.length === 0 && empresaId ? (
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => { carregarDemonstracao(empresaId, competencia, empresa?.regime); toast.success("Base de demonstração carregada."); }}
            >
              <Database className="mr-2 h-4 w-4" /> Carregar demonstração
            </Button>
          ) : null}
          <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={abrirNovo}>
            <Plus className="mr-2 h-4 w-4" /> Emitir documento
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <Kpi label="Documentos" valor={String(r.total)} hint={`${r.autorizados} autorizados`} />
        <Kpi label="Valor faturado" valor={brl(r.faturado)} />
        <Kpi label="Tributos calculados" valor={brl(r.tributos)} />
        <Kpi label="Carga efetiva" valor={`${r.cargaEfetiva.toFixed(2)}%`} hint="tributos / faturamento" />
        <Kpi label="Pendentes" valor={String(r.pendentes)} destaque={r.pendentes > 0} />
        <Kpi label="Bloqueios de regra" valor={String(r.bloqueios)} destaque={r.bloqueios > 0} />
      </div>

      <Card className="rounded-3xl shadow-card">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por número, participante ou CNPJ…" className="rounded-full pl-9" />
            </div>
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="w-[190px] rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["todos", "Rascunho", "Processando", "Autorizado", "Rejeitado", "Cancelado", "Inutilizado"].map((s) => (
                  <SelectItem key={s} value={s}>{s === "todos" ? "Todos os status" : s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="rounded-full">{filtrados.length} documento(s)</Badge>
          </div>

          {filtrados.length === 0 ? (
            <div className="space-y-3 py-14 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum documento nesta competência. Emita o primeiro documento ou carregue a base de demonstração.
              </p>
              <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={abrirNovo}>
                <Plus className="mr-2 h-4 w-4" /> Emitir documento
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead>Participante</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Tributos</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((d) => (
                    <TableRow key={d.id} className="cursor-pointer" onClick={() => setDetalhe(d)}>
                      <TableCell className="font-mono text-xs">
                        {d.tipo} {d.numero}/{d.serie}
                        {d.alertas.some((a) => a.nivel === "bloqueio") ? (
                          <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-destructive" />
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{dataBR(d.emissao)}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{d.participante}</TableCell>
                      <TableCell className="font-mono text-xs">{d.ufDestino}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{brl(d.valorTotal)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{brl(d.tributos.total)}</TableCell>
                      <TableCell className="text-center">
                        <span className={`rounded-full px-2 py-1 text-[11px] ${STATUS_CORES[d.status]}`}>
                          {processando === d.id ? "Processando" : d.status}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        {d.status === "Autorizado" ? (
                          <Button variant="ghost" size="icon" className="rounded-full" aria-label="Cancelar"
                            onClick={() => { transitarDocumento(empresaId, d.id, "Cancelado", "Cancelamento solicitado pelo usuário"); toast.success("Documento cancelado."); }}>
                            <Ban className="h-4 w-4 text-destructive" />
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Excluir"
                          onClick={() => { removerDocumento(empresaId, d.id); toast.success("Documento removido."); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      <Card className="rounded-3xl shadow-card">
        <CardContent className="p-5">
          <div className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Como operar esta tela</div>
          <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
            {dicas.map((d) => <li key={d}>{d}</li>)}
          </ul>
        </CardContent>
      </Card>

      {/* -------- emissão -------- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle>Emissão de documento — {titulo}</DialogTitle></DialogHeader>
          {draft ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={draft.tipo} onValueChange={(v) => setDraft({ ...draft, tipo: v as DocTipo })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPOS_POR_GRUPO[grupo].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Número</Label>
                  <Input className="rounded-xl" value={draft.numero} onChange={(e) => setDraft({ ...draft, numero: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Série</Label>
                  <Input className="rounded-xl" value={draft.serie} onChange={(e) => setDraft({ ...draft, serie: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Participante</Label>
                  <Input className="rounded-xl" placeholder="Razão social ou nome" value={draft.participante} onChange={(e) => setDraft({ ...draft, participante: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>CPF/CNPJ</Label>
                  <Input className="rounded-xl" value={draft.participanteDoc} onChange={(e) => setDraft({ ...draft, participanteDoc: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Emissão</Label>
                  <Input type="date" className="rounded-xl" value={draft.emissao} onChange={(e) => setDraft({ ...draft, emissao: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>UF origem</Label>
                  <Select value={draft.ufOrigem} onValueChange={(v) => setDraft({ ...draft, ufOrigem: v as UF })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>{UFS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>UF destino</Label>
                  <Select value={draft.ufDestino} onValueChange={(v) => setDraft({ ...draft, ufDestino: v as UF })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>{UFS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-xl border px-3 py-2 sm:col-span-1">
                  <Label className="text-xs">Contribuinte de ICMS</Label>
                  <Switch checked={draft.contribuinte} onCheckedChange={(v) => setDraft({ ...draft, contribuinte: v })} />
                </div>
                <div className="flex items-center justify-between rounded-xl border px-3 py-2 sm:col-span-2">
                  <Label className="text-xs">Consumidor final (dispara DIFAL em operação interestadual)</Label>
                  <Switch checked={draft.consumidorFinal} onCheckedChange={(v) => setDraft({ ...draft, consumidorFinal: v })} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Itens</div>
                  <Button variant="outline" size="sm" className="rounded-full"
                    onClick={() => setDraft({ ...draft, itens: [...draft.itens, { id: novoId("it"), descricao: "", tipo: grupo === "servicos" ? "servico" : "produto", quantidade: 1, unitario: 0 }] })}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar item
                  </Button>
                </div>
                {draft.itens.map((it) => (
                  <div key={it.id} className="grid gap-2 rounded-2xl border p-3 sm:grid-cols-12">
                    <div className="sm:col-span-4">
                      <Label className="text-[11px]">Descrição</Label>
                      <Input className="rounded-xl" value={it.descricao} onChange={(e) => setItem(it.id, { descricao: e.target.value })} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-[11px]">{it.tipo === "servico" ? "Item LC 116" : "NCM"}</Label>
                      <Input className="rounded-xl font-mono text-xs"
                        value={it.tipo === "servico" ? it.lc116 ?? "" : it.ncm ?? ""}
                        onChange={(e) => setItem(it.id, it.tipo === "servico" ? { lc116: e.target.value } : { ncm: e.target.value })} />
                    </div>
                    {it.tipo === "produto" ? (
                      <>
                        <div className="sm:col-span-1">
                          <Label className="text-[11px]">CFOP</Label>
                          <Input className="rounded-xl font-mono text-xs" value={it.cfop ?? ""} onChange={(e) => setItem(it.id, { cfop: e.target.value })} />
                        </div>
                        <div className="sm:col-span-1">
                          <Label className="text-[11px]">CST</Label>
                          <Input className="rounded-xl font-mono text-xs" value={it.cst ?? ""} onChange={(e) => setItem(it.id, { cst: e.target.value })} />
                        </div>
                        <div className="sm:col-span-1">
                          <Label className="text-[11px]">MVA %</Label>
                          <Input className="rounded-xl font-mono text-xs" value={it.mva ?? ""} onChange={(e) => setItem(it.id, { mva: Number(e.target.value) || undefined })} />
                        </div>
                      </>
                    ) : (
                      <div className="sm:col-span-3">
                        <Label className="text-[11px]">Alíquota ISS %</Label>
                        <Input className="rounded-xl font-mono text-xs" value={it.aliqIss ?? ""} onChange={(e) => setItem(it.id, { aliqIss: Number(e.target.value) || 0 })} />
                      </div>
                    )}
                    <div className="sm:col-span-1">
                      <Label className="text-[11px]">Qtd.</Label>
                      <Input className="rounded-xl font-mono text-xs" value={it.quantidade} onChange={(e) => setItem(it.id, { quantidade: Number(e.target.value.replace(",", ".")) || 0 })} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-[11px]">Valor unitário</Label>
                      <Input className="rounded-xl font-mono text-xs" value={it.unitario} onChange={(e) => setItem(it.id, { unitario: Number(e.target.value.replace(",", ".")) || 0 })} />
                    </div>
                    <div className="flex items-end justify-end sm:col-span-12">
                      <span className="mr-auto font-mono text-xs text-muted-foreground">Total do item: {brl(it.quantidade * it.unitario)}</span>
                      {draft.itens.length > 1 ? (
                        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Remover item"
                          onClick={() => setDraft({ ...draft, itens: draft.itens.filter((x) => x.id !== it.id) })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label>Observações</Label>
                <Textarea className="rounded-xl" value={draft.observacao ?? ""} onChange={(e) => setDraft({ ...draft, observacao: e.target.value })} />
              </div>

              {previa ? (
                <Card className="rounded-2xl border-brand-orange/40">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-brand-orange" /> Prévia do motor tributário
                    </div>
                    <div className="grid gap-2 sm:grid-cols-4">
                      <Kpi label="Valor total" valor={brl(previa.valorTotal)} />
                      <Kpi label="Tributos" valor={brl(previa.tributos.total)} />
                      <Kpi label="Retenções" valor={brl(previa.tributos.retencoes)} />
                      <Kpi label="Regras aplicadas" valor={String(previa.regrasAplicadas.length)} />
                    </div>
                    {previa.alertas.length ? (
                      <ul className="space-y-1.5">
                        {previa.alertas.map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs">
                            {a.nivel === "bloqueio" ? <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                              : a.nivel === "alerta" ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />
                              : <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                            <span><span className="font-medium">{a.regra}:</span> {a.mensagem}{a.correcao ? ` — ${a.correcao}` : ""}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => salvar(false)}>Salvar rascunho</Button>
            <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={() => salvar(true)}>
              <FileText className="mr-2 h-4 w-4" /> Emitir e transmitir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -------- painel lateral -------- */}
      <Sheet open={!!detalhe} onOpenChange={(v) => !v && setDetalhe(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {detalhe ? (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-xl">
                  {detalhe.tipo} {detalhe.numero}/{detalhe.serie}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className={`rounded-full px-2 py-1 ${STATUS_CORES[detalhe.status]}`}>{detalhe.status}</span>
                  <Badge variant="secondary" className="rounded-full">{dataBR(detalhe.emissao)}</Badge>
                  <Badge variant="secondary" className="rounded-full">{detalhe.ufOrigem} → {detalhe.ufDestino}</Badge>
                </div>
                <div className="rounded-2xl border p-3 text-sm">
                  <div className="font-medium">{detalhe.participante}</div>
                  <div className="font-mono text-xs text-muted-foreground">{detalhe.participanteDoc || "—"}</div>
                  {detalhe.chave ? (
                    <button className="mt-2 flex items-center gap-1 break-all text-left font-mono text-[11px] text-brand-orange"
                      onClick={() => { navigator.clipboard.writeText(detalhe.chave!); toast.success("Chave copiada."); }}>
                      <Copy className="h-3 w-3 shrink-0" /> {detalhe.chave}
                    </button>
                  ) : null}
                </div>

                <Tabs defaultValue="memoria">
                  <TabsList className="rounded-full">
                    <TabsTrigger value="memoria" className="rounded-full">Memória de cálculo</TabsTrigger>
                    <TabsTrigger value="regras" className="rounded-full">Regras</TabsTrigger>
                    <TabsTrigger value="timeline" className="rounded-full">Timeline</TabsTrigger>
                  </TabsList>

                  <TabsContent value="memoria" className="space-y-2 pt-3">
                    {detalhe.memoria.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sem tributos calculados para este documento.</p>
                    ) : detalhe.memoria.map((m, i) => (
                      <div key={i} className="rounded-2xl border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="secondary" className="rounded-full">{m.tributo}</Badge>
                          <span className="font-mono text-sm">{brl(m.valor)}</span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{m.descricao}</div>
                        <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                          base {brl(m.base)}{m.aliquota !== undefined ? ` × ${m.aliquota}%` : ""}
                        </div>
                        {m.fundamento ? <div className="mt-1 text-[11px] text-brand-orange">{m.fundamento}</div> : null}
                      </div>
                    ))}
                    <div className="flex items-center justify-between rounded-2xl bg-muted/50 p-3 text-sm">
                      <span>Total de tributos</span>
                      <span className="font-mono">{brl(detalhe.tributos.total)}</span>
                    </div>
                  </TabsContent>

                  <TabsContent value="regras" className="space-y-2 pt-3">
                    {detalhe.alertas.length === 0 ? (
                      <div className="flex items-center gap-2 text-sm text-success">
                        <CheckCircle2 className="h-4 w-4" /> Nenhuma inconsistência apontada pelo motor.
                      </div>
                    ) : detalhe.alertas.map((a, i) => (
                      <div key={i} className="rounded-2xl border p-3 text-sm">
                        <div className="flex items-center gap-2 font-medium">
                          {a.nivel === "bloqueio" ? <XCircle className="h-4 w-4 text-destructive" />
                            : a.nivel === "alerta" ? <AlertTriangle className="h-4 w-4 text-warn" />
                            : <Info className="h-4 w-4 text-muted-foreground" />}
                          {a.regra}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{a.mensagem}</p>
                        {a.correcao ? <p className="mt-1 text-xs text-brand-orange">Correção sugerida: {a.correcao}</p> : null}
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="timeline" className="space-y-2 pt-3">
                    {detalhe.eventos.map((e) => (
                      <div key={e.id} className="flex items-start gap-3 rounded-2xl border p-3">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
                        <div className="min-w-0">
                          <div className="text-sm">{e.acao}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {new Date(e.data).toLocaleString("pt-BR")} · {e.usuario}
                          </div>
                          {e.detalhe ? <div className="text-xs text-muted-foreground">{e.detalhe}</div> : null}
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>

                <div className="flex flex-wrap gap-2">
                  {detalhe.status === "Rascunho" ? (
                    <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90"
                      onClick={() => { transitarDocumento(empresaId, detalhe.id, "Autorizado", "Autorização simulada"); setDetalhe(null); toast.success("Documento autorizado."); }}>
                      Autorizar
                    </Button>
                  ) : null}
                  {detalhe.status === "Autorizado" ? (
                    <>
                      <Button variant="outline" className="rounded-full"
                        onClick={() => { transitarDocumento(empresaId, detalhe.id, "Cancelado", "Cancelamento no prazo legal"); setDetalhe(null); toast.success("Documento cancelado."); }}>
                        Cancelar documento
                      </Button>
                      <Button variant="outline" className="rounded-full"
                        onClick={() => { transitarDocumento(empresaId, detalhe.id, "Substituído", "Substituído por documento posterior"); setDetalhe(null); toast.success("Documento marcado como substituído."); }}>
                        Substituir
                      </Button>
                    </>
                  ) : null}
                  {detalhe.status === "Rascunho" ? (
                    <Button variant="outline" className="rounded-full"
                      onClick={() => { transitarDocumento(empresaId, detalhe.id, "Inutilizado", "Numeração inutilizada"); setDetalhe(null); toast.success("Numeração inutilizada."); }}>
                      Inutilizar numeração
                    </Button>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {processando ? (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-card px-4 py-2 shadow-elevated">
          <Loader2 className="h-4 w-4 animate-spin text-brand-orange" />
          <span className="text-sm">Transmitindo documento…</span>
        </div>
      ) : null}

      <AssistenteFechamento contexto={contexto} resumo={`${titulo} — ${r.total} documentos, ${brl(r.faturado)} faturados`} rotulo="IA ajudante" />
    </div>
  );
}
