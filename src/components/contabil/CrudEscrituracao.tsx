import { useMemo, useState, type ReactNode } from "react";
import {
  Badge, Button, Card, CardContent, Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import {
  AlertTriangle, Pencil, Plus, RefreshCw, Search, Trash2, type LucideIcon,
} from "lucide-react";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import AssistenteCampos from "@/components/contabil/AssistenteCampos";
import { moedaBR, valorBR } from "@/lib/fiscalStore";
import {
  limparPeriodoEsc, novoEscId, removeLinha, saveLinha, somar, substituirPeriodo,
  useEscrituracao, type EscLinha, type EscSlug,
} from "@/lib/escrituracaoStore";

export type CampoEsc = {
  key: string;
  label: string;
  type?: "text" | "select" | "textarea";
  options?: string[];
  required?: boolean;
  placeholder?: string;
  span?: 1 | 2;
  mono?: boolean;
  align?: "right";
  ajuda?: string;
  /** valor calculado a partir dos demais campos — não editável. */
  calc?: (linha: Record<string, string>) => string;
};

export type CrudEscrituracaoProps = {
  titulo: string;
  descricao: string;
  icone: LucideIcon;
  slug: EscSlug;
  prefixoId: string;
  labelNovo: string;
  campos: CampoEsc[];
  colunas: string[];
  /** colunas monetárias somadas na linha de totais. */
  totais?: string[];
  statusKey?: string;
  statusOk?: string;
  gerar?: {
    label: string;
    executar: (empresaId: string, competencia: string) => EscLinha[];
    vazio?: string;
  };
  kpis?: (linhas: EscLinha[]) => { label: string; valor: string }[];
  painel?: (linhas: EscLinha[]) => ReactNode;
  alerta?: (linhas: EscLinha[]) => string | null;
  dicas: string[];
};

export default function CrudEscrituracao({
  titulo, descricao, icone: Icone, slug, prefixoId, labelNovo, campos, colunas,
  totais = [], statusKey, statusOk, gerar, kpis, painel, alerta, dicas,
}: CrudEscrituracaoProps) {
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const linhas = useEscrituracao(slug, empresa?.id, competencia);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const colunasDef = campos.filter((c) => colunas.includes(c.key));

  const filtered = useMemo(
    () =>
      linhas.filter((l) =>
        campos.map((c) => l[c.key] ?? "").join(" ").toLowerCase().includes(query.toLowerCase()),
      ),
    [linhas, query, campos],
  );

  const aviso = alerta?.(linhas) ?? null;

  const indicadores = (
    kpis?.(linhas) ?? [
      { label: "Linhas", valor: String(linhas.length) },
      ...totais.slice(0, 3).map((k) => ({
        label: campos.find((c) => c.key === k)?.label ?? k,
        valor: `R$ ${moedaBR(somar(linhas, k))}`,
      })),
    ]
  ).slice(0, 4);

  const aplicarCalculos = (d: Record<string, string>) => {
    const out = { ...d };
    campos.filter((c) => c.calc).forEach((c) => { out[c.key] = c.calc!(out); });
    return out;
  };

  const abrirNovo = () => {
    const base: Record<string, string> = {};
    campos.forEach((c) => { base[c.key] = c.type === "select" ? (c.options?.[0] ?? "") : ""; });
    setDraft(base);
    setEditing(false);
    setOpen(true);
  };

  const abrirEdicao = (l: EscLinha) => {
    setDraft({ ...l });
    setEditing(true);
    setOpen(true);
  };

  const salvar = () => {
    if (!empresa) return toast.error("Selecione uma empresa no cabeçalho.");
    const faltando = campos.filter((c) => c.required && !(draft[c.key] ?? "").trim());
    if (faltando.length) return toast.error(`Preencha: ${faltando.map((c) => c.label).join(", ")}`);

    saveLinha(slug, {
      ...aplicarCalculos(draft),
      id: draft.id || novoEscId(prefixoId),
      empresaId: empresa.id,
      competencia,
    } as EscLinha);
    setOpen(false);
    toast.success(editing ? "Registro atualizado." : "Registro incluído.");
  };

  const executarGeracao = () => {
    if (!empresa) return toast.error("Selecione uma empresa no cabeçalho.");
    if (!gerar) return;
    const novas = gerar.executar(empresa.id, competencia);
    if (!novas.length) {
      return toast.warning(gerar.vazio ?? "Nenhum dado encontrado para gerar esta competência.");
    }
    substituirPeriodo(slug, empresa.id, competencia, novas);
    toast.success(`${novas.length} linha(s) geradas para ${formatCompetencia(competencia)}.`);
  };

  const limpar = () => {
    if (!empresa) return;
    limparPeriodoEsc(slug, empresa.id, competencia);
    toast.success("Competência limpa.");
  };

  const contexto = {
    tela: titulo,
    modulo: "Fiscal › Escrituração",
    competencia: formatCompetencia(competencia),
    empresa: empresa ? { razao: empresa.razao, cnpj: empresa.cnpj, regime: empresa.regime } : null,
    totalLinhas: linhas.length,
    alerta: aviso,
    indicadores,
    linhas: linhas.slice(0, 30),
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
        <div className="flex items-center gap-2">
          {gerar ? (
            <Button variant="outline" className="rounded-full" onClick={executarGeracao}>
              <RefreshCw className="h-4 w-4 mr-2" /> {gerar.label}
            </Button>
          ) : null}
          <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={abrirNovo}>
            <Plus className="h-4 w-4 mr-2" /> {labelNovo}
          </Button>
        </div>
      </div>

      {!empresa ? (
        <Card className="rounded-3xl shadow-card border-brand-orange/40">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Selecione uma empresa no cabeçalho para trabalhar a escrituração.
          </CardContent>
        </Card>
      ) : null}

      {aviso ? (
        <Card className="rounded-3xl shadow-card border-brand-orange/40">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-brand-orange mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">{aviso}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {indicadores.map((k) => (
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
                placeholder="Buscar nesta escrituração…"
                className="pl-9 rounded-full"
              />
            </div>
            <Badge variant="secondary" className="rounded-full">{filtered.length} linha(s)</Badge>
            {linhas.length ? (
              <Button variant="ghost" size="sm" className="rounded-full" onClick={limpar}>
                <Trash2 className="h-4 w-4 mr-2" /> Limpar competência
              </Button>
            ) : null}
          </div>

          {filtered.length === 0 ? (
            <div className="py-14 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Nada escriturado nesta competência.
                {gerar ? " Gere a partir dos dados já lançados ou inclua manualmente." : " Inclua o primeiro registro."}
              </p>
              <div className="flex items-center justify-center gap-2">
                {gerar ? (
                  <Button variant="outline" className="rounded-full" onClick={executarGeracao}>
                    <RefreshCw className="h-4 w-4 mr-2" /> {gerar.label}
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
                  {filtered.map((l) => (
                    <TableRow key={l.id}>
                      {colunasDef.map((c) => (
                        <TableCell
                          key={c.key}
                          className={[
                            c.mono ? "font-mono text-xs" : "",
                            c.align === "right" ? "text-right" : "",
                          ].join(" ").trim() || undefined}
                        >
                          {statusKey && c.key === statusKey ? (
                            <Badge
                              variant="secondary"
                              className={
                                l[c.key] === statusOk
                                  ? "rounded-full bg-success/15 text-success"
                                  : "rounded-full bg-brand-orange/15 text-brand-orange"
                              }
                            >
                              {l[c.key] || "—"}
                            </Badge>
                          ) : (
                            l[c.key] || "—"
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => abrirEdicao(l)} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                          onClick={() => { removeLinha(slug, l.id); toast.success("Registro removido."); }}
                          aria-label="Excluir"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {totais.length ? (
                    <TableRow className="font-medium">
                      {colunasDef.map((c, i) => (
                        <TableCell
                          key={c.key}
                          className={[
                            c.mono ? "font-mono text-xs" : "",
                            c.align === "right" ? "text-right" : "",
                          ].join(" ").trim() || undefined}
                        >
                          {i === 0
                            ? "Totais"
                            : totais.includes(c.key)
                              ? moedaBR(somar(filtered, c.key))
                              : ""}
                        </TableCell>
                      ))}
                      <TableCell />
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {painel ? painel(linhas) : null}

      <Card className="rounded-3xl shadow-card">
        <CardContent className="p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Regras desta escrituração
          </div>
          <ul className="space-y-1.5 text-sm text-muted-foreground list-disc pl-4">
            {dicas.map((d) => <li key={d}>{d}</li>)}
          </ul>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar registro" : labelNovo}</DialogTitle>
          </DialogHeader>
          <AssistenteCampos titulo={titulo} campos={campos} draft={draft} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campos.map((c) => (
              <div key={c.key} className={c.span === 2 ? "md:col-span-2 space-y-1.5" : "space-y-1.5"}>
                <Label>{c.label}{c.required ? " *" : ""}</Label>
                {c.calc ? (
                  <Input
                    value={c.calc(draft)}
                    readOnly
                    className="font-mono text-xs bg-muted/50"
                  />
                ) : c.type === "select" ? (
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
                    className={c.mono ? "font-mono text-xs" : undefined}
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

/** Bloco reutilizável de memória de cálculo. */
export function MemoriaCalculo({ linhas }: { linhas: EscLinha[] }) {
  if (!linhas.length) return null;
  return (
    <Card className="rounded-3xl shadow-card">
      <CardContent className="p-5 space-y-4">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Memória de cálculo
        </div>
        {linhas.map((l) => (
          <div key={l.id} className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{l.tributo}</span>
              <span className="font-mono text-sm">
                R$ {moedaBR(valorBR(l.apagar))}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{l.memoria}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
