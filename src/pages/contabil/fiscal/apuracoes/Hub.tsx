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
  // reage a mudanças de estado do motor
  const estado = useApuracaoEstado(slug, empresa?.id, competencia);
  const r = useMemo(
    () => resumoMotor(slug, empresa?.id ?? null, competencia),
    [slug, empresa, competencia, estado],
  );
  const Icone = ICONES[slug];

  return (
    <Card className="rounded-3xl border-border/70 transition-shadow hover:shadow-card">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-brand-orange/10 p-3">
              <Icone className="h-6 w-6 text-brand-orange" />
            </div>
            <div>
              <h2 className="font-display text-2xl">{titulo}</h2>
              <p className="text-sm text-muted-foreground max-w-md">{descricao}</p>
            </div>
          </div>
          <Badge
            className={`rounded-full ${estado.status === "Fechada" ? "bg-success/15 text-success" : "bg-brand-orange/15 text-brand-orange"}`}
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
            <Badge key={s} variant="secondary" className="rounded-full text-[10px]">{s}</Badge>
          ))}
          {submodulos.length > 6 && (
            <Badge variant="secondary" className="rounded-full text-[10px]">+{submodulos.length - 6}</Badge>
          )}
        </div>

        <Button asChild className="rounded-full bg-brand-orange hover:bg-brand-orange/90">
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
    <div className={`rounded-2xl border p-3 ${destaque ? "border-brand-orange/40 bg-brand-orange/5" : "border-border/70"}`}>
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
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fiscal</div>
        <h1 className="font-display text-3xl sm:text-4xl">
          Apurações <span className="text-brand-orange">automatizadas</span>
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Cada tributo é um motor independente que lê os documentos fiscais da competência,
          aplica as regras parametrizadas e devolve base, créditos, débitos, guias e memória de cálculo.
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary" className="rounded-full">{formatCompetencia(competencia)}</Badge>
          <Badge variant="secondary" className="rounded-full">{empresa?.razao ?? "Nenhuma empresa selecionada"}</Badge>
        </div>
      </div>

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
