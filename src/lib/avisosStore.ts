// ============================================================================
// Administrativo › Controles internos › Avisos e notificações manuais
// ----------------------------------------------------------------------------
// Permite que a controladoria publique notificações manuais no sino do sistema.
//
// Regras:
//  A1  Título e mensagem são obrigatórios.
//  A2  A vigência começa em "início" e termina em "fim" (opcional). Fora da
//      vigência o aviso não aparece no sino, mas continua no cadastro.
//  A3  Aviso pode ser global (todas as empresas) ou de uma empresa específica.
//  A4  Avisos manuais ignoram os filtros de categoria das preferências —
//      são comunicados deliberados da controladoria.
//  A5  Aviso inativo nunca é exibido.
// ============================================================================

import { useCallback, useEffect, useState } from "react";

export const AVISOS_EVENT = "usecontabil:avisos-changed";

const KEY = "usecontabil.adm.avisos.v1";

export type AvisoNivel = "critico" | "atencao" | "info";

export type Aviso = {
  id: string;
  titulo: string;
  mensagem: string;
  nivel: AvisoNivel;
  destino: string;
  empresaId: string | null; // null = todas as empresas
  inicio: string; // yyyy-mm-dd
  fim: string; // yyyy-mm-dd | ""
  ativo: boolean;
  criadoEm: string;
  criadoPor: string;
};

export const NIVEIS: { valor: AvisoNivel; rotulo: string }[] = [
  { valor: "critico", rotulo: "Crítico" },
  { valor: "atencao", rotulo: "Atenção" },
  { valor: "info", rotulo: "Informativo" },
];

export const DESTINOS: { valor: string; rotulo: string }[] = [
  { valor: "/dashboard", rotulo: "Dashboard" },
  { valor: "/fiscal/guias/calendario", rotulo: "Fiscal · Calendário de guias" },
  { valor: "/fiscal/obrigacoes/agenda", rotulo: "Fiscal · Agenda de obrigações" },
  { valor: "/preparativos/servicos/gestao", rotulo: "Preparativos · Gestão do fechamento" },
  { valor: "/administrativo/contratos", rotulo: "Administrativo · Contratos e documentos" },
  { valor: "/administrativo/controles/avisos", rotulo: "Administrativo · Avisos" },
];

export const hojeISO = () => new Date().toISOString().slice(0, 10);

export const dataBR = (iso: string) => {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};

const uid = () => `aviso-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function ler(): Aviso[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const dados = raw ? JSON.parse(raw) : [];
    return Array.isArray(dados) ? (dados as Aviso[]) : [];
  } catch {
    return [];
  }
}

function gravar(dados: Aviso[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(dados));
  window.dispatchEvent(new CustomEvent(AVISOS_EVENT));
}

export function listarAvisos(): Aviso[] {
  return ler().sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

export type AvisoInput = Omit<Aviso, "id" | "criadoEm"> & { id?: string; criadoEm?: string };

export function salvarAviso(entrada: AvisoInput): Aviso {
  const titulo = entrada.titulo.trim();
  const mensagem = entrada.mensagem.trim();
  if (!titulo) throw new Error("Informe o título do aviso.");
  if (!mensagem) throw new Error("Informe a mensagem do aviso.");
  if (!entrada.inicio) throw new Error("Informe a data de início da vigência.");
  if (entrada.fim && entrada.fim < entrada.inicio) {
    throw new Error("O fim da vigência não pode ser anterior ao início.");
  }

  const lista = ler();
  const registro: Aviso = {
    id: entrada.id ?? uid(),
    titulo,
    mensagem,
    nivel: entrada.nivel,
    destino: entrada.destino || "/dashboard",
    empresaId: entrada.empresaId ?? null,
    inicio: entrada.inicio,
    fim: entrada.fim ?? "",
    ativo: entrada.ativo,
    criadoEm: entrada.criadoEm ?? new Date().toISOString(),
    criadoPor: entrada.criadoPor || "Controladoria",
  };

  const idx = lista.findIndex((a) => a.id === registro.id);
  if (idx >= 0) lista[idx] = registro;
  else lista.unshift(registro);
  gravar(lista);
  return registro;
}

export function excluirAviso(id: string) {
  gravar(ler().filter((a) => a.id !== id));
}

export function alternarAviso(id: string) {
  gravar(ler().map((a) => (a.id === id ? { ...a, ativo: !a.ativo } : a)));
}

/** Situação de vigência de um aviso na data informada. */
export function situacaoAviso(a: Aviso, hoje = hojeISO()): "Ativo" | "Programado" | "Encerrado" | "Inativo" {
  if (!a.ativo) return "Inativo";
  if (a.inicio > hoje) return "Programado";
  if (a.fim && a.fim < hoje) return "Encerrado";
  return "Ativo";
}

/** Avisos que devem aparecer no sino para a empresa selecionada. */
export function avisosVigentes(empresaId: string | null, hoje = hojeISO()): Aviso[] {
  return ler().filter(
    (a) =>
      situacaoAviso(a, hoje) === "Ativo" &&
      (a.empresaId === null || a.empresaId === empresaId),
  );
}

/** Hook reativo com a lista completa de avisos. */
export function useAvisos() {
  const [itens, setItens] = useState<Aviso[]>(() => listarAvisos());
  const recarregar = useCallback(() => setItens(listarAvisos()), []);
  useEffect(() => {
    window.addEventListener(AVISOS_EVENT, recarregar);
    return () => window.removeEventListener(AVISOS_EVENT, recarregar);
  }, [recarregar]);
  return { itens, recarregar };
}
