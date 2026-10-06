// ============================================================================
// Visão geral — a tela que lista todas as telas de um módulo (seção do fluxo).
//
// Três níveis no mesmo componente:
//   /visao-geral                  → todas as seções e todas as telas do sistema
//   /visao-geral/:secao           → as telas de uma seção, agrupadas por etapa
//   /visao-geral/:secao/:grupo    → as telas de uma única etapa
//
// O botão "Contexto das telas" (persistido nas preferências da conta) decide se
// cada card explica o que a tela faz e o que falta cadastrar, ou se mostra só
// nome e linha curta — o atalho de quem já conhece o sistema e quer entrar.
// ============================================================================
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight, ArrowUpRight, CheckSquare, ChevronLeft, Info, ListTree, Map as MapIcon,
  Search, Sparkles,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, cn, Input, Switch,
} from "@/design-system/mj-design-system-db98fa";
import PageHeader from "@/components/contabil/PageHeader";
import CartaoTela from "@/components/ux/CartaoTela";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { useCompetencia } from "@/lib/competencia";
import { useContexto } from "@/lib/ux/contexto";
import { usePreferencias } from "@/lib/preferencias";
import {
  acharGrupo, acharVisao, filtrarCards, rotaVisao, visoesDeTodas,
  type GrupoVisao, type VisaoSecao,
} from "@/lib/ux/visoes";

const acentos = {
  orange: { bg: "bg-brand-orange/12", text: "text-brand-orange" },
  blue: { bg: "bg-brand-blue/12", text: "text-brand-blue" },
  purple: { bg: "bg-brand-purple/12", text: "text-brand-purple" },
  pink: { bg: "bg-brand-pink/12", text: "text-brand-pink" },
} as const;

type Filtro = { busca: string; somentePendentes: boolean };

const contar = (visao: VisaoSecao, f: Filtro) =>
  filtrarCards(visao.grupos.flatMap((g) => g.cards), f.busca, f.somentePendentes).length;

/** Um grupo de telas dentro da página (título + grade de cards). */
function BlocoGrupo({
  visao,
  grupo,
  comContexto,
  filtro,
  mostrarOrigem,
}: {
  visao: VisaoSecao;
  grupo: GrupoVisao;
  comContexto: boolean;
  filtro: Filtro;
  /** Na vista completa, cada grupo repete a seção de origem e ganha atalho próprio. */
  mostrarOrigem: boolean;
}) {
  const cards = filtrarCards(grupo.cards, filtro.busca, filtro.somentePendentes);
  if (cards.length === 0) return null;
  // Seção com um único grupo sem título: o cabeçalho da página já disse tudo.
  const semCabecalho = !mostrarOrigem && !grupo.titulo && visao.grupos.length === 1;

  return (
    <div className="space-y-3" data-grupo={grupo.chave}>
      {!semCabecalho && (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="min-w-0">
            {mostrarOrigem && (
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {visao.secao.codigo} · {visao.secao.titulo}
              </div>
            )}
            <h3 className="font-display mt-0.5 text-lg leading-tight">
              {grupo.titulo ?? "Todas as telas"}
              <span className="ml-2 align-middle text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                {cards.length} tela{cards.length === 1 ? "" : "s"}
              </span>
            </h3>
          </div>
          {grupo.titulo && (
            <Link
              to={rotaVisao(visao.secao.id, grupo.chave)}
              className="shrink-0 text-xs text-muted-foreground transition hover:text-foreground"
              title="Abrir só este grupo de telas"
            >
              {mostrarOrigem ? "Só este grupo →" : "Ver grupo isolado →"}
            </Link>
          )}
        </div>
      )}
      <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => (
          <CartaoTela
            key={`${grupo.chave}-${card.rota}`}
            card={card}
            accent={visao.secao.accent}
            comContexto={comContexto}
            mostrarGrupo={mostrarOrigem}
          />
        ))}
      </div>
    </div>
  );
}

/** Uma seção inteira: cabeçalho próprio + seus grupos. */
function BlocoSecao({
  visao,
  comContexto,
  filtro,
  mostrarOrigem,
  mostrarCabecalho = true,
}: {
  visao: VisaoSecao;
  comContexto: boolean;
  filtro: Filtro;
  mostrarOrigem: boolean;
  mostrarCabecalho?: boolean;
}) {
  const grupos = visao.grupos.filter((g) => filtrarCards(g.cards, filtro.busca, filtro.somentePendentes).length > 0);
  const visiveis = contar(visao, filtro);
  const acento = acentos[visao.secao.accent];

  return (
    <section className="space-y-6" data-secao={visao.secao.id}>
      {mostrarCabecalho && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", acento.bg)}>
              <visao.secao.icon className={cn("h-5 w-5", acento.text)} />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {visao.secao.codigo} · seção do fluxo
              </div>
              <h2 className="font-display mt-0.5 text-2xl leading-tight">{visao.secao.titulo}</h2>
              <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{visao.secao.resumo}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full text-[11px]">
              {visiveis} de {visao.totalTelas} telas
            </Badge>
            {visao.comPendencia > 0 && (
              <Badge variant="outline" className="rounded-full border-warn/45 text-[11px] text-warn">
                {visao.comPendencia} com cadastro pendente
              </Badge>
            )}
            {!mostrarOrigem && (
              <Button asChild variant="outline" size="sm" className="rounded-lg">
                <Link to={rotaVisao()} title="Índice com todas as seções">
                  <ListTree className="mr-1.5 h-4 w-4" />
                  Todas as seções
                </Link>
              </Button>
            )}
            {mostrarOrigem && (
              <Button asChild variant="outline" size="sm" className="rounded-lg">
                <Link to={rotaVisao(visao.secao.id)} title="Só esta seção, sem os demais grupos">
                  Abrir a seção
                  <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {grupos.length === 0 ? (
        <Card className="rounded-xl border-dashed border-border/70">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Nenhuma tela desta seção combina com o filtro.
          </CardContent>
        </Card>
      ) : (
        grupos.map((grupo) => (
          <BlocoGrupo
            key={grupo.chave}
            visao={visao}
            grupo={grupo}
            comContexto={comContexto}
            filtro={filtro}
            mostrarOrigem={mostrarOrigem}
          />
        ))
      )}
    </section>
  );
}

export default function VisaoGeral() {
  const { secao: idSecao, grupo: grupoParam } = useParams();
  const { empresaId } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const ctx = useContexto(empresaId, competencia);
  const { prefs, definir } = usePreferencias();

  const [busca, setBusca] = useState("");
  const [somentePendentes, setSomentePendentes] = useState(false);
  const comContexto = prefs.modo === "guiado";
  const filtro = { busca, somentePendentes };

  const todas = useMemo(() => visoesDeTodas(ctx), [ctx]);
  const visao = useMemo(() => acharVisao(idSecao, ctx), [idSecao, ctx]);
  const grupo = visao ? acharGrupo(visao, grupoParam) : undefined;

  const totalTelas = todas.reduce((n, v) => n + v.totalTelas, 0);
  const totalPendentes = todas.reduce((n, v) => n + v.comPendencia, 0);

  // ------------------------------------------------------------- rotas inválidas
  if (idSecao && !visao) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-24 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-brand-orange" />
        <h1 className="font-display text-3xl">Seção não encontrada</h1>
        <p className="text-sm text-muted-foreground">
          A visão geral existe para cada seção do menu. Escolha uma delas no índice completo.
        </p>
        <Button asChild variant="outline" className="rounded-full">
          <Link to={rotaVisao()}>Ver todas as telas</Link>
        </Button>
      </div>
    );
  }

  if (visao && grupoParam && !grupo) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-24 text-center">
        <h1 className="font-display text-3xl">Grupo não encontrado em {visao.secao.titulo}</h1>
        <p className="text-sm text-muted-foreground">
          Esta seção tem {visao.grupos.length} grupos de telas: {visao.grupos.map((g) => g.titulo ?? "sem título").join(", ")}.
        </p>
        <Button asChild variant="outline" className="rounded-full">
          <Link to={rotaVisao(visao.secao.id)}>Ver a seção inteira</Link>
        </Button>
      </div>
    );
  }

  // -------------------------------------------------------------- dados da página
  const visaoExibida: VisaoSecao | undefined =
    visao && grupo
      ? { ...visao, grupos: [grupo] }
      : visao;

  const idx = visao ? todas.findIndex((v) => v.secao.id === visao.secao.id) : -1;
  const anterior = idx > 0 ? todas[idx - 1] : undefined;
  const proxima = idx >= 0 && idx < todas.length - 1 ? todas[idx + 1] : undefined;

  const titulo = grupo?.titulo ?? visao?.secao.titulo ?? "Catálogo de telas";
  const [primeiraPalavra, ...resto] = titulo.split(" ");
  const acentoAtual = acentos[visao?.secao.accent ?? "orange"];

  return (
    <div className="space-y-7 pb-16">
      <PageHeader
        trilhaAutomatica={false}
        trail={[
          { label: "Catálogo de telas", to: rotaVisao() },
          ...(visao ? [{ label: visao.secao.titulo, to: rotaVisao(visao.secao.id) }] : []),
          ...(grupo ? [{ label: grupo.titulo ?? grupo.chave }] : []),
        ]}
        icon={visao?.secao.icon ?? ListTree}
        iconAccent={visao?.secao.accent ?? "orange"}
        eyebrow={
          grupo
            ? `${visao!.secao.codigo} · ${visao!.secao.titulo} · grupo`
            : visao
              ? `${visao.secao.codigo} · seção do fluxo`
              : "catálogo · todas as seções"
        }
        title={primeiraPalavra}
        titleAccent={resto.join(" ") || undefined}
        description={
          grupo
            ? `Todas as telas de "${grupo.titulo ?? grupo.chave}" dentro de ${visao!.secao.titulo}.`
            : visao
              ? visao.secao.resumo
              : `Todas as ${totalTelas} telas do Use Contábil, organizadas pelas seções do menu. Abra qualquer uma pelo card, busque pelo que precisa ou veja só o que ainda tem cadastro pendente.`
        }
        badges={
          <>
            <Badge variant="outline" className="rounded-full text-[11px]">
              {grupo
                ? `${grupo.cards.length} telas neste grupo`
                : visao
                  ? `${visao.totalTelas} telas · ${visao.grupos.length} grupos`
                  : `${todas.length} seções · ${totalTelas} telas`}
            </Badge>
            {(visao?.comPendencia ?? 0) > 0 && (
              <Badge variant="outline" className="rounded-full border-warn/45 text-[11px] text-warn">
                {visao!.comPendencia} com pendência de cadastro
              </Badge>
            )}
            {!visao && totalPendentes > 0 && (
              <Badge variant="outline" className="rounded-full border-warn/45 text-[11px] text-warn">
                {totalPendentes} telas com pendência
              </Badge>
            )}
          </>
        }
        actions={
          <>
            <label
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs"
              title="Mostra nos cards o que a tela faz e o que falta cadastrar. Desligue para uma lista enxuta."
            >
              <Info className={cn("h-3.5 w-3.5", comContexto ? acentoAtual.text : "text-muted-foreground")} />
              <span className="font-medium">Contexto das telas</span>
              <Switch
                checked={comContexto}
                onCheckedChange={(v) => definir({ modo: v ? "guiado" : "direto" })}
                aria-label="Mostrar contexto das telas"
              />
            </label>
            <Button asChild variant="outline" size="sm" className="rounded-lg">
              <Link to="/mapa-sistema" title="O que depende do quê e o que já está pronto">
                <MapIcon className="mr-1.5 h-4 w-4" />
                Mapa do sistema
              </Link>
            </Button>
          </>
        }
      />

      {/* Busca e filtro: valem para o nível em que a pessoa estiver. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por tela, pelo que ela faz ou pelo que alimenta…"
            className="h-10 rounded-lg pl-9 text-sm"
            aria-label="Buscar telas neste catálogo"
          />
        </div>
        <Button
          size="sm"
          variant={somentePendentes ? "default" : "outline"}
          className="h-10 rounded-lg"
          onClick={() => setSomentePendentes((v) => !v)}
          title="Mostra só as telas em que falta um cadastro obrigatório"
        >
          <CheckSquare className="mr-1.5 h-4 w-4" />
          Só com pendência
        </Button>
        {(busca || somentePendentes) && (
          <Button
            size="sm"
            variant="ghost"
            className="h-10 rounded-lg text-muted-foreground"
            onClick={() => {
              setBusca("");
              setSomentePendentes(false);
            }}
          >
            Limpar
          </Button>
        )}
      </div>

      {!comContexto && (
        <p className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0" />
          Modo experiente: os cards mostram só o nome e a linha curta.
          <button
            type="button"
            className="font-medium text-foreground underline-offset-2 hover:underline"
            onClick={() => definir({ modo: "guiado" })}
          >
            Ligar o contexto de novo
          </button>
        </p>
      )}

      {visaoExibida ? (
        <BlocoSecao
          visao={visaoExibida}
          comContexto={comContexto}
          filtro={filtro}
          mostrarOrigem={false}
          mostrarCabecalho={!grupo}
        />
      ) : (
        <div className="space-y-12">
          {todas
            .filter((v) => contar(v, filtro) > 0)
            .map((v) => (
              <BlocoSecao
                key={v.secao.id}
                visao={v}
                comContexto={comContexto}
                filtro={filtro}
                mostrarOrigem
              />
            ))}
          {todas.every((v) => contar(v, filtro) === 0) && (
            <Card className="rounded-xl border-dashed border-border/70">
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                Nenhuma tela do sistema combina com {busca ? `“${busca}”` : "este filtro"}.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Andar de seção em seção sem depender do menu lateral. */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-5 text-sm">
        {anterior ? (
          <Button asChild variant="outline" size="sm" className="rounded-lg">
            <Link to={rotaVisao(anterior.secao.id)}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              {anterior.secao.codigo} · {anterior.secao.titulo}
            </Link>
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">
            {visao ? "Esta é a primeira seção do fluxo" : "Catálogo completo do sistema"}
          </span>
        )}
        {proxima ? (
          <Button asChild size="sm" className="rounded-lg bg-brand-orange text-primary-foreground hover:bg-brand-orange/90">
            <Link to={rotaVisao(proxima.secao.id)}>
              {proxima.secao.codigo} · {proxima.secao.titulo}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm" className="rounded-lg bg-brand-orange text-primary-foreground hover:bg-brand-orange/90">
            <Link to="/dashboard">
              Voltar ao painel
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
