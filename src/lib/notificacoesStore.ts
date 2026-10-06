/**
 * Notificações do sistema.
 * As notificações são DERIVADAS do estado real das outras telas
 * (guias, obrigações, contratos/certificados e pendências de cadastro)
 * e respeitam as preferências de notificação da conta.
 * O que é persistido localmente é apenas o estado de leitura/arquivamento.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { listarGuias, dataBR, diasEntre, hojeISO, GUIAS_EVENT, brl } from "@/lib/guiasStore";
import { CATALOGO, diasRestantes, getObrEstado, vencimentoBR, OBRIGACOES_EVENT } from "@/lib/obrigacoesStore";
import { agendaConsolidada, CONTRATOS_EVENT } from "@/lib/contratosStore";
import { pendenciasCadastro, getFechamento, GESTAO_EVENT } from "@/lib/gestaoStore";
import { preferencias, type Preferencias } from "@/lib/preferencias";
import { avisosVigentes, AVISOS_EVENT } from "@/lib/avisosStore";

export const NOTIFICACOES_EVENT = "usecontabil:notificacoes-changed";

export type NotifNivel = "critico" | "atencao" | "info";
export type NotifCategoria = "vencimentos" | "fechamento" | "inconsistencias" | "resumo" | "manual";


export type Notificacao = {
  id: string;
  categoria: NotifCategoria;
  nivel: NotifNivel;
  titulo: string;
  detalhe: string;
  quando: string;
  destino: string;
};

export type NotificacaoLida = Notificacao & { lida: boolean };

const KEY = "usecontabil.notificacoes.estado";

type Estado = { lidas: string[]; limpasAte?: string };

function lerEstado(): Estado {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{"lidas":[]}') as Estado;
  } catch {
    return { lidas: [] };
  }
}


function gravarEstado(e: Estado) {
  localStorage.setItem(KEY, JSON.stringify(e));
  window.dispatchEvent(new Event(NOTIFICACOES_EVENT));
}

export function marcarLida(id: string) {
  const e = lerEstado();
  const lidas = new Set(e.lidas ?? []);
  lidas.add(id);
  gravarEstado({ ...e, lidas: [...lidas] });
}

export function marcarTodasLidas(ids: string[]) {
  const e = lerEstado();
  const lidas = new Set([...(e.lidas ?? []), ...ids]);
  gravarEstado({ ...e, lidas: [...lidas] });
}

export function limparLeituras() {
  gravarEstado({ lidas: [] });
}

/** Categorias derivadas do sistema respeitam as preferências. Avisos manuais não. */
const CATEGORIA_ATIVA: Record<Exclude<NotifCategoria, "manual">, keyof Preferencias> = {
  vencimentos: "notifVencimentos",
  fechamento: "notifFechamento",
  inconsistencias: "notifInconsistencias",
  resumo: "notifResumoDiario",
};


/** Gera a lista de notificações a partir do estado atual do sistema. */
export function gerarNotificacoes(empresaId: string | null, competencia: string): Notificacao[] {
  const prefs = preferencias();
  const out: Notificacao[] = [];
  const hoje = hojeISO();

  /* ---- Guias e recolhimentos (vencimentos) ---- */
  const guias = listarGuias(empresaId, competencia).filter((g) => g.status !== "Cancelada");
  for (const g of guias) {
    if (g.status === "Paga" || g.status === "Compensada") continue;
    const dias = diasEntre(hoje, g.vencimento);
    if (g.status === "Vencida" || dias < 0) {
      out.push({
        id: `guia-vencida-${g.id}`,
        categoria: "vencimentos",
        nivel: "critico",
        titulo: `${g.tributo} vencida há ${Math.abs(dias)} dia(s)`,
        detalhe: `${g.orgao} · venc. ${dataBR(g.vencimento)} · saldo ${brl(g.saldo)}`,
        quando: g.vencimento,
        destino: `/fiscal/guias/${g.grupo === "calendario" ? "calendario" : g.grupo}`,
      });
    } else if (dias <= 5) {
      out.push({
        id: `guia-prox-${g.id}`,
        categoria: "vencimentos",
        nivel: dias <= 2 ? "critico" : "atencao",
        titulo: dias === 0 ? `${g.tributo} vence hoje` : `${g.tributo} vence em ${dias} dia(s)`,
        detalhe: `${g.orgao} · venc. ${dataBR(g.vencimento)} · ${brl(g.valorFinal)}`,
        quando: g.vencimento,
        destino: `/fiscal/guias/${g.grupo === "calendario" ? "calendario" : g.grupo}`,
      });
    }
    if (!g.emitida) {
      out.push({
        id: `guia-nao-emitida-${g.id}`,
        categoria: "inconsistencias",
        nivel: "atencao",
        titulo: `Guia de ${g.tributo} ainda não emitida`,
        detalhe: `Competência ${g.competencia} · ${g.orgao}`,
        quando: g.vencimento,
        destino: `/fiscal/guias/${g.grupo === "calendario" ? "calendario" : g.grupo}`,
      });
    }
  }

  /* ---- Obrigações acessórias ---- */
  // Sem empresa não há obrigação a cumprir: antes, uma conta vazia já nascia com "EFD-Contribuições,
  // DCTFWeb, EFD-Reinf… em atraso — Crítico" (estado padrão "Não iniciada" contra prazos vencidos).
  for (const def of empresaId ? CATALOGO : []) {
    const estado = getObrEstado(def.slug, empresaId, competencia);
    if (estado.status === "Transmitida") continue;
    const dias = diasRestantes(def.slug, competencia);
    if (dias < 0) {
      out.push({
        id: `obr-atraso-${def.slug}-${competencia}`,
        categoria: "vencimentos",
        nivel: "critico",
        titulo: `${def.sigla} em atraso`,
        detalhe: `Prazo ${vencimentoBR(def.slug, competencia)} · situação: ${estado.status}`,
        quando: vencimentoBR(def.slug, competencia),
        destino: `/fiscal/obrigacoes/${def.slug}`,
      });
    } else if (dias <= 7) {
      out.push({
        id: `obr-prazo-${def.slug}-${competencia}`,
        categoria: "vencimentos",
        nivel: dias <= 3 ? "critico" : "atencao",
        titulo: `${def.sigla} vence em ${dias} dia(s)`,
        detalhe: `${def.orgao} · prazo ${vencimentoBR(def.slug, competencia)}`,
        quando: vencimentoBR(def.slug, competencia),
        destino: `/fiscal/obrigacoes/${def.slug}`,
      });
    }
  }

  /* ---- Contratos, certificados e agenda ---- */
  for (const ev of agendaConsolidada(empresaId ?? undefined)) {
    if (ev.concluido) continue;
    const dias = diasEntre(hoje, ev.data);
    if (dias > 15 || dias < -60) continue;
    out.push({
      id: `agenda-${ev.id}`,
      categoria: ev.origem === "Certificado" ? "inconsistencias" : "vencimentos",
      nivel: dias < 0 ? "critico" : dias <= 5 ? "atencao" : "info",
      titulo: ev.titulo,
      detalhe: `${ev.origem} · ${dataBR(ev.data)} · ${ev.responsavel}`,
      quando: ev.data,
      destino: "/administrativo/contratos",
    });
  }

  /* ---- Fechamento do período ---- */
  const fechamento = empresaId ? getFechamento(empresaId, competencia) : undefined;
  if (empresaId && !fechamento) {
    const pendentes = pendenciasCadastro(empresaId).filter((p) => !p.resolvida);
    const criticas = pendentes.filter((p) => p.critica);
    if (criticas.length) {
      out.push({
        id: `fechamento-criticas-${empresaId}-${competencia}`,
        categoria: "fechamento",
        nivel: "critico",
        titulo: `${criticas.length} pendência(s) crítica(s) bloqueiam o fechamento`,
        detalhe: criticas
          .slice(0, 3)
          .map((p) => p.titulo)
          .join(" · "),
        quando: hoje,
        destino: "/preparativos/servicos/gestao",
      });
    } else if (pendentes.length) {
      out.push({
        id: `fechamento-pendencias-${empresaId}-${competencia}`,
        categoria: "fechamento",
        nivel: "atencao",
        titulo: `${pendentes.length} pendência(s) de cadastro em aberto`,
        detalhe: "Revise os cadastros antes de encerrar a competência.",
        quando: hoje,
        destino: "/preparativos/servicos/gestao",
      });
    } else {
      out.push({
        id: `fechamento-pronto-${empresaId}-${competencia}`,
        categoria: "fechamento",
        nivel: "info",
        titulo: "Competência pronta para encerramento",
        detalhe: "Todas as pendências de cadastro foram resolvidas.",
        quando: hoje,
        destino: "/preparativos/servicos/encerramentos",
      });
    }
  }

  /* ---- Resumo diário ---- */
  if (prefs.notifResumoDiario) {
    const vencidas = guias.filter((g) => g.status === "Vencida").length;
    const aberto = guias
      .filter((g) => g.status !== "Paga" && g.status !== "Compensada")
      .reduce((s, g) => s + g.saldo, 0);
    out.push({
      id: `resumo-${hoje}-${empresaId ?? "sem-empresa"}-${competencia}`,
      categoria: "resumo",
      nivel: "info",
      titulo: "Resumo diário",
      detalhe: `${guias.length} guia(s) na competência · ${vencidas} vencida(s) · saldo em aberto ${brl(aberto)}`,
      quando: hoje,
      destino: "/dashboard",
    });
  }

  /* ---- Avisos manuais publicados pela controladoria ---- */
  for (const a of avisosVigentes(empresaId, hoje)) {
    out.push({
      id: `aviso-${a.id}`,
      categoria: "manual",
      nivel: a.nivel,
      titulo: a.titulo,
      detalhe: a.mensagem,
      quando: a.inicio,
      destino: a.destino,
    });
  }

  const ordem: Record<NotifNivel, number> = { critico: 0, atencao: 1, info: 2 };
  return out
    .filter((n) => n.categoria === "manual" || prefs[CATEGORIA_ATIVA[n.categoria]])
    .sort((a, b) => ordem[a.nivel] - ordem[b.nivel] || a.quando.localeCompare(b.quando));
}


/** Hook reativo com as notificações e o estado de leitura. */
export function useNotificacoes(empresaId: string | null, competencia: string) {
  const [tick, setTick] = useState(0);
  const recarregar = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const eventos = [
      GUIAS_EVENT,
      OBRIGACOES_EVENT,
      CONTRATOS_EVENT,
      GESTAO_EVENT,
      NOTIFICACOES_EVENT,
      AVISOS_EVENT,
      "usecontabil:preferencias-changed",


    ];
    eventos.forEach((e) => window.addEventListener(e, recarregar));
    return () => eventos.forEach((e) => window.removeEventListener(e, recarregar));
  }, [recarregar]);

  const itens = useMemo<NotificacaoLida[]>(() => {
    const lidas = new Set(lerEstado().lidas ?? []);
    return gerarNotificacoes(empresaId, competencia).map((n) => ({ ...n, lida: lidas.has(n.id) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarrega quando o store avisa (tick)
  }, [empresaId, competencia, tick]);

  const naoLidas = itens.filter((n) => !n.lida).length;

  return {
    itens,
    naoLidas,
    marcarLida: (id: string) => marcarLida(id),
    marcarTodasLidas: () => marcarTodasLidas(itens.map((n) => n.id)),
    limparLeituras,
  };
}
