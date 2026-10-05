// ============================================================================
// Mapa do sistema — a visão que responde "o que depende do quê?" dentro da
// própria interface, com o estado real de cada etapa.
//
// Três leituras na mesma página:
//   1. por onde começar (fluxo essencial, com status);
//   2. as correntes de dependência (cadastro → processo → resultado);
//   3. todas as telas, com o que precisa existir antes de usar cada uma.
// ============================================================================
import { Link } from "react-router-dom";
import {
  ArrowRight, CheckCircle2, CircleAlert, GitBranch, Map as MapIcon, Route,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, Progress, cn,
} from "@/design-system/mj-design-system-db98fa";
import PageHeader from "@/components/contabil/PageHeader";
import SeloRequisito from "@/components/ux/SeloRequisito";
import TrilhaFluxo, { useEtapasFluxo } from "@/components/ux/TrilhaFluxo";
import { progressoFluxo } from "@/lib/ux/fluxo";
import { SECOES } from "@/lib/ux/navModelo";
import { avaliar, type EstadoRequisito } from "@/lib/ux/requisitos";
import { useContexto } from "@/lib/ux/contexto";
import { buscarTela } from "@/lib/ux/telas";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { useCompetencia } from "@/lib/competencia";

/** Correntes de dependência que o sistema reconhece entre cadastros e processos. */
const CORRENTES: { titulo: string; porque: string; passos: { titulo: string; rota: string }[] }[] = [
  {
    titulo: "Cadeia contábil",
    porque: "Sem empresa e plano de contas não existe lançamento; sem lançamento não existe relatório.",
    passos: [
      { titulo: "Empresa", rota: "/preparativos/cadastros/empresas" },
      { titulo: "Plano de contas", rota: "/contabil/cadastros/plano-contas" },
      { titulo: "Centros de custo", rota: "/contabil/cadastros/centros-custo" },
      { titulo: "Lançamentos", rota: "/contabil/escrituracao/lancamentos" },
      { titulo: "Balancete / Razão / Diário", rota: "/contabil/relatorios/balancete" },
      { titulo: "DRE", rota: "/financeiro/demonstracoes/dre" },
    ],
  },
  {
    titulo: "Cadeia fiscal",
    porque: "O documento fiscal alimenta os livros, que alimentam as apurações, que geram guias e obrigações.",
    passos: [
      { titulo: "Clientes e fornecedores", rota: "/preparativos/cadastros/participantes" },
      { titulo: "Produtos e serviços", rota: "/preparativos/cadastros/produtos-servicos" },
      { titulo: "Documentos fiscais", rota: "/fiscal/documentos/entradas" },
      { titulo: "Livros de entradas e saídas", rota: "/fiscal/escrituracao/livro-entradas" },
      { titulo: "Apurações", rota: "/fiscal/apuracoes" },
      { titulo: "Guias e obrigações", rota: "/fiscal/guias/darf" },
    ],
  },
  {
    titulo: "Cadeia financeira",
    porque: "Os títulos e os lançamentos são confrontados com o extrato até fechar a competência.",
    passos: [
      { titulo: "Participantes", rota: "/preparativos/cadastros/participantes" },
      { titulo: "Contas a pagar e receber", rota: "/administrativo/financeiro-operacional/contas-pagar" },
      { titulo: "Lançamentos contábeis", rota: "/contabil/escrituracao/lancamentos" },
      { titulo: "Conciliação bancária", rota: "/financeiro/operacional/conciliacao" },
      { titulo: "Fechamento", rota: "/preparativos/servicos/encerramentos" },
    ],
  },
];

export default function MapaSistema() {
  const { empresaId } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const ctx = useContexto(empresaId, competencia);
  const etapas = useEtapasFluxo();
  const progresso = progressoFluxo(etapas);

  const todasTelas = SECOES.flatMap((secao) =>
    secao.subgrupos.flatMap((sub) =>
      sub.itens.map((item) => ({ secao, sub, item })),
    ),
  );

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        icon={MapIcon}
        iconAccent="purple"
        eyebrow="01 · Painel de controle"
        title="Mapa do"
        titleAccent="sistema"
        description="O que existe, o que depende do quê e o que já está pronto na empresa e competência selecionadas. Use esta página como referência quando estiver em dúvida sobre onde cadastrar ou o que fazer primeiro."
        badges={
          <>
            <Badge variant="outline" className="rounded-md">
              {progresso.feitas}/{progresso.total} etapas essenciais
            </Badge>
            <Badge variant="outline" className="rounded-md">
              {todasTelas.length} telas mapeadas
            </Badge>
          </>
        }
        actions={
          <Button asChild className="rounded-lg bg-brand-orange text-primary-foreground hover:bg-brand-orange/90">
            <Link to="/dashboard">
              Ir para o dashboard
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <Card className="rounded-xl border-border/70">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Route className="h-4 w-4 text-primary" />
              <h2 className="font-display text-xl">Por onde começar</h2>
            </div>
            <span className="font-mono text-sm text-primary">{progresso.porcentagem}%</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Cada etapa abaixo destrava a seguinte. Clique em qualquer passo para abrir a tela.
          </p>
          <Progress
            value={progresso.porcentagem}
            className={cn("mt-3 h-1.5", progresso.porcentagem === 100 ? "[&>*]:bg-success" : "[&>*]:bg-brand-orange")}
          />
          <TrilhaFluxo className="mt-4" />

          <ol className="mt-5 space-y-2">
            {etapas.map((e) => (
              <li
                key={e.id}
                className="flex flex-col gap-2 rounded-lg border border-border/70 bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  {e.concluida ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <CircleAlert
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        e.essencial ? "text-destructive" : "text-warn",
                      )}
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {e.ordem}. {e.titulo}
                      {!e.essencial && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                          opcional
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {e.concluida ? e.texto : e.acao}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80">{e.porque}</p>
                  </div>
                </div>
                <Button
                  asChild
                  variant={e.concluida ? "outline" : "default"}
                  size="sm"
                  className={cn(
                    "shrink-0 rounded-lg",
                    !e.concluida && "bg-brand-orange text-primary-foreground hover:bg-brand-orange/90",
                  )}
                >
                  <Link to={e.rota}>
                    {e.concluida ? "Revisar" : e.acaoBotao}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-border/70">
        <CardContent className="p-5">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            <h2 className="font-display text-xl">O que depende do quê</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            As correntes abaixo são o caminho que o sistema percorre. Se algo travar, o problema
            quase sempre está em um passo anterior.
          </p>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {CORRENTES.map((corrente) => (
              <div key={corrente.titulo} className="rounded-xl border border-border/70 p-4">
                <h3 className="text-sm font-medium">{corrente.titulo}</h3>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  {corrente.porque}
                </p>
                <ol className="mt-3 space-y-1">
                  {corrente.passos.map((passo, i) => {
                    const tela = buscarTela(passo.rota);
                    const requisitos = (tela?.requisitos ?? []).map((id) => avaliar(id, ctx));
                    const pendentes = requisitos.filter((r) => !r.ok);
                    return (
                      <li key={passo.rota + passo.titulo} className="flex items-center gap-1.5">
                        {i > 0 && <span className="text-muted-foreground/40">↓</span>}
                        <Link
                          to={passo.rota}
                          className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-2 py-1 text-xs transition hover:bg-accent/60"
                        >
                          <span className="truncate">{passo.titulo}</span>
                          {pendentes.length === 0 ? (
                            <CheckCircle2 className="h-3 w-3 shrink-0 text-success" />
                          ) : (
                            <Badge
                              variant="outline"
                              className={cn(
                                "shrink-0 rounded-md px-1.5 py-0 text-[9px]",
                                pendentes.some((p) => p.requisito.nivel === "critico")
                                  ? "border-destructive/40 text-destructive"
                                  : "border-warn/40 text-warn",
                              )}
                            >
                              faltam {pendentes.length}
                            </Badge>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {SECOES.map((secao) => (
        <Card key={secao.id} className="rounded-xl border-border/70">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-muted">
                <secao.icon className="h-4 w-4 text-muted-foreground" />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-xl">
                  {secao.codigo} · {secao.titulo}
                </h2>
                <p className="text-xs text-muted-foreground">{secao.resumo}</p>
              </div>
            </div>

            <div className="mt-4 divide-y divide-border/60">
              {secao.subgrupos.flatMap((sub) =>
                sub.itens.map((item) => {
                  const tela = buscarTela(item.rota);
                  const estados: EstadoRequisito[] = (tela?.requisitos ?? []).map((id) =>
                    avaliar(id, ctx),
                  );
                  const criticos = estados.filter(
                    (e) => !e.ok && e.requisito.nivel === "critico",
                  );
                  return (
                    <div key={item.rota + item.titulo} className="py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link
                          to={item.rota}
                          className="flex min-w-0 items-center gap-2 text-sm font-medium hover:text-primary"
                        >
                          <item.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{item.titulo}</span>
                          {sub.titulo && (
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              {sub.titulo}
                            </span>
                          )}
                        </Link>
                        {estados.length > 0 && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "shrink-0 rounded-md text-[10px]",
                              criticos.length
                                ? "border-destructive/40 text-destructive"
                                : estados.every((e) => e.ok)
                                  ? "border-success/40 text-success"
                                  : "border-warn/40 text-warn",
                            )}
                          >
                            {criticos.length
                              ? `${criticos.length} obrigatório(s) pendente(s)`
                              : estados.every((e) => e.ok)
                                ? "pronta para uso"
                                : "recomendado configurar"}
                          </Badge>
                        )}
                      </div>

                      {tela ? (
                        <p className="mt-1 text-xs text-muted-foreground">{tela.oQueFaz}</p>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Módulo de exemplo/documentação — consulte a tela para detalhes.
                        </p>
                      )}

                      {estados.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {estados.map((e) => (
                            <SeloRequisito key={e.id} estado={e} />
                          ))}
                        </div>
                      )}

                      {tela?.alimenta && tela.alimenta.length > 0 && (
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          <span className="font-medium uppercase tracking-wider">Alimenta:</span>{" "}
                          {tela.alimenta.map((a) => a.titulo).join(" · ")}
                        </p>
                      )}
                    </div>
                  );
                }),
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
