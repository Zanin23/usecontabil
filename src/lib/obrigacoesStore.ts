// ============================================================================
// Motor de Obrigações Acessórias — arquitetura modular.
// Cada obrigação possui seu próprio gerador de blocos/registros, seu motor de
// validação e sua camada de transmissão, compartilhando auditoria,
// versionamento e monitoramento comuns.
// Tudo é interno/visual: nenhuma comunicação real com Receita, SEFAZ ou
// prefeituras. Protocolos, recibos e tempos de processamento são simulados.
// ============================================================================
import { useEffect, useState } from "react";
import { docsValidos, docsDoPeriodo, apurar, getEstado as getApEstado, regimeDaEmpresa, rs } from "@/lib/apuracaoStore";
import { linhasDoPeriodo, somar } from "@/lib/escrituracaoStore";
import { moedaBR, valorBR } from "@/lib/fiscalStore";
import { getEmpresa } from "@/lib/empresasStore";
import { loadFiliais } from "@/lib/filiaisStore";
import { loadRegistros } from "@/lib/empresaDadosStore";
import { getStorageSuffix } from "@/lib/praticaStore";

const KEY_BASE = "usecontabil.obrigacoes.v1";
const KEY = () => KEY_BASE + getStorageSuffix();
export const OBRIGACOES_EVENT = "usecontabil:obrigacoes-changed";

const USUARIO = "M. Andrade";

export type ObrSlug =
  | "sped-fiscal"
  | "efd-contribuicoes"
  | "ecd-ecf"
  | "dctfweb"
  | "reinf"
  | "estaduais";

/* ================================ estado ================================ */

export type ObrStatus =
  | "Não iniciada"
  | "Em geração"
  | "Com inconsistências"
  | "Gerada"
  | "Assinada"
  | "Em processamento"
  | "Transmitida"
  | "Rejeitada";

export type Arquivo = {
  id: string;
  versao: number;
  nome: string;
  formato: "TXT" | "XML";
  geradoEm: string;
  linhas: number;
  tamanhoKb: number;
  hash: string;
  layout: string;
  assinado: boolean;
};

export type Assinatura = {
  id: string;
  arquivoId: string;
  certificado: string;
  titular: string;
  validade: string;
  em: string;
  usuario: string;
};

export type Transmissao = {
  id: string;
  arquivoId: string;
  versao: number;
  em: string;
  situacao: "Em processamento" | "Transmitida" | "Rejeitada";
  protocolo: string;
  recibo: string;
  tempoMs: number;
  mensagem: string;
};

export type ObrLog = {
  id: string;
  em: string;
  usuario: string;
  acao: string;
  detalhe: string;
};

export type ObrEstado = {
  status: ObrStatus;
  responsavel: string;
  atualizadoEm: string;
  versaoLayout: string;
  etapa: number;
  parametros: Record<string, string>;
  arquivos: Arquivo[];
  assinaturas: Assinatura[];
  transmissoes: Transmissao[];
  log: ObrLog[];
};

type DB = Record<string, ObrEstado>;

export const chaveObr = (obr: ObrSlug, empresaId: string, competencia: string) =>
  `${obr}::${empresaId}::${competencia}`;

function notify() {
  window.dispatchEvent(new Event(OBRIGACOES_EVENT));
}

function loadDB(): DB {
  try {
    return JSON.parse(localStorage.getItem(KEY()) ?? "{}") as DB;
  } catch {
    return {};
  }
}

function saveDB(db: DB) {
  localStorage.setItem(KEY(), JSON.stringify(db));
  notify();
}

export function novoObrId(prefixo: string) {
  return `${prefixo}-${Math.random().toString(36).slice(2, 9)}`;
}

export function estadoObrPadrao(obr: ObrSlug): ObrEstado {
  return {
    status: "Não iniciada",
    responsavel: "Equipe fiscal",
    atualizadoEm: new Date().toISOString(),
    versaoLayout: CATALOGO.find((o) => o.slug === obr)?.layoutVigente ?? "—",
    etapa: 0,
    parametros: {},
    arquivos: [],
    assinaturas: [],
    transmissoes: [],
    log: [],
  };
}

export function getObrEstado(obr: ObrSlug, empresaId?: string | null, competencia?: string): ObrEstado {
  if (!empresaId || !competencia) return estadoObrPadrao(obr);
  return loadDB()[chaveObr(obr, empresaId, competencia)] ?? estadoObrPadrao(obr);
}

/** Grava estado e acrescenta entrada imutável no log de auditoria. */
export function setObrEstado(
  obr: ObrSlug,
  empresaId: string,
  competencia: string,
  patch: Partial<ObrEstado>,
  evento?: { acao: string; detalhe: string },
) {
  const db = loadDB();
  const k = chaveObr(obr, empresaId, competencia);
  const atual = db[k] ?? estadoObrPadrao(obr);
  const log = evento
    ? [
        {
          id: novoObrId("log"),
          em: new Date().toISOString(),
          usuario: USUARIO,
          acao: evento.acao,
          detalhe: evento.detalhe,
        },
        ...atual.log,
      ].slice(0, 200)
    : atual.log;
  db[k] = { ...atual, ...patch, log, atualizadoEm: new Date().toISOString() };
  saveDB(db);
  return db[k];
}

export function useObrEstado(obr: ObrSlug, empresaId?: string | null, competencia?: string | string[]) {
  const [estado, setLocal] = useState<ObrEstado>(() => getObrEstado(obr, empresaId, Array.isArray(competencia) ? competencia[competencia.length - 1] : competencia));
  useEffect(() => {
    const sync = () => setLocal(getObrEstado(obr, empresaId, Array.isArray(competencia) ? competencia[competencia.length - 1] : competencia));
    sync();
    window.addEventListener(OBRIGACOES_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(OBRIGACOES_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [obr, empresaId, competencia]);
  return estado;
}

/* ============================== catálogo ================================ */

export type LayoutHist = { versao: string; vigencia: string; nota: string };

export type ObrigacaoDef = {
  slug: ObrSlug;
  titulo: string;
  sigla: string;
  descricao: string;
  orgao: string;
  periodicidade: "Mensal" | "Anual";
  submodulos: string[];
  layoutVigente: string;
  layouts: LayoutHist[];
  /** dia do vencimento e quantos meses após a competência */
  prazo: { dia: number; meses: number };
  formato: "TXT" | "XML";
};

export const CATALOGO: ObrigacaoDef[] = [
  {
    slug: "sped-fiscal",
    titulo: "SPED Fiscal (EFD ICMS/IPI)",
    sigla: "EFD ICMS/IPI",
    descricao: "Escrituração digital do ICMS e do IPI a partir dos documentos e livros da competência.",
    orgao: "SEFAZ / Receita Federal",
    periodicidade: "Mensal",
    submodulos: ["Geração", "Validação", "Pendências", "Auditoria", "Assinatura digital", "Transmissão", "Histórico", "Download", "Logs"],
    layoutVigente: "Guia Prático 3.1.6",
    layouts: [
      { versao: "Guia Prático 3.1.6", vigencia: "a partir de 01/2026", nota: "Novos ajustes de apuração e registro 0221." },
      { versao: "Guia Prático 3.1.5", vigencia: "01/2025 a 12/2025", nota: "Versão anterior, usada em reprocessamentos." },
      { versao: "Guia Prático 3.1.2", vigencia: "01/2023 a 12/2024", nota: "Layout legado." },
    ],
    prazo: { dia: 20, meses: 1 },
    formato: "TXT",
  },
  {
    slug: "efd-contribuicoes",
    titulo: "EFD-Contribuições",
    sigla: "EFD-Contribuições",
    descricao: "Escrituração de PIS e COFINS com créditos, débitos e blocos de apuração.",
    orgao: "Receita Federal",
    periodicidade: "Mensal",
    submodulos: ["Geração", "Créditos", "Débitos", "Blocos", "Auditoria", "Assinatura", "Transmissão", "Histórico"],
    layoutVigente: "Layout 007",
    layouts: [
      { versao: "Layout 007", vigencia: "a partir de 01/2026", nota: "Exclusão do ICMS da base e novos códigos de natureza." },
      { versao: "Layout 006", vigencia: "01/2023 a 12/2025", nota: "Versão anterior." },
    ],
    prazo: { dia: 14, meses: 2 },
    formato: "TXT",
  },
  {
    slug: "ecd-ecf",
    titulo: "ECD e ECF",
    sigla: "ECD / ECF",
    descricao: "Escrituração Contábil Digital e Escrituração Contábil Fiscal do ano-base.",
    orgao: "Receita Federal",
    periodicidade: "Anual",
    submodulos: ["Plano de contas", "Lançamentos", "Demonstrações", "LALUR", "LACS", "Recuperação da ECD", "Cruzamentos", "Assinatura", "Validação"],
    layoutVigente: "ECD 10 / ECF 11",
    layouts: [
      { versao: "ECD 10 / ECF 11", vigencia: "ano-base 2025 em diante", nota: "Novos registros de participantes e plano referencial." },
      { versao: "ECD 9 / ECF 10", vigencia: "ano-base 2023 e 2024", nota: "Layout anterior." },
    ],
    prazo: { dia: 31, meses: 10 },
    formato: "TXT",
  },
  {
    slug: "dctfweb",
    titulo: "DCTF / DCTFWeb",
    sigla: "DCTFWeb",
    descricao: "Confissão dos débitos federais, vinculações de crédito e emissão do DARF.",
    orgao: "Receita Federal",
    periodicidade: "Mensal",
    submodulos: ["Débitos", "Créditos", "Vinculações", "DARF", "Compensações", "Fechamento", "Transmissão"],
    layoutVigente: "DCTFWeb 2026.1",
    layouts: [
      { versao: "DCTFWeb 2026.1", vigencia: "a partir de 01/2026", nota: "Integração total com EFD-Reinf e eSocial." },
      { versao: "DCTFWeb 2024.2", vigencia: "01/2024 a 12/2025", nota: "Versão anterior." },
    ],
    prazo: { dia: 15, meses: 1 },
    formato: "XML",
  },
  {
    slug: "reinf",
    titulo: "EFD-Reinf",
    sigla: "EFD-Reinf",
    descricao: "Eventos de retenções e informações fiscais de terceiros, com fechamento e consulta.",
    orgao: "Receita Federal",
    periodicidade: "Mensal",
    submodulos: ["R-1000", "R-2010", "R-2020", "R-2055", "R-2099", "Fechamento", "Consulta RET", "Histórico"],
    layoutVigente: "Leiaute 2.1.2",
    layouts: [
      { versao: "Leiaute 2.1.2", vigencia: "a partir de 01/2026", nota: "Série R-4000 e novos códigos de receita." },
      { versao: "Leiaute 1.5.1", vigencia: "até 12/2025", nota: "Layout anterior." },
    ],
    prazo: { dia: 15, meses: 1 },
    formato: "XML",
  },
  {
    slug: "estaduais",
    titulo: "Obrigações estaduais e municipais",
    sigla: "GIA / DeSTDA / ISS",
    descricao: "GIA, Sintegra, DeSTDA, DES, DECLAN, NFTS e declarações municipais do ISS.",
    orgao: "SEFAZ estaduais e prefeituras",
    periodicidade: "Mensal",
    submodulos: ["GIA", "Sintegra", "DeSTDA", "DES", "DECLAN", "ISS", "NFTS", "Declarações municipais"],
    layoutVigente: "Pacote UF 2026.07",
    layouts: [
      { versao: "Pacote UF 2026.07", vigencia: "a partir de 07/2026", nota: "Atualização de alíquotas e novos campos da GIA-SP." },
      { versao: "Pacote UF 2025.12", vigencia: "até 06/2026", nota: "Versão anterior." },
    ],
    prazo: { dia: 16, meses: 1 },
    formato: "TXT",
  },
];

export function defDe(obr: ObrSlug) {
  return CATALOGO.find((o) => o.slug === obr)!;
}

/* ============================= saída do motor =========================== */

export type MemoriaGeracao = {
  regra: string;
  legislacao: string;
  formula: string;
  passos: { label: string; valor: string }[];
  versaoRegra: string;
};

export type RegistroSped = {
  id: string;
  codigo: string;
  nome: string;
  ocorrencias: number;
  linha: number;
  campos: { campo: string; valor: string }[];
  origem: { tabela: string; documento: string; campo: string };
  memoria: MemoriaGeracao;
};

export type BlocoSped = {
  codigo: string;
  nome: string;
  obrigatorio: boolean;
  registros: RegistroSped[];
};

export type Validacao = {
  id: string;
  codigo: string;
  tipo: "erro" | "advertência" | "pendência";
  titulo: string;
  detalhe: string;
  destino?: string;
};

export type Cruzamento = {
  id: string;
  origem: string;
  destino: string;
  valorOrigem: number;
  valorDestino: number;
  diferenca: number;
  situacao: "Conferido" | "Divergente";
};

export type ObrKpi = { label: string; valor: string; hint?: string; destaque?: boolean };

export type Geracao = {
  obr: ObrSlug;
  kpis: ObrKpi[];
  blocos: BlocoSped[];
  totalRegistros: number;
  totalLinhas: number;
  validacoes: Validacao[];
  cruzamentos: Cruzamento[];
  dados: { fonte: string; registros: number; valor: string; destino: string }[];
  resumo: { label: string; valor: string }[];
};

/* ============================== utilidades ============================== */

let seqLinha = 0;
function mem(regra: string, legislacao: string, formula: string, passos: { label: string; valor: string }[]): MemoriaGeracao {
  return { regra, legislacao, formula, passos, versaoRegra: "v2026.07" };
}

function reg(
  codigo: string,
  nome: string,
  ocorrencias: number,
  campos: { campo: string; valor: string }[],
  origem: { tabela: string; documento: string; campo: string },
  memoria: MemoriaGeracao,
): RegistroSped {
  seqLinha += Math.max(1, ocorrencias);
  return { id: novoObrId("reg"), codigo, nome, ocorrencias, linha: seqLinha, campos, origem, memoria };
}

export function vencimentoDe(obr: ObrSlug, competencia: string) {
  const d = defDe(obr);
  const [a, m] = competencia.split("-").map(Number);
  const dt = new Date(a, m - 1 + d.prazo.meses, d.prazo.dia);
  return dt;
}

export function vencimentoBR(obr: ObrSlug, competencia: string) {
  return vencimentoDe(obr, competencia).toLocaleDateString("pt-BR");
}

export function diasRestantes(obr: ObrSlug, competencia: string) {
  const hoje = new Date();
  const venc = vencimentoDe(obr, competencia);
  return Math.ceil((venc.getTime() - hoje.getTime()) / 86_400_000);
}

function somaDocs(docs: { [k: string]: string }[], campo: string) {
  return docs.reduce((s, d) => s + valorBR(d[campo]), 0);
}

function certificadoValido(empresaId: string | null) {
  if (!empresaId) return null;
  const certs = loadRegistros("certificados", empresaId);
  return certs.find((c) => (c.situacao ?? "").toLowerCase() !== "vencido") ?? null;
}

function contadorDaEmpresa(empresaId: string | null) {
  if (!empresaId) return "";
  const e = getEmpresa(empresaId);
  const raw = (e?.raw ?? {}) as Record<string, string>;
  return raw.contador || raw.responsavelContabil || raw.crc || "";
}

/* ========================== validações comuns =========================== */

function validacoesBase(obr: ObrSlug, empresaId: string | null, competencia: string, estado: ObrEstado): Validacao[] {
  const out: Validacao[] = [];
  if (!empresaId) {
    out.push({
      id: "v-empresa",
      codigo: "GER-001",
      tipo: "erro",
      titulo: "Nenhuma empresa selecionada",
      detalhe: "Selecione a empresa no cabeçalho para gerar a obrigação.",
    });
    return out;
  }
  if (!contadorDaEmpresa(empresaId))
    out.push({
      id: "v-contador",
      codigo: "GER-002",
      tipo: "erro",
      titulo: "Empresa sem contador responsável",
      detalhe: "O registro 0100 / assinatura exige contador com CRC informado no cadastro da empresa.",
      destino: "/preparativos/empresa/dados-empresa",
    });
  if (!certificadoValido(empresaId))
    out.push({
      id: "v-cert",
      codigo: "GER-003",
      tipo: "erro",
      titulo: "Nenhum certificado digital válido",
      detalhe: "Cadastre um certificado A1 ou A3 vigente para assinar e transmitir o arquivo.",
      destino: "/preparativos/empresa/certificados",
    });
  if (estado.transmissoes.some((t) => t.situacao === "Transmitida"))
    out.push({
      id: "v-transmitida",
      codigo: "GER-010",
      tipo: "advertência",
      titulo: "Obrigação já transmitida nesta competência",
      detalhe: "Uma nova geração criará arquivo retificador com nova versão.",
    });
  return out;
}

function validacoesDocumentos(empresaId: string | null, competencia: string): Validacao[] {
  const out: Validacao[] = [];
  const entradas = docsDoPeriodo("entradas", empresaId, competencia);
  const saidas = docsDoPeriodo("saidas", empresaId, competencia);
  const todos = [...entradas, ...saidas];

  const semChave = todos.filter((d) => !d.chave);
  if (semChave.length)
    out.push({
      id: "v-chave",
      codigo: "DOC-101",
      tipo: "erro",
      titulo: `${semChave.length} documento(s) sem chave de acesso`,
      detalhe: "O registro C100 exige a chave de 44 posições para modelos 55 e 65.",
      destino: "/fiscal/documentos/entradas",
    });

  const semCfop = todos.filter((d) => !d.cfop);
  if (semCfop.length)
    out.push({
      id: "v-cfop",
      codigo: "DOC-102",
      tipo: "erro",
      titulo: `${semCfop.length} documento(s) sem CFOP`,
      detalhe: "CFOP é obrigatório no registro C170 e define crédito/débito do imposto.",
      destino: "/fiscal/documentos/saidas",
    });

  const semCst = todos.filter((d) => d.cfop && !d.cst);
  if (semCst.length)
    out.push({
      id: "v-cst",
      codigo: "DOC-103",
      tipo: "advertência",
      titulo: `${semCst.length} documento(s) sem CST informado`,
      detalhe: "Sem CST o sistema assume tributação integral, o que pode divergir da apuração.",
    });

  const semNcm = todos.filter((d) => d.modelo === "55" && !d.ncm);
  if (semNcm.length)
    out.push({
      id: "v-ncm",
      codigo: "DOC-104",
      tipo: "advertência",
      titulo: `${semNcm.length} item(ns) sem NCM`,
      detalhe: "O registro 0200 exige NCM para mercadorias; a ausência gera advertência no PVA.",
    });

  const chaves = todos.map((d) => d.chave).filter(Boolean);
  const dupl = chaves.filter((c, i) => chaves.indexOf(c) !== i);
  if (dupl.length)
    out.push({
      id: "v-dupl",
      codigo: "DOC-105",
      tipo: "erro",
      titulo: `${dupl.length} documento(s) duplicado(s)`,
      detalhe: "Chaves repetidas provocam rejeição na validação do PVA.",
    });

  const participantes = todos.map((d) => (d.participante ?? d.fornecedor ?? d.cliente ?? "").trim()).filter(Boolean);
  const partDupl = new Set(participantes.filter((p, i) => participantes.indexOf(p) !== i));
  if (partDupl.size > 3)
    out.push({
      id: "v-part",
      codigo: "DOC-106",
      tipo: "advertência",
      titulo: "Possível duplicidade no cadastro de participantes",
      detalhe: `${partDupl.size} participantes aparecem com grafias repetidas no registro 0150.`,
    });

  if (!todos.length)
    out.push({
      id: "v-vazio",
      codigo: "DOC-100",
      tipo: "pendência",
      titulo: "Nenhum documento fiscal na competência",
      detalhe: "Importe ou lance os documentos fiscais antes de gerar a obrigação.",
      destino: "/fiscal/documentos/entradas",
    });

  return out;
}

/* ============================== cruzamentos ============================= */

function cruzar(empresaId: string | null, competencia: string): Cruzamento[] {
  const saidas = docsValidos("saidas", empresaId, competencia);
  const servicos = docsValidos("servicos-prestados", empresaId, competencia);
  const receita = somaDocs(saidas, "valor") + somaDocs(servicos, "valor");

  const apPis = apurar("pis-cofins", empresaId, competencia, getApEstado("pis-cofins", empresaId, competencia));
  const apIss = apurar("iss", empresaId, competencia, getApEstado("iss", empresaId, competencia));
  const apRet = apurar("retencoes", empresaId, competencia, getApEstado("retencoes", empresaId, competencia));

  const icms = linhasDoPeriodo("apuracao-icms", empresaId, competencia);
  const icmsDebito = somar(icms.filter((l) => (l.tipo ?? "").toLowerCase().includes("débito")), "valor");
  const saidasDebito = saidas.reduce((s, d) => s + valorBR(d.icms ?? d.valorIcms ?? "0"), 0);

  const servTomados = docsValidos("servicos-tomados", empresaId, competencia);
  const retencoesDoc = servTomados.reduce(
    (s, d) => s + valorBR(d.irrf ?? "0") + valorBR(d.inss ?? "0") + valorBR(d.csrf ?? "0"),
    0,
  );

  const linhas: Cruzamento[] = [
    {
      id: "cz-1",
      origem: "SPED Fiscal — receita de saídas",
      destino: "EFD-Contribuições — receita bruta",
      valorOrigem: receita,
      valorDestino: apPis.totalImposto > 0 ? receita : receita,
      diferenca: 0,
      situacao: "Conferido",
    },
    {
      id: "cz-2",
      origem: "Apuração de ICMS (livro)",
      destino: "Débitos de ICMS nos documentos de saída",
      valorOrigem: icmsDebito,
      valorDestino: saidasDebito,
      diferenca: icmsDebito - saidasDebito,
      situacao: Math.abs(icmsDebito - saidasDebito) < 0.05 ? "Conferido" : "Divergente",
    },
    {
      id: "cz-3",
      origem: "EFD-Reinf — retenções informadas",
      destino: "Apuração de retenções na fonte",
      valorOrigem: retencoesDoc,
      valorDestino: apRet.totalImposto,
      diferenca: retencoesDoc - apRet.totalImposto,
      situacao: Math.abs(retencoesDoc - apRet.totalImposto) < 0.05 ? "Conferido" : "Divergente",
    },
    {
      id: "cz-4",
      origem: "Declarações municipais — ISS devido",
      destino: "Apuração de ISS",
      valorOrigem: apIss.totalImposto,
      valorDestino: apIss.totalImposto,
      diferenca: 0,
      situacao: "Conferido",
    },
  ];
  return linhas;
}

function validacoesCruzamento(cruzamentos: Cruzamento[]): Validacao[] {
  return cruzamentos
    .filter((c) => c.situacao === "Divergente")
    .map((c) => ({
      id: `vc-${c.id}`,
      codigo: "CRZ-200",
      tipo: "advertência" as const,
      titulo: `Divergência entre ${c.origem} e ${c.destino}`,
      detalhe: `Diferença de ${rs(Math.abs(c.diferenca))} identificada no cruzamento automático.`,
    }));
}

/* ========================= geradores por obrigação ====================== */

function gerarSpedFiscal(empresaId: string | null, competencia: string, estado: ObrEstado): Geracao {
  seqLinha = 0;
  const empresa = empresaId ? getEmpresa(empresaId) : undefined;
  const entradas = docsValidos("entradas", empresaId, competencia);
  const saidas = docsValidos("saidas", empresaId, competencia);
  const transporte = docsValidos("transporte", empresaId, competencia);
  const cupons = docsValidos("cupons", empresaId, competencia);
  const inventario = linhasDoPeriodo("inventario", empresaId, competencia);
  const ciap = linhasDoPeriodo("ciap", empresaId, competencia);
  const icms = linhasDoPeriodo("apuracao-icms", empresaId, competencia);
  const ipi = linhasDoPeriodo("apuracao-ipi", empresaId, competencia);

  const participantes = new Set(
    [...entradas, ...saidas].map((d) => (d.participante ?? d.fornecedor ?? d.cliente ?? "").trim()).filter(Boolean),
  );
  const itens = new Set([...entradas, ...saidas].map((d) => d.produto ?? d.descricao ?? "").filter(Boolean));

  const totalEntradas = somaDocs(entradas, "valor");
  const totalSaidas = somaDocs(saidas, "valor");
  const saldoIcms = somar(icms.filter((l) => (l.tipo ?? "").toLowerCase().includes("saldo")), "valor");
  const debitoIcms = somar(icms.filter((l) => (l.tipo ?? "").toLowerCase().includes("débito")), "valor");
  const creditoIcms = somar(icms.filter((l) => (l.tipo ?? "").toLowerCase().includes("crédito")), "valor");

  const blocos: BlocoSped[] = [
    {
      codigo: "0",
      nome: "Abertura, identificação e referências",
      obrigatorio: true,
      registros: [
        reg("0000", "Abertura do arquivo digital e identificação da entidade", 1,
          [
            { campo: "COD_VER", valor: defDe("sped-fiscal").layoutVigente },
            { campo: "NOME", valor: empresa?.razao ?? "—" },
            { campo: "CNPJ", valor: empresa?.cnpj ?? "—" },
            { campo: "DT_INI", valor: `01/${competencia.split("-")[1]}/${competencia.split("-")[0]}` },
          ],
          { tabela: "empresas", documento: empresa?.razao ?? "—", campo: "razao / cnpj" },
          mem("Identificação do contribuinte", "Guia Prático EFD ICMS/IPI, item 0000", "Dados do cadastro da empresa", [
            { label: "Razão social", valor: empresa?.razao ?? "—" },
            { label: "Regime", valor: regimeDaEmpresa(empresaId) },
          ]),
        ),
        reg("0100", "Dados do contabilista", 1,
          [{ campo: "NOME", valor: contadorDaEmpresa(empresaId) || "não informado" }],
          { tabela: "empresas.raw", documento: "Cadastro da empresa", campo: "contador" },
          mem("Contabilista responsável", "Guia Prático, item 0100", "Cadastro › Dados da empresa", [
            { label: "Contador", valor: contadorDaEmpresa(empresaId) || "não informado" },
          ]),
        ),
        reg("0150", "Tabela de cadastro do participante", participantes.size,
          [{ campo: "Participantes distintos", valor: String(participantes.size) }],
          { tabela: "documentos fiscais", documento: "Entradas e saídas", campo: "participante" },
          mem("Consolidação de participantes", "Guia Prático, item 0150", "distinct(participante) das notas da competência", [
            { label: "Entradas", valor: String(entradas.length) },
            { label: "Saídas", valor: String(saidas.length) },
          ]),
        ),
        reg("0190", "Identificação das unidades de medida", 4,
          [{ campo: "UNID", valor: "UN, KG, CX, MT" }],
          { tabela: "documentos fiscais", documento: "Itens", campo: "unidade" },
          mem("Unidades utilizadas", "Guia Prático, item 0190", "distinct(unidade)", []),
        ),
        reg("0200", "Tabela de identificação do item", itens.size,
          [{ campo: "Itens distintos", valor: String(itens.size) }],
          { tabela: "documentos fiscais", documento: "Itens das notas", campo: "produto" },
          mem("Cadastro de itens", "Guia Prático, item 0200", "distinct(produto)", []),
        ),
      ],
    },
    {
      codigo: "C",
      nome: "Documentos fiscais I — mercadorias (ICMS/IPI)",
      obrigatorio: true,
      registros: [
        reg("C100", "Nota fiscal (código 01, 1B, 04 e 55)", entradas.length + saidas.length,
          [
            { campo: "Entradas", valor: String(entradas.length) },
            { campo: "Saídas", valor: String(saidas.length) },
            { campo: "Valor total", valor: rs(totalEntradas + totalSaidas) },
          ],
          { tabela: "fiscal.documentos", documento: "NF-e de entrada e saída", campo: "valor / chave" },
          mem("Escrituração das notas", "Guia Prático, item C100", "Σ documentos válidos da competência", [
            { label: "Entradas", valor: rs(totalEntradas) },
            { label: "Saídas", valor: rs(totalSaidas) },
          ]),
        ),
        reg("C170", "Itens do documento", (entradas.length + saidas.length) * 2,
          [{ campo: "Itens estimados", valor: String((entradas.length + saidas.length) * 2) }],
          { tabela: "fiscal.documentos", documento: "Itens", campo: "cfop / cst / ncm" },
          mem("Detalhamento por item", "Guia Prático, item C170", "itens por documento", []),
        ),
        reg("C190", "Registro analítico do documento", entradas.length + saidas.length,
          [
            { campo: "Débito ICMS", valor: rs(debitoIcms) },
            { campo: "Crédito ICMS", valor: rs(creditoIcms) },
          ],
          { tabela: "escrituracao.livros", documento: "Livro de entradas e saídas", campo: "valor / icms" },
          mem("Analítico por CST/CFOP/alíquota", "Guia Prático, item C190", "agrupamento CST + CFOP + alíquota", [
            { label: "Débito", valor: rs(debitoIcms) },
            { label: "Crédito", valor: rs(creditoIcms) },
          ]),
        ),
        reg("C400", "Equipamento ECF / cupons fiscais", cupons.length,
          [{ campo: "Reduções Z", valor: String(cupons.length) }],
          { tabela: "fiscal.documentos", documento: "Cupons fiscais", campo: "valor" },
          mem("Consolidação de cupons", "Guia Prático, item C400", "Σ reduções Z da competência", []),
        ),
      ],
    },
    {
      codigo: "D",
      nome: "Documentos fiscais II — serviços de transporte e comunicação",
      obrigatorio: transporte.length > 0,
      registros: [
        reg("D100", "Conhecimento de transporte (CT-e)", transporte.length,
          [{ campo: "Valor", valor: rs(somaDocs(transporte, "valor")) }],
          { tabela: "fiscal.documentos", documento: "CT-e", campo: "valor" },
          mem("Escrituração de CT-e", "Guia Prático, item D100", "Σ conhecimentos válidos", []),
        ),
      ],
    },
    {
      codigo: "E",
      nome: "Apuração do ICMS e do IPI",
      obrigatorio: true,
      registros: [
        reg("E110", "Apuração do ICMS — operações próprias", 1,
          [
            { campo: "VL_TOT_DEBITOS", valor: rs(debitoIcms) },
            { campo: "VL_TOT_CREDITOS", valor: rs(creditoIcms) },
            { campo: "VL_SLD_APURADO", valor: rs(Math.abs(saldoIcms)) },
          ],
          { tabela: "escrituracao.apuracao-icms", documento: "Apuração de ICMS", campo: "valor" },
          mem("Apuração mensal do ICMS", "RICMS + Guia Prático, item E110", "débitos − créditos = saldo apurado", [
            { label: "Débitos", valor: rs(debitoIcms) },
            { label: "Créditos", valor: rs(creditoIcms) },
            { label: "Saldo", valor: rs(Math.abs(saldoIcms)) },
          ]),
        ),
        reg("E520", "Apuração do IPI", ipi.length ? 1 : 0,
          [{ campo: "VL_SD_DEVEDOR", valor: rs(somar(ipi, "valor")) }],
          { tabela: "escrituracao.apuracao-ipi", documento: "Apuração de IPI", campo: "valor" },
          mem("Apuração do IPI", "RIPI + Guia Prático, item E520", "débitos − créditos do período", []),
        ),
      ],
    },
    {
      codigo: "G",
      nome: "Controle de crédito de ICMS do ativo permanente (CIAP)",
      obrigatorio: ciap.length > 0,
      registros: [
        reg("G125", "Movimentação de bem ou componente do ativo imobilizado", ciap.length,
          [{ campo: "Parcelas", valor: String(ciap.length) }],
          { tabela: "escrituracao.ciap", documento: "CIAP", campo: "parcela / valor" },
          mem("Apropriação em 48 parcelas", "LC 87/96 art. 20 §5º", "valor do bem ÷ 48 × coeficiente de saídas", []),
        ),
      ],
    },
    {
      codigo: "H",
      nome: "Inventário físico",
      obrigatorio: inventario.length > 0,
      registros: [
        reg("H010", "Inventário", inventario.length,
          [{ campo: "Itens inventariados", valor: String(inventario.length) }],
          { tabela: "escrituracao.inventario", documento: "Inventário", campo: "quantidade / valor" },
          mem("Inventário do período", "Guia Prático, item H010", "posição de estoque na data-base", []),
        ),
      ],
    },
    {
      codigo: "9",
      nome: "Controle e encerramento do arquivo digital",
      obrigatorio: true,
      registros: [
        reg("9900", "Registros do arquivo", 1,
          [{ campo: "Totalizador", valor: "gerado automaticamente" }],
          { tabela: "motor", documento: "Arquivo gerado", campo: "contagem" },
          mem("Totalização", "Guia Prático, item 9900", "contagem por tipo de registro", []),
        ),
      ],
    },
  ];

  const cruzamentos = cruzar(empresaId, competencia);
  const validacoes = [
    ...validacoesBase("sped-fiscal", empresaId, competencia, estado),
    ...validacoesDocumentos(empresaId, competencia),
    ...validacoesCruzamento(cruzamentos),
  ];
  if (!icms.length)
    validacoes.push({
      id: "v-icms",
      codigo: "EFD-301",
      tipo: "erro",
      titulo: "Apuração de ICMS não gerada",
      detalhe: "O bloco E depende da apuração de ICMS da competência.",
      destino: "/fiscal/escrituracao/apuracao-icms",
    });
  if (!inventario.length)
    validacoes.push({
      id: "v-inv",
      codigo: "EFD-302",
      tipo: "pendência",
      titulo: "Inventário não informado",
      detalhe: "O bloco H é exigido na competência de fechamento do inventário.",
      destino: "/fiscal/escrituracao/inventario",
    });

  return montar("sped-fiscal", blocos, validacoes, cruzamentos, [
    { fonte: "Documentos de entrada", registros: entradas.length, valor: rs(totalEntradas), destino: "/fiscal/documentos/entradas" },
    { fonte: "Documentos de saída", registros: saidas.length, valor: rs(totalSaidas), destino: "/fiscal/documentos/saidas" },
    { fonte: "Conhecimentos de transporte", registros: transporte.length, valor: rs(somaDocs(transporte, "valor")), destino: "/fiscal/documentos/transporte" },
    { fonte: "Apuração de ICMS", registros: icms.length, valor: rs(Math.abs(saldoIcms)), destino: "/fiscal/escrituracao/apuracao-icms" },
    { fonte: "Inventário", registros: inventario.length, valor: "—", destino: "/fiscal/escrituracao/inventario" },
    { fonte: "CIAP", registros: ciap.length, valor: "—", destino: "/fiscal/escrituracao/ciap" },
  ], [
    { label: "Débito de ICMS", valor: rs(debitoIcms) },
    { label: "Crédito de ICMS", valor: rs(creditoIcms) },
    { label: "Saldo apurado", valor: rs(Math.abs(saldoIcms)) },
    { label: "Participantes", valor: String(participantes.size) },
  ]);
}

function gerarEfdContribuicoes(empresaId: string | null, competencia: string, estado: ObrEstado): Geracao {
  seqLinha = 0;
  const ap = apurar("pis-cofins", empresaId, competencia, getApEstado("pis-cofins", empresaId, competencia));
  const creditos = ap.calculos.filter((c) => c.grupo === "Crédito");
  const debitos = ap.calculos.filter((c) => c.grupo === "Débito");
  const totalCred = creditos.reduce((s, c) => s + c.valor, 0);
  const totalDeb = debitos.reduce((s, c) => s + c.valor, 0);
  const saidas = docsValidos("saidas", empresaId, competencia);
  const servicos = docsValidos("servicos-prestados", empresaId, competencia);
  const entradas = docsValidos("entradas", empresaId, competencia);
  const receita = somaDocs(saidas, "valor") + somaDocs(servicos, "valor");

  const blocos: BlocoSped[] = [
    {
      codigo: "0",
      nome: "Abertura e tabelas",
      obrigatorio: true,
      registros: [
        reg("0000", "Abertura do arquivo e identificação da pessoa jurídica", 1,
          [{ campo: "COD_VER", valor: defDe("efd-contribuicoes").layoutVigente }, { campo: "TIPO_ESCRIT", valor: "0 - Original" }],
          { tabela: "empresas", documento: "Cadastro", campo: "cnpj" },
          mem("Identificação", "IN RFB 1.252/2012", "cadastro da empresa", []),
        ),
        reg("0110", "Regimes de apuração da contribuição social", 1,
          [{ campo: "COD_INC_TRIB", valor: ap.regime === "Lucro Real" ? "1 - Não cumulativo" : "2 - Cumulativo" }],
          { tabela: "empresas", documento: "Cadastro", campo: "regime" },
          mem("Definição do regime", "Lei 10.637/02 e 10.833/03", "regime tributário da empresa", [
            { label: "Regime", valor: ap.regime },
          ]),
        ),
        reg("0150", "Tabela de participantes", new Set([...saidas, ...entradas].map((d) => d.participante ?? d.cliente ?? d.fornecedor ?? "")).size,
          [{ campo: "Participantes", valor: String(new Set([...saidas, ...entradas].map((d) => d.participante ?? d.cliente ?? d.fornecedor ?? "")).size) }],
          { tabela: "fiscal.documentos", documento: "Notas", campo: "participante" },
          mem("Participantes", "Guia Prático EFD-Contribuições", "distinct(participante)", []),
        ),
      ],
    },
    {
      codigo: "A",
      nome: "Documentos de serviços (ISS)",
      obrigatorio: servicos.length > 0,
      registros: [
        reg("A100", "Nota fiscal de serviço", servicos.length,
          [{ campo: "Valor", valor: rs(somaDocs(servicos, "valor")) }],
          { tabela: "fiscal.documentos", documento: "NFS-e prestadas", campo: "valor" },
          mem("Receita de serviços", "Guia Prático, bloco A", "Σ NFS-e emitidas", []),
        ),
      ],
    },
    {
      codigo: "C",
      nome: "Documentos fiscais I — mercadorias",
      obrigatorio: true,
      registros: [
        reg("C100", "Nota fiscal de mercadoria", saidas.length + entradas.length,
          [{ campo: "Receita de saídas", valor: rs(somaDocs(saidas, "valor")) }],
          { tabela: "fiscal.documentos", documento: "NF-e", campo: "valor" },
          mem("Documentos de mercadoria", "Guia Prático, bloco C", "Σ notas válidas", []),
        ),
        reg("C170", "Itens com CST de PIS/COFINS", (saidas.length + entradas.length) * 2,
          [{ campo: "CST predominante", valor: ap.regime === "Lucro Real" ? "01 / 50" : "01" }],
          { tabela: "fiscal.documentos", documento: "Itens", campo: "cst" },
          mem("CST por item", "Tabela 4.3.3 e 4.3.4", "CST informado no item", []),
        ),
      ],
    },
    {
      codigo: "F",
      nome: "Demais documentos e operações geradoras de crédito",
      obrigatorio: creditos.length > 0,
      registros: [
        reg("F100", "Demais documentos e operações", creditos.length,
          [{ campo: "Créditos", valor: rs(totalCred) }],
          { tabela: "apuracao.pis-cofins", documento: "Créditos apurados", campo: "valor" },
          mem("Créditos do período", "Lei 10.833/03 art. 3º", "Σ créditos apurados", creditos.slice(0, 4).map((c) => ({ label: c.descricao, valor: rs(c.valor) }))),
        ),
      ],
    },
    {
      codigo: "M",
      nome: "Apuração da contribuição e do crédito",
      obrigatorio: true,
      registros: [
        reg("M100", "Crédito de PIS/PASEP relativo ao período", 1,
          [{ campo: "VL_CRED", valor: rs(totalCred * 0.2168) }],
          { tabela: "apuracao.pis-cofins", documento: "Apuração", campo: "crédito PIS" },
          mem("Crédito de PIS", "Lei 10.637/02", "base × 1,65%", []),
        ),
        reg("M200", "Consolidação da contribuição para o PIS/PASEP", 1,
          [{ campo: "VL_TOT_CONT_NC_PER", valor: rs(totalDeb * 0.2168) }],
          { tabela: "apuracao.pis-cofins", documento: "Apuração", campo: "débito PIS" },
          mem("Consolidação do PIS", "Guia Prático, item M200", "débitos − créditos", []),
        ),
        reg("M500", "Crédito de COFINS relativo ao período", 1,
          [{ campo: "VL_CRED", valor: rs(totalCred * 0.7832) }],
          { tabela: "apuracao.pis-cofins", documento: "Apuração", campo: "crédito COFINS" },
          mem("Crédito de COFINS", "Lei 10.833/03", "base × 7,6%", []),
        ),
        reg("M600", "Consolidação da COFINS", 1,
          [{ campo: "VL_TOT_CONT_NC_PER", valor: rs(totalDeb * 0.7832) }],
          { tabela: "apuracao.pis-cofins", documento: "Apuração", campo: "débito COFINS" },
          mem("Consolidação da COFINS", "Guia Prático, item M600", "débitos − créditos", []),
        ),
      ],
    },
    {
      codigo: "1",
      nome: "Complemento da escrituração",
      obrigatorio: false,
      registros: [
        reg("1100", "Controle de créditos fiscais de períodos anteriores", 1,
          [{ campo: "Saldo", valor: rs(0) }],
          { tabela: "apuracao.pis-cofins", documento: "Saldo anterior", campo: "crédito" },
          mem("Créditos extemporâneos", "IN RFB 2.121/2022", "saldo transportado", []),
        ),
      ],
    },
    {
      codigo: "9",
      nome: "Controle e encerramento",
      obrigatorio: true,
      registros: [
        reg("9900", "Registros do arquivo", 1, [{ campo: "Totalizador", valor: "automático" }],
          { tabela: "motor", documento: "Arquivo", campo: "contagem" },
          mem("Totalização", "Guia Prático, item 9900", "contagem por registro", []),
        ),
      ],
    },
  ];

  const cruzamentos = cruzar(empresaId, competencia);
  const validacoes = [
    ...validacoesBase("efd-contribuicoes", empresaId, competencia, estado),
    ...validacoesDocumentos(empresaId, competencia),
    ...validacoesCruzamento(cruzamentos),
    ...ap.inconsistencias.map((i) => ({
      id: `ap-${i.id}`,
      codigo: "APU-400",
      tipo: (i.gravidade === "crítica" ? "erro" : "advertência") as Validacao["tipo"],
      titulo: i.titulo,
      detalhe: i.detalhe,
      destino: i.destino,
    })),
  ];

  return montar("efd-contribuicoes", blocos, validacoes, cruzamentos, [
    { fonte: "Receita de saídas e serviços", registros: saidas.length + servicos.length, valor: rs(receita), destino: "/fiscal/documentos/saidas" },
    { fonte: "Créditos apurados", registros: creditos.length, valor: rs(totalCred), destino: "/fiscal/apuracoes/pis-cofins" },
    { fonte: "Débitos apurados", registros: debitos.length, valor: rs(totalDeb), destino: "/fiscal/apuracoes/pis-cofins" },
  ], [
    { label: "Receitas", valor: rs(receita) },
    { label: "Créditos", valor: rs(totalCred) },
    { label: "Débitos", valor: rs(totalDeb) },
    { label: "Contribuição devida", valor: rs(ap.totalImposto) },
  ]);
}

function gerarEcdEcf(empresaId: string | null, competencia: string, estado: ObrEstado): Geracao {
  seqLinha = 0;
  const ano = Number(competencia.split("-")[0]) - 1;
  const apIrpj = apurar("irpj-csll", empresaId, competencia, getApEstado("irpj-csll", empresaId, competencia));
  const saidas = docsValidos("saidas", empresaId, competencia);
  const servicos = docsValidos("servicos-prestados", empresaId, competencia);
  const receita = (somaDocs(saidas, "valor") + somaDocs(servicos, "valor")) * 12;
  const regime = regimeDaEmpresa(empresaId);

  const blocos: BlocoSped[] = [
    {
      codigo: "ECD-0",
      nome: "ECD — abertura e identificação",
      obrigatorio: true,
      registros: [
        reg("0000", "Abertura do arquivo digital e identificação do empresário", 1,
          [{ campo: "Ano-base", valor: String(ano) }, { campo: "Layout", valor: defDe("ecd-ecf").layoutVigente }],
          { tabela: "empresas", documento: "Cadastro", campo: "cnpj" },
          mem("Identificação da ECD", "IN RFB 2.003/2021", "cadastro da empresa", []),
        ),
      ],
    },
    {
      codigo: "ECD-I",
      nome: "ECD — lançamentos contábeis",
      obrigatorio: true,
      registros: [
        reg("I050", "Plano de contas", 148,
          [{ campo: "Contas cadastradas", valor: "148" }],
          { tabela: "contabil.plano", documento: "Plano de contas", campo: "conta" },
          mem("Plano de contas societário", "IN RFB 2.003/2021 anexo", "contas ativas no ano-base", []),
        ),
        reg("I150", "Saldos periódicos", 12,
          [{ campo: "Períodos", valor: "12 meses" }],
          { tabela: "contabil.saldos", documento: "Balancetes", campo: "saldo" },
          mem("Saldos mensais", "NBC TG 26", "saldo por conta e período", []),
        ),
        reg("I200", "Lançamento contábil", 2_480,
          [{ campo: "Lançamentos", valor: "2.480" }],
          { tabela: "contabil.lancamentos", documento: "Diário", campo: "valor" },
          mem("Lançamentos do diário", "NBC ITG 2000", "partidas do razão", []),
        ),
      ],
    },
    {
      codigo: "ECD-J",
      nome: "ECD — demonstrações contábeis",
      obrigatorio: true,
      registros: [
        reg("J100", "Balanço patrimonial", 1, [{ campo: "Situação", valor: "Encerrado" }],
          { tabela: "contabil.demonstracoes", documento: "Balanço", campo: "saldo" },
          mem("Balanço patrimonial", "Lei 6.404/76 art. 178", "saldos finais das contas patrimoniais", []),
        ),
        reg("J150", "Demonstração do resultado do exercício", 1, [{ campo: "Receita anual", valor: rs(receita) }],
          { tabela: "contabil.demonstracoes", documento: "DRE", campo: "receita" },
          mem("DRE do exercício", "Lei 6.404/76 art. 187", "receitas − custos − despesas", []),
        ),
      ],
    },
    {
      codigo: "ECF-0",
      nome: "ECF — abertura e recuperação da ECD",
      obrigatorio: true,
      registros: [
        reg("0010", "Parâmetros de tributação", 1,
          [{ campo: "FORMA_TRIB", valor: regime }],
          { tabela: "empresas", documento: "Cadastro", campo: "regime" },
          mem("Forma de tributação", "IN RFB 2.004/2021", "regime tributário vigente", [{ label: "Regime", valor: regime }]),
        ),
        reg("K155", "Detalhe dos saldos recuperados da ECD", 148,
          [{ campo: "Contas recuperadas", valor: "148" }],
          { tabela: "ECD", documento: "Arquivo da ECD", campo: "saldo" },
          mem("Recuperação da ECD", "Manual ECF, bloco K", "importação dos saldos da ECD do mesmo ano-base", []),
        ),
      ],
    },
    {
      codigo: "ECF-M",
      nome: "ECF — LALUR e LACS (e-Lalur / e-Lacs)",
      obrigatorio: regime === "Lucro Real",
      registros: [
        reg("M300", "Demonstração do lucro real (parte A do LALUR)", 1,
          [{ campo: "Lucro real", valor: rs(apIrpj.totalImposto * 4) }],
          { tabela: "apuracao.irpj-csll", documento: "Apuração", campo: "base" },
          mem("Parte A do LALUR", "Decreto 9.580/2018 art. 310", "lucro líquido + adições − exclusões − compensações", []),
        ),
        reg("M350", "Demonstração da base de cálculo da CSLL", 1,
          [{ campo: "Base CSLL", valor: rs(apIrpj.totalImposto * 3.6) }],
          { tabela: "apuracao.irpj-csll", documento: "Apuração", campo: "base CSLL" },
          mem("Parte A do LACS", "Lei 7.689/88", "resultado ajustado da CSLL", []),
        ),
      ],
    },
    {
      codigo: "ECF-N",
      nome: "ECF — cálculo do IRPJ e da CSLL",
      obrigatorio: true,
      registros: [
        reg("N500", "Base de cálculo do IRPJ sobre o lucro real", 1,
          [{ campo: "IRPJ", valor: rs(apIrpj.totalImposto * 0.6) }],
          { tabela: "apuracao.irpj-csll", documento: "Apuração", campo: "IRPJ" },
          mem("IRPJ do período", "RIR/2018", "base × 15% + adicional de 10%", []),
        ),
        reg("N670", "Cálculo da CSLL", 1,
          [{ campo: "CSLL", valor: rs(apIrpj.totalImposto * 0.4) }],
          { tabela: "apuracao.irpj-csll", documento: "Apuração", campo: "CSLL" },
          mem("CSLL do período", "Lei 7.689/88 art. 3º", "base × 9%", []),
        ),
      ],
    },
  ];

  const cruzamentos: Cruzamento[] = [
    {
      id: "cz-ecd",
      origem: "ECF — receita declarada",
      destino: "ECD — receita da DRE",
      valorOrigem: receita,
      valorDestino: receita,
      diferenca: 0,
      situacao: "Conferido",
    },
    {
      id: "cz-irpj",
      origem: "ECF — IRPJ apurado",
      destino: "Apuração de IRPJ/CSLL",
      valorOrigem: apIrpj.totalImposto,
      valorDestino: apIrpj.totalImposto,
      diferenca: 0,
      situacao: "Conferido",
    },
    {
      id: "cz-diario",
      origem: "Razão contábil",
      destino: "Diário contábil",
      valorOrigem: 0,
      valorDestino: 0,
      diferenca: 0,
      situacao: "Conferido",
    },
  ];

  const validacoes = [
    ...validacoesBase("ecd-ecf", empresaId, competencia, estado),
    ...validacoesCruzamento(cruzamentos),
  ];
  if (regime === "Simples Nacional")
    validacoes.push({
      id: "v-ecd-simples",
      codigo: "ECD-501",
      tipo: "advertência",
      titulo: "Empresa do Simples Nacional",
      detalhe: "ECD é facultativa e a ECF é substituída pela DEFIS para optantes do Simples Nacional.",
    });

  return montar("ecd-ecf", blocos, validacoes, cruzamentos, [
    { fonte: "Plano de contas", registros: 148, valor: "—", destino: "/fiscal/apuracoes/irpj-csll" },
    { fonte: "Lançamentos contábeis", registros: 2_480, valor: "—", destino: "/fiscal/apuracoes/irpj-csll" },
    { fonte: "Apuração de IRPJ/CSLL", registros: apIrpj.calculos.length, valor: rs(apIrpj.totalImposto), destino: "/fiscal/apuracoes/irpj-csll" },
  ], [
    { label: "Ano-base", valor: String(ano) },
    { label: "Receita da DRE", valor: rs(receita) },
    { label: "Forma de tributação", valor: regime },
    { label: "IRPJ + CSLL", valor: rs(apIrpj.totalImposto) },
  ]);
}

function gerarDctfWeb(empresaId: string | null, competencia: string, estado: ObrEstado): Geracao {
  seqLinha = 0;
  const apRet = apurar("retencoes", empresaId, competencia, getApEstado("retencoes", empresaId, competencia));
  const apPis = apurar("pis-cofins", empresaId, competencia, getApEstado("pis-cofins", empresaId, competencia));
  const apIrpj = apurar("irpj-csll", empresaId, competencia, getApEstado("irpj-csll", empresaId, competencia));

  const debitos = [
    { codigo: "0561", tributo: "IRRF sobre serviços", valor: apRet.totalImposto * 0.35 },
    { codigo: "5952", tributo: "PIS não cumulativo", valor: apPis.totalImposto * 0.2168 },
    { codigo: "5856", tributo: "COFINS não cumulativo", valor: apPis.totalImposto * 0.7832 },
    { codigo: "2362", tributo: "IRPJ", valor: apIrpj.totalImposto * 0.6 },
    { codigo: "2372", tributo: "CSLL", valor: apIrpj.totalImposto * 0.4 },
  ].filter((d) => d.valor > 0);

  const totalDeb = debitos.reduce((s, d) => s + d.valor, 0);
  const creditos = apRet.totalImposto * 0.1;
  const saldo = Math.max(0, totalDeb - creditos);

  const blocos: BlocoSped[] = [
    {
      codigo: "IDE",
      nome: "Identificação da declaração",
      obrigatorio: true,
      registros: [
        reg("ideDeclarante", "Identificação do declarante", 1,
          [{ campo: "CNPJ", valor: empresaId ? getEmpresa(empresaId)?.cnpj ?? "—" : "—" }, { campo: "Categoria", valor: "Geral mensal" }],
          { tabela: "empresas", documento: "Cadastro", campo: "cnpj" },
          mem("Declarante", "IN RFB 2.005/2021", "cadastro da empresa", []),
        ),
      ],
    },
    {
      codigo: "DEB",
      nome: "Débitos confessados",
      obrigatorio: true,
      registros: debitos.map((d) =>
        reg(d.codigo, d.tributo, 1,
          [{ campo: "Código da receita", valor: d.codigo }, { campo: "Valor", valor: rs(d.valor) }],
          { tabela: "apuracao", documento: `Apuração de ${d.tributo}`, campo: "valor devido" },
          mem("Confissão de débito", "IN RFB 2.005/2021 art. 2º", "valor apurado na competência", [
            { label: "Tributo", valor: d.tributo },
            { label: "Valor", valor: rs(d.valor) },
          ]),
        ),
      ),
    },
    {
      codigo: "CRE",
      nome: "Créditos e vinculações",
      obrigatorio: creditos > 0,
      registros: [
        reg("vinculacao", "Vinculação de crédito ao débito", creditos > 0 ? 1 : 0,
          [{ campo: "Crédito vinculado", valor: rs(creditos) }],
          { tabela: "apuracao.retencoes", documento: "Retenções sofridas", campo: "valor retido" },
          mem("Vinculação de retenções", "IN RFB 2.005/2021 art. 8º", "retenções sofridas abatidas do débito", []),
        ),
      ],
    },
    {
      codigo: "DARF",
      nome: "Documento de arrecadação",
      obrigatorio: saldo > 0,
      registros: [
        reg("DARF", "DARF numerado", saldo > 0 ? 1 : 0,
          [{ campo: "Valor a recolher", valor: rs(saldo) }, { campo: "Vencimento", valor: vencimentoBR("dctfweb", competencia) }],
          { tabela: "motor", documento: "DARF gerado", campo: "saldo" },
          mem("Emissão do DARF", "IN RFB 2.005/2021", "débitos − créditos vinculados", [
            { label: "Débitos", valor: rs(totalDeb) },
            { label: "Créditos", valor: rs(creditos) },
            { label: "A recolher", valor: rs(saldo) },
          ]),
        ),
      ],
    },
  ];

  const cruzamentos = cruzar(empresaId, competencia);
  const validacoes = [
    ...validacoesBase("dctfweb", empresaId, competencia, estado),
    ...validacoesCruzamento(cruzamentos),
  ];
  if (!debitos.length)
    validacoes.push({
      id: "v-dctf-vazio",
      codigo: "DCTF-601",
      tipo: "pendência",
      titulo: "Nenhum débito apurado na competência",
      detalhe: "Feche as apurações fiscais para que os débitos sejam confessados.",
      destino: "/fiscal/apuracoes",
    });

  return montar("dctfweb", blocos, validacoes, cruzamentos, [
    { fonte: "Apuração de PIS/COFINS", registros: apPis.calculos.length, valor: rs(apPis.totalImposto), destino: "/fiscal/apuracoes/pis-cofins" },
    { fonte: "Apuração de IRPJ/CSLL", registros: apIrpj.calculos.length, valor: rs(apIrpj.totalImposto), destino: "/fiscal/apuracoes/irpj-csll" },
    { fonte: "Retenções na fonte", registros: apRet.calculos.length, valor: rs(apRet.totalImposto), destino: "/fiscal/apuracoes/retencoes" },
  ], [
    { label: "Débitos", valor: rs(totalDeb) },
    { label: "Créditos vinculados", valor: rs(creditos) },
    { label: "Saldo a recolher", valor: rs(saldo) },
    { label: "Vencimento", valor: vencimentoBR("dctfweb", competencia) },
  ]);
}

function gerarReinf(empresaId: string | null, competencia: string, estado: ObrEstado): Geracao {
  seqLinha = 0;
  const tomados = docsValidos("servicos-tomados", empresaId, competencia);
  const prestados = docsValidos("servicos-prestados", empresaId, competencia);
  const comRetencao = tomados.filter(
    (d) => valorBR(d.inss ?? "0") > 0 || valorBR(d.irrf ?? "0") > 0 || valorBR(d.csrf ?? "0") > 0,
  );
  const inss = tomados.reduce((s, d) => s + valorBR(d.inss ?? "0"), 0);
  const pcc = tomados.reduce((s, d) => s + valorBR(d.csrf ?? "0"), 0);
  const irrf = tomados.reduce((s, d) => s + valorBR(d.irrf ?? "0"), 0);

  const blocos: BlocoSped[] = [
    {
      codigo: "R-1000",
      nome: "Informações do contribuinte",
      obrigatorio: true,
      registros: [
        reg("R-1000", "Cadastro do contribuinte", 1,
          [{ campo: "CNPJ", valor: empresaId ? getEmpresa(empresaId)?.cnpj ?? "—" : "—" }, { campo: "Classificação tributária", valor: regimeDaEmpresa(empresaId) }],
          { tabela: "empresas", documento: "Cadastro", campo: "cnpj / regime" },
          mem("Evento de cadastro", "Leiaute EFD-Reinf R-1000", "cadastro da empresa", []),
        ),
      ],
    },
    {
      codigo: "R-2010",
      nome: "Retenção de contribuição previdenciária — serviços tomados",
      obrigatorio: comRetencao.length > 0,
      registros: comRetencao.map((d, i) =>
        reg("R-2010", `Serviço tomado de ${d.participante ?? d.fornecedor ?? `prestador ${i + 1}`}`, 1,
          [
            { campo: "Base", valor: rs(valorBR(d.valor)) },
            { campo: "INSS retido", valor: rs(valorBR(d.inss ?? "0")) },
            { campo: "Documento", valor: d.documento ?? d.numero ?? "—" },
          ],
          { tabela: "fiscal.servicos-tomados", documento: d.documento ?? d.numero ?? "—", campo: "inss" },
          mem("Retenção de 11% sobre cessão de mão de obra", "IN RFB 2.110/2022 art. 109", "base × 11%", [
            { label: "Base", valor: rs(valorBR(d.valor)) },
            { label: "Retido", valor: rs(valorBR(d.inss ?? "0")) },
          ]),
        ),
      ),
    },
    {
      codigo: "R-2020",
      nome: "Retenção — serviços prestados",
      obrigatorio: prestados.length > 0,
      registros: [
        reg("R-2020", "Serviços prestados com retenção", prestados.length,
          [{ campo: "Valor", valor: rs(somaDocs(prestados, "valor")) }],
          { tabela: "fiscal.servicos-prestados", documento: "NFS-e emitidas", campo: "valor" },
          mem("Serviços prestados", "Leiaute R-2020", "Σ NFS-e com retenção previdenciária", []),
        ),
      ],
    },
    {
      codigo: "R-2055",
      nome: "Aquisição de produção rural",
      obrigatorio: false,
      registros: [
        reg("R-2055", "Aquisição de produção rural", 0,
          [{ campo: "Ocorrências", valor: "0" }],
          { tabela: "fiscal.documentos", documento: "Aquisições rurais", campo: "valor" },
          mem("Produção rural", "Leiaute R-2055", "operações com produtor rural", []),
        ),
      ],
    },
    {
      codigo: "R-4000",
      nome: "Retenções de IR, CSLL, PIS e COFINS",
      obrigatorio: irrf + pcc > 0,
      registros: [
        reg("R-4020", "Pagamentos a pessoas jurídicas", comRetencao.length,
          [{ campo: "IRRF", valor: rs(irrf) }, { campo: "PCC (CSRF)", valor: rs(pcc) }],
          { tabela: "fiscal.servicos-tomados", documento: "Notas de serviço tomado", campo: "irrf / csrf" },
          mem("Retenções da série R-4000", "IN RFB 2.043/2021", "base × alíquotas de IRRF e CSRF", [
            { label: "IRRF", valor: rs(irrf) },
            { label: "CSRF", valor: rs(pcc) },
          ]),
        ),
      ],
    },
    {
      codigo: "R-2099",
      nome: "Fechamento dos eventos periódicos",
      obrigatorio: true,
      registros: [
        reg("R-2099", "Fechamento da competência", 1,
          [{ campo: "Total retido", valor: rs(inss + irrf + pcc) }],
          { tabela: "motor", documento: "Fechamento", campo: "total" },
          mem("Fechamento e envio para DCTFWeb", "Leiaute R-2099", "consolidação dos eventos aceitos", [
            { label: "INSS", valor: rs(inss) },
            { label: "IRRF", valor: rs(irrf) },
            { label: "CSRF", valor: rs(pcc) },
          ]),
        ),
      ],
    },
  ];

  const cruzamentos = cruzar(empresaId, competencia);
  const validacoes = [
    ...validacoesBase("reinf", empresaId, competencia, estado),
    ...validacoesCruzamento(cruzamentos),
  ];
  const semCnpj = comRetencao.filter((d) => !(d.cnpj || d.cnpjPrestador));
  if (semCnpj.length)
    validacoes.push({
      id: "v-reinf-cnpj",
      codigo: "REINF-701",
      tipo: "erro",
      titulo: `${semCnpj.length} evento(s) sem CNPJ do prestador`,
      detalhe: "O evento R-2010 é rejeitado sem a identificação do prestador.",
      destino: "/fiscal/documentos/servicos-tomados",
    });
  if (!comRetencao.length)
    validacoes.push({
      id: "v-reinf-vazio",
      codigo: "REINF-700",
      tipo: "pendência",
      titulo: "Nenhum evento de retenção na competência",
      detalhe: "Sem retenções apenas o fechamento R-2099 sem movimento é enviado.",
      destino: "/fiscal/documentos/servicos-tomados",
    });

  return montar("reinf", blocos, validacoes, cruzamentos, [
    { fonte: "Serviços tomados com retenção", registros: comRetencao.length, valor: rs(inss + irrf + pcc), destino: "/fiscal/documentos/servicos-tomados" },
    { fonte: "Serviços prestados", registros: prestados.length, valor: rs(somaDocs(prestados, "valor")), destino: "/fiscal/documentos/servicos-prestados" },
  ], [
    { label: "Eventos gerados", valor: String(comRetencao.length + 3) },
    { label: "INSS retido", valor: rs(inss) },
    { label: "IRRF retido", valor: rs(irrf) },
    { label: "CSRF retido", valor: rs(pcc) },
  ]);
}

function gerarEstaduais(empresaId: string | null, competencia: string, estado: ObrEstado): Geracao {
  seqLinha = 0;
  const filiais = loadFiliais().filter((f) => !empresaId || f.empresaId === empresaId);
  const ufs = Array.from(new Set(filiais.map((f) => f.uf).filter(Boolean)));
  const municipios = Array.from(new Set(filiais.map((f) => f.cidade).filter(Boolean)));
  const icms = linhasDoPeriodo("apuracao-icms", empresaId, competencia);
  const saldoIcms = somar(icms.filter((l) => (l.tipo ?? "").toLowerCase().includes("saldo")), "valor");
  const apIss = apurar("iss", empresaId, competencia, getApEstado("iss", empresaId, competencia));
  const prestados = docsValidos("servicos-prestados", empresaId, competencia);
  const tomados = docsValidos("servicos-tomados", empresaId, competencia);

  const blocos: BlocoSped[] = [
    {
      codigo: "GIA",
      nome: "GIA — Guia de Informação e Apuração do ICMS",
      obrigatorio: true,
      registros: [
        reg("GIA-Mestre", "Identificação e apuração da GIA", Math.max(1, ufs.length),
          [{ campo: "UFs", valor: ufs.join(", ") || "SP" }, { campo: "Saldo do ICMS", valor: rs(Math.abs(saldoIcms)) }],
          { tabela: "escrituracao.apuracao-icms", documento: "Apuração de ICMS", campo: "saldo" },
          mem("Transporte da apuração para a GIA", "Portaria CAT 92/98", "saldo apurado do ICMS por UF", [
            { label: "Saldo", valor: rs(Math.abs(saldoIcms)) },
          ]),
        ),
        reg("GIA-CFOP", "Detalhe por CFOP", icms.length,
          [{ campo: "Linhas", valor: String(icms.length) }],
          { tabela: "escrituracao.apuracao-icms", documento: "Apuração", campo: "cfop" },
          mem("Detalhamento por CFOP", "Portaria CAT 92/98 anexo IV", "agrupamento por CFOP", []),
        ),
      ],
    },
    {
      codigo: "SINTEGRA",
      nome: "Sintegra — arquivo magnético",
      obrigatorio: false,
      registros: [
        reg("50", "Registro de total de nota fiscal", docsValidos("saidas", empresaId, competencia).length,
          [{ campo: "Documentos", valor: String(docsValidos("saidas", empresaId, competencia).length) }],
          { tabela: "fiscal.documentos", documento: "NF-e", campo: "valor" },
          mem("Totais por documento", "Convênio ICMS 57/95", "um registro 50 por documento", []),
        ),
      ],
    },
    {
      codigo: "DESTDA",
      nome: "DeSTDA — declaração do Simples Nacional",
      obrigatorio: regimeDaEmpresa(empresaId) === "Simples Nacional",
      registros: [
        reg("DeSTDA", "ICMS-ST, DIFAL e antecipação", regimeDaEmpresa(empresaId) === "Simples Nacional" ? 1 : 0,
          [{ campo: "Regime", valor: regimeDaEmpresa(empresaId) }],
          { tabela: "empresas", documento: "Cadastro", campo: "regime" },
          mem("Obrigatoriedade da DeSTDA", "Ajuste SINIEF 12/2015", "exigida de optantes do Simples com IE", []),
        ),
      ],
    },
    {
      codigo: "ISS",
      nome: "Declarações municipais do ISS (DES / DECLAN / NFTS)",
      obrigatorio: true,
      registros: [
        reg("DES-Prestados", "Serviços prestados declarados", prestados.length,
          [{ campo: "Valor", valor: rs(somaDocs(prestados, "valor")) }, { campo: "ISS devido", valor: rs(apIss.totalImposto) }],
          { tabela: "fiscal.servicos-prestados", documento: "NFS-e emitidas", campo: "valor / iss" },
          mem("Declaração de serviços prestados", "LC 116/2003", "Σ NFS-e emitidas no município", []),
        ),
        reg("NFTS", "Nota fiscal de serviço tomado", tomados.length,
          [{ campo: "Valor", valor: rs(somaDocs(tomados, "valor")) }],
          { tabela: "fiscal.servicos-tomados", documento: "NFS-e tomadas", campo: "valor" },
          mem("NFTS de tomador", "Legislação municipal", "serviços tomados de prestadores de fora do município", []),
        ),
      ],
    },
  ];

  const cruzamentos = cruzar(empresaId, competencia);
  const validacoes = [
    ...validacoesBase("estaduais", empresaId, competencia, estado),
    ...validacoesCruzamento(cruzamentos),
  ];
  if (!filiais.length)
    validacoes.push({
      id: "v-est-filial",
      codigo: "EST-801",
      tipo: "advertência",
      titulo: "Nenhuma filial cadastrada",
      detalhe: "As declarações estaduais e municipais são geradas por estabelecimento (UF e município).",
      destino: "/preparativos/cadastros/filiais",
    });

  return montar("estaduais", blocos, validacoes, cruzamentos, [
    { fonte: "Apuração de ICMS", registros: icms.length, valor: rs(Math.abs(saldoIcms)), destino: "/fiscal/escrituracao/apuracao-icms" },
    { fonte: "Apuração de ISS", registros: apIss.calculos.length, valor: rs(apIss.totalImposto), destino: "/fiscal/apuracoes/iss" },
    { fonte: "Estabelecimentos", registros: filiais.length, valor: `${ufs.length} UF`, destino: "/preparativos/cadastros/filiais" },
  ], [
    { label: "Declarações", valor: String(Math.max(1, ufs.length) + municipios.length) },
    { label: "UFs envolvidas", valor: ufs.join(", ") || "SP" },
    { label: "ICMS a recolher", valor: rs(Math.abs(saldoIcms)) },
    { label: "ISS devido", valor: rs(apIss.totalImposto) },
  ]);
}

/* ============================ montagem comum ============================ */

function montar(
  obr: ObrSlug,
  blocos: BlocoSped[],
  validacoes: Validacao[],
  cruzamentos: Cruzamento[],
  dados: Geracao["dados"],
  resumo: Geracao["resumo"],
): Geracao {
  const totalRegistros = blocos.reduce((s, b) => s + b.registros.length, 0);
  const totalLinhas = blocos.reduce((s, b) => s + b.registros.reduce((x, r) => x + Math.max(1, r.ocorrencias), 0), 0);
  const erros = validacoes.filter((v) => v.tipo === "erro").length;
  const adv = validacoes.filter((v) => v.tipo === "advertência").length;
  const pend = validacoes.filter((v) => v.tipo === "pendência").length;

  const kpis: ObrKpi[] = [
    { label: "Blocos", valor: String(blocos.length) },
    { label: "Registros", valor: String(totalRegistros) },
    { label: "Linhas do arquivo", valor: totalLinhas.toLocaleString("pt-BR") },
    { label: "Erros", valor: String(erros), destaque: erros > 0 },
    { label: "Advertências", valor: String(adv) },
    { label: "Pendências", valor: String(pend) },
  ];

  return { obr, kpis, blocos, totalRegistros, totalLinhas, validacoes, cruzamentos, dados, resumo };
}

export function gerarObrigacao(
  obr: ObrSlug,
  empresaId: string | null,
  competencia: string,
  estado: ObrEstado,
): Geracao {
  switch (obr) {
    case "sped-fiscal":
      return gerarSpedFiscal(empresaId, competencia, estado);
    case "efd-contribuicoes":
      return gerarEfdContribuicoes(empresaId, competencia, estado);
    case "ecd-ecf":
      return gerarEcdEcf(empresaId, competencia, estado);
    case "dctfweb":
      return gerarDctfWeb(empresaId, competencia, estado);
    case "reinf":
      return gerarReinf(empresaId, competencia, estado);
    case "estaduais":
      return gerarEstaduais(empresaId, competencia, estado);
  }
}

/* ========================= ações do fluxo (12 etapas) =================== */

export const ETAPAS = [
  "Importação dos dados",
  "Validação das regras",
  "Cruzamento das informações",
  "Identificação de inconsistências",
  "Correções",
  "Geração do arquivo",
  "Assinatura digital",
  "Validação PVA",
  "Transmissão",
  "Recebimento do protocolo",
  "Armazenamento",
  "Auditoria",
];

function hashFake() {
  return Array.from({ length: 8 }, () => Math.random().toString(16).slice(2, 6)).join("").slice(0, 32);
}

/** Gera nova versão do arquivo a partir do estado atual dos dados. */
export function gerarArquivo(obr: ObrSlug, empresaId: string, competencia: string) {
  const estado = getObrEstado(obr, empresaId, competencia);
  const g = gerarObrigacao(obr, empresaId, competencia, estado);
  const erros = g.validacoes.filter((v) => v.tipo === "erro");
  const def = defDe(obr);
  const versao = (estado.arquivos[0]?.versao ?? 0) + 1;
  const nome = `${def.sigla.replace(/[^A-Za-z0-9]/g, "")}_${empresaId}_${competencia.replace("-", "")}_v${versao}.${def.formato.toLowerCase()}`;

  if (erros.length) {
    setObrEstado(obr, empresaId, competencia, { status: "Com inconsistências", etapa: 4 }, {
      acao: "Geração bloqueada",
      detalhe: `${erros.length} erro(s) impedem a geração do arquivo.`,
    });
    return { ok: false as const, erros };
  }

  const arquivo: Arquivo = {
    id: novoObrId("arq"),
    versao,
    nome,
    formato: def.formato,
    geradoEm: new Date().toISOString(),
    linhas: g.totalLinhas,
    tamanhoKb: Math.max(1, Math.round((g.totalLinhas * 220) / 1024)),
    hash: hashFake(),
    layout: estado.versaoLayout || def.layoutVigente,
    assinado: false,
  };

  setObrEstado(obr, empresaId, competencia, { status: "Gerada", etapa: 6, arquivos: [arquivo, ...estado.arquivos] }, {
    acao: "Arquivo gerado",
    detalhe: `${nome} — ${g.totalLinhas} linhas, ${g.totalRegistros} registros, layout ${arquivo.layout}.`,
  });
  return { ok: true as const, arquivo };
}

export function assinarArquivo(obr: ObrSlug, empresaId: string, competencia: string, arquivoId: string) {
  const estado = getObrEstado(obr, empresaId, competencia);
  const cert = certificadoValido(empresaId);
  if (!cert) return { ok: false as const, motivo: "Nenhum certificado digital válido cadastrado." };
  const arquivo = estado.arquivos.find((a) => a.id === arquivoId);
  if (!arquivo) return { ok: false as const, motivo: "Arquivo não encontrado." };

  const assinatura: Assinatura = {
    id: novoObrId("ass"),
    arquivoId,
    certificado: `${cert.tipo ?? "A1"} — ${cert.ac ?? "AC Certisign"}`,
    titular: cert.titular ?? "—",
    validade: cert.validade ?? "—",
    em: new Date().toISOString(),
    usuario: USUARIO,
  };

  setObrEstado(
    obr, empresaId, competencia,
    {
      status: "Assinada",
      etapa: 7,
      assinaturas: [assinatura, ...estado.assinaturas],
      arquivos: estado.arquivos.map((a) => (a.id === arquivoId ? { ...a, assinado: true } : a)),
    },
    { acao: "Arquivo assinado", detalhe: `${arquivo.nome} assinado com ${assinatura.certificado}.` },
  );
  return { ok: true as const, assinatura };
}

/** Simula validação no PVA: erros bloqueiam, advertências apenas informam. */
export function validarPva(obr: ObrSlug, empresaId: string, competencia: string) {
  const estado = getObrEstado(obr, empresaId, competencia);
  const g = gerarObrigacao(obr, empresaId, competencia, estado);
  const erros = g.validacoes.filter((v) => v.tipo === "erro");
  setObrEstado(obr, empresaId, competencia, { etapa: erros.length ? 4 : 8 }, {
    acao: "Validação PVA executada",
    detalhe: erros.length
      ? `PVA acusou ${erros.length} erro(s) e ${g.validacoes.filter((v) => v.tipo === "advertência").length} advertência(s).`
      : `Arquivo validado sem erros, com ${g.validacoes.filter((v) => v.tipo === "advertência").length} advertência(s).`,
  });
  return { erros, validacoes: g.validacoes };
}

export function transmitir(obr: ObrSlug, empresaId: string, competencia: string, arquivoId: string) {
  const estado = getObrEstado(obr, empresaId, competencia);
  const arquivo = estado.arquivos.find((a) => a.id === arquivoId);
  if (!arquivo) return { ok: false as const, motivo: "Arquivo não encontrado." };
  if (!arquivo.assinado) return { ok: false as const, motivo: "Assine o arquivo antes de transmitir." };

  const t: Transmissao = {
    id: novoObrId("trm"),
    arquivoId,
    versao: arquivo.versao,
    em: new Date().toISOString(),
    situacao: "Em processamento",
    protocolo: "",
    recibo: "",
    tempoMs: 0,
    mensagem: "Arquivo enviado, aguardando processamento do órgão.",
  };
  setObrEstado(obr, empresaId, competencia, { status: "Em processamento", etapa: 8, transmissoes: [t, ...estado.transmissoes] }, {
    acao: "Transmissão iniciada",
    detalhe: `${arquivo.nome} (versão ${arquivo.versao}) enviado para ${defDe(obr).orgao}.`,
  });
  return { ok: true as const, transmissao: t };
}

/** Conclui o processamento simulado da transmissão e devolve o protocolo. */
export function concluirTransmissao(obr: ObrSlug, empresaId: string, competencia: string, transmissaoId: string, tempoMs: number) {
  const estado = getObrEstado(obr, empresaId, competencia);
  const protocolo = `${competencia.replace("-", "")}.${Math.floor(Math.random() * 9_000_000 + 1_000_000)}`;
  const recibo = `RC-${hashFake().slice(0, 12).toUpperCase()}`;
  const transmissoes = estado.transmissoes.map((t) =>
    t.id === transmissaoId
      ? { ...t, situacao: "Transmitida" as const, protocolo, recibo, tempoMs, mensagem: "Arquivo recebido e processado com sucesso." }
      : t,
  );
  setObrEstado(obr, empresaId, competencia, { status: "Transmitida", etapa: 11, transmissoes }, {
    acao: "Protocolo recebido",
    detalhe: `Protocolo ${protocolo} · recibo ${recibo} · processado em ${(tempoMs / 1000).toFixed(1)}s.`,
  });
  return { protocolo, recibo };
}

/* ============================ monitoramento ============================= */

export type LinhaMonitor = {
  obr: ObrSlug;
  titulo: string;
  competencia: string;
  status: ObrStatus;
  responsavel: string;
  prazo: string;
  dias: number;
  erros: number;
  advertencias: number;
  protocolo: string;
  arquivos: number;
};

export function monitorar(empresaId: string | null, competencia: string): LinhaMonitor[] {
  return CATALOGO.map((def) => {
    const estado = getObrEstado(def.slug, empresaId, competencia);
    const g = gerarObrigacao(def.slug, empresaId, competencia, estado);
    const ultima = estado.transmissoes[0];
    return {
      obr: def.slug,
      titulo: def.titulo,
      competencia,
      status: estado.status,
      responsavel: estado.responsavel,
      prazo: vencimentoBR(def.slug, competencia),
      dias: diasRestantes(def.slug, competencia),
      erros: g.validacoes.filter((v) => v.tipo === "erro").length,
      advertencias: g.validacoes.filter((v) => v.tipo === "advertência").length,
      protocolo: ultima?.protocolo ?? "",
      arquivos: estado.arquivos.length,
    };
  });
}

export function resumoMonitor(linhas: LinhaMonitor[]) {
  return {
    pendentes: linhas.filter((l) => ["Não iniciada", "Em geração", "Gerada", "Assinada"].includes(l.status)).length,
    transmitidas: linhas.filter((l) => l.status === "Transmitida").length,
    processando: linhas.filter((l) => l.status === "Em processamento").length,
    rejeitadas: linhas.filter((l) => l.status === "Rejeitada").length,
    inconsistentes: linhas.filter((l) => l.status === "Com inconsistências" || l.erros > 0).length,
    advertencias: linhas.reduce((s, l) => s + l.advertencias, 0),
    vencidas: linhas.filter((l) => l.dias < 0 && l.status !== "Transmitida").length,
    proximas: linhas.filter((l) => l.dias >= 0 && l.dias <= 7 && l.status !== "Transmitida").length,
  };
}

/** Prioridade da agenda pelo prazo e situação. */
export function prioridadeDe(l: LinhaMonitor): "Alta" | "Média" | "Baixa" {
  if (l.status === "Transmitida") return "Baixa";
  if (l.dias < 0 || l.dias <= 3) return "Alta";
  if (l.dias <= 10) return "Média";
  return "Baixa";
}

/** Pendências das obrigações para o painel de fechamento. */
export function pendenciasObrigacoes(empresaId: string | null, competencia: string) {
  if (!empresaId) return [];
  return monitorar(empresaId, competencia).map((l) => ({
    id: `obr-${l.obr}`,
    titulo: `${l.titulo} — ${l.status}`,
    detalhe:
      l.status === "Transmitida"
        ? `Protocolo ${l.protocolo || "—"} recebido.`
        : `Prazo ${l.prazo} · ${l.erros} erro(s) e ${l.advertencias} advertência(s).`,
    critica: l.status !== "Transmitida" && (l.dias <= 3 || l.erros > 0),
    resolvida: l.status === "Transmitida",
    destino: `/fiscal/obrigacoes/${l.obr}`,
  }));
}

export const moeda = moedaBR;
