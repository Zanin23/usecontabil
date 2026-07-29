import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck, Coins, FileSearch, Gauge, RefreshCw, ScrollText, ShieldCheck, Tags,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, Progress,
} from "@/design-system/mj-design-system-db98fa";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { toast } from "sonner";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import {
  CATEGORIAS, CORES, CRITICIDADES, FLUXO, brlAud, reprocessar, resumoAchados,
  resumoCertidoes, resumoCreditos, useAuditoria, useCertidoes, useLogAuditoria,
  useOportunidades,
} from "@/lib/auditoriaStore";

const ICONES = {
  "xml-escrituracao": FileSearch,
  classificacao: Tags,
  creditos: Coins,
  certidoes: BadgeCheck,
} as const;

const CORES_GRAFICO: Record<string, string> = {
  "Crítica": "hsl(var(--destructive))",
  "Alta": "var(--brand-orange)",
  "Média": "var(--brand-purple)",
  "Baixa": "var(--brand-blue)",
  "Informativa": "hsl(var(--muted-foreground))",
};

function Kpi({ label, valor, hint, tom }: { label: string; valor: string; hint?: string; tom?: "risco" | "ok" }) {
  return (
    <Card className="rounded-3xl border-border/70">
      <CardContent className="space-y-1 p-5">
        <div className="text-[10px] uppercase leading-tight tracking-[0.06em] break-words text-muted-foreground">{label}</div>
        <div className={`break-words font-display text-3xl ${tom === "risco" ? "text-destructive" : tom === "ok" ? "text-brand-orange" : ""}`}>
          {valor}
        </div>
        {hint && <div className="text-xs break-words text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export default function AuditoriaHub() {
  const navigate = useNavigate();
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const achados = useAuditoria(empresa?.id, competencia);
  const creditos = useOportunidades(empresa?.id, competencia);
  const certs = useCertidoes(empresa?.id);
  const log = useLogAuditoria().slice(0, 8);

  const r = resumoAchados(achados);
  const rc = resumoCreditos(creditos);
  const rd = resumoCertidoes(certs);

  const dados = useMemo(
    () => CRITICIDADES.map((c) => ({ nome: c, qtd: achados.filter((a) => a.criticidade === c).length })),
    [achados],
  );

  const porCategoria = useMemo(
    () => CATEGORIAS.map((c) => ({
      ...c,
      qtd: c.slug === "creditos" ? creditos.length
        : c.slug === "certidoes" ? rd.vencidas + rd.pendencias
        : achados.filter((a) => a.grupo === c.slug).length,
      criticos: achados.filter((a) => a.grupo === c.slug && a.criticidade === "Crítica").length,
    })),
    [achados, creditos, rd],
  );

  function executar() {
    if (!empresa) return toast.error("Selecione uma empresa para auditar.");
    reprocessar(empresa.id, competencia, "Auditoria completa pelo painel");
    toast.success("Auditoria executada sobre todos os módulos da competência.");
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fiscal</div>
          <h1 className="font-display text-3xl sm:text-4xl">
            Auditoria <span className="text-brand-orange">fiscal</span>
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Inteligência tributária: cruzamento entre documentos, escrituração, apurações e obrigações,
            com motor de regras, criticidade e trilha de auditoria.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary" className="rounded-full">{formatCompetencia(competencia)}</Badge>
            <Badge variant="secondary" className="rounded-full">{empresa?.razao ?? "Nenhuma empresa selecionada"}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => navigate("/fiscal/auditoria/regras")}>
            <ScrollText className="mr-1.5 h-4 w-4" /> Motor de regras
          </Button>
          <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={executar}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Executar auditoria
          </Button>
        </div>
      </div>

      <Card className="rounded-3xl border-border/70 shadow-card">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,320px)_1fr]">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.06em] text-muted-foreground">
              <Gauge className="h-4 w-4 text-brand-orange" /> Tax compliance score
            </div>
            <div className="font-display text-6xl">{r.score}<span className="text-2xl text-muted-foreground">/100</span></div>
            <Progress value={r.score} />
            <p className="text-xs text-muted-foreground">
              Score calculado pelas inconsistências em aberto, ponderadas por criticidade.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-border/70 p-3">
                <div className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground">Valor em risco</div>
                <div className="font-mono text-sm text-destructive">{brlAud(r.valorEmRisco)}</div>
              </div>
              <div className="rounded-2xl border border-border/70 p-3">
                <div className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground">Recuperável</div>
                <div className="font-mono text-sm text-brand-orange">{brlAud(rc.recuperavel)}</div>
              </div>
            </div>
          </div>
          <div className="min-w-0">
            <div className="mb-2 text-xs uppercase tracking-[0.06em] text-muted-foreground">
              Inconsistências por criticidade
            </div>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dados}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="nome" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.75rem",
                    }}
                  />
                  <Bar dataKey="qtd" radius={[8, 8, 0, 0]}>
                    {dados.map((d) => <Cell key={d.nome} fill={CORES_GRAFICO[d.nome]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Inconsistências abertas" valor={String(r.abertos)} hint={`${r.total} no total`} tom={r.abertos ? "risco" : undefined} />
        <Kpi label="Achados críticos" valor={String(r.criticos)} hint={`${r.altos} de criticidade alta`} tom={r.criticos ? "risco" : undefined} />
        <Kpi label="Créditos identificados" valor={brlAud(rc.total)} hint={`${rc.identificados} oportunidade(s)`} tom="ok" />
        <Kpi label="Certidões" valor={`${rd.validas}/${rd.total}`} hint={`${rd.vencidas} vencida(s) · ${rd.aVencer} a vencer`} tom={rd.vencidas ? "risco" : undefined} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {porCategoria.map((c) => {
          const Icone = ICONES[c.slug];
          return (
            <Card
              key={c.slug}
              className="cursor-pointer rounded-3xl border-border/70 transition-shadow hover:shadow-elevated"
              onClick={() => navigate(c.rota)}
            >
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icone className="h-5 w-5 shrink-0 text-brand-orange" />
                    <span className="font-display text-xl">{c.titulo}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {c.criticos > 0 && <Badge className={`rounded-full ${CORES["Crítica"]}`}>{c.criticos} crítico(s)</Badge>}
                    <Badge variant="secondary" className="rounded-full">{c.qtd}</Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{c.descricao}</p>
                <div className="flex flex-wrap gap-1">
                  {c.submodulos.slice(0, 6).map((s) => (
                    <Badge key={s} variant="secondary" className="rounded-full text-[10px]">{s}</Badge>
                  ))}
                  {c.submodulos.length > 6 && (
                    <Badge variant="secondary" className="rounded-full text-[10px]">+{c.submodulos.length - 6}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-3xl border-border/70">
        <CardContent className="space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-display text-xl">
            <ShieldCheck className="h-5 w-5 text-brand-orange" /> Fluxo operacional da auditoria
          </h2>
          <div className="flex flex-wrap gap-2">
            {FLUXO.map((f, i) => (
              <div key={f} className="flex items-center gap-2 rounded-full border border-border/70 px-3 py-1.5 text-xs">
                <span className="font-mono text-[10px] text-brand-orange">{String(i + 1).padStart(2, "0")}</span>
                {f}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/70">
        <CardContent className="space-y-2 p-5">
          <h2 className="font-display text-xl">Trilha de auditoria</h2>
          {log.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 p-3 text-sm">
              <span className="font-mono text-xs text-muted-foreground">{new Date(l.data).toLocaleString("pt-BR")}</span>
              <Badge variant="secondary" className="rounded-full text-[10px]">{l.acao}</Badge>
              <span className="min-w-0 flex-1 break-words">{l.detalhe}</span>
              <span className="text-xs text-muted-foreground">{l.usuario}</span>
            </div>
          ))}
          {log.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma execução registrada. Clique em “Executar auditoria” para iniciar.
            </p>
          )}
        </CardContent>
      </Card>

      <AssistenteFechamento
        rotulo="IA ajudante"
        resumo={`Auditoria fiscal de ${formatCompetencia(competencia)}: score ${r.score}/100, ${r.abertos} inconsistência(s) aberta(s), ${brlAud(r.valorEmRisco)} em risco e ${brlAud(rc.recuperavel)} em créditos recuperáveis.`}
        contexto={{
          modulo: "Auditoria fiscal",
          empresa: empresa?.razao,
          competencia,
          resumoAchados: r,
          creditos: rc,
          certidoes: rd,
          categorias: porCategoria.map((c) => ({ titulo: c.titulo, achados: c.qtd, criticos: c.criticos })),
        }}
      />
    </div>
  );
}
