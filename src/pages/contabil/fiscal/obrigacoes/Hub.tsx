import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, Clock, Database, FileArchive,
  FileCog, Radio, Send, Table2, XCircle, type LucideIcon,
} from "lucide-react";
import { Badge, Button, Card, CardContent } from "@/design-system/mj-design-system-db98fa";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import PageHeader from "@/components/contabil/PageHeader";
import BlocoOrientacao from "@/components/ux/BlocoOrientacao";
import {
  CATALOGO, monitorar, resumoMonitor, useObrEstado, vencimentoBR, diasRestantes,
  type ObrSlug,
} from "@/lib/obrigacoesStore";

const ICONES: Record<ObrSlug, LucideIcon> = {
  "sped-fiscal": Database,
  "efd-contribuicoes": FileArchive,
  "ecd-ecf": FileCog,
  dctfweb: Send,
  reinf: Radio,
  estaduais: Table2,
};

function Cartao({ slug }: { slug: ObrSlug }) {
  const def = CATALOGO.find((o) => o.slug === slug)!;
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const estado = useObrEstado(slug, empresa?.id, competencia);
  const linha = useMemo(
    () => monitorar(empresa?.id ?? null, competencia).find((l) => l.obr === slug)!,
    [empresa, competencia, slug, estado],
  );
  const Icone = ICONES[slug];
  const dias = diasRestantes(slug, competencia);

  return (
    <Card className="rounded-xl border-border/70 transition-shadow hover:shadow-card">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-brand-orange/12 p-2.5">
              <Icone className="h-5 w-5 text-brand-orange" />
            </div>
            <div>
              <h2 className="font-display text-xl">{def.titulo}</h2>
              <p className="text-sm text-muted-foreground max-w-md">{def.descricao}</p>
            </div>
          </div>
          <Badge
            className={`rounded-md ${
              estado.status === "Transmitida"
                ? "bg-success/15 text-success"
                : linha.erros > 0
                  ? "bg-destructive/15 text-destructive"
                  : "bg-brand-orange/15 text-brand-orange"
            }`}
          >
            {estado.status}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <Indicador label="Arquivos" valor={String(estado.arquivos.length)} />
          <Indicador label="Transmitidos" valor={String(estado.transmissoes.filter((t) => t.situacao === "Transmitida").length)} />
          <Indicador label="Pendências" valor={String(linha.erros + linha.advertencias)} />
          <Indicador label="Erros PVA" valor={String(linha.erros)} destaque={linha.erros > 0} />
          <Indicador label="Advertências" valor={String(linha.advertencias)} />
          <Indicador
            label="Prazo"
            valor={`${vencimentoBR(slug, competencia)}`}
            hint={dias >= 0 ? `${dias} dia(s)` : `${Math.abs(dias)} em atraso`}
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {def.submodulos.slice(0, 6).map((s) => (
            <Badge key={s} variant="secondary" className="rounded-md text-[10px]">{s}</Badge>
          ))}
          {def.submodulos.length > 6 && (
            <Badge variant="secondary" className="rounded-md text-[10px]">+{def.submodulos.length - 6}</Badge>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            Última transmissão:{" "}
            {estado.transmissoes[0]
              ? new Date(estado.transmissoes[0].em).toLocaleString("pt-BR")
              : "nenhuma"}
          </span>
          <Button asChild className="rounded-lg bg-brand-orange hover:bg-brand-orange/90">
            <Link to={`/fiscal/obrigacoes/${slug}`}>
              Abrir obrigação <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Indicador({ label, valor, hint, destaque }: { label: string; valor: string; hint?: string; destaque?: boolean }) {
  return (
    <div className={`min-w-0 rounded-lg border p-3 ${destaque ? "border-destructive/40 bg-destructive/5" : "border-border/70"}`}>
      <div className="text-[10px] uppercase tracking-[0.06em] leading-tight break-words hyphens-auto text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-mono text-sm break-words ${destaque ? "text-destructive" : ""}`}>{valor}</div>
      {hint && <div className="text-[10px] text-muted-foreground break-words">{hint}</div>}
    </div>

  );
}

export default function ObrigacoesHub() {
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const linhas = useMemo(() => monitorar(empresa?.id ?? null, competencia), [empresa, competencia]);
  const r = resumoMonitor(linhas);

  const monitores: { label: string; valor: number; icone: LucideIcon; cor: string }[] = [
    { label: "Pendentes", valor: r.pendentes, icone: Clock, cor: "text-brand-orange" },
    { label: "Transmitidas", valor: r.transmitidas, icone: CheckCircle2, cor: "text-success" },
    { label: "Em processamento", valor: r.processando, icone: Send, cor: "text-brand-blue" },
    { label: "Rejeitadas", valor: r.rejeitadas, icone: XCircle, cor: "text-destructive" },
    { label: "Com advertências", valor: r.advertencias, icone: AlertTriangle, cor: "text-brand-orange" },
    { label: "Vencidas", valor: r.vencidas, icone: AlertTriangle, cor: "text-destructive" },
    { label: "Próximas do prazo", valor: r.proximas, icone: CalendarClock, cor: "text-brand-orange" },
  ];

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        trail={[{ label: "Fiscal", to: "/fiscal" }]}
        eyebrow="Fiscal · Obrigações acessórias"
        title="Obrigações"
        titleAccent="acessórias"
        description="Cada obrigação possui motor próprio de geração, validação e transmissão, sobre uma camada comum de auditoria, versionamento e monitoramento."
        icon={CalendarClock}
        badges={
          <>
            <Badge variant="outline" className="rounded-md">{formatCompetencia(competencia)}</Badge>
            <Badge variant="outline" className="rounded-md">{empresa?.razao ?? "Nenhuma empresa selecionada"}</Badge>
          </>
        }
        actions={
          <Button asChild size="sm" variant="outline" className="rounded-lg">
            <Link to="/fiscal/obrigacoes/agenda">
              <CalendarClock className="h-3.5 w-3.5 mr-1.5" /> Agenda fiscal
            </Link>
          </Button>
        }
        compact
      />

      <BlocoOrientacao />

      <Card className="rounded-xl border-border/70">
        <CardContent className="p-5 space-y-3">
          <h2 className="font-display text-xl">Painel de monitoramento</h2>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-7">
            {monitores.map((m) => (
              <div key={m.label} className="rounded-lg border border-border/70 p-3">
                <m.icone className={`h-4 w-4 ${m.cor}`} />
                <div className="mt-1 font-mono text-xl">{m.valor}</div>
                <div className="text-[10px] uppercase tracking-[0.06em] leading-tight break-words text-muted-foreground">{m.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {CATALOGO.map((o) => (
          <Cartao key={o.slug} slug={o.slug} />
        ))}
      </div>

      <AssistenteFechamento
        rotulo="IA ajudante"
        resumo={`Painel de obrigações acessórias de ${formatCompetencia(competencia)}.`}
        contexto={{
          tela: "Hub de obrigações acessórias",
          competencia,
          empresa: empresa?.razao,
          monitoramento: r,
          obrigacoes: linhas.map((l) => ({
            obrigacao: l.titulo,
            status: l.status,
            prazo: l.prazo,
            dias: l.dias,
            erros: l.erros,
            advertencias: l.advertencias,
          })),
        }}
      />
    </div>
  );
}
