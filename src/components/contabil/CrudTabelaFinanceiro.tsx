import { useMemo, useState } from "react";
import {
  Badge, Button, Card, CardContent, Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { Download, Pencil, Plus, Search, Trash2, type LucideIcon } from "lucide-react";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import {
  novoId, removeLinha, replaceLinhas, saveLinha, useLinhas,
  type LinhaTabela, type TabelaSlug,
} from "@/lib/financeiroStore";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import AssistenteCampos from "@/components/contabil/AssistenteCampos";

export type CampoTabela = {
  key: string;
  label: string;
  type?: "text" | "number" | "select" | "textarea";
  options?: string[];
  required?: boolean;
  placeholder?: string;
  span?: 1 | 2;
  mono?: boolean;
  align?: "right";
  ajuda?: string;
};

export type CrudTabelaProps = {
  titulo: string;
  descricao: string;
  icone: LucideIcon;
  tabela: TabelaSlug;
  prefixoId: string;
  labelNovo: string;
  campos: CampoTabela[];
  colunas: string[];
  badgeKey?: string;
  vigencia?: string;
  padrao?: Record<string, string>[];
  indicadores?: (linhas: LinhaTabela[]) => { label: string; valor: string }[];
  dicas: string[];
};

export default function CrudTabelaFinanceiro({
  titulo, descricao, icone: Icone, tabela, prefixoId, labelNovo, campos, colunas,
  badgeKey, vigencia, padrao, indicadores, dicas,
}: CrudTabelaProps) {
  const { empresa } = useEmpresaAtual();
  const linhas = useLinhas(tabela);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const filtered = useMemo(
    () =>
      linhas.filter((l) =>
        campos.map((c) => l[c.key] ?? "").join(" ").toLowerCase().includes(query.toLowerCase()),
      ),
    [linhas, query, campos],
  );

  const colunasDef = campos.filter((c) => colunas.includes(c.key));
  const kpis = indicadores?.(linhas) ?? [];

  const abrirNovo = () => {
    const base: Record<string, string> = {};
    campos.forEach((c) => (base[c.key] = c.type === "select" ? (c.options?.[0] ?? "") : ""));
    setDraft(base);
    setEditing(false);
    setOpen(true);
  };

  const abrirEdicao = (l: LinhaTabela) => {
    setDraft({ ...l });
    setEditing(true);
    setOpen(true);
  };

  const salvar = () => {
    const faltando = campos.filter((c) => c.required && !(draft[c.key] ?? "").trim());
    if (faltando.length) return toast.error(`Preencha: ${faltando.map((c) => c.label).join(", ")}`);
    saveLinha(tabela, { ...draft, id: draft.id || novoId(prefixoId) } as LinhaTabela);
    setOpen(false);
    toast.success(editing ? "Linha atualizada." : "Linha adicionada à tabela.");
  };

  const carregarPadrao = () => {
    if (!padrao?.length) return;
    replaceLinhas(
      tabela,
      padrao.map((p) => ({ ...p, id: novoId(prefixoId) }) as LinhaTabela),
    );
    toast.success(`Tabela vigente carregada (${padrao.length} linhas).`);
  };

  const contexto = {
    tela: titulo,
    modulo: "Financeiro › Tabelas",
    vigencia,
    empresa: empresa ? { razao: empresa.razao, cnpj: empresa.cnpj, regime: empresa.regime } : null,
    totalLinhas: linhas.length,
    linhas: linhas.slice(0, 40),
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
            {vigencia ? (
              <p className="text-xs text-muted-foreground mt-1">
                Vigência: <span className="text-brand-orange">{vigencia}</span>
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {padrao?.length ? (
            <Button variant="outline" className="rounded-full" onClick={carregarPadrao}>
              <Download className="h-4 w-4 mr-2" /> Carregar tabela vigente
            </Button>
          ) : null}
          <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={abrirNovo}>
            <Plus className="h-4 w-4 mr-2" /> {labelNovo}
          </Button>
        </div>
      </div>

      {kpis.length ? (
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
      ) : null}

      <Card className="rounded-3xl shadow-card">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar linha da tabela…"
                className="pl-9 rounded-full"
              />
            </div>
            <Badge variant="secondary" className="rounded-full">{filtered.length} linha(s)</Badge>
          </div>

          {filtered.length === 0 ? (
            <div className="py-14 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Tabela vazia. Carregue a tabela vigente ou cadastre as linhas manualmente.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {padrao?.length ? (
                  <Button variant="outline" className="rounded-full" onClick={carregarPadrao}>
                    <Download className="h-4 w-4 mr-2" /> Carregar tabela vigente
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
                          {badgeKey === c.key ? (
                            <Badge variant="secondary" className="rounded-full">{l[c.key] || "—"}</Badge>
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
                          onClick={() => { removeLinha(tabela, l.id); toast.success("Linha removida."); }}
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
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Como usar esta tabela</div>
          <ul className="space-y-1.5 text-sm text-muted-foreground list-disc pl-4">
            {dicas.map((d) => <li key={d}>{d}</li>)}
          </ul>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar linha" : labelNovo}</DialogTitle>
          </DialogHeader>
          <AssistenteCampos titulo={titulo} campos={campos} draft={draft} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campos.map((c) => (
              <div key={c.key} className={c.span === 2 ? "md:col-span-2 space-y-1.5" : "space-y-1.5"}>
                <Label>{c.label}{c.required ? " *" : ""}</Label>
                {c.type === "select" ? (
                  <Select value={draft[c.key] ?? ""} onValueChange={(v) => setDraft((d) => ({ ...d, [c.key]: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {(c.options ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : c.type === "textarea" ? (
                  <Textarea
                    value={draft[c.key] ?? ""}
                    placeholder={c.placeholder}
                    onChange={(e) => setDraft((d) => ({ ...d, [c.key]: e.target.value }))}
                  />
                ) : (
                  <Input
                    value={draft[c.key] ?? ""}
                    placeholder={c.placeholder}
                    onChange={(e) => setDraft((d) => ({ ...d, [c.key]: e.target.value }))}
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

      <AssistenteFechamento contexto={contexto} resumo={`${titulo} · Financeiro`} rotulo="IA ajudante" />
    </div>
  );
}
