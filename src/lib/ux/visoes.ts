// ============================================================================
// Visões de catálogo — "uma tela que lista todas as telas do módulo".
//
// O menu por processo mostra as telas uma a uma na barra lateral, mas faltava a
// vista de conjunto: a página que reúne, num só lugar, todas as telas de uma
// seção. Esta camada reconstrói essa visão a partir do MESMO modelo de
// navegação (navModelo.ts), enriquecendo cada item com a ficha de orientação
// (telas.ts) e com o estado real dos requisitos (requisitos.ts).
//
// Camada pura: recebe o retrato do sistema e devolve dados prontos para a tela.
// Não grava nada e não cria rota de negócio — é só leitura.
// ============================================================================
import type { LucideIcon } from "lucide-react";
import { SECOES, type ItemNav, type SecaoNav } from "./navModelo";
import { buscarTela, TELAS, type LinkTela, type TelaDef } from "./telas";
import { avaliarVarios, separarPendencias, type EstadoRequisito } from "./requisitos";
import type { Contexto } from "./contexto";

/** Prefixo das rotas de visão geral. */
export const PREFIXO_VISAO = "/visao-geral";

/** `/visao-geral` sem seção = o catálogo inteiro. */
export const ID_TODAS = "todas";

/** Uma tela do catálogo, com tudo o que o card precisa mostrar. */
export type CardTela = {
  rota: string;
  titulo: string;
  /** Descrição curta do menu — é a linha que aparece mesmo sem contexto. */
  desc?: string;
  icon: LucideIcon;
  /** Subgrupo do menu a que a tela pertence nesta seção. */
  grupo: string | null;
  oQueFaz: string;
  porQue: string;
  vemDe: LinkTela[];
  alimenta: LinkTela[];
  proximo?: LinkTela;
  /** Cadastros ainda em aberto (críticos + recomendados). */
  pendencias: EstadoRequisito[];
  /** Só os que impedem o uso da tela. */
  criticos: EstadoRequisito[];
  /** `true` quando não falta nada crítico. */
  pronta: boolean;
  /** `true` quando a tela tem ficha escrita (não o texto derivado do menu). */
  temFicha: boolean;
};

export type GrupoVisao = {
  /** Chave usada em `/visao-geral/:secao/:grupo`. */
  chave: string;
  titulo: string | null;
  cards: CardTela[];
};

export type VisaoSecao = {
  secao: SecaoNav;
  grupos: GrupoVisao[];
  /** Total de telas da seção (uma tela pode aparecer em mais de um grupo). */
  totalTelas: number;
  /** Quantas telas têm pendência crítica de cadastro. */
  comPendencia: number;
};

/** Sem acentos, sem maiúsculas, hífens no lugar de espaços: chave de rota. */
export const slug = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Chave estável de um grupo do menu (o título pode ser nulo ou repetir). */
export function chaveDoGrupo(titulo: string | null, indice: number): string {
  return titulo ? slug(titulo) : `grupo-${indice + 1}`;
}

/** Rota da visão geral; sem `secaoId` devolve o índice completo. */
export function rotaVisao(secaoId?: string | null, chaveGrupo?: string | null): string {
  if (!secaoId) return PREFIXO_VISAO;
  return chaveGrupo ? `${PREFIXO_VISAO}/${secaoId}/${chaveGrupo}` : `${PREFIXO_VISAO}/${secaoId}`;
}

/** Monta o card de uma tela do menu, com contexto e pendências reais. */
export function cartaoDaTela(item: ItemNav, grupo: string | null, c: Contexto): CardTela {
  const ficha: TelaDef | undefined = buscarTela(item.rota);
  const { criticos, recomendados } = separarPendencias(
    avaliarVarios(ficha?.requisitos ?? [], c),
  );
  return {
    rota: item.rota,
    titulo: item.titulo,
    desc: item.desc,
    icon: item.icon,
    grupo,
    oQueFaz: ficha?.oQueFaz ?? item.desc ?? `${item.titulo}: etapa do fluxo do sistema.`,
    porQue: ficha?.porQue ?? "",
    vemDe: ficha?.vemDe ?? [],
    alimenta: ficha?.alimenta ?? [],
    proximo: ficha?.proximos?.[0],
    pendencias: [...criticos, ...recomendados],
    criticos,
    pronta: criticos.length === 0,
    // A identidade difere porque `buscarTela` devolve o objeto de TELAS quando a
    // ficha foi escrita e um objeto novo quando ela foi derivada do menu.
    temFicha: !!ficha && TELAS.some((t) => t === ficha),
  };
}

/** Constrói a visão de uma seção a partir do retrato do sistema. */
export function visaoDaSecao(secao: SecaoNav, c: Contexto): VisaoSecao {
  const grupos: GrupoVisao[] = secao.subgrupos.map((sub, i) => ({
    chave: chaveDoGrupo(sub.titulo, i),
    titulo: sub.titulo,
    cards: sub.itens.map((item) => cartaoDaTela(item, sub.titulo, c)),
  }));
  const todos = grupos.flatMap((g) => g.cards);
  return {
    secao,
    grupos,
    totalTelas: todos.length,
    comPendencia: todos.filter((card) => !card.pronta).length,
  };
}

/** Todas as seções do menu — a vista completa de todos os módulos. */
export function visoesDeTodas(c: Contexto): VisaoSecao[] {
  return SECOES.map((secao) => visaoDaSecao(secao, c));
}

/**
 * Resolve o parâmetro `:secao` da rota. Aceita o id (`escrituracao`), o código
  (`05`) ou o título (`Escrituração`) para a URL sobreviver a renomeações.
 */
export function acharVisao(secaoId: string | undefined, c: Contexto): VisaoSecao | undefined {
  if (!secaoId || secaoId === ID_TODAS) return undefined;
  const secao =
    SECOES.find((s) => s.id === secaoId) ??
    SECOES.find((s) => s.codigo === secaoId) ??
    SECOES.find((s) => slug(s.titulo) === slug(secaoId));
  return secao ? visaoDaSecao(secao, c) : undefined;
}

/** Resolve o parâmetro `:grupo` pela chave ou pelo título. */
export function acharGrupo(visao: VisaoSecao, chave: string | undefined): GrupoVisao | undefined {
  if (!chave) return undefined;
  const alvo = slug(chave);
  return (
    visao.grupos.find((g) => g.chave === alvo) ??
    visao.grupos.find((g) => g.titulo && slug(g.titulo) === alvo)
  );
}

/** Filtro compartilhado entre a página e os testes: texto livre + só pendentes. */
export function filtrarCards(cards: CardTela[], termo: string, somentePendentes: boolean) {
  const t = slug(termo.trim());
  return cards.filter((card) => {
    const indexado = [
      card.titulo,
      card.desc ?? "",
      card.oQueFaz,
      card.grupo ?? "",
      card.alimenta.map((a) => a.titulo).join(" "),
      card.rota,
    ].join(" ");
    return (!t || slug(indexado).includes(t)) && (!somentePendentes || !card.pronta);
  });
}
