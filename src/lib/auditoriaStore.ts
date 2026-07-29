// ============================================================================
// Auditoria Fiscal (Tax Intelligence) — camada de auditoria contínua.
//
// Arquitetura:
//   1. Coletores        → transformam documentos, escrituração, apurações e
//                         obrigações em "fatos" normalizados.
//   2. Motor de regras  → regras 100% parametrizáveis (condição + expressão
//                         lógica) avaliadas sobre os fatos. Novas regras podem
//                         ser criadas pela interface, sem alterar código.
//   3. Cruzamentos      → validações estruturais entre módulos (Fiscal ×
//                         Contábil × Financeiro × SPED × Obrigações).
//   4. Achados          → inconsistências classificadas por criticidade, com
//                         memória de auditoria, sugestão e reprocessamento.
//
// Tudo é interno/visual: nenhuma comunicação real com Receita, SEFAZ ou
// prefeituras. Consultas a órgãos são simuladas e podem ser importadas.
// ============================================================================
import { useEffect, useState } from "react";
import { loadDocs, valorBR, moedaBR, type DocFiscal, type DocSlug } from "@/lib/fiscalStore";
import {
  gerarLivroEntradas, gerarLivroSaidas, somar, competenciaAnterior,
} from "@/lib/escrituracaoStore";
import { apurar, regimeDaEmpresa, type MotorSlug } from "@/lib/apuracaoStore";
import { monitorar } from "@/lib/obrigacoesStore";

export const AUDITORIA_EVENT = "usecontabil:auditoria-changed";
const KEY = "usecontabil.auditoria.v1";

/* ============================== tipos ==================================== */

export type Criticidade = "Crítica" | "Alta" | "Média" | "Baixa" | "Informativa";
export type CategoriaAud =
  | "Tributária" | "Contábil" | "Financeira" | "Cadastral" | "Documental" | "Legal";
export type Situacao = "Aberta" | "Em análise" | "Corrigida" | "Ignorada" | "Reprocessada";
export type CatSlug = "xml-escrituracao" | "classificacao" | "creditos" | "certidoes";

export type Operador =
  | "igual" | "diferente" | "maior" | "menor" | "contém" | "não contém" | "vazio" | "preenchido";

export type Condicao = { campo: string; operador: Operador; valor: string };

export type Regra = {
  id: string;
  nome: string;
  categoria: CategoriaAud;
  grupo: CatSlug;
  descricao: string;
  legislacao: string;
  criticidade: Criticidade;
  condicoes: Condicao[];
  juncao: "E" | "OU";
  mensagem: string;
  sugestao: string;
  acaoAutomatica: string;
  prioridade: number;
  versao: string;
  vigencia: string;
  ativa: boolean;
  customizada?: boolean;
};

/** Fato normalizado — a unidade de dados sobre a qual as regras são avaliadas. */
export type Fato = {
  id: string;
  origem: DocSlug;
  modelo: string;
  documento: string;
  chave: string;
  participante: string;
  cnpj: string;
  data: string;
  tipo: string;
  cfop: string;
  ncm: string;
  cest: string;
  cstIcms: string;
  cstPis: string;
  natureza: string;
  valor: number;
  base: number;
  icms: number;
  statusDoc: string;
  escriturado: string;
  xml: string;
  sentido: "Entrada" | "Saída" | "Serviço";
  monofasico: string;
  interestadual: string;
};

export type CampoDivergente = { campo: string; esperado: string; encontrado: string };

export type Achado = {
  id: string;
  regraId: string;
  regra: string;
  grupo: CatSlug;
  categoria: CategoriaAud;
  criticidade: Criticidade;
  empresaId: string;
  competencia: string;
  documento: string;
  participante: string;
  tributo: string;
  descricao: string;
  legislacao: string;
  sugestao: string;
  valor: number;
  campos: CampoDivergente[];
  memoria: { label: string; valor: string }[];
  origem: string;
  versaoRegra: string;
};

export type AchadoResolvido = Achado & {
  situacao: Situacao;
  responsavel: string;
  nota: string;
  atualizado: string;
};

export type Certidao = {
  id: string;
  orgao: string;
  certidao: string;
  ambito: "Federal" | "Estadual" | "Municipal" | "FGTS" | "Cadastral";
  emissao: string;
  validade: string;
  situacao: "Válida" | "Vencida" | "Positiva com efeito negativo" | "Positiva" | "Pendente";
  protocolo: string;
  pendencias: string;
  consultadoEm: string;
};

export type Oportunidade = {
  id: string;
  tributo: string;
  origem: string;
  descricao: string;
  fundamentacao: string;
  documentos: number;
  valor: number;
  prazo: string;
  probabilidade: number;
  situacao: "Identificado" | "Em levantamento" | "Aproveitado" | "Prescrito";
};

export type LogAud = {
  id: string;
  data: string;
  usuario: string;
  acao: string;
  detalhe: string;
};

type Persist = {
  status: Record<string, { situacao: Situacao; responsavel: string; nota: string; atualizado: string }>;
  regras: Record<string, Partial<Regra>>;
  custom: Regra[];
  certidoes: Record<string, Certidao[]>;
  creditos: Record<string, "Identificado" | "Em levantamento" | "Aproveitado" | "Prescrito">;
  log: LogAud[];
  execucoes: { id: string; data: string; gatilho: string; achados: number; score: number }[];
  config: { tolerancia: number; responsavelPadrao: string; auditarAoImportar: boolean; auditarAntesSped: boolean };
};

/* ============================ persistência =============================== */

const vazio = (): Persist => ({
  status: {}, regras: {}, custom: [], certidoes: {}, creditos: {}, log: [], execucoes: [],
  config: { tolerancia: 0.5, responsavelPadrao: "Equipe fiscal", auditarAoImportar: true, auditarAntesSped: true },
});

export function loadAud(): Persist {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...vazio(), ...(JSON.parse(raw) as Persist) } : vazio();
  } catch {
    return vazio();
  }
}

function persist(db: Persist) {
  localStorage.setItem(KEY, JSON.stringify(db));
  window.dispatchEvent(new Event(AUDITORIA_EVENT));
}

export function novoAudId(p: string) {
  return `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function registrarLog(acao: string, detalhe: string, usuario = "Usuário atual") {
  const db = loadAud();
  db.log = [{ id: novoAudId("LOG"), data: new Date().toISOString(), usuario, acao, detalhe }, ...db.log].slice(0, 400);
  persist(db);
}

export function logAuditoria() {
  return loadAud().log;
}

export function execucoes() {
  return loadAud().execucoes;
}

export function config() {
  return loadAud().config;
}

export function salvarConfig(patch: Partial<Persist["config"]>) {
  const db = loadAud();
  db.config = { ...db.config, ...patch };
  persist(db);
  registrarLog("Parametrização", `Configurações da auditoria atualizadas: ${Object.keys(patch).join(", ")}`);
}

/* ========================== catálogo de regras =========================== */

const V = "v2026.07";

const CATALOGO: Regra[] = [
  // --- XML × Escrituração -------------------------------------------------
  r("AUD-XML-001", "XML autorizado sem escrituração", "Documental", "xml-escrituracao",
    "Documento fiscal eletrônico capturado e autorizado que não foi escriturado na competência.",
    "Ajuste SINIEF 07/05 · Guia Prático EFD-ICMS/IPI", "Crítica",
    [{ campo: "xml", operador: "igual", valor: "Capturado" }, { campo: "escriturado", operador: "igual", valor: "Não" }], "E",
    "Existe XML autorizado sem lançamento correspondente na escrituração fiscal.",
    "Escriturar o documento na competência de entrada/emissão ou justificar a exclusão.",
    "Gerar inconsistência crítica e bloquear o fechamento", 1),
  r("AUD-XML-002", "Escrituração sem XML vinculado", "Documental", "xml-escrituracao",
    "Lançamento escriturado sem chave de acesso válida de 44 dígitos.",
    "Ajuste SINIEF 07/05, cláusula nona", "Alta",
    [{ campo: "chave", operador: "vazio", valor: "" }], "E",
    "Lançamento fiscal sem XML/chave de acesso vinculada.",
    "Importar o XML do documento ou registrar a chave de acesso manualmente.",
    "Solicitar captura do XML", 2),
  r("AUD-XML-003", "Chave de acesso inválida", "Documental", "xml-escrituracao",
    "Chave de acesso com quantidade de dígitos diferente de 44.",
    "Manual de Orientação do Contribuinte NF-e 7.0", "Alta",
    [{ campo: "chave", operador: "preenchido", valor: "" }, { campo: "chaveValida", operador: "igual", valor: "Não" }], "E",
    "A chave de acesso informada não possui 44 dígitos numéricos.",
    "Recapturar o XML junto ao emitente e substituir a chave.",
    "Marcar documento para recaptura", 3),
  r("AUD-XML-004", "Documento cancelado ainda escriturado", "Documental", "xml-escrituracao",
    "Evento de cancelamento registrado com lançamento ativo na escrituração.",
    "Ajuste SINIEF 07/05, cláusula décima terceira", "Crítica",
    [{ campo: "statusDoc", operador: "contém", valor: "Cancel" }, { campo: "escriturado", operador: "igual", valor: "Sim" }], "E",
    "Documento cancelado permanece compondo a base de cálculo da competência.",
    "Estornar o lançamento e registrar o evento de cancelamento no SPED (registro C100 com COD_SIT 02).",
    "Estorno automático sugerido", 1),
  r("AUD-XML-005", "Documento denegado", "Documental", "xml-escrituracao",
    "NF-e denegada pela SEFAZ não pode gerar crédito nem débito.",
    "Manual NF-e 7.0 · item 5.3", "Alta",
    [{ campo: "statusDoc", operador: "contém", valor: "Deneg" }], "E",
    "Documento denegado identificado na competência.",
    "Excluir o documento da escrituração e inutilizar a numeração.",
    "Excluir da apuração", 2),
  r("AUD-XML-006", "Divergência de valores XML × escrituração", "Documental", "xml-escrituracao",
    "Valor contábil escriturado diferente do valor total do documento.",
    "Guia Prático EFD-ICMS/IPI · registro C100", "Alta",
    [{ campo: "divergenciaValor", operador: "igual", valor: "Sim" }], "E",
    "O valor escriturado diverge do valor total informado no documento.",
    "Conferir descontos, frete e despesas acessórias e reescriturar o documento.",
    "Recalcular o lançamento", 2),
  r("AUD-XML-007", "Base de cálculo divergente", "Tributária", "xml-escrituracao",
    "Base de ICMS informada difere da base recalculada pela regra da operação.",
    "LC 87/96, art. 13", "Média",
    [{ campo: "divergenciaBase", operador: "igual", valor: "Sim" }], "E",
    "Base de cálculo do ICMS divergente da base esperada para o CFOP.",
    "Revisar a composição da base (IPI, frete, descontos incondicionais).",
    "Sinalizar para revisão", 3),
  r("AUD-XML-008", "Tributo divergente da alíquota da operação", "Tributária", "xml-escrituracao",
    "ICMS destacado diferente do resultado de base × alíquota.",
    "RICMS/SP art. 52 · LC 87/96", "Crítica",
    [{ campo: "divergenciaTributo", operador: "igual", valor: "Sim" }], "E",
    "ICMS destacado diverge do cálculo base × alíquota aplicável.",
    "Corrigir o destaque do imposto ou emitir carta de correção quando cabível.",
    "Gerar alerta crítico", 1),
  r("AUD-XML-009", "Documento pendente de manifestação", "Documental", "xml-escrituracao",
    "NF-e de entrada sem evento de manifestação do destinatário.",
    "Ajuste SINIEF 05/16", "Média",
    [{ campo: "sentido", operador: "igual", valor: "Entrada" }, { campo: "manifestado", operador: "igual", valor: "Não" }], "E",
    "Documento de entrada sem manifestação do destinatário registrada.",
    "Registrar ciência da operação e a confirmação/desconhecimento no prazo legal.",
    "Enfileirar manifestação", 3),
  r("AUD-XML-010", "Numeração com salto na sequência", "Documental", "xml-escrituracao",
    "Quebra na sequência de numeração dos documentos emitidos.",
    "Convênio S/Nº de 1970, art. 19", "Baixa",
    [{ campo: "saltoNumeracao", operador: "igual", valor: "Sim" }], "E",
    "Salto identificado na sequência de numeração dos documentos de saída.",
    "Localizar o documento faltante, inutilizar a numeração ou justificar a quebra.",
    "Abrir tarefa de inutilização", 4),
  r("AUD-XML-011", "Documento duplicado", "Documental", "xml-escrituracao",
    "Mesma chave de acesso lançada mais de uma vez na competência.",
    "Guia Prático EFD · registro C100", "Crítica",
    [{ campo: "duplicado", operador: "igual", valor: "Sim" }], "E",
    "Chave de acesso escriturada em duplicidade.",
    "Excluir o lançamento duplicado e reprocessar a apuração da competência.",
    "Remoção sugerida", 1),

  // --- Classificação fiscal ----------------------------------------------
  r("AUD-CLS-001", "NCM ausente ou inválido", "Cadastral", "classificacao",
    "Item sem NCM ou com código fora do padrão de 8 dígitos.",
    "Decreto 11.158/2022 (TIPI) · Instrução Normativa RFB 2.121/22", "Alta",
    [{ campo: "ncmValido", operador: "igual", valor: "Não" }], "E",
    "NCM ausente ou fora do formato de 8 dígitos.",
    "Reclassificar o item conforme a TIPI vigente e atualizar o cadastro de produtos.",
    "Bloquear emissão até correção", 2),
  r("AUD-CLS-002", "CFOP incompatível com a operação", "Tributária", "classificacao",
    "CFOP de entrada usado em saída (ou vice-versa) / natureza divergente.",
    "Convênio S/Nº de 1970, Anexo — Códigos Fiscais de Operações", "Crítica",
    [{ campo: "cfopCompativel", operador: "igual", valor: "Não" }], "E",
    "CFOP incompatível com o sentido/natureza da operação.",
    "Corrigir o CFOP na nota e reescriturar; revisar a regra fiscal do produto.",
    "Gerar alerta crítico", 1),
  r("AUD-CLS-003", "CEST ausente em produto sujeito a ST", "Cadastral", "classificacao",
    "Mercadoria enquadrada em substituição tributária sem CEST informado.",
    "Convênio ICMS 142/18", "Alta",
    [{ campo: "exigeCest", operador: "igual", valor: "Sim" }, { campo: "cest", operador: "vazio", valor: "" }], "E",
    "Produto sujeito à substituição tributária sem CEST informado.",
    "Informar o CEST correspondente ao segmento do produto no cadastro do item.",
    "Complementar cadastro", 2),
  r("AUD-CLS-004", "CST de ICMS incompatível com o regime", "Tributária", "classificacao",
    "Empresa do Simples Nacional deve utilizar CSOSN; demais regimes, CST.",
    "Resolução CGSN 140/18, art. 59", "Crítica",
    [{ campo: "cstRegime", operador: "igual", valor: "Não" }], "E",
    "Código de situação tributária incompatível com o regime da empresa.",
    "Substituir CST por CSOSN (ou o inverso) conforme o regime vigente.",
    "Gerar alerta crítico", 1),
  r("AUD-CLS-005", "CST de PIS/COFINS indevido em monofásico", "Tributária", "classificacao",
    "Produto monofásico com CST que gera tributação integral.",
    "Lei 10.147/00 · IN RFB 2.121/22, art. 543", "Crítica",
    [{ campo: "monofasico", operador: "igual", valor: "Sim" }, { campo: "cstPisPermitido", operador: "igual", valor: "Não" }], "E",
    "Produto monofásico tributado com CST de PIS/COFINS não permitido.",
    "Ajustar o CST para 04/05/06 conforme a natureza monofásica e revisar créditos.",
    "Gerar alerta crítico", 1),
  r("AUD-CLS-006", "Origem da mercadoria não informada", "Cadastral", "classificacao",
    "Item sem código de origem (0 a 8).",
    "Resolução SF 13/2012 · Ajuste SINIEF 20/12", "Média",
    [{ campo: "origemItem", operador: "vazio", valor: "" }], "E",
    "Código de origem da mercadoria não informado.",
    "Preencher a origem no cadastro do produto (nacional, importado, conteúdo de importação).",
    "Complementar cadastro", 3),
  r("AUD-CLS-007", "Benefício fiscal sem fundamento legal", "Legal", "classificacao",
    "Isenção/redução aplicada sem código de benefício (cBenef) informado.",
    "Convênio ICMS 190/17 · NT 2019.001", "Alta",
    [{ campo: "beneficioSemCodigo", operador: "igual", valor: "Sim" }], "E",
    "Operação com benefício fiscal sem o respectivo fundamento legal informado.",
    "Informar o código do benefício (cBenef) e o dispositivo legal na nota.",
    "Sinalizar para revisão", 2),
  r("AUD-CLS-008", "Natureza da receita inválida (serviço)", "Tributária", "classificacao",
    "Serviço sem código de tributação municipal compatível.",
    "LC 116/03 · lista anexa", "Média",
    [{ campo: "sentido", operador: "igual", valor: "Serviço" }, { campo: "natureza", operador: "vazio", valor: "" }], "E",
    "Serviço sem código de natureza/serviço definido para o ISS.",
    "Vincular o item de serviço à lista da LC 116/03 e ao código municipal.",
    "Complementar cadastro", 3),
  r("AUD-CLS-009", "Item de serviço em nota de mercadoria", "Documental", "classificacao",
    "CFOP de serviço (5933/1933) informado em documento de mercadoria.",
    "Convênio S/Nº de 1970 · LC 116/03", "Média",
    [{ campo: "cfop", operador: "contém", valor: "933" }, { campo: "sentido", operador: "diferente", valor: "Serviço" }], "E",
    "CFOP de serviço utilizado em documento de circulação de mercadoria.",
    "Emitir NFS-e para o serviço e segregar os itens no documento.",
    "Sinalizar para revisão", 3),
  r("AUD-CLS-010", "Item sem tributação definida", "Tributária", "classificacao",
    "Documento sem base e sem imposto destacado, fora das hipóteses de isenção.",
    "LC 87/96 · RICMS", "Baixa",
    [{ campo: "semTributacao", operador: "igual", valor: "Sim" }], "E",
    "Documento sem base de cálculo nem imposto destacado.",
    "Definir a tributação do item ou informar a hipótese de isenção/não incidência.",
    "Sinalizar para revisão", 4),
];

function r(
  id: string, nome: string, categoria: CategoriaAud, grupo: CatSlug, descricao: string,
  legislacao: string, criticidade: Criticidade, condicoes: Condicao[], juncao: "E" | "OU",
  mensagem: string, sugestao: string, acaoAutomatica: string, prioridade: number,
): Regra {
  return {
    id, nome, categoria, grupo, descricao, legislacao, criticidade, condicoes, juncao,
    mensagem, sugestao, acaoAutomatica, prioridade, versao: V, vigencia: "01/01/2026", ativa: true,
  };
}

/** Catálogo efetivo = regras nativas + overrides do usuário + regras criadas. */
export function regras(): Regra[] {
  const db = loadAud();
  const nativas = CATALOGO.map((x) => ({ ...x, ...(db.regras[x.id] ?? {}) }));
  const custom = db.custom.map((x) => ({ ...x, ...(db.regras[x.id] ?? {}) }));
  return [...nativas, ...custom].sort((a, b) => a.prioridade - b.prioridade || a.id.localeCompare(b.id));
}

export function salvarRegra(regra: Regra) {
  const db = loadAud();
  if (CATALOGO.some((c) => c.id === regra.id)) {
    db.regras[regra.id] = regra;
  } else {
    const i = db.custom.findIndex((c) => c.id === regra.id);
    if (i >= 0) db.custom[i] = regra;
    else db.custom.push({ ...regra, customizada: true });
  }
  persist(db);
  registrarLog("Regra alterada", `${regra.id} — ${regra.nome} (${regra.criticidade}, ${regra.ativa ? "ativa" : "inativa"})`);
}

export function alternarRegra(id: string, ativa: boolean) {
  const atual = regras().find((x) => x.id === id);
  if (atual) salvarRegra({ ...atual, ativa });
}

export function removerRegra(id: string) {
  const db = loadAud();
  db.custom = db.custom.filter((c) => c.id !== id);
  delete db.regras[id];
  persist(db);
  registrarLog("Regra removida", id);
}

/* ============================ coletor de fatos =========================== */

const SLUGS: { slug: DocSlug; modelo: string; sentido: Fato["sentido"] }[] = [
  { slug: "entradas", modelo: "NF-e 55", sentido: "Entrada" },
  { slug: "saidas", modelo: "NF-e 55", sentido: "Saída" },
  { slug: "transporte", modelo: "CT-e 57", sentido: "Entrada" },
  { slug: "cupons", modelo: "NFC-e 65", sentido: "Saída" },
  { slug: "servicos-tomados", modelo: "NFS-e", sentido: "Serviço" },
  { slug: "servicos-prestados", modelo: "NFS-e", sentido: "Serviço" },
];

const OK: Record<string, string> = {
  entradas: "Escriturado", saidas: "Autorizada", transporte: "Escriturado",
  cupons: "Consolidado", "servicos-tomados": "Escriturado", "servicos-prestados": "Emitida",
};

/** Hash determinístico — usado para derivar atributos de item ausentes no doc. */
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const NCMS = ["8544.42.00", "7326.90.90", "2710.19.32", "3004.90.69", "0000.00.00", "8471.30.19", "2203.00.00"];
const MONOFASICOS = ["2710.19.32", "3004.90.69", "2203.00.00"];
const CST_ICMS = ["000", "020", "040", "060", "090"];
const CSOSN = ["101", "102", "202", "500"];
const CST_PIS = ["01", "04", "06", "50", "70"];
const CST_PIS_MONO = ["04", "05", "06"];

export function coletarFatos(empresaId: string, competencia: string): Fato[] {
  const out: Fato[] = [];
  const vistos = new Map<string, number>();
  const regime = regimeDaEmpresa(empresaId);
  const simples = regime === "Simples Nacional" || regime === "MEI";

  for (const { slug, modelo, sentido } of SLUGS) {
    const docs = loadDocs(slug).filter(
      (d: DocFiscal) => d.empresaId === empresaId && d.competencia === competencia,
    );
    docs.forEach((d, i) => {
      const seed = hash(`${d.id}${d.numero ?? ""}`);
      const ncm = sentido === "Serviço" ? "" : NCMS[seed % NCMS.length];
      const chave = (d.chave ?? "").replace(/\D/g, "");
      const valor = valorBR(d.valor);
      const base = valorBR(d.baseIcms);
      const icms = valorBR(d.icms);
      const cfop = d.cfop ?? "";
      const cstIcms = simples ? CSOSN[seed % CSOSN.length] : CST_ICMS[seed % CST_ICMS.length];
      const monofasico = MONOFASICOS.includes(ncm);
      const cstPis = monofasico && seed % 3 === 0 ? "01" : CST_PIS[seed % CST_PIS.length];
      const key = chave || `${slug}-${d.numero}`;
      vistos.set(key, (vistos.get(key) ?? 0) + 1);

      out.push({
        id: d.id,
        origem: slug,
        modelo,
        documento: d.numero ?? d.id,
        chave,
        participante: d.participante ?? "—",
        cnpj: d.cnpj ?? "",
        data: d.data ?? "",
        tipo: d.tipo ?? "—",
        cfop,
        ncm,
        cest: monofasico || cfop.endsWith("405") ? (seed % 4 === 0 ? "" : `28.038.00`) : "",
        cstIcms,
        cstPis,
        natureza: sentido === "Serviço" ? (seed % 5 === 0 ? "" : d.tipo ?? "") : d.tipo ?? "",
        valor,
        base,
        icms,
        statusDoc: d.status ?? "",
        escriturado: d.status === OK[slug] ? "Sim" : "Não",
        xml: chave.length === 44 ? "Capturado" : "Ausente",
        sentido,
        monofasico: monofasico ? "Sim" : "Não",
        interestadual: /^[26]/.test(cfop) ? "Sim" : "Não",
      });
      void i;
    });
  }

  // marcações que dependem do conjunto
  const numerosSaida = out
    .filter((f) => f.sentido === "Saída")
    .map((f) => Number((f.documento.match(/(\d+)\s*$/) ?? [])[1] ?? 0))
    .filter(Boolean)
    .sort((a, b) => a - b);

  return out.map((f) => ({
    ...f,
    ...derivados(f, vistos, numerosSaida, simples),
  }));
}

/** Campos calculados expostos ao motor de regras (avaliáveis nas condições). */
function derivados(
  f: Fato, vistos: Map<string, number>, numerosSaida: number[], simples: boolean,
): Record<string, string> {
  const tol = loadAud().config.tolerancia / 100;
  const chaveValida = f.chave.length === 44;
  const seed = hash(f.id);
  const esperadoIcms = f.base * (f.interestadual === "Sim" ? 0.12 : 0.18);
  const geraIcms = f.base > 0 && !["040", "041", "060", "500"].includes(f.cstIcms);
  const numero = Number((f.documento.match(/(\d+)\s*$/) ?? [])[1] ?? 0);
  const idx = numerosSaida.indexOf(numero);
  const salto = idx > 0 && numero - numerosSaida[idx - 1] > 8;

  return {
    chaveValida: chaveValida ? "Sim" : "Não",
    duplicado: (vistos.get(f.chave || `${f.origem}-${f.documento}`) ?? 0) > 1 ? "Sim" : "Não",
    manifestado: f.sentido === "Entrada" && seed % 4 === 0 ? "Não" : "Sim",
    divergenciaValor: f.sentido !== "Serviço" && f.base > 0 && Math.abs(f.valor - f.base) / Math.max(f.valor, 1) > 0.35 ? "Sim" : "Não",
    divergenciaBase: f.base > 0 && f.base > f.valor * (1 + tol) ? "Sim" : "Não",
    divergenciaTributo: geraIcms && Math.abs(f.icms - esperadoIcms) > Math.max(esperadoIcms * tol, 0.5) ? "Sim" : "Não",
    ncmValido: f.sentido === "Serviço" ? "Sim" : /^\d{4}\.\d{2}\.\d{2}$/.test(f.ncm) && f.ncm !== "0000.00.00" ? "Sim" : "Não",
    cfopCompativel: cfopCompativel(f) ? "Sim" : "Não",
    exigeCest: f.monofasico === "Sim" || f.cfop.endsWith("405") ? "Sim" : "Não",
    cstRegime: simples ? (CSOSN.includes(f.cstIcms) ? "Sim" : "Não") : (CST_ICMS.includes(f.cstIcms) ? "Sim" : "Não"),
    cstPisPermitido: f.monofasico === "Sim" ? (CST_PIS_MONO.includes(f.cstPis) ? "Sim" : "Não") : "Sim",
    origemItem: f.sentido === "Serviço" ? "0" : seed % 7 === 0 ? "" : String(seed % 9),
    beneficioSemCodigo: ["040", "041", "020"].includes(f.cstIcms) && seed % 3 === 0 ? "Sim" : "Não",
    semTributacao: f.sentido !== "Serviço" && f.base === 0 && f.icms === 0 && !["040", "041", "060", "500", "102"].includes(f.cstIcms) ? "Sim" : "Não",
    saltoNumeracao: salto ? "Sim" : "Não",
    esperadoIcms: moedaBR(esperadoIcms),
  };
}

function cfopCompativel(f: Fato) {
  if (!f.cfop) return false;
  const grupo = f.cfop[0];
  if (f.sentido === "Entrada") return ["1", "2", "3"].includes(grupo);
  if (f.sentido === "Saída") return ["5", "6", "7"].includes(grupo);
  return true;
}

/* =========================== motor de regras ============================= */

function valorCampo(fato: Record<string, unknown>, campo: string) {
  const v = fato[campo];
  return v === undefined || v === null ? "" : String(v);
}

export function avaliarCondicao(fato: Record<string, unknown>, c: Condicao) {
  const atual = valorCampo(fato, c.campo);
  const alvo = c.valor ?? "";
  switch (c.operador) {
    case "igual": return atual.toLowerCase() === alvo.toLowerCase();
    case "diferente": return atual.toLowerCase() !== alvo.toLowerCase();
    case "maior": return Number(atual.replace(",", ".")) > Number(alvo.replace(",", "."));
    case "menor": return Number(atual.replace(",", ".")) < Number(alvo.replace(",", "."));
    case "contém": return atual.toLowerCase().includes(alvo.toLowerCase());
    case "não contém": return !atual.toLowerCase().includes(alvo.toLowerCase());
    case "vazio": return atual.trim() === "";
    case "preenchido": return atual.trim() !== "";
    default: return false;
  }
}

export function avaliarRegra(fato: Record<string, unknown>, regra: Regra) {
  if (!regra.condicoes.length) return false;
  return regra.juncao === "E"
    ? regra.condicoes.every((c) => avaliarCondicao(fato, c))
    : regra.condicoes.some((c) => avaliarCondicao(fato, c));
}

export function expressaoDe(regra: Regra) {
  return regra.condicoes
    .map((c) => `${c.campo} ${c.operador}${c.valor ? ` "${c.valor}"` : ""}`)
    .join(` ${regra.juncao} `);
}

const TRIBUTO_POR_GRUPO: Record<CatSlug, string> = {
  "xml-escrituracao": "ICMS",
  classificacao: "ICMS / PIS / COFINS",
  creditos: "PIS / COFINS / ICMS",
  certidoes: "Multi",
};

/* =============================== cruzamentos ============================= */

function cruzamentos(empresaId: string, competencia: string): Achado[] {
  const out: Achado[] = [];
  const add = (
    id: string, regra: string, categoria: CategoriaAud, criticidade: Criticidade,
    descricao: string, legislacao: string, sugestao: string, valor: number,
    campos: CampoDivergente[], origem: string, memoria: { label: string; valor: string }[],
  ) => {
    out.push({
      id: `${empresaId}|${competencia}|${id}`, regraId: id, regra, grupo: "xml-escrituracao",
      categoria, criticidade, empresaId, competencia, documento: "Cruzamento entre módulos",
      participante: "—", tributo: "Multi", descricao, legislacao, sugestao, valor, campos,
      memoria, origem, versaoRegra: V,
    });
  };

  const entradas = gerarLivroEntradas(empresaId, competencia);
  const saidas = gerarLivroSaidas(empresaId, competencia);
  const baseSaidas = somar(saidas, "contabil");
  const icmsDeb = somar(saidas, "icms");
  const icmsCred = somar(entradas, "icms");

  // Fiscal × EFD Contribuições (PIS/COFINS)
  try {
    const pis = apurar("pis-cofins" as MotorSlug, empresaId, competencia);
    const receitaApurada = pis.resumo.reduce((s, x) => s + valorBR(x.valor.replace("R$", "")), 0);
    const dif = Math.abs(baseSaidas - receitaApurada);
    if (baseSaidas > 0 && receitaApurada > 0 && dif / baseSaidas > 0.05) {
      add("CRZ-001", "Fiscal × EFD-Contribuições", "Tributária", "Alta",
        "A receita escriturada nas saídas diverge da base considerada na apuração de PIS/COFINS.",
        "IN RFB 2.121/22 · Guia Prático EFD-Contribuições",
        "Revisar exclusões da base (devoluções, monofásicos, ST) e reprocessar a apuração.",
        dif,
        [{ campo: "Receita escriturada", esperado: `R$ ${moedaBR(baseSaidas)}`, encontrado: `R$ ${moedaBR(receitaApurada)}` }],
        "Livro de saídas × motor PIS/COFINS",
        [
          { label: "Receita do livro de saídas", valor: `R$ ${moedaBR(baseSaidas)}` },
          { label: "Base considerada na apuração", valor: `R$ ${moedaBR(receitaApurada)}` },
          { label: "Diferença", valor: `R$ ${moedaBR(dif)}` },
        ]);
    }
  } catch { /* motor sem dados na competência */ }

  // Fiscal × SPED / escrituração ICMS
  if (icmsDeb === 0 && baseSaidas > 0) {
    add("CRZ-002", "Fiscal × SPED Fiscal", "Tributária", "Crítica",
      "Existem saídas escrituradas sem nenhum débito de ICMS apurado na competência.",
      "LC 87/96, art. 19 · Guia Prático EFD-ICMS/IPI",
      "Verificar CST/CFOP das saídas e reprocessar a apuração de ICMS.",
      baseSaidas, [{ campo: "ICMS debitado", esperado: "> 0,00", encontrado: "0,00" }],
      "Livro de saídas × apuração de ICMS",
      [{ label: "Saídas escrituradas", valor: `R$ ${moedaBR(baseSaidas)}` }, { label: "ICMS débito", valor: "R$ 0,00" }]);
  }
  if (icmsCred > icmsDeb * 1.8 && icmsDeb > 0) {
    add("CRZ-003", "Crédito de ICMS acima do padrão", "Tributária", "Média",
      "O crédito de ICMS das entradas está muito acima do débito das saídas na competência.",
      "LC 87/96, art. 20 · RICMS",
      "Conferir entradas de uso e consumo (CFOP 1556/2556), que não geram crédito.",
      icmsCred - icmsDeb,
      [{ campo: "Crédito × débito", esperado: `≤ R$ ${moedaBR(icmsDeb * 1.8)}`, encontrado: `R$ ${moedaBR(icmsCred)}` }],
      "Livro de entradas × livro de saídas",
      [{ label: "Crédito", valor: `R$ ${moedaBR(icmsCred)}` }, { label: "Débito", valor: `R$ ${moedaBR(icmsDeb)}` }]);
  }

  // Fiscal × Contábil — documentos sem lançamento contábil
  const semContabil = SLUGS.flatMap(({ slug }) =>
    loadDocs(slug).filter((d) => d.empresaId === empresaId && d.competencia === competencia && d.status !== OK[slug]),
  );
  if (semContabil.length) {
    add("CRZ-004", "Fiscal × Contábil", "Contábil", "Alta",
      `${semContabil.length} documento(s) fiscais sem lançamento contábil correspondente na competência.`,
      "NBC TG 1000 · Decreto 9.580/18, art. 275",
      "Integrar os documentos pendentes ao lançamento contábil antes do fechamento.",
      semContabil.reduce((s, d) => s + valorBR(d.valor), 0),
      [{ campo: "Documentos integrados", esperado: "100%", encontrado: `${semContabil.length} pendente(s)` }],
      "Documentos fiscais × contabilidade",
      semContabil.slice(0, 6).map((d) => ({ label: d.numero ?? d.id, valor: `R$ ${moedaBR(valorBR(d.valor))}` })));
  }

  // Fiscal × Obrigações acessórias
  const monitor = monitorar(empresaId, competencia);
  const atrasadas = monitor.filter((m) => /atras|vencid|pend/i.test(String(m.situacao ?? m.status ?? "")));
  if (atrasadas.length) {
    add("CRZ-005", "Fiscal × Obrigações acessórias", "Legal", "Crítica",
      `${atrasadas.length} obrigação(ões) da competência ainda não transmitida(s).`,
      "IN RFB 2.005/21 · Ajuste SINIEF 02/09",
      "Concluir a geração/validação e transmitir antes do prazo para evitar multa.",
      0, [{ campo: "Obrigações transmitidas", esperado: `${monitor.length}`, encontrado: `${monitor.length - atrasadas.length}` }],
      "Monitor de obrigações",
      atrasadas.slice(0, 6).map((m) => ({ label: String(m.nome ?? m.obr), valor: String(m.situacao ?? m.status ?? "Pendente") })));
  }

  // Fiscal × Estoque / Compras — produto vendido sem entrada
  const qtdEntradas = loadDocs("entradas").filter((d) => d.empresaId === empresaId && d.competencia === competencia).length;
  const qtdSaidas = loadDocs("saidas").filter((d) => d.empresaId === empresaId && d.competencia === competencia).length;
  if (qtdSaidas > 0 && qtdEntradas === 0) {
    add("CRZ-006", "Fiscal × Estoque / Compras", "Contábil", "Média",
      "Há saídas na competência sem nenhuma entrada registrada — indício de estoque negativo.",
      "RIR/2018, art. 304 · Guia Prático EFD (bloco K)",
      "Importar as notas de entrada do período ou registrar o saldo inicial de estoque.",
      0, [{ campo: "Entradas na competência", esperado: "> 0", encontrado: "0" }],
      "Notas de saída × notas de entrada",
      [{ label: "Saídas", valor: String(qtdSaidas) }, { label: "Entradas", valor: "0" }]);
  }

  // Competência anterior sem movimento (continuidade)
  const anterior = competenciaAnterior(competencia);
  const docsAnt = loadDocs("saidas").filter((d) => d.empresaId === empresaId && d.competencia === anterior).length;
  if (qtdSaidas > 0 && docsAnt === 0) {
    add("CRZ-007", "Continuidade da escrituração", "Documental", "Informativa",
      `Não há movimento escriturado na competência anterior (${anterior}).`,
      "Convênio S/Nº de 1970, art. 19",
      "Confirmar se a competência anterior foi encerrada sem movimento.",
      0, [{ campo: "Competência anterior", esperado: "Escriturada", encontrado: "Sem movimento" }],
      "Histórico de competências", [{ label: "Competência", valor: anterior }]);
  }

  return out;
}

/* ============================== achados ================================== */

export function auditar(empresaId?: string | null, competencia?: string): AchadoResolvido[] {
  if (!empresaId || !competencia) return [];
  const db = loadAud();
  const fatos = coletarFatos(empresaId, competencia);
  const ativas = regras().filter((x) => x.ativa);
  const out: Achado[] = [];

  for (const fato of fatos) {
    const registro = fato as unknown as Record<string, unknown>;
    for (const regra of ativas) {
      if (!avaliarRegra(registro, regra)) continue;
      out.push({
        id: `${empresaId}|${competencia}|${regra.id}|${fato.id}`,
        regraId: regra.id,
        regra: regra.nome,
        grupo: regra.grupo,
        categoria: regra.categoria,
        criticidade: regra.criticidade,
        empresaId,
        competencia,
        documento: `${fato.modelo} · ${fato.documento}`,
        participante: fato.participante,
        tributo: TRIBUTO_POR_GRUPO[regra.grupo],
        descricao: regra.mensagem,
        legislacao: regra.legislacao,
        sugestao: regra.sugestao,
        valor: fato.valor,
        campos: camposDivergentes(fato, regra, registro),
        memoria: [
          { label: "Regra aplicada", valor: `${regra.id} · ${regra.versao}` },
          { label: "Expressão lógica", valor: expressaoDe(regra) },
          { label: "Documento", valor: `${fato.modelo} ${fato.documento}` },
          { label: "Chave de acesso", valor: fato.chave || "não informada" },
          { label: "CFOP / NCM / CST", valor: `${fato.cfop || "—"} · ${fato.ncm || "—"} · ${fato.cstIcms}` },
          { label: "Valor do documento", valor: `R$ ${moedaBR(fato.valor)}` },
          { label: "Base / imposto", valor: `R$ ${moedaBR(fato.base)} · R$ ${moedaBR(fato.icms)}` },
          { label: "Origem do dado", valor: `Documentos fiscais › ${fato.origem}` },
          { label: "Ação automática", valor: regra.acaoAutomatica },
        ],
        origem: `Documentos fiscais › ${fato.origem}`,
        versaoRegra: regra.versao,
      });
    }
  }

  out.push(...cruzamentos(empresaId, competencia));

  const ordem: Criticidade[] = ["Crítica", "Alta", "Média", "Baixa", "Informativa"];
  return out
    .map((a) => {
      const s = db.status[a.id];
      return {
        ...a,
        situacao: s?.situacao ?? ("Aberta" as Situacao),
        responsavel: s?.responsavel ?? db.config.responsavelPadrao,
        nota: s?.nota ?? "",
        atualizado: s?.atualizado ?? "",
      };
    })
    .sort((a, b) => ordem.indexOf(a.criticidade) - ordem.indexOf(b.criticidade) || a.regraId.localeCompare(b.regraId));
}

function camposDivergentes(fato: Fato, regra: Regra, registro: Record<string, unknown>): CampoDivergente[] {
  return regra.condicoes.map((c) => ({
    campo: c.campo,
    esperado:
      c.operador === "igual" ? `≠ ${c.valor}` :
      c.operador === "vazio" ? "valor informado" :
      c.operador === "preenchido" ? "—" :
      c.valor || "conforme regra",
    encontrado: String(registro[c.campo] ?? "—") || "vazio",
  })).concat(
    regra.id === "AUD-XML-008"
      ? [{ campo: "ICMS destacado", esperado: `R$ ${String(registro.esperadoIcms ?? "0,00")}`, encontrado: `R$ ${moedaBR(fato.icms)}` }]
      : [],
  );
}

export function atualizarSituacao(
  achadoId: string, situacao: Situacao, responsavel: string, nota = "",
) {
  const db = loadAud();
  db.status[achadoId] = { situacao, responsavel, nota, atualizado: new Date().toISOString() };
  persist(db);
  registrarLog("Inconsistência atualizada", `${achadoId.split("|").slice(2).join(" · ")} → ${situacao}`, responsavel);
}

export function reprocessar(empresaId: string, competencia: string, gatilho = "Reprocessamento manual") {
  const achados = auditar(empresaId, competencia);
  const db = loadAud();
  db.execucoes = [
    {
      id: novoAudId("EXE"),
      data: new Date().toISOString(),
      gatilho,
      achados: achados.filter((a) => a.situacao !== "Ignorada" && a.situacao !== "Corrigida").length,
      score: complianceScore(achados),
    },
    ...db.execucoes,
  ].slice(0, 60);
  persist(db);
  registrarLog("Auditoria executada", `${gatilho} · ${achados.length} achado(s) avaliados na competência ${competencia}`);
  return achados;
}

/* ============================== indicadores ============================== */

const PESO: Record<Criticidade, number> = {
  Crítica: 12, Alta: 7, Média: 3, Baixa: 1, Informativa: 0,
};

export function complianceScore(achados: AchadoResolvido[]) {
  const abertos = achados.filter((a) => a.situacao === "Aberta" || a.situacao === "Em análise");
  const penal = abertos.reduce((s, a) => s + PESO[a.criticidade], 0);
  return Math.max(0, Math.min(100, Math.round(100 - penal)));
}

export function resumoAchados(achados: AchadoResolvido[]) {
  const por = (c: Criticidade) => achados.filter((a) => a.criticidade === c).length;
  const abertos = achados.filter((a) => a.situacao === "Aberta");
  return {
    total: achados.length,
    criticos: por("Crítica"),
    altos: por("Alta"),
    medios: por("Média"),
    baixos: por("Baixa"),
    informativos: por("Informativa"),
    abertos: abertos.length,
    emAnalise: achados.filter((a) => a.situacao === "Em análise").length,
    corrigidos: achados.filter((a) => a.situacao === "Corrigida").length,
    ignorados: achados.filter((a) => a.situacao === "Ignorada").length,
    valorEmRisco: abertos.reduce((s, a) => s + a.valor, 0),
    score: complianceScore(achados),
  };
}

/* ========================= créditos extemporâneos ======================== */

export function oportunidades(empresaId?: string | null, competencia?: string): Oportunidade[] {
  if (!empresaId || !competencia) return [];
  const db = loadAud();
  const entradas = loadDocs("entradas").filter((d) => d.empresaId === empresaId);
  const tomados = loadDocs("servicos-tomados").filter((d) => d.empresaId === empresaId);
  const transporte = loadDocs("transporte").filter((d) => d.empresaId === empresaId);
  const ano = Number(competencia.slice(0, 4));
  const prazo = `31/12/${ano + 4}`;

  const usoConsumo = entradas.filter((d) => ["1556", "2556", "1551", "2551"].includes(d.cfop ?? ""));
  const st = entradas.filter((d) => ["1403", "1405", "2403"].includes(d.cfop ?? ""));
  const baseUso = usoConsumo.reduce((s, d) => s + valorBR(d.valor), 0);
  const baseSt = st.reduce((s, d) => s + valorBR(d.valor), 0);
  const baseFrete = transporte.reduce((s, d) => s + valorBR(d.valor), 0);
  const baseServ = tomados.reduce((s, d) => s + valorBR(d.valor), 0);

  const brutas: Oportunidade[] = [
    {
      id: `${empresaId}-pis`, tributo: "PIS/COFINS", origem: "Insumos não creditados",
      descricao: "Aquisições classificadas como uso e consumo que atendem ao critério de essencialidade e relevância.",
      fundamentacao: "STJ REsp 1.221.170/PR (Tema 779) · IN RFB 2.121/22, art. 175",
      documentos: usoConsumo.length, valor: baseUso * 0.0925, prazo, probabilidade: 72,
      situacao: "Identificado",
    },
    {
      id: `${empresaId}-icms-st`, tributo: "ICMS-ST", origem: "ST recolhida a maior",
      descricao: "Diferença entre a base presumida da substituição tributária e o preço efetivo de venda.",
      fundamentacao: "STF RE 593.849 (Tema 201) · Convênio ICMS 142/18",
      documentos: st.length, valor: baseSt * 0.06, prazo, probabilidade: 64,
      situacao: "Identificado",
    },
    {
      id: `${empresaId}-icms-frete`, tributo: "ICMS", origem: "Crédito de frete (CT-e)",
      descricao: "Créditos de ICMS sobre serviços de transporte vinculados a operações tributadas.",
      fundamentacao: "LC 87/96, art. 20 · RICMS",
      documentos: transporte.length, valor: baseFrete * 0.12, prazo, probabilidade: 81,
      situacao: "Identificado",
    },
    {
      id: `${empresaId}-inss`, tributo: "INSS / Reinf", origem: "Retenções previdenciárias",
      descricao: "Retenções de 11% sobre cessão de mão de obra não compensadas nas competências anteriores.",
      fundamentacao: "IN RFB 2.110/22, art. 112 · Lei 8.212/91, art. 31",
      documentos: tomados.length, valor: baseServ * 0.11 * 0.3, prazo, probabilidade: 58,
      situacao: "Identificado",
    },
    {
      id: `${empresaId}-ipi`, tributo: "IPI", origem: "Crédito de insumos industriais",
      descricao: "Insumos aplicados no processo produtivo com direito a crédito não escriturado.",
      fundamentacao: "RIPI/2010, art. 226",
      documentos: entradas.length, valor: baseUso * 0.05, prazo, probabilidade: 47,
      situacao: "Identificado",
    },
    {
      id: `${empresaId}-perdcomp`, tributo: "PER/DCOMP", origem: "Saldo negativo de IRPJ/CSLL",
      descricao: "Saldo negativo apurado passível de restituição ou compensação via PER/DCOMP.",
      fundamentacao: "IN RFB 2.055/21",
      documentos: 0, valor: baseServ * 0.02, prazo, probabilidade: 69,
      situacao: "Identificado",
    },
  ];

  return brutas
    .filter((o) => o.valor > 0)
    .map((o) => ({ ...o, valor: Math.round(o.valor * 100) / 100, situacao: db.creditos[o.id] ?? o.situacao }));
}

export function marcarCredito(id: string, situacao: Oportunidade["situacao"]) {
  const db = loadAud();
  db.creditos[id] = situacao;
  persist(db);
  registrarLog("Crédito tributário", `${id} → ${situacao}`);
}

export function resumoCreditos(lista: Oportunidade[]) {
  const soma = (f: (o: Oportunidade) => boolean) =>
    lista.filter(f).reduce((s, o) => s + o.valor, 0);
  return {
    identificados: lista.length,
    recuperavel: soma((o) => o.situacao === "Identificado" || o.situacao === "Em levantamento"),
    aproveitado: soma((o) => o.situacao === "Aproveitado"),
    prescrito: soma((o) => o.situacao === "Prescrito"),
    total: soma(() => true),
  };
}

/* ============================== certidões ================================ */

function certidoesPadrao(): Certidao[] {
  const hoje = new Date();
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR");
  const mais = (dias: number) => fmt(new Date(hoje.getTime() + dias * 86400000));
  const menos = (dias: number) => fmt(new Date(hoje.getTime() - dias * 86400000));
  return [
    c("Receita Federal / PGFN", "CND conjunta federal", "Federal", menos(48), mais(132), "Válida", "RFB-2026-004821", ""),
    c("SEFAZ estadual", "CND de tributos estaduais", "Estadual", menos(27), mais(63), "Válida", "SEF-2026-11902", ""),
    c("Prefeitura municipal", "CND de tributos municipais", "Municipal", menos(134), menos(14), "Vencida", "PMU-2026-77301", "ISS de competências anteriores em aberto"),
    c("Caixa Econômica Federal", "CRF do FGTS", "FGTS", menos(19), mais(41), "Válida", "CEF-2026-55118", ""),
    c("Receita Federal", "Situação cadastral do CNPJ", "Cadastral", menos(3), mais(87), "Válida", "CAD-2026-00912", ""),
    c("Receita Federal", "CADIN — consulta de pendências", "Federal", menos(9), mais(81), "Pendente", "CADIN-2026-3310", "Consulta aguardando importação do resultado"),
    c("SEFAZ estadual", "SINTEGRA — regularidade cadastral", "Estadual", menos(61), mais(29), "Positiva com efeito negativo", "SIN-2026-2044", "Parcelamento ativo de ICMS"),
  ];
}

function c(
  orgao: string, certidao: string, ambito: Certidao["ambito"], emissao: string,
  validade: string, situacao: Certidao["situacao"], protocolo: string, pendencias: string,
): Certidao {
  return {
    id: novoAudId("CND"), orgao, certidao, ambito, emissao, validade, situacao, protocolo,
    pendencias, consultadoEm: emissao,
  };
}

export function certidoes(empresaId?: string | null): Certidao[] {
  if (!empresaId) return [];
  const db = loadAud();
  if (!db.certidoes[empresaId]) {
    db.certidoes[empresaId] = certidoesPadrao();
    persist(db);
  }
  return db.certidoes[empresaId];
}

export function salvarCertidao(empresaId: string, cert: Certidao) {
  const db = loadAud();
  const lista = [...(db.certidoes[empresaId] ?? certidoesPadrao())];
  const i = lista.findIndex((x) => x.id === cert.id);
  if (i >= 0) lista[i] = cert;
  else lista.push(cert);
  db.certidoes[empresaId] = lista;
  persist(db);
  registrarLog("Certidão atualizada", `${cert.orgao} · ${cert.certidao} — ${cert.situacao}`);
}

export function removerCertidao(empresaId: string, id: string) {
  const db = loadAud();
  db.certidoes[empresaId] = (db.certidoes[empresaId] ?? []).filter((x) => x.id !== id);
  persist(db);
  registrarLog("Certidão removida", id);
}

/** Consulta simulada ao órgão emissor (nenhuma chamada externa é realizada). */
export function consultarCertidao(empresaId: string, id: string) {
  const lista = certidoes(empresaId);
  const cert = lista.find((x) => x.id === id);
  if (!cert) return;
  const hoje = new Date();
  const validade = new Date(hoje.getTime() + 180 * 86400000);
  salvarCertidao(empresaId, {
    ...cert,
    emissao: hoje.toLocaleDateString("pt-BR"),
    validade: validade.toLocaleDateString("pt-BR"),
    consultadoEm: hoje.toLocaleDateString("pt-BR"),
    situacao: cert.pendencias ? "Positiva com efeito negativo" : "Válida",
    protocolo: `${cert.protocolo.split("-")[0]}-${hoje.getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`,
  });
}

export function diasParaVencer(validade: string) {
  const m = validade.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return 0;
  const alvo = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Math.ceil((alvo.getTime() - Date.now()) / 86400000);
}

export function resumoCertidoes(lista: Certidao[]) {
  return {
    total: lista.length,
    validas: lista.filter((x) => x.situacao === "Válida").length,
    vencidas: lista.filter((x) => x.situacao === "Vencida" || diasParaVencer(x.validade) < 0).length,
    aVencer: lista.filter((x) => diasParaVencer(x.validade) >= 0 && diasParaVencer(x.validade) <= 30).length,
    pendencias: lista.filter((x) => x.pendencias.trim() !== "").length,
    restricoes: lista.filter((x) => x.situacao === "Positiva").length,
  };
}

/* ============================== categorias =============================== */

export const CATEGORIAS: {
  slug: CatSlug; titulo: string; descricao: string; submodulos: string[]; rota: string;
}[] = [
  {
    slug: "xml-escrituracao", titulo: "XML × Escrituração",
    descricao: "Conferência entre documentos fiscais eletrônicos e a escrituração fiscal.",
    submodulos: ["XML capturados", "XML não escriturados", "Escrituração sem XML", "Divergência de valores", "Divergência de bases", "Divergência de tributos", "Divergência de chaves", "Eventos NF-e", "Cancelamentos", "Cartas de correção", "Manifestação do destinatário"],
    rota: "/fiscal/auditoria/xml-escrituracao",
  },
  {
    slug: "classificacao", titulo: "Divergências de NCM / CST / CFOP",
    descricao: "Análise da classificação tributária dos documentos fiscais.",
    submodulos: ["NCM", "CEST", "CFOP", "CST ICMS", "CSOSN", "CST PIS", "CST COFINS", "Origem da mercadoria", "Benefícios fiscais", "Natureza da receita", "Regras fiscais"],
    rota: "/fiscal/auditoria/classificacao",
  },
  {
    slug: "creditos", titulo: "Créditos extemporâneos",
    descricao: "Identificação de oportunidades de recuperação de créditos tributários.",
    submodulos: ["PIS", "COFINS", "ICMS", "ICMS-ST", "IPI", "INSS", "PER/DCOMP", "Créditos prescritos", "Créditos recuperáveis", "Créditos utilizados"],
    rota: "/fiscal/auditoria/creditos",
  },
  {
    slug: "certidoes", titulo: "Certidões e regularidade",
    descricao: "Monitoramento da situação fiscal e cadastral da empresa.",
    submodulos: ["CND federal", "CND estadual", "CND municipal", "FGTS", "Receita Federal", "Procuradoria", "CADIN", "SINTEGRA", "Situação cadastral", "Regularidade fiscal"],
    rota: "/fiscal/auditoria/certidoes",
  },
];

export const FLUXO = [
  "Importação dos documentos",
  "Cruzamento entre módulos",
  "Aplicação das regras fiscais",
  "Identificação de inconsistências",
  "Classificação por criticidade",
  "Sugestão de correção",
  "Reprocessamento",
  "Revalidação",
  "Histórico",
  "Auditoria",
];

export const CAMPOS_REGRA = [
  "cfop", "ncm", "cest", "cstIcms", "cstPis", "natureza", "modelo", "sentido", "tipo",
  "statusDoc", "escriturado", "xml", "chave", "chaveValida", "duplicado", "manifestado",
  "monofasico", "interestadual", "valor", "base", "icms", "participante", "cnpj",
  "divergenciaValor", "divergenciaBase", "divergenciaTributo", "ncmValido", "cfopCompativel",
  "exigeCest", "cstRegime", "cstPisPermitido", "origemItem", "beneficioSemCodigo",
  "semTributacao", "saltoNumeracao",
];

export const OPERADORES: Operador[] = [
  "igual", "diferente", "maior", "menor", "contém", "não contém", "vazio", "preenchido",
];

export const CRITICIDADES: Criticidade[] = ["Crítica", "Alta", "Média", "Baixa", "Informativa"];
export const CATEGORIAS_AUD: CategoriaAud[] = ["Tributária", "Contábil", "Financeira", "Cadastral", "Documental", "Legal"];
export const SITUACOES: Situacao[] = ["Aberta", "Em análise", "Corrigida", "Ignorada", "Reprocessada"];

export const brlAud = (n: number) => `R$ ${moedaBR(n)}`;

export const CORES: Record<Criticidade, string> = {
  Crítica: "bg-destructive/15 text-destructive",
  Alta: "bg-brand-orange/15 text-brand-orange",
  Média: "bg-warn/15 text-warn",
  Baixa: "bg-muted text-muted-foreground",
  Informativa: "bg-muted text-muted-foreground",
};

/* ================================ hooks ================================== */

function useAuditoriaTick() {
  const [, set] = useState(0);
  useEffect(() => {
    const refresh = () => set((n) => n + 1);
    window.addEventListener(AUDITORIA_EVENT, refresh);
    window.addEventListener("usecontabil:fiscal-changed", refresh);
    window.addEventListener("usecontabil:escrituracao-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(AUDITORIA_EVENT, refresh);
      window.removeEventListener("usecontabil:fiscal-changed", refresh);
      window.removeEventListener("usecontabil:escrituracao-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
}

export function useAuditoria(empresaId?: string | null, competencia?: string) {
  useAuditoriaTick();
  return auditar(empresaId, competencia);
}

export function useRegras() {
  useAuditoriaTick();
  return regras();
}

export function useCertidoes(empresaId?: string | null) {
  useAuditoriaTick();
  return certidoes(empresaId);
}

export function useOportunidades(empresaId?: string | null, competencia?: string) {
  useAuditoriaTick();
  return oportunidades(empresaId, competencia);
}

export function useLogAuditoria() {
  useAuditoriaTick();
  return { log: logAuditoria(), execucoes: execucoes(), config: config() };
}
