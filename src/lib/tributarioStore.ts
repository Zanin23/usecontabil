/**
 * Núcleo do módulo Financeiro Tributário / Fiscal Operacional.
 *
 * Arquitetura por domínios (DDD leve):
 *   - Cadastros      -> produtos, clientes/fornecedores
 *   - Parametrização -> motor de regras versionado por vigência e UF
 *   - Movimentos     -> documentos fiscais (serviços, faturamento, demais)
 *   - Tributação     -> motor de cálculo desacoplado (ICMS, ST, DIFAL, IPI,
 *                       PIS/COFINS, ISS, retenções, FCP, benefícios)
 *   - Observabilidade-> trilha de auditoria de todas as operações
 *
 * Persistência local por empresa (localStorage), pronta para trocar por API.
 */

import { useEffect, useState } from "react";
import { getStorageSuffix } from "./praticaStore";

const KEY_BASE = "usecontabil.tributario.v1";
const getStoreKey = () => KEY_BASE + getStorageSuffix();
export const TRIBUTARIO_EVENT = "usecontabil:tributario-changed";

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export type UF =
  | "AC" | "AL" | "AP" | "AM" | "BA" | "CE" | "DF" | "ES" | "GO" | "MA" | "MT"
  | "MS" | "MG" | "PA" | "PB" | "PR" | "PE" | "PI" | "RJ" | "RN" | "RS" | "RO"
  | "RR" | "SC" | "SP" | "SE" | "TO";

export const UFS: UF[] = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export type Produto = {
  id: string;
  codigo: string;
  descricao: string;
  ncm: string;
  cest?: string;
  gtin?: string;
  origem: string;
  cfopPadrao: string;
  cstIcms: string;
  csosn?: string;
  aliqIcms: number;
  aliqIpi: number;
  aliqPis: number;
  aliqCofins: number;
  mva?: number;
  unidade: string;
  peso?: number;
  grupo?: string;
  marca?: string;
  fabricante?: string;
  codigoAnp?: string;
  beneficio?: string;
  precoPadrao: number;
  ativo: boolean;
};

export type Parceiro = {
  id: string;
  tipo: "Cliente" | "Fornecedor" | "Ambos";
  nome: string;
  documento: string;
  ie?: string;
  im?: string;
  suframa?: string;
  crt: string;
  regime: string;
  uf: UF;
  municipio?: string;
  contribuinte: boolean;
  consumidorFinal: boolean;
  retencoes: string;
  limiteCredito?: number;
  responsavel?: string;
  ativo: boolean;
};

export type ItemDoc = {
  id: string;
  descricao: string;
  tipo: "produto" | "servico";
  quantidade: number;
  unitario: number;
  ncm?: string;
  cfop?: string;
  cst?: string;
  lc116?: string;
  aliqIcms?: number;
  aliqIpi?: number;
  aliqPis?: number;
  aliqCofins?: number;
  aliqIss?: number;
  mva?: number;
  reducaoBase?: number;
};

export type GrupoMovimento = "servicos" | "faturamento" | "demais";

export type DocTipo =
  | "NFS-e" | "RPS"
  | "NF-e" | "NFC-e" | "CF-e/SAT" | "Venda balcão" | "Pedido" | "Orçamento"
  | "CT-e" | "MDF-e" | "BP-e" | "NF3-e" | "Nota de entrada"
  | "Nota complementar" | "Nota de ajuste" | "Recibo";

export const TIPOS_POR_GRUPO: Record<GrupoMovimento, DocTipo[]> = {
  servicos: ["NFS-e", "RPS"],
  faturamento: ["NF-e", "NFC-e", "CF-e/SAT", "Venda balcão", "Pedido", "Orçamento"],
  demais: ["CT-e", "MDF-e", "BP-e", "NF3-e", "Nota de entrada", "Nota complementar", "Nota de ajuste", "Recibo"],
};

export type DocStatus =
  | "Rascunho" | "Processando" | "Autorizado" | "Rejeitado"
  | "Cancelado" | "Inutilizado" | "Substituído";

export type LinhaMemoria = {
  tributo: string;
  descricao: string;
  base: number;
  aliquota?: number;
  valor: number;
  fundamento?: string;
};

export type Tributos = {
  icms: number;
  icmsSt: number;
  difal: number;
  fcp: number;
  ipi: number;
  pis: number;
  cofins: number;
  iss: number;
  irrf: number;
  inss: number;
  csll: number;
  retencoes: number;
  total: number;
};

export type EventoDoc = {
  id: string;
  data: string;
  usuario: string;
  acao: string;
  detalhe?: string;
};

export type DocumentoFiscal = {
  id: string;
  empresaId: string;
  competencia: string;
  grupo: GrupoMovimento;
  tipo: DocTipo;
  numero: string;
  serie: string;
  emissao: string;
  participante: string;
  participanteDoc: string;
  ufOrigem: UF;
  ufDestino: UF;
  municipio?: string;
  contribuinte: boolean;
  consumidorFinal: boolean;
  regime: string;
  itens: ItemDoc[];
  valorProdutos: number;
  valorTotal: number;
  status: DocStatus;
  chave?: string;
  protocolo?: string;
  observacao?: string;
  tributos: Tributos;
  memoria: LinhaMemoria[];
  regrasAplicadas: string[];
  alertas: { regra: string; mensagem: string; nivel: "bloqueio" | "alerta" | "informativo"; correcao?: string }[];
  eventos: EventoDoc[];
};

export type OperadorRegra = "igual" | "diferente" | "maior" | "menor" | "contem" | "vazio";

export type Regra = {
  id: string;
  nome: string;
  categoria: string;
  prioridade: number;
  legislacao: string;
  vigenciaInicio: string;
  vigenciaFim?: string;
  versao: string;
  uf: UF | "TODAS";
  campo: string;
  operador: OperadorRegra;
  valor: string;
  resultado: "bloquear" | "alertar" | "informar" | "aplicar-aliquota" | "reduzir-base";
  resultadoValor?: number;
  mensagem: string;
  correcao?: string;
  ativa: boolean;
  nativa?: boolean;
};

export type EventoAuditoria = {
  id: string;
  data: string;
  empresaId: string;
  competencia: string;
  usuario: string;
  origem: string;
  acao: string;
  documento?: string;
  detalhe?: string;
  regras?: string[];
  tributos?: number;
};

export type Fechamento = {
  competencia: string;
  empresaId: string;
  status: "Aberta" | "Em conclusão" | "Fechada";
  etapasConcluidas: string[];
  fechadoEm?: string;
  fechadoPor?: string;
  reaberturas: { data: string; usuario: string; motivo: string }[];
};

type EmpresaDB = {
  produtos: Produto[];
  parceiros: Parceiro[];
  documentos: DocumentoFiscal[];
  regras: Regra[];
  auditoria: EventoAuditoria[];
  fechamentos: Fechamento[];
};

type DB = Record<string, EmpresaDB>;

const vazio = (): EmpresaDB => ({
  produtos: [], parceiros: [], documentos: [], regras: [], auditoria: [], fechamentos: [],
});

/* ------------------------------------------------------------------ */
/* Persistência                                                        */
/* ------------------------------------------------------------------ */

function notify() {
  window.dispatchEvent(new Event(TRIBUTARIO_EVENT));
}

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(getStoreKey());
    return raw ? (JSON.parse(raw) as DB) : {};
  } catch {
    return {};
  }
}

function persist(db: DB) {
  localStorage.setItem(getStoreKey(), JSON.stringify(db));
  notify();
}

export function empresaDB(empresaId?: string | null): EmpresaDB {
  if (!empresaId) return vazio();
  const db = loadDB();
  const data = db[empresaId];
  if (!data) return vazio();
  // Forçar retorno de regras nativas se a lista estiver vazia para garantir auditoria básica
  return { 
    ...vazio(), 
    ...data,
    regras: data.regras && data.regras.length > 0 ? data.regras : REGRAS_NATIVAS 
  };
}

export function saveEmpresa(empresaId: string, patch: Partial<EmpresaDB>) {
  const db = loadDB();
  db[empresaId] = { ...vazio(), ...(db[empresaId] ?? {}), ...patch };
  persist(db);
}

export function novoId(prefixo: string) {
  return `${prefixo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/* ------------------------------------------------------------------ */
/* Formatação                                                          */
/* ------------------------------------------------------------------ */

export const brl = (v: number) =>
  "R$ " + (Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

export const pct = (v: number) =>
  `${(Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

export const dataBR = (iso?: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");

export const hojeISO = () => new Date().toISOString().slice(0, 10);

export const usuarioAtual = () => localStorage.getItem("usecontabil.usuario") || "Usuário interno";

/* ------------------------------------------------------------------ */
/* Auditoria                                                           */
/* ------------------------------------------------------------------ */

export function registrarAuditoria(
  empresaId: string,
  ev: Omit<EventoAuditoria, "id" | "data" | "empresaId" | "usuario"> & { usuario?: string },
) {
  const atual = empresaDB(empresaId);
  const evento: EventoAuditoria = {
    id: novoId("aud"),
    data: new Date().toISOString(),
    empresaId,
    usuario: ev.usuario ?? usuarioAtual(),
    ...ev,
  };
  saveEmpresa(empresaId, { auditoria: [evento, ...atual.auditoria].slice(0, 400) });
}

/* ------------------------------------------------------------------ */
/* Motor de regras                                                     */
/* ------------------------------------------------------------------ */

export const CATEGORIAS_REGRA = [
  "Cadastro", "Documento fiscal", "ICMS", "ICMS-ST", "DIFAL", "IPI",
  "PIS/COFINS", "ISS", "Retenções", "Benefícios fiscais", "Compliance",
];

export const CAMPOS_REGRA = [
  { key: "tipo", label: "Tipo do documento" },
  { key: "ufDestino", label: "UF de destino" },
  { key: "ufOrigem", label: "UF de origem" },
  { key: "regime", label: "Regime tributário" },
  { key: "valorTotal", label: "Valor total" },
  { key: "consumidorFinal", label: "Consumidor final" },
  { key: "contribuinte", label: "Contribuinte de ICMS" },
  { key: "ncm", label: "NCM dos itens" },
  { key: "cfop", label: "CFOP dos itens" },
  { key: "cst", label: "CST dos itens" },
  { key: "participanteDoc", label: "CPF/CNPJ do participante" },
];

export const REGRAS_NATIVAS: Regra[] = [
  {
    id: "rg-ncm", nome: "NCM obrigatório em produto", categoria: "Cadastro", prioridade: 1,
    legislacao: "Ajuste SINIEF 07/05", vigenciaInicio: "2005-01-01", versao: "1.0", uf: "TODAS",
    campo: "ncm", operador: "vazio", valor: "", resultado: "bloquear",
    mensagem: "Item sem NCM informado — a SEFAZ rejeita a autorização.",
    correcao: "Informe o NCM de 8 dígitos no cadastro do produto.", ativa: true, nativa: true,
  },
  {
    id: "rg-cfop", nome: "CFOP obrigatório", categoria: "Documento fiscal", prioridade: 1,
    legislacao: "Convênio S/Nº 1970", vigenciaInicio: "1970-01-01", versao: "1.0", uf: "TODAS",
    campo: "cfop", operador: "vazio", valor: "", resultado: "bloquear",
    mensagem: "Item sem CFOP — operação não classificada.",
    correcao: "Defina o CFOP padrão no cadastro do produto ou no item.", ativa: true, nativa: true,
  },
  {
    id: "rg-difal", nome: "DIFAL em venda interestadual a não contribuinte", categoria: "DIFAL", prioridade: 2,
    legislacao: "EC 87/2015 e LC 190/2022", vigenciaInicio: "2016-01-01", versao: "2.0", uf: "TODAS",
    campo: "consumidorFinal", operador: "igual", valor: "sim", resultado: "informar",
    mensagem: "Operação sujeita ao diferencial de alíquotas com partilha integral ao destino.",
    correcao: "Confira a alíquota interna do estado de destino e o FCP.", ativa: true, nativa: true,
  },
  {
    id: "rg-cpf", nome: "Identificação obrigatória acima de R$ 10.000", categoria: "Compliance", prioridade: 3,
    legislacao: "RICMS — identificação do destinatário", vigenciaInicio: "2010-01-01", versao: "1.1", uf: "TODAS",
    campo: "valorTotal", operador: "maior", valor: "10000", resultado: "alertar",
    mensagem: "Documento acima de R$ 10.000 exige identificação completa do destinatário.",
    correcao: "Preencha CPF/CNPJ e endereço do participante.", ativa: true, nativa: true,
  },
  {
    id: "rg-iss-ret", nome: "Retenção de ISS na fonte", categoria: "ISS", prioridade: 2,
    legislacao: "LC 116/2003, art. 6º", vigenciaInicio: "2003-08-01", versao: "1.0", uf: "TODAS",
    campo: "tipo", operador: "igual", valor: "NFS-e", resultado: "informar",
    mensagem: "Verifique se o tomador é responsável tributário pela retenção do ISS.",
    correcao: "Marque a retenção no item de serviço quando aplicável.", ativa: true, nativa: true,
  },
  {
    id: "rg-st", nome: "Produto com CEST sujeito à substituição tributária", categoria: "ICMS-ST", prioridade: 2,
    legislacao: "Convênio ICMS 142/2018", vigenciaInicio: "2019-01-01", versao: "1.2", uf: "TODAS",
    campo: "cst", operador: "igual", valor: "10", resultado: "informar",
    mensagem: "CST 10 indica operação com ICMS-ST — confirme MVA/IVA e FCP-ST.",
    correcao: "Informe a MVA do protocolo/convênio no cadastro do produto.", ativa: true, nativa: true,
  },
  {
    id: "rg-simples", nome: "Simples Nacional não destaca ICMS", categoria: "ICMS", prioridade: 2,
    legislacao: "LC 123/2006, art. 23", vigenciaInicio: "2007-07-01", versao: "1.0", uf: "TODAS",
    campo: "regime", operador: "contem", valor: "Simples", resultado: "informar",
    mensagem: "Empresa do Simples Nacional: ICMS/IPI não são destacados, use CSOSN.",
    correcao: "Preencha o CSOSN no cadastro do produto.", ativa: true, nativa: true,
  },
  {
    id: "rg-valor", nome: "Documento sem valor", categoria: "Documento fiscal", prioridade: 1,
    legislacao: "Regra interna de consistência", vigenciaInicio: "2020-01-01", versao: "1.0", uf: "TODAS",
    campo: "valorTotal", operador: "menor", valor: "0.01", resultado: "bloquear",
    mensagem: "Documento sem valor total — inclua ao menos um item.",
    correcao: "Adicione itens com quantidade e valor unitário.", ativa: true, nativa: true,
  },
];

export function regrasVigentes(empresaId?: string | null, data = hojeISO()): Regra[] {
  const custom = empresaDB(empresaId).regras;
  const todas = [...REGRAS_NATIVAS.filter((n) => !custom.some((c) => c.id === n.id)), ...custom];
  return todas
    .filter((r) => r.ativa)
    .filter((r) => r.vigenciaInicio <= data && (!r.vigenciaFim || r.vigenciaFim >= data))
    .sort((a, b) => a.prioridade - b.prioridade);
}

function fatosDoc(doc: DocumentoFiscal): Record<string, string> {
  return {
    tipo: doc.tipo,
    ufDestino: doc.ufDestino,
    ufOrigem: doc.ufOrigem,
    regime: doc.regime,
    valorTotal: String(doc.valorTotal),
    consumidorFinal: doc.consumidorFinal ? "sim" : "não",
    contribuinte: doc.contribuinte ? "sim" : "não",
    ncm: doc.itens.map((i) => i.ncm ?? "").join(","),
    cfop: doc.itens.map((i) => i.cfop ?? "").join(","),
    cst: doc.itens.map((i) => i.cst ?? "").join(","),
    participanteDoc: doc.participanteDoc,
  };
}

function avaliaCondicao(fato: string, operador: OperadorRegra, valor: string) {
  const n = Number(fato.replace(",", "."));
  switch (operador) {
    case "igual": return fato.toLowerCase() === valor.toLowerCase();
    case "diferente": return fato.toLowerCase() !== valor.toLowerCase();
    case "maior": return Number.isFinite(n) && n > Number(valor);
    case "menor": return Number.isFinite(n) && n < Number(valor);
    case "contem": return fato.toLowerCase().includes(valor.toLowerCase());
    case "vazio": return !fato.trim() || fato.split(",").some((p) => !p.trim());
    default: return false;
  }
}

export function aplicarRegras(doc: DocumentoFiscal, regras: Regra[]) {
  const fatos = fatosDoc(doc);
  const alertas: DocumentoFiscal["alertas"] = [];
  const aplicadas: string[] = [];

  for (const r of regras) {
    if (r.uf !== "TODAS" && r.uf !== doc.ufDestino) continue;
    const fato = fatos[r.campo] ?? "";
    if (!avaliaCondicao(fato, r.operador, r.valor)) continue;
    aplicadas.push(`${r.nome} (v${r.versao})`);
    if (r.resultado === "bloquear")
      alertas.push({ regra: r.nome, mensagem: r.mensagem, nivel: "bloqueio", correcao: r.correcao });
    else if (r.resultado === "alertar")
      alertas.push({ regra: r.nome, mensagem: r.mensagem, nivel: "alerta", correcao: r.correcao });
    else
      alertas.push({ regra: r.nome, mensagem: r.mensagem, nivel: "informativo", correcao: r.correcao });
  }
  return { alertas, aplicadas };
}

/* ------------------------------------------------------------------ */
/* Motor tributário                                                    */
/* ------------------------------------------------------------------ */

/** Alíquota interna padrão por UF (parametrizável). */
export const ALIQ_INTERNA: Partial<Record<UF, number>> = {
  SP: 18, RJ: 20, MG: 18, RS: 17, PR: 19, SC: 17, BA: 20.5, PE: 20.5, CE: 20,
  GO: 19, DF: 20, ES: 17, MT: 17, MS: 17, PA: 19, AM: 20, MA: 22, PB: 20,
  RN: 18, AL: 19, SE: 19, PI: 21, TO: 20, RO: 19.5, AC: 19, AP: 18, RR: 20,
};
export const FCP_PADRAO = 2;

const SUL_SUDESTE: UF[] = ["SP", "RJ", "MG", "RS", "SC", "PR"];

export function aliquotaInterestadual(origem: UF, destino: UF, origemProduto = "0") {
  if (origem === destino) return ALIQ_INTERNA[destino] ?? 18;
  if (["1", "2", "3", "8"].includes(origemProduto)) return 4; // importado
  const deSulSudeste = SUL_SUDESTE.includes(origem) && origem !== "ES";
  const paraNorte = !SUL_SUDESTE.includes(destino) || destino === "ES";
  return deSulSudeste && paraNorte ? 7 : 12;
}

export function calcularDocumento(
  doc: DocumentoFiscal,
  opts: { regime: string; origemProduto?: string } = { regime: "Lucro Presumido" },
): { tributos: Tributos; memoria: LinhaMemoria[] } {
  const memoria: LinhaMemoria[] = [];
  const t: Tributos = {
    icms: 0, icmsSt: 0, difal: 0, fcp: 0, ipi: 0, pis: 0, cofins: 0,
    iss: 0, irrf: 0, inss: 0, csll: 0, retencoes: 0, total: 0,
  };

  const simples = /simples|simei|mei/i.test(opts.regime);
  const naoCumulativo = /real/i.test(opts.regime);
  const aliqPisPadrao = naoCumulativo ? 1.65 : 0.65;
  const aliqCofinsPadrao = naoCumulativo ? 7.6 : 3;

  const totalServicos = doc.itens
    .filter((i) => i.tipo === "servico")
    .reduce((s, i) => s + i.quantidade * i.unitario, 0);

  for (const item of doc.itens) {
    const bruto = item.quantidade * item.unitario;
    const reducao = item.reducaoBase ?? 0;
    const base = bruto * (1 - reducao / 100);

    if (item.tipo === "servico") {
      const aliqIss = item.aliqIss ?? 5;
      const iss = base * (aliqIss / 100);
      t.iss += iss;
      memoria.push({
        tributo: "ISS", descricao: `${item.descricao} — base ${brl(base)}`,
        base, aliquota: aliqIss, valor: iss,
        fundamento: `LC 116/2003 — item ${item.lc116 || "—"}`,
      });
    } else {
      // IPI
      const aliqIpi = simples ? 0 : item.aliqIpi ?? 0;
      const ipi = base * (aliqIpi / 100);
      if (ipi > 0) {
        t.ipi += ipi;
        memoria.push({ tributo: "IPI", descricao: item.descricao, base, aliquota: aliqIpi, valor: ipi, fundamento: "TIPI — Decreto 11.158/2022" });
      }

      // ICMS próprio
      const interestadual = doc.ufOrigem !== doc.ufDestino;
      const aliqIcms = simples
        ? 0
        : item.aliqIcms ?? (interestadual
            ? aliquotaInterestadual(doc.ufOrigem, doc.ufDestino, opts.origemProduto)
            : ALIQ_INTERNA[doc.ufDestino] ?? 18);
      const icms = base * (aliqIcms / 100);
      if (icms > 0) {
        t.icms += icms;
        memoria.push({
          tributo: "ICMS", descricao: `${item.descricao}${reducao ? ` — base reduzida ${reducao}%` : ""}`,
          base, aliquota: aliqIcms, valor: icms,
          fundamento: interestadual ? "Resolução SF 22/1989" : `RICMS/${doc.ufDestino}`,
        });
      }

      // ICMS-ST
      if (item.mva && item.mva > 0 && !simples) {
        const aliqInterna = ALIQ_INTERNA[doc.ufDestino] ?? 18;
        const baseSt = (base + ipi) * (1 + item.mva / 100);
        const st = Math.max(0, baseSt * (aliqInterna / 100) - icms);
        const fcpSt = baseSt * (FCP_PADRAO / 100);
        t.icmsSt += st;
        t.fcp += fcpSt;
        memoria.push({
          tributo: "ICMS-ST", descricao: `${item.descricao} — MVA ${item.mva}%`,
          base: baseSt, aliquota: aliqInterna, valor: st,
          fundamento: "Convênio ICMS 142/2018",
        });
        memoria.push({ tributo: "FCP-ST", descricao: item.descricao, base: baseSt, aliquota: FCP_PADRAO, valor: fcpSt, fundamento: `Lei estadual ${doc.ufDestino}` });
      }

      // DIFAL EC 87/2015 — base dupla
      if (interestadual && doc.consumidorFinal && !doc.contribuinte && !simples) {
        const aliqInter = aliquotaInterestadual(doc.ufOrigem, doc.ufDestino, opts.origemProduto);
        const aliqInterna = ALIQ_INTERNA[doc.ufDestino] ?? 18;
        const baseDupla = base / (1 - aliqInterna / 100);
        const difal = baseDupla * ((aliqInterna - aliqInter) / 100);
        const fcp = baseDupla * (FCP_PADRAO / 100);
        t.difal += difal;
        t.fcp += fcp;
        memoria.push({
          tributo: "DIFAL", descricao: `${item.descricao} — base dupla ${brl(baseDupla)} (${aliqInterna}% x ${aliqInter}%)`,
          base: baseDupla, aliquota: aliqInterna - aliqInter, valor: difal,
          fundamento: "EC 87/2015 e LC 190/2022 — 100% ao destino",
        });
        memoria.push({ tributo: "FCP", descricao: item.descricao, base: baseDupla, aliquota: FCP_PADRAO, valor: fcp, fundamento: `FCP ${doc.ufDestino}` });
      }
    }

    // PIS/COFINS
    if (!simples) {
      const aliqPis = item.aliqPis ?? aliqPisPadrao;
      const aliqCofins = item.aliqCofins ?? aliqCofinsPadrao;
      const pis = base * (aliqPis / 100);
      const cofins = base * (aliqCofins / 100);
      t.pis += pis;
      t.cofins += cofins;
      memoria.push({ tributo: "PIS", descricao: item.descricao, base, aliquota: aliqPis, valor: pis, fundamento: naoCumulativo ? "Lei 10.637/2002" : "Lei 9.718/1998" });
      memoria.push({ tributo: "COFINS", descricao: item.descricao, base, aliquota: aliqCofins, valor: cofins, fundamento: naoCumulativo ? "Lei 10.833/2003" : "Lei 9.718/1998" });
    }
  }

  // Retenções sobre serviços PJ
  if (totalServicos > 0 && doc.grupo === "servicos" && /\d{14}/.test(doc.participanteDoc.replace(/\D/g, ""))) {
    const irrf = totalServicos * 0.015;
    const csllPisCofins = totalServicos >= 215.05 ? totalServicos * 0.0465 : 0;
    t.irrf += irrf;
    t.csll += csllPisCofins;
    t.retencoes += irrf + csllPisCofins;
    memoria.push({ tributo: "IRRF", descricao: "Retenção sobre serviços profissionais", base: totalServicos, aliquota: 1.5, valor: irrf, fundamento: "RIR/2018, art. 714" });
    if (csllPisCofins > 0)
      memoria.push({ tributo: "CSLL/PIS/COFINS", descricao: "Retenção conjunta", base: totalServicos, aliquota: 4.65, valor: csllPisCofins, fundamento: "Lei 10.833/2003, art. 30" });
  }

  t.total = t.icms + t.icmsSt + t.difal + t.fcp + t.ipi + t.pis + t.cofins + t.iss;
  return { tributos: t, memoria };
}

/* ------------------------------------------------------------------ */
/* Documentos                                                          */
/* ------------------------------------------------------------------ */

export function totalDoc(itens: ItemDoc[]) {
  return itens.reduce((s, i) => s + i.quantidade * i.unitario, 0);
}

export function processarDocumento(doc: DocumentoFiscal, empresaId: string): DocumentoFiscal {
  const { tributos, memoria } = calcularDocumento(doc, { regime: doc.regime });
  const { alertas, aplicadas } = aplicarRegras(doc, regrasVigentes(empresaId, doc.emissao));
  return { ...doc, tributos, memoria, alertas, regrasAplicadas: aplicadas };
}

export function salvarDocumento(empresaId: string, doc: DocumentoFiscal, acao = "Documento salvo") {
  const db = empresaDB(empresaId);
  const processado = processarDocumento(doc, empresaId);
  // Garante que o documento tenha a competência correta baseada na data de emissão se não estiver definida
  if (!processado.competencia && processado.emissao) {
    const [y, m] = processado.emissao.split("-");
    if (y && m) processado.competencia = `${y}-${m.padStart(2, "0")}`;
  }
  const evento: EventoDoc = { id: novoId("ev"), data: new Date().toISOString(), usuario: usuarioAtual(), acao };
  const comEvento = { ...processado, eventos: [evento, ...(processado.eventos ?? [])] };
  const idx = db.documentos.findIndex((d) => d.id === doc.id);
  const documentos = [...db.documentos];
  if (idx >= 0) documentos[idx] = comEvento;
  else documentos.unshift(comEvento);
  saveEmpresa(empresaId, { documentos });
  registrarAuditoria(empresaId, {
    competencia: doc.competencia, origem: `Movimentos › ${doc.grupo}`, acao,
    documento: `${doc.tipo} ${doc.numero}`, regras: comEvento.regrasAplicadas,
    tributos: comEvento.tributos.total,
    detalhe: `${doc.participante} — ${brl(doc.valorTotal)}`,
  });
  return comEvento;
}

export function transitarDocumento(
  empresaId: string, id: string, status: DocStatus, detalhe?: string,
) {
  const db = empresaDB(empresaId);
  const documentos = db.documentos.map((d) =>
    d.id === id
      ? {
          ...d, status,
          chave: status === "Autorizado" && !d.chave ? gerarChave(d) : d.chave,
          protocolo: status === "Autorizado" && !d.protocolo ? `135${Date.now().toString().slice(-12)}` : d.protocolo,
          eventos: [
            { id: novoId("ev"), data: new Date().toISOString(), usuario: usuarioAtual(), acao: status, detalhe },
            ...d.eventos,
          ],
        }
      : d,
  );
  saveEmpresa(empresaId, { documentos });
  const doc = documentos.find((d) => d.id === id);
  if (doc)
    registrarAuditoria(empresaId, {
      competencia: doc.competencia, origem: `Movimentos › ${doc.grupo}`,
      acao: `Documento ${status.toLowerCase()}`, documento: `${doc.tipo} ${doc.numero}`,
      detalhe, tributos: doc.tributos.total,
    });
}

export function removerDocumento(empresaId: string, id: string) {
  const db = empresaDB(empresaId);
  const doc = db.documentos.find((d) => d.id === id);
  saveEmpresa(empresaId, { documentos: db.documentos.filter((d) => d.id !== id) });
  if (doc)
    registrarAuditoria(empresaId, {
      competencia: doc.competencia, origem: `Movimentos › ${doc.grupo}`,
      acao: "Documento excluído", documento: `${doc.tipo} ${doc.numero}`,
    });
}

function gerarChave(doc: DocumentoFiscal) {
  const base = `${doc.ufOrigem}${doc.emissao.replace(/\D/g, "")}${doc.numero}${doc.serie}`;
  let s = "";
  for (let i = 0; i < 44; i++) s += String((base.charCodeAt(i % base.length) + i * 7) % 10);
  return s;
}

export function documentosDaCompetencia(empresaId?: string | null, competencia?: string, grupo?: GrupoMovimento) {
  return empresaDB(empresaId).documentos.filter(
    (d) => (!competencia || d.competencia === competencia) && (!grupo || d.grupo === grupo),
  );
}

export function resumoDocumentos(docs: DocumentoFiscal[]) {
  const autorizados = docs.filter((d) => d.status === "Autorizado");
  const faturado = autorizados.reduce((s, d) => s + d.valorTotal, 0);
  const tributos = autorizados.reduce((s, d) => s + d.tributos.total, 0);
  return {
    total: docs.length,
    autorizados: autorizados.length,
    cancelados: docs.filter((d) => d.status === "Cancelado").length,
    pendentes: docs.filter((d) => ["Rascunho", "Processando", "Rejeitado"].includes(d.status)).length,
    faturado,
    tributos,
    retencoes: autorizados.reduce((s, d) => s + d.tributos.retencoes, 0),
    cargaEfetiva: faturado > 0 ? (tributos / faturado) * 100 : 0,
    margem: faturado - tributos,
    bloqueios: docs.filter((d) => d.alertas.some((a) => a.nivel === "bloqueio")).length,
  };
}

/* ------------------------------------------------------------------ */
/* Cadastros                                                           */
/* ------------------------------------------------------------------ */

export function salvarProduto(empresaId: string, p: Produto) {
  const db = empresaDB(empresaId);
  const list = [...db.produtos];
  const i = list.findIndex((x) => x.id === p.id);
  if (i >= 0) list[i] = p; else list.unshift(p);
  saveEmpresa(empresaId, { produtos: list });
  registrarAuditoria(empresaId, { competencia: "—", origem: "Cadastros › Produtos", acao: i >= 0 ? "Produto alterado" : "Produto criado", detalhe: `${p.codigo} — ${p.descricao}` });
}

export function removerProduto(empresaId: string, id: string) {
  const db = empresaDB(empresaId);
  saveEmpresa(empresaId, { produtos: db.produtos.filter((p) => p.id !== id) });
  registrarAuditoria(empresaId, { competencia: "—", origem: "Cadastros › Produtos", acao: "Produto excluído", detalhe: id });
}

export function salvarParceiro(empresaId: string, p: Parceiro) {
  const db = empresaDB(empresaId);
  const list = [...db.parceiros];
  const i = list.findIndex((x) => x.id === p.id);
  if (i >= 0) list[i] = p; else list.unshift(p);
  saveEmpresa(empresaId, { parceiros: list });
  registrarAuditoria(empresaId, { competencia: "—", origem: "Cadastros › Clientes e fornecedores", acao: i >= 0 ? "Parceiro alterado" : "Parceiro criado", detalhe: `${p.nome} — ${p.documento}` });
}

export function removerParceiro(empresaId: string, id: string) {
  const db = empresaDB(empresaId);
  saveEmpresa(empresaId, { parceiros: db.parceiros.filter((p) => p.id !== id) });
  registrarAuditoria(empresaId, { competencia: "—", origem: "Cadastros › Clientes e fornecedores", acao: "Parceiro excluído", detalhe: id });
}

export function salvarRegra(empresaId: string, r: Regra) {
  const db = empresaDB(empresaId);
  const list = [...db.regras];
  const i = list.findIndex((x) => x.id === r.id);
  if (i >= 0) list[i] = r; else list.unshift(r);
  saveEmpresa(empresaId, { regras: list });
  registrarAuditoria(empresaId, { competencia: "—", origem: "Motor tributário", acao: i >= 0 ? "Regra alterada" : "Regra criada", detalhe: `${r.nome} v${r.versao}`, regras: [r.nome] });
}

export function removerRegra(empresaId: string, id: string) {
  const db = empresaDB(empresaId);
  const nativa = REGRAS_NATIVAS.find((r) => r.id === id);
  if (nativa) {
    // desativa a nativa criando um override
    salvarRegra(empresaId, { ...nativa, ativa: false });
    return;
  }
  saveEmpresa(empresaId, { regras: db.regras.filter((r) => r.id !== id) });
  registrarAuditoria(empresaId, { competencia: "—", origem: "Motor tributário", acao: "Regra removida", detalhe: id });
}

/* ------------------------------------------------------------------ */
/* Conclusão fiscal (fechamento da competência)                        */
/* ------------------------------------------------------------------ */

export type EtapaFechamento = {
  slug: string;
  titulo: string;
  descricao: string;
  automatica: boolean;
};

export const ETAPAS_FECHAMENTO: EtapaFechamento[] = [
  { slug: "validar-documentos", titulo: "Validar documentos", descricao: "Nenhum documento em rascunho, rejeitado ou com bloqueio de regra.", automatica: true },
  { slug: "validar-cadastros", titulo: "Validar cadastros", descricao: "Produtos com NCM/CFOP e parceiros com documento válido.", automatica: true },
  { slug: "auditoria", titulo: "Executar auditoria", descricao: "Motor de regras aplicado a todos os documentos da competência.", automatica: false },
  { slug: "apuracao", titulo: "Executar apuração", descricao: "Consolidação dos tributos calculados no período.", automatica: false },
  { slug: "guias", titulo: "Gerar guias", descricao: "Guias de recolhimento geradas a partir da apuração.", automatica: false },
  { slug: "obrigacoes", titulo: "Gerar obrigações", descricao: "Arquivos e declarações da competência preparados.", automatica: false },
  { slug: "fechar", titulo: "Fechar competência", descricao: "Consolida os números e encerra o período.", automatica: false },
  { slug: "bloquear", titulo: "Bloquear alterações", descricao: "Impede novos lançamentos sem reabertura autorizada.", automatica: false },
  { slug: "log", titulo: "Gerar log", descricao: "Registro completo do fechamento na trilha de auditoria.", automatica: false },
];

export function fechamentoAtual(empresaId?: string | null, competencia?: string): Fechamento {
  const db = empresaDB(empresaId);
  return (
    db.fechamentos.find((f) => f.competencia === competencia) ?? {
      competencia: competencia ?? "", empresaId: empresaId ?? "", status: "Aberta",
      etapasConcluidas: [], reaberturas: [],
    }
  );
}

export function validacoesAutomaticas(empresaId?: string | null, competencia?: string) {
  const db = empresaDB(empresaId);
  const docs = db.documentos.filter((d) => d.competencia === competencia);
  const docsPendentes = docs.filter((d) => ["Rascunho", "Processando", "Rejeitado"].includes(d.status));
  const bloqueios = docs.filter((d) => d.alertas.some((a) => a.nivel === "bloqueio"));
  const prodInvalidos = db.produtos.filter((p) => !p.ncm || !p.cfopPadrao);
  const parcInvalidos = db.parceiros.filter((p) => p.documento.replace(/\D/g, "").length < 11);
  return {
    "validar-documentos": {
      ok: docs.length > 0 && docsPendentes.length === 0 && bloqueios.length === 0,
      detalhe: docs.length === 0
        ? "Nenhum documento lançado na competência."
        : `${docsPendentes.length} pendente(s), ${bloqueios.length} com bloqueio de regra.`,
    },
    "validar-cadastros": {
      ok: prodInvalidos.length === 0 && parcInvalidos.length === 0,
      detalhe: `${prodInvalidos.length} produto(s) e ${parcInvalidos.length} parceiro(s) com cadastro incompleto.`,
    },
  } as Record<string, { ok: boolean; detalhe: string }>;
}

export function concluirEtapa(empresaId: string, competencia: string, etapa: string) {
  const db = empresaDB(empresaId);
  const atual = fechamentoAtual(empresaId, competencia);
  const etapasConcluidas = Array.from(new Set([...atual.etapasConcluidas, etapa]));
  const fechada = etapasConcluidas.length >= ETAPAS_FECHAMENTO.length;
  const novo: Fechamento = {
    ...atual, empresaId, competencia, etapasConcluidas,
    status: fechada ? "Fechada" : "Em conclusão",
    fechadoEm: fechada ? new Date().toISOString() : atual.fechadoEm,
    fechadoPor: fechada ? usuarioAtual() : atual.fechadoPor,
  };
  const fechamentos = [...db.fechamentos.filter((f) => f.competencia !== competencia), novo];
  saveEmpresa(empresaId, { fechamentos });
  registrarAuditoria(empresaId, {
    competencia, origem: "Movimentos › Conclusão fiscal",
    acao: fechada ? "Competência fechada" : `Etapa concluída: ${etapa}`,
  });
}

export function reabrirCompetencia(empresaId: string, competencia: string, motivo: string) {
  const db = empresaDB(empresaId);
  const atual = fechamentoAtual(empresaId, competencia);
  const novo: Fechamento = {
    ...atual, empresaId, competencia, status: "Aberta", etapasConcluidas: [],
    reaberturas: [{ data: new Date().toISOString(), usuario: usuarioAtual(), motivo }, ...atual.reaberturas],
  };
  saveEmpresa(empresaId, { fechamentos: [...db.fechamentos.filter((f) => f.competencia !== competencia), novo] });
  registrarAuditoria(empresaId, { competencia, origem: "Movimentos › Conclusão fiscal", acao: "Competência reaberta", detalhe: motivo });
}

/* ------------------------------------------------------------------ */
/* Dados de demonstração                                               */
/* ------------------------------------------------------------------ */

export function carregarDemonstracao(empresaId: string, competencia: string, regime = "Lucro Presumido") {
  const produtos: Produto[] = [
    { id: novoId("prd"), codigo: "PRD-001", descricao: "Chapa de aço laminado 2mm", ncm: "72085100", cest: "", gtin: "7891000100011", origem: "0", cfopPadrao: "6102", cstIcms: "00", aliqIcms: 12, aliqIpi: 5, aliqPis: 1.65, aliqCofins: 7.6, unidade: "KG", peso: 12.4, grupo: "Metais", marca: "Andrade", fabricante: "Metalúrgica Andrade", precoPadrao: 42.9, ativo: true },
    { id: novoId("prd"), codigo: "PRD-002", descricao: "Perfil estrutural U 100x50", ncm: "73063090", cest: "", gtin: "7891000100028", origem: "0", cfopPadrao: "5102", cstIcms: "00", aliqIcms: 18, aliqIpi: 5, aliqPis: 1.65, aliqCofins: 7.6, unidade: "PC", peso: 8.2, grupo: "Metais", marca: "Andrade", fabricante: "Metalúrgica Andrade", precoPadrao: 189.5, ativo: true },
    { id: novoId("prd"), codigo: "PRD-003", descricao: "Óleo lubrificante industrial 20L", ncm: "27101932", cest: "0600200", gtin: "7891000100035", origem: "0", cfopPadrao: "5405", cstIcms: "10", csosn: "", aliqIcms: 18, aliqIpi: 0, aliqPis: 1.65, aliqCofins: 7.6, mva: 56.63, unidade: "UN", grupo: "Insumos", codigoAnp: "820101001", precoPadrao: 340, ativo: true },
  ];

  const parceiros: Parceiro[] = [
    { id: novoId("par"), tipo: "Cliente", nome: "Distribuidora Norte Ltda.", documento: "12.345.678/0001-90", ie: "1234567890", crt: "3", regime: "Lucro Real", uf: "BA", municipio: "Salvador", contribuinte: true, consumidorFinal: false, retencoes: "Nenhuma", limiteCredito: 250000, responsavel: "Comercial", ativo: true },
    { id: novoId("par"), tipo: "Cliente", nome: "Marina Costa (consumidor final)", documento: "123.456.789-00", crt: "—", regime: "Pessoa física", uf: "RS", municipio: "Porto Alegre", contribuinte: false, consumidorFinal: true, retencoes: "Nenhuma", ativo: true },
    { id: novoId("par"), tipo: "Ambos", nome: "TechCore Sistemas ME", documento: "98.765.432/0001-10", ie: "ISENTO", im: "445566", crt: "1", regime: "Simples Nacional", uf: "SP", municipio: "São Paulo", contribuinte: false, consumidorFinal: false, retencoes: "ISS, IRRF", ativo: true },
  ];

  const base = {
    empresaId, competencia, ufOrigem: "SP" as UF, regime,
    status: "Autorizado" as DocStatus, eventos: [], alertas: [], regrasAplicadas: [],
    memoria: [], tributos: { icms: 0, icmsSt: 0, difal: 0, fcp: 0, ipi: 0, pis: 0, cofins: 0, iss: 0, irrf: 0, inss: 0, csll: 0, retencoes: 0, total: 0 },
  };

  const docs: DocumentoFiscal[] = [
    {
      ...base, id: novoId("doc"), grupo: "faturamento", tipo: "NF-e", numero: "10241", serie: "1",
      emissao: `${competencia}-08`, participante: "Distribuidora Norte Ltda.", participanteDoc: "12.345.678/0001-90",
      ufDestino: "BA", contribuinte: true, consumidorFinal: false,
      itens: [{ id: novoId("it"), descricao: "Chapa de aço laminado 2mm", tipo: "produto", quantidade: 400, unitario: 42.9, ncm: "72085100", cfop: "6102", cst: "00", aliqIpi: 5 }],
      valorProdutos: 17160, valorTotal: 17160,
    },
    {
      ...base, id: novoId("doc"), grupo: "faturamento", tipo: "NF-e", numero: "10242", serie: "1",
      emissao: `${competencia}-12`, participante: "Marina Costa (consumidor final)", participanteDoc: "123.456.789-00",
      ufDestino: "RS", contribuinte: false, consumidorFinal: true,
      itens: [{ id: novoId("it"), descricao: "Perfil estrutural U 100x50", tipo: "produto", quantidade: 30, unitario: 189.5, ncm: "73063090", cfop: "6108", cst: "00", aliqIpi: 5 }],
      valorProdutos: 5685, valorTotal: 5685,
    },
    {
      ...base, id: novoId("doc"), grupo: "faturamento", tipo: "NF-e", numero: "10243", serie: "1",
      emissao: `${competencia}-18`, participante: "TechCore Sistemas ME", participanteDoc: "98.765.432/0001-10",
      ufDestino: "SP", contribuinte: false, consumidorFinal: false,
      itens: [{ id: novoId("it"), descricao: "Óleo lubrificante industrial 20L", tipo: "produto", quantidade: 24, unitario: 340, ncm: "27101932", cfop: "5405", cst: "10", mva: 56.63 }],
      valorProdutos: 8160, valorTotal: 8160,
    },
    {
      ...base, id: novoId("doc"), grupo: "servicos", tipo: "NFS-e", numero: "884", serie: "A",
      emissao: `${competencia}-20`, participante: "TechCore Sistemas ME", participanteDoc: "98.765.432/0001-10",
      ufDestino: "SP", municipio: "São Paulo", contribuinte: false, consumidorFinal: false,
      itens: [{ id: novoId("it"), descricao: "Consultoria técnica industrial", tipo: "servico", quantidade: 1, unitario: 12500, lc116: "17.01", aliqIss: 5 }],
      valorProdutos: 12500, valorTotal: 12500,
    },
    {
      ...base, id: novoId("doc"), grupo: "demais", tipo: "CT-e", numero: "5510", serie: "1",
      emissao: `${competencia}-22`, participante: "Transportes Litoral Ltda.", participanteDoc: "45.678.912/0001-33",
      ufDestino: "SP", contribuinte: true, consumidorFinal: false,
      itens: [{ id: novoId("it"), descricao: "Frete rodoviário CIF", tipo: "servico", quantidade: 1, unitario: 3400, aliqIss: 0 }],
      valorProdutos: 3400, valorTotal: 3400, status: "Autorizado",
    },
  ];

  const db = empresaDB(empresaId);
  saveEmpresa(empresaId, {
    produtos: [...produtos, ...db.produtos],
    parceiros: [...parceiros, ...db.parceiros],
    documentos: [...docs.map((d) => processarDocumento(d, empresaId)), ...db.documentos],
  });
  registrarAuditoria(empresaId, {
    competencia, origem: "Financeiro tributário", acao: "Dados de demonstração carregados",
    detalhe: `${produtos.length} produtos, ${parceiros.length} parceiros, ${docs.length} documentos`,
  });
}

export function limparDemonstracao(empresaId: string) {
  saveEmpresa(empresaId, { produtos: [], parceiros: [], documentos: [] });
  registrarAuditoria(empresaId, { competencia: "—", origem: "Financeiro tributário", acao: "Base operacional limpa" });
}

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

export function useTributario<T>(seletor: () => T, deps: unknown[] = []): T {
  const [valor, setValor] = useState<T>(seletor);
  useEffect(() => {
    const refresh = () => setValor(seletor());
    refresh();
    window.addEventListener(TRIBUTARIO_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(TRIBUTARIO_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return valor;
}
