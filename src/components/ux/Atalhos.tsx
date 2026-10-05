// ============================================================================
// Atalhos — as ações mais usadas, organizadas pelo momento do ciclo.
// Os três primeiros são dinâmicos (o que o sistema entende que vem agora);
// o restante é o conjunto fixo de ações frequentes.
// ============================================================================
import { Link } from "react-router-dom";
import {
  BadgeDollarSign, BookOpen, Calculator, FileDown, Landmark, Receipt, Scale, Users2,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, cn } from "@/design-system/mj-design-system-db98fa";
import { useEtapasFluxo } from "./TrilhaFluxo";

type Atalho = { titulo: string; rota: string; icon: LucideIcon; desc: string };

const FIXOS: Atalho[] = [
  { titulo: "Importar XML", rota: "/fiscal/documentos/entradas", icon: FileDown, desc: "Notas de entrada" },
  { titulo: "Novo lançamento", rota: "/contabil/escrituracao/lancamentos", icon: Calculator, desc: "Partidas dobradas" },
  { titulo: "Novo participante", rota: "/preparativos/cadastros/participantes", icon: Users2, desc: "Cliente ou fornecedor" },
  { titulo: "Guias do período", rota: "/fiscal/guias/darf", icon: BadgeDollarSign, desc: "DARF e recolhimentos" },
  { titulo: "Conciliar", rota: "/financeiro/operacional/conciliacao", icon: Landmark, desc: "Extrato × contabilidade" },
  { titulo: "Balancete", rota: "/contabil/relatorios/balancete", icon: Scale, desc: "Conferência de saldos" },
  { titulo: "Notas de saída", rota: "/fiscal/documentos/saidas", icon: Receipt, desc: "Documentos emitidos" },
  { titulo: "Aprender", rota: "/aprender", icon: BookOpen, desc: "Trilhas e glossário" },
];

export default function Atalhos({ className, limite = 8 }: { className?: string; limite?: number }) {
  const etapas = useEtapasFluxo();
  const pendentes = etapas.filter((e) => !e.concluida).slice(0, 3);
  const fixos = FIXOS.slice(0, Math.max(0, limite - pendentes.length));

  return (
    <Card className={cn("rounded-xl border-border/70", className)}>
      <CardContent className="p-5">
        <h2 className="font-display text-xl">Atalhos</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Ações frequentes — as marcadas em laranja são os próximos passos do ciclo.
        </p>

        {pendentes.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {pendentes.map((e) => (
              <Item
                key={e.id}
                rota={e.rota}
                titulo={e.titulo}
                desc={e.porque}
                icon={Calculator}
                destaque
              />
            ))}
          </div>
        )}

        <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {fixos.map((a) => (
            <Item key={a.rota + a.titulo} rota={a.rota} titulo={a.titulo} desc={a.desc} icon={a.icon} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Item({
  rota,
  titulo,
  desc,
  icon: Icone,
  destaque = false,
}: {
  rota: string;
  titulo: string;
  desc: string;
  icon: LucideIcon;
  destaque?: boolean;
}) {
  return (
    <Link
      to={rota}
      className={cn(
        "flex items-center gap-2.5 rounded-lg border px-3 py-2 transition",
        destaque
          ? "border-primary/35 bg-primary/[0.06] hover:border-primary/60"
          : "border-transparent hover:border-border hover:bg-accent/50",
      )}
    >
      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
          destaque ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        <Icone className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{titulo}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{desc}</span>
      </span>
    </Link>
  );
}
