// ============================================================================
// Últimas atividades — derivadas dos próprios dados, sem nenhuma escrita.
//
// Em vez de um log paralelo (que precisaria ser alimentado em dezenas de
// telas), a lista é montada a partir dos registros já existentes: o que foi
// criado ou alterado por último em cada domínio aparece aqui.
// ============================================================================
import { useEffect, useState } from "react";
import { listarParticipantes, listarProdutos } from "@/lib/cadastrosStore";
import { listarContas } from "@/lib/planoContasStore";
import { listarLancamentos } from "@/lib/lancamentosStore";
import { loadDocs, type DocSlug } from "@/lib/fiscalStore";
import { listarGuias } from "@/lib/guiasStore";
import { logAuditoria } from "@/lib/auditoriaStore";
import { usuarioAtual } from "@/lib/usuarioAtual";

export type Atividade = {
  id: string;
  /** ISO da data usada para ordenar (criação/alteração ou data do fato). */
  quando: string;
  tipo: "Lançamento" | "Documento" | "Cadastro" | "Guia" | "Auditoria";
  titulo: string;
  detalhe: string;
  rota: string;
};

const SLUGS: [DocSlug, string][] = [
  ["entradas", "Nota de entrada"],
  ["saidas", "Nota de saída"],
  ["servicos-tomados", "Serviço tomado"],
  ["servicos-prestados", "Serviço prestado"],
  ["transporte", "Conhecimento de transporte"],
  ["cupons", "Cupom fiscal"],
];

/** Monta a lista de atividades mais recentes (mais nova primeiro). */
export function listarAtividades(empresaId: string | null, limite = 8): Atividade[] {
  const itens: Atividade[] = [];

  for (const l of listarLancamentos(empresaId)) {
    itens.push({
      id: `lct-${l.id}`,
      quando: l.atualizadoEm ?? l.criadoEm ?? l.data,
      tipo: "Lançamento",
      titulo: `Lançamento nº ${l.numero}`,
      detalhe: l.historico || l.tipo,
      rota: "/contabil/escrituracao/lancamentos",
    });
  }

  for (const [slug, rotulo] of SLUGS) {
    for (const d of loadDocs(slug)) {
      if (empresaId && d.empresaId !== empresaId) continue;
      itens.push({
        id: `doc-${slug}-${d.id}`,
        quando: (d.criadoEm as string) ?? (d.dataEmissao as string) ?? (d.data as string) ?? "",
        tipo: "Documento",
        titulo: `${rotulo} ${d.numero ?? ""}`.trim(),
        detalhe: String(d.participante ?? d.tipo ?? ""),
        rota: slug === "saidas" ? "/fiscal/documentos/saidas" : "/fiscal/documentos/entradas",
      });
    }
  }

  for (const p of listarParticipantes()) {
    itens.push({
      id: `par-${p.id}`,
      quando: p.atualizadoEm ?? p.criadoEm ?? "",
      tipo: "Cadastro",
      titulo: p.nome,
      detalhe: `${p.tipo} · ${p.documento}`,
      rota: "/preparativos/cadastros/participantes",
    });
  }

  for (const c of listarContas()) {
    itens.push({
      id: `cta-${c.id}`,
      quando: c.atualizadoEm ?? c.criadoEm ?? "",
      tipo: "Cadastro",
      titulo: `Conta ${c.codigo} · ${c.descricao}`,
      detalhe: c.tipo,
      rota: "/contabil/cadastros/plano-contas",
    });
  }

  for (const p of listarProdutos()) {
    itens.push({
      id: `prd-${p.id}`,
      quando: p.atualizadoEm ?? p.criadoEm ?? "",
      tipo: "Cadastro",
      titulo: p.descricao,
      detalhe: p.tipo ?? "",
      rota: "/preparativos/cadastros/produtos-servicos",
    });
  }

  for (const g of listarGuias(empresaId)) {
    itens.push({
      id: `guia-${g.id}`,
      quando: g.emissao ?? "",
      tipo: "Guia",
      titulo: `${g.tributo} · ${g.numero}`,
      detalhe: g.status,
      rota: "/fiscal/guias/darf",
    });
  }

  for (const log of logAuditoria()) {
    itens.push({
      id: `log-${log.id}`,
      quando: log.data,
      tipo: "Auditoria",
      titulo: log.acao,
      detalhe: log.detalhe,
      rota: "/administrativo/controles/auditoria-log",
    });
  }

  return itens
    .filter((a) => Boolean(a.quando))
    .sort((a, b) => String(b.quando).localeCompare(String(a.quando)))
    .slice(0, limite);
}

/** Lista reativa de atividades. */
export function useAtividades(empresaId: string | null, limite = 8): Atividade[] {
  const [itens, setItens] = useState<Atividade[]>(() => listarAtividades(empresaId, limite));
  useEffect(() => {
    const atualizar = () => setItens(listarAtividades(empresaId, limite));
    atualizar();
    window.addEventListener("storage", atualizar);
    window.addEventListener("focus", atualizar);
    // Qualquer mudança de coleção também conta como atividade.
    const eventos = [
      "usecontabil:colecoes-changed",
      "usecontabil:fiscal-changed",
      "usecontabil_guias_change",
      "usecontabil:auditoria-changed",
    ];
    eventos.forEach((e) => window.addEventListener(e, atualizar));
    return () => {
      window.removeEventListener("storage", atualizar);
      window.removeEventListener("focus", atualizar);
      eventos.forEach((e) => window.removeEventListener(e, atualizar));
    };
  }, [empresaId, limite]);
  return itens;
}

/** Nome do usuário atual — usado nas mensagens personalizadas do painel. */
export function nomeDoUsuario() {
  try {
    return usuarioAtual();
  } catch {
    return "";
  }
}
