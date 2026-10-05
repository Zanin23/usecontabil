import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  Check,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  Plus,
  Receipt,
  Store,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Progress,
  Textarea,
  cn,
} from "@/design-system/mj-design-system-db98fa";
import PageHeader from "@/components/contabil/PageHeader";
import { useCompetencia, formatCompetencia } from "@/lib/competencia";
import { useEmpresaAtual, type EmpresaOption } from "@/lib/empresaAtual";
import {
  alternarStatusLembreteSimplesMei,
  removerFaturamentoSimplesMei,
  removerLembreteSimplesMei,
  salvarFaturamentoSimplesMei,
  salvarLembretesSimplesMei,
  useDadosSimplesMei,
  type LembreteSimplesMei,
  type NovoLembreteSimplesMei,
  type TipoFaturamento,
} from "@/lib/simplesMeiStore";

const TODAS_EMPRESAS = "todas";
const LIMITE_MEI_REFERENCIA = 81_000;
const HOJE = () => {
  const data = new Date();
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
};

const dinheiro = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);

function regimeElegivel(valor: string): "Simples Nacional" | "MEI" | null {
  const regime = (valor ?? "").toLocaleLowerCase("pt-BR");
  if (regime.includes("mei") || regime.includes("simei") || regime.includes("microempreendedor")) return "MEI";
  if (regime.includes("simples")) return "Simples Nacional";
  return null;
}

function formatarData(valor: string) {
  if (!valor) return "Sem data";
  const [ano, mes, dia] = valor.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

function rotuloPeriodo(periodo: string) {
  if (/^\d{4}$/.test(periodo)) return `Ano ${periodo}`;
  const [ano, mes] = periodo.split("-");
  const nomeMes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][Number(mes) - 1];
  return nomeMes ? `${nomeMes}/${ano}` : periodo;
}

type EmpresaElegivel = EmpresaOption & { regimeSimplificado: "Simples Nacional" | "MEI" };

type Visao = "inicio" | "empresas" | "receitas" | "obrigacoes";
const ABAS: { id: Visao; titulo: string; rota: string }[] = [
  { id: "inicio", titulo: "Visão geral", rota: "/simples-mei" },
  { id: "empresas", titulo: "Empresas", rota: "/simples-mei/empresas" },
  { id: "receitas", titulo: "Faturamento", rota: "/simples-mei/receitas" },
  { id: "obrigacoes", titulo: "Obrigações", rota: "/simples-mei/obrigacoes" },
];

function StatCard({
  titulo,
  valor,
  detalhe,
  icon: Icon,
  cor = "blue",
}: {
  titulo: string;
  valor: string;
  detalhe: string;
  icon: typeof Building2;
  cor?: "blue" | "orange" | "purple" | "teal";
}) {
  const cores = {
    blue: "bg-brand-blue/10 text-brand-blue",
    orange: "bg-brand-orange/10 text-brand-orange",
    purple: "bg-brand-purple/10 text-brand-purple",
    teal: "bg-brand-teal/10 text-brand-teal",
  };
  return (
    <Card className="rounded-xl border-border/70">
      <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{titulo}</p>
          <p className="mt-2 truncate font-display text-2xl tracking-tight">{valor}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>
        </div>
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", cores[cor])}>
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function SeletorEmpresa({
  empresas,
  valor,
  onChange,
}: {
  empresas: EmpresaElegivel[];
  valor: string;
  onChange: (valor: string) => void;
}) {
  return (
    <label className="flex min-w-[220px] flex-col gap-1.5 text-xs text-muted-foreground">
      Filtrar empresas
      <select
        aria-label="Filtrar empresas"
        value={valor}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value={TODAS_EMPRESAS}>Todas as empresas elegíveis</option>
        {empresas.map((empresa) => (
          <option key={empresa.id} value={empresa.id}>
            {empresa.razao} · {empresa.regimeSimplificado}
          </option>
        ))}
      </select>
    </label>
  );
}

function AvisoDeEscopo() {
  return (
    <div className="flex gap-3 rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-4 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
      <p className="leading-relaxed text-muted-foreground">
        Controle simplificado para acompanhamento interno. Faturamentos e lembretes são informados manualmente e ficam
        neste navegador; esta área não calcula tributos nem transmite PGDAS-D, DEFIS, DAS-MEI ou DASN-SIMEI.
      </p>
    </div>
  );
}

function SemEmpresas() {
  return (
    <Card className="rounded-xl border-dashed border-border/80">
      <CardContent className="flex flex-col items-center px-6 py-12 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue">
          <Store className="h-6 w-6" />
        </span>
        <h2 className="mt-4 font-display text-xl">Nenhuma empresa do Simples ou MEI cadastrada</h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Cadastre uma empresa no cadastro central e selecione o regime tributário correto. Ela aparecerá aqui sem
          duplicar os dados da ficha principal.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button asChild className="rounded-lg bg-brand-orange text-primary-foreground hover:bg-brand-orange/90">
            <Link to="/preparativos/cadastros/empresas/novo"><Plus className="mr-2 h-4 w-4" /> Cadastrar empresa</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-lg">
            <Link to="/preparativos/cadastros/empresas">Ver cadastro central</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FormularioFaturamento({
  aberto,
  onAbertoChange,
  empresas,
  competencia,
}: {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  empresas: EmpresaElegivel[];
  competencia: string;
}) {
  const [empresaId, setEmpresaId] = useState("");
  const [data, setData] = useState(`${competencia}-01`);
  const [tipo, setTipo] = useState<TipoFaturamento>("Comércio/indústria");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");

  useEffect(() => {
    if (!aberto) return;
    setEmpresaId(empresas[0]?.id ?? "");
    setData(`${competencia}-01`);
    setTipo("Comércio/indústria");
    setDescricao("");
    setValor("");
  }, [aberto, competencia, empresas]);

  const salvar = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      salvarFaturamentoSimplesMei({
        empresaId,
        data,
        tipo,
        descricao,
        valor: Number(valor.replace(",", ".")),
      });
      toast.success("Faturamento registrado.");
      onAbertoChange(false);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível registrar o faturamento.");
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar faturamento</DialogTitle>
          <DialogDescription>
            Informe uma receita para acompanhamento. Este registro não cria nota fiscal nem alimenta a apuração tributária.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="faturamento-empresa">Empresa</Label>
            <select
              id="faturamento-empresa"
              value={empresaId}
              onChange={(event) => setEmpresaId(event.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            >
              {empresas.map((empresa) => <option key={empresa.id} value={empresa.id}>{empresa.razao}</option>)}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="faturamento-data">Data da receita</Label>
              <Input id="faturamento-data" type="date" value={data} onChange={(event) => setData(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faturamento-tipo">Atividade</Label>
              <select
                id="faturamento-tipo"
                value={tipo}
                onChange={(event) => setTipo(event.target.value as TipoFaturamento)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option>Comércio/indústria</option>
                <option>Serviços</option>
                <option>Outro</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="faturamento-descricao">Descrição</Label>
            <Input id="faturamento-descricao" value={descricao} onChange={(event) => setDescricao(event.target.value)} placeholder="Ex.: vendas da semana" maxLength={120} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="faturamento-valor">Valor bruto (R$)</Label>
            <Input id="faturamento-valor" type="number" inputMode="decimal" min="0.01" step="0.01" value={valor} onChange={(event) => setValor(event.target.value)} placeholder="0,00" required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-lg" onClick={() => onAbertoChange(false)}>Cancelar</Button>
            <Button type="submit" className="rounded-lg bg-brand-orange text-primary-foreground hover:bg-brand-orange/90">Salvar faturamento</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormularioLembrete({
  aberto,
  onAbertoChange,
  empresas,
  competencia,
}: {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  empresas: EmpresaElegivel[];
  competencia: string;
}) {
  const [empresaId, setEmpresaId] = useState("");
  const [periodo, setPeriodo] = useState(competencia);
  const [titulo, setTitulo] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    if (!aberto) return;
    setEmpresaId(empresas[0]?.id ?? "");
    setPeriodo(competencia);
    setTitulo("");
    setVencimento("");
    setObservacao("");
  }, [aberto, competencia, empresas]);

  const salvar = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      salvarLembretesSimplesMei([{
        empresaId,
        periodo,
        titulo,
        vencimento,
        observacao,
        status: "Pendente",
      }]);
      toast.success("Lembrete criado.");
      onAbertoChange(false);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível criar o lembrete.");
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo lembrete</DialogTitle>
          <DialogDescription>Registre uma obrigação, vencimento ou conferência para acompanhar manualmente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lembrete-empresa">Empresa</Label>
            <select
              id="lembrete-empresa"
              value={empresaId}
              onChange={(event) => setEmpresaId(event.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            >
              {empresas.map((empresa) => <option key={empresa.id} value={empresa.id}>{empresa.razao} · {empresa.regimeSimplificado}</option>)}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lembrete-periodo">Competência ou ano</Label>
              <Input id="lembrete-periodo" value={periodo} onChange={(event) => setPeriodo(event.target.value)} placeholder="2026-10 ou 2026" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lembrete-vencimento">Prazo (opcional)</Label>
              <Input id="lembrete-vencimento" type="date" value={vencimento} onChange={(event) => setVencimento(event.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lembrete-titulo">Obrigação ou lembrete</Label>
            <Input id="lembrete-titulo" value={titulo} onChange={(event) => setTitulo(event.target.value)} placeholder="Ex.: revisar pagamento do DAS" maxLength={120} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lembrete-observacao">Observação (opcional)</Label>
            <Textarea id="lembrete-observacao" value={observacao} onChange={(event) => setObservacao(event.target.value)} rows={3} maxLength={400} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-lg" onClick={() => onAbertoChange(false)}>Cancelar</Button>
            <Button type="submit" className="rounded-lg bg-brand-orange text-primary-foreground hover:bg-brand-orange/90">Criar lembrete</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LembretesLista({
  lembretes,
  empresas,
  permitirRemover = true,
}: {
  lembretes: LembreteSimplesMei[];
  empresas: EmpresaElegivel[];
  permitirRemover?: boolean;
}) {
  const empresasPorId = useMemo(() => new Map(empresas.map((empresa) => [empresa.id, empresa])), [empresas]);

  if (!lembretes.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <FileCheck2 className="mx-auto h-8 w-8 text-muted-foreground/70" />
        <p className="mt-3 font-medium">Nenhuma obrigação ou lembrete neste período</p>
        <p className="mt-1 text-sm text-muted-foreground">Crie um checklist mensal ou registre um lembrete próprio.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {lembretes.map((lembrete) => {
        const empresa = empresasPorId.get(lembrete.empresaId);
        const vencido = lembrete.status === "Pendente" && !!lembrete.vencimento && lembrete.vencimento < HOJE();
        return (
          <div key={lembrete.id} className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 sm:flex-row sm:items-center">
            <button
              type="button"
              aria-label={lembrete.status === "Concluída" ? "Reabrir lembrete" : "Concluir lembrete"}
              title={lembrete.status === "Concluída" ? "Reabrir" : "Marcar como concluído"}
              onClick={() => alternarStatusLembreteSimplesMei(lembrete.id)}
              className={cn(
                "grid h-9 w-9 shrink-0 place-items-center rounded-full border transition",
                lembrete.status === "Concluída"
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-border text-muted-foreground hover:border-brand-blue/50 hover:text-brand-blue",
              )}
            >
              {lembrete.status === "Concluída" ? <Check className="h-4 w-4" /> : <span className="h-3 w-3 rounded-full border border-current" />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className={cn("font-medium", lembrete.status === "Concluída" && "text-muted-foreground line-through")}>{lembrete.titulo}</p>
                <Badge variant="outline" className={cn("rounded-md", vencido && "border-destructive/30 text-destructive")}>
                  {vencido ? "Prazo vencido" : lembrete.status}
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{empresa?.razao ?? "Empresa removida"}</span>
                <span>{rotuloPeriodo(lembrete.periodo)}</span>
                <span>{lembrete.vencimento ? `Prazo ${formatarData(lembrete.vencimento)}` : "Prazo não informado"}</span>
              </div>
              {lembrete.observacao && <p className="mt-2 text-sm text-muted-foreground">{lembrete.observacao}</p>}
            </div>
            {permitirRemover && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Excluir lembrete"
                className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:text-destructive"
                onClick={() => {
                  if (window.confirm(`Excluir o lembrete “${lembrete.titulo}”?`)) removerLembreteSimplesMei(lembrete.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TelaEmpresas({ empresas, faturamentos, ano }: { empresas: EmpresaElegivel[]; faturamentos: ReturnType<typeof useDadosSimplesMei>["faturamentos"]; ano: string }) {
  if (!empresas.length) return <SemEmpresas />;
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {empresas.map((empresa) => {
        const receitaAno = faturamentos
          .filter((registro) => registro.empresaId === empresa.id && registro.competencia.startsWith(ano))
          .reduce((total, registro) => total + registro.valor, 0);
        return (
          <Card key={empresa.id} className="rounded-xl border-border/70">
            <CardContent className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-lg">{empresa.razao}</h2>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{empresa.cnpj || "CNPJ não informado"}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline" className={cn("rounded-md", empresa.regimeSimplificado === "MEI" ? "border-brand-purple/30 text-brand-purple" : "border-brand-blue/30 text-brand-blue")}>
                        {empresa.regimeSimplificado}
                      </Badge>
                      <Badge variant="outline" className="rounded-md">Cadastro central</Badge>
                    </div>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0 rounded-lg">
                  <Link to={`/preparativos/cadastros/empresas/${empresa.id}`}>Abrir ficha <ArrowRight className="ml-2 h-3.5 w-3.5" /></Link>
                </Button>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 rounded-lg bg-muted/35 p-3">
                <div>
                  <p className="text-[11px] text-muted-foreground">Receita informada em {ano}</p>
                  <p className="mt-1 font-mono text-sm font-semibold">{dinheiro(receitaAno)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Regime cadastrado</p>
                  <p className="mt-1 text-sm font-medium">{empresa.regimeSimplificado}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function TelaReceitas({
  empresas,
  faturamentos,
  ano,
}: {
  empresas: EmpresaElegivel[];
  faturamentos: ReturnType<typeof useDadosSimplesMei>["faturamentos"];
  ano: string;
}) {
  if (!empresas.length) return <SemEmpresas />;
  const empresasPorId = new Map(empresas.map((empresa) => [empresa.id, empresa]));
  const registros = faturamentos
    .filter((registro) => empresasPorId.has(registro.empresaId) && registro.competencia.startsWith(ano))
    .sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Receitas lançadas manualmente no ano selecionado: <b className="font-semibold text-foreground">{registros.length}</b></p>
      <Card className="overflow-hidden rounded-xl border-border/70">
        {registros.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Atividade</th>
                  <th className="px-4 py-3 font-medium">Descrição</th>
                  <th className="px-4 py-3 text-right font-medium">Valor bruto</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((registro) => (
                  <tr key={registro.id} className="border-t border-border/60">
                    <td className="px-4 py-3 font-mono text-xs">{formatarData(registro.data)}</td>
                    <td className="max-w-[220px] truncate px-4 py-3">{empresasPorId.get(registro.empresaId)?.razao}</td>
                    <td className="px-4 py-3">{registro.tipo}</td>
                    <td className="max-w-[240px] truncate px-4 py-3" title={registro.descricao}>{registro.descricao}</td>
                    <td className="px-4 py-3 text-right font-mono">{dinheiro(registro.valor)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir faturamento"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (window.confirm(`Excluir o faturamento de ${dinheiro(registro.valor)}?`)) removerFaturamentoSimplesMei(registro.id);
                        }}
                      ><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <CircleDollarSign className="mx-auto h-8 w-8 text-muted-foreground/70" />
            <p className="mt-3 font-medium">Nenhum faturamento informado em {ano}</p>
            <p className="mt-1 text-sm text-muted-foreground">Use “Registrar faturamento” para iniciar o acompanhamento manual.</p>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function SimplesMei() {
  const location = useLocation();
  const { competencia } = useCompetencia();
  const { empresas: empresasSistema } = useEmpresaAtual();
  const { faturamentos, lembretes } = useDadosSimplesMei();
  const ano = competencia.slice(0, 4);
  const [empresaFiltro, setEmpresaFiltro] = useState(TODAS_EMPRESAS);
  const [faturamentoAberto, setFaturamentoAberto] = useState(false);
  const [lembreteAberto, setLembreteAberto] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<"todas" | "pendentes" | "concluidas">("todas");

  const empresasAlvo = useMemo<EmpresaElegivel[]>(() => empresasSistema
    .map((empresa) => {
      const regimeSimplificado = regimeElegivel(empresa.regime);
      return regimeSimplificado ? { ...empresa, regimeSimplificado } : null;
    })
    .filter((empresa): empresa is EmpresaElegivel => empresa !== null)
    .sort((a, b) => a.razao.localeCompare(b.razao, "pt-BR")), [empresasSistema]);

  const empresasVisiveis = useMemo(() => empresaFiltro === TODAS_EMPRESAS
    ? empresasAlvo
    : empresasAlvo.filter((empresa) => empresa.id === empresaFiltro), [empresaFiltro, empresasAlvo]);
  const idsVisiveis = useMemo(() => new Set(empresasVisiveis.map((empresa) => empresa.id)), [empresasVisiveis]);
  const receitasAno = faturamentos.filter((registro) => idsVisiveis.has(registro.empresaId) && registro.competencia.startsWith(ano));
  const receitaMes = receitasAno.filter((registro) => registro.competencia === competencia).reduce((total, registro) => total + registro.valor, 0);
  const receitaAcumulada = receitasAno.reduce((total, registro) => total + registro.valor, 0);
  const receitaMeiAno = receitasAno
    .filter((registro) => empresasVisiveis.some((empresa) => empresa.id === registro.empresaId && empresa.regimeSimplificado === "MEI"))
    .reduce((total, registro) => total + registro.valor, 0);
  const lembretesAno = lembretes
    .filter((lembrete) => idsVisiveis.has(lembrete.empresaId) && (lembrete.periodo === ano || lembrete.periodo.startsWith(`${ano}-`)))
    .sort((a, b) => (a.vencimento || "9999-12-31").localeCompare(b.vencimento || "9999-12-31"));
  const lembretesPendentes = lembretesAno.filter((lembrete) => lembrete.status === "Pendente");

  const pathname = location.pathname.replace(/\/+$/, "") || "/simples-mei";
  const segmento = pathname.split("/")[2];
  const visao: Visao = segmento === "empresas" || segmento === "receitas" || segmento === "obrigacoes" ? segmento : "inicio";
  const cabecalhos: Record<Visao, { titulo: string; descricao: string }> = {
    inicio: {
      titulo: "Controle simplificado",
      descricao: "Uma visão direta das empresas do Simples Nacional e MEI, do faturamento informado e das pendências acompanhadas.",
    },
    empresas: {
      titulo: "Empresas",
      descricao: "Carteira enxuta de empresas cadastradas como Simples Nacional ou MEI, ligada às fichas centrais.",
    },
    receitas: {
      titulo: "Faturamento",
      descricao: "Registro manual de receitas para acompanhamento mensal e anual. Não substitui livros ou documentos fiscais.",
    },
    obrigacoes: {
      titulo: "Obrigações e lembretes",
      descricao: "Checklists por empresa e período para organizar conferências, pagamentos e declarações.",
    },
  };

  const criarChecklist = (anual: boolean) => {
    const periodo = anual ? ano : competencia;
    const entradas: NovoLembreteSimplesMei[] = empresasVisiveis.flatMap((empresa) => {
      const titulos = anual
        ? [empresa.regimeSimplificado === "MEI" ? "Revisar entrega da DASN-SIMEI" : "Revisar entrega da DEFIS"]
        : empresa.regimeSimplificado === "MEI"
          ? ["Conferir relatório mensal de receitas", "Conferir pagamento do DAS-MEI"]
          : ["Conferir faturamento da competência", "Revisar PGDAS-D", "Conferir pagamento do DAS"];
      return titulos.map((titulo) => ({
        empresaId: empresa.id,
        periodo,
        titulo,
        vencimento: "",
        observacao: "Checklist orientativo. Confirme prazos e procedimentos aplicáveis nos canais oficiais ou com o responsável contábil.",
        status: "Pendente" as const,
      }));
    });
    if (!entradas.length) {
      toast.error("Cadastre uma empresa do Simples Nacional ou MEI para criar o checklist.");
      return;
    }
    const resultado = salvarLembretesSimplesMei(entradas);
    if (resultado.adicionados) toast.success(`${resultado.adicionados} lembrete(s) criado(s).`);
    else toast.info(`Os lembretes desse período já existem (${resultado.existentes} duplicado(s) evitado(s)).`);
  };

  const lembretesExibidos = lembretesAno.filter((lembrete) =>
    filtroStatus === "todas" ||
    (filtroStatus === "pendentes" && lembrete.status === "Pendente") ||
    (filtroStatus === "concluidas" && lembrete.status === "Concluída"),
  );
  const empresasMei = empresasVisiveis.filter((empresa) => empresa.regimeSimplificado === "MEI");
  const progressoMei = Math.min(100, Math.round((receitaMeiAno / LIMITE_MEI_REFERENCIA) * 100));

  const acoes = visao === "empresas" ? (
    <Button asChild className="rounded-lg bg-brand-orange text-primary-foreground hover:bg-brand-orange/90">
      <Link to="/preparativos/cadastros/empresas/novo"><Plus className="mr-2 h-4 w-4" /> Nova empresa</Link>
    </Button>
  ) : visao === "receitas" ? (
    <Button disabled={!empresasVisiveis.length} onClick={() => setFaturamentoAberto(true)} className="rounded-lg bg-brand-orange text-primary-foreground hover:bg-brand-orange/90">
      <Plus className="mr-2 h-4 w-4" /> Registrar faturamento
    </Button>
  ) : visao === "obrigacoes" ? (
    <Button disabled={!empresasVisiveis.length} onClick={() => setLembreteAberto(true)} className="rounded-lg bg-brand-orange text-primary-foreground hover:bg-brand-orange/90">
      <Plus className="mr-2 h-4 w-4" /> Novo lembrete
    </Button>
  ) : (
    <Button asChild variant="outline" className="rounded-lg">
      <Link to="/simples-mei/empresas">Ver empresas <ArrowRight className="ml-2 h-4 w-4" /></Link>
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        trail={[{ label: "Simples & MEI" }]}
        icon={Building2}
        iconAccent="blue"
        eyebrow={`Controle simplificado · competência ${formatCompetencia(competencia)}`}
        title={cabecalhos[visao].titulo}
        titleAccent={visao === "inicio" ? "Simples & MEI" : undefined}
        description={cabecalhos[visao].descricao}
        actions={acoes}
        badges={<Badge variant="outline" className="rounded-md">Empresas: Simples Nacional e MEI</Badge>}
      />

      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-3 sm:flex-row sm:items-end sm:justify-between">
        <nav aria-label="Navegação Simples e MEI" className="flex flex-wrap gap-1">
          {ABAS.map((aba) => (
            <NavLink
              key={aba.id}
              to={aba.rota}
              end={aba.id === "inicio"}
              className={({ isActive }) => cn(
                "rounded-lg px-3 py-2 text-sm transition",
                isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {aba.titulo}
            </NavLink>
          ))}
        </nav>
        <SeletorEmpresa empresas={empresasAlvo} valor={empresaFiltro} onChange={setEmpresaFiltro} />
      </div>

      {!empresasAlvo.length ? (
        <SemEmpresas />
      ) : visao === "inicio" ? (
        <div className="space-y-6">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard titulo="Empresas acompanhadas" valor={String(empresasVisiveis.length)} detalhe={`${empresasVisiveis.filter((e) => e.regimeSimplificado === "Simples Nacional").length} Simples · ${empresasMei.length} MEI`} icon={Building2} />
            <StatCard titulo="Faturamento na competência" valor={dinheiro(receitaMes)} detalhe={formatCompetencia(competencia)} icon={CircleDollarSign} cor="teal" />
            <StatCard titulo="Faturamento informado no ano" valor={dinheiro(receitaAcumulada)} detalhe={`Ano-calendário ${ano}`} icon={TrendingUp} cor="purple" />
            <StatCard titulo="Lembretes em aberto" valor={String(lembretesPendentes.length)} detalhe={`Neste ano · ${lembretesAno.length} no total`} icon={Clock3} cor={lembretesPendentes.length ? "orange" : "blue"} />
          </section>

          {empresasMei.length > 0 && (
            <Card className="rounded-xl border-border/70">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg"><Store className="h-5 w-5 text-brand-purple" /> Acompanhamento de receita do MEI</CardTitle>
                <CardDescription>
                  Referência interna de {dinheiro(LIMITE_MEI_REFERENCIA)} para comparação; confirme o limite e a proporcionalidade aplicáveis ao ano e à situação da empresa.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {empresasMei.map((empresa) => {
                  const total = receitasAno.filter((registro) => registro.empresaId === empresa.id).reduce((soma, registro) => soma + registro.valor, 0);
                  const percentual = Math.min(100, Math.round((total / LIMITE_MEI_REFERENCIA) * 100));
                  const acima = total > LIMITE_MEI_REFERENCIA;
                  return (
                    <div key={empresa.id} className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="font-medium">{empresa.razao}</span>
                        <span className={cn("font-mono text-xs", acima && "text-destructive")}>{dinheiro(total)} / {dinheiro(LIMITE_MEI_REFERENCIA)}</span>
                      </div>
                      <Progress value={percentual} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {acima ? "Acima da referência interna — revise os dados e o enquadramento com o responsável contábil." : `${percentual}% da referência anual informada.`}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
            <Card className="rounded-xl border-border/70">
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-lg">Acompanhar obrigações</CardTitle>
                  <CardDescription className="mt-1">Itens pendentes do mês e do ano selecionados.</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm" className="rounded-lg">
                  <Link to="/simples-mei/obrigacoes">Abrir lista <ArrowRight className="ml-2 h-3.5 w-3.5" /></Link>
                </Button>
              </CardHeader>
              <CardContent>
                {lembretesPendentes.length ? (
                  <LembretesLista lembretes={lembretesPendentes.slice(0, 5)} empresas={empresasAlvo} permitirRemover={false} />
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center">
                    <BadgeCheck className="mx-auto h-7 w-7 text-success" />
                    <p className="mt-2 text-sm font-medium">Nenhuma pendência cadastrada</p>
                    <p className="mt-1 text-xs text-muted-foreground">Gere um checklist na área de obrigações ou crie um lembrete.</p>
                    <Button onClick={() => criarChecklist(false)} variant="outline" size="sm" className="mt-4 rounded-lg">Criar checklist do mês</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl border-border/70">
              <CardHeader>
                <CardTitle className="text-lg">Atalhos</CardTitle>
                <CardDescription>Rotina essencial sem os módulos avançados.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Link to="/simples-mei/empresas" className="flex items-center justify-between rounded-lg border border-border/70 p-3 text-sm transition hover:bg-muted/50">
                  <span className="flex items-center gap-2"><Building2 className="h-4 w-4 text-brand-blue" /> Empresas e regimes</span><ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
                <Link to="/simples-mei/receitas" className="flex items-center justify-between rounded-lg border border-border/70 p-3 text-sm transition hover:bg-muted/50">
                  <span className="flex items-center gap-2"><Wallet className="h-4 w-4 text-brand-teal" /> Registrar faturamento</span><ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
                <Link to="/simples-mei/obrigacoes" className="flex items-center justify-between rounded-lg border border-border/70 p-3 text-sm transition hover:bg-muted/50">
                  <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-brand-orange" /> Checklists e vencimentos</span><ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
                <div className="mt-2 rounded-lg bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                  Para apurações detalhadas, livros fiscais e guias simuladas, use os módulos completos do sistema.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : visao === "empresas" ? (
        <div className="space-y-4">
          {!empresasVisiveis.length && empresaFiltro !== TODAS_EMPRESAS ? (
            <Card className="rounded-xl border-dashed"><CardContent className="p-8 text-center text-sm text-muted-foreground">A empresa selecionada não está cadastrada como Simples Nacional ou MEI.</CardContent></Card>
          ) : (
            <TelaEmpresas empresas={empresasVisiveis} faturamentos={faturamentos} ano={ano} />
          )}
          <AvisoDeEscopo />
        </div>
      ) : visao === "receitas" ? (
        <div className="space-y-4">
          <TelaReceitas empresas={empresasVisiveis} faturamentos={faturamentos} ano={ano} />
          <AvisoDeEscopo />
        </div>
      ) : (
        <div className="space-y-4">
          {!empresasVisiveis.length ? <SemEmpresas /> : (
            <>
              <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-medium">Rotina de {formatCompetencia(competencia)} · {ano}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Checklists sem prazo automático. Revise vencimentos conforme as regras aplicáveis a cada empresa.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => criarChecklist(false)} className="rounded-lg"><CalendarDays className="mr-2 h-4 w-4" /> Checklist do mês</Button>
                  <Button variant="outline" onClick={() => criarChecklist(true)} className="rounded-lg"><FileCheck2 className="mr-2 h-4 w-4" /> Lembrete anual</Button>
                  <Button onClick={() => setLembreteAberto(true)} className="rounded-lg bg-brand-orange text-primary-foreground hover:bg-brand-orange/90"><Plus className="mr-2 h-4 w-4" /> Novo lembrete</Button>
                </div>
              </div>
              <Card className="rounded-xl border-border/70">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    {([
                      ["todas", `Todas (${lembretesAno.length})`],
                      ["pendentes", `Pendentes (${lembretesPendentes.length})`],
                      ["concluidas", `Concluídas (${lembretesAno.length - lembretesPendentes.length})`],
                    ] as const).map(([id, label]) => (
                      <Button key={id} variant={filtroStatus === id ? "default" : "outline"} size="sm" className="rounded-lg" onClick={() => setFiltroStatus(id)}>{label}</Button>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{lembretesExibidos.length} lembrete(s) neste recorte</span>
                </CardContent>
              </Card>
              <LembretesLista lembretes={lembretesExibidos} empresas={empresasAlvo} />
            </>
          )}
          <AvisoDeEscopo />
        </div>
      )}

      <FormularioFaturamento aberto={faturamentoAberto} onAbertoChange={setFaturamentoAberto} empresas={empresasVisiveis} competencia={competencia} />
      <FormularioLembrete aberto={lembreteAberto} onAbertoChange={setLembreteAberto} empresas={empresasVisiveis} competencia={competencia} />
    </div>
  );
}
