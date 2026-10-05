/**
 * Armazenamento local da versão simplificada para empresas do Simples Nacional e MEI.
 * Não calcula tributos nem transmite obrigações; registra apenas faturamento informado
 * pelo usuário e lembretes operacionais. Os dados são separados do modo prática.
 */
import { getStorageSuffix } from "@/lib/praticaStore";

const KEY_BASE = "usecontabil.simples-mei.v1";
export const SIMPLES_MEI_EVENT = "usecontabil:simples-mei-changed";

export type TipoFaturamento = "Comércio/indústria" | "Serviços" | "Outro";
export type StatusLembrete = "Pendente" | "Concluída";

export type FaturamentoSimplesMei = {
  id: string;
  empresaId: string;
  data: string;
  competencia: string;
  tipo: TipoFaturamento;
  descricao: string;
  valor: number;
  criadoEm: string;
};

export type LembreteSimplesMei = {
  id: string;
  empresaId: string;
  periodo: string;
  titulo: string;
  vencimento: string;
  observacao: string;
  status: StatusLembrete;
  criadoEm: string;
};

export type NovoFaturamentoSimplesMei = Omit<FaturamentoSimplesMei, "id" | "competencia" | "criadoEm">;
export type NovoLembreteSimplesMei = Omit<LembreteSimplesMei, "id" | "criadoEm" | "status"> & {
  status?: StatusLembrete;
};

type DB = {
  faturamentos: FaturamentoSimplesMei[];
  lembretes: LembreteSimplesMei[];
};

const EMPTY: DB = { faturamentos: [], lembretes: [] };
const storageKey = () => KEY_BASE + getStorageSuffix();

function novoId(prefixo: string) {
  const aleatorio = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  return `${prefixo}-${aleatorio}`;
}

function notificar() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(SIMPLES_MEI_EVENT));
}

function carregar(): DB {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const salvo = JSON.parse(window.localStorage.getItem(storageKey()) ?? "{}") as Partial<DB>;
    return {
      faturamentos: Array.isArray(salvo.faturamentos) ? salvo.faturamentos : [],
      lembretes: Array.isArray(salvo.lembretes) ? salvo.lembretes : [],
    };
  } catch {
    return { ...EMPTY };
  }
}

function persistir(db: DB) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(), JSON.stringify(db));
  notificar();
}

function validarPeriodo(periodo: string) {
  return /^\d{4}(?:-(?:0[1-9]|1[0-2]))?$/.test(periodo);
}

function validarData(data: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const [ano, mes, dia] = data.split("-").map(Number);
  const parsed = new Date(Date.UTC(ano, mes - 1, dia));
  return parsed.getUTCFullYear() === ano && parsed.getUTCMonth() === mes - 1 && parsed.getUTCDate() === dia;
}

export function listarFaturamentosSimplesMei(): FaturamentoSimplesMei[] {
  return carregar().faturamentos;
}

export function salvarFaturamentoSimplesMei(entrada: NovoFaturamentoSimplesMei): FaturamentoSimplesMei {
  const empresaId = entrada.empresaId.trim();
  const descricao = entrada.descricao.trim();
  const valor = Math.round(Number(entrada.valor) * 100) / 100;
  if (!empresaId) throw new Error("Selecione uma empresa.");
  if (!validarData(entrada.data)) throw new Error("Informe uma data válida.");
  if (!descricao) throw new Error("Informe uma descrição para o faturamento.");
  if (!Number.isFinite(valor) || valor <= 0) throw new Error("O valor deve ser maior que zero.");

  const registro: FaturamentoSimplesMei = {
    ...entrada,
    id: novoId("fat"),
    empresaId,
    descricao,
    valor,
    competencia: entrada.data.slice(0, 7),
    criadoEm: new Date().toISOString(),
  };
  const db = carregar();
  db.faturamentos.unshift(registro);
  persistir(db);
  return registro;
}

export function removerFaturamentoSimplesMei(id: string) {
  const db = carregar();
  const filtrados = db.faturamentos.filter((registro) => registro.id !== id);
  if (filtrados.length === db.faturamentos.length) return;
  persistir({ ...db, faturamentos: filtrados });
}

export function listarLembretesSimplesMei(): LembreteSimplesMei[] {
  return carregar().lembretes;
}

function normalizarLembrete(entrada: NovoLembreteSimplesMei): LembreteSimplesMei {
  const empresaId = entrada.empresaId.trim();
  const titulo = entrada.titulo.trim();
  const periodo = entrada.periodo.trim();
  const vencimento = entrada.vencimento.trim();
  if (!empresaId) throw new Error("Selecione uma empresa.");
  if (!validarPeriodo(periodo)) throw new Error("Informe uma competência (AAAA-MM) ou ano (AAAA) válido.");
  if (!titulo) throw new Error("Informe o nome da obrigação ou lembrete.");
  if (vencimento && !validarData(vencimento)) throw new Error("Informe uma data de vencimento válida.");
  return {
    id: novoId("lembrete"),
    empresaId,
    periodo,
    titulo,
    vencimento,
    observacao: entrada.observacao.trim(),
    status: entrada.status ?? "Pendente",
    criadoEm: new Date().toISOString(),
  };
}

/** Cria lembretes em lote, sem duplicar empresa + período + título. */
export function salvarLembretesSimplesMei(entradas: NovoLembreteSimplesMei[]) {
  const db = carregar();
  let adicionados = 0;
  let existentes = 0;
  const novos: LembreteSimplesMei[] = [];

  for (const entrada of entradas) {
    const normalizado = normalizarLembrete(entrada);
    const duplicado = [...db.lembretes, ...novos].some((atual) =>
      atual.empresaId === normalizado.empresaId &&
      atual.periodo === normalizado.periodo &&
      atual.titulo.toLocaleLowerCase("pt-BR") === normalizado.titulo.toLocaleLowerCase("pt-BR"),
    );
    if (duplicado) {
      existentes += 1;
      continue;
    }
    novos.push(normalizado);
    adicionados += 1;
  }

  if (novos.length) persistir({ ...db, lembretes: [...novos, ...db.lembretes] });
  return { adicionados, existentes };
}

export function alternarStatusLembreteSimplesMei(id: string) {
  const db = carregar();
  let alterou = false;
  const lembretes = db.lembretes.map((lembrete) => {
    if (lembrete.id !== id) return lembrete;
    alterou = true;
    const status: StatusLembrete = lembrete.status === "Concluída" ? "Pendente" : "Concluída";
    return { ...lembrete, status };
  });
  if (alterou) persistir({ ...db, lembretes });
}

export function removerLembreteSimplesMei(id: string) {
  const db = carregar();
  const filtrados = db.lembretes.filter((lembrete) => lembrete.id !== id);
  if (filtrados.length === db.lembretes.length) return;
  persistir({ ...db, lembretes: filtrados });
}

/** Hook de leitura reativa, também sincronizado entre abas do mesmo navegador. */
import { useEffect, useState } from "react";

export function useDadosSimplesMei() {
  const [dados, setDados] = useState<DB>(() => carregar());

  useEffect(() => {
    const atualizar = () => setDados(carregar());
    window.addEventListener(SIMPLES_MEI_EVENT, atualizar);
    window.addEventListener("storage", atualizar);
    window.addEventListener("usecontabil:pratica-changed", atualizar);
    atualizar();
    return () => {
      window.removeEventListener(SIMPLES_MEI_EVENT, atualizar);
      window.removeEventListener("storage", atualizar);
      window.removeEventListener("usecontabil:pratica-changed", atualizar);
    };
  }, []);

  return dados;
}
