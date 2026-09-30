import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ChevronRight, Lock, RefreshCw } from "lucide-react";
import {
  Badge, Card, CardContent, Progress, ScrollArea,
} from "@/design-system/mj-design-system-db98fa";
import ExportarMenu from "@/components/contabil/ExportarMenu";
import {
  CORES_CRIT, DOMINIOS, LOG_SYNC, READ_ONLY_MSG, auditarTudo, brl, qualidadeCadastral,
  resumoCriticidade, totalCampo, useAcessos, useAgendamentos, useRegistrarAcesso,
  type Registro,
} from "@/lib/adminStore";

function Kpi({ label, valor, hint, to }: { label: string; valor: string; hint?: string; to?: string }) {
  const body = (
    <Card className="h-full rounded-3xl border-border/70 transition-colors hover:border-brand-orange/60">
      <CardContent className="space-y-1 p-5">
        <div className="text-[10px] uppercase leading-tight tracking-[0.08em] text-muted-foreground break-words">{label}</div>
        <div className="font-display text-3xl break-words">{valor}</div>
        {hint && <div className="text-xs text-muted-foreground break-words">{hint}</div>}
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export default function DashboardExecutivo() {
  useRegistrarAcesso("Administrativo · Dashboard executivo");
  const achados = useMemo(() => auditarTudo(), []);
  const acessos = useAcessos().slice(0, 12);
  const agendamentos = useAgendamentos();

  const totalRegistros = DOMINIOS.reduce((a, d) => a + d.registros.length, 0);
  const qualidade = qualidadeCadastral(achados, totalRegistros);
  const crit = resumoCriticidade(achados);

  const clientes = DOMINIOS[0].registros;
  const fornecedores = DOMINIOS[1].registros;
  const produtos = DOMINIOS[2].registros;
  const bancos = DOMINIOS[3].registros;

  const porDominio = DOMINIOS.map((d) => ({
    nome: d.titulo,
    total: d.registros.length,
    inconsistencias: achados.filter((a) => a.dominio === d.slug).length,
  }));

  const alterados = LOG_SYNC.reduce((a, l) => a + l.alterados + l.novos, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Administrativo</div>
          <h1 className="mt-2 font-display text-4xl">
            Dashboard <span className="text-brand-orange">executivo.</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Painel consolidado dos cadastros sincronizados. {READ_ONLY_MSG}
          </p>
        </div>
        <ExportarMenu
          nome="Dashboard executivo — cadastros"
          colunas={[{ key: "nome", label: "Cadastro" }, { key: "total", label: "Registros" }, { key: "inconsistencias", label: "Inconsistências" }]}
          linhas={porDominio as unknown as Registro[]}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Clientes" valor={String(clientes.length)} hint={`${clientes.filter((c) => c.status === "Ativo").length} ativos`} to="/administrativo/cadastros/clientes" />
        <Kpi label="Fornecedores" valor={String(fornecedores.length)} hint={`${fornecedores.filter((c) => c.status === "Ativo").length} ativos`} to="/administrativo/cadastros/fornecedores" />
        <Kpi label="Produtos" valor={String(produtos.filter((p) => p.tipo === "Produto").length)} hint={`${produtos.filter((p) => p.tipo === "Serviço").length} serviços`} to="/administrativo/cadastros/produtos-servicos" />
        <Kpi label="Bancos / contas" valor={String(bancos.length)} hint={brl(totalCampo(bancos, "saldo"))} to="/administrativo/cadastros/bancos" />
        <Kpi label="Plano gerencial" valor={String(DOMINIOS[4].registros.length)} hint="contas gerenciais" to="/administrativo/cadastros/plano-gerencial" />
        <Kpi label="Condições de pagamento" valor={String(DOMINIOS[5].registros.length)} hint="condições ativas e inativas" to="/administrativo/cadastros/condicoes-pagamento" />
        <Kpi label="Cadastros alterados na sync (simulada)" valor={String(alterados)} hint={`última sync simulada ${LOG_SYNC[0].em}`} />
        <Kpi label="Pendências cadastrais" valor={String(achados.length)} hint={`${crit[0].total} críticas`} to="/administrativo/auditoria" />
      </div>

      <Card className="rounded-3xl border-border/70">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Qualidade cadastral consolidada</span>
            <span className="font-display text-2xl text-brand-orange">{qualidade}%</span>
          </div>
          <Progress value={qualidade} />
          <div className="flex flex-wrap gap-2">
            {crit.map((c) => (
              <Badge key={c.nome} className="rounded-full border-0 bg-muted text-muted-foreground">
                <span className="mr-1 h-2 w-2 rounded-full" style={{ background: CORES_CRIT[c.nome] }} />
                {c.nome}: {c.total}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-3xl border-border/70">
          <CardContent className="p-5">
            <div className="mb-4 text-sm font-medium">Volume por cadastro</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porDominio} margin={{ left: 8, right: 8 }}>
                  <XAxis dataKey="nome" tick={{ fontSize: 10 }} interval={0} height={64} angle={-18} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} width={40} />
                  <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="total" radius={[8, 8, 0, 0]} fill="var(--brand-orange)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/70">
          <CardContent className="p-5">
            <div className="mb-4 text-sm font-medium">Inconsistências por criticidade</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={crit} dataKey="total" nameKey="nome" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {crit.map((c) => <Cell key={c.nome} fill={CORES_CRIT[c.nome]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-3xl border-border/70">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <RefreshCw className="h-4 w-4 text-brand-orange" /> Log de sincronizações
            </div>
            {LOG_SYNC.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/70 px-4 py-3 text-sm">
                <span>{l.dominio}</span>
                <span className="text-xs text-muted-foreground">{l.em} · {l.registros} reg · {l.status}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/70">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lock className="h-4 w-4 text-brand-orange" /> Log de acessos e exportações
            </div>
            <ScrollArea className="max-h-72">
              <div className="space-y-2 pr-2">
                {acessos.map((a) => (
                  <div key={a.id} className="rounded-2xl border border-border/70 px-4 py-2 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="truncate">{a.recurso}</span>
                      <span className="text-xs text-muted-foreground">{a.em}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{a.usuario} · {a.acao}</div>
                  </div>
                ))}
                {!acessos.length && <div className="text-sm text-muted-foreground">Nenhum acesso registrado ainda.</div>}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {!!agendamentos.length && (
        <Card className="rounded-3xl border-border/70">
          <CardContent className="space-y-2 p-5">
            <div className="text-sm font-medium">Exportações agendadas</div>
            {agendamentos.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/70 px-4 py-3 text-sm">
                <span>{a.recurso}</span>
                <span className="text-xs text-muted-foreground">
                  {a.frequencia} · {a.formato.toUpperCase()} · {a.destino} · criado em {a.criadoEm}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Link to="/administrativo/auditoria" className="inline-flex items-center gap-1 text-sm text-brand-orange hover:underline">
        Abrir auditoria de cadastros <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
