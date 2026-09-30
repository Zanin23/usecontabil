// Leitura e conferência de XML de NF-e (layout 4.00) para a importação de documentos fiscais.
// Funções puras (sem acesso a localStorage) — a tela decide o que gravar.
import { soDigitos } from "./documentos";
import { parseNumeroBR } from "./numeros";

export type NFeParte = { cnpj: string; nome: string; uf: string };

export type NFeItem = {
  descricao: string;
  ncm: string;
  cfop: string;
  cst: string;
  quantidade: number;
  unitario: number;
  valor: number;
  aliqIcms?: number;
};

export type SituacaoNFe = "autorizada" | "cancelada" | "denegada" | "rejeitada" | "sem-protocolo";

export type NFe = {
  chave: string;
  numero: string;
  serie: string;
  naturezaOperacao: string;
  /** dd/mm/aaaa, ou "" quando o XML não traz data de emissão */
  dataBR: string;
  emitente: NFeParte;
  destinatario: NFeParte & { contribuinteIcms: boolean };
  consumidorFinal: boolean;
  valorNF: number;
  baseIcms: number;
  valorIcms: number;
  itens: NFeItem[];
  cStat: string;
  xMotivo: string;
  situacao: SituacaoNFe;
};

/** Elementos pelo nome local (funciona com namespace padrão e com prefixo). */
function tags(pai: ParentNode | undefined | null, nome: string): Element[] {
  if (!pai) return [];
  return Array.from((pai as Element | Document).getElementsByTagNameNS("*", nome));
}
const primeiro = (pai: ParentNode | undefined | null, nome: string) => tags(pai, nome)[0];
const texto = (pai: ParentNode | undefined | null, nome: string) => primeiro(pai, nome)?.textContent?.trim() ?? "";
const num = (valor: string) => parseNumeroBR(valor) ?? 0;

/** Situação da NF-e conforme o código de status do protocolo (cStat). */
export function situacaoPorCStat(cStat: string): SituacaoNFe {
  if (!cStat) return "sem-protocolo";
  if (["100", "150"].includes(cStat)) return "autorizada";
  if (["101", "135", "151", "155"].includes(cStat)) return "cancelada";
  if (["110", "301", "302", "303"].includes(cStat)) return "denegada";
  return "rejeitada";
}

function lerParte(no: Element | undefined, ender: string): NFeParte {
  return {
    cnpj: soDigitos(texto(no, "CNPJ") || texto(no, "CPF")),
    nome: texto(no, "xNome"),
    uf: texto(primeiro(no, ender), "UF"),
  };
}

/** Lê o XML de uma NF-e. Lança Error com mensagem em português quando o arquivo não serve. */
export function lerNFe(xml: string): NFe {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.getElementsByTagName("parsererror")[0]) throw new Error("Erro ao ler XML: formato inválido.");

  const inf = primeiro(doc, "infNFe");
  if (!inf) {
    if (primeiro(doc, "infEvento") || primeiro(doc, "procEventoNFe")) {
      throw new Error("Este arquivo é um evento da NF-e (cancelamento, carta de correção…), não a nota. Importe o XML da própria NF-e.");
    }
    if (primeiro(doc, "InfNfse") || primeiro(doc, "CompNfse") || primeiro(doc, "Nfse")) {
      throw new Error("Este arquivo é uma NFS-e (layout municipal). A importação lê apenas NF-e modelo 55 — lance a NFS-e manualmente.");
    }
    throw new Error("Este arquivo não parece ser uma NF-e válida (falta tag <infNFe>).");
  }

  const ide = primeiro(inf, "ide");
  const emit = primeiro(inf, "emit");
  const dest = primeiro(inf, "dest");
  const icmsTot = primeiro(inf, "ICMSTot") ?? primeiro(inf, "total");
  const prot = primeiro(doc, "infProt");

  const dh = texto(ide, "dhEmi") || texto(ide, "dEmi");
  let dataBR = "";
  const iso = dh.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const br = dh.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (iso) dataBR = `${iso[3]}/${iso[2]}/${iso[1]}`;
  else if (br) dataBR = dh.slice(0, 10);

  const chave = soDigitos(texto(prot, "chNFe")) || soDigitos((inf.getAttribute("Id") ?? "").replace(/^NFe/i, ""));

  const itens: NFeItem[] = tags(inf, "det").map((det) => {
    const prod = primeiro(det, "prod");
    const icms = primeiro(det, "ICMS");
    return {
      descricao: texto(prod, "xProd"),
      ncm: texto(prod, "NCM"),
      cfop: texto(prod, "CFOP"),
      cst: texto(icms, "CST") || texto(icms, "CSOSN"),
      quantidade: num(texto(prod, "qCom")) || 1,
      unitario: num(texto(prod, "vUnCom")),
      valor: num(texto(prod, "vProd")),
      aliqIcms: texto(icms, "pICMS") ? num(texto(icms, "pICMS")) : undefined,
    };
  });

  const cStat = texto(prot, "cStat");
  return {
    chave,
    numero: texto(ide, "nNF"),
    serie: texto(ide, "serie") || "1",
    naturezaOperacao: texto(ide, "natOp"),
    dataBR,
    emitente: lerParte(emit, "enderEmit"),
    destinatario: { ...lerParte(dest, "enderDest"), contribuinteIcms: texto(dest, "indIEDest") === "1" },
    consumidorFinal: texto(ide, "indFinal") === "1",
    valorNF: num(texto(icmsTot, "vNF")),
    baseIcms: num(texto(icmsTot, "vBC")),
    valorIcms: num(texto(icmsTot, "vICMS")),
    itens,
    cStat,
    xMotivo: texto(prot, "xMotivo"),
    situacao: situacaoPorCStat(cStat),
  };
}

/* ------------------------------ conferências ------------------------------ */

export type PapelNaNota = "emitente" | "destinatario" | "qualquer";

/** Em qual papel a empresa selecionada precisa aparecer na NF-e, conforme a tela de importação. */
export function papelEsperado(slug: string): PapelNaNota {
  if (["saidas", "servicos-prestados", "cupons"].includes(slug)) return "emitente";
  if (["entradas", "manifestacao"].includes(slug)) return "destinatario";
  return "qualquer";
}

const raizCnpj = (v: string) => soDigitos(v).slice(0, 8);

/** A empresa selecionada participa da nota? Compara a raiz do CNPJ (matriz e filiais compartilham os 8 primeiros dígitos). */
export function conferirParticipacao(slug: string, cnpjEmpresa: string, nfe: NFe): { ok: boolean; motivo?: string } {
  const alvo = raizCnpj(cnpjEmpresa);
  if (alvo.length < 8) return { ok: true }; // empresa sem CNPJ válido: nada a conferir
  const papel = papelEsperado(slug);
  const ehEmit = raizCnpj(nfe.emitente.cnpj) === alvo;
  const ehDest = raizCnpj(nfe.destinatario.cnpj) === alvo;
  const ok = papel === "emitente" ? ehEmit : papel === "destinatario" ? ehDest : ehEmit || ehDest;
  if (ok) return { ok: true };
  const fmt = (c: string) => (c.length === 14 ? c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : c || "não informado");
  const quem =
    papel === "emitente"
      ? `O emitente da NF-e (${fmt(nfe.emitente.cnpj)})`
      : papel === "destinatario"
        ? `O destinatário da NF-e (${fmt(nfe.destinatario.cnpj)})`
        : `Nem o emitente (${fmt(nfe.emitente.cnpj)}) nem o destinatário (${fmt(nfe.destinatario.cnpj)}) da NF-e`;
  return { ok: false, motivo: `${quem} não é a empresa selecionada (${fmt(soDigitos(cnpjEmpresa))}). Selecione a empresa correta no cabeçalho.` };
}

/** CFOP de saída do emitente → CFOP de entrada de quem recebe (5→1, 6→2, 7→3). Outros valores ficam como estão. */
export function cfopDeEntrada(cfop: string): string {
  const m = cfop.match(/^([567])(\d{3})$/);
  return m ? `${{ "5": "1", "6": "2", "7": "3" }[m[1] as "5" | "6" | "7"]}${m[2]}` : cfop;
}

/** CFOP que representa a nota (o de maior valor) e a lista de CFOPs distintos com seus valores. */
export function cfopPrincipal(itens: NFeItem[]): { cfop: string; distintos: { cfop: string; valor: number }[] } {
  const porCfop = new Map<string, number>();
  for (const it of itens) porCfop.set(it.cfop, (porCfop.get(it.cfop) ?? 0) + it.valor);
  const distintos = [...porCfop.entries()].map(([cfop, valor]) => ({ cfop, valor })).sort((a, b) => b.valor - a.valor);
  return { cfop: distintos[0]?.cfop ?? "", distintos };
}
