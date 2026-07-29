// ============================================================================
// Motor de Guias e Recolhimentos — arquitetura modular.
// Cada grupo de guias (federal, estadual/municipal, parcelamentos, calendário)
// possui seu próprio motor de geração e validação, sobre uma camada comum de
// cálculo financeiro (multa, juros SELIC, atualização), pagamentos, baixas,
// conciliação, compensações, auditoria e monitoramento.
// Tudo é interno/visual: nenhuma comunicação real com órgãos arrecadadores.
// Códigos de barras, linha digitável, PIX e protocolos são simulados.
// ============================================================================
import { useEffect, useState } from "react";
import {
  MOTORES, apurar, getEstado as getApEstado, regimeDaEmpresa, rs,
  type MotorSlug,
} from "@/lib/apuracaoStore";
import { linhasDoPeriodo, somar } from "@/lib/escrituracaoStore";
import { moedaBR } from "@/lib/fiscalStore";
import { getEmpresa } from "@/lib/empresasStore";
import { loadFiliais } from "@/lib/filiaisStore";

const KEY = "usecontabil.guias.v1";
export const GUIAS_EVENT = "usecontabil:guias-changed";
const USUARIO = "M. Andrade";

export const brl = (n: number) => `R$ ${moedaBR(n)}`;

/* ================================ tipos ================================= */

export type GrupoSlug = "darf" | "estaduais" | "parcelamentos" | "calendario";

export type GuiaTipo =
  | "DARF" | "DARF Numerado" | "DAS" | "GPS"
  | "GNRE" | "GARE" | "DAE" | "DARE" | "DUA" | "Guia Municipal";

export type GuiaStatus =
  | "Em aberto" | "Emitida" | "Paga" | "Parcial" | "Vencida" | "Compensada" | "Cancelada";

export type Pagamento = {
  id: string;
  em: string;
  data: string;
  valor: number;
  meio: "PIX" | "Débito em conta" | "Internet banking" | "Caixa" | "Compensação" | "CNAB retorno";
  banco: string;
  autenticacao: string;
  conciliado: boolean;
  origem: "Manual" | "Automática";
};

export type GuiaLog = {
  id: string;
  em: string;
  usuario: string;
  acao: string;
  detalhe: string;
};

/** Rastreabilidade de cada valor da guia. */
export type MemoriaValor = {
  campo: string;
  valor: string;
  origem: string;
  documento: string;
  regra: string;
  legislacao: string;
};

export type Guia = {
  id: string;
  grupo: GrupoSlug;
  tipo: GuiaTipo;
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
  status: GuiaStatus;
  responsavel: string;
  origem: string;
  origemMotor?: MotorSlug;
  barras: string;
  linhaDigitavel: string;
  pix: string;
  diasAtraso: number;
  emitida: boolean;
  conciliada: boolean;
  pagamentos: Pagamento[];
  log: GuiaLog[];
  memoria: MemoriaValor[];
};

export type Parcela = {
  numero: number;
  vencimento: string;
  valor: number;
  status: "Paga" | "Em aberto" | "Vencida";
  pagoEm?: string;
};

export type Parcelamento = {
  id: string;
  processo: string;
  tipo: string;
  orgao: string;
  empresaId: string;
  tributos: string;
  adesao: string;
  parcelas: number;
  valorParcela: number;
  entrada: number;
  jurosMes: number;
  situacao: "Ativo" | "Encerrado" | "Rescindido";
  historico: GuiaLog[];
};

export type Compensacao = {
  id: string;
  documento: string;
  tipo: "PER/DCOMP" | "Crédito estadual" | "Crédito municipal";
  origemCredito: string;
  tributoCompensado: string;
  competencia: string;
  valorCredito: number;
  valorUtilizado: number;
  situacao: "Transmitida" | "Em análise" | "Homologada" | "Rascunho";
  transmissao: string;
};

type Override = {
  emitida?: boolean;
  emitidaEm?: string;
  cancelada?: boolean;
  compensada?: boolean;
  responsavel?: string;
  pagamentos?: Pagamento[];
  log?: GuiaLog[];
};

type DB = {
  overrides: Record<string, Override>;
  parcelamentos: Parcelamento[];
  compensacoes: Compensacao[];
  config?: Config;
};

export type Config = {
  multaDiaria: number;
  multaTeto: number;
  jurosMes: number;
  selicMes: number;
  antecipaFimDeSemana: boolean;
  baixaAutomatica: boolean;
  alertaDias: number;
  aprovacaoAcima: number;
  notificar: { sistema: boolean; email: boolean; teams: boolean; slack: boolean; webhook: boolean };
};

export const CONFIG_PADRAO: Config = {
  multaDiaria: 0.0033,
  multaTeto: 0.2,
  jurosMes: 0.01,
  selicMes: 0.0092,
  antecipaFimDeSemana: true,
  baixaAutomatica: true,
  alertaDias: 5,
  aprovacaoAcima: 50000,
  notificar: { sistema: true, email: true, teams: false, slack: false, webhook: false },
};

/* ============================== persistência ============================= */

function notify() {
  window.dispatchEvent(new Event(GUIAS_EVENT));
}

function loadDB(): DB {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<DB>;
    return {
      overrides: raw.overrides ?? {},
      parcelamentos: raw.parcelamentos ?? [],
      compensacoes: raw.compensacoes ?? [],
      config: { ...CONFIG_PADRAO, ...(raw.config ?? {}) },
    };
  } catch {
    return { overrides: {}, parcelamentos: [], compensacoes: [], config: CONFIG_PADRAO };
  }
}

function saveDB(db: DB) {
  localStorage.setItem(KEY, JSON.stringify(db));
  notify();
}

export function novoId(prefixo: string) {
  return `${prefixo}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getConfig(): Config {
  return { ...CONFIG_PADRAO, ...(loadDB().config ?? {}) };
}

export function setConfig(patch: Partial<Config>) {
  const db = loadDB();
  db.config = { ...getConfig(), ...patch };
  saveDB(db);
}

/* ============================== utilidades =============================== */

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function digitos(seed: string, n: number) {
  let out = "";
  let h = hash(seed);
  while (out.length < n) {
    h = Math.imul(h, 48271) % 2147483647;
    out += String(h).padStart(9, "0").slice(0, 9);
  }
  return out.slice(0, n);
}

export function hojeISO() {
  return new Date().toISOString().slice(0, 10);
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
  memoria: MemoriaValor[];
};

/**
 * Multa de mora de 0,33% ao dia limitada a 20%, juros SELIC acumulada
 * mais 1% no mês do pagamento e atualização monetária pró-rata.
 */
export function calcularEncargos(valor: number, vencimento: string, referencia = hojeISO()): Encargos {
  const cfg = getConfig();
  const dias = Math.max(0, diasEntre(vencimento, referencia));
  if (dias === 0 || valor <= 0) {
    return { diasAtraso: 0, multa: 0, juros: 0, atualizacao: 0, total: valor, memoria: [] };
  }
  const pctMulta = Math.min(dias * cfg.multaDiaria, cfg.multaTeto);
  const meses = Math.floor(dias / 30);
  const pctJuros = meses * cfg.selicMes + cfg.jurosMes;
  const multa = round(valor * pctMulta);
  const juros = round(valor * pctJuros);
  const atualizacao = round(valor * 0.0004 * meses);
  return {
    diasAtraso: dias,
    multa,
    juros,
    atualizacao,
    total: round(valor + multa + juros + atualizacao),
    memoria: [
      {
        campo: "Multa de mora",
        valor: brl(multa),
        origem: `${dias} dia(s) de atraso × 0,33% (teto 20%)`,
        documento: "Motor financeiro",
        regra: "multa = valor × min(dias × 0,33%; 20%)",
        legislacao: "Lei 9.430/96, art. 61",
      },
      {
        campo: "Juros de mora",
        valor: brl(juros),
        origem: `${meses} mês(es) de SELIC acumulada + 1%`,
        documento: "Motor financeiro",
        regra: "juros = valor × (Σ SELIC + 1%)",
        legislacao: "Lei 9.430/96, art. 61, §3º",
      },
      {
        campo: "Atualização monetária",
        valor: brl(atualizacao),
        origem: "Índice interno pró-rata",
        documento: "Motor financeiro",
        regra: "atualização = valor × 0,04% por mês",
        legislacao: "Parametrização interna",
      },
    ],
  };
}

const round = (n: number) => Math.round(n * 100) / 100;

/* ========================= motores de geração ============================ */

type Base = {
  tipo: GuiaTipo;
  grupo: GrupoSlug;
  tributo: string;
  codigo: string;
  orgao: string;
  uf?: string;
  valor: number;
  dia: number;
  origem: string;
  motor?: MotorSlug;
  memoria: MemoriaValor[];
};

/** Motor federal: DARF, DAS e GPS derivados das apurações. */
function motorFederal(empresaId: string, competencia: string): Base[] {
  const out: Base[] = [];
  for (const m of MOTORES) {
    const estado = getApEstado(m.slug, empresaId, competencia);
    const ap = apurar(m.slug, empresaId, competencia, estado);
    for (const g of ap.guias) {
      if (g.valor <= 0) continue;
      const municipal = /ISS/i.test(g.nome) || /municipal/i.test(g.nome);
      if (municipal) continue;
      const inss = /INSS|GPS/i.test(g.nome);
      out.push({
        tipo: g.nome.startsWith("DAS") ? "DAS" : inss ? "GPS" : "DARF",
        grupo: "darf",
        tributo: g.nome.replace(/^DARF |^GPS\/DARF /, ""),
        codigo: g.codigo,
        orgao: "Receita Federal do Brasil",
        valor: round(g.valor),
        dia: Number(g.vencimento.slice(0, 2)) || 20,
        origem: `Apuração de ${m.titulo}`,
        motor: m.slug,
        memoria: [
          {
            campo: "Valor original",
            valor: brl(g.valor),
            origem: `Motor de apuração ${m.titulo}`,
            documento: `apuracao/${m.slug}/${competencia}`,
            regra: "Valor apurado a recolher na competência",
            legislacao: m.slug === "simples-nacional" ? "LC 123/2006" : "Legislação federal do tributo",
          },
          ...ap.resumo.slice(0, 4).map((r) => ({
            campo: r.label,
            valor: r.valor,
            origem: `Resumo da apuração ${m.titulo}`,
            documento: `apuracao/${m.slug}`,
            regra: "Composição da base de cálculo",
            legislacao: "Memória de cálculo da apuração",
          })),
        ],
      });
    }
  }
  return out;
}

/** Motor estadual/municipal: GARE, GNRE, DAE e guias de ISS. */
function motorEstadualMunicipal(empresaId: string, competencia: string): Base[] {
  const emp = getEmpresa(empresaId);
  const uf = (emp?.raw?.uf as string) || (emp?.raw?.estado as string) || "SP";
  const linhas = linhasDoPeriodo("apuracao-icms", empresaId, competencia);
  const debito = somar(linhas.filter((l) => (l.tipo ?? "").toLowerCase().includes("débito")), "valor");
  const credito = somar(linhas.filter((l) => (l.tipo ?? "").toLowerCase().includes("crédito")), "valor");
  const saldo = round(Math.max(0, debito - credito));
  const ipi = somar(linhasDoPeriodo("apuracao-ipi", empresaId, competencia), "valor");

  const out: Base[] = [];
  const memIcms: MemoriaValor[] = [
    { campo: "Débitos de ICMS", valor: brl(debito), origem: "Livro de saídas / apuração de ICMS", documento: "escrituracao/apuracao-icms", regra: "Σ débitos escriturados", legislacao: "RICMS estadual" },
    { campo: "Créditos de ICMS", valor: brl(credito), origem: "Livro de entradas / CIAP", documento: "escrituracao/apuracao-icms", regra: "Σ créditos admitidos", legislacao: "LC 87/1996, art. 20" },
    { campo: "Saldo devedor", valor: brl(saldo), origem: "Apuração do período", documento: "escrituracao/apuracao-icms", regra: "débitos − créditos", legislacao: "LC 87/1996, art. 24" },
  ];

  if (saldo > 0) {
    out.push({
      tipo: uf === "SP" ? "GARE" : "DAE", grupo: "estaduais", tributo: "ICMS próprio",
      codigo: "046-2", orgao: `SEFAZ-${uf}`, uf, valor: saldo, dia: 20,
      origem: "Apuração de ICMS", memoria: memIcms,
    });
    const st = round(saldo * 0.14);
    if (st > 0) {
      out.push({
        tipo: "GNRE", grupo: "estaduais", tributo: "ICMS-ST", codigo: "10004-8",
        orgao: `SEFAZ-${uf}`, uf, valor: st, dia: 9, origem: "Substituição tributária apurada",
        memoria: [{ campo: "ICMS-ST", valor: brl(st), origem: "Operações com CFOP de ST", documento: "escrituracao/apuracao-icms", regra: "MVA aplicada sobre as saídas sujeitas a ST", legislacao: "Convênio ICMS 142/2018" }],
      });
    }
    const difal = round(saldo * 0.06);
    if (difal > 0) {
      out.push({
        tipo: "GNRE", grupo: "estaduais", tributo: "DIFAL", codigo: "10010-2",
        orgao: `SEFAZ-${uf}`, uf, valor: difal, dia: 15, origem: "Diferencial de alíquota",
        memoria: [{ campo: "DIFAL", valor: brl(difal), origem: "Operações interestaduais a consumidor final", documento: "escrituracao/apuracao-icms", regra: "(alíquota interna − interestadual) × base", legislacao: "EC 87/2015 e LC 190/2022" }],
      });
    }
    const fcp = round(saldo * 0.02);
    if (fcp > 0) {
      out.push({
        tipo: "DARE", grupo: "estaduais", tributo: "FCP", codigo: "10012-9",
        orgao: `SEFAZ-${uf}`, uf, valor: fcp, dia: 20, origem: "Fundo de combate à pobreza",
        memoria: [{ campo: "FCP", valor: brl(fcp), origem: "Adicional sobre a base de ICMS", documento: "escrituracao/apuracao-icms", regra: "2% sobre a base sujeita ao adicional", legislacao: "Legislação estadual do FCP" }],
      });
    }
  }

  if (ipi > 0) {
    out.push({
      tipo: "DARF", grupo: "darf", tributo: "IPI", codigo: "1097",
      orgao: "Receita Federal do Brasil", valor: round(ipi), dia: 25,
      origem: "Apuração de IPI",
      memoria: [{ campo: "Saldo devedor de IPI", valor: brl(ipi), origem: "Apuração de IPI", documento: "escrituracao/apuracao-ipi", regra: "débitos − créditos de IPI", legislacao: "RIPI/2010" }],
    });
  }

  // guias municipais de ISS vindas do motor de apuração
  const estadoIss = getApEstado("iss", empresaId, competencia);
  const apIss = apurar("iss", empresaId, competencia, estadoIss);
  const municipio = (getEmpresa(empresaId)?.raw?.municipio as string) || "São Paulo";
  for (const g of apIss.guias) {
    if (g.valor <= 0) continue;
    out.push({
      tipo: "Guia Municipal", grupo: "estaduais", tributo: g.nome, codigo: g.codigo,
      orgao: `Prefeitura de ${municipio}`, valor: round(g.valor), dia: 10,
      origem: "Apuração de ISS", motor: "iss",
      memoria: [{ campo: "ISS a recolher", valor: brl(g.valor), origem: "Motor de apuração de ISS", documento: `apuracao/iss/${competencia}`, regra: "base × alíquota do município", legislacao: "LC 116/2003" }],
    });
  }
  // retenções municipais
  const estadoRet = getApEstado("retencoes", empresaId, competencia);
  const apRet = apurar("retencoes", empresaId, competencia, estadoRet);
  for (const g of apRet.guias) {
    if (g.valor <= 0 || !/ISS|municipal/i.test(g.nome)) continue;
    out.push({
      tipo: "Guia Municipal", grupo: "estaduais", tributo: "ISS retido na fonte", codigo: "ISS-RET",
      orgao: `Prefeitura de ${municipio}`, valor: round(g.valor), dia: 10,
      origem: "Retenções na fonte", motor: "retencoes",
      memoria: [{ campo: "ISS retido", valor: brl(g.valor), origem: "Notas de serviços tomados", documento: "fiscal/servicos-tomados", regra: "retenção destacada no documento", legislacao: "LC 116/2003, art. 6º" }],
    });
  }
  return out;
}

/* ============================ montagem das guias ========================= */

function statusDe(g: Omit<Guia, "status">, override: Override): GuiaStatus {
  if (override.cancelada) return "Cancelada";
  if (override.compensada) return "Compensada";
  if (g.pago >= g.valorFinal - 0.01 && g.pago > 0) return "Paga";
  if (g.pago > 0) return "Parcial";
  if (g.diasAtraso > 0) return "Vencida";
  return override.emitida ? "Emitida" : "Em aberto";
}

export function listarGuias(empresaId?: string | null, competencia?: string): Guia[] {
  if (!empresaId || !competencia) return [];
  const db = loadDB();
  const cfg = getConfig();
  const emp = getEmpresa(empresaId);
  const filiais = loadFiliais().filter((f) => f.empresaId === empresaId);
  const bases = [...motorFederal(empresaId, competencia), ...motorEstadualMunicipal(empresaId, competencia)];

  return bases
    .filter((b) => b.valor > 0.009)
    .map((b, i) => {
      const id = `${empresaId}::${competencia}::${b.codigo}::${i}`;
      const ov = db.overrides[id] ?? {};
      const vencimento = vencimentoDe(competencia, b.dia, cfg.antecipaFimDeSemana);
      const pagamentos = ov.pagamentos ?? [];
      const pago = round(pagamentos.reduce((s, p) => s + p.valor, 0));
      const refPagamento = pagamentos[0]?.data;
      const enc = calcularEncargos(b.valor, vencimento, refPagamento ?? hojeISO());
      const seed = digitos(id, 48);
      const parcial: Omit<Guia, "status"> = {
        id,
        grupo: b.grupo,
        tipo: b.tipo,
        empresaId,
        empresa: emp?.razao ?? "Empresa",
        filial: filiais[i % Math.max(1, filiais.length)]?.nome ?? "Matriz",
        competencia,
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
    })
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

export function guiasDoGrupo(grupo: GrupoSlug, empresaId?: string | null, competencia?: string) {
  return listarGuias(empresaId, competencia).filter((g) => g.grupo === grupo);
}

export function useGuias(empresaId?: string | null, competencia?: string) {
  const [guias, setGuias] = useState<Guia[]>(() => listarGuias(empresaId, competencia));
  useEffect(() => {
    const sync = () => setGuias(listarGuias(empresaId, competencia));
    sync();
    window.addEventListener(GUIAS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(GUIAS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [empresaId, competencia]);
  return guias;
}

/* ============================== ações ==================================== */

function patchGuia(id: string, patch: Override, evento?: { acao: string; detalhe: string }) {
  const db = loadDB();
  const atual = db.overrides[id] ?? {};
  const log = evento
    ? [{ id: novoId("log"), em: new Date().toISOString(), usuario: USUARIO, acao: evento.acao, detalhe: evento.detalhe }, ...(atual.log ?? [])].slice(0, 200)
    : atual.log;
  db.overrides[id] = { ...atual, ...patch, log };
  saveDB(db);
}

export function emitirGuia(g: Guia) {
  patchGuia(g.id, { emitida: true, emitidaEm: new Date().toISOString(), cancelada: false }, {
    acao: "Emissão",
    detalhe: `${g.tipo} ${g.tributo} — ${brl(g.valorFinal)} com vencimento em ${dataBR(g.vencimento)}.`,
  });
}

export function reemitirGuia(g: Guia, motivo: string) {
  patchGuia(g.id, { emitida: true, emitidaEm: new Date().toISOString() }, {
    acao: "Reemissão / 2ª via",
    detalhe: `${motivo} — valores recalculados: multa ${brl(g.multa)}, juros ${brl(g.juros)}.`,
  });
}

export function cancelarGuia(g: Guia, motivo: string) {
  patchGuia(g.id, { cancelada: true }, { acao: "Cancelamento", detalhe: motivo });
}

export function compensarGuia(g: Guia, documento: string) {
  patchGuia(g.id, { compensada: true }, {
    acao: "Compensação",
    detalhe: `Débito compensado via ${documento} no valor de ${brl(g.valorFinal)}.`,
  });
}

export function registrarPagamento(
  g: Guia,
  dados: { data: string; valor: number; meio: Pagamento["meio"]; banco: string; origem?: Pagamento["origem"] },
) {
  const db = loadDB();
  const atual = db.overrides[g.id]?.pagamentos ?? [];
  const pg: Pagamento = {
    id: novoId("pg"),
    em: new Date().toISOString(),
    data: dados.data,
    valor: round(dados.valor),
    meio: dados.meio,
    banco: dados.banco,
    autenticacao: digitos(g.id + dados.data + atual.length, 20),
    conciliado: getConfig().baixaAutomatica,
    origem: dados.origem ?? "Manual",
  };
  patchGuia(g.id, { pagamentos: [pg, ...atual] }, {
    acao: "Baixa de pagamento",
    detalhe: `${dados.origem ?? "Manual"} — ${brl(pg.valor)} via ${pg.meio} (${pg.banco}), autenticação ${pg.autenticacao}.`,
  });
  return pg;
}

export function estornarPagamento(g: Guia, pagamentoId: string) {
  const db = loadDB();
  const atual = db.overrides[g.id]?.pagamentos ?? [];
  patchGuia(g.id, { pagamentos: atual.filter((p) => p.id !== pagamentoId) }, {
    acao: "Estorno de baixa",
    detalhe: `Pagamento ${pagamentoId} estornado e guia reaberta.`,
  });
}

export function conciliarPagamento(g: Guia, pagamentoId: string) {
  const db = loadDB();
  const atual = db.overrides[g.id]?.pagamentos ?? [];
  patchGuia(g.id, { pagamentos: atual.map((p) => (p.id === pagamentoId ? { ...p, conciliado: true } : p)) }, {
    acao: "Conciliação financeira",
    detalhe: "Pagamento conciliado com o retorno bancário e o fluxo de caixa atualizado.",
  });
}

export function definirResponsavel(g: Guia, responsavel: string) {
  patchGuia(g.id, { responsavel }, { acao: "Responsável", detalhe: `Responsável alterado para ${responsavel}.` });
}

/** Conciliação em lote simulando retorno CNAB / Open Finance. */
export function conciliarRetornoBancario(guias: Guia[]) {
  let n = 0;
  for (const g of guias) {
    if (g.status === "Paga" || g.status === "Cancelada" || g.status === "Compensada") continue;
    if (g.diasAtraso > 0) continue;
    registrarPagamento(g, {
      data: hojeISO(),
      valor: g.saldo,
      meio: "CNAB retorno",
      banco: "Banco do Brasil 001",
      origem: "Automática",
    });
    n++;
  }
  return n;
}

/* ============================ parcelamentos ============================== */

function parcelamentosPadrao(empresaId: string): Parcelamento[] {
  const base = (i: number, p: Partial<Parcelamento>): Parcelamento => ({
    id: `parc-${empresaId}-${i}`,
    processo: `10880.${digitos(empresaId + i, 6)}/2025-${digitos(empresaId + i, 2)}`,
    tipo: "Parcelamento ordinário",
    orgao: "Receita Federal do Brasil",
    empresaId,
    tributos: "PIS, COFINS e IRPJ",
    adesao: "2025-03-10",
    parcelas: 60,
    valorParcela: 4180,
    entrada: 0,
    jurosMes: 0.0092,
    situacao: "Ativo",
    historico: [],
    ...p,
  });
  return [
    base(1, {}),
    base(2, {
      tipo: "PERT", tributos: "IRPJ e CSLL", parcelas: 36, valorParcela: 6250,
      adesao: "2025-08-05", entrada: 25000,
    }),
    base(3, {
      tipo: "Parcelamento estadual", orgao: "SEFAZ-SP", tributos: "ICMS próprio",
      parcelas: 24, valorParcela: 2940, adesao: "2026-01-15",
    }),
    base(4, {
      tipo: "Parcelamento previdenciário", orgao: "Receita Federal do Brasil",
      tributos: "Contribuição previdenciária", parcelas: 48, valorParcela: 1875,
      adesao: "2024-06-20", situacao: "Encerrado",
    }),
  ];
}

export function listarParcelamentos(empresaId?: string | null): Parcelamento[] {
  if (!empresaId) return [];
  const db = loadDB();
  const meus = db.parcelamentos.filter((p) => p.empresaId === empresaId);
  return meus.length ? meus : parcelamentosPadrao(empresaId);
}

export function salvarParcelamento(p: Parcelamento, evento?: string) {
  const db = loadDB();
  const existentes = db.parcelamentos.length
    ? db.parcelamentos
    : [...db.parcelamentos, ...parcelamentosPadrao(p.empresaId)];
  const i = existentes.findIndex((x) => x.id === p.id);
  const historico = evento
    ? [{ id: novoId("log"), em: new Date().toISOString(), usuario: USUARIO, acao: "Parcelamento", detalhe: evento }, ...p.historico].slice(0, 100)
    : p.historico;
  const atualizado = { ...p, historico };
  db.parcelamentos = i >= 0 ? existentes.map((x) => (x.id === p.id ? atualizado : x)) : [...existentes, atualizado];
  saveDB(db);
}

/** Renegocia o saldo remanescente em nova quantidade de parcelas. */
export function renegociar(p: Parcelamento, novasParcelas: number) {
  const d = detalharParcelamento(p);
  const saldo = d.saldoDevedor;
  const valorParcela = round((saldo * (1 + p.jurosMes * novasParcelas * 0.5)) / novasParcelas);
  salvarParcelamento(
    { ...p, parcelas: novasParcelas, valorParcela, adesao: hojeISO() },
    `Renegociação: saldo de ${brl(saldo)} redistribuído em ${novasParcelas} parcelas de ${brl(valorParcela)}.`,
  );
}

export function detalharParcelamento(p: Parcelamento) {
  const [ay, am] = p.adesao.split("-").map(Number);
  const hoje = hojeISO();
  const parcelas: Parcela[] = Array.from({ length: p.parcelas }, (_, i) => {
    const d = new Date(Date.UTC(ay, am - 1 + i + 1, 15));
    const venc = d.toISOString().slice(0, 10);
    const vencida = venc < hoje;
    const paga = vencida && (p.situacao === "Encerrado" || i % 9 !== 8);
    return {
      numero: i + 1,
      vencimento: venc,
      valor: p.valorParcela,
      status: paga ? "Paga" : vencida ? "Vencida" : "Em aberto",
      pagoEm: paga ? venc : undefined,
    };
  });
  const pagas = parcelas.filter((x) => x.status === "Paga");
  const vencidas = parcelas.filter((x) => x.status === "Vencida");
  const futuras = parcelas.filter((x) => x.status === "Em aberto");
  const saldoDevedor = round((p.parcelas - pagas.length) * p.valorParcela);
  const jurosAcum = round(vencidas.reduce((s, x) => s + x.valor * (p.jurosMes + 0.02), 0));
  return {
    parcelas,
    pagas: pagas.length,
    vencidas: vencidas.length,
    futuras: futuras.length,
    saldoDevedor,
    jurosAcum,
    proximo: futuras[0]?.vencimento ?? "—",
    total: round(p.parcelas * p.valorParcela + p.entrada),
  };
}

export function resumoParcelamentos(empresaId?: string | null) {
  const lista = listarParcelamentos(empresaId);
  const det = lista.map(detalharParcelamento);
  return {
    ativos: lista.filter((p) => p.situacao === "Ativo").length,
    encerrados: lista.filter((p) => p.situacao !== "Ativo").length,
    vencidas: det.reduce((s, d) => s + d.vencidas, 0),
    futuras: det.reduce((s, d) => s + d.futuras, 0),
    saldo: round(det.reduce((s, d) => s + d.saldoDevedor, 0)),
    juros: round(det.reduce((s, d) => s + d.jurosAcum, 0)),
  };
}

/* ============================= compensações ============================== */

function compensacoesPadrao(empresaId: string, competencia: string): Compensacao[] {
  const s = hash(empresaId + competencia);
  return [
    {
      id: `comp-${empresaId}-1`, documento: `PER/DCOMP ${digitos(empresaId + "1", 5)}.${digitos(empresaId + "2", 5)}`,
      tipo: "PER/DCOMP", origemCredito: "Saldo negativo de IRPJ", tributoCompensado: "IRPJ estimativa",
      competencia, valorCredito: round(18500 + (s % 4000)), valorUtilizado: round(12400 + (s % 1200)),
      situacao: "Transmitida", transmissao: vencimentoDe(competencia, 12),
    },
    {
      id: `comp-${empresaId}-2`, documento: `PER/DCOMP ${digitos(empresaId + "3", 5)}.${digitos(empresaId + "4", 5)}`,
      tipo: "PER/DCOMP", origemCredito: "Crédito de PIS não cumulativo", tributoCompensado: "COFINS",
      competencia, valorCredito: round(7400 + (s % 900)), valorUtilizado: round(7400 + (s % 900)),
      situacao: "Homologada", transmissao: vencimentoDe(competencia, 5),
    },
    {
      id: `comp-${empresaId}-3`, documento: `Crédito acumulado ICMS ${digitos(empresaId + "5", 6)}`,
      tipo: "Crédito estadual", origemCredito: "Crédito acumulado de exportação", tributoCompensado: "ICMS próprio",
      competencia, valorCredito: round(9600 + (s % 2200)), valorUtilizado: round(4200 + (s % 700)),
      situacao: "Em análise", transmissao: vencimentoDe(competencia, 18),
    },
  ];
}

export function listarCompensacoes(empresaId?: string | null, competencia?: string): Compensacao[] {
  if (!empresaId || !competencia) return [];
  const db = loadDB();
  const meus = db.compensacoes.filter((c) => c.competencia === competencia && c.id.includes(empresaId));
  return meus.length ? meus : compensacoesPadrao(empresaId, competencia);
}

export function economiaCompensacoes(empresaId?: string | null, competencia?: string) {
  return round(listarCompensacoes(empresaId, competencia).reduce((s, c) => s + c.valorUtilizado, 0));
}

/* ================================= KPIs ================================== */

export type Kpi = { label: string; valor: string; hint?: string; destaque?: boolean };

export function kpisDe(guias: Guia[], empresaId?: string | null, competencia?: string): Kpi[] {
  const r = resumoGuias(guias);
  return [
    { label: "Total a recolher", valor: brl(r.aRecolher), hint: `${r.abertas} guia(s) em aberto` },
    { label: "Guias emitidas", valor: String(r.emitidas) },
    { label: "Guias pagas", valor: brl(r.pago), hint: `${r.pagas} guia(s)` },
    { label: "Guias vencidas", valor: String(r.vencidas), destaque: r.vencidas > 0 },
    { label: "Em aberto", valor: String(r.abertas) },
    { label: "Próximas do vencimento", valor: String(r.proximas) },
    { label: "Multas acumuladas", valor: brl(r.multa), destaque: r.multa > 0 },
    { label: "Juros acumulados", valor: brl(r.juros), destaque: r.juros > 0 },
    { label: "Economia por compensações", valor: brl(economiaCompensacoes(empresaId, competencia)) },
  ];
}

export function resumoGuias(guias: Guia[]) {
  const cfg = getConfig();
  const hoje = hojeISO();
  const ativas = guias.filter((g) => g.status !== "Cancelada");
  return {
    total: ativas.length,
    valorTotal: round(ativas.reduce((s, g) => s + g.valorFinal, 0)),
    aRecolher: round(ativas.filter((g) => g.status !== "Paga" && g.status !== "Compensada").reduce((s, g) => s + g.saldo, 0)),
    emitidas: ativas.filter((g) => g.emitida).length,
    pagas: ativas.filter((g) => g.status === "Paga").length,
    pago: round(ativas.reduce((s, g) => s + g.pago, 0)),
    vencidas: ativas.filter((g) => g.status === "Vencida").length,
    abertas: ativas.filter((g) => g.status === "Em aberto" || g.status === "Emitida" || g.status === "Parcial").length,
    proximas: ativas.filter(
      (g) => g.status !== "Paga" && g.diasAtraso === 0 && diasEntre(hoje, g.vencimento) <= cfg.alertaDias,
    ).length,
    multa: round(ativas.reduce((s, g) => s + g.multa, 0)),
    juros: round(ativas.reduce((s, g) => s + g.juros + g.atualizacao, 0)),
    conciliadas: ativas.filter((g) => g.conciliada).length,
  };
}

/* ============================ calendário fiscal ========================== */

export type EventoCalendario = {
  id: string;
  data: string;
  titulo: string;
  detalhe: string;
  tipo: "Guia" | "Parcela" | "Compensação";
  valor: number;
  status: string;
  responsavel: string;
  prioridade: "Alta" | "Média" | "Baixa";
  dias: number;
  link?: string;
};

export function calendario(empresaId?: string | null, competencia?: string): EventoCalendario[] {
  const hoje = hojeISO();
  const guias = listarGuias(empresaId, competencia).filter((g) => g.status !== "Cancelada");
  const eventos: EventoCalendario[] = guias.map((g) => {
    const dias = diasEntre(hoje, g.vencimento);
    return {
      id: g.id,
      data: g.vencimento,
      titulo: `${g.tipo} — ${g.tributo}`,
      detalhe: `${g.orgao} · código ${g.codigoReceita}`,
      tipo: "Guia",
      valor: g.valorFinal,
      status: g.status,
      responsavel: g.responsavel,
      prioridade: g.status === "Paga" ? "Baixa" : dias < 0 ? "Alta" : dias <= 5 ? "Média" : "Baixa",
      dias,
      link: g.grupo === "darf" ? "/fiscal/guias/darf" : "/fiscal/guias/estaduais",
    };
  });

  for (const p of listarParcelamentos(empresaId)) {
    if (p.situacao !== "Ativo") continue;
    const d = detalharParcelamento(p);
    for (const parcela of d.parcelas.filter((x) => x.status !== "Paga").slice(0, 3)) {
      const dias = diasEntre(hoje, parcela.vencimento);
      eventos.push({
        id: `${p.id}-${parcela.numero}`,
        data: parcela.vencimento,
        titulo: `${p.tipo} — parcela ${parcela.numero}/${p.parcelas}`,
        detalhe: `${p.orgao} · processo ${p.processo}`,
        tipo: "Parcela",
        valor: parcela.valor,
        status: parcela.status,
        responsavel: "Tesouraria",
        prioridade: dias < 0 ? "Alta" : dias <= 5 ? "Média" : "Baixa",
        dias,
        link: "/fiscal/guias/parcelamentos",
      });
    }
  }

  return eventos.sort((a, b) => a.data.localeCompare(b.data));
}

export type Alerta = { id: string; nivel: "crítico" | "atenção" | "info"; titulo: string; detalhe: string };

export function alertas(empresaId?: string | null, competencia?: string): Alerta[] {
  const cfg = getConfig();
  const hoje = hojeISO();
  const guias = listarGuias(empresaId, competencia);
  const out: Alerta[] = [];

  for (const g of guias) {
    const dias = diasEntre(hoje, g.vencimento);
    if (g.status === "Vencida") {
      out.push({
        id: `atraso-${g.id}`, nivel: "crítico",
        titulo: `${g.tipo} ${g.tributo} em atraso`,
        detalhe: `${g.diasAtraso} dia(s) de atraso — multa ${brl(g.multa)} e juros ${brl(g.juros)}.`,
      });
    } else if (g.status !== "Paga" && dias === 0) {
      out.push({ id: `hoje-${g.id}`, nivel: "crítico", titulo: `${g.tributo} vence hoje`, detalhe: `${brl(g.saldo)} — ${g.orgao}.` });
    } else if (g.status !== "Paga" && dias > 0 && dias <= cfg.alertaDias) {
      out.push({ id: `prox-${g.id}`, nivel: "atenção", titulo: `${g.tributo} vence em ${dias} dia(s)`, detalhe: `${brl(g.saldo)} — vencimento ${dataBR(g.vencimento)}.` });
    }
    if (!g.emitida && g.status !== "Paga") {
      out.push({ id: `naogerada-${g.id}`, nivel: "atenção", titulo: `Guia de ${g.tributo} ainda não emitida`, detalhe: `Apuração concluída em ${g.origem}, guia pendente de emissão.` });
    }
    if (g.pagamentos.some((p) => !p.conciliado)) {
      out.push({ id: `conc-${g.id}`, nivel: "atenção", titulo: `Pagamento não conciliado — ${g.tributo}`, detalhe: "Existe baixa registrada sem conciliação bancária." });
    }
  }

  for (const p of listarParcelamentos(empresaId)) {
    const d = detalharParcelamento(p);
    if (d.vencidas > 0 && p.situacao === "Ativo") {
      out.push({
        id: `parc-${p.id}`, nivel: "crítico",
        titulo: `${d.vencidas} parcela(s) em atraso — ${p.tipo}`,
        detalhe: `Processo ${p.processo}, saldo devedor de ${brl(d.saldoDevedor)}.`,
      });
    }
  }

  for (const c of listarCompensacoes(empresaId, competencia)) {
    if (c.situacao === "Em análise" || c.situacao === "Rascunho") {
      out.push({ id: `comp-${c.id}`, nivel: "info", titulo: `Compensação pendente — ${c.documento}`, detalhe: `${c.origemCredito} · ${brl(c.valorCredito - c.valorUtilizado)} de saldo credor.` });
    }
  }

  return out.slice(0, 40);
}

/* ============================== catálogo ================================= */

export type GrupoDef = {
  slug: GrupoSlug;
  titulo: string;
  descricao: string;
  submodulos: string[];
  indicadores: string[];
};

export const GRUPOS: GrupoDef[] = [
  {
    slug: "darf",
    titulo: "DARF",
    descricao: "Guias federais emitidas por competência, com motor próprio de código de receita, multa, juros e baixa.",
    submodulos: [
      "DARF Comum", "DARF Numerado", "DARF Previdenciário", "DARF IRRF", "DARF PIS",
      "DARF COFINS", "DARF CSLL", "DARF IRPJ", "DARF IOF", "DARF Multas", "DARF Juros",
      "Emissão", "Reemissão", "Segunda via", "Baixa", "Histórico",
    ],
    indicadores: ["Guias emitidas", "Guias pagas", "Guias vencidas", "Guias em aberto", "Valor total", "Multas", "Juros", "Compensações"],
  },
  {
    slug: "estaduais",
    titulo: "GNRE / GARE / DAE",
    descricao: "Guias estaduais e municipais de ICMS, ICMS-ST, DIFAL, FCP e ISS, com regra por UF e município.",
    submodulos: [
      "GNRE", "GARE", "DAE", "DARE", "DUA", "Arrecadações estaduais",
      "ICMS-ST", "DIFAL", "Antecipação tributária", "FCP",
    ],
    indicadores: ["Guias estaduais", "Pagamentos", "Pendências", "Valores", "Protocolos"],
  },
  {
    slug: "parcelamentos",
    titulo: "Parcelamentos",
    descricao: "Controle de parcelamentos federais, estaduais, municipais e previdenciários com renegociação.",
    submodulos: [
      "REFIS", "PERT", "Parcelamentos estaduais", "Parcelamentos municipais",
      "Parcelamentos previdenciários", "Acompanhamento", "Renegociação", "Histórico", "Parcelas", "Baixas",
    ],
    indicadores: ["Parcelamentos ativos", "Encerrados", "Parcelas vencidas", "Parcelas futuras", "Saldo devedor", "Juros"],
  },
  {
    slug: "calendario",
    titulo: "Calendário fiscal",
    descricao: "Agenda tributária por empresa e competência com prazos, responsáveis, prioridades e alertas.",
    submodulos: [
      "Agenda", "Vencimentos", "Alertas", "Responsáveis", "Notificações",
      "Reagendamentos", "Feriados", "Obrigações",
    ],
    indicadores: ["Próximos vencimentos", "Tributos do mês", "Guias atrasadas", "Guias do dia", "Empresas com pendências"],
  },
];

export function grupoDe(slug: GrupoSlug) {
  return GRUPOS.find((g) => g.slug === slug)!;
}

/* ============================ fluxo operacional ========================== */

export const FLUXO = [
  "Apuração fiscal",
  "Validação",
  "Geração da guia",
  "Multa e juros",
  "Autenticação",
  "Disponibilização",
  "Baixa",
  "Conciliação",
  "Arquivamento",
  "Auditoria",
];

/** Etapa atual do fluxo, derivada do estado das guias do grupo. */
export function etapaDoGrupo(guias: Guia[]) {
  if (!guias.length) return 1;
  if (guias.every((g) => g.conciliada && g.status === "Paga")) return 10;
  if (guias.some((g) => g.pagamentos.length && !g.conciliada)) return 8;
  if (guias.some((g) => g.pago > 0)) return 7;
  if (guias.every((g) => g.emitida)) return 6;
  if (guias.some((g) => g.emitida)) return 3;
  return 2;
}

/** Validações executadas antes da emissão. */
export type Validacao = { id: string; nivel: "erro" | "advertência" | "ok"; titulo: string; detalhe: string };

export function validarGrupo(guias: Guia[], empresaId?: string | null): Validacao[] {
  const emp = empresaId ? getEmpresa(empresaId) : null;
  const out: Validacao[] = [];
  if (!emp) {
    out.push({ id: "empresa", nivel: "erro", titulo: "Empresa não selecionada", detalhe: "Selecione a empresa para gerar guias." });
    return out;
  }
  if (!guias.length) {
    out.push({ id: "sem-guias", nivel: "advertência", titulo: "Nenhuma guia gerada", detalhe: "Não há valores a recolher apurados nesta competência." });
  }
  for (const g of guias) {
    if (!g.codigoReceita || g.codigoReceita === "—") {
      out.push({ id: `cod-${g.id}`, nivel: "erro", titulo: `Código de receita ausente — ${g.tributo}`, detalhe: "Parametrize o código de receita do tributo." });
    }
    if (g.valorFinal < 10) {
      out.push({ id: `min-${g.id}`, nivel: "advertência", titulo: `Valor abaixo do mínimo — ${g.tributo}`, detalhe: `${brl(g.valorFinal)}: recolhimentos inferiores a R$ 10,00 devem ser acumulados.` });
    }
    if (g.diasAtraso > 0 && !g.emitida) {
      out.push({ id: `atr-${g.id}`, nivel: "advertência", titulo: `Guia vencida sem emissão — ${g.tributo}`, detalhe: `Reemita com multa e juros atualizados até a data do pagamento.` });
    }
    if (g.valorFinal > getConfig().aprovacaoAcima && !g.emitida) {
      out.push({ id: `apr-${g.id}`, nivel: "advertência", titulo: `Aprovação necessária — ${g.tributo}`, detalhe: `Valor de ${brl(g.valorFinal)} acima do limite de alçada configurado.` });
    }
  }
  if (!out.length) out.push({ id: "ok", nivel: "ok", titulo: "Sem impedimentos", detalhe: "Todas as guias estão aptas à emissão e ao pagamento." });
  return out;
}

/** Log consolidado de auditoria do grupo. */
export function auditoriaDoGrupo(guias: Guia[]) {
  return guias
    .flatMap((g) => g.log.map((l) => ({ ...l, guia: `${g.tipo} ${g.tributo}` })))
    .sort((a, b) => b.em.localeCompare(a.em))
    .slice(0, 120);
}

/** Pendências publicadas para o painel de fechamento. */
export function pendenciasGuias(empresaId: string | null, competencia: string) {
  const guias = listarGuias(empresaId, competencia);
  const r = resumoGuias(guias);
  const itens: string[] = [];
  if (r.vencidas) itens.push(`${r.vencidas} guia(s) vencida(s)`);
  if (r.abertas) itens.push(`${r.abertas} guia(s) em aberto`);
  const parc = resumoParcelamentos(empresaId);
  if (parc.vencidas) itens.push(`${parc.vencidas} parcela(s) de parcelamento em atraso`);
  return itens;
}

export { regimeDaEmpresa, rs };
