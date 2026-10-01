import AvisoSimulacao from "@/components/contabil/AvisoSimulacao";
import { Link } from "react-router-dom";
import {
  Banknote, Boxes, Briefcase, ChevronRight, Database, Landmark, ListTree, Lock, RefreshCw,
  Search, ShieldCheck, Users2, Wallet2, type LucideIcon,
} from "lucide-react";
import {
  Badge, Card, CardContent,
} from "@/design-system/mj-design-system-db98fa";
import {
  DOMINIOS, INTEGRACOES, LOG_SYNC, READ_ONLY_MSG, auditarDominio, useRegistrarAcesso,
  type DominioSlug,
} from "@/lib/adminStore";
import PageHeader from "@/components/contabil/PageHeader";

const ICONES: Record<DominioSlug, LucideIcon> = {
  clientes: Users2,
  fornecedores: Briefcase,
  "produtos-servicos": Boxes,
  bancos: Landmark,
  "plano-gerencial": ListTree,
  "condicoes-pagamento": Wallet2,
};

const ATALHOS = [
  { to: "/administrativo/pesquisa", titulo: "Pesquisa global", desc: "Busca única em todos os cadastros.", icon: Search },
  { to: "/administrativo/dashboard", titulo: "Dashboard executivo", desc: "Indicadores consolidados e sincronizações.", icon: Banknote },
  { to: "/administrativo/auditoria", titulo: "Auditoria de cadastros", desc: "Motor de validação e inconsistências.", icon: ShieldCheck },
];

export default function AdministrativoHub() {
  useRegistrarAcesso("Administrativo · Hub de cadastros analíticos");

  return (
    <div className="space-y-8">
      <PageHeader
        trail={[{ label: "Administrativo", to: "/administrativo" }]}
        eyebrow="Administrativo · Cadastros"
        title="Cadastros"
        titleAccent="analíticos"
        description={`Consulta, indicadores, relatórios e auditoria sobre os cadastros sincronizados do ERP principal. ${READ_ONLY_MSG}`}
        icon={Database}
        iconAccent="purple"
        compact
      />

      <AvisoSimulacao className="max-w-3xl">
        A integração com o ERP ainda não está ativa: estes cadastros são exemplos fixos. Os cadastros reais do sistema ficam em{" "}
        <Link className="underline" to="/preparativos/cadastros/participantes">Clientes e fornecedores</Link>,{" "}
        <Link className="underline" to="/preparativos/cadastros/produtos-servicos">Produtos e serviços</Link> e{" "}
        <Link className="underline" to="/contabil/cadastros/plano-contas">Plano de contas</Link>.
      </AvisoSimulacao>

      <div className="grid gap-3 sm:grid-cols-3">
        {ATALHOS.map((a) => (
          <Link key={a.to} to={a.to}>
            <Card className="h-full rounded-xl border-border/70 transition-colors hover:border-brand-purple/60">
              <CardContent className="flex items-start gap-3 p-5">
                <span className="rounded-xl bg-brand-purple/12 p-2 text-brand-purple"><a.icon className="h-5 w-5" /></span>
                <div>
                  <div className="text-sm font-medium">{a.titulo}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{a.desc}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {DOMINIOS.map((d) => {
          const Icon = ICONES[d.slug];
          const achados = auditarDominio(d);
          return (
            <Link key={d.slug} to={`/administrativo/cadastros/${d.slug}`}>
              <Card className="h-full rounded-xl border-border/70 transition-colors hover:border-brand-purple/60">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-xl bg-brand-purple/12 p-2 text-brand-purple"><Icon className="h-5 w-5" /></span>
                    <Badge className="rounded-md border-0 bg-muted text-muted-foreground">
                      <Lock className="mr-1 h-3 w-3" /> Somente leitura
                    </Badge>
                  </div>
                  <div>
                    <div className="font-display text-lg">{d.titulo}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{d.desc}</div>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                    <span>{d.registros.length} registros · {achados.length} inconsistências</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl border-border/70">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <RefreshCw className="h-4 w-4 text-brand-purple" /> Últimas sincronizações (simuladas)
            </div>
            {LOG_SYNC.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 px-4 py-3 text-sm">
                <span>{l.dominio}</span>
                <span className="text-xs text-muted-foreground">
                  {l.em} · {l.registros} reg · {l.novos} novos · {l.alterados} alterados · {l.duracao} · {l.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/70">
          <CardContent className="space-y-3 p-5">
            <div className="text-sm font-medium">Integrações <span className="text-xs font-normal text-muted-foreground">(simuladas — nenhuma está conectada)</span></div>
            <div className="grid gap-2 sm:grid-cols-2">
              {INTEGRACOES.map((i) => (
                <div key={i.nome} className="rounded-lg border border-border/70 px-4 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>{i.nome}</span>
                    <Badge className="rounded-md border-0 bg-muted text-muted-foreground">Simulado</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{i.tipo} · {i.detalhe}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
