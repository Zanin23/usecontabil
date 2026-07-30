import { useMemo, useState } from "react";
import {
  Badge, Button, Card, CardContent, Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import {
  CheckCircle2, Download, FileUp, Pencil, Plus, Search, Trash2, type LucideIcon,
} from "lucide-react";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import AssistenteCampos from "@/components/contabil/AssistenteCampos";
import {
  chaveFicticia, competenciaDaData, formatarChave, limparPeriodo, moedaBR, novoDocId,
  primeiroDia, removeDoc, saveDoc, saveDocs, useDocsFiscais, valorBR,
  type DocFiscal, type DocSlug,
} from "@/lib/fiscalStore";

export type CampoDoc = {
  key: string;
  label: string;
  type?: "text" | "select" | "textarea" | "chave";
  options?: string[];
  required?: boolean;
  placeholder?: string;
  span?: 1 | 2;
  mono?: boolean;
  align?: "right";
  ajuda?: string;
};

export type CrudDocumentosProps = {
  titulo: string;
  descricao: string;
  icone: LucideIcon;
  slug: DocSlug;
  prefixoId: string;
  labelNovo: string;
  /** rótulo do botão de importação simulada (XML/lote). */
  labelImportar?: string;
  campos: CampoDoc[];
  colunas: string[];
  /** campo usado como badge colorido na tabela (normalmente o status). */
  statusKey: string;
  /** valor considerado "concluído" para o campo de status. */
  statusOk: string;
  /** campo monetário usado nos totalizadores. */
  valorKey?: string;
  /** campo de data no formato dd/mm/aaaa — define a competência do documento. */
  dataKey: string;
  /** movimento de exemplo gerado para a competência corrente. */
  exemplo?: (competencia: string) => Record<string, string>[];
  indicadoresExtras?: (docs: DocFiscal[]) => { label: string; valor: string }[];
  dicas: string[];
};

export default function CrudDocumentosFiscais({
  titulo, descricao, icone: Icone, slug, prefixoId, labelNovo, labelImportar,
  campos, colunas, statusKey, statusOk, valorKey, dataKey, exemplo, indicadoresExtras, dicas,
}: CrudDocumentosProps) {
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const docs = useDocsFiscais(slug, empresa?.id, competencia);

  const [query, setQuery] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const statusOptions = campos.find((c) => c.key === statusKey)?.options ?? [];
  const colunasDef = campos.filter((c) => colunas.includes(c.key));

  const filtered = useMemo(
    () =>
      docs
        .filter((d) => filtroStatus === "todos" || d[statusKey] === filtroStatus)
        .filter((d) =>
          campos.map((c) => d[c.key] ?? "").join(" ").toLowerCase().includes(query.toLowerCase()),
        ),
    [docs, query, filtroStatus, campos, statusKey],
  );

  const total = valorKey ? docs.reduce((s, d) => s + valorBR(d[valorKey]), 0) : 0;
  const pendentes = docs.filter((d) => d[statusKey] !== statusOk).length;

  const kpis = [
    { label: "Documentos", valor: String(docs.length) },
    ...(valorKey ? [{ label: "Valor total", valor: `R$ ${moedaBR(total)}` }] : []),
    { label: "Pendentes", valor: String(pendentes) },
    ...(indicadoresExtras?.(docs) ?? []),
  ].slice(0, 4);

  const exigeEmpresa = !empresa;

  const abrirNovo = () => {
    const base: Record<string, string> = {};
    campos.forEach((c) => {
      base[c.key] = c.type === "select" ? (c.options?.[0] ?? "") : "";
    });
    base[dataKey] = primeiroDia(competencia);
    if (campos.some((c) => c.type === "chave")) {
      const chaveField = campos.find((c) => c.type === "chave")!;
      base[chaveField.key] = chaveFicticia();
    }
    setDraft(base);
    setEditing(false);
    setOpen(true);
  };

  const abrirEdicao = (d: DocFiscal) => {
    setDraft({ ...d });
    setEditing(true);
    setOpen(true);
  };

  const salvar = () => {
    if (!empresa) return toast.error("Selecione uma empresa no cabeçalho.");
    const faltando = campos.filter((c) => c.required && !(draft[c.key] ?? "").trim());
    if (faltando.length) return toast.error(`Preencha: ${faltando.map((c) => c.label).join(", ")}`);

    const comp = competenciaDaData(draft[dataKey]) || competencia;
    if (comp !== competencia) {
      toast.warning(
        `Documento registrado na competência ${formatCompetencia(comp)} — troque o período para visualizá-lo.`,
      );
    }
    saveDoc(slug, {
      ...draft,
      id: draft.id || novoDocId(prefixoId),
      empresaId: empresa.id,
      competencia: comp,
    } as DocFiscal);
    setOpen(false);
    toast.success(editing ? "Documento atualizado." : "Documento registrado.");
  };

  const alternarStatus = (d: DocFiscal) => {
    const proximo = d[statusKey] === statusOk ? (statusOptions.find((o) => o !== statusOk) ?? statusOk) : statusOk;
    saveDoc(slug, { ...d, [statusKey]: proximo });
    toast.success(`Documento marcado como "${proximo}".`);
  };

  const importarExemplo = () => {
    if (!empresa) return toast.error("Selecione uma empresa no cabeçalho.");
    if (!exemplo) return;
    const linhas = exemplo(competencia).map(
      (l) => ({ ...l, id: novoDocId(prefixoId), empresaId: empresa.id, competencia }) as DocFiscal,
    );
    saveDocs(slug, linhas);
    toast.success(`${linhas.length} documento(s) importado(s) para ${formatCompetencia(competencia)}.`);
  };

  const limpar = () => {
    if (!empresa) return;
    limparPeriodo(slug, empresa.id, competencia);
    toast.success("Documentos da competência removidos.");
  };

  const contexto = {
    tela: titulo,
    modulo: "Fiscal › Documentos fiscais",
    competencia: formatCompetencia(competencia),
    empresa: empresa ? { razao: empresa.razao, cnpj: empresa.cnpj, regime: empresa.regime } : null,
    totalDocumentos: docs.length,
    pendentes,
    valorTotal: valorKey ? `R$ ${moedaBR(total)}` : undefined,
    documentos: docs.slice(0, 30),
    orientacoes: dicas,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-2xl bg-brand-orange/15 grid place-items-center shrink-0">
            <Icone className="h-5 w-5 text-brand-orange" />
          </div>
          <div>
            <h1 className="text-2xl font-display leading-tight">{titulo}</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">{descricao}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Competência: <span className="text-brand-orange">{formatCompetencia(competencia)}</span>
              {empresa ? <> · {empresa.razao}</> : null}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {exemplo ? (
            <Button variant="outline" className="rounded-full" onClick={importarExemplo}>
              <FileUp className="h-4 w-4 mr-2" /> {labelImportar ?? "Importar XML"}
            </Button>
          ) : null}
          <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={abrirNovo}>
            <Plus className="h-4 w-4 mr-2" /> {labelNovo}
          </Button>
        </div>
      </div>

      {exigeEmpresa ? (
        <Card className="rounded-3xl shadow-card border-brand-orange/40">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Selecione uma empresa no cabeçalho para escriturar documentos fiscais.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="rounded-3xl shadow-card">
            <CardContent className="p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{k.label}</div>
              <div className="font-display text-2xl mt-1">{k.valor}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-3xl shadow-card">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por documento, participante, chave…"
                className="pl-9 rounded-full"
              />
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[190px] rounded-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {statusOptions.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="rounded-full">{filtered.length} documento(s)</Badge>
            {docs.length ? (
              <Button variant="ghost" size="sm" className="rounded-full" onClick={limpar}>
                <Trash2 className="h-4 w-4 mr-2" /> Limpar competência
              </Button>
            ) : null}
          </div>

          {filtered.length === 0 ? (
            <div className="py-14 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Nenhum documento nesta competência. Importe um lote ou lance manualmente.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {exemplo ? (
                  <Button variant="outline" className="rounded-full" onClick={importarExemplo}>
                    <Download className="h-4 w-4 mr-2" /> {labelImportar ?? "Importar XML"}
                  </Button>
                ) : null}
                <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={abrirNovo}>
                  <Plus className="h-4 w-4 mr-2" /> {labelNovo}
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {colunasDef.map((c) => (
                      <TableHead key={c.key} className={c.align === "right" ? "text-right" : undefined}>
                        {c.label}
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((d) => (
                    <TableRow key={d.id}>
                      {colunasDef.map((c) => (
                        <TableCell
                          key={c.key}
                          className={[
                            c.mono || c.type === "chave" ? "font-mono text-xs" : "",
                            c.align === "right" ? "text-right" : "",
                          ].join(" ").trim() || undefined}
                        >
                          {c.key === statusKey ? (
                            <Badge
                              variant="secondary"
                              className={
                                d[c.key] === statusOk
                                  ? "rounded-full bg-success/15 text-success"
                                  : "rounded-full bg-brand-orange/15 text-brand-orange"
                              }
                            >
                              {d[c.key] || "—"}
                            </Badge>
                          ) : c.type === "chave" ? (
                            <span title={d[c.key]}>{formatarChave(d[c.key]).slice(0, 24)}…</span>
                          ) : (
                            d[c.key] || "—"
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                          onClick={() => alternarStatus(d)}
                          aria-label="Alternar status"
                        >
                          <CheckCircle2
                            className={`h-4 w-4 ${d[statusKey] === statusOk ? "text-success" : "text-muted-foreground"}`}
                          />
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => abrirEdicao(d)} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                          onClick={() => { removeDoc(slug, d.id); toast.success("Documento removido."); }}
                          aria-label="Excluir"
                        >
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
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Como usar esta tela
          </div>
          <ul className="space-y-1.5 text-sm text-muted-foreground list-disc pl-4">
            {dicas.map((d) => <li key={d}>{d}</li>)}
          </ul>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar documento" : labelNovo}</DialogTitle>
          </DialogHeader>
          <AssistenteCampos titulo={titulo} campos={campos} draft={draft} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campos.map((c) => (
              <div key={c.key} className={c.span === 2 ? "md:col-span-2 space-y-1.5" : "space-y-1.5"}>
                <Label>{c.label}{c.required ? " *" : ""}</Label>
                {c.type === "select" ? (
                  <Select value={draft[c.key] ?? ""} onValueChange={(v) => setDraft((s) => ({ ...s, [c.key]: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {(c.options ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : c.type === "textarea" ? (
                  <Textarea
                    value={draft[c.key] ?? ""}
                    placeholder={c.placeholder}
                    onChange={(e) => setDraft((s) => ({ ...s, [c.key]: e.target.value }))}
                  />
                ) : (
                  <Input
                    value={draft[c.key] ?? ""}
                    placeholder={c.placeholder}
                    className={c.type === "chave" || c.mono ? "font-mono text-xs" : undefined}
                    onChange={(e) => setDraft((s) => ({ ...s, [c.key]: e.target.value }))}
                  />
                )}
                {c.ajuda ? <p className="text-xs text-muted-foreground">{c.ajuda}</p> : null}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssistenteFechamento
        contexto={contexto}
        resumo={`${titulo} · ${formatCompetencia(competencia)}`}
        rotulo="IA ajudante"
      />
    </div>
  );
}
