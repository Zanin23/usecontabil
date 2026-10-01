import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Badge, Button, Card, CardContent, Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { Building2, ChevronRight, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  FilialRecord, TIPOS_UNIDADE, UFS, nextFilialId, removeFilial, saveFilial, useFiliais,
} from "@/lib/filiaisStore";
import { useEmpresaAtual } from "@/lib/empresaAtual";

const EMPTY: FilialRecord = {
  id: "", nome: "", tipo: "Filial", empresaId: "", cnpj: "", inscEstadual: "",
  cidade: "", uf: "SP", endereco: "", responsavel: "", email: "", telefone: "",
  centroCusto: "", status: "Ativa",
};

const onlyDigits = (v: string) => v.replace(/\D/g, "");

function maskCnpj(v: string) {
  const d = onlyDigits(v).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export default function Filiais() {
  const { filiais } = useFiliais();
  const { empresas, empresa } = useEmpresaAtual();
  const [query, setQuery] = useState("");
  const [escopo, setEscopo] = useState<"empresa" | "todas">("empresa");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilialRecord>(EMPTY);
  const [editing, setEditing] = useState(false);

  const empresaNome = (id: string) => empresas.find((e) => e.id === id)?.razao ?? "—";

  const escopoLista = useMemo(
    () => (escopo === "empresa" && empresa ? filiais.filter((f) => f.empresaId === empresa.id) : filiais),
    [filiais, escopo, empresa],
  );

  const filtered = escopoLista.filter((f) =>
    `${f.id} ${f.nome} ${f.tipo} ${f.cidade} ${f.uf} ${f.cnpj} ${f.responsavel} ${f.centroCusto}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  const ativas = escopoLista.filter((f) => f.status === "Ativa").length;
  const temMatriz = escopoLista.some((f) => f.tipo === "Matriz" && f.status === "Ativa");

  const openNew = () => {
    setDraft({ ...EMPTY, id: nextFilialId(), empresaId: empresa?.id ?? "" });
    setEditing(false);
    setOpen(true);
  };

  const openEdit = (f: FilialRecord) => {
    setDraft(f);
    setEditing(true);
    setOpen(true);
  };

  const handleSave = () => {
    if (!draft.nome.trim()) { toast.error("Informe o nome da unidade"); return; }
    if (!draft.empresaId) { toast.error("Vincule a unidade a uma empresa do grupo"); return; }
    if (draft.cnpj && onlyDigits(draft.cnpj).length !== 14) {
      toast.error("CNPJ incompleto"); return;
    }
    const duplicada = filiais.some(
      (f) => f.id !== draft.id && f.cnpj && onlyDigits(f.cnpj) === onlyDigits(draft.cnpj) && draft.cnpj,
    );
    if (duplicada) { toast.error("Já existe uma unidade com este CNPJ"); return; }
    if (
      draft.tipo === "Matriz" &&
      filiais.some((f) => f.id !== draft.id && f.empresaId === draft.empresaId && f.tipo === "Matriz")
    ) {
      toast.error("Esta empresa já possui uma matriz cadastrada"); return;
    }
    saveFilial({ ...draft, nome: draft.nome.trim() });
    toast.success(`Unidade "${draft.nome.trim()}" ${editing ? "atualizada" : "cadastrada"}`);
    setOpen(false);
  };

  const handleDelete = (f: FilialRecord) => {
    if (!confirm(`Excluir a unidade "${f.nome}"?`)) return;
    removeFilial(f.id);
    toast.success("Unidade removida");
  };

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/dashboard" className="hover:text-foreground">Início</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/preparativos" className="hover:text-foreground">Preparativos</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/preparativos/cadastros" className="hover:text-foreground">Cadastros</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Filiais e unidades</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-card border border-border grid place-items-center shadow-card">
            <Building2 className="h-6 w-6 text-brand-orange" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Preparativos · Cadastros
            </div>
            <h1 className="font-display text-4xl mt-1.5">Filiais e unidades</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Matriz, filiais e unidades operacionais vinculadas às empresas do grupo.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/preparativos/cadastros/empresas">Empresas do grupo</Link>
          </Button>
          <Button
            className="rounded-lg bg-brand-orange text-primary-foreground hover:bg-brand-orange/90"
            onClick={openNew}
            disabled={empresas.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" /> Nova unidade
          </Button>
        </div>
      </div>

      {empresas.length === 0 && (
        <Card className="rounded-2xl border-border/70">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Cadastre uma empresa do grupo antes de criar unidades.{" "}
            <Link to="/preparativos/cadastros/empresas/novo" className="text-brand-orange hover:underline">
              Cadastrar empresa
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border-border/70">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Unidades</div>
            <div className="font-display text-3xl mt-2">{escopoLista.length}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/70">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ativas</div>
            <div className="font-display text-3xl mt-2 text-success">{ativas}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/70">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Matriz definida</div>
            <div className={`font-display text-3xl mt-2 ${temMatriz ? "text-success" : "text-brand-orange"}`}>
              {temMatriz ? "Sim" : "Não"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/70">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por unidade, cidade, CNPJ ou responsável…"
              className="pl-9 rounded-full bg-card"
            />
          </div>
          <Select value={escopo} onValueChange={(v) => setEscopo(v as "empresa" | "todas")}>
            <SelectTrigger className="h-10 w-[240px] rounded-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="empresa">Empresa selecionada</SelectItem>
              <SelectItem value="todas">Todas as empresas do grupo</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="rounded-full">{filtered.length} exibidas</Badge>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/70 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>{escopo === "empresa" ? empresa?.razao ?? "Nenhuma empresa selecionada" : "Todas as empresas"}</span>
          <span className="font-mono uppercase tracking-widest">Ambiente HOMOLOGAÇÃO</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Cidade / UF</TableHead>
              <TableHead>Responsável interno</TableHead>
              <TableHead>Centro de custo</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-10">
                  Nenhuma unidade cadastrada.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((f) => (
              <TableRow key={f.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openEdit(f)}>
                <TableCell className="font-mono text-xs">{f.id}</TableCell>
                <TableCell>{f.nome}</TableCell>
                <TableCell className="text-muted-foreground">{f.tipo}</TableCell>
                <TableCell className="text-muted-foreground">{empresaNome(f.empresaId)}</TableCell>
                <TableCell className="font-mono text-xs">{f.cnpj || "—"}</TableCell>
                <TableCell>{f.cidade ? `${f.cidade}/${f.uf}` : "—"}</TableCell>
                <TableCell className="text-muted-foreground">{f.responsavel || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{f.centroCusto || "—"}</TableCell>
                <TableCell className={f.status === "Ativa" ? "text-success" : "text-muted-foreground"}>
                  {f.status}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full"
                      onClick={() => openEdit(f)} aria-label="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost"
                      className="h-8 w-8 p-0 rounded-full text-destructive hover:text-destructive"
                      onClick={() => handleDelete(f)} aria-label="Excluir">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {editing ? "Editar unidade" : "Nova unidade"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-3 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Código</Label>
              <Input value={draft.id} disabled className="h-9 rounded-md font-mono text-xs" />
            </div>
            <div className="col-span-6 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nome da unidade</Label>
              <Input
                value={draft.nome}
                onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
                placeholder="Ex.: Filial Sul"
                className="h-9 rounded-md"
              />
            </div>
            <div className="col-span-3 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={draft.tipo} onValueChange={(v) => setDraft({ ...draft, tipo: v })}>
                <SelectTrigger className="h-9 rounded-md"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_UNIDADE.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-6 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Empresa do grupo</Label>
              <Select value={draft.empresaId} onValueChange={(v) => setDraft({ ...draft, empresaId: v })}>
                <SelectTrigger className="h-9 rounded-md">
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.razao}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3 space-y-1.5">
              <Label className="text-xs text-muted-foreground">CNPJ da unidade</Label>
              <Input
                value={draft.cnpj}
                onChange={(e) => setDraft({ ...draft, cnpj: maskCnpj(e.target.value) })}
                placeholder="00.000.000/0000-00"
                className="h-9 rounded-md font-mono text-xs"
              />
            </div>
            <div className="col-span-3 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Inscrição estadual</Label>
              <Input
                value={draft.inscEstadual}
                onChange={(e) => setDraft({ ...draft, inscEstadual: e.target.value })}
                className="h-9 rounded-md"
              />
            </div>

            <div className="col-span-6 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Endereço</Label>
              <Input
                value={draft.endereco}
                onChange={(e) => setDraft({ ...draft, endereco: e.target.value })}
                className="h-9 rounded-md"
              />
            </div>
            <div className="col-span-4 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cidade</Label>
              <Input
                value={draft.cidade}
                onChange={(e) => setDraft({ ...draft, cidade: e.target.value })}
                className="h-9 rounded-md"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs text-muted-foreground">UF</Label>
              <Select value={draft.uf} onValueChange={(v) => setDraft({ ...draft, uf: v })}>
                <SelectTrigger className="h-9 rounded-md"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UFS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-4 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Responsável interno</Label>
              <Input
                value={draft.responsavel}
                onChange={(e) => setDraft({ ...draft, responsavel: e.target.value })}
                className="h-9 rounded-md"
              />
            </div>
            <div className="col-span-4 space-y-1.5">
              <Label className="text-xs text-muted-foreground">E-mail</Label>
              <Input
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                className="h-9 rounded-md"
              />
            </div>
            <div className="col-span-4 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Telefone</Label>
              <Input
                value={draft.telefone}
                onChange={(e) => setDraft({ ...draft, telefone: e.target.value })}
                className="h-9 rounded-md"
              />
            </div>

            <div className="col-span-6 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Centro de custo</Label>
              <Input
                value={draft.centroCusto}
                onChange={(e) => setDraft({ ...draft, centroCusto: e.target.value })}
                placeholder="Ex.: CC-1020"
                className="h-9 rounded-md font-mono text-xs"
              />
            </div>
            <div className="col-span-6 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Situação</Label>
              <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                <SelectTrigger className="h-9 rounded-md"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativa">Ativa</SelectItem>
                  <SelectItem value="Inativa">Inativa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              className="rounded-lg bg-brand-orange text-primary-foreground hover:bg-brand-orange/90"
              onClick={handleSave}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
