import { read, write } from "./storeUtils";
import { useEmpresaAtual, getEmpresa } from "./empresaAtual";
import { motorFederal, motorEstadualMunicipal, MotorBase } from "./guiasMotores";
import { hojeISO, diffDias, round, moedaBR, brl } from "./utils";
import { getConfig } from "./apuracaoStore";
import { loadFiliais } from "./filiaisStore";
import { useState, useEffect, useMemo } from "react";

const KEY = "usecontabil_guias_v1";
export const GUIAS_EVENT = "usecontabil_guias_change";

export type StatusGuia = "Em aberto" | "Emitida" | "Paga" | "Parcial" | "Vencida" | "Compensada" | "Cancelada";
export type GrupoSlug = "darf" | "das" | "dare" | "dam" | "gnre" | "calendario" | "estaduais" | "parcelamentos";

export type PagamentoGuia = {
  id: string;
  data: string;
  valor: number;
  contaId: string;
  conciliado?: boolean;
  meio?: string;
  banco?: string;
  autenticacao?: string;
  origem: string;
};

export type LogGuia = {
  id: string;
  em: string;
  usuario: string;
  acao: string;
  detalhe?: string;
};

export type Guia = {
  id: string;
  empresaId: string;
  empresa: string;
  filial: string;
  competencia: string;
  tributo: string;
  codigoReceita: string;
  orgao: string;
  uf?: string;
  numero: string;
  emissao: string;
  vencimento: string;
  valorOriginal: number;
  multa: number;
  juros: number;
  atualizacao: number;
  valorFinal: number;
  pago: number;
  saldo: number;
  responsavel: string;
  status: StatusGuia;
  origem: string;
  origemMotor?: string;
  barras: string;
  linhaDigitavel: string;
  pix: string;
  diasAtraso: number;
  conciliada: boolean;
  pagamentos: PagamentoGuia[];
  log: LogGuia[];
  memoria: { label: string; valor: string; campo?: string; origem?: string; documento?: string; regra?: string; legislacao?: string }[];
  grupo?: string;
  tipo?: string;
  emitida: boolean;
};

type GuiaOverride = {
  emitida?: boolean;
  emitidaEm?: string;
  paga?: boolean;
  responsavel?: string;
  pagamentos?: PagamentoGuia[];
  log?: LogGuia[];
  status?: StatusGuia;
};

type GuiasDB = {
  overrides: Record<string, GuiaOverride>;
};

function loadDB(): GuiasDB {
  return read<GuiasDB>(KEY, { overrides: {} });
}

function saveDB(db: GuiasDB) {
  write(KEY, db);
  window.dispatchEvent(new CustomEvent(GUIAS_EVENT));
}

export function dataBR(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function diasEntre(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

/** Vencimento no dia informado do mês seguinte à competência, com antecipação. */
export function vencimentoDe(competencia: string, dia: number, antecipa = true) {
  const [y, m] = competencia.split("-").map(Number);
  const base = new Date(Date.UTC(y, m, Math.min(dia, 28)));
  if (antecipa) {
    const dow = base.getUTCDay();
    if (dow === 6) base.setUTCDate(base.getUTCDate() - 1);
    if (dow === 0) base.setUTCDate(base.getUTCDate() - 2);
  }
  return base.toISOString().slice(0, 10);
}

/* ========================== motor financeiro ============================= */

export type Encargos = {
  diasAtraso: number;
  multa: number;
  juros: number;
  atualizacao: number;
  total: number;
  memoria: { label: string; valor: string }[];
};

export function calcularEncargos(valor: number, vencimento: string, ref = hojeISO()): Encargos {
  const dias = Math.max(0, diffDias(ref, vencimento));
  if (dias <= 0) return { diasAtraso: 0, multa: 0, juros: 0, atualizacao: 0, total: valor, memoria: [] };

  const multaPct = Math.min(dias * 0.0033, 0.2);
  const multa = round(valor * multaPct);
  const meses = Math.ceil(dias / 30);
  const juros = round(valor * (meses * 0.01));
  const total = round(valor + multa + juros);

  return {
    diasAtraso: dias,
    multa,
    juros,
    atualizacao: 0,
    total,
    memoria: [
      { label: "Multa de mora", valor: `${(multaPct * 100).toFixed(2)}% (${moedaBR(multa)})` },
      { label: "Juros de mora (SELIC)", valor: `${meses}% (${moedaBR(juros)})` },
    ],
  };
}

/* ========================== CRUD ========================================= */

function statusDe(g: Omit<Guia, "status">, override: GuiaOverride): StatusGuia {
  if (override.status) return override.status;
  if (g.pago >= g.valorFinal - 0.009) return "Paga";
  if (g.pago > 0) return "Parcial";
  if (g.diasAtraso > 0) return "Vencida";
  return override.emitida ? "Emitida" : "Em aberto";
}

export function listarGuias(empresaId?: string | null, competencia?: string | string[]): Guia[] {
  if (!empresaId || !competencia) return [];
  const comps = Array.isArray(competencia) ? competencia : [competencia];
  const db = loadDB();
  const cfg = getConfig();
  const emp = getEmpresa(empresaId);
  const filiais = loadFiliais().filter((f) => f.empresaId === empresaId);
  const list: Guia[] = [];

  comps.forEach(c => {
    const bases = [...motorFederal(empresaId, c), ...motorEstadualMunicipal(empresaId, c)];
    const gs = bases
      .filter((b) => b.valor > 0.009)
      .map((b, i) => {
        const id = `${empresaId}::${c}::${b.codigo}::${i}`;
        const ov = db.overrides[id] ?? {};
        const vencimento = vencimentoDe(c, b.dia, cfg.antecipaFimDeSemana);
        const pagamentos = ov.pagamentos ?? [];
        const pago = round(pagamentos.reduce((s, p) => s + p.valor, 0));
        const refPagamento = pagamentos[0]?.data;
        const enc = calcularEncargos(b.valor, vencimento, refPagamento ?? hojeISO());
        const seed = id.split("").map(c => c.charCodeAt(0)).join("").slice(0, 48);
        const parcial: Omit<Guia, "status"> = {
          id,
          grupo: b.grupo,
          tipo: b.tipo,
          empresaId,
          empresa: emp?.razao ?? "Empresa",
          filial: filiais[i % Math.max(1, filiais.length)]?.nome ?? "Matriz",
          competencia: c,
          tributo: b.tributo,
          codigoReceita: b.codigo,
          orgao: b.orgao,
          uf: b.uf,
          numero: `${seed.slice(0, 5)}.${seed.slice(5, 10)}.${seed.slice(10, 15)}`,
          emissao: ov.emitidaEm?.slice(0, 10) ?? hojeISO(),
          vencimento,
          valorOriginal: b.valor,
          multa: enc.multa,
          juros: enc.juros,
          atualizacao: enc.atualizacao,
          valorFinal: enc.total,
          pago,
          saldo: round(Math.max(0, enc.total - pago)),
          responsavel: ov.responsavel ?? "Equipe fiscal",
          origem: b.origem,
          origemMotor: b.motor,
          barras: `${seed.slice(0, 11)} ${seed.slice(11, 22)} ${seed.slice(22, 33)} ${seed.slice(33, 44)}`,
          linhaDigitavel: `${seed.slice(0, 5)}.${seed.slice(5, 10)} ${seed.slice(10, 15)}.${seed.slice(15, 21)} ${seed.slice(21, 26)}.${seed.slice(26, 32)} ${seed.slice(32, 33)} ${seed.slice(33, 47)}`,
          pix: `00020126580014BR.GOV.BCB.PIX0136${seed.slice(0, 32)}5204000053039865802BR`,
          diasAtraso: pago > 0 ? 0 : enc.diasAtraso,
          emitida: !!ov.emitida,
          conciliada: pagamentos.length > 0 && pagamentos.every((p) => p.conciliado),
          pagamentos,
          log: ov.log ?? [],
          memoria: [...b.memoria, ...enc.memoria],
        };
        return { ...parcial, status: statusDe(parcial, ov) };
      });
    list.push(...gs);
  });
  return list.sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

export function emitirGuia(g: Guia, responsavel = "Sistema") {
  const db = loadDB();
  const ov = db.overrides[g.id] ?? {};
  ov.emitida = true;
  ov.emitidaEm = new Date().toISOString();
  ov.responsavel = responsavel;
  ov.log = [{ id: `log-${Date.now()}`, em: new Date().toISOString(), usuario: responsavel, acao: "Guia emitida para pagamento", detalhe: "Código de barras e PIX gerados" }, ...(ov.log ?? [])];
  db.overrides[g.id] = ov;
  saveDB(db);
}

export function reemitirGuia(g: Guia, obs?: string) {
  emitirGuia(g, "Sistema");
}

export function registrarPagamento(g: Guia, p: { data: string; valor: number; meio: string; banco: string }) {
  const db = loadDB();
  const ov = db.overrides[g.id] ?? {};
  const pags = ov.pagamentos ?? [];
  pags.push({
    id: `pg-${Date.now()}`,
    data: p.data,
    valor: p.valor,
    contaId: "manual",
    meio: p.meio,
    banco: p.banco,
    autenticacao: Math.random().toString(36).slice(2, 10).toUpperCase(),
    origem: "Manual"
  });
  ov.pagamentos = pags;
  ov.log = [{ id: `log-${Date.now()}`, em: new Date().toISOString(), usuario: "Sistema", acao: "Pagamento registrado", detalhe: `Valor ${brl(p.valor)} via ${p.meio}` }, ...(ov.log ?? [])];
  db.overrides[g.id] = ov;
  saveDB(db);
}

export function baixarGuia(id: string, data: string, valor: number, contaId: string) {
  registrarPagamento({ id } as Guia, { data, valor, meio: "Transferência", banco: contaId });
}

export function estornarPagamento(g: Guia, pagId: string) {
  const db = loadDB();
  const ov = db.overrides[g.id];
  if (!ov?.pagamentos) return;
  const p = ov.pagamentos.find(x => x.id === pagId);
  ov.pagamentos = ov.pagamentos.filter(x => x.id !== pagId);
  ov.log = [{ id: `log-${Date.now()}`, em: new Date().toISOString(), usuario: "Sistema", acao: "Estorno de pagamento", detalhe: `Valor ${brl(p?.valor || 0)} estornado` }, ...(ov.log ?? [])];
  db.overrides[g.id] = ov;
  saveDB(db);
}

export function cancelarGuia(g: Guia, motivo: string) {
  const db = loadDB();
  const ov = db.overrides[g.id] ?? {};
  ov.status = "Cancelada";
  ov.log = [{ id: `log-${Date.now()}`, em: new Date().toISOString(), usuario: "Sistema", acao: "Guia cancelada", detalhe: motivo }, ...(ov.log ?? [])];
  db.overrides[g.id] = ov;
  saveDB(db);
}

export function compensarGuia(g: Guia, motivo: string) {
  const db = loadDB();
  const ov = db.overrides[g.id] ?? {};
  ov.status = "Compensada";
  ov.log = [{ id: `log-${Date.now()}`, em: new Date().toISOString(), usuario: "Sistema", acao: "Guia compensada", detalhe: motivo }, ...(ov.log ?? [])];
  db.overrides[g.id] = ov;
  saveDB(db);
}

export function conciliarPagamento(g: Guia, pagId: string) {
  const db = loadDB();
  const ov = db.overrides[g.id];
  if (!ov?.pagamentos) return;
  ov.pagamentos = ov.pagamentos.map(p => p.id === pagId ? { ...p, conciliado: true } : p);
  db.overrides[g.id] = ov;
  saveDB(db);
}

export function definirResponsavel(g: Guia, resp: string) {
  const db = loadDB();
  const ov = db.overrides[g.id] ?? {};
  ov.responsavel = resp;
  db.overrides[g.id] = ov;
  saveDB(db);
}

/* ========================== utilitários ================================== */

export function resumoGuias(lista: Guia[]) {
  const total = round(lista.reduce((s, g) => s + g.valorFinal, 0));
  const pago = round(lista.reduce((s, g) => s + g.pago, 0));
  const conciliadas = round(lista.filter(g => g.conciliada).reduce((s, g) => s + g.pago, 0));
  return {
    total,
    pago,
    conciliadas,
    aRecolher: round(total - pago),
    aberto: round(lista.filter(g => g.status !== "Paga" && g.status !== "Compensada").reduce((s, g) => s + g.saldo, 0)),
    vencido: round(lista.filter(g => g.status === "Vencida").reduce((s, g) => s + g.saldo, 0)),
    qtd: lista.length,
    vencidas: lista.filter(g => g.status === "Vencida").length,
    abertas: lista.filter(g => g.status !== "Paga" && g.status !== "Compensada").length,
    emitidas: lista.filter(g => g.emitida).length,
    pagas: lista.filter(g => g.status === "Paga").length,
    proximas: lista.filter(g => g.status === "Em aberto").length,
    multa: round(lista.reduce((s, g) => s + g.multa, 0)),
    juros: round(lista.reduce((s, g) => s + g.juros, 0)),
    valorTotal: total,
  };
}


export function resumoParcelamentos(empresaId?: string | null) {
  return {
    total: 0,
    aberto: 0,
    vencido: 0,
    vencidas: 0,
    pagas: 0,
    futuras: 0,
    saldoDevedor: 0,
    proximo: hojeISO(),
    ativos: 0,
    encerrados: 0,
    saldo: 0,
    juros: 0,
    jurosAcum: 0,
    parcelas: [],
  };
}

export const grupoDe = (slug: GrupoSlug) => ({ titulo: slug.toUpperCase(), descricao: "" });
export const pendenciasGuias = (empresaId: string | null, competencia: string | string[]) => avisos(empresaId, competencia);

export function avisos(empresaId: string | null, competencia: string | string[]) {
  const guias = listarGuias(empresaId, competencia);
  const r = resumoGuias(guias);
  const itens: string[] = [];
  if (r.vencidas) itens.push(`${r.vencidas} guia(s) vencida(s)`);
  if (r.abertas) itens.push(`${r.abertas} guia(s) em aberto`);
  return itens;
}

export const alertas = (empresaId?: string | null, competencia?: string | string[]) => {
  return [];
};

export const kpisDe = (guias: Guia[], empresaId?: string | null, competencia?: string | string[]) => {
  const r = resumoGuias(guias);
  return [
    { label: "Total a recolher", valor: brl(r.total) },
    { label: "Total pago", valor: brl(r.pago) },
    { label: "Saldo em aberto", valor: brl(r.aberto), destaque: r.aberto > 0 },
  ];
};

export const validarGrupo = (guias: Guia[], empresaId?: string | null) => [];
export const etapaDoGrupo = (guias: Guia[]) => 1;
export const FLUXO = ["Apuração", "Conferência", "Emissão", "Pagamento"];
export const calendario = (empresaId?: string | null, competencia?: string | string[]): EventoCalendario[] => [];
export const listarCompensacoes = (empresaId?: string | null, competencia?: string | string[]) => [];
export const listarParcelamentos = (empresaId?: string | null) => [];
export const detalharParcelamento = (p: any) => resumoParcelamentos();
export const conciliarRetornoBancario = (guias: Guia[]) => 0;
export const auditoriaDoGrupo = (guias: Guia[]) => [];
export const GRUPOS = [
  { slug: "darf" as GrupoSlug, label: "Federal (DARF)", submodulos: ["PIS", "COFINS", "IRPJ", "CSLL", "IPI", "Simples Nacional", "INSS Patronal", "IRRF Folha"] },
  { slug: "estaduais" as GrupoSlug, label: "Estadual", submodulos: ["ICMS Próprio", "ICMS ST", "DIFAL", "Taxas de Fiscalização", "IPVA", "ITCMD"] },
  { slug: "parcelamentos" as GrupoSlug, label: "Parcelamentos", submodulos: ["PERT", "PRT", "REFIS", "Transação Tributária", "Parcelamentos Ordinários"] },
  { slug: "calendario" as GrupoSlug, label: "Calendário Fiscal", submodulos: ["SPED Fiscal", "EFD Contribuições", "DCTF", "REINF", "GIA", "Destda"] },
];


export const economiaCompensacoes = (empresaId: string | null) => 0;
export const renegociar = (id: string | any, novas?: number) => {};
export const salvarParcelamento = (p: any, msg?: string) => {};

export const EventoCalendario = "calendario_change";
export type EventoCalendario = { id: string; data: string; label: string; prioridade: string; titulo: string; valor: string; dias: number; status: string; detalhe?: string; responsavel?: string };




export function useGuias(empresaId?: string | null, competencia?: string | string[]) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const sync = () => setTick(t => t + 1);
    window.addEventListener(GUIAS_EVENT, sync);
    return () => window.removeEventListener(GUIAS_EVENT, sync);
  }, []);
  return useMemo(() => listarGuias(empresaId, competencia), [empresaId, competencia, tick]);
}

export { brl, hojeISO };
export { regimeDaEmpresa, rs } from "./apuracaoStore";
export type Parcelamento = any;

