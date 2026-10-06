import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, BadgeDollarSign, Coins, Landmark, PieChart, Split, type LucideIcon,
} from "lucide-react";
import { Badge, Button, Card, CardContent } from "@/design-system/mj-design-system-db98fa";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import { MOTORES, resumoMotor, rs, useApuracaoEstado, type MotorSlug } from "@/lib/apuracaoStore";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import PageHeader from "@/components/contabil/PageHeader";
import BlocoOrientacao from "@/components/ux/BlocoOrientacao";

const ICONES: Record<MotorSlug, LucideIcon> = {
  "pis-cofins": Coins,
  iss: Landmark,
  "irpj-csll": BadgeDollarSign,
  "simples-nacional": PieChart,
  retencoes: Split,
};

function CartaoMotor({
  slug, titulo, descricao, submodulos,
}: { slug: MotorSlug; titulo: string; descricao: string; submodulos: string[] }) {
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const estado = useApuracaoEstado(slug, empresa?.id, competencia);
  const r = useMemo(
    () => resumoMotor(slug, empresa?.id ?? null, competencia),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recalcula quando o estado da obrigação muda (estado)
    [slug, empresa, competencia, estado],
  );
  const Icone = ICONES[slug];

  return (
    <Card className="rounded-xl border-border/70 transition-shadow hover:shadow-card">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-brand-orange/12 p-2.5">
              <Icone className="h-5 w-5 text-brand-orange" />
            </div>
            <div>
              <h2 className="font-display text-xl">{titulo}</h2>
              <p className="text-sm text-muted-foreground max-w-md">{descricao}</p>
            </div>
          </div>
          <Badge
            className={`rounded-md ${estado.status === "Fechada" ? "bg-success/15 text-success" : "bg-brand-orange/15 text-brand-orange"}`}
          >
            {estado.status}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <Indicador label="Documentos" valor={String(r.documentos)} />
          <Indicador label="Regime" valor={r.regime} />
          <Indicador label="Pendências" valor={String(r.pendencias)} />
          <Indicador label="Total apurado" valor={rs(r.total)} destaque />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {submodulos.slice(0, 6).map((s) => (
            <Badge key={s} variant="secondary" className="rounded-md text-[10px]">{s}</Badge>
          ))}
          {submodulos.length > 6 && (
            <Badge variant="secondary" className="rounded-md text-[10px]">+{submodulos.length - 6}</Badge>
          )}
        </div>

        <Button asChild className="rounded-lg bg-brand-orange hover:bg-brand-orange/90">
          <Link to={`/fiscal/apuracoes/${slug}`}>
            Abrir apuração <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function Indicador({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${destaque ? "border-brand-orange/40 bg-brand-orange/5" : "border-border/70"}`}>
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-mono text-sm ${destaque ? "text-brand-orange" : ""}`}>{valor}</div>
    </div>
  );
}

export default function ApuracoesHub() {
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        trail={[{ label: "Fiscal", to: "/fiscal" }]}
        eyebrow="Fiscal · Apurações"
        title="Painel de"
        titleAccent="apurações"
        description="Cada tributo é um motor independente que lê os documentos fiscais da competência, aplica as regras parametrizadas e devolve base, créditos, débitos, guias e memória de cálculo."
        badges={
          <>
            <Badge variant="outline" className="rounded-md">{formatCompetencia(competencia)}</Badge>
            <Badge variant="outline" className="rounded-md">{empresa?.razao ?? "Nenhuma empresa selecionada"}</Badge>
          </>
        }
        compact
      />

      <BlocoOrientacao />

      <div className="grid gap-4 xl:grid-cols-2">
        {MOTORES.map((m) => (
          <CartaoMotor key={m.slug} slug={m.slug} titulo={m.titulo} descricao={m.descricao} submodulos={m.submodulos} />
        ))}
      </div>

      <AssistenteFechamento
        rotulo="IA ajudante"
        resumo={`Painel de apurações fiscais de ${formatCompetencia(competencia)}.`}
        contexto={{
          tela: "Hub de apurações fiscais",
          competencia,
          empresa: empresa?.razao,
          motores: MOTORES.map((m) => m.titulo),
        }}
      />
    </div>
  );
}
