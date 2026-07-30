import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle, CalendarClock, CheckCircle2, ChevronRight, Download, FileText, FolderArchive,
  KeyRound, Pencil, Plus, RefreshCw, ScrollText, Search, ShieldCheck, Trash2, TrendingUp,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, Checkbox, Dialog, DialogContent, DialogHeader, DialogTitle,
  Input, Label, Progress, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Tabs, TabsContent, TabsList, TabsTrigger, Textarea,
} from "@/design-system/mj-design-system-db98fa";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { toast } from "sonner";
import AssistenteCampos from "@/components/contabil/AssistenteCampos";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { useCompetencia } from "@/lib/competencia";
import {
  CATEGORIAS, CHECKLIST_MENSAL, CONTRATOS_EVENT, INDICES, TIPOS_DOCUMENTO,
  agendaConsolidada, alternarConclusao, aplicarReajuste, brl, certificadosCalculados,
  conformidadeCompetencia, contratosCalculados, contratosPorCategoria, dataBR, documentosCalculados,
  documentosPorTipo, excluirCertificado, excluirContrato, excluirDocumento, excluirEvento, hojeISO,
  projecaoContratual, registrarAditivo, renovarCertificado, renovarContrato, resumoContratos,
  salvarCertificado, salvarContrato, salvarDocumento, salvarEvento,
  type CategoriaContrato, type Certificado, type ContratoCalculado, type DocumentoCalculado,
  type IndiceReajuste,
} from "@/lib/contratosStore";

/* ============================== apoio visual ============================= */

const TELAS: Record<string, { titulo: string; desc: string; icon: typeof ScrollText }> = {
  contratos: { titulo: "Contratos", desc: "Vigências, reajustes, aditivos e compromisso financeiro contratado.", icon: ScrollText },
  certificados: { titulo: "Certificados e procurações", desc: "e-CNPJ, e-CPF, NFS-e e procurações com alerta de validade.", icon: KeyRound },
  documentos: { titulo: "Documentos e anexos", desc: "Cofre documental por competência com checklist de conformidade.", icon: FolderArchive },
  agenda: { titulo: "Agenda administrativa", desc: "Prazos de contratos, reajustes, certificados e compromissos internos.", icon: CalendarClock },
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

const tomSituacao = (s: string) =>
  s === "Vigente" || s === "Válido" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
    : s === "Vencido" || s === "Crítico" ? "bg-destructive/15 text-destructive"
      : s === "A vencer" || s === "Atenção" ? "bg-brand-orange/15 text-brand-orange"
        : "bg-muted text-muted-foreground";

function useRefresh() {
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    window.addEventListener(CONTRATOS_EVENT, refresh);
    return () => window.removeEventListener(CONTRATOS_EVENT, refresh);
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

/* ============================ contratos: form ============================ */

const CAMPOS_CONTRATO = [
  { key: "numero", label: "Número do contrato", required: true, ajuda: "Identificação interna, geralmente CT-ANO-SEQUENCIAL. Deve ser única." },
  { key: "contraparte", label: "Contraparte", required: true, ajuda: "Razão social de quem presta ou recebe o serviço/fornecimento." },
  { key: "documento", label: "CNPJ / CPF", ajuda: "Documento da contraparte, usado para cruzar com notas e títulos." },
  { key: "categoria", label: "Categoria", ajuda: "Classifica o contrato para relatórios de gasto contratado por natureza." },
  { key: "natureza", label: "Natureza", ajuda: "Despesa (pagamos) ou Receita (recebemos). Define o sinal na projeção." },
  { key: "inicio", label: "Início da vigência", required: true, ajuda: "Data de assinatura ou de início dos efeitos, conforme a cláusula de vigência." },
  { key: "fim", label: "Vigência até", required: true, ajuda: "Termo final. Base para os alertas de renovação e aviso prévio." },
  { key: "valorMensal", label: "Valor mensal", required: true, ajuda: "Valor recorrente. Para contratos por medição, use a média contratada." },
  { key: "indice", label: "Índice de reajuste", ajuda: "IPCA, IGP-M ou INPC. O sistema projeta o reajuste a cada 12 meses de vigência." },
  { key: "diaVencimento", label: "Dia de vencimento", ajuda: "Dia do mês em que a fatura vence, usado na agenda financeira." },
  { key: "avisoPrevioDias", label: "Aviso prévio (dias)", ajuda: "Prazo contratual para comunicar a não renovação. Gera alerta antecipado." },
  { key: "renovacaoAutomatica", label: "Renovação automática", ajuda: "Se marcado, o contrato se renova tacitamente quando o aviso prévio expira." },
  { key: "centroCusto", label: "Centro de custo", ajuda: "Onde a despesa/receita é apropriada no plano gerencial." },
];

function DialogContrato({ registro, onClose }: { registro: ContratoCalculado | null | "novo"; onClose: () => void }) {
  const novo = registro === "novo";
  const atual = novo ? null : registro;
  const { empresa } = useEmpresaAtual();
  const [form, setForm] = useState({
    numero: atual?.numero || "",
    contraparte: atual?.contraparte || "",
    documento: atual?.documento || "",
    categoria: (atual?.categoria || "Prestação de serviços") as CategoriaContrato,
    natureza: atual?.natureza || "Despesa",
    inicio: atual?.inicio || hojeISO(),
    fim: atual?.fim || "",
    valorMensal: atual ? String(atual.valorMensal) : "",
    indice: (atual?.indice || "IPCA") as IndiceReajuste,
    diaVencimento: String(atual?.diaVencimento ?? 10),
    avisoPrevioDias: String(atual?.avisoPrevioDias ?? 30),
    renovacaoAutomatica: atual?.renovacaoAutomatica ?? false,
    responsavel: atual?.responsavel || "Administrativo",
    centroCusto: atual?.centroCusto || "",
    observacoes: atual?.observacoes || "",
  });
  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const salvar = () => {
    try {
      salvarContrato({
        id: atual?.id,
        empresaId: atual?.empresaId ?? empresa?.id,
        numero: form.numero, contraparte: form.contraparte, documento: form.documento,
        categoria: form.categoria, natureza: form.natureza as "Despesa" | "Receita",
        inicio: form.inicio, fim: form.fim,
        valorMensal: Number(form.valorMensal.replace(",", ".")),
        indice: form.indice,
        diaVencimento: Number(form.diaVencimento) || 10,
        avisoPrevioDias: Number(form.avisoPrevioDias) || 0,
        renovacaoAutomatica: form.renovacaoAutomatica,
        responsavel: form.responsavel, centroCusto: form.centroCusto, observacoes: form.observacoes,
      });
      toast.success(novo ? "Contrato cadastrado." : "Contrato atualizado.");
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível salvar o contrato.");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <DialogTitle className="font-display text-2xl">{novo ? "Novo contrato" : `Editar ${atual?.numero}`}</DialogTitle>
            <AssistenteCampos titulo="Cadastro de contrato" campos={CAMPOS_CONTRATO} draft={{ ...form, renovacaoAutomatica: String(form.renovacaoAutomatica) }} />
          </div>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 space-y-1.5 sm:col-span-4">
            <Label className="text-xs">Número *</Label>
            <Input value={form.numero} onChange={(e) => set("numero", e.target.value)} placeholder="CT-2026-010" className="font-mono" />
          </div>
          <div className="col-span-12 space-y-1.5 sm:col-span-5">
            <Label className="text-xs">Contraparte *</Label>
            <Input value={form.contraparte} onChange={(e) => set("contraparte", e.target.value)} placeholder="Razão social" />
          </div>
          <div className="col-span-12 space-y-1.5 sm:col-span-3">
            <Label className="text-xs">CNPJ / CPF</Label>
            <Input value={form.documento} onChange={(e) => set("documento", e.target.value)} className="font-mono" placeholder="00.000.000/0001-00" />
          </div>

          <div className="col-span-12 space-y-1.5 sm:col-span-5">
            <Label className="text-xs">Categoria</Label>
            <Select value={form.categoria} onValueChange={(v) => set("categoria", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-6 space-y-1.5 sm:col-span-3">
            <Label className="text-xs">Natureza</Label>
            <Select value={form.natureza} onValueChange={(v) => set("natureza", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Despesa">Despesa</SelectItem><SelectItem value="Receita">Receita</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="col-span-6 space-y-1.5 sm:col-span-4">
            <Label className="text-xs">Centro de custo</Label>
            <Input value={form.centroCusto} onChange={(e) => set("centroCusto", e.target.value)} placeholder="CC-101 · Operações" />
          </div>

          <div className="col-span-6 space-y-1.5 sm:col-span-3">
            <Label className="text-xs">Início *</Label>
            <Input type="date" value={form.inicio} onChange={(e) => set("inicio", e.target.value)} />
          </div>
          <div className="col-span-6 space-y-1.5 sm:col-span-3">
            <Label className="text-xs">Vigência até *</Label>
            <Input type="date" value={form.fim} onChange={(e) => set("fim", e.target.value)} />
          </div>
          <div className="col-span-6 space-y-1.5 sm:col-span-3">
            <Label className="text-xs">Valor mensal *</Label>
            <Input value={form.valorMensal} onChange={(e) => set("valorMensal", e.target.value)} className="font-mono" placeholder="0,00" />
          </div>
          <div className="col-span-6 space-y-1.5 sm:col-span-3">
            <Label className="text-xs">Índice de reajuste</Label>
            <Select value={form.indice} onValueChange={(v) => set("indice", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(INDICES) as IndiceReajuste[]).map((i) => (
                  <SelectItem key={i} value={i}>{i}{INDICES[i] ? ` · ${INDICES[i].toFixed(2)}%` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-6 space-y-1.5 sm:col-span-3">
            <Label className="text-xs">Dia de vencimento</Label>
            <Input value={form.diaVencimento} onChange={(e) => set("diaVencimento", e.target.value)} className="font-mono" />
          </div>
          <div className="col-span-6 space-y-1.5 sm:col-span-3">
            <Label className="text-xs">Aviso prévio (dias)</Label>
            <Input value={form.avisoPrevioDias} onChange={(e) => set("avisoPrevioDias", e.target.value)} className="font-mono" />
          </div>
          <div className="col-span-6 space-y-1.5 sm:col-span-3">
            <Label className="text-xs">Responsável</Label>
            <Input value={form.responsavel} onChange={(e) => set("responsavel", e.target.value)} />
          </div>
          <div className="col-span-6 flex items-end gap-2 pb-2 sm:col-span-3">
            <Checkbox id="renov" checked={form.renovacaoAutomatica} onCheckedChange={(v) => set("renovacaoAutomatica", Boolean(v))} />
            <Label htmlFor="renov" className="text-xs">Renovação automática</Label>
          </div>

          <div className="col-span-12 space-y-1.5">
            <Label className="text-xs">Observações</Label>
            <Textarea rows={2} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} placeholder="Cláusulas relevantes, escopo, multas..." />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" className="rounded-full" onClick={onClose}>Cancelar</Button>
          <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={salvar}>Salvar contrato</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DialogAditivo({ contrato, onClose }: { contrato: ContratoCalculado; onClose: () => void }) {
  const [tipo, setTipo] = useState<"Valor" | "Prazo" | "Escopo" | "Rescisão">("Prazo");
  const [descricao, setDescricao] = useState("");
  const [valorNovo, setValorNovo] = useState(String(contrato.valorMensal));
  const [fimNovo, setFimNovo] = useState(contrato.fim);
  const [data, setData] = useState(hojeISO());

  const salvar = () => {
    try {
      registrarAditivo(contrato.id, {
        tipo, descricao, data,
        valorNovo: tipo === "Valor" ? Number(valorNovo.replace(",", ".")) : undefined,
        fimNovo: tipo === "Prazo" ? fimNovo : undefined,
      });
      toast.success(`Aditivo de ${tipo.toLowerCase()} registrado em ${contrato.numero}.`);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível registrar o aditivo.");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <DialogTitle className="font-display text-2xl">Aditivo contratual</DialogTitle>
            <AssistenteCampos
              titulo="Aditivo contratual"
              campos={[
                { key: "tipo", label: "Tipo de aditivo", ajuda: "Valor altera o mensal; Prazo prorroga a vigência; Escopo registra mudança de objeto; Rescisão encerra o contrato." },
                { key: "descricao", label: "Justificativa", required: true, ajuda: "Texto que ficará no histórico auditável do contrato." },
                { key: "data", label: "Data do aditivo", ajuda: "Data de assinatura do termo aditivo." },
              ]}
            />
          </div>
        </DialogHeader>

        <div className="rounded-2xl border border-border/70 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{contrato.contraparte}</span>
            <Badge variant="secondary" className="rounded-full">{contrato.numero}</Badge>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
            <div>Vigência atual<div className="font-mono text-foreground">{dataBR(contrato.fim)}</div></div>
            <div>Valor mensal<div className="font-mono text-foreground">{brl(contrato.valorMensal)}</div></div>
            <div>Aditivos<div className="font-mono text-foreground">{contrato.aditivos.length}</div></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Prazo", "Valor", "Escopo", "Rescisão"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Data</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          {tipo === "Valor" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Novo valor mensal</Label>
              <Input value={valorNovo} onChange={(e) => setValorNovo(e.target.value)} className="font-mono" />
            </div>
          )}
          {tipo === "Prazo" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Nova vigência até</Label>
              <Input type="date" value={fimNovo} onChange={(e) => setFimNovo(e.target.value)} />
            </div>
          )}
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs">Justificativa *</Label>
            <Textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Motivo, cláusula alterada e aprovação." />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" className="rounded-full" onClick={onClose}>Cancelar</Button>
          <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={salvar}>Registrar aditivo</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================== contratos ================================ */

function Contratos() {
  const { empresa } = useEmpresaAtual();
  const tick = useRefresh();
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState("todas");
  const [categoria, setCategoria] = useState("todas");
  const [edicao, setEdicao] = useState<ContratoCalculado | "novo" | null>(null);
  const [aditivo, setAditivo] = useState<ContratoCalculado | null>(null);
  const [detalhe, setDetalhe] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lista = useMemo(() => contratosCalculados(empresa?.id), [empresa, tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const kpi = useMemo(() => resumoContratos(empresa?.id), [empresa, tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const porCategoria = useMemo(() => contratosPorCategoria(empresa?.id), [empresa, tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const projecao = useMemo(() => projecaoContratual(empresa?.id, 12), [empresa, tick]);

  const filtrados = lista.filter((c) => {
    const t = busca.trim().toLowerCase();
    if (t && ![c.numero, c.contraparte, c.documento, c.centroCusto].join(" ").toLowerCase().includes(t)) return false;
    if (situacao !== "todas" && c.situacao !== situacao) return false;
    if (categoria !== "todas" && c.categoria !== categoria) return false;
    return true;
  });

  const alertas = lista.flatMap((c) => c.alertas.map((a) => ({ contrato: c, texto: a })));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Contratos ativos" valor={String(kpi.ativos)} hint={`${kpi.total} no total`} tom="destaque" />
        <Kpi label="Despesa mensal contratada" valor={brl(kpi.despesaMensal)} tom="alerta" />
        <Kpi label="Receita mensal contratada" valor={brl(kpi.receitaMensal)} tom="ok" />
        <Kpi label="Compromisso remanescente" valor={brl(kpi.globalRestante)} hint="Até o fim das vigências" />
        <Kpi label="Vencendo em 90 dias" valor={String(kpi.aVencer)} hint={`${kpi.vencidos} já vencido(s)`} tom={kpi.aVencer + kpi.vencidos > 0 ? "alerta" : "ok"} />
      </div>

      {alertas.length > 0 && (
        <Card className="rounded-3xl border-brand-orange/30 shadow-card">
          <CardContent className="space-y-2 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-brand-orange">
              <AlertTriangle className="h-4 w-4" />Painel de alertas contratuais ({alertas.length})
            </div>
            <ul className="space-y-1.5 text-sm">
              {alertas.slice(0, 6).map((a, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 text-muted-foreground">
                  <Badge variant="secondary" className="rounded-full font-mono text-[10px]">{a.contrato.numero}</Badge>
                  <span>{a.texto}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="rounded-3xl shadow-card lg:col-span-3">
          <CardContent className="space-y-3 p-6">
            <div>
              <h3 className="font-display text-xl">Projeção contratual · 12 meses</h3>
              <p className="text-sm text-muted-foreground">Considera reajustes previstos e o término de cada vigência.</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projecao}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                  <Tooltip {...CHART_TOOLTIP} formatter={(v: number) => brl(Number(v))} />
                  <Line type="monotone" dataKey="despesa" stroke="var(--destructive)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="receita" stroke="var(--brand-blue)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="liquido" stroke="var(--brand-orange)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-card lg:col-span-2">
          <CardContent className="space-y-3 p-6">
            <div>
              <h3 className="font-display text-xl">Gasto por categoria</h3>
              <p className="text-sm text-muted-foreground">Valor mensal dos contratos ativos.</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porCategoria} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                  <YAxis type="category" dataKey="categoria" width={110} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <Tooltip {...CHART_TOOLTIP} formatter={(v: number) => brl(Number(v))} />
                  <Bar dataKey="valor" radius={[0, 8, 8, 0]}>
                    {porCategoria.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "var(--brand-orange)" : "var(--brand-blue)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl shadow-card">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar contrato, contraparte, CNPJ..." className="w-[280px] pl-9" />
              </div>
              <Select value={situacao} onValueChange={setSituacao}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["todas", "Vigente", "A vencer", "Vencido", "Encerrado", "Futuro"].map((s) => (
                    <SelectItem key={s} value={s}>{s === "todas" ? "Todas situações" : s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas categorias</SelectItem>
                  {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => exportarCSV("contratos", filtrados.map((c) => ({
                Numero: c.numero, Contraparte: c.contraparte, Categoria: c.categoria, Situacao: c.situacao,
                Inicio: dataBR(c.inicio), Fim: dataBR(c.fim), ValorMensal: c.valorMensal, Indice: c.indice,
                GlobalRestante: c.valorGlobalRestante,
              })))}>
                <Download className="mr-2 h-4 w-4" />Exportar
              </Button>
              <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={() => setEdicao("novo")}>
                <Plus className="mr-2 h-4 w-4" />Novo contrato
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Contraparte</TableHead>
                  <TableHead>Vigência</TableHead>
                  <TableHead className="text-right">Valor mensal</TableHead>
                  <TableHead className="text-right">Global restante</TableHead>
                  <TableHead className="text-center">Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((c) => (
                  <Fragment key={c.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => setDetalhe(detalhe === c.id ? null : c.id)}
                    >
                      <TableCell className="font-mono text-xs">
                        {c.numero}
                        <div className="text-[10px] text-muted-foreground">{c.categoria}</div>
                      </TableCell>
                      <TableCell>
                        {c.contraparte}
                        <div className="font-mono text-[10px] text-muted-foreground">{c.documento || "—"}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {dataBR(c.inicio)} → {dataBR(c.fim)}
                        <div className="text-[10px] text-muted-foreground">
                          {c.diasParaFim >= 0 ? `${c.diasParaFim} dia(s) restantes` : `${Math.abs(c.diasParaFim)} dia(s) vencido`}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{brl(c.valorMensal)}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">{brl(c.valorGlobalRestante)}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={`rounded-full ${tomSituacao(c.situacao)}`} variant="secondary">{c.situacao}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setAditivo(c)}>Aditivo</Button>
                          <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setEdicao(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button
                            size="sm" variant="ghost" className="rounded-full text-destructive"
                            onClick={() => { if (confirm(`Excluir o contrato ${c.numero}?`)) { excluirContrato(c.id); toast.success("Contrato excluído."); } }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {detalhe === c.id && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/30">
                          <div className="grid gap-4 p-2 md:grid-cols-3">
                            <div className="space-y-1 text-xs">
                              <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Condições</div>
                              <div>Índice: <span className="font-mono">{c.indice}</span></div>
                              <div>Vencimento mensal: dia <span className="font-mono">{c.diaVencimento}</span></div>
                              <div>Aviso prévio: <span className="font-mono">{c.avisoPrevioDias}</span> dias {c.avisoVencido && <span className="text-destructive">(prazo esgotado)</span>}</div>
                              <div>Renovação automática: {c.renovacaoAutomatica ? "sim" : "não"}</div>
                              <div>Centro de custo: {c.centroCusto || "—"}</div>
                              <div>Responsável: {c.responsavel}</div>
                            </div>
                            <div className="space-y-1 text-xs">
                              <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Reajuste</div>
                              {c.proximoReajuste ? (
                                <>
                                  <div>Próximo: <span className="font-mono">{dataBR(c.proximoReajuste)}</span> ({c.diasParaReajuste} dias)</div>
                                  <div>Valor projetado: <span className="font-mono text-brand-orange">{brl(c.valorReajustado)}</span></div>
                                  <Button
                                    size="sm" variant="outline" className="mt-1 rounded-full"
                                    onClick={() => { try { aplicarReajuste(c.id); toast.success("Reajuste aplicado como aditivo de valor."); } catch (e: any) { toast.error(e.message); } }}
                                  >
                                    <TrendingUp className="mr-2 h-3.5 w-3.5" />Aplicar reajuste
                                  </Button>
                                </>
                              ) : <div className="text-muted-foreground">Sem reajuste previsto na vigência.</div>}
                              <div className="pt-2">
                                <Button
                                  size="sm" variant="outline" className="rounded-full"
                                  onClick={() => { try { renovarContrato(c.id, 12); toast.success("Vigência renovada por 12 meses."); } catch (e: any) { toast.error(e.message); } }}
                                >
                                  <RefreshCw className="mr-2 h-3.5 w-3.5" />Renovar 12 meses
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-1 text-xs">
                              <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Histórico de aditivos</div>
                              {c.aditivos.length === 0 && <div className="text-muted-foreground">Nenhum aditivo registrado.</div>}
                              {c.aditivos.map((a) => (
                                <div key={a.id} className="rounded-xl border border-border/60 p-2">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{a.tipo}</span>
                                    <span className="font-mono text-[10px] text-muted-foreground">{dataBR(a.data)}</span>
                                  </div>
                                  <div className="text-muted-foreground">{a.descricao}</div>
                                  {a.valorNovo && <div className="font-mono text-[10px]">{brl(a.valorAnterior || 0)} → {brl(a.valorNovo)}</div>}
                                  {a.fimNovo && <div className="font-mono text-[10px]">{dataBR(a.fimAnterior || "")} → {dataBR(a.fimNovo)}</div>}
                                </div>
                              ))}
                              {c.observacoes && <div className="pt-1 text-muted-foreground">{c.observacoes}</div>}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
                {filtrados.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Nenhum contrato encontrado com os filtros atuais.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {edicao && <DialogContrato registro={edicao} onClose={() => setEdicao(null)} />}
      {aditivo && <DialogAditivo contrato={aditivo} onClose={() => setAditivo(null)} />}
    </div>
  );
}

/* ============================= certificados ============================== */

const TIPOS_CERT: Certificado["tipo"][] = [
  "e-CNPJ A1", "e-CNPJ A3", "e-CPF A1", "e-CPF A3", "Certificado NFS-e", "Procuração e-CAC", "Procuração estadual",
];

function DialogCertificado({ registro, onClose }: { registro: Certificado | "novo"; onClose: () => void }) {
  const novo = registro === "novo";
  const atual = novo ? null : registro;
  const { empresa } = useEmpresaAtual();
  const [form, setForm] = useState({
    tipo: (atual?.tipo || "e-CNPJ A1") as Certificado["tipo"],
    titular: atual?.titular || "",
    documento: atual?.documento || "",
    emissao: atual?.emissao || hojeISO(),
    validade: atual?.validade || "",
    responsavel: atual?.responsavel || "Contabilidade",
    senhaCofre: atual?.senhaCofre ?? false,
    observacoes: atual?.observacoes || "",
  });
  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const salvar = () => {
    try {
      salvarCertificado({ id: atual?.id, empresaId: atual?.empresaId ?? empresa?.id, ...form });
      toast.success(novo ? "Certificado cadastrado." : "Certificado atualizado.");
      onClose();
    } catch (e: any) { toast.error(e?.message || "Não foi possível salvar."); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <DialogTitle className="font-display text-2xl">{novo ? "Novo certificado" : "Editar certificado"}</DialogTitle>
            <AssistenteCampos
              titulo="Certificados e procurações"
              campos={[
                { key: "tipo", label: "Tipo", ajuda: "A1 fica armazenado em arquivo (validade de 1 ano); A3 em token/cartão (até 3 anos). Procuração e-CAC autoriza a contabilidade a agir no portal da Receita." },
                { key: "titular", label: "Titular", required: true, ajuda: "Empresa, filial ou pessoa física dona do certificado." },
                { key: "documento", label: "CNPJ / CPF", ajuda: "Documento vinculado ao certificado; precisa bater com o emissor das notas." },
                { key: "emissao", label: "Emissão", required: true, ajuda: "Data de emissão informada no certificado." },
                { key: "validade", label: "Validade", required: true, ajuda: "Data limite. O sistema alerta em D-60, D-30 e D-7." },
                { key: "senhaCofre", label: "Senha no cofre", ajuda: "Indica se a senha está guardada no cofre de senhas corporativo." },
              ]}
              draft={{ ...form, senhaCofre: String(form.senhaCofre) }}
            />
          </div>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 space-y-1.5 sm:col-span-5">
            <Label className="text-xs">Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS_CERT.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-12 space-y-1.5 sm:col-span-4">
            <Label className="text-xs">Titular *</Label>
            <Input value={form.titular} onChange={(e) => set("titular", e.target.value)} />
          </div>
          <div className="col-span-12 space-y-1.5 sm:col-span-3">
            <Label className="text-xs">CNPJ / CPF</Label>
            <Input value={form.documento} onChange={(e) => set("documento", e.target.value)} className="font-mono" />
          </div>
          <div className="col-span-6 space-y-1.5 sm:col-span-3">
            <Label className="text-xs">Emissão *</Label>
            <Input type="date" value={form.emissao} onChange={(e) => set("emissao", e.target.value)} />
          </div>
          <div className="col-span-6 space-y-1.5 sm:col-span-3">
            <Label className="text-xs">Validade *</Label>
            <Input type="date" value={form.validade} onChange={(e) => set("validade", e.target.value)} />
          </div>
          <div className="col-span-6 space-y-1.5 sm:col-span-3">
            <Label className="text-xs">Responsável</Label>
            <Input value={form.responsavel} onChange={(e) => set("responsavel", e.target.value)} />
          </div>
          <div className="col-span-6 flex items-end gap-2 pb-2 sm:col-span-3">
            <Checkbox id="cofre" checked={form.senhaCofre} onCheckedChange={(v) => set("senhaCofre", Boolean(v))} />
            <Label htmlFor="cofre" className="text-xs">Senha no cofre</Label>
          </div>
          <div className="col-span-12 space-y-1.5">
            <Label className="text-xs">Observações</Label>
            <Textarea rows={2} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" className="rounded-full" onClick={onClose}>Cancelar</Button>
          <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={salvar}>Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Certificados() {
  const { empresa } = useEmpresaAtual();
  const tick = useRefresh();
  const [edicao, setEdicao] = useState<Certificado | "novo" | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lista = useMemo(() => certificadosCalculados(empresa?.id), [empresa, tick]);

  const criticos = lista.filter((c) => c.situacao === "Crítico" || c.situacao === "Vencido");
  const atencao = lista.filter((c) => c.situacao === "Atenção");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Certificados monitorados" valor={String(lista.length)} tom="destaque" />
        <Kpi label="Vencidos ou críticos" valor={String(criticos.length)} hint="Até 7 dias" tom={criticos.length ? "alerta" : "ok"} />
        <Kpi label="Em atenção" valor={String(atencao.length)} hint="Vencem em até 60 dias" />
        <Kpi label="Senhas no cofre" valor={`${lista.filter((c) => c.senhaCofre).length}/${lista.length}`} tom="ok" />
      </div>

      {criticos.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="text-sm">
            <div className="font-medium text-destructive">Risco de parada na emissão de documentos eletrônicos</div>
            <p className="text-muted-foreground">
              {criticos.map((c) => `${c.tipo} de ${c.titular}`).join(", ")} — sem certificado válido, NF-e, NFS-e, SPED e transmissões ao e-CAC falham.
            </p>
          </div>
        </div>
      )}

      <Card className="rounded-3xl shadow-card">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-xl">Cofre de certificados e procurações</h3>
              <p className="text-sm text-muted-foreground">Alertas automáticos em D-60, D-30 e D-7 da validade.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => exportarCSV("certificados", lista.map((c) => ({
                Tipo: c.tipo, Titular: c.titular, Documento: c.documento, Emissao: dataBR(c.emissao),
                Validade: dataBR(c.validade), DiasParaVencer: c.diasParaVencer, Situacao: c.situacao,
              })))}>
                <Download className="mr-2 h-4 w-4" />Exportar
              </Button>
              <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={() => setEdicao("novo")}>
                <Plus className="mr-2 h-4 w-4" />Novo certificado
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {lista.map((c) => (
              <div key={c.id} className={`rounded-2xl border p-4 ${c.situacao === "Vencido" || c.situacao === "Crítico" ? "border-destructive/40 bg-destructive/5" : c.situacao === "Atenção" ? "border-brand-orange/40 bg-brand-orange/5" : "border-border/70"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-brand-orange" />
                      <span className="truncate font-medium">{c.tipo}</span>
                    </div>
                    <div className="truncate text-sm text-muted-foreground">{c.titular} · <span className="font-mono text-xs">{c.documento || "—"}</span></div>
                  </div>
                  <Badge className={`rounded-full ${tomSituacao(c.situacao)}`} variant="secondary">{c.situacao}</Badge>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div>Emissão<div className="font-mono text-foreground">{dataBR(c.emissao)}</div></div>
                  <div>Validade<div className="font-mono text-foreground">{dataBR(c.validade)}</div></div>
                  <div>Prazo<div className="font-mono text-foreground">{c.diasParaVencer >= 0 ? `${c.diasParaVencer} dias` : `${Math.abs(c.diasParaVencer)} dias vencido`}</div></div>
                </div>

                <Progress value={Math.max(0, Math.min(100, (c.diasParaVencer / 365) * 100))} className="mt-3" />
                {c.alerta && <p className="mt-2 text-xs text-muted-foreground">{c.alerta}</p>}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => { renovarCertificado(c.id, 12); toast.success("Certificado renovado por 12 meses."); }}>
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />Renovar
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setEdicao(c)}><Pencil className="mr-2 h-3.5 w-3.5" />Editar</Button>
                  <Button size="sm" variant="ghost" className="rounded-full text-destructive" onClick={() => { if (confirm("Excluir este certificado?")) { excluirCertificado(c.id); toast.success("Certificado excluído."); } }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {edicao && <DialogCertificado registro={edicao} onClose={() => setEdicao(null)} />}
    </div>
  );
}

/* ============================== documentos =============================== */

function DialogDocumento({ registro, competencia, onClose }: { registro: DocumentoCalculado | "novo"; competencia: string; onClose: () => void }) {
  const novo = registro === "novo";
  const atual = novo ? null : registro;
  const { empresa } = useEmpresaAtual();
  const contratos = useMemo(() => contratosCalculados(empresa?.id), [empresa]);
  const inputArquivo = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<{ nome: string; tipo: string; kb: number } | null>(
    atual?.arquivoNome ? { nome: atual.arquivoNome, tipo: atual.arquivoTipo || "", kb: atual.tamanhoKb } : null,
  );
  const [form, setForm] = useState({
    nome: atual?.nome || "",
    tipo: atual?.tipo || "Contábil",
    competencia: atual?.competencia || competencia,
    emissao: atual?.emissao || hojeISO(),
    validade: atual?.validade || "",
    responsavel: atual?.responsavel || "Administrativo",
    contratoId: atual?.contratoId || "",
    tags: (atual?.tags || []).join(", "),
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const selecionarArquivo = (file?: File | null) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) return toast.error("Arquivo maior que 20 MB.");
    setArquivo({ nome: file.name, tipo: file.type || "arquivo", kb: Math.max(1, Math.round(file.size / 1024)) });
    setForm((f) => ({ ...f, nome: f.nome || file.name.replace(/\.[^.]+$/, "") }));
    toast.success("Arquivo anexado.");
  };

  const salvar = () => {
    try {
      salvarDocumento({
        id: atual?.id, empresaId: atual?.empresaId ?? empresa?.id,
        nome: form.nome, tipo: form.tipo, competencia: form.competencia,
        emissao: form.emissao, validade: form.validade || undefined,
        responsavel: form.responsavel, contratoId: form.contratoId || undefined,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        arquivoNome: arquivo?.nome, arquivoTipo: arquivo?.tipo,
        tamanhoKb: arquivo?.kb,
      });
      toast.success(novo ? "Documento anexado ao cofre." : "Documento atualizado.");
      onClose();
    } catch (e: any) { toast.error(e?.message || "Não foi possível salvar."); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <DialogTitle className="font-display text-2xl">{novo ? "Enviar documento" : "Editar documento"}</DialogTitle>
            <AssistenteCampos
              titulo="Documentos e anexos"
              campos={[
                { key: "nome", label: "Nome do documento", required: true, ajuda: "Use um padrão claro: tipo + competência (ex.: Extrato bancário 08/2026)." },
                { key: "tipo", label: "Tipo", required: true, ajuda: "Classifica o documento no cofre e alimenta o checklist mensal obrigatório." },
                { key: "competencia", label: "Competência", ajuda: "MM/AAAA a que o documento se refere. Use '—' para documentos permanentes, como o contrato social." },
                { key: "validade", label: "Validade", ajuda: "Preencha para alvarás, apólices e certidões. Documento vencido não vale como comprovação." },
                { key: "contratoId", label: "Contrato vinculado", ajuda: "Amarra o anexo a um contrato, formando o dossiê contratual." },
                { key: "tags", label: "Tags", ajuda: "Palavras-chave separadas por vírgula para facilitar a busca." },
              ]}
              draft={form}
            />
          </div>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 space-y-1.5 sm:col-span-7">
            <Label className="text-xs">Nome do documento *</Label>
            <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Extrato bancário 08/2026" />
          </div>
          <div className="col-span-12 space-y-1.5 sm:col-span-5">
            <Label className="text-xs">Tipo *</Label>
            <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS_DOCUMENTO.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-6 space-y-1.5 sm:col-span-3">
            <Label className="text-xs">Competência</Label>
            <Input value={form.competencia} onChange={(e) => set("competencia", e.target.value)} className="font-mono" placeholder="08/2026" />
          </div>
          <div className="col-span-6 space-y-1.5 sm:col-span-3">
            <Label className="text-xs">Emissão</Label>
            <Input type="date" value={form.emissao} onChange={(e) => set("emissao", e.target.value)} />
          </div>
          <div className="col-span-6 space-y-1.5 sm:col-span-3">
            <Label className="text-xs">Validade</Label>
            <Input type="date" value={form.validade} onChange={(e) => set("validade", e.target.value)} />
          </div>
          <div className="col-span-6 space-y-1.5 sm:col-span-3">
            <Label className="text-xs">Responsável</Label>
            <Input value={form.responsavel} onChange={(e) => set("responsavel", e.target.value)} />
          </div>
          <div className="col-span-12 space-y-1.5 sm:col-span-6">
            <Label className="text-xs">Contrato vinculado</Label>
            <Select value={form.contratoId || "nenhum"} onValueChange={(v) => set("contratoId", v === "nenhum" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">Sem vínculo</SelectItem>
                {contratos.map((c) => <SelectItem key={c.id} value={c.id}>{c.numero} · {c.contraparte}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-12 space-y-1.5 sm:col-span-6">
            <Label className="text-xs">Tags</Label>
            <Input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="conciliação, fechamento" />
          </div>
          <div className="col-span-12 space-y-1.5">
            <Label className="text-xs">Arquivo</Label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); selecionarArquivo(e.dataTransfer.files?.[0]); }}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-brand-orange/40 bg-brand-orange/5 p-4"
            >
              {arquivo ? (
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 shrink-0 text-brand-orange" />
                    <span className="truncate">{arquivo.nome}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{arquivo.kb} KB · {arquivo.tipo || "arquivo"}</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Arraste o arquivo aqui ou selecione (PDF, XML, imagem, planilha — até 20 MB).
                </p>
              )}
              <div className="flex items-center gap-2">
                {arquivo ? (
                  <Button size="sm" variant="ghost" className="rounded-full text-destructive" onClick={() => setArquivo(null)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => inputArquivo.current?.click()}>
                  <Plus className="mr-2 h-3.5 w-3.5" />{arquivo ? "Trocar arquivo" : "Anexar arquivo"}
                </Button>
              </div>
              <input
                ref={inputArquivo}
                type="file"
                className="hidden"
                accept=".pdf,.xml,.png,.jpg,.jpeg,.csv,.xls,.xlsx,.doc,.docx,.txt,.zip"
                onChange={(e) => { selecionarArquivo(e.target.files?.[0]); e.target.value = ""; }}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" className="rounded-full" onClick={onClose}>Cancelar</Button>
          <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={salvar}>Salvar documento</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Documentos() {
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const tick = useRefresh();
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [edicao, setEdicao] = useState<DocumentoCalculado | "novo" | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lista = useMemo(() => documentosCalculados(empresa?.id), [empresa, tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const porTipo = useMemo(() => documentosPorTipo(empresa?.id), [empresa, tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const check = useMemo(() => conformidadeCompetencia(competencia, empresa?.id), [competencia, empresa, tick]);

  const filtrados = lista.filter((d) => {
    const t = busca.trim().toLowerCase();
    if (t && ![d.nome, d.tipo, d.competencia, d.responsavel, d.tags.join(" ")].join(" ").toLowerCase().includes(t)) return false;
    if (tipo !== "todos" && d.tipo !== tipo) return false;
    return true;
  });

  const vencidos = lista.filter((d) => d.situacao === "Vencido").length;
  const aVencer = lista.filter((d) => d.situacao === "A vencer").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Documentos no cofre" valor={String(lista.length)} tom="destaque" />
        <Kpi label="Conformidade da competência" valor={`${check.percentual}%`} hint={`${check.ok} de ${check.total} obrigatórios · ${competencia}`} tom={check.percentual === 100 ? "ok" : "alerta"} />
        <Kpi label="Com validade vencida" valor={String(vencidos)} tom={vencidos ? "alerta" : "ok"} />
        <Kpi label="Vencendo em 60 dias" valor={String(aVencer)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="rounded-3xl shadow-card lg:col-span-3">
          <CardContent className="space-y-3 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-xl">Checklist obrigatório · {competencia}</h3>
                <p className="text-sm text-muted-foreground">A competência só é considerada conforme com todos os itens válidos.</p>
              </div>
              <Badge className={`rounded-full ${check.percentual === 100 ? tomSituacao("Vigente") : tomSituacao("A vencer")}`} variant="secondary">
                {check.percentual === 100 ? "Conforme" : "Pendências"}
              </Badge>
            </div>
            <Progress value={check.percentual} />
            <ul className="space-y-2">
              {check.itens.map((i) => (
                <li key={i.tipo} className="flex items-start justify-between gap-3 rounded-2xl border border-border/70 p-3 text-sm">
                  <div className="flex items-start gap-2">
                    {i.ok
                      ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />}
                    <div>
                      <div className="font-medium">{i.nome}</div>
                      <div className="text-xs text-muted-foreground">{i.documento || i.ajuda}</div>
                    </div>
                  </div>
                  {!i.ok && (
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => setEdicao("novo")}>
                      <Plus className="mr-1 h-3.5 w-3.5" />Anexar
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-card lg:col-span-2">
          <CardContent className="space-y-3 p-6">
            <div>
              <h3 className="font-display text-xl">Acervo por tipo</h3>
              <p className="text-sm text-muted-foreground">Distribuição do cofre documental.</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porTipo} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis type="category" dataKey="tipo" width={110} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <Tooltip {...CHART_TOOLTIP} />
                  <Bar dataKey="qtd" radius={[0, 8, 8, 0]}>
                    {porTipo.map((_, i) => <Cell key={i} fill={i === 0 ? "var(--brand-orange)" : "var(--brand-blue)"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl shadow-card">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar documento, tag, responsável..." className="w-[280px] pl-9" />
              </div>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  {TIPOS_DOCUMENTO.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => exportarCSV("documentos", filtrados.map((d) => ({
                Nome: d.nome, Tipo: d.tipo, Competencia: d.competencia, Emissao: dataBR(d.emissao),
                Validade: d.validade ? dataBR(d.validade) : "—", Situacao: d.situacao, Responsavel: d.responsavel,
              })))}>
                <Download className="mr-2 h-4 w-4" />Exportar
              </Button>
              <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={() => setEdicao("novo")}>
                <Plus className="mr-2 h-4 w-4" />Enviar documento
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="font-mono">Competência</TableHead>
                  <TableHead className="font-mono">Validade</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-center">Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="truncate">{d.nome}</div>
                          <div className="text-[10px] text-muted-foreground">{d.tags.join(" · ") || `${d.tamanhoKb} KB`}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{d.tipo}</TableCell>
                    <TableCell className="font-mono text-xs">{d.competencia}</TableCell>
                    <TableCell className="font-mono text-xs">{d.validade ? dataBR(d.validade) : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.responsavel}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={`rounded-full ${tomSituacao(d.situacao)}`} variant="secondary">{d.situacao}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setEdicao(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="rounded-full text-destructive" onClick={() => { if (confirm(`Excluir "${d.nome}"?`)) { excluirDocumento(d.id); toast.success("Documento removido."); } }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtrados.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Nenhum documento encontrado.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {edicao && <DialogDocumento registro={edicao} competencia={competencia} onClose={() => setEdicao(null)} />}
    </div>
  );
}

/* ================================ agenda ================================= */

function Agenda() {
  const { empresa } = useEmpresaAtual();
  const tick = useRefresh();
  const [origem, setOrigem] = useState("todas");
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false);
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState({ titulo: "", data: hojeISO(), responsavel: "Administrativo", detalhe: "" });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const eventos = useMemo(() => agendaConsolidada(empresa?.id), [empresa, tick]);

  const filtrados = eventos.filter((e) => (origem === "todas" || e.origem === origem) && (mostrarConcluidos || !e.concluido));
  const proximos30 = eventos.filter((e) => !e.concluido && e.data >= hojeISO() && e.data <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const atrasados = eventos.filter((e) => !e.concluido && e.data < hojeISO());

  const grupos = filtrados.reduce<Record<string, typeof filtrados>>((acc, e) => {
    const chave = `${e.data.slice(5, 7)}/${e.data.slice(0, 4)}`;
    (acc[chave] ||= []).push(e);
    return acc;
  }, {});

  const salvar = () => {
    try {
      salvarEvento(form);
      toast.success("Compromisso adicionado à agenda.");
      setNovo(false);
      setForm({ titulo: "", data: hojeISO(), responsavel: "Administrativo", detalhe: "" });
    } catch (e: any) { toast.error(e?.message || "Não foi possível salvar."); }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Compromissos monitorados" valor={String(eventos.filter((e) => !e.concluido).length)} tom="destaque" />
        <Kpi label="Próximos 30 dias" valor={String(proximos30.length)} />
        <Kpi label="Em atraso" valor={String(atrasados.length)} tom={atrasados.length ? "alerta" : "ok"} />
        <Kpi label="Concluídos" valor={String(eventos.filter((e) => e.concluido).length)} tom="ok" />
      </div>

      <Card className="rounded-3xl shadow-card">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-xl">Linha do tempo administrativa</h3>
              <p className="text-sm text-muted-foreground">Prazos gerados automaticamente por contratos, reajustes, certificados e documentos.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={origem} onValueChange={setOrigem}>
                <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["todas", "Contrato", "Reajuste", "Certificado", "Documento", "Manual"].map((o) => (
                    <SelectItem key={o} value={o}>{o === "todas" ? "Todas as origens" : o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" className="rounded-full" onClick={() => setMostrarConcluidos((v) => !v)}>
                {mostrarConcluidos ? "Ocultar concluídos" : "Mostrar concluídos"}
              </Button>
              <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={() => setNovo(true)}>
                <Plus className="mr-2 h-4 w-4" />Novo compromisso
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {Object.entries(grupos).map(([mes, itens]) => (
              <div key={mes} className="space-y-2">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{mes}</div>
                {itens.map((e) => {
                  const atrasado = !e.concluido && e.data < hojeISO();
                  return (
                    <div key={e.id} className={`flex flex-wrap items-start gap-3 rounded-2xl border p-4 ${atrasado ? "border-destructive/40 bg-destructive/5" : "border-border/70"} ${e.concluido ? "opacity-60" : ""}`}>
                      <div className="w-16 shrink-0 text-center">
                        <div className="font-mono text-lg">{e.data.slice(8, 10)}</div>
                        <div className="text-[10px] uppercase text-muted-foreground">{e.data.slice(5, 7)}/{e.data.slice(2, 4)}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`font-medium ${e.concluido ? "line-through" : ""}`}>{e.titulo}</span>
                          <Badge variant="secondary" className="rounded-full text-[10px]">{e.origem}</Badge>
                          {atrasado && <Badge className="rounded-full bg-destructive/15 text-[10px] text-destructive" variant="secondary">Em atraso</Badge>}
                        </div>
                        {e.detalhe && <p className="text-sm text-muted-foreground">{e.detalhe}</p>}
                        <p className="text-xs text-muted-foreground">Responsável: {e.responsavel}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="rounded-full" onClick={() => { alternarConclusao(e.id); toast.success(e.concluido ? "Compromisso reaberto." : "Compromisso concluído."); }}>
                          <CheckCircle2 className={`h-4 w-4 ${e.concluido ? "text-emerald-500" : ""}`} />
                        </Button>
                        {e.origem === "Manual" && (
                          <Button size="sm" variant="ghost" className="rounded-full text-destructive" onClick={() => { excluirEvento(e.id); toast.success("Compromisso removido."); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            {filtrados.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">Nenhum compromisso nesta visão.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {novo && (
        <Dialog open onOpenChange={(o) => !o && setNovo(false)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center justify-between gap-3 pr-6">
                <DialogTitle className="font-display text-2xl">Novo compromisso</DialogTitle>
                <AssistenteCampos
                  titulo="Agenda administrativa"
                  campos={[
                    { key: "titulo", label: "Compromisso", required: true, ajuda: "Descreva a obrigação interna: reunião, entrega, renovação, assembleia." },
                    { key: "data", label: "Data", required: true, ajuda: "Data limite. Compromissos com data passada aparecem como 'em atraso'." },
                    { key: "responsavel", label: "Responsável", ajuda: "Área ou pessoa que responde pelo prazo." },
                  ]}
                  draft={form}
                />
              </div>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Compromisso *</Label>
                <Input value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data *</Label>
                <Input type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Responsável</Label>
                <Input value={form.responsavel} onChange={(e) => setForm((f) => ({ ...f, responsavel: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Detalhe</Label>
                <Textarea rows={2} value={form.detalhe} onChange={(e) => setForm((f) => ({ ...f, detalhe: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="rounded-full" onClick={() => setNovo(false)}>Cancelar</Button>
              <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={salvar}>Adicionar</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/* ================================ página ================================= */

const AJUDA_TELA: Record<string, { key: string; label: string; ajuda: string }[]> = {
  contratos: [
    { key: "situacao", label: "Situação", ajuda: "Derivada da vigência: Vigente, A vencer (90 dias), Vencido, Encerrado ou Futuro." },
    { key: "reajuste", label: "Reajuste", ajuda: "Projetado a cada 12 meses do início, pelo índice pactuado (IPCA, IGP-M ou INPC)." },
    { key: "aviso", label: "Aviso prévio", ajuda: "Prazo para comunicar a não renovação. Esgotado, o contrato renova tacitamente se assim pactuado." },
    { key: "global", label: "Compromisso remanescente", ajuda: "Valor mensal multiplicado pelos meses que faltam até o fim da vigência." },
    { key: "aditivo", label: "Aditivo", ajuda: "Altera valor, prazo ou escopo e fica no histórico auditável do contrato." },
  ],
  certificados: [
    { key: "validade", label: "Validade", ajuda: "A1 costuma valer 1 ano; A3 até 3 anos. Alertas em D-60, D-30 e D-7." },
    { key: "procuracao", label: "Procuração e-CAC", ajuda: "Autoriza a contabilidade a acessar o portal da Receita em nome da empresa." },
    { key: "impacto", label: "Impacto do vencimento", ajuda: "Sem certificado válido, NF-e, NFS-e, SPED e DCTFWeb deixam de ser transmitidos." },
  ],
  documentos: [
    { key: "checklist", label: "Checklist mensal", ajuda: "Extrato, balancete, apuração e notas dos contratos precisam existir e estar válidos na competência." },
    { key: "validade", label: "Validade", ajuda: "Alvarás, apólices e certidões vencidas não servem como comprovação." },
    { key: "vinculo", label: "Vínculo contratual", ajuda: "Documentos amarrados a um contrato formam o dossiê contratual completo." },
  ],
  agenda: [
    { key: "origem", label: "Origem", ajuda: "Contrato, Reajuste, Certificado e Documento são gerados automaticamente; Manual é criado por você." },
    { key: "atraso", label: "Em atraso", ajuda: "Compromisso não concluído com data anterior a hoje." },
  ],
};

export default function ContratosDocumentos() {
  const { modulo } = useParams();
  const tela = TELAS[modulo || ""];

  if (!tela) {
    return (
      <div className="space-y-4 py-24 text-center">
        <h1 className="font-display text-3xl">Tela não encontrada</h1>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/administrativo/contratos">Voltar para Contratos e documentos</Link>
        </Button>
      </div>
    );
  }

  const Icon = tela.icon;

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/dashboard" className="hover:text-foreground">Início</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/administrativo" className="hover:text-foreground">Administrativo</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/administrativo/contratos" className="hover:text-foreground">Contratos e documentos</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{tela.titulo}</span>
      </nav>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-card shadow-card">
            <Icon className="h-6 w-6 text-brand-orange" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Administrativo · Contratos e documentos</div>
            <h1 className="mt-1.5 font-display text-4xl">{tela.titulo}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{tela.desc}</p>
          </div>
        </div>
        <AssistenteCampos
          titulo={tela.titulo}
          campos={AJUDA_TELA[modulo || ""] || []}
          contextoExtra={{ modulo: tela.titulo, area: "Administrativo · Contratos e documentos" }}
        />
      </div>

      {modulo === "contratos" && <Contratos />}
      {modulo === "certificados" && <Certificados />}
      {modulo === "documentos" && <Documentos />}
      {modulo === "agenda" && <Agenda />}
    </div>
  );
}
