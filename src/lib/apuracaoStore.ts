// ============================================================================
// Motor de apurações fiscais — arquitetura desacoplada.
// Cada tributo é um motor independente que transforma documentos fiscais
// (fiscalStore) em base de cálculo, créditos, débitos, retenções e guias.
// Tudo é interno/visual: nenhuma comunicação real com Receita/Prefeituras.
// ============================================================================
import { useEffect, useState } from "react";
import { loadDocs, moedaBR, valorBR, type DocFiscal, type DocSlug } from "@/lib/fiscalStore";
import { getEmpresa } from "@/lib/empresasStore";

const KEY = "usecontabil.apuracoes.v1";
export const APURACAO_EVENT = "usecontabil:apuracao-changed";

export type MotorSlug =
  | "pis-cofins"
  | "iss"
  | "irpj-csll"
  | "simples-nacional"
  | "retencoes";

/* ------------------------------- estado -------------------------------- */

export type Ajuste = {
  id: string;
  tipo: "Adição" | "Exclusão" | "Crédito extemporâneo" | "Compensação" | "Outros";
  descricao: string;
  valor: string;
  fundamento: string;
  criadoEm: string;
};

export type LogEntry = {
  id: string;
  em: string;
  usuario: string;
  acao: string;
  detalhe: string;
};

export type ApuracaoEstado = {
  status: "Aberta" | "Em conferência" | "Fechada";
  responsavel: string;
  atualizadoEm: string;
  ajustes: Ajuste[];
  parametros: Record<string, string>;
  log: LogEntry[];
};

type DB = Record<string, ApuracaoEstado>;

const USUARIO = "M. Andrade";

export const chave = (motor: MotorSlug, empresaId: string, competencia: string) =>
  `${motor}::${empresaId}::${competencia}`;

function notify() {
  window.dispatchEvent(new Event(APURACAO_EVENT));
}

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DB) : {};
  } catch {
    return {};
  }
}

function persist(db: DB) {
  localStorage.setItem(KEY, JSON.stringify(db));
  notify();
}

export function estadoPadrao(): ApuracaoEstado {
  return {
    status: "Aberta",
    responsavel: USUARIO,
    atualizadoEm: new Date().toISOString(),
    ajustes: [],
    parametros: {},
    log: [],
  };
}

export function getEstado(motor: MotorSlug, empresaId?: string | null, competencia?: string) {
  if (!empresaId || !competencia) return estadoPadrao();
  return loadDB()[chave(motor, empresaId, competencia)] ?? estadoPadrao();
}

export function setEstado(
  motor: MotorSlug,
  empresaId: string,
  competencia: string,
  patch: Partial<ApuracaoEstado>,
  logAcao?: { acao: string; detalhe: string },
) {
  const db = loadDB();
  const k = chave(motor, empresaId, competencia);
  const atual = db[k] ?? estadoPadrao();
  const log = logAcao
    ? [
        {
          id: novoId("log"),
          em: new Date().toISOString(),
          usuario: USUARIO,
          acao: logAcao.acao,
          detalhe: logAcao.detalhe,
        },
        ...atual.log,
      ].slice(0, 200)
    : atual.log;
  persist({
    ...db,
    [k]: { ...atual, ...patch, log, atualizadoEm: new Date().toISOString() },
  });
}

export function novoId(prefixo: string) {
  return `${prefixo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function useApuracaoEstado(
  motor: MotorSlug,
  empresaId?: string | null,
  competencia?: string,
) {
  const [estado, setLocal] = useState<ApuracaoEstado>(() =>
    getEstado(motor, empresaId, competencia),
  );
  useEffect(() => {
    const refresh = () => setLocal(getEstado(motor, empresaId, competencia));
    refresh();
    window.addEventListener(APURACAO_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(APURACAO_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [motor, empresaId, competencia]);
  return estado;
}

/* ------------------------- regime tributário ---------------------------- */

export type Regime = "Simples Nacional" | "Lucro Presumido" | "Lucro Real" | "MEI";

export function regimeDaEmpresa(empresaId?: string | null): Regime {
  if (!empresaId) return "Lucro Presumido";
  const e = getEmpresa(empresaId);
  const r = (e?.regime ?? "").toLowerCase();
  if (r.includes("simples")) return "Simples Nacional";
  if (r.includes("real")) return "Lucro Real";
  if (r.includes("mei")) return "MEI";
  return "Lucro Presumido";
}

/* --------------------------- base documental ---------------------------- */

const OK_POR_SLUG: Partial<Record<DocSlug, string>> = {
  entradas: "Escriturado",
  saidas: "Autorizada",
  "servicos-tomados": "Escriturado",
  "servicos-prestados": "Emitida",
  transporte: "Escriturado",
  cupons: "Consolidado",
};

export function docsDoPeriodo(slug: DocSlug, empresaId?: string | null, competencia?: string) {
  return loadDocs(slug).filter(
    (d) =>
      (!empresaId || d.empresaId === empresaId) &&
      (!competencia || d.competencia === competencia),
  );
}

export function docsValidos(slug: DocSlug, empresaId?: string | null, competencia?: string) {
  const ok = OK_POR_SLUG[slug];
  return docsDoPeriodo(slug, empresaId, competencia).filter((d) => !ok || d.status === ok);
}

/* ------------------------- estruturas de saída -------------------------- */

/** Linha do grid de documentos considerados na apuração. */
export type LinhaDoc = {
  id: string;
  data: string;
  documento: string;
  participante: string;
  modelo: string;
  cfop: string;
  cst: string;
  natureza: string;
  contabil: number;
  base: number;
  aliquota: string;
  imposto: number;
  credito: number;
  debito: number;
  status: "Considerado" | "Excluído" | "Pendente";
  origem: string;
  /** memória de cálculo rastreável */
  memoria: Memoria;
};

export type Memoria = {
  regra: string;
  legislacao: string;
  formula: string;
  passos: { label: string; valor: string }[];
  versaoRegra: string;
};

export type LinhaCalculo = {
  id: string;
  descricao: string;
  base: number;
  aliquota: string;
  valor: number;
  grupo: "Débito" | "Crédito" | "Exclusão" | "Retenção" | "Resultado";
  memoria: Memoria;
};

export type Kpi = { label: string; valor: string; hint?: string; destaque?: boolean };

export type Inconsistencia = {
  id: string;
  titulo: string;
  detalhe: string;
  gravidade: "crítica" | "atenção";
  destino?: string;
};

export type Obrigacao = { nome: string; prazo: string; base: string; situacao: string };

export type Guia = { nome: string; codigo: string; valor: number; vencimento: string };

export type Apuracao = {
  motor: MotorSlug;
  regime: Regime;
  kpis: Kpi[];
  documentos: LinhaDoc[];
  calculos: LinhaCalculo[];
  inconsistencias: Inconsistencia[];
  obrigacoes: Obrigacao[];
  guias: Guia[];
  resumo: { label: string; valor: string }[];
  totalImposto: number;
};

/* ------------------------------ utilidades ------------------------------ */

export const rs = (n: number) => `R$ ${moedaBR(n)}`;
export const pct = (n: number) =>
  `${(n * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%`;

const CFOP_ST = ["5405", "1403", "6404", "5401"];
const CFOP_SEM_CREDITO = ["1556", "2556", "1551", "2551"];
const CFOP_BONIFICACAO = ["5910", "6910"];
const CFOP_EXPORTACAO = ["7101", "7102"];

function memoria(
  regra: string,
  legislacao: string,
  formula: string,
  passos: { label: string; valor: string }[],
): Memoria {
  return { regra, legislacao, formula, passos, versaoRegra: "v2026.07" };
}

function vencimento(competencia: string, dia: number, mesesFrente = 1) {
  const [a, m] = competencia.split("-").map(Number);
  const d = new Date(a, m - 1 + mesesFrente, dia);
  return d.toLocaleDateString("pt-BR");
}

function ajustesTotal(ajustes: Ajuste[], tipos: Ajuste["tipo"][]) {
  return ajustes
    .filter((a) => tipos.includes(a.tipo))
    .reduce((s, a) => s + valorBR(a.valor), 0);
}

function pendencias(
  slugs: DocSlug[],
  empresaId?: string | null,
  competencia?: string,
): Inconsistencia[] {
  const out: Inconsistencia[] = [];
  for (const slug of slugs) {
    const ok = OK_POR_SLUG[slug];
    const pend = docsDoPeriodo(slug, empresaId, competencia).filter(
      (d) => ok && d.status !== ok && d.status !== "Cancelada" && d.status !== "Cancelado",
    );
    if (pend.length)
      out.push({
        id: `pend-${slug}`,
        titulo: `${pend.length} documento(s) não escriturados em ${slug}`,
        detalhe: "Documentos fora do status válido não compõem a base de cálculo da competência.",
        gravidade: "crítica",
        destino: `/fiscal/documentos/${slug}`,
      });
  }
  return out;
}

/* ============================ MOTOR PIS/COFINS ========================== */

export function apurarPisCofins(
  empresaId: string | null,
  competencia: string,
  estado: ApuracaoEstado,
): Apuracao {
  const regime = regimeDaEmpresa(empresaId);
  const naoCumulativo = regime === "Lucro Real";
  const aliqPis = naoCumulativo ? 0.0165 : 0.0065;
  const aliqCofins = naoCumulativo ? 0.076 : 0.03;

  const saidas = docsValidos("saidas", empresaId, competencia);
  const cupons = docsValidos("cupons", empresaId, competencia);
  const servicos = docsValidos("servicos-prestados", empresaId, competencia);
  const entradas = docsValidos("entradas", empresaId, competencia);
  const transporte = docsValidos("transporte", empresaId, competencia);

  const documentos: LinhaDoc[] = [];

  const receitaLinha = (d: DocFiscal, origem: string, modelo: string) => {
    const contabil = valorBR(d.valor);
    const cfop = d.cfop ?? "—";
    const st = CFOP_ST.includes(cfop);
    const bonif = CFOP_BONIFICACAO.includes(cfop);
    const exportacao = CFOP_EXPORTACAO.includes(cfop);
    const excluido = st || bonif || exportacao;
    const base = excluido ? 0 : contabil;
    const debito = base * (aliqPis + aliqCofins);
    documentos.push({
      id: d.id,
      data: d.data ?? "—",
      documento: d.numero ?? "—",
      participante: d.participante ?? "Consumidor final",
      modelo,
      cfop,
      cst: excluido ? (exportacao ? "08" : "04") : naoCumulativo ? "01" : "01",
      natureza: d.tipo ?? "Receita de venda",
      contabil,
      base,
      aliquota: excluido ? "—" : pct(aliqPis + aliqCofins),
      imposto: debito,
      credito: 0,
      debito,
      status: excluido ? "Excluído" : "Considerado",
      origem,
      memoria: memoria(
        excluido
          ? st
            ? "SE CFOP de substituição tributária ENTÃO excluir da base de PIS/COFINS"
            : exportacao
              ? "SE receita de exportação ENTÃO isentar de PIS/COFINS"
              : "SE bonificação sem receita ENTÃO excluir da base"
          : `SE regime = ${regime} ENTÃO aplicar PIS ${pct(aliqPis)} e COFINS ${pct(aliqCofins)}`,
        naoCumulativo ? "Leis 10.637/2002 e 10.833/2003" : "Lei 9.718/1998",
        excluido ? "Base = 0" : "Débito = Base × (PIS + COFINS)",
        [
          { label: "Valor contábil", valor: rs(contabil) },
          { label: "Base de cálculo", valor: rs(base) },
          { label: "PIS", valor: rs(base * aliqPis) },
          { label: "COFINS", valor: rs(base * aliqCofins) },
        ],
      ),
    });
  };

  saidas.forEach((d) => receitaLinha(d, "Notas de saída", "NF-e 55"));
  cupons.forEach((d) => receitaLinha(d, "Cupons fiscais", "NFC-e 65"));
  servicos.forEach((d) => receitaLinha(d, "Serviços prestados", "NFS-e"));

  const creditoLinha = (d: DocFiscal, origem: string, modelo: string) => {
    const contabil = valorBR(d.valor);
    const cfop = d.cfop ?? "—";
    const semCredito = !naoCumulativo || CFOP_SEM_CREDITO.includes(cfop);
    const base = semCredito ? 0 : contabil;
    const credito = base * (aliqPis + aliqCofins);
    documentos.push({
      id: d.id,
      data: d.data ?? "—",
      documento: d.numero ?? "—",
      participante: d.participante ?? "—",
      modelo,
      cfop,
      cst: semCredito ? "70" : "50",
      natureza: d.tipo ?? "Aquisição",
      contabil,
      base,
      aliquota: semCredito ? "—" : pct(aliqPis + aliqCofins),
      imposto: credito,
      credito,
      debito: 0,
      status: semCredito ? "Excluído" : "Considerado",
      origem,
      memoria: memoria(
        semCredito
          ? !naoCumulativo
            ? "SE regime cumulativo ENTÃO não há apropriação de créditos"
            : "SE CFOP de uso e consumo/ativo ENTÃO vedado o crédito"
          : "SE insumo/mercadoria para revenda E regime não cumulativo ENTÃO apropriar crédito",
        "Lei 10.637/2002, art. 3º e Lei 10.833/2003, art. 3º",
        semCredito ? "Crédito = 0" : "Crédito = Base × (PIS + COFINS)",
        [
          { label: "Valor do documento", valor: rs(contabil) },
          { label: "Base creditável", valor: rs(base) },
          { label: "Crédito de PIS", valor: rs(base * aliqPis) },
          { label: "Crédito de COFINS", valor: rs(base * aliqCofins) },
        ],
      ),
    });
  };

  entradas.forEach((d) => creditoLinha(d, "Notas de entrada", "NF-e 55"));
  transporte.forEach((d) => creditoLinha(d, "Conhecimentos de transporte", "CT-e 57"));

  const receitaTotal = documentos
    .filter((d) => d.debito > 0 || (d.credito === 0 && d.origem !== "Notas de entrada"))
    .reduce((s, d) => s + (d.credito ? 0 : d.contabil), 0);
  const baseDebito = documentos.reduce((s, d) => s + (d.debito ? d.base : 0), 0);
  const baseCredito = documentos.reduce((s, d) => s + (d.credito ? d.base : 0), 0);
  const exclusoesDoc = documentos
    .filter((d) => d.status === "Excluído" && d.debito === 0 && d.credito === 0)
    .reduce((s, d) => s + d.contabil, 0);

  const exclusoesManuais = ajustesTotal(estado.ajustes, ["Exclusão"]);
  const adicoes = ajustesTotal(estado.ajustes, ["Adição"]);
  const creditoExtemporaneo = ajustesTotal(estado.ajustes, ["Crédito extemporâneo"]);

  const baseFinal = Math.max(0, baseDebito + adicoes - exclusoesManuais);
  const debPis = baseFinal * aliqPis;
  const debCofins = baseFinal * aliqCofins;
  const credPis = baseCredito * aliqPis + creditoExtemporaneo * (aliqPis / (aliqPis + aliqCofins));
  const credCofins =
    baseCredito * aliqCofins + creditoExtemporaneo * (aliqCofins / (aliqPis + aliqCofins));
  const pisPagar = Math.max(0, debPis - credPis);
  const cofinsPagar = Math.max(0, debCofins - credCofins);
  const total = pisPagar + cofinsPagar;

  const mem = (l: string, f: string, p: { label: string; valor: string }[]) =>
    memoria(
      `SE regime = ${regime} ENTÃO ${naoCumulativo ? "apurar pelo não cumulativo" : "apurar pelo cumulativo"}`,
      l,
      f,
      p,
    );

  const calculos: LinhaCalculo[] = [
    {
      id: "receita",
      descricao: "Receita bruta da competência",
      base: receitaTotal,
      aliquota: "—",
      valor: receitaTotal,
      grupo: "Resultado",
      memoria: mem("Lei 12.973/2014, art. 12", "Σ documentos de receita", [
        { label: "Saídas + cupons + serviços", valor: rs(receitaTotal) },
      ]),
    },
    {
      id: "exclusoes",
      descricao: "Exclusões da base (ST, monofásico, exportação e ajustes)",
      base: exclusoesDoc + exclusoesManuais,
      aliquota: "—",
      valor: exclusoesDoc + exclusoesManuais,
      grupo: "Exclusão",
      memoria: mem("IN RFB 2.121/2022", "Exclusões = documentos excluídos + ajustes manuais", [
        { label: "Por regra de CFOP/CST", valor: rs(exclusoesDoc) },
        { label: "Ajustes manuais", valor: rs(exclusoesManuais) },
      ]),
    },
    {
      id: "pis-deb",
      descricao: `PIS — débito (${pct(aliqPis)})`,
      base: baseFinal,
      aliquota: pct(aliqPis),
      valor: debPis,
      grupo: "Débito",
      memoria: mem("Lei 10.637/2002", "Débito = Base × alíquota", [
        { label: "Base tributável", valor: rs(baseFinal) },
        { label: "Alíquota", valor: pct(aliqPis) },
      ]),
    },
    {
      id: "cofins-deb",
      descricao: `COFINS — débito (${pct(aliqCofins)})`,
      base: baseFinal,
      aliquota: pct(aliqCofins),
      valor: debCofins,
      grupo: "Débito",
      memoria: mem("Lei 10.833/2003", "Débito = Base × alíquota", [
        { label: "Base tributável", valor: rs(baseFinal) },
        { label: "Alíquota", valor: pct(aliqCofins) },
      ]),
    },
    {
      id: "pis-cred",
      descricao: "PIS — créditos apropriados",
      base: baseCredito,
      aliquota: pct(aliqPis),
      valor: credPis,
      grupo: "Crédito",
      memoria: mem("Lei 10.637/2002, art. 3º", "Crédito = Base creditável × alíquota", [
        { label: "Base creditável", valor: rs(baseCredito) },
        { label: "Crédito extemporâneo", valor: rs(creditoExtemporaneo) },
      ]),
    },
    {
      id: "cofins-cred",
      descricao: "COFINS — créditos apropriados",
      base: baseCredito,
      aliquota: pct(aliqCofins),
      valor: credCofins,
      grupo: "Crédito",
      memoria: mem("Lei 10.833/2003, art. 3º", "Crédito = Base creditável × alíquota", [
        { label: "Base creditável", valor: rs(baseCredito) },
      ]),
    },
    {
      id: "pis-pagar",
      descricao: "PIS a recolher (DARF 6912/8109)",
      base: baseFinal,
      aliquota: "—",
      valor: pisPagar,
      grupo: "Resultado",
      memoria: mem("Lei 10.637/2002", "PIS a pagar = Débito − Crédito", [
        { label: "Débito", valor: rs(debPis) },
        { label: "Crédito", valor: rs(credPis) },
      ]),
    },
    {
      id: "cofins-pagar",
      descricao: "COFINS a recolher (DARF 5856/2172)",
      base: baseFinal,
      aliquota: "—",
      valor: cofinsPagar,
      grupo: "Resultado",
      memoria: mem("Lei 10.833/2003", "COFINS a pagar = Débito − Crédito", [
        { label: "Débito", valor: rs(debCofins) },
        { label: "Crédito", valor: rs(credCofins) },
      ]),
    },
  ];

  const inc = pendencias(
    ["saidas", "entradas", "servicos-prestados", "cupons", "transporte"],
    empresaId,
    competencia,
  );
  if (regime === "Simples Nacional")
    inc.push({
      id: "regime",
      titulo: "Empresa optante pelo Simples Nacional",
      detalhe: "PIS/COFINS são recolhidos dentro do DAS — use o motor do Simples Nacional.",
      gravidade: "atenção",
      destino: "/fiscal/apuracoes/simples-nacional",
    });
  if (!documentos.length)
    inc.push({
      id: "sem-doc",
      titulo: "Nenhum documento na competência",
      detalhe: "Lance ou importe documentos fiscais para gerar a apuração.",
      gravidade: "crítica",
      destino: "/fiscal/documentos/saidas",
    });

  return {
    motor: "pis-cofins",
    regime,
    kpis: [
      { label: "Documentos", valor: String(documentos.length) },
      { label: "Receita bruta", valor: rs(receitaTotal) },
      { label: "Base tributável", valor: rs(baseFinal) },
      { label: "Créditos", valor: rs(credPis + credCofins) },
      { label: "Débitos", valor: rs(debPis + debCofins) },
      { label: "Saldo a recolher", valor: rs(total), destaque: true },
      { label: "Valor das guias", valor: rs(total) },
      { label: "Pendências", valor: String(inc.length) },
    ],
    documentos,
    calculos,
    inconsistencias: inc,
    obrigacoes: [
      {
        nome: "EFD-Contribuições",
        prazo: vencimento(competencia, 14, 2),
        base: "Blocos A, C, D, F e M",
        situacao: estado.status === "Fechada" ? "Pronta para transmissão" : "Aguardando fechamento",
      },
      {
        nome: "DCTFWeb",
        prazo: vencimento(competencia, 15),
        base: "Débitos confessados de PIS/COFINS",
        situacao: "Pendente",
      },
    ],
    guias: [
      { nome: "DARF PIS", codigo: naoCumulativo ? "6912" : "8109", valor: pisPagar, vencimento: vencimento(competencia, 25) },
      { nome: "DARF COFINS", codigo: naoCumulativo ? "5856" : "2172", valor: cofinsPagar, vencimento: vencimento(competencia, 25) },
    ],
    resumo: [
      { label: "Regime de apuração", valor: naoCumulativo ? "Não cumulativo" : "Cumulativo" },
      { label: "Receita bruta", valor: rs(receitaTotal) },
      { label: "Exclusões", valor: rs(exclusoesDoc + exclusoesManuais) },
      { label: "Adições", valor: rs(adicoes) },
      { label: "Base de cálculo", valor: rs(baseFinal) },
      { label: "PIS a recolher", valor: rs(pisPagar) },
      { label: "COFINS a recolher", valor: rs(cofinsPagar) },
      { label: "Total da competência", valor: rs(total) },
    ],
    totalImposto: total,
  };
}

/* ================================ MOTOR ISS ============================= */

export function apurarIss(
  empresaId: string | null,
  competencia: string,
  estado: ApuracaoEstado,
): Apuracao {
  const regime = regimeDaEmpresa(empresaId);
  const prestados = docsValidos("servicos-prestados", empresaId, competencia);
  const tomados = docsValidos("servicos-tomados", empresaId, competencia);

  const documentos: LinhaDoc[] = [];

  prestados.forEach((d) => {
    const contabil = valorBR(d.valor);
    const iss = valorBR(d.iss);
    const retido = valorBR(d.issRetido);
    const proprio = Math.max(0, iss - retido);
    documentos.push({
      id: d.id,
      data: d.data ?? "—",
      documento: d.numero ?? "—",
      participante: d.participante ?? "—",
      modelo: "NFS-e",
      cfop: "5933",
      cst: retido > 0 ? "Retido na fonte" : "Tributado no município",
      natureza: d.tipo ?? "Serviço prestado",
      contabil,
      base: contabil,
      aliquota: d.aliquota ?? "—",
      imposto: iss,
      credito: retido,
      debito: proprio,
      status: "Considerado",
      origem: `ISS próprio — ${d.municipio ?? "—"}`,
      memoria: memoria(
        retido > 0
          ? "SE ISS retido pelo tomador ENTÃO não gerar débito de ISS próprio sobre a parcela retida"
          : "SE serviço tributado no município do prestador ENTÃO gerar ISS próprio",
        "LC 116/2003 e legislação municipal",
        "ISS próprio = (Base × alíquota) − ISS retido",
        [
          { label: "Base do serviço", valor: rs(contabil) },
          { label: "Alíquota municipal", valor: d.aliquota ?? "—" },
          { label: "ISS calculado", valor: rs(iss) },
          { label: "ISS retido pelo tomador", valor: rs(retido) },
          { label: "ISS próprio", valor: rs(proprio) },
        ],
      ),
    });
  });

  tomados.forEach((d) => {
    const contabil = valorBR(d.valor);
    const retido = valorBR(d.issRetido);
    documentos.push({
      id: d.id,
      data: d.data ?? "—",
      documento: d.numero ?? "—",
      participante: d.participante ?? "—",
      modelo: "NFS-e tomada",
      cfop: "1933",
      cst: retido > 0 ? "Responsável tributário" : "Sem retenção",
      natureza: d.tipo ?? "Serviço tomado",
      contabil,
      base: retido > 0 ? contabil : 0,
      aliquota: retido > 0 ? pct(contabil ? retido / contabil : 0) : "—",
      imposto: retido,
      credito: 0,
      debito: retido,
      status: retido > 0 ? "Considerado" : "Excluído",
      origem: `ISS tomado — ${d.municipio ?? "—"}`,
      memoria: memoria(
        retido > 0
          ? "SE tomador é responsável tributário ENTÃO recolher ISS retido do prestador"
          : "SE prestador recolhe o ISS ENTÃO não há responsabilidade do tomador",
        "LC 116/2003, art. 6º",
        "ISS retido = Base × alíquota municipal",
        [
          { label: "Valor do serviço", valor: rs(contabil) },
          { label: "ISS retido", valor: rs(retido) },
        ],
      ),
    });
  });

  const municipios = new Map<string, { base: number; proprio: number; retido: number }>();
  prestados.forEach((d) => {
    const m = d.municipio ?? "Não informado";
    const cur = municipios.get(m) ?? { base: 0, proprio: 0, retido: 0 };
    cur.base += valorBR(d.valor);
    cur.retido += valorBR(d.issRetido);
    cur.proprio += Math.max(0, valorBR(d.iss) - valorBR(d.issRetido));
    municipios.set(m, cur);
  });

  const issProprio = Math.max(
    0,
    [...municipios.values()].reduce((s, m) => s + m.proprio, 0) +
      ajustesTotal(estado.ajustes, ["Adição"]) -
      ajustesTotal(estado.ajustes, ["Exclusão", "Compensação"]),
  );
  const issRetidoTerceiros = tomados.reduce((s, d) => s + valorBR(d.issRetido), 0);
  const issSofrido = prestados.reduce((s, d) => s + valorBR(d.issRetido), 0);
  const total = issProprio + issRetidoTerceiros;

  const calculos: LinhaCalculo[] = [
    ...[...municipios.entries()].map(([m, v]) => ({
      id: `mun-${m}`,
      descricao: `ISS próprio — ${m}`,
      base: v.base,
      aliquota: v.base ? pct((v.proprio + v.retido) / v.base) : "—",
      valor: v.proprio,
      grupo: "Débito" as const,
      memoria: memoria(
        "SE município = " + m + " ENTÃO aplicar alíquota da legislação local",
        "LC 116/2003 + Código Tributário Municipal",
        "ISS = Base × alíquota − retenções",
        [
          { label: "Base do município", valor: rs(v.base) },
          { label: "Retido na fonte", valor: rs(v.retido) },
          { label: "ISS próprio", valor: rs(v.proprio) },
        ],
      ),
    })),
    {
      id: "iss-tomado",
      descricao: "ISS retido de prestadores (responsabilidade tributária)",
      base: tomados.reduce((s, d) => s + valorBR(d.valor), 0),
      aliquota: "—",
      valor: issRetidoTerceiros,
      grupo: "Retenção",
      memoria: memoria(
        "SE serviço tomado com retenção ENTÃO recolher em nome do tomador",
        "LC 116/2003, art. 6º",
        "Σ ISS retido dos documentos tomados",
        [{ label: "ISS retido", valor: rs(issRetidoTerceiros) }],
      ),
    },
    {
      id: "iss-sofrido",
      descricao: "ISS sofrido pelo grupo (retido por tomadores)",
      base: 0,
      aliquota: "—",
      valor: issSofrido,
      grupo: "Crédito",
      memoria: memoria(
        "SE tomador reteve o ISS ENTÃO abater do ISS próprio do município",
        "LC 116/2003",
        "Σ ISS retido nas notas emitidas",
        [{ label: "ISS retido por tomadores", valor: rs(issSofrido) }],
      ),
    },
  ];

  const inc = pendencias(["servicos-prestados", "servicos-tomados"], empresaId, competencia);
  const semMunicipio = prestados.filter((d) => !d.municipio).length;
  if (semMunicipio)
    inc.push({
      id: "sem-municipio",
      titulo: `${semMunicipio} nota(s) sem município de incidência`,
      detalhe: "Sem município não é possível determinar alíquota nem gerar a guia.",
      gravidade: "crítica",
      destino: "/fiscal/documentos/servicos-prestados",
    });

  return {
    motor: "iss",
    regime,
    kpis: [
      { label: "Notas de serviço", valor: String(documentos.length) },
      { label: "Municípios", valor: String(municipios.size) },
      { label: "Base de serviços", valor: rs([...municipios.values()].reduce((s, m) => s + m.base, 0)) },
      { label: "ISS próprio", valor: rs(issProprio) },
      { label: "ISS retido de terceiros", valor: rs(issRetidoTerceiros) },
      { label: "ISS sofrido", valor: rs(issSofrido) },
      { label: "Total a recolher", valor: rs(total), destaque: true },
      { label: "Pendências", valor: String(inc.length) },
    ],
    documentos,
    calculos,
    inconsistencias: inc,
    obrigacoes: [
      { nome: "Declaração municipal (DES / NFS-e)", prazo: vencimento(competencia, 10), base: "Serviços prestados e tomados", situacao: "Pendente" },
      { nome: "EFD-Reinf — série R-4000", prazo: vencimento(competencia, 15), base: "Retenções de terceiros", situacao: "Pendente" },
    ],
    guias: [
      ...[...municipios.entries()].map(([m, v]) => ({
        nome: `Guia de ISS — ${m}`,
        codigo: "ISS próprio",
        valor: v.proprio,
        vencimento: vencimento(competencia, 10),
      })),
      { nome: "Guia de ISS retido", codigo: "ISS terceiros", valor: issRetidoTerceiros, vencimento: vencimento(competencia, 10) },
    ],
    resumo: [
      { label: "Notas emitidas", valor: String(prestados.length) },
      { label: "Notas tomadas", valor: String(tomados.length) },
      { label: "ISS próprio", valor: rs(issProprio) },
      { label: "ISS retido de terceiros", valor: rs(issRetidoTerceiros) },
      { label: "ISS sofrido (abatido)", valor: rs(issSofrido) },
      { label: "Total das guias", valor: rs(total) },
    ],
    totalImposto: total,
  };
}

/* ============================ MOTOR IRPJ/CSLL =========================== */

export function apurarIrpjCsll(
  empresaId: string | null,
  competencia: string,
  estado: ApuracaoEstado,
): Apuracao {
  const regime = regimeDaEmpresa(empresaId);
  const real = regime === "Lucro Real";

  const saidas = docsValidos("saidas", empresaId, competencia);
  const cupons = docsValidos("cupons", empresaId, competencia);
  const servicos = docsValidos("servicos-prestados", empresaId, competencia);
  const entradas = docsValidos("entradas", empresaId, competencia);
  const tomados = docsValidos("servicos-tomados", empresaId, competencia);

  const receitaMercadorias =
    saidas.filter((d) => !CFOP_ST.includes(d.cfop ?? "")).reduce((s, d) => s + valorBR(d.valor), 0) +
    cupons.reduce((s, d) => s + valorBR(d.valor), 0);
  const receitaServicos = servicos.reduce((s, d) => s + valorBR(d.valor), 0);
  const custos =
    entradas.reduce((s, d) => s + valorBR(d.valor), 0) +
    tomados.reduce((s, d) => s + valorBR(d.valor), 0);

  const adicoes = ajustesTotal(estado.ajustes, ["Adição"]);
  const exclusoes = ajustesTotal(estado.ajustes, ["Exclusão"]);
  const compensacoes = ajustesTotal(estado.ajustes, ["Compensação"]);

  const presIrpjMerc = 0.08;
  const presIrpjServ = 0.32;
  const presCsllMerc = 0.12;
  const presCsllServ = 0.32;

  const lucroContabil = receitaMercadorias + receitaServicos - custos;
  const lalur = lucroContabil + adicoes - exclusoes;
  const limitePrejuizo = Math.max(0, lalur) * 0.3;
  const prejuizoCompensado = Math.min(compensacoes, limitePrejuizo);

  const baseIrpj = real
    ? Math.max(0, lalur - prejuizoCompensado)
    : receitaMercadorias * presIrpjMerc + receitaServicos * presIrpjServ;
  const baseCsll = real
    ? Math.max(0, lalur - prejuizoCompensado)
    : receitaMercadorias * presCsllMerc + receitaServicos * presCsllServ;

  const irpj = baseIrpj * 0.15;
  const excedente = Math.max(0, baseIrpj - 20_000);
  const adicional = excedente * 0.1;
  const csll = baseCsll * 0.09;

  const irrfSofrido = servicos.reduce((s, d) => s + valorBR(d.irrf), 0);
  const csllRetida = servicos.reduce((s, d) => s + valorBR(d.pccss) * (1 / 4.65), 0);

  const irpjPagar = Math.max(0, irpj + adicional - irrfSofrido);
  const csllPagar = Math.max(0, csll - csllRetida);
  const total = irpjPagar + csllPagar;

  const documentos: LinhaDoc[] = [
    ...saidas.map<LinhaDoc>((d) => ({
      id: d.id,
      data: d.data ?? "—",
      documento: d.numero ?? "—",
      participante: d.participante ?? "—",
      modelo: "NF-e 55",
      cfop: d.cfop ?? "—",
      cst: "Receita de venda",
      natureza: d.tipo ?? "Venda",
      contabil: valorBR(d.valor),
      base: real ? valorBR(d.valor) : valorBR(d.valor) * presIrpjMerc,
      aliquota: real ? "—" : pct(presIrpjMerc),
      imposto: real ? 0 : valorBR(d.valor) * presIrpjMerc * 0.15,
      credito: 0,
      debito: real ? 0 : valorBR(d.valor) * presIrpjMerc * 0.15,
      status: CFOP_ST.includes(d.cfop ?? "") ? "Excluído" : "Considerado",
      origem: "Receita de mercadorias",
      memoria: memoria(
        real
          ? "SE regime = Lucro Real ENTÃO compor o resultado contábil"
          : "SE regime = Lucro Presumido E receita = mercadorias ENTÃO presunção de 8% (IRPJ) e 12% (CSLL)",
        "Lei 9.249/1995, art. 15 e 20",
        real ? "Resultado = Receitas − Custos ± LALUR" : "Base = Receita × presunção",
        [
          { label: "Receita do documento", valor: rs(valorBR(d.valor)) },
          { label: "Presunção IRPJ", valor: real ? "—" : pct(presIrpjMerc) },
        ],
      ),
    })),
    ...servicos.map<LinhaDoc>((d) => ({
      id: d.id,
      data: d.data ?? "—",
      documento: d.numero ?? "—",
      participante: d.participante ?? "—",
      modelo: "NFS-e",
      cfop: "5933",
      cst: "Receita de serviços",
      natureza: d.tipo ?? "Serviço",
      contabil: valorBR(d.valor),
      base: real ? valorBR(d.valor) : valorBR(d.valor) * presIrpjServ,
      aliquota: real ? "—" : pct(presIrpjServ),
      imposto: real ? 0 : valorBR(d.valor) * presIrpjServ * 0.15,
      credito: valorBR(d.irrf),
      debito: real ? 0 : valorBR(d.valor) * presIrpjServ * 0.15,
      status: "Considerado",
      origem: "Receita de serviços",
      memoria: memoria(
        "SE receita = serviços ENTÃO presunção de 32% para IRPJ e CSLL",
        "Lei 9.249/1995, art. 15, §1º, III",
        "Base = Receita de serviços × 32%",
        [
          { label: "Receita do serviço", valor: rs(valorBR(d.valor)) },
          { label: "IRRF retido pelo tomador", valor: rs(valorBR(d.irrf)) },
        ],
      ),
    })),
    ...entradas.map<LinhaDoc>((d) => ({
      id: d.id,
      data: d.data ?? "—",
      documento: d.numero ?? "—",
      participante: d.participante ?? "—",
      modelo: "NF-e 55",
      cfop: d.cfop ?? "—",
      cst: "Custo/despesa",
      natureza: d.tipo ?? "Aquisição",
      contabil: valorBR(d.valor),
      base: real ? valorBR(d.valor) : 0,
      aliquota: "—",
      imposto: 0,
      credito: real ? valorBR(d.valor) : 0,
      debito: 0,
      status: real ? "Considerado" : "Excluído",
      origem: "Custos e despesas",
      memoria: memoria(
        real
          ? "SE regime = Lucro Real ENTÃO custos e despesas necessárias reduzem o resultado"
          : "SE regime = Lucro Presumido ENTÃO custos não influenciam a base presumida",
        "RIR/2018, art. 311",
        real ? "Resultado −= Custo" : "Sem efeito na base presumida",
        [{ label: "Valor do documento", valor: rs(valorBR(d.valor)) }],
      ),
    })),
  ];

  const calculos: LinhaCalculo[] = [
    { id: "rec-merc", descricao: "Receita de mercadorias", base: receitaMercadorias, aliquota: "—", valor: receitaMercadorias, grupo: "Resultado", memoria: memoria("Σ notas de saída e cupons", "Lei 12.973/2014", "Σ receitas", [{ label: "Receita", valor: rs(receitaMercadorias) }]) },
    { id: "rec-serv", descricao: "Receita de serviços", base: receitaServicos, aliquota: "—", valor: receitaServicos, grupo: "Resultado", memoria: memoria("Σ NFS-e emitidas", "Lei 12.973/2014", "Σ receitas", [{ label: "Receita", valor: rs(receitaServicos) }]) },
    ...(real
      ? [
          { id: "custos", descricao: "Custos e despesas dedutíveis", base: custos, aliquota: "—", valor: custos, grupo: "Crédito" as const, memoria: memoria("SE despesa necessária ENTÃO dedutível", "RIR/2018, art. 311", "Σ entradas + serviços tomados", [{ label: "Custos", valor: rs(custos) }]) },
          { id: "lucro", descricao: "Resultado contábil antes do LALUR", base: 0, aliquota: "—", valor: lucroContabil, grupo: "Resultado" as const, memoria: memoria("Resultado = Receitas − Custos", "CPC 00", "Receitas − Custos", [{ label: "Resultado", valor: rs(lucroContabil) }]) },
          { id: "adicoes", descricao: "Adições (LALUR parte A)", base: 0, aliquota: "—", valor: adicoes, grupo: "Débito" as const, memoria: memoria("SE despesa indedutível ENTÃO adicionar ao lucro real", "RIR/2018, art. 260", "Σ ajustes de adição", [{ label: "Adições", valor: rs(adicoes) }]) },
          { id: "exclusoes", descricao: "Exclusões (LALUR parte A)", base: 0, aliquota: "—", valor: exclusoes, grupo: "Exclusão" as const, memoria: memoria("SE receita não tributável ENTÃO excluir", "RIR/2018, art. 261", "Σ ajustes de exclusão", [{ label: "Exclusões", valor: rs(exclusoes) }]) },
          { id: "prejuizo", descricao: "Compensação de prejuízo fiscal (trava de 30%)", base: limitePrejuizo, aliquota: "30%", valor: prejuizoCompensado, grupo: "Exclusão" as const, memoria: memoria("SE há prejuízo acumulado ENTÃO compensar até 30% do lucro real", "Lei 9.065/1995, art. 15", "Compensação = min(saldo; 30% × lucro real)", [{ label: "Limite (30%)", valor: rs(limitePrejuizo) }, { label: "Compensado", valor: rs(prejuizoCompensado) }]) },
        ]
      : []),
    { id: "base-irpj", descricao: "Base de cálculo do IRPJ", base: baseIrpj, aliquota: real ? "—" : "8% / 32%", valor: baseIrpj, grupo: "Resultado", memoria: memoria(real ? "Lucro real ajustado" : "SE Lucro Presumido ENTÃO base = Σ receita × presunção", "Lei 9.249/1995, art. 15", real ? "LALUR − compensações" : "Mercadorias × 8% + Serviços × 32%", [{ label: "Base", valor: rs(baseIrpj) }]) },
    { id: "irpj", descricao: "IRPJ (15%)", base: baseIrpj, aliquota: "15,00%", valor: irpj, grupo: "Débito", memoria: memoria("Alíquota geral do IRPJ", "Lei 9.249/1995, art. 3º", "IRPJ = Base × 15%", [{ label: "Base", valor: rs(baseIrpj) }]) },
    { id: "adicional", descricao: "Adicional de IRPJ (10% sobre o que exceder R$ 20.000/mês)", base: excedente, aliquota: "10,00%", valor: adicional, grupo: "Débito", memoria: memoria("SE base > R$ 20.000 no mês ENTÃO adicional de 10%", "Lei 9.249/1995, art. 3º, §1º", "Adicional = (Base − 20.000) × 10%", [{ label: "Excedente", valor: rs(excedente) }]) },
    { id: "base-csll", descricao: "Base de cálculo da CSLL", base: baseCsll, aliquota: real ? "—" : "12% / 32%", valor: baseCsll, grupo: "Resultado", memoria: memoria(real ? "Lucro real ajustado" : "SE Lucro Presumido ENTÃO 12% mercadorias e 32% serviços", "Lei 9.249/1995, art. 20", real ? "LALUR/LACS" : "Mercadorias × 12% + Serviços × 32%", [{ label: "Base", valor: rs(baseCsll) }]) },
    { id: "csll", descricao: "CSLL (9%)", base: baseCsll, aliquota: "9,00%", valor: csll, grupo: "Débito", memoria: memoria("Alíquota geral da CSLL", "Lei 7.689/1988", "CSLL = Base × 9%", [{ label: "Base", valor: rs(baseCsll) }]) },
    { id: "irrf", descricao: "IRRF sofrido (compensável)", base: 0, aliquota: "—", valor: irrfSofrido, grupo: "Crédito", memoria: memoria("SE houve retenção na fonte ENTÃO compensar com o imposto devido", "IN RFB 1.234/2012", "Σ IRRF retido nas NFS-e", [{ label: "IRRF", valor: rs(irrfSofrido) }]) },
    { id: "csll-ret", descricao: "CSLL retida (compensável)", base: 0, aliquota: "—", valor: csllRetida, grupo: "Crédito", memoria: memoria("SE houve CSRF ENTÃO compensar a parcela de CSLL (1%)", "Lei 10.833/2003, art. 30", "PCC × 1/4,65", [{ label: "CSLL retida", valor: rs(csllRetida) }]) },
    { id: "irpj-pagar", descricao: "IRPJ a recolher", base: baseIrpj, aliquota: "—", valor: irpjPagar, grupo: "Resultado", memoria: memoria("IRPJ − retenções", "RIR/2018", "IRPJ + Adicional − IRRF", [{ label: "A recolher", valor: rs(irpjPagar) }]) },
    { id: "csll-pagar", descricao: "CSLL a recolher", base: baseCsll, aliquota: "—", valor: csllPagar, grupo: "Resultado", memoria: memoria("CSLL − retenções", "Lei 7.689/1988", "CSLL − CSLL retida", [{ label: "A recolher", valor: rs(csllPagar) }]) },
  ];

  const inc = pendencias(["saidas", "servicos-prestados", "entradas"], empresaId, competencia);
  if (regime === "Simples Nacional")
    inc.push({
      id: "regime-simples",
      titulo: "Empresa no Simples Nacional",
      detalhe: "IRPJ e CSLL estão no DAS — apure pelo motor do Simples Nacional.",
      gravidade: "atenção",
      destino: "/fiscal/apuracoes/simples-nacional",
    });

  return {
    motor: "irpj-csll",
    regime,
    kpis: [
      { label: "Documentos", valor: String(documentos.length) },
      { label: "Receita total", valor: rs(receitaMercadorias + receitaServicos) },
      { label: real ? "Lucro real ajustado" : "Base presumida IRPJ", valor: rs(baseIrpj) },
      { label: "Créditos (retenções)", valor: rs(irrfSofrido + csllRetida) },
      { label: "IRPJ + adicional", valor: rs(irpj + adicional) },
      { label: "CSLL", valor: rs(csll) },
      { label: "Total a recolher", valor: rs(total), destaque: true },
      { label: "Pendências", valor: String(inc.length) },
    ],
    documentos,
    calculos,
    inconsistencias: inc,
    obrigacoes: [
      { nome: "DCTFWeb", prazo: vencimento(competencia, 15), base: "IRPJ e CSLL confessados", situacao: "Pendente" },
      { nome: real ? "ECF — LALUR/LACS eletrônico" : "ECF — Lucro Presumido", prazo: "31/07/2027", base: "Ano-calendário 2026", situacao: "Em formação" },
    ],
    guias: [
      { nome: "DARF IRPJ", codigo: real ? "2362" : "2089", valor: irpjPagar, vencimento: vencimento(competencia, 30) },
      { nome: "DARF CSLL", codigo: real ? "2484" : "2372", valor: csllPagar, vencimento: vencimento(competencia, 30) },
    ],
    resumo: [
      { label: "Regime reconhecido", valor: regime },
      { label: "Forma de apuração", valor: real ? "Lucro Real (LALUR/LACS)" : "Lucro Presumido" },
      { label: "Receita de mercadorias", valor: rs(receitaMercadorias) },
      { label: "Receita de serviços", valor: rs(receitaServicos) },
      { label: "Base IRPJ", valor: rs(baseIrpj) },
      { label: "Base CSLL", valor: rs(baseCsll) },
      { label: "IRPJ + adicional", valor: rs(irpj + adicional) },
      { label: "CSLL", valor: rs(csll) },
      { label: "Total a recolher", valor: rs(total) },
    ],
    totalImposto: total,
  };
}

/* ========================= MOTOR SIMPLES NACIONAL ======================= */

type Faixa = { ate: number; aliq: number; deduzir: number };

export const ANEXO_I: Faixa[] = [
  { ate: 180_000, aliq: 0.04, deduzir: 0 },
  { ate: 360_000, aliq: 0.073, deduzir: 5_940 },
  { ate: 720_000, aliq: 0.095, deduzir: 13_860 },
  { ate: 1_800_000, aliq: 0.107, deduzir: 22_500 },
  { ate: 3_600_000, aliq: 0.143, deduzir: 87_300 },
  { ate: 4_800_000, aliq: 0.19, deduzir: 378_000 },
];
export const ANEXO_III: Faixa[] = [
  { ate: 180_000, aliq: 0.06, deduzir: 0 },
  { ate: 360_000, aliq: 0.112, deduzir: 9_360 },
  { ate: 720_000, aliq: 0.135, deduzir: 17_640 },
  { ate: 1_800_000, aliq: 0.16, deduzir: 35_640 },
  { ate: 3_600_000, aliq: 0.21, deduzir: 125_640 },
  { ate: 4_800_000, aliq: 0.33, deduzir: 648_000 },
];
export const ANEXO_V: Faixa[] = [
  { ate: 180_000, aliq: 0.155, deduzir: 0 },
  { ate: 360_000, aliq: 0.18, deduzir: 4_500 },
  { ate: 720_000, aliq: 0.195, deduzir: 9_900 },
  { ate: 1_800_000, aliq: 0.205, deduzir: 17_100 },
  { ate: 3_600_000, aliq: 0.23, deduzir: 62_100 },
  { ate: 4_800_000, aliq: 0.305, deduzir: 540_000 },
];

export function faixaDe(tabela: Faixa[], rbt12: number) {
  return tabela.find((f) => rbt12 <= f.ate) ?? tabela[tabela.length - 1];
}

export function apurarSimples(
  empresaId: string | null,
  competencia: string,
  estado: ApuracaoEstado,
): Apuracao {
  const regime = regimeDaEmpresa(empresaId);
  const saidas = docsValidos("saidas", empresaId, competencia);
  const cupons = docsValidos("cupons", empresaId, competencia);
  const servicos = docsValidos("servicos-prestados", empresaId, competencia);

  const receitaComercio =
    saidas.reduce((s, d) => s + valorBR(d.valor), 0) + cupons.reduce((s, d) => s + valorBR(d.valor), 0);
  const receitaServicos = servicos.reduce((s, d) => s + valorBR(d.valor), 0);
  const receitaBruta = receitaComercio + receitaServicos;

  const receitaST = saidas
    .filter((d) => CFOP_ST.includes(d.cfop ?? ""))
    .reduce((s, d) => s + valorBR(d.valor), 0);
  const receitaExportacao = saidas
    .filter((d) => CFOP_EXPORTACAO.includes(d.cfop ?? ""))
    .reduce((s, d) => s + valorBR(d.valor), 0);
  const receitaMonofasica = ajustesTotal(estado.ajustes, ["Exclusão"]);

  const rbt12Param = valorBR(estado.parametros.rbt12 ?? "");
  const rbt12 = rbt12Param > 0 ? rbt12Param : receitaBruta * 12;
  const folha12 = valorBR(estado.parametros.folha12 ?? "");
  const fatorR = rbt12 > 0 ? folha12 / rbt12 : 0;
  const anexoServicos = fatorR >= 0.28 ? "III" : "V";
  const tabelaServ = anexoServicos === "III" ? ANEXO_III : ANEXO_V;

  const efetiva = (tab: Faixa[]) => {
    const f = faixaDe(tab, rbt12);
    const e = rbt12 > 0 ? (rbt12 * f.aliq - f.deduzir) / rbt12 : f.aliq;
    return { faixa: f, efetiva: Math.max(0, e) };
  };

  const com = efetiva(ANEXO_I);
  const serv = efetiva(tabelaServ);

  const baseComercio = Math.max(0, receitaComercio - receitaST - receitaExportacao - receitaMonofasica);
  const dasComercio = baseComercio * com.efetiva;
  const dasServicos = receitaServicos * serv.efetiva;
  const total = dasComercio + dasServicos;

  const documentos: LinhaDoc[] = [
    ...saidas.map<LinhaDoc>((d) => {
      const v = valorBR(d.valor);
      const st = CFOP_ST.includes(d.cfop ?? "");
      const exp = CFOP_EXPORTACAO.includes(d.cfop ?? "");
      return {
        id: d.id,
        data: d.data ?? "—",
        documento: d.numero ?? "—",
        participante: d.participante ?? "—",
        modelo: "NF-e 55",
        cfop: d.cfop ?? "—",
        cst: st ? "ST — segregada" : exp ? "Exportação" : "Tributada Anexo I",
        natureza: d.tipo ?? "Venda",
        contabil: v,
        base: st || exp ? 0 : v,
        aliquota: st || exp ? "—" : pct(com.efetiva),
        imposto: st || exp ? 0 : v * com.efetiva,
        credito: 0,
        debito: st || exp ? 0 : v * com.efetiva,
        status: st || exp ? "Excluído" : "Considerado",
        origem: "Anexo I — Comércio",
        memoria: memoria(
          st
            ? "SE receita sujeita a ICMS-ST ENTÃO segregar a parcela de ICMS do DAS"
            : exp
              ? "SE receita de exportação ENTÃO segregar PIS/COFINS/ICMS/ISS"
              : "SE receita de comércio ENTÃO Anexo I com alíquota efetiva",
          "LC 123/2006, art. 18 e §§",
          "DAS = Receita segregada × alíquota efetiva",
          [
            { label: "Receita do documento", valor: rs(v) },
            { label: "Alíquota efetiva", valor: pct(com.efetiva) },
          ],
        ),
      };
    }),
    ...servicos.map<LinhaDoc>((d) => {
      const v = valorBR(d.valor);
      return {
        id: d.id,
        data: d.data ?? "—",
        documento: d.numero ?? "—",
        participante: d.participante ?? "—",
        modelo: "NFS-e",
        cfop: "5933",
        cst: `Tributada Anexo ${anexoServicos}`,
        natureza: d.tipo ?? "Serviço",
        contabil: v,
        base: v,
        aliquota: pct(serv.efetiva),
        imposto: v * serv.efetiva,
        credito: valorBR(d.issRetido),
        debito: v * serv.efetiva,
        status: "Considerado",
        origem: `Anexo ${anexoServicos} — Serviços`,
        memoria: memoria(
          `SE Fator R ${fatorR >= 0.28 ? "≥" : "<"} 28% ENTÃO tributar pelo Anexo ${anexoServicos}`,
          "LC 123/2006, art. 18, §5º-J e §5º-M",
          "Fator R = Folha 12m ÷ RBT12",
          [
            { label: "Fator R", valor: pct(fatorR) },
            { label: "Alíquota efetiva", valor: pct(serv.efetiva) },
            { label: "DAS do documento", valor: rs(v * serv.efetiva) },
          ],
        ),
      };
    }),
  ];

  const calculos: LinhaCalculo[] = [
    { id: "rb", descricao: "Receita bruta do mês (PA)", base: receitaBruta, aliquota: "—", valor: receitaBruta, grupo: "Resultado", memoria: memoria("Σ receitas do período de apuração", "LC 123/2006, art. 3º", "Σ documentos de receita", [{ label: "Receita", valor: rs(receitaBruta) }]) },
    { id: "rbt12", descricao: "RBT12 — receita dos últimos 12 meses", base: rbt12, aliquota: "—", valor: rbt12, grupo: "Resultado", memoria: memoria(rbt12Param > 0 ? "RBT12 informado nos parâmetros" : "RBT12 estimado por projeção da receita do mês", "LC 123/2006, art. 18", rbt12Param > 0 ? "Parâmetro informado" : "Receita do mês × 12", [{ label: "RBT12", valor: rs(rbt12) }]) },
    { id: "fator-r", descricao: `Fator R — define Anexo III ou V (atual: Anexo ${anexoServicos})`, base: folha12, aliquota: pct(fatorR), valor: fatorR, grupo: "Resultado", memoria: memoria("SE Fator R ≥ 28% ENTÃO Anexo III SENÃO Anexo V", "LC 123/2006, art. 18, §5º-J", "Fator R = Folha 12 meses ÷ RBT12", [{ label: "Folha 12 meses", valor: rs(folha12) }, { label: "RBT12", valor: rs(rbt12) }, { label: "Fator R", valor: pct(fatorR) }]) },
    { id: "seg-st", descricao: "Receita segregada — ICMS-ST", base: receitaST, aliquota: "—", valor: receitaST, grupo: "Exclusão", memoria: memoria("SE ICMS já retido por ST ENTÃO segregar do DAS", "LC 123/2006, art. 18, §4º-A", "Σ receitas com CFOP de ST", [{ label: "Receita ST", valor: rs(receitaST) }]) },
    { id: "seg-mono", descricao: "Receita segregada — monofásica", base: receitaMonofasica, aliquota: "—", valor: receitaMonofasica, grupo: "Exclusão", memoria: memoria("SE receita monofásica ENTÃO excluir PIS/COFINS do DAS", "LC 123/2006, art. 18, §4º-A, IV", "Ajustes de exclusão informados", [{ label: "Monofásica", valor: rs(receitaMonofasica) }]) },
    { id: "seg-exp", descricao: "Receita segregada — exportação", base: receitaExportacao, aliquota: "—", valor: receitaExportacao, grupo: "Exclusão", memoria: memoria("SE receita de exportação ENTÃO isenção de PIS/COFINS/ICMS/ISS", "LC 123/2006, art. 18, §14", "Σ CFOP 7101/7102", [{ label: "Exportação", valor: rs(receitaExportacao) }]) },
    { id: "das-com", descricao: `DAS — Anexo I (faixa até ${rs(com.faixa.ate)})`, base: baseComercio, aliquota: pct(com.efetiva), valor: dasComercio, grupo: "Débito", memoria: memoria("SE receita de comércio ENTÃO Anexo I", "LC 123/2006, Anexo I", "Efetiva = (RBT12 × alíquota − PD) ÷ RBT12", [{ label: "Alíquota nominal", valor: pct(com.faixa.aliq) }, { label: "Parcela a deduzir", valor: rs(com.faixa.deduzir) }, { label: "Alíquota efetiva", valor: pct(com.efetiva) }, { label: "DAS", valor: rs(dasComercio) }]) },
    { id: "das-serv", descricao: `DAS — Anexo ${anexoServicos} (faixa até ${rs(serv.faixa.ate)})`, base: receitaServicos, aliquota: pct(serv.efetiva), valor: dasServicos, grupo: "Débito", memoria: memoria(`SE Fator R define Anexo ${anexoServicos} ENTÃO aplicar tabela correspondente`, `LC 123/2006, Anexo ${anexoServicos}`, "Efetiva = (RBT12 × alíquota − PD) ÷ RBT12", [{ label: "Alíquota nominal", valor: pct(serv.faixa.aliq) }, { label: "Parcela a deduzir", valor: rs(serv.faixa.deduzir) }, { label: "Alíquota efetiva", valor: pct(serv.efetiva) }, { label: "DAS", valor: rs(dasServicos) }]) },
    { id: "das-total", descricao: "DAS total da competência", base: baseComercio + receitaServicos, aliquota: "—", valor: total, grupo: "Resultado", memoria: memoria("Soma das parcelas por anexo", "LC 123/2006", "DAS = Σ (Receita × efetiva)", [{ label: "Total", valor: rs(total) }]) },
  ];

  const inc = pendencias(["saidas", "servicos-prestados", "cupons"], empresaId, competencia);
  if (regime !== "Simples Nacional")
    inc.push({
      id: "regime-nao-simples",
      titulo: `Empresa está no regime ${regime}`,
      detalhe: "Este motor só gera DAS para optantes do Simples Nacional.",
      gravidade: "atenção",
      destino: "/fiscal/apuracoes/irpj-csll",
    });
  if (rbt12Param <= 0)
    inc.push({
      id: "rbt12",
      titulo: "RBT12 não informado nos parâmetros",
      detalhe: "Sem o RBT12 real a alíquota efetiva é estimada projetando a receita do mês.",
      gravidade: "atenção",
    });
  if (folha12 <= 0 && receitaServicos > 0)
    inc.push({
      id: "folha",
      titulo: "Folha dos últimos 12 meses não informada",
      detalhe: "Sem folha o Fator R fica em 0% e os serviços caem no Anexo V.",
      gravidade: "atenção",
    });

  return {
    motor: "simples-nacional",
    regime,
    kpis: [
      { label: "Documentos", valor: String(documentos.length) },
      { label: "Receita bruta (PA)", valor: rs(receitaBruta) },
      { label: "RBT12", valor: rs(rbt12) },
      { label: "Fator R", valor: pct(fatorR) },
      { label: "Anexo de serviços", valor: `Anexo ${anexoServicos}` },
      { label: "Receitas segregadas", valor: rs(receitaST + receitaExportacao + receitaMonofasica) },
      { label: "DAS do mês", valor: rs(total), destaque: true },
      { label: "Pendências", valor: String(inc.length) },
    ],
    documentos,
    calculos,
    inconsistencias: inc,
    obrigacoes: [
      { nome: "PGDAS-D", prazo: vencimento(competencia, 20), base: "Segregação de receitas do PA", situacao: estado.status === "Fechada" ? "Pronta para transmissão" : "Em edição" },
      { nome: "DEFIS", prazo: "31/03/2027", base: "Ano-calendário 2026", situacao: "Em formação" },
    ],
    guias: [{ nome: "DAS — Simples Nacional", codigo: "DAS", valor: total, vencimento: vencimento(competencia, 20) }],
    resumo: [
      { label: "Receita de comércio", valor: rs(receitaComercio) },
      { label: "Receita de serviços", valor: rs(receitaServicos) },
      { label: "Receita ST segregada", valor: rs(receitaST) },
      { label: "Receita monofásica", valor: rs(receitaMonofasica) },
      { label: "Receita de exportação", valor: rs(receitaExportacao) },
      { label: "Alíquota efetiva Anexo I", valor: pct(com.efetiva) },
      { label: `Alíquota efetiva Anexo ${anexoServicos}`, valor: pct(serv.efetiva) },
      { label: "DAS total", valor: rs(total) },
    ],
    totalImposto: total,
  };
}

/* ============================ MOTOR RETENÇÕES =========================== */

export function apurarRetencoes(
  empresaId: string | null,
  competencia: string,
  estado: ApuracaoEstado,
): Apuracao {
  const regime = regimeDaEmpresa(empresaId);
  const tomados = docsValidos("servicos-tomados", empresaId, competencia);
  const prestados = docsValidos("servicos-prestados", empresaId, competencia);

  const documentos: LinhaDoc[] = tomados.map((d) => {
    const v = valorBR(d.valor);
    const irrf = valorBR(d.irrf);
    const pcc = valorBR(d.pccss);
    const inss = valorBR(d.inss);
    const iss = valorBR(d.issRetido);
    const totalRet = irrf + pcc + inss + iss;
    return {
      id: d.id,
      data: d.data ?? "—",
      documento: d.numero ?? "—",
      participante: d.participante ?? "—",
      modelo: "NFS-e tomada",
      cfop: "1933",
      cst: totalRet > 0 ? "Com retenção" : "Sem retenção",
      natureza: d.tipo ?? "Serviço tomado",
      contabil: v,
      base: totalRet > 0 ? v : 0,
      aliquota: v ? pct(totalRet / v) : "—",
      imposto: totalRet,
      credito: 0,
      debito: totalRet,
      status: totalRet > 0 ? "Considerado" : "Excluído",
      origem: "Retenções efetuadas",
      memoria: memoria(
        "SE serviço sujeito a retenção ENTÃO reter e recolher em nome do prestador",
        "IN RFB 1.234/2012, Lei 10.833/2003 art. 30, IN RFB 2.110/2022",
        "Retido = IRRF 1,5% + CSRF 4,65% + INSS 11% + ISS municipal",
        [
          { label: "Valor do serviço", valor: rs(v) },
          { label: "IRRF", valor: rs(irrf) },
          { label: "CSRF (PIS/COFINS/CSLL)", valor: rs(pcc) },
          { label: "INSS", valor: rs(inss) },
          { label: "ISS retido", valor: rs(iss) },
          { label: "Total retido", valor: rs(totalRet) },
        ],
      ),
    };
  });

  const soma = (k: string, docs: DocFiscal[]) => docs.reduce((s, d) => s + valorBR(d[k]), 0);
  const irrf = soma("irrf", tomados);
  const pcc = soma("pccss", tomados);
  const inss = soma("inss", tomados);
  const issRet = soma("issRetido", tomados);
  const sofridoIrrf = soma("irrf", prestados);
  const sofridoIss = soma("issRetido", prestados);
  const total = irrf + pcc + inss + issRet;

  const parcela = (nome: string, valor: number, aliq: string, lei: string, codigo: string) => ({
    id: nome,
    descricao: `${nome} — retido de terceiros`,
    base: tomados.reduce((s, d) => s + valorBR(d.valor), 0),
    aliquota: aliq,
    valor,
    grupo: "Retenção" as const,
    memoria: memoria(
      `SE pagamento a pessoa jurídica por serviço sujeito a ${nome} ENTÃO reter ${aliq}`,
      lei,
      `${nome} = Base × ${aliq}`,
      [
        { label: "Base total", valor: rs(tomados.reduce((s, d) => s + valorBR(d.valor), 0)) },
        { label: "Código de receita", valor: codigo },
        { label: "Valor retido", valor: rs(valor) },
      ],
    ),
  });

  const calculos: LinhaCalculo[] = [
    parcela("IRRF", irrf, "1,50%", "IN RFB 1.234/2012, art. 3º", "1708"),
    parcela("CSRF (PIS/COFINS/CSLL)", pcc, "4,65%", "Lei 10.833/2003, art. 30", "5952"),
    parcela("INSS", inss, "11,00%", "IN RFB 2.110/2022, art. 109", "GPS 2631"),
    parcela("ISS retido", issRet, "municipal", "LC 116/2003, art. 6º", "Guia municipal"),
    {
      id: "sofridas",
      descricao: "Retenções sofridas pelo grupo (compensáveis)",
      base: prestados.reduce((s, d) => s + valorBR(d.valor), 0),
      aliquota: "—",
      valor: sofridoIrrf + sofridoIss,
      grupo: "Crédito",
      memoria: memoria(
        "SE o tomador reteve tributo ENTÃO compensar na apuração do período",
        "IN RFB 1.234/2012, art. 9º",
        "Σ retenções informadas nas notas emitidas",
        [
          { label: "IRRF sofrido", valor: rs(sofridoIrrf) },
          { label: "ISS sofrido", valor: rs(sofridoIss) },
        ],
      ),
    },
    {
      id: "total",
      descricao: "Total a recolher em nome de terceiros",
      base: 0,
      aliquota: "—",
      valor: total,
      grupo: "Resultado",
      memoria: memoria("Soma das retenções efetuadas", "—", "IRRF + CSRF + INSS + ISS", [
        { label: "Total", valor: rs(total) },
      ]),
    },
  ];

  const inc = pendencias(["servicos-tomados", "servicos-prestados"], empresaId, competencia);
  const semRetencao = tomados.filter(
    (d) => valorBR(d.valor) >= 5_000 && valorBR(d.irrf) + valorBR(d.pccss) === 0,
  ).length;
  if (semRetencao)
    inc.push({
      id: "sem-ret",
      titulo: `${semRetencao} documento(s) acima de R$ 5.000 sem retenção informada`,
      detalhe: "Confira se o serviço está na lista de retenção obrigatória de IRRF/CSRF.",
      gravidade: "atenção",
      destino: "/fiscal/documentos/servicos-tomados",
    });

  return {
    motor: "retencoes",
    regime,
    kpis: [
      { label: "Documentos", valor: String(documentos.length) },
      { label: "Base de retenção", valor: rs(tomados.reduce((s, d) => s + valorBR(d.valor), 0)) },
      { label: "IRRF", valor: rs(irrf) },
      { label: "CSRF", valor: rs(pcc) },
      { label: "INSS", valor: rs(inss) },
      { label: "ISS retido", valor: rs(issRet) },
      { label: "Total retido", valor: rs(total), destaque: true },
      { label: "Retenções sofridas", valor: rs(sofridoIrrf + sofridoIss) },
    ],
    documentos,
    calculos,
    inconsistencias: inc,
    obrigacoes: [
      { nome: "EFD-Reinf (R-2010/R-4020)", prazo: vencimento(competencia, 15), base: "Retenções de terceiros", situacao: "Pendente" },
      { nome: "DCTFWeb", prazo: vencimento(competencia, 15), base: "Confissão das retenções", situacao: "Pendente" },
    ],
    guias: [
      { nome: "DARF IRRF", codigo: "1708", valor: irrf, vencimento: vencimento(competencia, 20) },
      { nome: "DARF CSRF", codigo: "5952", valor: pcc, vencimento: vencimento(competencia, 20) },
      { nome: "GPS/DARF INSS", codigo: "2631", valor: inss, vencimento: vencimento(competencia, 20) },
      { nome: "Guia municipal — ISS retido", codigo: "ISS", valor: issRet, vencimento: vencimento(competencia, 10) },
    ],
    resumo: [
      { label: "Notas tomadas", valor: String(tomados.length) },
      { label: "IRRF retido", valor: rs(irrf) },
      { label: "CSRF retida", valor: rs(pcc) },
      { label: "INSS retido", valor: rs(inss) },
      { label: "ISS retido", valor: rs(issRet) },
      { label: "Total a recolher", valor: rs(total) },
      { label: "Retenções sofridas", valor: rs(sofridoIrrf + sofridoIss) },
    ],
    totalImposto: total,
  };
}

/* ------------------------------ despachante ----------------------------- */

export function apurar(
  motor: MotorSlug,
  empresaId: string | null,
  competencia: string,
  estado: ApuracaoEstado,
): Apuracao {
  switch (motor) {
    case "pis-cofins":
      return apurarPisCofins(empresaId, competencia, estado);
    case "iss":
      return apurarIss(empresaId, competencia, estado);
    case "irpj-csll":
      return apurarIrpjCsll(empresaId, competencia, estado);
    case "simples-nacional":
      return apurarSimples(empresaId, competencia, estado);
    case "retencoes":
      return apurarRetencoes(empresaId, competencia, estado);
  }
}

/* ------------------------------ catálogo -------------------------------- */

export const MOTORES: {
  slug: MotorSlug;
  titulo: string;
  descricao: string;
  submodulos: string[];
}[] = [
  {
    slug: "pis-cofins",
    titulo: "PIS / COFINS",
    descricao: "Regime cumulativo e não cumulativo, créditos, exclusões e EFD-Contribuições.",
    submodulos: ["Apuração mensal", "Créditos", "Ajustes", "Exclusões", "Base de cálculo", "CST", "Natureza da receita", "EFD-Contribuições", "Fechamento"],
  },
  {
    slug: "iss",
    titulo: "ISS",
    descricao: "ISS próprio, retido, tomado e prestado, com regra por município.",
    submodulos: ["ISS próprio", "ISS retido", "ISS tomado", "ISS prestado", "Municípios", "Alíquotas", "Declarações", "Geração da guia"],
  },
  {
    slug: "irpj-csll",
    titulo: "IRPJ / CSLL",
    descricao: "Lucro real e presumido, LALUR/LACS, adições, exclusões e compensações.",
    submodulos: ["Lucro Real", "Lucro Presumido", "Estimativa mensal", "LALUR", "LACS", "Adições", "Exclusões", "Compensações"],
  },
  {
    slug: "simples-nacional",
    titulo: "Simples Nacional",
    descricao: "PGDAS-D, segregação de receitas, anexos e Fator R automático.",
    submodulos: ["PGDAS-D", "Segregação de receitas", "Anexos", "Fator R", "Exportação", "Substituição tributária", "Monofásico", "ICMS-ST", "ISS"],
  },
  {
    slug: "retencoes",
    titulo: "Retenções na fonte",
    descricao: "IRRF, CSRF, INSS e ISS retidos, com DARF, GPS e DCTFWeb.",
    submodulos: ["IRRF", "CSRF", "INSS", "ISS retido", "PCC", "DARF", "DCTFWeb"],
  },
];

/** Resumo leve para os cartões do hub. */
export function resumoMotor(motor: MotorSlug, empresaId: string | null, competencia: string) {
  const estado = getEstado(motor, empresaId, competencia);
  const ap = apurar(motor, empresaId, competencia, estado);
  return {
    estado,
    documentos: ap.documentos.length,
    pendencias: ap.inconsistencias.length,
    total: ap.totalImposto,
    kpis: ap.kpis.slice(0, 4),
    regime: ap.regime,
  };
}
