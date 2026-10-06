import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Badge, Button, Card, CardContent, Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { ChevronRight, Layers, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  AtividadeRecord, TIPOS_ATIVIDADE, nextAtividadeId, removeAtividade, saveAtividade,
  useAtividades,
} from "@/lib/atividadesStore";
import { classeAtividadeIdDe, loadEmpresas } from "@/lib/empresasStore";

const EMPTY: AtividadeRecord = {
  id: "", cnae: "", descricao: "", tipo: "Serviços", grupo: "", aliqIss: "", status: "Ativa",
};

export default function ClasseAtividades() {
  const { atividades } = useAtividades();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AtividadeRecord>(EMPTY);
  const [editing, setEditing] = useState(false);

  const empresas = loadEmpresas();
  const usoPorClasse = useMemo(() => {
    const map = new Map<string, number>();
    empresas.forEach((e) => {
      const id = classeAtividadeIdDe(e.raw);
      if (id) map.set(id, (map.get(id) ?? 0) + 1);
    });
    return map;
  }, [empresas]);

  const filtered = atividades.filter((a) =>
    `${a.cnae} ${a.descricao} ${a.tipo} ${a.grupo}`.toLowerCase().includes(query.toLowerCase()),
  );

  const openNew = () => {
    setDraft({ ...EMPTY, id: nextAtividadeId() });
    setEditing(false);
    setOpen(true);
  };

  const openEdit = (a: AtividadeRecord) => {
    setDraft(a);
    setEditing(true);
    setOpen(true);
  };

  const handleSave = () => {
    if (!draft.cnae.trim()) { toast.error("Informe o código CNAE"); return; }
    if (!draft.descricao.trim()) { toast.error("Informe a descrição da atividade"); return; }
    saveAtividade({ ...draft, aliqIss: draft.aliqIss.trim() || "—", grupo: draft.grupo.trim() || draft.tipo });
    toast.success(`Classe "${draft.cnae}" ${editing ? "atualizada" : "cadastrada"}`);
    setOpen(false);
  };

  const handleDelete = (a: AtividadeRecord) => {
    const uso = usoPorClasse.get(a.id) ?? 0;
    if (uso > 0) {
      toast.error(`Classe vinculada a ${uso} empresa(s). Altere o vínculo antes de excluir.`);
      return;
    }
    if (!confirm(`Excluir a classe "${a.cnae} — ${a.descricao}"?`)) return;
    removeAtividade(a.id);
    toast.success("Classe removida");
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
        <span className="text-foreground">Classe de atividades</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-card border border-border grid place-items-center shadow-card">
            <Layers className="h-6 w-6 text-brand-orange" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Preparativos · Cadastros
            </div>
            <h1 className="font-display text-4xl mt-1.5">Classe de atividades</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Classificação CNAE usada no cadastro das empresas do grupo e nos resumos por atividade.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/preparativos/cadastros/resumo-classe-atividades">Ver resumo</Link>
          </Button>
          <Button
            className="rounded-lg bg-brand-orange text-primary-foreground hover:bg-brand-orange/90"
            onClick={openNew}
          >
            <Plus className="h-4 w-4 mr-2" /> Nova classe
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
              placeholder="Buscar por CNAE, descrição ou grupo…"
              className="pl-9 rounded-full bg-card"
            />
          </div>
          <Badge variant="outline" className="rounded-full">{atividades.length} classes</Badge>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/70 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtered.length} registros exibidos</span>
          <span className="font-mono uppercase tracking-widest">Ambiente HOMOLOGAÇÃO</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>CNAE</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead className="text-right">Alíq. ISS</TableHead>
              <TableHead className="text-right">Empresas</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-10">
                  Nenhuma classe encontrada.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((a) => (
              <TableRow key={a.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openEdit(a)}>
                <TableCell className="font-mono text-xs">{a.id}</TableCell>
                <TableCell className="font-mono text-xs">{a.cnae}</TableCell>
                <TableCell>{a.descricao}</TableCell>
                <TableCell>{a.tipo}</TableCell>
                <TableCell className="text-muted-foreground">{a.grupo}</TableCell>
                <TableCell className="text-right font-mono text-xs">{a.aliqIss}</TableCell>
                <TableCell className="text-right font-mono text-xs">{usoPorClasse.get(a.id) ?? 0}</TableCell>
                <TableCell className={a.status === "Ativa" ? "text-success" : "text-muted-foreground"}>
                  {a.status}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full"
                      onClick={() => openEdit(a)} aria-label="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost"
                      className="h-8 w-8 p-0 rounded-full text-destructive hover:text-destructive"
                      onClick={() => handleDelete(a)} aria-label="Excluir">
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {editing ? "Editar classe de atividade" : "Nova classe de atividade"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-4 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Código</Label>
              <Input value={draft.id} disabled className="h-9 rounded-md font-mono text-xs" />
            </div>
            <div className="col-span-8 space-y-1.5">
              <Label className="text-xs text-muted-foreground">CNAE</Label>
              <Input
                value={draft.cnae}
                onChange={(e) => setDraft({ ...draft, cnae: e.target.value })}
                placeholder="0000-0/00"
                className="h-9 rounded-md"
              />
            </div>
            <div className="col-span-12 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Descrição</Label>
              <Input
                value={draft.descricao}
                onChange={(e) => setDraft({ ...draft, descricao: e.target.value })}
                className="h-9 rounded-md"
              />
            </div>
            <div className="col-span-6 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={draft.tipo} onValueChange={(v) => setDraft({ ...draft, tipo: v })}>
                <SelectTrigger className="h-9 rounded-md"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_ATIVIDADE.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-6 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Grupo (resumo)</Label>
              <Input
                value={draft.grupo}
                onChange={(e) => setDraft({ ...draft, grupo: e.target.value })}
                placeholder="Ex.: Indústria metalúrgica"
                className="h-9 rounded-md"
              />
            </div>
            <div className="col-span-6 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Alíquota ISS</Label>
              <Input
                value={draft.aliqIss}
                onChange={(e) => setDraft({ ...draft, aliqIss: e.target.value })}
                placeholder="Ex.: 2,50%"
                className="h-9 rounded-md"
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
