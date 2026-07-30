import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Ban, CheckCircle2, ChevronRight, ClipboardList, Download, Gavel, PackageCheck, Pencil, Plus,
  Search, Send, ShoppingCart, ThumbsDown, Trash2, Truck, XCircle,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle,
  Input, Label, Progress, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea,
} from "@/design-system/mj-design-system-db98fa";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import AssistenteCampos, { type CampoAjuda } from "@/components/contabil/AssistenteCampos";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import {
  CENTROS_CUSTO, COMPRAS_EVENT, CONDICOES_PAGAMENTO, SETORES, TIPOS_FRETE, UNIDADES,
  abrirCotacao, adjudicarCotacao, aprovarRequisicao, brl, cancelarCotacao, cancelarPedido,
  cancelarRequisicao, dataBR, enviarParaAprovacao, excluirPedido, excluirProposta, excluirRequisicao,
  hojeISO, julgarCotacao, listarCotacoes, listarPedidos, listarRequisicoes, marcarEmTransito,
  novoItem, novoNumeroRequisicao, pedidosPorFornecedor, percentualRecebido, recebidoPedido,
  registrarRecebimento, reprovarRequisicao, resumoCotacoes, resumoPedidos, resumoRequisicoes,
  salvarProposta, salvarRequisicao, somarDias, totalPedido, totalRequisicao,
  type Cotacao, type CriterioJulgamento, type ItemRequisicao, type Pedido, type Prioridade,
  type Proposta, type Requisicao,
} from "@/lib/comprasStore";

/* ============================== apoio visual ============================= */

const TELAS: Record<string, { titulo: string; desc: string; icon: typeof ClipboardList }> = {
  requisicoes: {
    titulo: "Requisições de compra",
    desc: "Solicitações internas por setor e centro de custo, com fluxo de aprovação e abertura de cotação.",
    icon: ClipboardList,
  },
  cotacoes: {
    titulo: "Cotações",
    desc: "Mapa comparativo de propostas por fornecedor, julgamento por critério e adjudicação em pedido.",
    icon: ShoppingCart,
  },
  pedidos: {
    titulo: "Pedidos de compra",
    desc: "Pedidos emitidos, previsão de entrega e controle de recebimento total ou parcial.",
    icon: Truck,
  },
};

const CHART_TOOLTIP = {
  contentStyle: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    fontSize: 12,
    color: "var(--foreground)",
  },
} as const;

function Kpi({ label, valor, hint, tom }: { label: string; valor: string; hint?: string; tom?: "alerta" | "ok" | "destaque" }) {
  const borda = tom === "alerta" ? "border-destructive/40 bg-destructive/5"
    : tom === "ok" ? "border-emerald-500/40 bg-emerald-500/5"
      : tom === "destaque" ? "border-brand-orange/40 bg-brand-orange/5"
        : "border-border/70";
  const cor = tom === "alerta" ? "text-destructive"
    : tom === "ok" ? "text-emerald-600 dark:text-emerald-400"
      : tom === "destaque" ? "text-brand-orange" : "";
  return (
    <div className={`min-w-0 rounded-2xl border p-4 ${borda}`}>
      <div className="text-[10px] uppercase leading-tight tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className={`mt-1 break-words font-mono text-lg ${cor}`}>{valor}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

const tomStatus = (s: string) =>
  ["Aprovada", "Recebido", "Adjudicada", "Atendida"].includes(s) ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
    : ["Reprovada", "Cancelada", "Cancelado", "Deserta"].includes(s) ? "bg-destructive/15 text-destructive"
      : ["Aguardando aprovação", "Em cotação", "Em trânsito", "Recebido parcial", "Em análise"].includes(s)
        ? "bg-brand-orange/15 text-brand-orange"
        : "bg-muted text-muted-foreground";

const tomPrioridade = (p: Prioridade) =>
  p === "Urgente" ? "bg-destructive/15 text-destructive"
    : p === "Alta" ? "bg-brand-orange/15 text-brand-orange"
      : p === "Baixa" ? "bg-muted text-muted-foreground"
        : "bg-brand-blue/15 text-brand-blue";

function useRefresh() {
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    window.addEventListener(COMPRAS_EVENT, refresh);
    return () => window.removeEventListener(COMPRAS_EVENT, refresh);
  }, [refresh]);
  return tick;
}

function exportarCSV(nome: string, linhas: Record<string, string | number>[]) {
  if (!linhas.length) { toast.error("Nada para exportar nesta visão."); return; }
  const cabecalho = Object.keys(linhas[0]);
  const csv = [cabecalho.join(";"), ...linhas.map((l) => cabecalho.map((c) => String(l[c] ?? "").replace(/;/g, ",")).join(";"))].join("\n");
  const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = `${nome}.csv`; a.click();
  URL.revokeObjectURL(url);
  toast.success("Relatório exportado em CSV.");
}

const num = (v: string) => Number(String(v).replace(/\./g, "").replace(",", ".")) || 0;

/* ============================ requisições ================================ */

const CAMPOS_REQ: CampoAjuda[] = [
  { key: "numero", label: "Número da requisição", ajuda: "Sequencial automático (RQ-0000). Serve de referência para a cotação e o pedido gerados." },
  { key: "solicitante", label: "Solicitante", required: true, ajuda: "Quem pediu a compra. É o responsável por justificar a necessidade na aprovação." },
  { key: "setor", label: "Setor", ajuda: "Área requisitante. Define a alçada de aprovação usual." },
  { key: "centroCusto", label: "Centro de custo", ajuda: "Onde a despesa ou o estoque será apropriado contabilmente." },
  { key: "contaContabil", label: "Conta contábil", ajuda: "Conta prevista no plano de contas: estoque, imobilizado ou despesa operacional." },
  { key: "necessidade", label: "Data de necessidade", ajuda: "Quando o item precisa estar disponível. Orienta o prazo aceitável na cotação." },
  { key: "prioridade", label: "Prioridade", ajuda: "Urgente permite compra direta com menos propostas; normal segue a concorrência padrão." },
  { key: "justificativa", label: "Justificativa", ajuda: "Motivo técnico da compra. É o que sustenta a aprovação e a auditoria posterior." },
  { key: "itens", label: "Itens", required: true, ajuda: "Descrição, unidade, quantidade e valor estimado. O estimado é a base para medir a economia obtida na cotação." },
];

function DialogRequisicao({ registro, onClose }: { registro: Requisicao | "novo"; onClose: () => void }) {
  const novo = registro === "novo";
  const atual = novo ? null : registro;
  const { empresa } = useEmpresaAtual();
  const [form, setForm] = useState({
    numero: atual?.numero || novoNumeroRequisicao(),
    solicitante: atual?.solicitante || "",
    setor: atual?.setor || SETORES[0],
    centroCusto: atual?.centroCusto || CENTROS_CUSTO[0],
    contaContabil: atual?.contaContabil || "",
    data: atual?.data || hojeISO(),
    necessidade: atual?.necessidade || somarDias(hojeISO(), 15),
    prioridade: (atual?.prioridade || "Normal") as Prioridade,
    justificativa: atual?.justificativa || "",
  });
  const [itens, setItens] = useState<ItemRequisicao[]>(atual?.itens?.length ? atual.itens.map((i) => ({ ...i })) : [novoItem()]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setItem = (id: string, patch: Partial<ItemRequisicao>) =>
    setItens((l) => l.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const total = itens.reduce((s, i) => s + i.quantidade * i.valorEstimado, 0);

  const salvar = () => {
    try {
      salvarRequisicao({
        ...form,
        id: atual?.id,
        empresaId: empresa?.id,
        status: atual?.status || "Rascunho",
        aprovador: atual?.aprovador,
        aprovadoEm: atual?.aprovadoEm,
        itens,
      });
      toast.success(novo ? "Requisição criada." : "Requisição atualizada.");
      onClose();
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{novo ? "Nova requisição de compra" : `Requisição ${form.numero}`}</DialogTitle>
        </DialogHeader>

        <div className="mb-2 flex justify-end">
          <AssistenteCampos titulo="Requisição de compra" campos={CAMPOS_REQ} draft={Object.fromEntries(Object.entries(form).map(([k, v]) => [k, String(v)]))} />
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-3 space-y-1.5">
            <Label className="text-xs">Número</Label>
            <Input className="font-mono" value={form.numero} onChange={(e) => set("numero", e.target.value)} />
          </div>
          <div className="col-span-5 space-y-1.5">
            <Label className="text-xs">Solicitante *</Label>
            <Input value={form.solicitante} onChange={(e) => set("solicitante", e.target.value)} placeholder="Nome do responsável" />
          </div>
          <div className="col-span-4 space-y-1.5">
            <Label className="text-xs">Setor</Label>
            <Select value={form.setor} onValueChange={(v) => set("setor", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SETORES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="col-span-4 space-y-1.5">
            <Label className="text-xs">Centro de custo</Label>
            <Select value={form.centroCusto} onValueChange={(v) => set("centroCusto", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CENTROS_CUSTO.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-5 space-y-1.5">
            <Label className="text-xs">Conta contábil</Label>
            <Input value={form.contaContabil} onChange={(e) => set("contaContabil", e.target.value)} placeholder="1.1.03.001 — Estoque de matéria-prima" />
          </div>
          <div className="col-span-3 space-y-1.5">
            <Label className="text-xs">Prioridade</Label>
            <Select value={form.prioridade} onValueChange={(v) => set("prioridade", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(["Baixa", "Normal", "Alta", "Urgente"] as Prioridade[]).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="col-span-3 space-y-1.5">
            <Label className="text-xs">Data da requisição</Label>
            <Input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} />
          </div>
          <div className="col-span-3 space-y-1.5">
            <Label className="text-xs">Data de necessidade</Label>
            <Input type="date" value={form.necessidade} onChange={(e) => set("necessidade", e.target.value)} />
          </div>
          <div className="col-span-6 space-y-1.5">
            <Label className="text-xs">Justificativa</Label>
            <Input value={form.justificativa} onChange={(e) => set("justificativa", e.target.value)} placeholder="Motivo técnico da compra" />
          </div>

          <div className="col-span-12">
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Itens solicitados *</Label>
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => setItens((l) => [...l, novoItem()])}>
                <Plus className="mr-1 h-3.5 w-3.5" />Adicionar item
              </Button>
            </div>
            <div className="rounded-2xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-24">Unidade</TableHead>
                    <TableHead className="w-28 text-right">Quantidade</TableHead>
                    <TableHead className="w-36 text-right">Valor estimado</TableHead>
                    <TableHead className="w-32 text-right">Total</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell><Input value={i.descricao} onChange={(e) => setItem(i.id, { descricao: e.target.value })} placeholder="Item ou serviço" /></TableCell>
                      <TableCell>
                        <Select value={i.unidade} onValueChange={(v) => setItem(i.id, { unidade: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input className="text-right font-mono" inputMode="decimal" value={String(i.quantidade)} onChange={(e) => setItem(i.id, { quantidade: num(e.target.value) })} /></TableCell>
                      <TableCell><Input className="text-right font-mono" inputMode="decimal" value={String(i.valorEstimado)} onChange={(e) => setItem(i.id, { valorEstimado: num(e.target.value) })} /></TableCell>
                      <TableCell className="text-right font-mono text-sm">{brl(i.quantidade * i.valorEstimado)}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => setItens((l) => (l.length > 1 ? l.filter((x) => x.id !== i.id) : l))}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="col-span-12 rounded-2xl border border-brand-orange/40 bg-brand-orange/5 p-4">
            <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Valor estimado da requisição</div>
            <div className="mt-1 font-mono text-lg text-brand-orange">{brl(total)}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">Base de comparação para medir a economia obtida na cotação.</div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" className="rounded-full" onClick={onClose}>Cancelar</Button>
          <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={salvar}>Salvar requisição</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DialogAprovacao({ requisicao, onClose }: { requisicao: Requisicao; onClose: () => void }) {
  const [aprovador, setAprovador] = useState("Controladoria");
  const [motivo, setMotivo] = useState("");

  const aprovar = () => {
    try { aprovarRequisicao(requisicao.id, aprovador); toast.success(`${requisicao.numero} aprovada.`); onClose(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const reprovar = () => {
    try { reprovarRequisicao(requisicao.id, aprovador, motivo); toast.success(`${requisicao.numero} reprovada.`); onClose(); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle className="font-display text-2xl">Aprovar requisição {requisicao.numero}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 p-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-muted-foreground">Solicitante</span><div>{requisicao.solicitante} · {requisicao.setor}</div></div>
              <div><span className="text-muted-foreground">Centro de custo</span><div>{requisicao.centroCusto}</div></div>
              <div><span className="text-muted-foreground">Necessidade</span><div className="font-mono">{dataBR(requisicao.necessidade)}</div></div>
              <div><span className="text-muted-foreground">Valor estimado</span><div className="font-mono">{brl(totalRequisicao(requisicao))}</div></div>
            </div>
            <div className="mt-3 text-muted-foreground">{requisicao.justificativa || "Sem justificativa informada."}</div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Aprovador</Label>
            <Input value={aprovador} onChange={(e) => setAprovador(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Motivo (obrigatório apenas para reprovar)</Label>
            <Textarea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" className="rounded-full" onClick={reprovar}><ThumbsDown className="mr-1 h-4 w-4" />Reprovar</Button>
          <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={aprovar}><CheckCircle2 className="mr-1 h-4 w-4" />Aprovar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DialogAbrirCotacao({ requisicao, onClose }: { requisicao: Requisicao; onClose: () => void }) {
  const [comprador, setComprador] = useState("Suprimentos");
  const [criterio, setCriterio] = useState<CriterioJulgamento>("Melhor custo-benefício");
  const [encerramento, setEncerramento] = useState(somarDias(hojeISO(), 10));

  const abrir = () => {
    try {
      const c = abrirCotacao(requisicao.id, comprador, criterio, encerramento);
      toast.success(`Cotação ${c.numero} aberta a partir de ${requisicao.numero}.`);
      onClose();
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle className="font-display text-2xl">Abrir cotação — {requisicao.numero}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs">Comprador responsável</Label>
            <Input value={comprador} onChange={(e) => setComprador(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Critério de julgamento</Label>
            <Select value={criterio} onValueChange={(v) => setCriterio(v as CriterioJulgamento)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["Menor preço", "Menor prazo", "Melhor custo-benefício"] as CriterioJulgamento[]).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Encerramento</Label>
            <Input type="date" value={encerramento} onChange={(e) => setEncerramento(e.target.value)} />
          </div>
          <div className="col-span-2 rounded-2xl border border-border/70 p-3 text-xs text-muted-foreground">
            {requisicao.itens.length} item(ns) serão transferidos para a cotação. A requisição passa a "Em cotação" e exige ao menos 2 propostas para julgamento.
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" className="rounded-full" onClick={onClose}>Cancelar</Button>
          <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={abrir}>Abrir cotação</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Requisicoes() {
  useRefresh();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [edicao, setEdicao] = useState<Requisicao | "novo" | null>(null);
  const [aprovacao, setAprovacao] = useState<Requisicao | null>(null);
  const [cotar, setCotar] = useState<Requisicao | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);

  const todas = listarRequisicoes();
  const lista = useMemo(() => todas.filter((r) => {
    const okStatus = status === "todos" || r.status === status;
    const t = busca.trim().toLowerCase();
    const okBusca = !t || [r.numero, r.solicitante, r.setor, r.centroCusto, ...r.itens.map((i) => i.descricao)]
      .join(" ").toLowerCase().includes(t);
    return okStatus && okBusca;
  }), [todas, busca, status]);

  const resumo = resumoRequisicoes(todas);

  const acao = (fn: () => void, msg: string) => {
    try { fn(); toast.success(msg); } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Requisições ativas" valor={String(resumo.total)} />
        <Kpi label="Aguardando aprovação" valor={String(resumo.aguardando)} tom={resumo.aguardando ? "alerta" : undefined} />
        <Kpi label="Aprovadas" valor={String(resumo.aprovadas)} tom="ok" hint="Prontas para cotação" />
        <Kpi label="Em cotação" valor={String(resumo.emCotacao)} tom="destaque" />
        <Kpi label="Valor estimado" valor={brl(resumo.valorEstimado)} />
      </div>

      <Card className="rounded-3xl shadow-card">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 md:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar por número, solicitante ou item" value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  {["Rascunho", "Aguardando aprovação", "Aprovada", "Reprovada", "Em cotação", "Atendida", "Cancelada"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => exportarCSV("requisicoes-compra", lista.map((r) => ({
                Requisição: r.numero, Solicitante: r.solicitante, Setor: r.setor, "Centro de custo": r.centroCusto,
                Data: dataBR(r.data), Necessidade: dataBR(r.necessidade), Prioridade: r.prioridade,
                Itens: r.itens.length, Estimado: totalRequisicao(r), Status: r.status,
              })))}>
                <Download className="mr-1 h-4 w-4" />Exportar
              </Button>
              <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={() => setEdicao("novo")}>
                <Plus className="mr-1 h-4 w-4" />Nova requisição
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Requisição</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Centro de custo</TableHead>
                  <TableHead className="w-28">Necessidade</TableHead>
                  <TableHead className="w-24 text-center">Prioridade</TableHead>
                  <TableHead className="w-32 text-right">Estimado</TableHead>
                  <TableHead className="w-44 text-center">Status</TableHead>
                  <TableHead className="w-56 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((r) => (
                  <Fragment key={r.id}>
                    <TableRow className="cursor-pointer" onClick={() => setAberto(aberto === r.id ? null : r.id)}>
                      <TableCell className="font-mono">{r.numero}</TableCell>
                      <TableCell><div>{r.solicitante}</div><div className="text-xs text-muted-foreground">{r.setor}</div></TableCell>
                      <TableCell>{r.centroCusto}</TableCell>
                      <TableCell className="font-mono text-sm">{dataBR(r.necessidade)}</TableCell>
                      <TableCell className="text-center"><Badge className={`rounded-full ${tomPrioridade(r.prioridade)}`}>{r.prioridade}</Badge></TableCell>
                      <TableCell className="text-right font-mono">{brl(totalRequisicao(r))}</TableCell>
                      <TableCell className="text-center"><Badge className={`rounded-full ${tomStatus(r.status)}`}>{r.status}</Badge></TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {(r.status === "Rascunho" || r.status === "Reprovada") && (
                            <Button size="sm" variant="outline" className="rounded-full" onClick={() => acao(() => enviarParaAprovacao(r.id), `${r.numero} enviada para aprovação.`)}>
                              <Send className="mr-1 h-3.5 w-3.5" />Enviar
                            </Button>
                          )}
                          {r.status === "Aguardando aprovação" && (
                            <Button size="sm" variant="outline" className="rounded-full" onClick={() => setAprovacao(r)}>
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />Aprovar
                            </Button>
                          )}
                          {r.status === "Aprovada" && (
                            <Button size="sm" className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={() => setCotar(r)}>
                              <ShoppingCart className="mr-1 h-3.5 w-3.5" />Cotar
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => setEdicao(r)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => acao(() => excluirRequisicao(r.id), "Requisição excluída.")}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {aberto === r.id && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-muted/30">
                          <div className="grid gap-4 p-2 md:grid-cols-3">
                            <div className="md:col-span-2">
                              <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Itens</div>
                              <div className="mt-2 space-y-1 text-sm">
                                {r.itens.map((i) => (
                                  <div key={i.id} className="flex justify-between gap-4 border-b border-border/50 pb-1">
                                    <span>{i.descricao}</span>
                                    <span className="font-mono text-muted-foreground">{i.quantidade} {i.unidade} × {brl(i.valorEstimado)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div><span className="text-muted-foreground">Conta contábil</span><div>{r.contaContabil || "—"}</div></div>
                              <div><span className="text-muted-foreground">Justificativa</span><div>{r.justificativa || "—"}</div></div>
                              {r.aprovador && <div><span className="text-muted-foreground">Aprovação</span><div>{r.aprovador} · {dataBR(r.aprovadoEm || "")}</div></div>}
                              {r.motivoReprovacao && <div className="text-destructive">Reprovada: {r.motivoReprovacao}</div>}
                              {r.status !== "Cancelada" && r.status !== "Atendida" && (
                                <Button size="sm" variant="outline" className="rounded-full" onClick={() => acao(() => cancelarRequisicao(r.id), "Requisição cancelada.")}>
                                  <Ban className="mr-1 h-3.5 w-3.5" />Cancelar requisição
                                </Button>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
                {!lista.length && (
                  <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Nenhuma requisição encontrada.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {edicao && <DialogRequisicao registro={edicao} onClose={() => setEdicao(null)} />}
      {aprovacao && <DialogAprovacao requisicao={aprovacao} onClose={() => setAprovacao(null)} />}
      {cotar && <DialogAbrirCotacao requisicao={cotar} onClose={() => setCotar(null)} />}
    </div>
  );
}

/* ================================ cotações =============================== */

const CAMPOS_PROPOSTA: CampoAjuda[] = [
  { key: "fornecedor", label: "Fornecedor", required: true, ajuda: "Razão social de quem apresentou a proposta. Confira se o cadastro está ativo e regular." },
  { key: "cnpj", label: "CNPJ", ajuda: "Usado para conferir regularidade fiscal antes de emitir o pedido." },
  { key: "prazoEntregaDias", label: "Prazo de entrega (dias)", required: true, ajuda: "Dias corridos após o pedido. Entra no julgamento por prazo e no custo-benefício." },
  { key: "condicaoPagamento", label: "Condição de pagamento", ajuda: "Prazo de pagamento negociado. Impacta o fluxo de caixa em contas a pagar." },
  { key: "frete", label: "Frete", ajuda: "Valor cobrado à parte. É somado ao total da proposta no julgamento." },
  { key: "tipoFrete", label: "Tipo de frete", ajuda: "CIF quando o fornecedor entrega; FOB quando a retirada é por nossa conta." },
  { key: "validade", label: "Validade da proposta", ajuda: "Até quando o preço está garantido. Proposta vencida deve ser renegociada." },
  { key: "precos", label: "Preços por item", required: true, ajuda: "Preço unitário de cada item. Proposta com item sem preço é desclassificada no ranking." },
];

function DialogProposta({ cotacao, proposta, onClose }: { cotacao: Cotacao; proposta: Proposta | "nova"; onClose: () => void }) {
  const nova = proposta === "nova";
  const atual = nova ? null : proposta;
  const [form, setForm] = useState({
    fornecedor: atual?.fornecedor || "",
    cnpj: atual?.cnpj || "",
    contato: atual?.contato || "",
    prazoEntregaDias: String(atual?.prazoEntregaDias ?? 15),
    condicaoPagamento: atual?.condicaoPagamento || CONDICOES_PAGAMENTO[4],
    frete: String(atual?.frete ?? 0),
    tipoFrete: atual?.tipoFrete || TIPOS_FRETE[0],
    validade: atual?.validade || somarDias(hojeISO(), 30),
    observacoes: atual?.observacoes || "",
  });
  const [precos, setPrecos] = useState<Record<string, string>>(
    Object.fromEntries(cotacao.itens.map((i) => [i.id, String(atual?.precos?.[i.id] ?? "")])),
  );
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const totalItens = cotacao.itens.reduce((s, i) => s + i.quantidade * num(precos[i.id] || "0"), 0);

  const salvar = () => {
    try {
      salvarProposta(cotacao.id, {
        id: atual?.id,
        fornecedor: form.fornecedor, cnpj: form.cnpj, contato: form.contato,
        prazoEntregaDias: num(form.prazoEntregaDias), condicaoPagamento: form.condicaoPagamento,
        frete: num(form.frete), tipoFrete: form.tipoFrete, validade: form.validade,
        observacoes: form.observacoes,
        precos: Object.fromEntries(cotacao.itens.map((i) => [i.id, num(precos[i.id] || "0")])),
      });
      toast.success(nova ? "Proposta registrada." : "Proposta atualizada.");
      onClose();
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-2xl">{nova ? "Nova proposta" : `Proposta — ${atual?.fornecedor}`}</DialogTitle></DialogHeader>

        <div className="mb-2 flex justify-end">
          <AssistenteCampos titulo="Proposta de fornecedor" campos={CAMPOS_PROPOSTA} draft={form} contextoExtra={{ cotacao: cotacao.numero, criterio: cotacao.criterio }} />
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-6 space-y-1.5">
            <Label className="text-xs">Fornecedor *</Label>
            <Input value={form.fornecedor} onChange={(e) => set("fornecedor", e.target.value)} />
          </div>
          <div className="col-span-3 space-y-1.5">
            <Label className="text-xs">CNPJ</Label>
            <Input className="font-mono" value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} placeholder="00.000.000/0001-00" />
          </div>
          <div className="col-span-3 space-y-1.5">
            <Label className="text-xs">Contato</Label>
            <Input value={form.contato} onChange={(e) => set("contato", e.target.value)} />
          </div>

          <div className="col-span-3 space-y-1.5">
            <Label className="text-xs">Prazo de entrega (dias) *</Label>
            <Input className="font-mono" inputMode="numeric" value={form.prazoEntregaDias} onChange={(e) => set("prazoEntregaDias", e.target.value)} />
          </div>
          <div className="col-span-3 space-y-1.5">
            <Label className="text-xs">Condição de pagamento</Label>
            <Select value={form.condicaoPagamento} onValueChange={(v) => set("condicaoPagamento", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CONDICOES_PAGAMENTO.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs">Frete</Label>
            <Input className="text-right font-mono" inputMode="decimal" value={form.frete} onChange={(e) => set("frete", e.target.value)} />
          </div>
          <div className="col-span-4 space-y-1.5">
            <Label className="text-xs">Tipo de frete</Label>
            <Select value={form.tipoFrete} onValueChange={(v) => set("tipoFrete", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS_FRETE.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="col-span-3 space-y-1.5">
            <Label className="text-xs">Validade da proposta</Label>
            <Input type="date" value={form.validade} onChange={(e) => set("validade", e.target.value)} />
          </div>
          <div className="col-span-9 space-y-1.5">
            <Label className="text-xs">Observações</Label>
            <Input value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
          </div>

          <div className="col-span-12 rounded-2xl border border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-32 text-right">Quantidade</TableHead>
                  <TableHead className="w-40 text-right">Preço unitário *</TableHead>
                  <TableHead className="w-36 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cotacao.itens.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.descricao}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{i.quantidade} {i.unidade}</TableCell>
                    <TableCell>
                      <Input className="text-right font-mono" inputMode="decimal" value={precos[i.id]} onChange={(e) => setPrecos((p) => ({ ...p, [i.id]: e.target.value }))} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{brl(i.quantidade * num(precos[i.id] || "0"))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="col-span-12 rounded-2xl border border-brand-orange/40 bg-brand-orange/5 p-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><span className="text-muted-foreground">Total dos itens</span><div className="font-mono">{brl(totalItens)}</div></div>
              <div><span className="text-muted-foreground">Frete</span><div className="font-mono">{brl(num(form.frete))}</div></div>
              <div><span className="text-muted-foreground">Total da proposta</span><div className="font-mono text-brand-orange">{brl(totalItens + num(form.frete))}</div></div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" className="rounded-full" onClick={onClose}>Cancelar</Button>
          <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={salvar}>Salvar proposta</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MapaComparativo({ cotacao }: { cotacao: Cotacao }) {
  const avaliadas = julgarCotacao(cotacao);
  const [proposta, setProposta] = useState<Proposta | "nova" | null>(null);

  const adjudicar = (id: string) => {
    try {
      const p = adjudicarCotacao(cotacao.id, id);
      toast.success(`Cotação adjudicada. Pedido ${p.numero} gerado.`);
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-4 p-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          Critério: <span className="text-foreground">{cotacao.criterio}</span> · Encerramento {dataBR(cotacao.encerramento)} · Origem {cotacao.requisicaoNumero}
          {cotacao.pedidoNumero && <> · Pedido gerado <span className="font-mono text-foreground">{cotacao.pedidoNumero}</span></>}
        </div>
        {cotacao.status !== "Adjudicada" && cotacao.status !== "Cancelada" && (
          <Button size="sm" className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={() => setProposta("nova")}>
            <Plus className="mr-1 h-3.5 w-3.5" />Nova proposta
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border/70">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[220px]">Item</TableHead>
              <TableHead className="w-28 text-right">Qtd.</TableHead>
              {avaliadas.map((a) => (
                <TableHead key={a.proposta.id} className="min-w-[170px] text-right">
                  <div className="truncate">{a.proposta.fornecedor}</div>
                  <div className="text-[10px] font-normal text-muted-foreground">{a.proposta.prazoEntregaDias} dias · {a.proposta.condicaoPagamento}</div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {cotacao.itens.map((i) => {
              const validos = avaliadas.filter((a) => !a.desclassificada).map((a) => Number(a.proposta.precos[i.id]) || Infinity);
              const menor = Math.min(...validos, Infinity);
              return (
                <TableRow key={i.id}>
                  <TableCell>{i.descricao}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{i.quantidade} {i.unidade}</TableCell>
                  {avaliadas.map((a) => {
                    const p = Number(a.proposta.precos[i.id]) || 0;
                    const melhor = p > 0 && p === menor;
                    return (
                      <TableCell key={a.proposta.id} className={`text-right font-mono text-sm ${melhor ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                        {p > 0 ? brl(p) : "—"}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
            <TableRow className="bg-muted/40">
              <TableCell colSpan={2} className="font-medium">Frete</TableCell>
              {avaliadas.map((a) => <TableCell key={a.proposta.id} className="text-right font-mono text-sm">{brl(a.proposta.frete || 0)}</TableCell>)}
            </TableRow>
            <TableRow className="bg-muted/60">
              <TableCell colSpan={2} className="font-medium">Total da proposta</TableCell>
              {avaliadas.map((a) => (
                <TableCell key={a.proposta.id} className="text-right font-mono">
                  {brl(a.total)}
                  <div className={`text-[10px] font-normal ${a.economia >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                    {a.economia >= 0 ? "economia " : "acima "} {brl(Math.abs(a.economia))}
                  </div>
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell colSpan={2} className="font-medium">Classificação</TableCell>
              {avaliadas.map((a) => (
                <TableCell key={a.proposta.id} className="text-right">
                  {a.desclassificada
                    ? <Badge className="rounded-full bg-destructive/15 text-destructive">Desclassificada</Badge>
                    : <Badge className={`rounded-full ${a.posicao === 1 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>{a.posicao}º lugar</Badge>}
                  <div className="mt-2 flex justify-end gap-1">
                    {cotacao.status !== "Adjudicada" && cotacao.status !== "Cancelada" && (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => setProposta(a.proposta)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => {
                          try { excluirProposta(cotacao.id, a.proposta.id); toast.success("Proposta removida."); }
                          catch (e) { toast.error((e as Error).message); }
                        }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        <Button size="sm" className="rounded-full bg-brand-orange hover:bg-brand-orange/90" disabled={a.desclassificada} onClick={() => adjudicar(a.proposta.id)}>
                          <Gavel className="mr-1 h-3.5 w-3.5" />Adjudicar
                        </Button>
                      </>
                    )}
                    {cotacao.vencedoraId === a.proposta.id && (
                      <Badge className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">Vencedora</Badge>
                    )}
                  </div>
                </TableCell>
              ))}
            </TableRow>
            {!avaliadas.length && (
              <TableRow><TableCell colSpan={2} className="py-8 text-center text-muted-foreground">Nenhuma proposta registrada. São necessárias ao menos 2 para julgar.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {proposta && <DialogProposta cotacao={cotacao} proposta={proposta} onClose={() => setProposta(null)} />}
    </div>
  );
}

function Cotacoes() {
  useRefresh();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [aberto, setAberto] = useState<string | null>(null);

  const todas = listarCotacoes();
  const lista = useMemo(() => todas.filter((c) => {
    const okStatus = status === "todos" || c.status === status;
    const t = busca.trim().toLowerCase();
    const okBusca = !t || [c.numero, c.requisicaoNumero, c.comprador, ...c.propostas.map((p) => p.fornecedor)]
      .join(" ").toLowerCase().includes(t);
    return okStatus && okBusca;
  }), [todas, busca, status]);

  const resumo = resumoCotacoes(todas);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Cotações ativas" valor={String(resumo.total)} />
        <Kpi label="Aguardando propostas" valor={String(resumo.abertas)} tom={resumo.abertas ? "alerta" : undefined} hint="Mínimo de 2 para julgar" />
        <Kpi label="Em análise" valor={String(resumo.emAnalise)} tom="destaque" />
        <Kpi label="Adjudicadas" valor={String(resumo.adjudicadas)} tom="ok" />
        <Kpi label="Economia obtida" valor={brl(resumo.economia)} tom="ok" hint="Versus estimativa das requisições" />
      </div>

      <Card className="rounded-3xl shadow-card">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 md:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar por cotação, requisição ou fornecedor" value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  {["Aberta", "Em análise", "Adjudicada", "Cancelada"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => exportarCSV("cotacoes", lista.map((c) => {
              const v = julgarCotacao(c).find((a) => !a.desclassificada);
              return {
                Cotação: c.numero, Requisição: c.requisicaoNumero, Comprador: c.comprador, Critério: c.criterio,
                Abertura: dataBR(c.abertura), Encerramento: dataBR(c.encerramento), Propostas: c.propostas.length,
                "Melhor proposta": v?.proposta.fornecedor || "—", "Melhor valor": v?.total || 0, Status: c.status,
              };
            }))}>
              <Download className="mr-1 h-4 w-4" />Exportar
            </Button>
          </div>

          <div className="rounded-2xl border border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Cotação</TableHead>
                  <TableHead className="w-28">Requisição</TableHead>
                  <TableHead>Melhor proposta</TableHead>
                  <TableHead>Critério</TableHead>
                  <TableHead className="w-24 text-center">Propostas</TableHead>
                  <TableHead className="w-32 text-right">Melhor valor</TableHead>
                  <TableHead className="w-32 text-center">Status</TableHead>
                  <TableHead className="w-32 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((c) => {
                  const ranking = julgarCotacao(c);
                  const melhor = ranking.find((a) => !a.desclassificada);
                  return (
                    <Fragment key={c.id}>
                      <TableRow className="cursor-pointer" onClick={() => setAberto(aberto === c.id ? null : c.id)}>
                        <TableCell className="font-mono">{c.numero}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">{c.requisicaoNumero}</TableCell>
                        <TableCell>{melhor?.proposta.fornecedor || <span className="text-muted-foreground">Sem propostas válidas</span>}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.criterio}</TableCell>
                        <TableCell className="text-center font-mono">{c.propostas.length}</TableCell>
                        <TableCell className="text-right font-mono">{melhor ? brl(melhor.total) : "—"}</TableCell>
                        <TableCell className="text-center"><Badge className={`rounded-full ${tomStatus(c.status)}`}>{c.status}</Badge></TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          {c.status !== "Adjudicada" && c.status !== "Cancelada" && (
                            <Button size="sm" variant="outline" className="rounded-full" onClick={() => {
                              try { cancelarCotacao(c.id); toast.success("Cotação cancelada."); } catch (e) { toast.error((e as Error).message); }
                            }}><XCircle className="mr-1 h-3.5 w-3.5" />Cancelar</Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {aberto === c.id && (
                        <TableRow><TableCell colSpan={8} className="bg-muted/30"><MapaComparativo cotacao={c} /></TableCell></TableRow>
                      )}
                    </Fragment>
                  );
                })}
                {!lista.length && (
                  <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    Nenhuma cotação. Abra uma a partir de uma requisição aprovada.
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ================================= pedidos =============================== */

function DialogRecebimento({ pedido, onClose }: { pedido: Pedido; onClose: () => void }) {
  const [info, setInfo] = useState({ data: hojeISO(), nota: "", responsavel: "Almoxarifado" });
  const [qtds, setQtds] = useState<Record<string, string>>(
    Object.fromEntries(pedido.itens.map((i) => [i.id, String(Math.max(i.quantidade - i.recebido, 0))])),
  );

  const confirmar = () => {
    try {
      const p = registrarRecebimento(pedido.id, Object.fromEntries(Object.entries(qtds).map(([k, v]) => [k, num(v)])), info);
      toast.success(p.status === "Recebido" ? "Pedido recebido integralmente." : "Recebimento parcial registrado.");
      onClose();
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle className="font-display text-2xl">Recebimento — {pedido.numero}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-4 space-y-1.5">
            <Label className="text-xs">Data do recebimento</Label>
            <Input type="date" value={info.data} onChange={(e) => setInfo((i) => ({ ...i, data: e.target.value }))} />
          </div>
          <div className="col-span-4 space-y-1.5">
            <Label className="text-xs">Nota fiscal *</Label>
            <Input className="font-mono" value={info.nota} onChange={(e) => setInfo((i) => ({ ...i, nota: e.target.value }))} placeholder="NF-e 0000" />
          </div>
          <div className="col-span-4 space-y-1.5">
            <Label className="text-xs">Responsável</Label>
            <Input value={info.responsavel} onChange={(e) => setInfo((i) => ({ ...i, responsavel: e.target.value }))} />
          </div>

          <div className="col-span-12 rounded-2xl border border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-28 text-right">Pedido</TableHead>
                  <TableHead className="w-28 text-right">Já recebido</TableHead>
                  <TableHead className="w-28 text-right">Saldo</TableHead>
                  <TableHead className="w-32 text-right">Recebendo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedido.itens.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.descricao}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{i.quantidade} {i.unidade}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{i.recebido}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{i.quantidade - i.recebido}</TableCell>
                    <TableCell><Input className="text-right font-mono" inputMode="decimal" value={qtds[i.id]} onChange={(e) => setQtds((q) => ({ ...q, [i.id]: e.target.value }))} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" className="rounded-full" onClick={onClose}>Cancelar</Button>
          <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={confirmar}>
            <PackageCheck className="mr-1 h-4 w-4" />Confirmar recebimento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Pedidos() {
  useRefresh();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [aberto, setAberto] = useState<string | null>(null);
  const [receber, setReceber] = useState<Pedido | null>(null);

  const todos = listarPedidos();
  const lista = useMemo(() => todos.filter((p) => {
    const okStatus = status === "todos" || p.status === status;
    const t = busca.trim().toLowerCase();
    const okBusca = !t || [p.numero, p.fornecedor, p.cotacaoNumero || "", ...p.itens.map((i) => i.descricao)]
      .join(" ").toLowerCase().includes(t);
    return okStatus && okBusca;
  }), [todos, busca, status]);

  const resumo = resumoPedidos(todos);
  const porFornecedor = pedidosPorFornecedor(todos).slice(0, 6);

  const acao = (fn: () => void, msg: string) => {
    try { fn(); toast.success(msg); } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Pedidos ativos" valor={String(resumo.total)} />
        <Kpi label="Em aberto" valor={String(resumo.abertos)} tom="destaque" hint="Ainda não recebidos" />
        <Kpi label="Em trânsito" valor={String(resumo.emTransito)} />
        <Kpi label="Entregas atrasadas" valor={String(resumo.atrasados)} tom={resumo.atrasados ? "alerta" : "ok"} />
        <Kpi label="Valor comprometido" valor={brl(resumo.valor)} hint={`Recebido ${brl(resumo.recebido)}`} />
      </div>

      {porFornecedor.length > 0 && (
        <Card className="rounded-3xl shadow-card">
          <CardContent className="p-5">
            <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Concentração de compras por fornecedor</div>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porFornecedor} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="fornecedor" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} interval={0} height={48} tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 16)}…` : v)} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                  <Tooltip {...CHART_TOOLTIP} formatter={(v: number) => brl(v)} />
                  <Bar dataKey="valor" fill="var(--brand-orange)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-3xl shadow-card">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 md:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar por pedido, fornecedor ou item" value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  {["Aguardando envio", "Em trânsito", "Recebido parcial", "Recebido", "Cancelado"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => exportarCSV("pedidos-compra", lista.map((p) => ({
              Pedido: p.numero, Fornecedor: p.fornecedor, Cotação: p.cotacaoNumero || "—", Emissão: dataBR(p.emissao),
              Previsão: dataBR(p.previsao), Condição: p.condicaoPagamento, Total: totalPedido(p),
              "% recebido": percentualRecebido(p), Status: p.status,
            })))}>
              <Download className="mr-1 h-4 w-4" />Exportar
            </Button>
          </div>

          <div className="rounded-2xl border border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Pedido</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="w-28">Previsão</TableHead>
                  <TableHead className="w-32 text-right">Total</TableHead>
                  <TableHead className="w-40">Recebimento</TableHead>
                  <TableHead className="w-36 text-center">Status</TableHead>
                  <TableHead className="w-56 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((p) => {
                  const atrasado = p.status !== "Recebido" && p.status !== "Cancelado" && p.previsao < hojeISO();
                  return (
                    <Fragment key={p.id}>
                      <TableRow className="cursor-pointer" onClick={() => setAberto(aberto === p.id ? null : p.id)}>
                        <TableCell className="font-mono">{p.numero}</TableCell>
                        <TableCell>
                          <div>{p.fornecedor}</div>
                          <div className="font-mono text-xs text-muted-foreground">{p.cnpj || "—"}</div>
                        </TableCell>
                        <TableCell className={`font-mono text-sm ${atrasado ? "text-destructive" : ""}`}>{dataBR(p.previsao)}</TableCell>
                        <TableCell className="text-right font-mono">{brl(totalPedido(p))}</TableCell>
                        <TableCell>
                          <Progress value={percentualRecebido(p)} className="h-2" />
                          <div className="mt-1 text-[11px] text-muted-foreground">{percentualRecebido(p)}% · {brl(recebidoPedido(p))}</div>
                        </TableCell>
                        <TableCell className="text-center"><Badge className={`rounded-full ${tomStatus(p.status)}`}>{p.status}</Badge></TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            {p.status === "Aguardando envio" && (
                              <Button size="sm" variant="outline" className="rounded-full" onClick={() => acao(() => marcarEmTransito(p.id), `${p.numero} em trânsito.`)}>
                                <Truck className="mr-1 h-3.5 w-3.5" />Em trânsito
                              </Button>
                            )}
                            {p.status !== "Recebido" && p.status !== "Cancelado" && (
                              <Button size="sm" className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={() => setReceber(p)}>
                                <PackageCheck className="mr-1 h-3.5 w-3.5" />Receber
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" onClick={() => acao(() => excluirPedido(p.id), "Pedido excluído.")}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {aberto === p.id && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/30">
                            <div className="grid gap-4 p-2 md:grid-cols-3">
                              <div className="md:col-span-2">
                                <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Itens do pedido</div>
                                <div className="mt-2 space-y-1 text-sm">
                                  {p.itens.map((i) => (
                                    <div key={i.id} className="flex justify-between gap-4 border-b border-border/50 pb-1">
                                      <span>{i.descricao}</span>
                                      <span className="font-mono text-muted-foreground">
                                        {i.recebido}/{i.quantidade} {i.unidade} × {brl(i.precoUnitario)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                {p.recebimentos.length > 0 && (
                                  <div className="mt-4">
                                    <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Histórico de recebimentos</div>
                                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                      {p.recebimentos.map((r, idx) => (
                                        <div key={idx} className="flex justify-between gap-3">
                                          <span className="font-mono">{dataBR(r.data)} · {r.nota}</span>
                                          <span>{r.item} — {r.quantidade} un · {r.responsavel}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2 text-sm">
                                <div><span className="text-muted-foreground">Origem</span><div className="font-mono">{p.cotacaoNumero || "—"} · {p.requisicaoNumero || "—"}</div></div>
                                <div><span className="text-muted-foreground">Condição de pagamento</span><div>{p.condicaoPagamento}</div></div>
                                <div><span className="text-muted-foreground">Frete</span><div>{brl(p.frete || 0)} · {p.tipoFrete}</div></div>
                                <div><span className="text-muted-foreground">Centro de custo</span><div>{p.centroCusto}</div></div>
                                <div><span className="text-muted-foreground">Conta contábil</span><div>{p.contaContabil || "—"}</div></div>
                                {p.status !== "Cancelado" && p.itens.every((i) => i.recebido === 0) && (
                                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => acao(() => cancelarPedido(p.id), "Pedido cancelado.")}>
                                    <Ban className="mr-1 h-3.5 w-3.5" />Cancelar pedido
                                  </Button>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
                {!lista.length && (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    Nenhum pedido. Adjudique uma cotação para gerar o pedido automaticamente.
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {receber && <DialogRecebimento pedido={receber} onClose={() => setReceber(null)} />}
    </div>
  );
}

/* ================================= página ================================ */

const AJUDA_TELA: Record<string, CampoAjuda[]> = {
  requisicoes: CAMPOS_REQ,
  cotacoes: CAMPOS_PROPOSTA,
  pedidos: [
    { key: "previsao", label: "Previsão de entrega", ajuda: "Data prometida pelo fornecedor. Pedido vencido e não recebido aparece como atraso." },
    { key: "recebimento", label: "Recebimento", ajuda: "Confira quantidade e nota fiscal. Recebimento parcial mantém o pedido aberto com o saldo pendente." },
    { key: "frete", label: "Frete", ajuda: "CIF vem embutido na entrega; FOB exige contratar transporte e entra no custo de aquisição." },
    { key: "contaContabil", label: "Conta contábil", ajuda: "Define se a compra vira estoque, imobilizado ou despesa no fechamento." },
  ],
};

export default function Suprimentos() {
  const { modulo } = useParams();
  const tela = TELAS[modulo || ""];
  if (!tela) return <div className="py-24 text-center text-muted-foreground">Tela de compras não encontrada.</div>;
  const Icon = tela.icon;

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/dashboard" className="hover:text-foreground">Início</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/administrativo" className="hover:text-foreground">Administrativo</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/administrativo/suprimentos" className="hover:text-foreground">Compras e suprimentos</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{tela.titulo}</span>
      </nav>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-card shadow-card">
            <Icon className="h-6 w-6 text-brand-orange" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Administrativo · Compras e suprimentos</div>
            <h1 className="mt-1.5 font-display text-4xl">{tela.titulo}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{tela.desc}</p>
          </div>
        </div>
        <AssistenteCampos
          titulo={tela.titulo}
          campos={AJUDA_TELA[modulo || ""] || []}
          contextoExtra={{ modulo: tela.titulo, area: "Administrativo · Compras e suprimentos" }}
        />
      </div>

      {modulo === "requisicoes" && <Requisicoes />}
      {modulo === "cotacoes" && <Cotacoes />}
      {modulo === "pedidos" && <Pedidos />}
    </div>
  );
}
