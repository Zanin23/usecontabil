// ============================================================================
// Motor de orientação — junta rota + retrato do sistema em uma resposta só.
//
// As telas usam este hook para responder, sem duplicar lógica:
//   • o que esta tela faz / por que existe
//   • de onde vêm os dados / para onde vão
//   • o que falta cadastrar antes (e como resolver sem sair navegando)
//   • qual é o próximo passo
// ============================================================================
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { coletarContexto, useContexto, type Contexto } from "./contexto";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { useCompetencia } from "@/lib/competencia";
import { avaliarVarios, separarPendencias, type EstadoRequisito } from "./requisitos";
import { buscarTela, TELA_PADRAO, type LinkTela, type TelaDef } from "./telas";

export type Orientacao = {
  tela: TelaDef;
  /** Avaliação de todos os requisitos declarados pela tela. */
  estados: EstadoRequisito[];
  /** Pendências que impedem o uso (nível crítico). */
  criticos: EstadoRequisito[];
  /** Pendências que só avisam (nível recomendado). */
  recomendados: EstadoRequisito[];
  /** `true` quando existe pendência crítica — a tela não está pronta para uso. */
  bloqueada: boolean;
  vemDe: LinkTela[];
  alimenta: LinkTela[];
  proximos: LinkTela[];
};

/** Calcula a orientação de uma rota. Puro — pode ser usado em testes. */
export function orientar(rota: string, c: Contexto): Orientacao {
  const tela = buscarTela(rota) ?? TELA_PADRAO;
  const estados = avaliarVarios(tela.requisitos ?? [], c);
  const { criticos, recomendados } = separarPendencias(estados);
  return {
    tela,
    estados,
    criticos,
    recomendados,
    bloqueada: criticos.length > 0,
    vemDe: tela.vemDe ?? [],
    alimenta: tela.alimenta ?? [],
    proximos: tela.proximos ?? [],
  };
}

/** Orientação reativa da rota atual (usa empresa e competência do topo). */
export function useOrientacao(rota?: string): Orientacao {
  const location = useLocation();
  const caminho = rota ?? location.pathname;
  const { empresaId } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const c = useContexto(empresaId, competencia);
  return useMemo(() => orientar(caminho, c), [caminho, c]);
}

function empresaIdAtual(): string | null {
  if (typeof window === "undefined") return null;
  const suf = localStorage.getItem("uc:pratica:ativo") === "1" ? ".pratica" : "";
  return localStorage.getItem("usecontabil.empresaAtual.v1" + suf);
}

function competenciaAtual(): string {
  if (typeof window === "undefined") return "2026-07";
  return localStorage.getItem("usecontabil_competencia") || "2026-07";
}

/** Variante sem React: útil para scripts e testes. */
export function orientacaoDaRota(rota: string): Orientacao {
  return orientar(
    rota,
    coletarContexto(empresaIdAtual(), competenciaAtual()),
  );
}
