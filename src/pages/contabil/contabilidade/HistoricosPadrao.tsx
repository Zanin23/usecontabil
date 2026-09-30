import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MessageSquareText, Pencil, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import {
  Badge, Button, Card, CardContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import CabecalhoPagina from "@/components/contabil/cadastros/CabecalhoPagina";
import ListaErros from "@/components/contabil/cadastros/ListaErros";
import { CampoAreaTexto, CampoSelecao, CampoTexto } from "@/components/contabil/cadastros/Campos";
import { normalizarBusca } from "@/lib/busca";
import {
  carregarHistoricosModelo, colecaoHistoricos, MARCADORES_HISTORICO, montarHistorico, salvarHistorico, useHistoricos,
  type HistoricoPadrao,
} from "@/lib/planoContasStore";
import { confirmarExclusao } from "@/lib/confirmar";

const vazio = (): HistoricoPadrao => ({ id: "", codigo: "", texto: "", situacao: "Ativo" });
const EXEMPLO = { documento: "1234", participante: "Distribuidora Norte Ltda", competencia: "07/2026" };

export default function HistoricosPadrao() {
  const historicos = useHistoricos();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [draft, setDraft] = useState<HistoricoPadrao>(vazio);
  const [erros, setErros] = useState<string[]>([]);

  const filtrados = useMemo(() => {
    const t = normalizarBusca(busca);
    return historicos.filter((h) => !t || normalizarBusca(`${h.codigo} ${h.texto}`).includes(t));
  }, [historicos, busca]);

  const novo = () => {
    const proximo = String(historicos.reduce((m, h) => (/^\d+$/.test(h.codigo) ? Math.max(m, Number(h.codigo)) : m), 0) + 1).padStart(3, "0");
    setDraft({ ...vazio(), codigo: proximo });
    setErros([]);
    setAberto(true);
  };
  const salvar = () => {
    const r = salvarHistorico(draft);
    if (!r.ok) {
      setErros(r.erros);
      return;
    }
    toast.success(`Histórico ${r.registro.codigo} salvo.`);
    setAberto(false);
  };
  const excluir = (h: HistoricoPadrao) => {
    if (!confirmarExclusao(`o histórico ${h.codigo}`, "Os lançamentos já feitos mantêm o texto.")) return;
    colecaoHistoricos.remover(h.id);
    toast.success("Histórico excluído.");
  };
  const carregarModelo = () => {
    const n = carregarHistoricosModelo();
    toast[n ? "success" : "info"](n ? `${n} histórico(s) incluído(s).` : "Os históricos do modelo já estão cadastrados.");
  };

  return (
    <div className="space-y-6 pb-16">
      <CabecalhoPagina
        trilha={[{ rotulo: "Contábil", para: "/contabil" }, { rotulo: "Cadastros", para: "/contabil/cadastros" }]}
        icone={MessageSquareText}
        titulo="Históricos padrão"
        descricao="Textos prontos para os lançamentos. Os marcadores {documento}, {participante} e {competencia} são trocados na hora de lançar."
        acoes={
          <>
            <Button variant="outline" className="rounded-full" onClick={carregarModelo}>
              <Sparkles className="mr-2 h-4 w-4" /> Sugestão de históricos
            </Button>
            <Button className="rounded-full" onClick={novo}><Plus className="mr-2 h-4 w-4" /> Novo histórico</Button>
          </>
        }
      />
      <Card className="rounded-3xl shadow-card">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Buscar histórico" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar…" className="rounded-full pl-9" />
            </div>
            <Badge variant="secondary" className="rounded-full">{filtrados.length} histórico(s)</Badge>
          </div>
          {filtrados.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Nenhum histórico padrão cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Texto</TableHead>
                  <TableHead>Exemplo</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-mono text-xs">{h.codigo}</TableCell>
                    <TableCell className="text-sm">{h.texto}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{montarHistorico(h.texto, EXEMPLO)}</TableCell>
                    <TableCell><Badge variant={h.situacao === "Ativo" ? "secondary" : "outline"} className="rounded-full">{h.situacao}</Badge></TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <Button variant="ghost" size="icon" className="rounded-full" aria-label={`Editar histórico ${h.codigo}`} onClick={() => { setDraft({ ...h }); setErros([]); setAberto(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-full" aria-label={`Excluir histórico ${h.codigo}`} onClick={() => excluir(h)}>
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
            <DialogTitle>{draft.id ? `Editar histórico ${draft.codigo}` : "Novo histórico padrão"}</DialogTitle>
            <DialogDescription>Marcadores disponíveis: {MARCADORES_HISTORICO.join(", ")}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-6">
            <CampoTexto rotulo="Código" valor={draft.codigo} onChange={(v) => setDraft((d) => ({ ...d, codigo: v }))} obrigatorio mono />
            <CampoSelecao rotulo="Situação" valor={draft.situacao} opcoes={["Ativo", "Inativo"] as const} onChange={(v) => setDraft((d) => ({ ...d, situacao: v }))} />
            <CampoAreaTexto rotulo="Texto" valor={draft.texto} onChange={(v) => setDraft((d) => ({ ...d, texto: v }))} placeholder="Pagamento a {participante} ref. {documento}" />
            {draft.texto.trim() ? (
              <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground sm:col-span-6">
                Exemplo: {montarHistorico(draft.texto, EXEMPLO)}
              </p>
            ) : null}
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
