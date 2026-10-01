import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Badge, Button, Card, CardContent, Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { CheckSquare, ChevronRight, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  FASES, FaseSlug, PERIODICIDADES, TarefaModelo, nextModeloId, removeModelo, saveModelo, useGestao,
} from "@/lib/gestaoStore";

const EMPTY: TarefaModelo = {
  id: "", titulo: "", fase: "escrituracao", periodicidade: "Mensal",
  responsavel: "Contabilidade interna", diaPrazo: 10, obrigatoria: true, ativa: true,
};

export default function CadastroTarefas() {
  const { modelos } = useGestao();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TarefaModelo>(EMPTY);
  const [editing, setEditing] = useState(false);

  const filtered = modelos.filter((m) =>
    `${m.id} ${m.titulo} ${m.responsavel} ${m.periodicidade}`.toLowerCase().includes(query.toLowerCase()),
  );

  const openNew = () => { setDraft({ ...EMPTY, id: nextModeloId() }); setEditing(false); setOpen(true); };
  const openEdit = (m: TarefaModelo) => { setDraft(m); setEditing(true); setOpen(true); };

  const handleSave = () => {
    if (!draft.titulo.trim()) { toast.error("Informe o título da tarefa"); return; }
    saveModelo({ ...draft, titulo: draft.titulo.trim(), diaPrazo: Math.min(31, Math.max(1, draft.diaPrazo || 1)) });
    toast.success(`Tarefa ${editing ? "atualizada" : "cadastrada"}`);
    setOpen(false);
  };

  const handleDelete = (m: TarefaModelo) => {
    if (!confirm(`Excluir a tarefa "${m.titulo}"?`)) return;
    removeModelo(m.id);
    toast.success("Tarefa removida");
  };

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/dashboard" className="hover:text-foreground">Início</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/preparativos/servicos" className="hover:text-foreground">Serviços</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Cadastro de tarefas</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-card border border-border grid place-items-center shadow-card">
            <CheckSquare className="h-6 w-6 text-brand-orange" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Preparativos · Serviços
            </div>
            <h1 className="font-display text-4xl mt-1.5">Cadastro de tarefas</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Modelos de tarefas que alimentam as fases e o checklist mensal da gestão do fechamento.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/preparativos/servicos/gestao">Ver gestão</Link>
          </Button>
          <Button
            className="rounded-lg bg-brand-orange text-primary-foreground hover:bg-brand-orange/90"
            onClick={openNew}
          >
            <Plus className="h-4 w-4 mr-2" /> Nova tarefa
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl border-border/70">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por tarefa ou responsável…"
              className="pl-9 rounded-full bg-card"
            />
          </div>
          <Badge variant="outline" className="rounded-full">{modelos.filter((m) => m.ativa).length} ativas</Badge>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/70 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Tarefa</TableHead>
              <TableHead>Fase</TableHead>
              <TableHead>Periodicidade</TableHead>
              <TableHead>Responsável padrão</TableHead>
              <TableHead className="text-right">Prazo</TableHead>
              <TableHead>Obrigatória</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-10">
                  Nenhuma tarefa encontrada.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((m) => (
              <TableRow key={m.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openEdit(m)}>
                <TableCell className="font-mono text-xs">{m.id}</TableCell>
                <TableCell>{m.titulo}</TableCell>
                <TableCell className="text-muted-foreground">
                  {FASES.find((f) => f.slug === m.fase)?.title}
                </TableCell>
                <TableCell className="text-muted-foreground">{m.periodicidade}</TableCell>
                <TableCell className="text-muted-foreground">{m.responsavel}</TableCell>
                <TableCell className="text-right font-mono text-xs">Dia {m.diaPrazo}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{m.obrigatoria ? "Sim" : "Não"}</TableCell>
                <TableCell className={m.ativa ? "text-success" : "text-muted-foreground"}>
                  {m.ativa ? "Ativa" : "Inativa"}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full"
                      onClick={() => openEdit(m)} aria-label="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost"
                      className="h-8 w-8 p-0 rounded-full text-destructive hover:text-destructive"
                      onClick={() => handleDelete(m)} aria-label="Excluir">
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {editing ? "Editar tarefa" : "Nova tarefa"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-3 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Código</Label>
              <Input value={draft.id} disabled className="h-9 rounded-md font-mono text-xs" />
            </div>
            <div className="col-span-9 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tarefa</Label>
              <Input
                value={draft.titulo}
                onChange={(e) => setDraft({ ...draft, titulo: e.target.value })}
                className="h-9 rounded-md"
              />
            </div>
            <div className="col-span-6 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Fase do fechamento</Label>
              <Select value={draft.fase} onValueChange={(v) => setDraft({ ...draft, fase: v as FaseSlug })}>
                <SelectTrigger className="h-9 rounded-md"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FASES.map((f) => <SelectItem key={f.slug} value={f.slug}>{f.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Periodicidade</Label>
              <Select value={draft.periodicidade} onValueChange={(v) => setDraft({ ...draft, periodicidade: v })}>
                <SelectTrigger className="h-9 rounded-md"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIODICIDADES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Prazo (dia)</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={draft.diaPrazo}
                onChange={(e) => setDraft({ ...draft, diaPrazo: Number(e.target.value) })}
                className="h-9 rounded-md font-mono text-xs"
              />
            </div>
            <div className="col-span-12 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Responsável padrão</Label>
              <Input
                value={draft.responsavel}
                onChange={(e) => setDraft({ ...draft, responsavel: e.target.value })}
                className="h-9 rounded-md"
              />
            </div>
            <div className="col-span-6 flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-sm">Obrigatória para encerrar</span>
              <Switch
                checked={draft.obrigatoria}
                onCheckedChange={(v) => setDraft({ ...draft, obrigatoria: v })}
              />
            </div>
            <div className="col-span-6 flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-sm">Tarefa ativa</span>
              <Switch checked={draft.ativa} onCheckedChange={(v) => setDraft({ ...draft, ativa: v })} />
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
