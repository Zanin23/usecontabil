import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Network, Pencil, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import {
  Badge, Button, Card, CardContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import CabecalhoPagina from "@/components/contabil/cadastros/CabecalhoPagina";
import ListaErros from "@/components/contabil/cadastros/ListaErros";
import { CampoSelecao, CampoTexto } from "@/components/contabil/cadastros/Campos";
import { normalizarBusca } from "@/lib/busca";
import {
  carregarCentrosModelo, colecaoCentros, salvarCentro, TIPOS_CENTRO, useCentros, type CentroCusto,
} from "@/lib/planoContasStore";
import { lancamentosDoCentro } from "@/lib/lancamentosStore";
import { confirmarExclusao } from "@/lib/confirmar";

const vazio = (): CentroCusto => ({ id: "", codigo: "", descricao: "", tipo: "Administrativo", situacao: "Ativo" });

export default function CentrosCusto() {
  const centros = useCentros();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [draft, setDraft] = useState<CentroCusto>(vazio);
  const [erros, setErros] = useState<string[]>([]);

  const filtrados = useMemo(() => {
    const t = normalizarBusca(busca);
    return centros.filter((c) => !t || normalizarBusca(`${c.codigo} ${c.descricao} ${c.tipo} ${c.responsavel ?? ""}`).includes(t));
  }, [centros, busca]);

  const novo = () => {
    const proximo = String(centros.reduce((m, c) => (/^\d+$/.test(c.codigo) ? Math.max(m, Number(c.codigo)) : m), 0) + 1).padStart(2, "0");
    setDraft({ ...vazio(), codigo: proximo });
    setErros([]);
    setAberto(true);
  };
  const salvar = () => {
    const r = salvarCentro(draft);
    if (!r.ok) {
      setErros(r.erros);
      return;
    }
    toast.success(`Centro de custo ${r.registro.codigo} salvo.`);
    setAberto(false);
  };
  const excluir = (c: CentroCusto) => {
    const usos = lancamentosDoCentro(c.id);
    if (usos) {
      toast.error(`O centro ${c.codigo} aparece em ${usos} lançamento(s). Inative-o em vez de excluir.`);
      return;
    }
    if (!confirmarExclusao(`o centro de custo ${c.codigo} — ${c.descricao}`)) return;
    colecaoCentros.remover(c.id);
    toast.success("Centro de custo excluído.");
  };
  const carregarModelo = () => {
    const n = carregarCentrosModelo();
    toast[n ? "success" : "info"](n ? `${n} centro(s) de custo incluído(s).` : "Os centros do modelo já estão cadastrados.");
  };

  return (
    <div className="space-y-6 pb-16">
      <CabecalhoPagina
        trilha={[{ rotulo: "Contábil", para: "/contabil" }, { rotulo: "Cadastros", para: "/contabil/cadastros" }]}
        icone={Network}
        titulo="Centros de custo"
        descricao="Áreas que recebem custos e despesas (ECD, registro I100). Contas marcadas com “exige centro de custo” só aceitam lançamento com um centro."
        acoes={
          <>
            <Button variant="outline" className="rounded-full" onClick={carregarModelo}>
              <Sparkles className="mr-2 h-4 w-4" /> Sugestão de centros
            </Button>
            <Button className="rounded-full" onClick={novo}><Plus className="mr-2 h-4 w-4" /> Novo centro</Button>
          </>
        }
      />
      <Card className="rounded-xl shadow-card">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Buscar centro de custo" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar…" className="rounded-full pl-9" />
            </div>
            <Badge variant="secondary" className="rounded-full">{filtrados.length} centro(s)</Badge>
          </div>
          {filtrados.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Nenhum centro de custo cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.codigo}</TableCell>
                    <TableCell className="font-medium">{c.descricao}</TableCell>
                    <TableCell className="text-xs">{c.tipo}</TableCell>
                    <TableCell className="text-xs">{c.responsavel ?? "—"}</TableCell>
                    <TableCell><Badge variant={c.situacao === "Ativo" ? "secondary" : "outline"} className="rounded-full">{c.situacao}</Badge></TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <Button variant="ghost" size="icon" className="rounded-full" aria-label={`Editar ${c.descricao}`} onClick={() => { setDraft({ ...c }); setErros([]); setAberto(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-full" aria-label={`Excluir ${c.descricao}`} onClick={() => excluir(c)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{draft.id ? `Editar centro ${draft.codigo}` : "Novo centro de custo"}</DialogTitle>
            <DialogDescription>Vale para todas as empresas do grupo.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-6">
            <CampoTexto rotulo="Código" valor={draft.codigo} onChange={(v) => setDraft((d) => ({ ...d, codigo: v }))} obrigatorio mono />
            <CampoTexto rotulo="Descrição" valor={draft.descricao} onChange={(v) => setDraft((d) => ({ ...d, descricao: v }))} obrigatorio span={4} />
            <CampoSelecao rotulo="Tipo" valor={draft.tipo} opcoes={TIPOS_CENTRO} onChange={(v) => setDraft((d) => ({ ...d, tipo: v }))} />
            <CampoTexto rotulo="Responsável" valor={draft.responsavel} onChange={(v) => setDraft((d) => ({ ...d, responsavel: v }))} />
            <CampoSelecao rotulo="Situação" valor={draft.situacao} opcoes={["Ativo", "Inativo"] as const} onChange={(v) => setDraft((d) => ({ ...d, situacao: v }))} />
          </div>
          <ListaErros erros={erros} />
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button className="rounded-full" onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
