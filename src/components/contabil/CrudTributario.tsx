import { useMemo, useState } from "react";
import {
  Badge, Button, Card, CardContent, Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { Database, Pencil, Plus, Search, Trash2, type LucideIcon } from "lucide-react";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { parseNumeroBR } from "@/lib/numeros";
import { confirmarDemonstracao } from "@/lib/confirmar";
import { confirmarExclusao } from "@/lib/confirmar";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import AssistenteCampos from "@/components/contabil/AssistenteCampos";

export type CampoTributario = {
  key: string;
  label: string;
  type?: "text" | "number" | "select" | "textarea" | "switch";
  options?: string[];
  required?: boolean;
  placeholder?: string;
  mono?: boolean;
  align?: "right";
  span?: 1 | 2 | 3;
  ajuda?: string;
  coluna?: boolean;
};

export type RegistroTributario = { id: string } & Record<string, unknown>;

export default function CrudTributario({
  titulo, descricao, icone: Icone, campos, registros, prefixoId, labelNovo,
  onSalvar, onRemover, kpis, dicas, onDemonstracao, modulo = "Financeiro › Cadastros",
}: {
  titulo: string;
  descricao: string;
  icone: LucideIcon;
  campos: CampoTributario[];
  registros: RegistroTributario[];
  prefixoId: string;
  labelNovo: string;
  onSalvar: (r: RegistroTributario) => void;
  onRemover: (id: string) => void;
  kpis?: { label: string; valor: string }[];
  dicas: string[];
  onDemonstracao?: () => void;
  modulo?: string;
}) {
  const { empresa } = useEmpresaAtual();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const colunas = campos.filter((c) => c.coluna);

  const filtrados = useMemo(
    () => registros.filter((r) =>
      campos.map((c) => String(r[c.key] ?? "")).join(" ").toLowerCase().includes(query.toLowerCase()),
    ),
    [registros, query, campos],
  );

  const abrirNovo = () => {
    if (!empresa) return toast.error("Selecione uma empresa no topo da tela.");
    const base: Record<string, string> = {};
    campos.forEach((c) => {
      base[c.key] = c.type === "select" ? (c.options?.[0] ?? "") : c.type === "switch" ? "sim" : "";
    });
    setDraft(base);
    setEditando(false);
    setOpen(true);
  };

  const abrirEdicao = (r: RegistroTributario) => {
    const base: Record<string, string> = { id: r.id };
    campos.forEach((c) => {
      const v = r[c.key];
      base[c.key] = c.type === "switch" ? (v ? "sim" : "não") : v === undefined || v === null ? "" : String(v);
    });
    setDraft(base);
    setEditando(true);
    setOpen(true);
  };

  const salvar = () => {
    const faltando = campos.filter((c) => c.required && !(draft[c.key] ?? "").trim());
    if (faltando.length) return toast.error(`Preencha: ${faltando.map((c) => c.label).join(", ")}`);
    const registro: RegistroTributario = { id: draft.id || `${prefixoId}-${Date.now().toString(36)}` };
    campos.forEach((c) => {
      const v = draft[c.key] ?? "";
      registro[c.key] =
        c.type === "number" ? parseNumeroBR(v) ?? 0
        : c.type === "switch" ? v === "sim"
        : v;
    });
    onSalvar(registro);
    setOpen(false);
    toast.success(editando ? "Cadastro atualizado." : "Cadastro criado.");
  };

  const contexto = {
    tela: titulo,
    modulo,
    empresa: empresa ? { razao: empresa.razao, cnpj: empresa.cnpj, regime: empresa.regime } : null,
    totalRegistros: registros.length,
    registros: registros.slice(0, 30),
    orientacoes: dicas,
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-orange/15">
            <Icone className="h-5 w-5 text-brand-orange" />
          </div>
          <div>
            <h1 className="font-display text-2xl leading-tight">{titulo}</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">{descricao}</p>
            <Badge variant="secondary" className="mt-2 rounded-full">
              {empresa?.razao ?? "Nenhuma empresa selecionada"}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onDemonstracao && registros.length === 0 ? (
            <Button variant="outline" className="rounded-full" onClick={() => { if (confirmarDemonstracao(empresa?.razao)) onDemonstracao(); }}>
              <Database className="mr-2 h-4 w-4" /> Carregar demonstração
            </Button>
          ) : null}
          <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={abrirNovo}>
            <Plus className="mr-2 h-4 w-4" /> {labelNovo}
          </Button>
        </div>
      </div>

      {kpis?.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <Card key={k.label} className="rounded-3xl shadow-card">
              <CardContent className="p-4">
                <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{k.label}</div>
                <div className="mt-1 font-display text-xl">{k.valor}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <Card className="rounded-3xl shadow-card">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar cadastro…" className="rounded-full pl-9" />
            </div>
            <Badge variant="secondary" className="rounded-full">{filtrados.length} registro(s)</Badge>
          </div>

          {filtrados.length === 0 ? (
            <div className="space-y-3 py-14 text-center">
              <p className="text-sm text-muted-foreground">Nenhum registro cadastrado ainda.</p>
              <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={abrirNovo}>
                <Plus className="mr-2 h-4 w-4" /> {labelNovo}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {colunas.map((c) => (
                      <TableHead key={c.key} className={c.align === "right" ? "text-right" : undefined}>{c.label}</TableHead>
                    ))}
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((r) => (
                    <TableRow key={r.id}>
                      {colunas.map((c) => {
                        const v = r[c.key];
                        const texto = c.type === "switch" ? (v ? "Sim" : "Não") : v === undefined || v === "" ? "—" : String(v);
                        return (
                          <TableCell key={c.key} className={[c.mono ? "font-mono text-xs" : "", c.align === "right" ? "text-right" : ""].join(" ").trim() || undefined}>
                            {texto}
                          </TableCell>
                        );
                      })}
                      <TableCell className="whitespace-nowrap text-right">
                        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Editar" onClick={() => abrirEdicao(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Excluir"
                          onClick={() => { if (!confirmarExclusao("este registro")) return; onRemover(r.id); toast.success("Registro removido."); }}>
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
          <div className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Como usar este cadastro</div>
          <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
            {dicas.map((d) => <li key={d}>{d}</li>)}
          </ul>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar cadastro" : labelNovo}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-6">
            {campos.map((c) => {
              const span = c.span ?? 2;
              const cls = span === 1 ? "sm:col-span-1" : span === 3 ? "sm:col-span-6" : "sm:col-span-2";
              return (
                <div key={c.key} className={`space-y-1.5 ${cls}`}>
                  <Label className="text-xs">{c.label}{c.required ? " *" : ""}</Label>
                  {c.type === "select" || c.type === "switch" ? (
                    <Select value={draft[c.key] ?? ""} onValueChange={(v) => setDraft({ ...draft, [c.key]: v })}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {(c.type === "switch" ? ["sim", "não"] : c.options ?? []).map((o) => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : c.type === "textarea" ? (
                    <Textarea className="rounded-xl" value={draft[c.key] ?? ""} placeholder={c.placeholder}
                      onChange={(e) => setDraft({ ...draft, [c.key]: e.target.value })} />
                  ) : (
                    <Input className={`rounded-xl ${c.mono ? "font-mono text-xs" : ""}`} value={draft[c.key] ?? ""} placeholder={c.placeholder}
                      onChange={(e) => setDraft({ ...draft, [c.key]: e.target.value })} />
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter className="gap-2">
            <AssistenteCampos
              titulo={titulo}
              campos={campos.map((c) => ({ key: c.key, label: c.label, ajuda: c.ajuda }))}
              draft={draft}
              contextoExtra={{ modulo, empresa: empresa?.razao }}
            />
            <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssistenteFechamento contexto={contexto} resumo={`${titulo} — ${registros.length} registro(s)`} rotulo="IA ajudante" />
    </div>
  );
}
