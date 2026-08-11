import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRightLeft, Boxes, CheckCircle2, ChevronRight, Download, MapPin, Pencil, PieChart as PieIcon,
  Plus, RotateCcw, Search, Trash2, TrendingDown, Wrench,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, Checkbox, Dialog, DialogContent, DialogHeader, DialogTitle,
  Input, Label, Progress, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea,
} from "@/design-system/mj-design-system-db98fa";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { toast } from "sonner";
import AssistenteCampos, { type CampoAjuda } from "@/components/contabil/AssistenteCampos";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { useCompetencia, formatCompetencia } from "@/lib/competencia";
import {
  CENTROS_CUSTO, CONTA_POR_GRUPO, GRUPOS, LOCALIZACOES, MOTIVOS_BAIXA, PATRIMONIO_EVENT,
  RESIDUAL_SUGERIDO, acatarLocalContagem, baixarBem, bensCalculados, brl, dataBR, estornarBaixa,
  excluirBem, hojeISO, inventarioCompetencia, listarMovimentos, memoriaCalculo, pct, porCentroCusto,
  porGrupo, projecaoDepreciacao, registrarBenfeitoria, registrarContagem, resumoInventario,
  resumoPatrimonio, salvarBem, transferirBem,
  type BemCalculado, type GrupoBem, type MotivoBaixa, type SituacaoContagem,
} from "@/lib/patrimonioStore";

/* ============================== apoio visual ============================= */

const TELAS: Record<string, { titulo: string; desc: string; icon: typeof Boxes }> = {
  bens: { titulo: "Bens do imobilizado", desc: "Ficha patrimonial completa: aquisição, vida útil, centro de custo e localização.", icon: Boxes },
  depreciacao: { titulo: "Depreciação", desc: "Quota mensal, saldo residual e memória de cálculo por bem e por centro de custo.", icon: TrendingDown },
  movimentacoes: { titulo: "Movimentações", desc: "Transferências, benfeitorias capitalizadas e baixas com apuração de resultado.", icon: ArrowRightLeft },
  "inventario-bens": { titulo: "Inventário de bens", desc: "Confronto físico × contábil por local, com regularização das divergências.", icon: MapPin },
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

const CORES = ["var(--brand-orange)", "var(--brand-purple)", "var(--brand-blue)", "var(--brand-pink)", "var(--brand-red)"];

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
  s === "Em operação" || s === "Localizado" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
    : s === "Baixado" || s === "Não localizado" ? "bg-destructive/15 text-destructive"
      : s === "Totalmente depreciado" || s === "Local divergente" ? "bg-brand-orange/15 text-brand-orange"
        : "bg-muted text-muted-foreground";

function useRefresh() {
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    window.addEventListener(PATRIMONIO_EVENT, refresh);
    return () => window.removeEventListener(PATRIMONIO_EVENT, refresh);
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

/* ============================== ficha do bem ============================= */

const CAMPOS_BEM: CampoAjuda[] = [
  { key: "patrimonio", label: "Nº de patrimônio", required: true, ajuda: "Código da plaqueta física do bem. Deve ser único e é a chave usada no inventário." },
  { key: "descricao", label: "Descrição do bem", required: true, ajuda: "Identifique modelo, marca e capacidade. Ex.: 'Torno CNC Romi GL 240'." },
  { key: "grupo", label: "Grupo patrimonial", ajuda: "Define a conta contábil sugerida, a vida útil usual e o valor residual padrão." },
  { key: "contaContabil", label: "Conta contábil", ajuda: "Conta do imobilizado no plano de contas. Preenchida automaticamente pelo grupo." },
  { key: "centroCusto", label: "Centro de custo", ajuda: "Onde a depreciação é apropriada. Muda por transferência, nunca editando a ficha." },
  { key: "localizacao", label: "Localização física", ajuda: "Local onde o bem deve ser encontrado na contagem física do inventário." },
  { key: "fornecedor", label: "Fornecedor", ajuda: "Quem vendeu o bem. Encontrado na nota fiscal de entrada." },
  { key: "notaFiscal", label: "Nota fiscal", ajuda: "Número da NF-e de aquisição, usada para amarrar o bem ao documento fiscal e ao CIAP." },
  { key: "aquisicao", label: "Data de aquisição", required: true, ajuda: "Data de emissão/entrada da nota fiscal do bem." },
  { key: "inicioOperacao", label: "Início de operação", ajuda: "Data em que o bem entrou em uso. A depreciação começa no mês seguinte a ela." },
  { key: "valorAquisicao", label: "Valor de aquisição", required: true, ajuda: "Custo de aquisição capitalizado: valor da NF + frete + instalação, sem impostos recuperáveis." },
  { key: "residualPercent", label: "Valor residual (%)", ajuda: "Percentual estimado de valor ao fim da vida útil. Ele não é depreciado (CPC 27)." },
  { key: "vidaUtilMeses", label: "Vida útil (meses)", required: true, ajuda: "Prazo de uso econômico. Referências usuais: máquinas 120, veículos 48 a 60, informática 60, imóveis 300." },
  { key: "turnos", label: "Turnos de operação", ajuda: "2 turnos aplicam coeficiente 1,5 e 3 turnos coeficiente 2,0, acelerando a depreciação." },
  { key: "deprecia", label: "Bem depreciável", ajuda: "Desmarque para terrenos e bens em construção (imobilizado em andamento)." },
  { key: "creditoCiap", label: "Crédito de ICMS (CIAP)", ajuda: "Marque quando o ICMS do bem gera crédito em 48 parcelas, controlado no bloco G do SPED." },
];

const VIDA_SUGERIDA: Record<GrupoBem, number> = {
  "Máquinas e equipamentos": 120,
  "Veículos": 60,
  "Móveis e utensílios": 120,
  "Computadores e periféricos": 60,
  "Imóveis": 300,
  "Instalações": 120,
  "Ferramentas": 60,
  "Intangível": 60,
};

function DialogBem({ registro, onClose }: { registro: BemCalculado | "novo"; onClose: () => void }) {
  const novo = registro === "novo";
  const atual = novo ? null : registro;
  const { empresa } = useEmpresaAtual();
  const [form, setForm] = useState({
    patrimonio: atual?.patrimonio || "",
    descricao: atual?.descricao || "",
    grupo: (atual?.grupo || "Máquinas e equipamentos") as GrupoBem,
    contaContabil: atual?.contaContabil || CONTA_POR_GRUPO["Máquinas e equipamentos"],
    centroCusto: atual?.centroCusto || CENTROS_CUSTO[0],
    localizacao: atual?.localizacao || LOCALIZACOES[0],
    responsavel: atual?.responsavel || "",
    fornecedor: atual?.fornecedor || "",
    notaFiscal: atual?.notaFiscal || "",
    aquisicao: atual?.aquisicao || hojeISO(),
    inicioOperacao: atual?.inicioOperacao || hojeISO(),
    valorAquisicao: atual ? String(atual.valorAquisicao) : "",
    residualPercent: String(atual?.residualPercent ?? RESIDUAL_SUGERIDO["Máquinas e equipamentos"]),
    vidaUtilMeses: String(atual?.vidaUtilMeses ?? 120),
    turnos: String(atual?.turnos ?? 1),
    deprecia: atual?.deprecia ?? true,
    creditoCiap: atual?.creditoCiap ?? false,
    observacoes: atual?.observacoes || "",
  });
  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const trocarGrupo = (g: GrupoBem) =>
    setForm((f) => ({
      ...f,
      grupo: g,
      contaContabil: CONTA_POR_GRUPO[g],
      residualPercent: String(RESIDUAL_SUGERIDO[g]),
      vidaUtilMeses: String(VIDA_SUGERIDA[g]),
    }));

  const salvar = () => {
    try {
      salvarBem({
        id: atual?.id,
        empresaId: atual?.empresaId ?? empresa?.id,
        patrimonio: form.patrimonio,
        descricao: form.descricao,
        grupo: form.grupo,
        contaContabil: form.contaContabil,
        centroCusto: form.centroCusto,
        localizacao: form.localizacao,
        responsavel: form.responsavel,
        fornecedor: form.fornecedor,
        notaFiscal: form.notaFiscal,
        aquisicao: form.aquisicao,
        inicioOperacao: form.inicioOperacao || form.aquisicao,
        valorAquisicao: Number(form.valorAquisicao.replace(",", ".")) || 0,
        residualPercent: Number(form.residualPercent.replace(",", ".")) || 0,
        vidaUtilMeses: Number(form.vidaUtilMeses) || 0,
        turnos: (Number(form.turnos) || 1) as 1 | 2 | 3,
        deprecia: form.deprecia,
        creditoCiap: form.creditoCiap,
        observacoes: form.observacoes,
      });
      toast.success(novo ? "Bem incluído no imobilizado." : "Ficha patrimonial atualizada.");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const valor = Number(form.valorAquisicao.replace(",", ".")) || 0;
  const residual = valor * (Number(form.residualPercent.replace(",", ".")) || 0) / 100;
  const coef = form.turnos === "2" ? 1.5 : form.turnos === "3" ? 2 : 1;
  const vida = Math.max(Math.round((Number(form.vidaUtilMeses) || 1) / coef), 1);
  const quota = form.deprecia ? (valor - residual) / vida : 0;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <DialogTitle className="font-display text-2xl">{novo ? "Novo bem" : `Bem ${atual?.patrimonio}`}</DialogTitle>
            <AssistenteCampos titulo="Ficha do bem patrimonial" campos={CAMPOS_BEM} draft={Object.fromEntries(Object.entries(form).map(([k, v]) => [k, String(v)]))} />
          </div>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-4 space-y-1.5">
            <Label className="text-xs">Nº de patrimônio *</Label>
            <Input value={form.patrimonio} onChange={(e) => set("patrimonio", e.target.value)} placeholder="PT-0000" />
          </div>
          <div className="col-span-8 space-y-1.5">
            <Label className="text-xs">Descrição do bem *</Label>
            <Input value={form.descricao} onChange={(e) => set("descricao", e.target.value)} />
          </div>

          <div className="col-span-5 space-y-1.5">
            <Label className="text-xs">Grupo patrimonial</Label>
            <Select value={form.grupo} onValueChange={(v) => trocarGrupo(v as GrupoBem)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{GRUPOS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-3 space-y-1.5">
            <Label className="text-xs">Conta contábil</Label>
            <Input className="font-mono" value={form.contaContabil} onChange={(e) => set("contaContabil", e.target.value)} />
          </div>
          <div className="col-span-4 space-y-1.5">
            <Label className="text-xs">Responsável</Label>
            <Input value={form.responsavel} onChange={(e) => set("responsavel", e.target.value)} />
          </div>

          <div className="col-span-4 space-y-1.5">
            <Label className="text-xs">Centro de custo</Label>
            <Select value={form.centroCusto} onValueChange={(v) => set("centroCusto", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CENTROS_CUSTO.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-4 space-y-1.5">
            <Label className="text-xs">Localização física</Label>
            <Select value={form.localizacao} onValueChange={(v) => set("localizacao", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LOCALIZACOES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-4 space-y-1.5">
            <Label className="text-xs">Fornecedor</Label>
            <Input value={form.fornecedor} onChange={(e) => set("fornecedor", e.target.value)} />
          </div>

          <div className="col-span-3 space-y-1.5">
            <Label className="text-xs">Nota fiscal</Label>
            <Input className="font-mono" value={form.notaFiscal} onChange={(e) => set("notaFiscal", e.target.value)} />
          </div>
          <div className="col-span-3 space-y-1.5">
            <Label className="text-xs">Aquisição *</Label>
            <Input type="date" value={form.aquisicao} onChange={(e) => set("aquisicao", e.target.value)} />
          </div>
          <div className="col-span-3 space-y-1.5">
            <Label className="text-xs">Início de operação</Label>
            <Input type="date" value={form.inicioOperacao} onChange={(e) => set("inicioOperacao", e.target.value)} />
          </div>
          <div className="col-span-3 space-y-1.5">
            <Label className="text-xs">Valor de aquisição *</Label>
            <Input className="font-mono" inputMode="decimal" value={form.valorAquisicao} onChange={(e) => set("valorAquisicao", e.target.value)} />
          </div>

          <div className="col-span-3 space-y-1.5">
            <Label className="text-xs">Valor residual (%)</Label>
            <Input className="font-mono" inputMode="decimal" value={form.residualPercent} onChange={(e) => set("residualPercent", e.target.value)} />
          </div>
          <div className="col-span-3 space-y-1.5">
            <Label className="text-xs">Vida útil (meses) *</Label>
            <Input className="font-mono" inputMode="numeric" value={form.vidaUtilMeses} onChange={(e) => set("vidaUtilMeses", e.target.value)} />
          </div>
          <div className="col-span-3 space-y-1.5">
            <Label className="text-xs">Turnos de operação</Label>
            <Select value={form.turnos} onValueChange={(v) => set("turnos", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 turno (coef. 1,0)</SelectItem>
                <SelectItem value="2">2 turnos (coef. 1,5)</SelectItem>
                <SelectItem value="3">3 turnos (coef. 2,0)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-3 flex items-end gap-4 pb-2">
            <label className="flex items-center gap-2 text-xs">
              <Checkbox checked={form.deprecia} onCheckedChange={(v) => set("deprecia", Boolean(v))} />Deprecia
            </label>
            <label className="flex items-center gap-2 text-xs">
              <Checkbox checked={form.creditoCiap} onCheckedChange={(v) => set("creditoCiap", Boolean(v))} />CIAP
            </label>
          </div>

          <div className="col-span-12 space-y-1.5">
            <Label className="text-xs">Observações</Label>
            <Textarea rows={2} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
          </div>

          <div className="col-span-12 rounded-2xl border border-brand-orange/40 bg-brand-orange/5 p-4">
            <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Prévia do cálculo</div>
            <div className="mt-1 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div><span className="text-muted-foreground">Base depreciável</span><div className="font-mono">{brl(Math.max(valor - residual, 0))}</div></div>
              <div><span className="text-muted-foreground">Quota mensal</span><div className="font-mono">{brl(quota)}</div></div>
              <div><span className="text-muted-foreground">Taxa anual</span><div className="font-mono">{pct((12 / vida) * 100)}</div></div>
              <div><span className="text-muted-foreground">Vida útil efetiva</span><div className="font-mono">{vida} meses</div></div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" className="rounded-full" onClick={onClose}>Cancelar</Button>
          <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={salvar}>Salvar bem</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================ diálogos de ação =========================== */

function DialogTransferencia({ bem, onClose }: { bem: BemCalculado; onClose: () => void }) {
  const [form, setForm] = useState({
    centroCusto: bem.centroCusto, localizacao: bem.localizacao, responsavel: bem.responsavel,
    data: hojeISO(), motivo: "",
  });
  const aplicar = () => {
    try {
      transferirBem(bem.id, form);
      toast.success("Transferência registrada no histórico do bem.");
      onClose();
    } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <DialogTitle className="font-display text-2xl">Transferir {bem.patrimonio}</DialogTitle>
            <AssistenteCampos
              titulo="Transferência patrimonial"
              campos={[
                { key: "centroCusto", label: "Centro de custo destino", ajuda: "A partir da transferência a depreciação passa a ser apropriada neste centro." },
                { key: "localizacao", label: "Localização destino", ajuda: "Local físico onde o bem passará a ser conferido no inventário." },
                { key: "motivo", label: "Motivo", required: true, ajuda: "Justificativa auditável: realocação, empréstimo entre filiais, mudança de setor." },
              ]}
              draft={form}
            />
          </div>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Centro de custo destino</Label>
            <Select value={form.centroCusto} onValueChange={(v) => setForm((f) => ({ ...f, centroCusto: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CENTROS_CUSTO.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Localização destino</Label>
            <Select value={form.localizacao} onValueChange={(v) => setForm((f) => ({ ...f, localizacao: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LOCALIZACOES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Responsável</Label>
            <Input value={form.responsavel} onChange={(e) => setForm((f) => ({ ...f, responsavel: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Data</Label>
            <Input type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs">Motivo *</Label>
            <Textarea rows={2} value={form.motivo} onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" className="rounded-full" onClick={onClose}>Cancelar</Button>
          <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={aplicar}>Transferir</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DialogBaixa({ bem, competencia, onClose }: { bem: BemCalculado; competencia: string; onClose: () => void }) {
  const [form, setForm] = useState({ data: hojeISO(), motivo: "Venda" as MotivoBaixa, valor: "", documento: "" });
  const valor = Number(form.valor.replace(",", ".")) || 0;
  const resultado = valor - bem.valorContabil;
  const aplicar = () => {
    try {
      const r = baixarBem(bem.id, { data: form.data, motivo: form.motivo, valor, documento: form.documento }, competencia);
      toast.success(`Baixa registrada. ${r >= 0 ? "Ganho" : "Perda"} de capital de ${brl(Math.abs(r))}.`);
      onClose();
    } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <DialogTitle className="font-display text-2xl">Baixar {bem.patrimonio}</DialogTitle>
            <AssistenteCampos
              titulo="Baixa de bem do imobilizado"
              campos={[
                { key: "motivo", label: "Motivo da baixa", required: true, ajuda: "Venda, sucateamento, doação, perda/sinistro ou devolução. Define o tratamento contábil e fiscal." },
                { key: "valor", label: "Valor recebido", ajuda: "Valor da venda ou indenização. Em sucateamento e perda, normalmente zero." },
                { key: "documento", label: "Documento", ajuda: "NF-e de saída, termo de doação, boletim de ocorrência ou laudo de sucateamento." },
              ]}
              draft={form}
            />
          </div>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Data da baixa *</Label>
            <Input type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Motivo *</Label>
            <Select value={form.motivo} onValueChange={(v) => setForm((f) => ({ ...f, motivo: v as MotivoBaixa }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MOTIVOS_BAIXA.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Valor recebido</Label>
            <Input className="font-mono" inputMode="decimal" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Documento</Label>
            <Input value={form.documento} onChange={(e) => setForm((f) => ({ ...f, documento: e.target.value }))} />
          </div>
          <div className={`col-span-2 rounded-2xl border p-4 ${resultado >= 0 ? "border-emerald-500/40 bg-emerald-500/5" : "border-destructive/40 bg-destructive/5"}`}>
            <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Apuração do resultado</div>
            <div className="mt-1 grid grid-cols-3 gap-3 text-sm">
              <div><span className="text-muted-foreground">Valor contábil</span><div className="font-mono">{brl(bem.valorContabil)}</div></div>
              <div><span className="text-muted-foreground">Valor recebido</span><div className="font-mono">{brl(valor)}</div></div>
              <div>
                <span className="text-muted-foreground">{resultado >= 0 ? "Ganho de capital" : "Perda de capital"}</span>
                <div className={`font-mono ${resultado >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>{brl(Math.abs(resultado))}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" className="rounded-full" onClick={onClose}>Cancelar</Button>
          <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={aplicar}>Confirmar baixa</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DialogBenfeitoria({ bem, onClose }: { bem: BemCalculado; onClose: () => void }) {
  const [form, setForm] = useState({ valor: "", descricao: "", data: hojeISO() });
  const aplicar = () => {
    try {
      registrarBenfeitoria(bem.id, Number(form.valor.replace(",", ".")) || 0, form.descricao, form.data);
      toast.success("Benfeitoria capitalizada no valor do bem.");
      onClose();
    } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <DialogTitle className="font-display text-2xl">Benfeitoria em {bem.patrimonio}</DialogTitle>
            <AssistenteCampos
              titulo="Benfeitoria capitalizada"
              campos={[
                { key: "valor", label: "Valor capitalizado", required: true, ajuda: "Só capitalize gastos que aumentam a vida útil ou a capacidade do bem. Manutenção corriqueira é despesa." },
                { key: "descricao", label: "Descrição", required: true, ajuda: "Descreva a melhoria e o documento que a comprova (NF de serviço, laudo de engenharia)." },
              ]}
              draft={form}
            />
          </div>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Valor capitalizado *</Label>
            <Input className="font-mono" inputMode="decimal" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Data</Label>
            <Input type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs">Descrição *</Label>
            <Textarea rows={2} value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" className="rounded-full" onClick={onClose}>Cancelar</Button>
          <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={aplicar}>Capitalizar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================== tela: bens =============================== */

function Bens() {
  useRefresh();
  const { competencia, competenciasNoPeriodo, isPeriodo, competenciaFim } = useCompetencia();
  const [busca, setBusca] = useState("");
  const [grupo, setGrupo] = useState("todos");
  const [situacao, setSituacao] = useState("ativos");
  const [edicao, setEdicao] = useState<BemCalculado | "novo" | null>(null);
  const [transferir, setTransferir] = useState<BemCalculado | null>(null);
  const [baixar, setBaixar] = useState<BemCalculado | null>(null);
  const [benfeitoria, setBenfeitoria] = useState<BemCalculado | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);

  const lista = useMemo(() => bensCalculados(competenciasNoPeriodo), [competenciasNoPeriodo]);
  const resumo = useMemo(() => resumoPatrimonio(competenciasNoPeriodo), [competenciasNoPeriodo]);
  const grupos = useMemo(() => porGrupo(competenciasNoPeriodo), [competenciasNoPeriodo]);

  const filtrados = lista.filter((b) => {
    if (grupo !== "todos" && b.grupo !== grupo) return false;
    if (situacao === "ativos" && b.situacao === "Baixado") return false;
    if (situacao === "baixados" && b.situacao !== "Baixado") return false;
    if (situacao === "depreciados" && b.situacao !== "Totalmente depreciado") return false;
    const t = busca.trim().toLowerCase();
    if (!t) return true;
    return [b.patrimonio, b.descricao, b.centroCusto, b.localizacao, b.fornecedor].join(" ").toLowerCase().includes(t);
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Bens ativos" valor={String(resumo.qtdAtivos)} hint={`${resumo.qtdBaixados} baixados`} />
        <Kpi label="Valor de aquisição" valor={brl(resumo.valorAquisicao)} tom="destaque" />
        <Kpi label="Depreciação acumulada" valor={brl(resumo.depreciacaoAcumulada)} />
        <Kpi label="Valor contábil líquido" valor={brl(resumo.valorContabil)} tom="ok" />
        <Kpi label={`Despesa ${formatCompetencia(competencia)}`} valor={brl(resumo.despesaCompetencia)} />
        <Kpi label="Totalmente depreciados" valor={String(resumo.totalmenteDepreciados)} tom={resumo.totalmenteDepreciados ? "alerta" : undefined} hint="Revisar vida útil" />
      </div>

      <Card className="rounded-3xl shadow-card">
        <CardContent className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl">Composição por grupo patrimonial</h2>
              <p className="text-sm text-muted-foreground">Valor contábil líquido dos bens ativos em {formatCompetencia(competencia)}.</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={grupos} margin={{ top: 8, right: 8, left: 8, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="grupo" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={60} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                <Tooltip {...CHART_TOOLTIP} formatter={(v: number) => brl(Number(v))} />
                <Bar dataKey="contabil" name="Valor contábil" radius={[8, 8, 0, 0]}>
                  {grupos.map((g, i) => <Cell key={g.grupo} fill={CORES[i % CORES.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl shadow-card">
        <CardContent className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl">Ficha patrimonial</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="w-56 pl-9" placeholder="Buscar bem, local, fornecedor" value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
              <Select value={grupo} onValueChange={setGrupo}>
                <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os grupos</SelectItem>
                  {GRUPOS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={situacao} onValueChange={setSituacao}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativos">Ativos</SelectItem>
                  <SelectItem value="depreciados">Totalmente depreciados</SelectItem>
                  <SelectItem value="baixados">Baixados</SelectItem>
                  <SelectItem value="todos">Todos</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="rounded-full" onClick={() => exportarCSV(`bens-${competencia}`, filtrados.map((b) => ({
                Patrimonio: b.patrimonio, Bem: b.descricao, Grupo: b.grupo, Centro: b.centroCusto, Local: b.localizacao,
                Aquisicao: dataBR(b.aquisicao), Valor: b.valorCorrigido, Acumulada: b.depreciacaoAcumulada,
                Contabil: b.valorContabil, Situacao: b.situacao,
              })))}>
                <Download className="mr-2 h-4 w-4" />Exportar
              </Button>
              <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={() => setEdicao("novo")}>
                <Plus className="mr-2 h-4 w-4" />Novo bem
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patrimônio</TableHead>
                <TableHead>Bem</TableHead>
                <TableHead>Centro / local</TableHead>
                <TableHead className="text-right">Valor corrigido</TableHead>
                <TableHead className="text-right">Depreciado</TableHead>
                <TableHead className="text-right">Valor contábil</TableHead>
                <TableHead className="text-center">Situação</TableHead>
                <TableHead className="w-40 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((b) => (
                <Fragment key={b.id}>
                  <TableRow className="cursor-pointer" onClick={() => setAberto(aberto === b.id ? null : b.id)}>
                    <TableCell className="font-mono text-xs">{b.patrimonio}</TableCell>
                    <TableCell>
                      <div className="font-medium">{b.descricao}</div>
                      <div className="text-xs text-muted-foreground">{b.grupo} · conta {b.contaContabil}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {b.centroCusto}
                      <div className="text-xs text-muted-foreground">{b.localizacao}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{brl(b.valorCorrigido)}</TableCell>
                    <TableCell className="text-right">
                      <div className="font-mono text-sm">{pct(b.percentDepreciado)}</div>
                      <Progress value={Math.min(b.percentDepreciado, 100)} className="mt-1 h-1" />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{brl(b.valorContabil)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className={`rounded-full text-[10px] ${tomSituacao(b.situacao)}`}>{b.situacao}</Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" className="rounded-full" title="Editar" onClick={() => setEdicao(b)}><Pencil className="h-4 w-4" /></Button>
                      {b.situacao !== "Baixado" ? (
                        <>
                          <Button size="sm" variant="ghost" className="rounded-full" title="Transferir" onClick={() => setTransferir(b)}><ArrowRightLeft className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" className="rounded-full" title="Benfeitoria" onClick={() => setBenfeitoria(b)}><Wrench className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" className="rounded-full text-destructive" title="Baixar" onClick={() => setBaixar(b)}><TrendingDown className="h-4 w-4" /></Button>
                        </>
                      ) : (
                        <Button size="sm" variant="ghost" className="rounded-full" title="Estornar baixa" onClick={() => { estornarBaixa(b.id); toast.success("Baixa estornada."); }}><RotateCcw className="h-4 w-4" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {aberto === b.id && (
                    <TableRow>
                      <TableCell colSpan={8} className="bg-muted/30">
                        <div className="grid gap-4 p-2 md:grid-cols-4">
                          <div><span className="text-xs text-muted-foreground">Aquisição</span><div className="font-mono text-sm">{dataBR(b.aquisicao)}</div></div>
                          <div><span className="text-xs text-muted-foreground">Início de operação</span><div className="font-mono text-sm">{dataBR(b.inicioOperacao)}</div></div>
                          <div><span className="text-xs text-muted-foreground">Vida útil</span><div className="font-mono text-sm">{b.vidaUtilMeses} m · coef. {b.coeficienteTurno.toLocaleString("pt-BR")}</div></div>
                          <div><span className="text-xs text-muted-foreground">Taxa anual</span><div className="font-mono text-sm">{pct(b.taxaAnual)}</div></div>
                          <div><span className="text-xs text-muted-foreground">Quota mensal</span><div className="font-mono text-sm">{brl(b.quotaMensal)}</div></div>
                          <div><span className="text-xs text-muted-foreground">Residual estimado</span><div className="font-mono text-sm">{brl(b.valorResidualEstimado)}</div></div>
                          <div><span className="text-xs text-muted-foreground">Meses restantes</span><div className="font-mono text-sm">{b.mesesRestantes}</div></div>
                          <div><span className="text-xs text-muted-foreground">Fornecedor / NF</span><div className="text-sm">{b.fornecedor || "—"} · {b.notaFiscal || "—"}</div></div>
                          {b.benfeitorias > 0 && <div><span className="text-xs text-muted-foreground">Benfeitorias</span><div className="font-mono text-sm">{brl(b.benfeitorias)}</div></div>}
                          {b.creditoCiap && <div><span className="text-xs text-muted-foreground">CIAP</span><div className="text-sm">Crédito de ICMS em 48 parcelas</div></div>}
                          {b.baixaData && (
                            <div className="md:col-span-2">
                              <span className="text-xs text-muted-foreground">Baixa</span>
                              <div className="text-sm">{b.baixaMotivo} em {dataBR(b.baixaData)} · {brl(b.baixaValor || 0)} · resultado {brl(b.resultadoBaixa || 0)}</div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
              {filtrados.length === 0 && (
                <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">Nenhum bem nesta visão.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {edicao && <DialogBem registro={edicao} onClose={() => setEdicao(null)} />}
      {transferir && <DialogTransferencia bem={transferir} onClose={() => setTransferir(null)} />}
      {baixar && <DialogBaixa bem={baixar} competencia={competencia} onClose={() => setBaixar(null)} />}
      {benfeitoria && <DialogBenfeitoria bem={benfeitoria} onClose={() => setBenfeitoria(null)} />}
    </div>
  );
}

/* =========================== tela: depreciação =========================== */

function Depreciacao() {
  useRefresh();
  const { competencia } = useCompetencia();
  const [aberto, setAberto] = useState<string | null>(null);
  const lista = useMemo(() => bensCalculados(competencia).filter((b) => b.situacao !== "Baixado"), [competencia]);
  const resumo = useMemo(() => resumoPatrimonio(competencia), [competencia]);
  const centros = useMemo(() => porCentroCusto(competencia), [competencia]);
  const projecao = useMemo(() => projecaoDepreciacao(competencia), [competencia]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={`Despesa de ${formatCompetencia(competencia)}`} valor={brl(resumo.despesaCompetencia)} tom="destaque" />
        <Kpi label="Acumulada até a competência" valor={brl(resumo.depreciacaoAcumulada)} />
        <Kpi label="Saldo a depreciar" valor={brl(Math.max(resumo.valorContabil, 0))} />
        <Kpi label="Bens em depreciação" valor={String(lista.filter((b) => b.situacao === "Em operação").length)} hint={`${resumo.totalmenteDepreciados} encerrados`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="rounded-3xl shadow-card lg:col-span-3">
          <CardContent className="p-6">
            <h2 className="font-display text-2xl">Projeção da despesa — 12 meses</h2>
            <p className="mb-4 text-sm text-muted-foreground">Considera o encerramento da vida útil de cada bem, sem novas aquisições.</p>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projecao} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                  <Tooltip {...CHART_TOOLTIP} formatter={(v: number) => brl(Number(v))} />
                  <Line type="monotone" dataKey="despesa" name="Depreciação" stroke="var(--brand-orange)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-card lg:col-span-2">
          <CardContent className="p-6">
            <h2 className="font-display text-2xl">Rateio por centro de custo</h2>
            <p className="mb-4 text-sm text-muted-foreground">Apropriação da despesa da competência.</p>
            <div className="space-y-3">
              {centros.map((c, i) => {
                const total = centros.reduce((s, x) => s + x.depreciacao, 0) || 1;
                return (
                  <div key={c.centro}>
                    <div className="flex items-center justify-between text-sm">
                      <span>{c.centro} <span className="text-xs text-muted-foreground">({c.qtd} bens)</span></span>
                      <span className="font-mono">{brl(c.depreciacao)}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${(c.depreciacao / total) * 100}%`, background: CORES[i % CORES.length] }} />
                    </div>
                  </div>
                );
              })}
              {centros.length === 0 && <p className="text-sm text-muted-foreground">Sem despesa nesta competência.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl shadow-card">
        <CardContent className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl">Razão auxiliar da depreciação</h2>
              <p className="text-sm text-muted-foreground">Clique no bem para abrir a memória de cálculo mês a mês.</p>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => exportarCSV(`depreciacao-${competencia}`, lista.map((b) => ({
              Patrimonio: b.patrimonio, Bem: b.descricao, Taxa: b.taxaAnual, Quota: b.quotaMensal,
              Acumulada: b.depreciacaoAcumulada, Competencia: b.depreciacaoCompetencia, Residual: b.valorContabil,
            })))}>
              <Download className="mr-2 h-4 w-4" />Exportar
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patrimônio</TableHead>
                <TableHead>Bem</TableHead>
                <TableHead className="text-right">Taxa a.a.</TableHead>
                <TableHead className="text-right">Quota mensal</TableHead>
                <TableHead className="text-right">Depreciação do mês</TableHead>
                <TableHead className="text-right">Acumulada</TableHead>
                <TableHead className="text-right">Valor residual</TableHead>
                <TableHead className="text-center">Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((b) => (
                <Fragment key={b.id}>
                  <TableRow className="cursor-pointer" onClick={() => setAberto(aberto === b.id ? null : b.id)}>
                    <TableCell className="font-mono text-xs">{b.patrimonio}</TableCell>
                    <TableCell className="text-sm">{b.descricao}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{pct(b.taxaAnual)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{brl(b.quotaMensal)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{brl(b.depreciacaoCompetencia)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{brl(b.depreciacaoAcumulada)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{brl(b.valorContabil)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className={`rounded-full text-[10px] ${tomSituacao(b.situacao)}`}>{b.situacao}</Badge>
                    </TableCell>
                  </TableRow>
                  {aberto === b.id && (
                    <TableRow>
                      <TableCell colSpan={8} className="bg-muted/30">
                        <div className="p-2">
                          <div className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            Memória de cálculo — base {brl(b.baseDepreciavel)} ÷ {Math.round(b.vidaUtilMeses / b.coeficienteTurno)} meses
                          </div>
                          <div className="max-h-64 overflow-y-auto rounded-2xl border border-border/70">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Competência</TableHead>
                                  <TableHead className="text-right">Quota</TableHead>
                                  <TableHead className="text-right">Acumulada</TableHead>
                                  <TableHead className="text-right">Valor contábil</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {memoriaCalculo(b, competencia).map((l) => (
                                  <TableRow key={l.competencia}>
                                    <TableCell className="font-mono text-xs">{l.competencia}</TableCell>
                                    <TableCell className="text-right font-mono text-xs">{brl(l.quota)}</TableCell>
                                    <TableCell className="text-right font-mono text-xs">{brl(l.acumulada)}</TableCell>
                                    <TableCell className="text-right font-mono text-xs">{brl(l.contabil)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ========================== tela: movimentações ========================== */

function Movimentacoes() {
  useRefresh();
  const { competencia } = useCompetencia();
  const [tipo, setTipo] = useState("todos");
  const [busca, setBusca] = useState("");
  const movimentos = useMemo(() => listarMovimentos(), []);
  const bens = useMemo(() => bensCalculados(competencia), [competencia]);
  const baixados = bens.filter((b) => b.situacao === "Baixado");

  const filtrados = movimentos.filter((m) => {
    if (tipo !== "todos" && m.tipo !== tipo) return false;
    const t = busca.trim().toLowerCase();
    return !t || [m.patrimonio, m.descricao, m.de, m.para].join(" ").toLowerCase().includes(t);
  });

  const ganhos = baixados.reduce((s, b) => s + Math.max(b.resultadoBaixa || 0, 0), 0);
  const perdas = baixados.reduce((s, b) => s + Math.min(b.resultadoBaixa || 0, 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Movimentos registrados" valor={String(movimentos.length)} />
        <Kpi label="Bens baixados" valor={String(baixados.length)} />
        <Kpi label="Ganho de capital" valor={brl(ganhos)} tom="ok" />
        <Kpi label="Perda de capital" valor={brl(Math.abs(perdas))} tom={perdas < 0 ? "alerta" : undefined} />
      </div>

      <Card className="rounded-3xl shadow-card">
        <CardContent className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl">Histórico patrimonial</h2>
              <p className="text-sm text-muted-foreground">Toda alteração de valor, local ou situação fica registrada de forma auditável.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="w-56 pl-9" placeholder="Buscar patrimônio ou descrição" value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="Aquisição">Aquisição</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                  <SelectItem value="Benfeitoria">Benfeitoria</SelectItem>
                  <SelectItem value="Baixa">Baixa</SelectItem>
                  <SelectItem value="Reavaliação">Reavaliação</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="rounded-full" onClick={() => exportarCSV("movimentacoes-patrimonio", filtrados.map((m) => ({
                Data: dataBR(m.data), Patrimonio: m.patrimonio, Tipo: m.tipo, Descricao: m.descricao,
                De: m.de || "", Para: m.para || "", Valor: m.valor ?? "", Autor: m.autor,
              })))}>
                <Download className="mr-2 h-4 w-4" />Exportar
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Patrimônio</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Origem → destino</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Autor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs">{dataBR(m.data)}</TableCell>
                  <TableCell className="font-mono text-xs">{m.patrimonio}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`rounded-full text-[10px] ${m.tipo === "Baixa" ? "bg-destructive/15 text-destructive" : m.tipo === "Aquisição" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-brand-orange/15 text-brand-orange"}`}>{m.tipo}</Badge>
                  </TableCell>
                  <TableCell className="max-w-md text-sm">{m.descricao}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.de ? `${m.de} → ${m.para}` : "—"}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{m.valor != null ? brl(m.valor) : "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.autor}</TableCell>
                </TableRow>
              ))}
              {filtrados.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Nenhum movimento nesta visão.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {baixados.length > 0 && (
        <Card className="rounded-3xl shadow-card">
          <CardContent className="p-6">
            <h2 className="font-display text-2xl">Apuração de resultado nas baixas</h2>
            <p className="mb-4 text-sm text-muted-foreground">Valor recebido menos o valor contábil na data da baixa.</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patrimônio</TableHead>
                  <TableHead>Bem</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor contábil</TableHead>
                  <TableHead className="text-right">Valor recebido</TableHead>
                  <TableHead className="text-right">Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {baixados.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.patrimonio}</TableCell>
                    <TableCell className="text-sm">{b.descricao}</TableCell>
                    <TableCell className="text-sm">{b.baixaMotivo}</TableCell>
                    <TableCell className="font-mono text-xs">{dataBR(b.baixaData || "")}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{brl(b.valorContabil)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{brl(b.baixaValor || 0)}</TableCell>
                    <TableCell className={`text-right font-mono text-sm ${(b.resultadoBaixa || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>{brl(b.resultadoBaixa || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ============================ tela: inventário =========================== */

function Inventario() {
  useRefresh();
  const { competencia } = useCompetencia();
  const [local, setLocal] = useState("todos");
  const [situacao, setSituacao] = useState("todos");
  const [busca, setBusca] = useState("");

  const linhas = useMemo(() => inventarioCompetencia(competencia), [competencia]);
  const resumo = useMemo(() => resumoInventario(competencia), [competencia]);

  const filtradas = linhas.filter((l) => {
    if (local !== "todos" && l.localizacao !== local) return false;
    if (situacao !== "todos" && l.situacaoInventario !== situacao) return false;
    const t = busca.trim().toLowerCase();
    return !t || [l.patrimonio, l.descricao, l.localizacao].join(" ").toLowerCase().includes(t);
  });

  const porLocal = useMemo(() => {
    const mapa = new Map<string, { local: string; conferidos: number; total: number }>();
    for (const l of linhas) {
      const atual = mapa.get(l.localizacao) || { local: l.localizacao, conferidos: 0, total: 0 };
      atual.total += 1;
      if (l.situacaoInventario === "Localizado") atual.conferidos += 1;
      mapa.set(l.localizacao, atual);
    }
    return [...mapa.values()].sort((a, b) => b.total - a.total);
  }, [linhas]);

  const marcar = (bemId: string, s: SituacaoContagem, localEncontrado: string) => {
    registrarContagem({ bemId, competencia, situacao: s, localEncontrado, responsavel: "Inventário interno" });
    toast.success("Contagem registrada.");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Bens no escopo" valor={String(resumo.total)} />
        <Kpi label="Conferidos" valor={String(resumo.conferidos)} tom="ok" />
        <Kpi label="Local divergente" valor={String(resumo.divergentes)} tom={resumo.divergentes ? "destaque" : undefined} />
        <Kpi label="Não localizados" valor={String(resumo.naoLocalizados)} tom={resumo.naoLocalizados ? "alerta" : undefined} />
        <Kpi label="Pendentes de contagem" valor={String(resumo.pendentes)} />
        <Kpi label="Valor não localizado" valor={brl(resumo.valorNaoLocalizado)} tom={resumo.valorNaoLocalizado ? "alerta" : undefined} />
      </div>

      <Card className="rounded-3xl shadow-card">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl">Andamento da contagem — {formatCompetencia(competencia)}</h2>
              <p className="text-sm text-muted-foreground">Conferência física confrontada com o cadastro contábil, local a local.</p>
            </div>
            <div className="text-right">
              <div className="font-mono text-3xl text-brand-orange">{pct(resumo.percentual)}</div>
              <div className="text-xs text-muted-foreground">bens conferidos</div>
            </div>
          </div>
          <Progress value={resumo.percentual} className="mt-4 h-2" />
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {porLocal.map((l) => (
              <div key={l.local} className="rounded-2xl border border-border/70 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{l.local}</span>
                  <span className="font-mono text-xs text-muted-foreground">{l.conferidos}/{l.total}</span>
                </div>
                <Progress value={l.total ? (l.conferidos / l.total) * 100 : 0} className="mt-2 h-1.5" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl shadow-card">
        <CardContent className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl">Folha de contagem</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="w-56 pl-9" placeholder="Buscar bem" value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
              <Select value={local} onValueChange={setLocal}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os locais</SelectItem>
                  {porLocal.map((l) => <SelectItem key={l.local} value={l.local}>{l.local}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={situacao} onValueChange={setSituacao}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as situações</SelectItem>
                  <SelectItem value="Localizado">Localizado</SelectItem>
                  <SelectItem value="Local divergente">Local divergente</SelectItem>
                  <SelectItem value="Não localizado">Não localizado</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="rounded-full" onClick={() => exportarCSV(`inventario-${competencia}`, filtradas.map((l) => ({
                Patrimonio: l.patrimonio, Bem: l.descricao, LocalCadastro: l.localizacao,
                LocalFisico: l.contagem?.localEncontrado || "", Situacao: l.situacaoInventario, ValorContabil: l.valorContabil,
              })))}>
                <Download className="mr-2 h-4 w-4" />Exportar
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patrimônio</TableHead>
                <TableHead>Bem</TableHead>
                <TableHead>Local cadastrado</TableHead>
                <TableHead>Local físico</TableHead>
                <TableHead className="text-right">Valor contábil</TableHead>
                <TableHead className="text-center">Situação</TableHead>
                <TableHead className="w-56 text-right">Contagem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-xs">{l.patrimonio}</TableCell>
                  <TableCell className="text-sm">{l.descricao}</TableCell>
                  <TableCell className="text-sm">{l.localizacao}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.contagem?.localEncontrado || "—"}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{brl(l.valorContabil)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className={`rounded-full text-[10px] ${tomSituacao(l.situacaoInventario)}`}>{l.situacaoInventario}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button size="sm" variant="ghost" className="rounded-full" title="Confirmar no local" onClick={() => marcar(l.id, "Localizado", l.localizacao)}>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      </Button>
                      <Button size="sm" variant="ghost" className="rounded-full" title="Não localizado" onClick={() => marcar(l.id, "Não localizado", "")}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      {l.situacaoInventario === "Local divergente" && (
                        <Button size="sm" variant="outline" className="rounded-full text-xs" onClick={() => {
                          try { acatarLocalContagem(l.id, competencia); toast.success("Localização regularizada pelo físico."); }
                          catch (e) { toast.error((e as Error).message); }
                        }}>
                          Regularizar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtradas.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Nenhum bem nesta visão.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ================================ página ================================= */

const AJUDA_TELA: Record<string, CampoAjuda[]> = {
  bens: CAMPOS_BEM,
  depreciacao: [
    { key: "quota", label: "Quota mensal", ajuda: "Base depreciável ÷ vida útil efetiva. A base é o valor corrigido menos o valor residual estimado." },
    { key: "taxa", label: "Taxa anual", ajuda: "12 ÷ vida útil em meses. Turnos adicionais aceleram a depreciação (coef. 1,5 e 2,0)." },
    { key: "inicio", label: "Início da depreciação", ajuda: "Mês seguinte ao início de operação do bem, prática padrão nos sistemas contábeis." },
    { key: "residual", label: "Valor residual", ajuda: "Parcela do custo que não é depreciada, por se estimar recuperável ao fim da vida útil (CPC 27)." },
  ],
  movimentacoes: [
    { key: "transferencia", label: "Transferência", ajuda: "Muda centro de custo e/ou local sem alterar valores. Fica no histórico auditável do bem." },
    { key: "benfeitoria", label: "Benfeitoria", ajuda: "Só capitalize o gasto que aumenta vida útil ou capacidade. Manutenção é despesa do período." },
    { key: "baixa", label: "Baixa", ajuda: "Resultado = valor recebido − valor contábil. Positivo é ganho de capital, negativo é perda." },
  ],
  "inventario-bens": [
    { key: "contagem", label: "Contagem física", ajuda: "Confirme cada plaqueta no local. O sistema compara com o cadastro e aponta as divergências." },
    { key: "divergencia", label: "Local divergente", ajuda: "O bem existe, mas está em outro local. Use 'Regularizar' para gerar a transferência automática." },
    { key: "naoLocalizado", label: "Não localizado", ajuda: "Exige apuração: pode virar baixa por perda, com laudo interno que justifique o desreconhecimento." },
  ],
};

export default function Patrimonio() {
  const { modulo } = useParams();
  const tela = TELAS[modulo || ""];
  if (!tela) return <div className="py-24 text-center text-muted-foreground">Tela de patrimônio não encontrada.</div>;
  const Icon = tela.icon;

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/dashboard" className="hover:text-foreground">Início</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/administrativo" className="hover:text-foreground">Administrativo</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/administrativo/patrimonio" className="hover:text-foreground">Patrimônio</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{tela.titulo}</span>
      </nav>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-card shadow-card">
            <Icon className="h-6 w-6 text-brand-orange" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Administrativo · Patrimônio</div>
            <h1 className="mt-1.5 font-display text-4xl">{tela.titulo}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{tela.desc}</p>
          </div>
        </div>
        <AssistenteCampos
          titulo={tela.titulo}
          campos={AJUDA_TELA[modulo || ""] || []}
          contextoExtra={{ modulo: tela.titulo, area: "Administrativo · Patrimônio" }}
        />
      </div>

      {modulo === "bens" && <Bens />}
      {modulo === "depreciacao" && <Depreciacao />}
      {modulo === "movimentacoes" && <Movimentacoes />}
      {modulo === "inventario-bens" && <Inventario />}
    </div>
  );
}
