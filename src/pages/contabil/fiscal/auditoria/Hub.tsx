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
  const log = useLogAuditoria().log.slice(0, 8);

  const r = resumoAchados(achados);
  const rc = resumoCreditos(creditos);
  const rd = resumoCertidoes(certs);

  const dados = useMemo(
    () =>
      CRITICIDADES.map((c) => {
        const doGrupo = achados.filter((a) => a.criticidade === c);
        return { nome: c, qtd: doGrupo.length, valor: doGrupo.reduce((s, a) => s + a.valor, 0) };
      }),
    [achados],
  );

  const maximo = Math.max(1, ...dados.map((d) => d.qtd));

  const diagnostico =
    r.total === 0
      ? { rotulo: "Sem apontamentos", tom: "bg-brand-blue/15 text-brand-blue", texto: "Nenhuma regra fiscal foi violada nesta competência. Execute a auditoria após novas importações." }
      : r.score >= 90
        ? { rotulo: "Conformidade alta", tom: "bg-brand-blue/15 text-brand-blue", texto: "Apontamentos residuais. Trate os itens abertos antes da transmissão das obrigações." }
        : r.score >= 70
          ? { rotulo: "Atenção", tom: "bg-brand-orange/15 text-brand-orange", texto: "Há inconsistências relevantes em aberto que podem impactar apurações e SPED." }
          : { rotulo: "Risco fiscal", tom: "bg-destructive/15 text-destructive", texto: "Volume elevado de achados críticos. Priorize a correção antes de fechar a competência." };


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
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,300px)_1fr]">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.06em] text-muted-foreground">
              <Gauge className="h-4 w-4 text-brand-orange" /> Tax compliance score
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="font-display text-6xl leading-none">
                {r.score}<span className="text-2xl text-muted-foreground">/100</span>
              </div>
              <Badge className={`mb-1 rounded-full ${diagnostico.tom}`}>{diagnostico.rotulo}</Badge>
            </div>
            <Progress value={r.score} />
            <p className="text-xs text-muted-foreground">{diagnostico.texto}</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-border/70 p-3">
                <div className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground">Valor em risco</div>
                <div className={`font-mono text-sm ${r.valorEmRisco > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {brlAud(r.valorEmRisco)}
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 p-3">
                <div className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground">Recuperável</div>
                <div className={`font-mono text-sm ${rc.recuperavel > 0 ? "text-brand-orange" : "text-muted-foreground"}`}>
                  {brlAud(rc.recuperavel)}
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-[0.06em] text-muted-foreground">
                Inconsistências por criticidade
              </span>
              <Badge variant="secondary" className="rounded-full text-[10px]">
                {r.total} achado(s) · {r.abertos} em aberto
              </Badge>
            </div>

            {r.total === 0 ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/70 p-6 text-center">
                <ShieldCheck className="h-8 w-8 text-brand-orange" />
                <p className="font-display text-xl">Nenhuma inconsistência nesta competência</p>
                <p className="max-w-md text-sm text-muted-foreground">
                  {empresa
                    ? "Importe documentos fiscais e execute a auditoria para cruzar XML, escrituração, apurações e obrigações."
                    : "Selecione uma empresa no topo da tela para auditar a competência."}
                </p>
                <Button size="sm" className="mt-1 rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={executar}>
                  <RefreshCw className="mr-1.5 h-4 w-4" /> Executar auditoria
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {dados.map((d) => (
                  <div key={d.nome} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-xs text-muted-foreground">{d.nome}</span>
                    <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-[width]"
                        style={{ width: `${maximo ? (d.qtd / maximo) * 100 : 0}%`, background: CORES_GRAFICO[d.nome] }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right font-mono text-sm">{d.qtd}</span>
                    <span className="hidden w-28 shrink-0 text-right font-mono text-[11px] text-muted-foreground sm:block">
                      {brlAud(d.valor)}
                    </span>
                  </div>
                ))}
                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                  {[
                    { label: "Abertas", v: r.abertos },
                    { label: "Em análise", v: r.emAnalise },
                    { label: "Corrigidas", v: r.corrigidos },
                    { label: "Ignoradas", v: r.ignorados },
                  ].map((t) => (
                    <div key={t.label} className="rounded-2xl border border-border/70 p-3">
                      <div className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground">{t.label}</div>
                      <div className="font-display text-2xl">{t.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
