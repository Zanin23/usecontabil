import { Link } from "react-router-dom";
import {
  Banknote, Boxes, Briefcase, ChevronRight, Landmark, ListTree, Lock, RefreshCw,
  Search, ShieldCheck, Users2, Wallet2, type LucideIcon,
} from "lucide-react";
import {
  Badge, Card, CardContent,
} from "@/design-system/mj-design-system-db98fa";
import {
  DOMINIOS, INTEGRACOES, LOG_SYNC, READ_ONLY_MSG, auditarDominio, useRegistrarAcesso,
  type DominioSlug,
} from "@/lib/adminStore";

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
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Administrativo</div>
        <h1 className="mt-2 font-display text-4xl">
          Cadastros <span className="text-brand-orange">analíticos.</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Consulta, indicadores, relatórios e auditoria sobre os cadastros sincronizados do ERP
          principal. {READ_ONLY_MSG}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {ATALHOS.map((a) => (
          <Link key={a.to} to={a.to}>
            <Card className="h-full rounded-3xl border-border/70 transition-colors hover:border-brand-orange/60">
              <CardContent className="flex items-start gap-3 p-5">
                <span className="rounded-2xl bg-brand-orange/15 p-2 text-brand-orange"><a.icon className="h-5 w-5" /></span>
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
              <Card className="h-full rounded-3xl border-border/70 transition-colors hover:border-brand-orange/60">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-2xl bg-brand-purple/15 p-2 text-brand-purple"><Icon className="h-5 w-5" /></span>
                    <Badge className="rounded-full border-0 bg-muted text-muted-foreground">
                      <Lock className="mr-1 h-3 w-3" /> Read only
                    </Badge>
                  </div>
                  <div>
                    <div className="font-display text-xl">{d.titulo}</div>
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
        <Card className="rounded-3xl border-border/70">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <RefreshCw className="h-4 w-4 text-brand-orange" /> Últimas sincronizações (simuladas)
            </div>
            {LOG_SYNC.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/70 px-4 py-3 text-sm">
                <span>{l.dominio}</span>
                <span className="text-xs text-muted-foreground">
                  {l.em} · {l.registros} reg · {l.novos} novos · {l.alterados} alterados · {l.duracao} · {l.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/70">
          <CardContent className="space-y-3 p-5">
            <div className="text-sm font-medium">Integrações <span className="text-xs font-normal text-muted-foreground">(simuladas — nenhuma está conectada)</span></div>
            <div className="grid gap-2 sm:grid-cols-2">
              {INTEGRACOES.map((i) => (
                <div key={i.nome} className="rounded-2xl border border-border/70 px-4 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>{i.nome}</span>
                    <Badge className="rounded-full border-0 bg-muted text-muted-foreground">Simulado</Badge>
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
