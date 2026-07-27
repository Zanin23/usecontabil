import { useMemo, useState } from "react";
import {
  Badge, Button, Card, CardContent, Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { Pencil, Plus, Search, Sparkles, Trash2, type LucideIcon } from "lucide-react";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import {
  novoId, removeRegistro, saveRegistro, useRegistros,
  type Colecao, type Registro,
} from "@/lib/empresaDadosStore";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";

export type Campo = {
  key: string;
  label: string;
  type?: "text" | "date" | "select" | "textarea";
  options?: string[];
  required?: boolean;
  placeholder?: string;
  span?: 1 | 2 | 3;
  mono?: boolean;
  ajuda?: string;
};

export type CrudEmpresaProps = {
  titulo: string;
  descricao: string;
  icone: LucideIcon;
  colecao: Colecao;
  prefixoId: string;
  campos: Campo[];
  colunas: string[];
  statusKey?: string;
  labelNovo: string;
  sugestoes?: Record<string, string>[];
  dicas: string[];
};

export default function CrudEmpresa({
  titulo, descricao, icone: Icone, colecao, prefixoId, campos, colunas,
  statusKey, labelNovo, sugestoes, dicas,
}: CrudEmpresaProps) {
  const { empresa } = useEmpresaAtual();
  const registros = useRegistros(colecao, empresa?.id ?? null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const filtered = useMemo(
    () =>
      registros.filter((r) =>
        campos
          .map((c) => r[c.key] ?? "")
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [registros, query, campos],
  );

  const colunasDef = campos.filter((c) => colunas.includes(c.key));

  const abrirNovo = () => {
    const base: Record<string, string> = {};
    campos.forEach((c) => (base[c.key] = c.type === "select" ? (c.options?.[0] ?? "") : ""));
    setDraft(base);
    setEditing(false);
    setOpen(true);
  };

  const abrirEdicao = (r: Registro) => {
    setDraft({ ...r });
    setEditing(true);
    setOpen(true);
  };

  const salvar = () => {
    if (!empresa) return toast.error("Selecione uma empresa no topo da tela.");
    const faltando = campos.filter((c) => c.required && !(draft[c.key] ?? "").trim());
    if (faltando.length) return toast.error(`Preencha: ${faltando.map((c) => c.label).join(", ")}`);
    const rec = {
      ...draft,
      id: draft.id || novoId(prefixoId),
      empresaId: empresa.id,
    } as Registro;
    saveRegistro(colecao, rec);
    setOpen(false);
    toast.success(editing ? "Registro atualizado." : "Registro cadastrado.");
  };

  const excluir = (r: Registro) => {
    removeRegistro(colecao, r.id);
    toast.success("Registro removido.");
  };

  const aplicarSugestoes = () => {
    if (!empresa) return toast.error("Selecione uma empresa no topo da tela.");
    let criados = 0;
    (sugestoes ?? []).forEach((s) => {
      const chave = colunasDef[0]?.key ?? campos[0].key;
      if (registros.some((r) => (r[chave] ?? "") === (s[chave] ?? ""))) return;
      saveRegistro(colecao, { ...s, id: novoId(prefixoId), empresaId: empresa.id } as Registro);
      criados += 1;
    });
    toast.success(criados ? `${criados} registro(s) sugerido(s) adicionados.` : "Sugestões já cadastradas.");
  };

  const contexto = {
    tela: titulo,
    modulo: "Preparativos › Empresa",
    empresa: empresa ? { razao: empresa.razao, cnpj: empresa.cnpj, regime: empresa.regime } : null,
    totalRegistros: registros.length,
    registros: registros.slice(0, 30),
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
              Empresa: <span className="text-brand-orange">{empresa?.razao ?? "nenhuma selecionada"}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sugestoes?.length ? (
            <Button variant="outline" className="rounded-full" onClick={aplicarSugestoes}>
              <Sparkles className="h-4 w-4 mr-2" /> Modelos sugeridos
            </Button>
          ) : null}
          <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={abrirNovo}>
            <Plus className="h-4 w-4 mr-2" /> {labelNovo}
          </Button>
        </div>
      </div>

      <Card className="rounded-3xl shadow-card">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar registro…"
                className="pl-9 rounded-full"
              />
            </div>
            <Badge variant="secondary" className="rounded-full">
              {filtered.length} registro(s)
            </Badge>
          </div>

          {filtered.length === 0 ? (
            <div className="py-14 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                {empresa
                  ? "Nenhum registro cadastrado para esta empresa."
                  : "Cadastre uma empresa do grupo para começar."}
              </p>
              <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={abrirNovo}>
                <Plus className="h-4 w-4 mr-2" /> {labelNovo}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {colunasDef.map((c) => (
                      <TableHead key={c.key}>{c.label}</TableHead>
                    ))}
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      {colunasDef.map((c) => (
                        <TableCell key={c.key} className={c.mono ? "font-mono text-xs" : undefined}>
                          {statusKey === c.key ? (
                            <Badge variant="secondary" className="rounded-full">{r[c.key] || "—"}</Badge>
                          ) : (
                            r[c.key] || "—"
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => abrirEdicao(r)} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => excluir(r)} aria-label="Excluir">
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
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Como preencher</div>
          <ul className="space-y-1.5 text-sm text-muted-foreground list-disc pl-4">
            {dicas.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar registro" : labelNovo}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campos.map((c) => (
              <div key={c.key} className={c.span === 2 ? "md:col-span-2 space-y-1.5" : "space-y-1.5"}>
                <Label>{c.label}{c.required ? " *" : ""}</Label>
                {c.type === "select" ? (
                  <Select value={draft[c.key] ?? ""} onValueChange={(v) => setDraft((d) => ({ ...d, [c.key]: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {(c.options ?? []).map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
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
                    type={c.type === "date" ? "date" : "text"}
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

      <AssistenteFechamento
        contexto={contexto}
        resumo={`${titulo} · ${empresa?.razao ?? "sem empresa"}`}
      />
    </div>
  );
}
