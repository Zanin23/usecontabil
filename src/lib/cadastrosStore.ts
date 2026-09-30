/**
 * Cadastros próprios do sistema: clientes/fornecedores (participantes) e produtos/serviços.
 *
 * Enquanto a integração com o ERP (Use Sistemas) não existe, estes cadastros são a fonte única do
 * sistema — alimentados à mão, pela importação de XML de NF-e ou trazidos dos cadastros antigos.
 * São do GRUPO (valem para todas as empresas da conta). O campo `origem` já prevê a futura carga
 * vinda do ERP.
 * Persistência: coleções locais sincronizadas com a nuvem (ver nuvemColecoes.ts).
 */
import { criarColecao, useColecoes, type RegistroBase } from "./nuvemColecoes";
import {
  cnpjValido, cpfValido, emailValido, formatarCep, formatarCnpj, formatarCpf, gtinValido, soDigitos,
} from "./documentos";
import { parseNumeroBR } from "./numeros";
import { getStorageSuffix } from "./praticaStore";
import type { NFeItem, NFeParte } from "./nfeXml";

/* ------------------------------------------------------------------ */
/* Tabelas de apoio                                                    */
/* ------------------------------------------------------------------ */

export const UFS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB",
  "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export const TIPOS_PARTICIPANTE = ["Cliente", "Fornecedor", "Cliente e fornecedor", "Transportadora", "Outro"] as const;
export type TipoParticipante = (typeof TIPOS_PARTICIPANTE)[number];

export const PESSOAS = ["Jurídica", "Física", "Estrangeiro"] as const;
export type Pessoa = (typeof PESSOAS)[number];

/** indIEDest da NF-e: 1 contribuinte, 2 contribuinte isento, 9 não contribuinte. */
export const INDICADORES_IE = ["Contribuinte", "Contribuinte isento", "Não contribuinte"] as const;
export type IndicadorIe = (typeof INDICADORES_IE)[number];

export const REGIMES_PARTICIPANTE = [
  "Não informado", "Simples Nacional", "MEI", "Lucro Presumido", "Lucro Real", "Imune/Isento", "Pessoa física",
] as const;
export type RegimeParticipante = (typeof REGIMES_PARTICIPANTE)[number];

export const RETENCOES = ["ISS", "IRRF", "PIS/COFINS/CSLL", "INSS"] as const;

export const ORIGENS_CADASTRO = ["Manual", "XML de NF-e", "Cadastro antigo", "ERP"] as const;
export type OrigemCadastro = (typeof ORIGENS_CADASTRO)[number];

/** Tipo do item conforme a EFD ICMS/IPI (registro 0200, campo TIPO_ITEM). */
export const TIPOS_ITEM: ReadonlyArray<{ codigo: string; descricao: string }> = [
  { codigo: "00", descricao: "Mercadoria para revenda" },
  { codigo: "01", descricao: "Matéria-prima" },
  { codigo: "02", descricao: "Embalagem" },
  { codigo: "03", descricao: "Produto em processo" },
  { codigo: "04", descricao: "Produto acabado" },
  { codigo: "05", descricao: "Subproduto" },
  { codigo: "06", descricao: "Produto intermediário" },
  { codigo: "07", descricao: "Material de uso e consumo" },
  { codigo: "08", descricao: "Ativo imobilizado" },
  { codigo: "09", descricao: "Serviços" },
  { codigo: "10", descricao: "Outros insumos" },
  { codigo: "99", descricao: "Outras" },
];
export const rotuloTipoItem = (codigo?: string) => {
  const t = TIPOS_ITEM.find((x) => x.codigo === codigo);
  return t ? `${t.codigo} · ${t.descricao}` : "—";
};

/** Origem da mercadoria (tabela A do CST de ICMS). */
export const ORIGENS_MERCADORIA: ReadonlyArray<{ codigo: string; descricao: string }> = [
  { codigo: "0", descricao: "Nacional" },
  { codigo: "1", descricao: "Estrangeira — importação direta" },
  { codigo: "2", descricao: "Estrangeira — adquirida no mercado interno" },
  { codigo: "3", descricao: "Nacional — conteúdo de importação entre 40% e 70%" },
  { codigo: "4", descricao: "Nacional — processo produtivo básico (PPB)" },
  { codigo: "5", descricao: "Nacional — conteúdo de importação até 40%" },
  { codigo: "6", descricao: "Estrangeira — importação direta, sem similar nacional (CAMEX)" },
  { codigo: "7", descricao: "Estrangeira — mercado interno, sem similar nacional (CAMEX)" },
  { codigo: "8", descricao: "Nacional — conteúdo de importação acima de 70%" },
];

export const UNIDADES = ["UN", "PC", "CX", "KG", "G", "T", "L", "ML", "M", "M2", "M3", "PAR", "DZ", "JG", "KIT", "HR", "MES", "SV"] as const;

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export type Participante = RegistroBase & {
  codigo: string;
  tipo: TipoParticipante;
  pessoa: Pessoa;
  /** CNPJ/CPF formatado (ou identificação no exterior). */
  documento: string;
  nome: string;
  fantasia?: string;
  indicadorIe: IndicadorIe;
  ie?: string;
  im?: string;
  suframa?: string;
  regime: RegimeParticipante;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  /** Código IBGE do município (7 dígitos). */
  codigoMunicipio?: string;
  uf?: string;
  pais?: string;
  email?: string;
  telefone?: string;
  /** Conta analítica do plano de contas (ex.: cliente ou fornecedor específico). */
  contaContabilId?: string;
  retencoes: string[];
  observacoes?: string;
  situacao: "Ativo" | "Inativo";
  origem: OrigemCadastro;
};

export type TipoProduto = "Produto" | "Serviço";

export type Produto = RegistroBase & {
  codigo: string;
  descricao: string;
  tipo: TipoProduto;
  /** EFD ICMS/IPI 0200 TIPO_ITEM. */
  tipoItem: string;
  unidade: string;
  ncm?: string;
  cest?: string;
  gtin?: string;
  origemMercadoria?: string;
  cfopSaida?: string;
  cfopEntrada?: string;
  cstIcms?: string;
  aliqIcms?: number;
  cstIpi?: string;
  aliqIpi?: number;
  cstPis?: string;
  aliqPis?: number;
  cstCofins?: string;
  aliqCofins?: number;
  /** Serviços: item da lista da LC 116/2003 (ex.: 17.01). */
  itemLc116?: string;
  nbs?: string;
  aliqIss?: number;
  /** Reforma tributária (NT 2025.002): CST do IBS/CBS e classificação tributária. */
  cstIbsCbs?: string;
  cClassTrib?: string;
  contaReceitaId?: string;
  contaCustoId?: string;
  contaEstoqueId?: string;
  contaDespesaId?: string;
  precoPadrao?: number;
  observacoes?: string;
  situacao: "Ativo" | "Inativo";
  origem: OrigemCadastro;
};

export const colecaoParticipantes = criarColecao<Participante>("participantes");
export const colecaoProdutos = criarColecao<Produto>("produtos");

export const novoIdCadastro = (prefixo: string) =>
  `${prefixo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/* ------------------------------------------------------------------ */
/* Leitura                                                             */
/* ------------------------------------------------------------------ */

const porNome = (a: { nome: string }, b: { nome: string }) => a.nome.localeCompare(b.nome, "pt-BR");

export function listarParticipantes(): Participante[] {
  return colecaoParticipantes.listar().sort(porNome);
}

export function listarProdutos(): Produto[] {
  return colecaoProdutos.listar().sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true }));
}

export const useParticipantes = () => useColecoes(listarParticipantes);
export const useProdutos = () => useColecoes(listarProdutos);

export const participantePorId = (id?: string) => (id ? colecaoParticipantes.obter(id) : undefined);
export const produtoPorId = (id?: string) => (id ? colecaoProdutos.obter(id) : undefined);

export function participantePorDocumento(documento: string, lista = listarParticipantes()) {
  const alvo = soDigitos(documento);
  return alvo ? lista.find((p) => soDigitos(p.documento) === alvo) : undefined;
}

export const ehCliente = (p: Participante) => p.tipo === "Cliente" || p.tipo === "Cliente e fornecedor";
export const ehFornecedor = (p: Participante) => p.tipo === "Fornecedor" || p.tipo === "Cliente e fornecedor";

/** Próximo código numérico livre (000001, 000002…). */
export function proximoCodigo(lista: { codigo: string }[], largura = 6) {
  const max = lista.reduce((m, x) => (/^\d+$/.test(x.codigo) ? Math.max(m, Number(x.codigo)) : m), 0);
  return String(max + 1).padStart(largura, "0");
}

/** Quantos cadastros apontam para a conta (bloqueia a exclusão da conta). */
export function cadastrosQueUsamConta(contaId: string): number {
  const p = colecaoParticipantes.listar().filter((x) => x.contaContabilId === contaId).length;
  const pr = colecaoProdutos
    .listar()
    .filter((x) => [x.contaReceitaId, x.contaCustoId, x.contaEstoqueId, x.contaDespesaId].includes(contaId)).length;
  return p + pr;
}

/* ------------------------------------------------------------------ */
/* Participantes: validação e gravação                                 */
/* ------------------------------------------------------------------ */

/** Sem `strict` no tsconfig o `if (!r.ok)` não estreita a união: os dois lados declaram os dois campos. */
export type Resultado<T> = { ok: true; registro: T; erros?: undefined } | { ok: false; erros: string[]; registro?: undefined };

export function participanteVazio(lista = listarParticipantes()): Participante {
  return {
    id: "",
    codigo: proximoCodigo(lista),
    tipo: "Cliente",
    pessoa: "Jurídica",
    documento: "",
    nome: "",
    indicadorIe: "Não contribuinte",
    regime: "Não informado",
    pais: "Brasil",
    retencoes: [],
    situacao: "Ativo",
    origem: "Manual",
  };
}

export function validarParticipante(p: Participante, lista = listarParticipantes()): string[] {
  const erros: string[] = [];
  const doc = soDigitos(p.documento);
  if (!p.codigo.trim()) erros.push("Informe o código do cadastro.");
  else {
    const mesmoCodigo = lista.find((x) => x.id !== p.id && x.codigo.trim().toLowerCase() === p.codigo.trim().toLowerCase());
    if (mesmoCodigo) erros.push(`O código ${p.codigo.trim()} já é de ${mesmoCodigo.nome}.`);
  }
  if (p.nome.trim().length < 2) erros.push("Informe o nome ou a razão social.");
  if (p.pessoa === "Jurídica" && !cnpjValido(doc)) erros.push("CNPJ inválido — confira os 14 dígitos.");
  if (p.pessoa === "Física" && !cpfValido(doc)) erros.push("CPF inválido — confira os 11 dígitos.");
  if (p.pessoa !== "Estrangeiro" && doc) {
    const outro = lista.find((x) => x.id !== p.id && soDigitos(x.documento) === doc);
    if (outro) {
      erros.push(
        `Já existe o cadastro ${outro.codigo} — ${outro.nome} com este ${p.pessoa === "Física" ? "CPF" : "CNPJ"}. ` +
          'Se ele também é cliente e fornecedor, use o tipo "Cliente e fornecedor".',
      );
    }
  }
  if (p.pessoa !== "Estrangeiro") {
    if (!p.uf || !(UFS_BR as readonly string[]).includes(p.uf)) erros.push("Informe a UF.");
  }
  const ie = (p.ie ?? "").trim();
  if (ie && !/^(ISENTO|[\d.\-/]{2,20})$/i.test(ie)) erros.push('Inscrição estadual: só números (ou "ISENTO").');
  if (p.indicadorIe === "Contribuinte" && (!ie || /^isento$/i.test(ie))) {
    erros.push("Contribuinte de ICMS precisa da inscrição estadual.");
  }
  if (p.cep && soDigitos(p.cep).length !== 8) erros.push("CEP deve ter 8 dígitos.");
  if (p.codigoMunicipio && !/^\d{7}$/.test(soDigitos(p.codigoMunicipio))) erros.push("Código IBGE do município deve ter 7 dígitos.");
  if (p.email && !emailValido(p.email)) erros.push("E-mail inválido.");
  return erros;
}

function limparTexto(v?: string) {
  const t = (v ?? "").trim();
  return t || undefined;
}

export function normalizarParticipante(p: Participante): Participante {
  const doc = soDigitos(p.documento);
  return {
    ...p,
    codigo: p.codigo.trim(),
    nome: p.nome.trim(),
    fantasia: limparTexto(p.fantasia),
    documento: p.pessoa === "Jurídica" ? formatarCnpj(doc) : p.pessoa === "Física" ? formatarCpf(doc) : p.documento.trim(),
    ie: limparTexto(p.ie)?.toUpperCase(),
    im: limparTexto(p.im),
    suframa: limparTexto(p.suframa),
    cep: p.cep ? formatarCep(p.cep) : undefined,
    logradouro: limparTexto(p.logradouro),
    numero: limparTexto(p.numero),
    complemento: limparTexto(p.complemento),
    bairro: limparTexto(p.bairro),
    municipio: limparTexto(p.municipio),
    codigoMunicipio: limparTexto(p.codigoMunicipio) ? soDigitos(p.codigoMunicipio) : undefined,
    uf: p.pessoa === "Estrangeiro" ? limparTexto(p.uf) : p.uf,
    pais: limparTexto(p.pais) ?? (p.pessoa === "Estrangeiro" ? undefined : "Brasil"),
    email: limparTexto(p.email)?.toLowerCase(),
    telefone: limparTexto(p.telefone),
    observacoes: limparTexto(p.observacoes),
    contaContabilId: p.contaContabilId || undefined,
    retencoes: [...new Set(p.retencoes ?? [])],
  };
}

export function salvarParticipante(p: Participante): Resultado<Participante> {
  const lista = listarParticipantes();
  const final = normalizarParticipante({ ...p, id: p.id || novoIdCadastro("par") });
  const erros = validarParticipante(final, lista);
  if (erros.length) return { ok: false, erros };
  return { ok: true, registro: colecaoParticipantes.salvar(final) };
}

export function excluirParticipante(id: string) {
  colecaoParticipantes.remover(id);
}

/* ------------------------------------------------------------------ */
/* Produtos e serviços: validação e gravação                           */
/* ------------------------------------------------------------------ */

export function produtoVazio(tipo: TipoProduto = "Produto", lista = listarProdutos()): Produto {
  return {
    id: "",
    codigo: proximoCodigo(lista),
    descricao: "",
    tipo,
    tipoItem: tipo === "Serviço" ? "09" : "00",
    unidade: tipo === "Serviço" ? "SV" : "UN",
    origemMercadoria: tipo === "Produto" ? "0" : undefined,
    situacao: "Ativo",
    origem: "Manual",
  };
}

const aliquotaValida = (v: number | undefined) => v === undefined || (Number.isFinite(v) && v >= 0 && v <= 100);

export function validarProduto(p: Produto, lista = listarProdutos()): string[] {
  const erros: string[] = [];
  const codigo = p.codigo.trim();
  if (!codigo) erros.push("Informe o código do item.");
  else {
    const outro = lista.find((x) => x.id !== p.id && x.codigo.trim().toLowerCase() === codigo.toLowerCase());
    if (outro) erros.push(`O código ${codigo} já é de "${outro.descricao}".`);
  }
  if (!p.descricao.trim()) erros.push("Informe a descrição.");
  if (!p.unidade.trim()) erros.push("Informe a unidade de medida.");
  if (!TIPOS_ITEM.some((t) => t.codigo === p.tipoItem)) erros.push("Informe o tipo do item (EFD 0200).");

  if (p.tipo === "Produto") {
    if (!/^\d{8}$/.test(soDigitos(p.ncm))) erros.push("NCM deve ter 8 dígitos.");
    if (p.cest && !/^\d{7}$/.test(soDigitos(p.cest))) erros.push("CEST deve ter 7 dígitos.");
    if (p.gtin && !gtinValido(p.gtin)) erros.push("GTIN/EAN inválido (dígito verificador não confere).");
    if (p.tipoItem === "09") erros.push('Produto não pode ter o tipo de item "09 · Serviços".');
  } else {
    if (p.itemLc116 && !/^\d{1,2}\.\d{2}$/.test(p.itemLc116.trim())) erros.push("Item da LC 116 no formato 17.01.");
    if (p.nbs && soDigitos(p.nbs).length !== 9) erros.push("Código NBS deve ter 9 dígitos.");
  }
  if (p.cfopSaida && !/^[567]\d{3}$/.test(soDigitos(p.cfopSaida))) erros.push("CFOP de saída deve começar com 5, 6 ou 7.");
  if (p.cfopEntrada && !/^[123]\d{3}$/.test(soDigitos(p.cfopEntrada))) erros.push("CFOP de entrada deve começar com 1, 2 ou 3.");
  if (p.cstIbsCbs && !/^\d{3}$/.test(soDigitos(p.cstIbsCbs))) erros.push("CST do IBS/CBS deve ter 3 dígitos.");
  if (p.cClassTrib && !/^\d{6}$/.test(soDigitos(p.cClassTrib))) erros.push("cClassTrib deve ter 6 dígitos.");
  for (const [rotulo, v] of [["ICMS", p.aliqIcms], ["IPI", p.aliqIpi], ["PIS", p.aliqPis], ["COFINS", p.aliqCofins], ["ISS", p.aliqIss]] as const) {
    if (!aliquotaValida(v)) erros.push(`Alíquota de ${rotulo} deve ficar entre 0 e 100%.`);
  }
  if (p.precoPadrao !== undefined && (!Number.isFinite(p.precoPadrao) || p.precoPadrao < 0)) erros.push("Preço padrão não pode ser negativo.");
  return erros;
}

export function normalizarProduto(p: Produto): Produto {
  const digitosOuNada = (v?: string) => (limparTexto(v) ? soDigitos(v) : undefined);
  const servico = p.tipo === "Serviço";
  return {
    ...p,
    codigo: p.codigo.trim(),
    descricao: p.descricao.trim(),
    unidade: p.unidade.trim().toUpperCase(),
    tipoItem: servico ? "09" : p.tipoItem,
    ncm: digitosOuNada(p.ncm),
    cest: servico ? undefined : digitosOuNada(p.cest),
    gtin: servico ? undefined : digitosOuNada(p.gtin),
    origemMercadoria: servico ? undefined : p.origemMercadoria,
    cfopSaida: digitosOuNada(p.cfopSaida),
    cfopEntrada: digitosOuNada(p.cfopEntrada),
    cstIcms: limparTexto(p.cstIcms),
    cstIpi: limparTexto(p.cstIpi),
    cstPis: limparTexto(p.cstPis),
    cstCofins: limparTexto(p.cstCofins),
    itemLc116: servico ? limparTexto(p.itemLc116) : undefined,
    nbs: servico ? digitosOuNada(p.nbs) : undefined,
    aliqIss: servico ? p.aliqIss : undefined,
    cstIbsCbs: digitosOuNada(p.cstIbsCbs),
    cClassTrib: digitosOuNada(p.cClassTrib),
    contaReceitaId: p.contaReceitaId || undefined,
    contaCustoId: p.contaCustoId || undefined,
    contaEstoqueId: servico ? undefined : p.contaEstoqueId || undefined,
    contaDespesaId: p.contaDespesaId || undefined,
    observacoes: limparTexto(p.observacoes),
  };
}

export function salvarProduto(p: Produto): Resultado<Produto> {
  const lista = listarProdutos();
  const final = normalizarProduto({ ...p, id: p.id || novoIdCadastro("prd") });
  const erros = validarProduto(final, lista);
  if (erros.length) return { ok: false, erros };
  return { ok: true, registro: colecaoProdutos.salvar(final) };
}

export function excluirProduto(id: string) {
  colecaoProdutos.remover(id);
}

/* ------------------------------------------------------------------ */
/* Alimentação automática a partir do XML da NF-e                     */
/* ------------------------------------------------------------------ */

const TIPO_UNIFICADO: Record<string, TipoParticipante> = {
  "Cliente|Fornecedor": "Cliente e fornecedor",
  "Fornecedor|Cliente": "Cliente e fornecedor",
};

/**
 * Cria (ou completa) o cadastro do participante da nota. Não sobrescreve o que já foi preenchido;
 * se o cadastro existe com outro papel (ex.: era cliente e agora vende para a empresa), vira
 * "Cliente e fornecedor". Retorna `null` quando o documento é inválido.
 */
export function registrarParticipanteDaNFe(
  parte: NFeParte & { contribuinteIcms?: boolean },
  papel: "Cliente" | "Fornecedor",
): { participante: Participante; criado: boolean; alterado: boolean } | null {
  const doc = soDigitos(parte.cnpj);
  const pessoa: Pessoa | null = doc.length === 14 && cnpjValido(doc) ? "Jurídica" : doc.length === 11 && cpfValido(doc) ? "Física" : null;
  if (!pessoa) return null;
  const lista = listarParticipantes();
  const ie = parte.ie && !/^isento$/i.test(parte.ie) ? soDigitos(parte.ie) : parte.ie?.toUpperCase();
  const indicadorIe: IndicadorIe =
    ie && ie !== "ISENTO" ? "Contribuinte" : ie === "ISENTO" ? "Contribuinte isento" : parte.contribuinteIcms ? "Contribuinte" : "Não contribuinte";
  const dadosNota: Partial<Participante> = {
    nome: parte.nome?.trim(),
    fantasia: parte.fantasia,
    ie: ie || undefined,
    uf: parte.uf || undefined,
    logradouro: parte.logradouro,
    numero: parte.numero,
    complemento: parte.complemento,
    bairro: parte.bairro,
    municipio: parte.municipio,
    codigoMunicipio: parte.codigoMunicipio,
    cep: parte.cep ? formatarCep(parte.cep) : undefined,
    telefone: parte.telefone,
    email: parte.email?.toLowerCase(),
  };

  const existente = participantePorDocumento(doc, lista);
  if (existente) {
    const completado: Participante = { ...existente };
    let alterado = false;
    for (const [k, v] of Object.entries(dadosNota) as [keyof Participante, unknown][]) {
      const atual = completado[k];
      if (v && (atual === undefined || atual === "")) {
        (completado as Record<string, unknown>)[k] = v;
        alterado = true;
      }
    }
    const unificado = TIPO_UNIFICADO[`${existente.tipo}|${papel}`];
    if (unificado) {
      completado.tipo = unificado;
      alterado = true;
    }
    if (completado.indicadorIe === "Não contribuinte" && indicadorIe === "Contribuinte" && completado.ie) {
      completado.indicadorIe = "Contribuinte";
      alterado = true;
    }
    if (!alterado) return { participante: existente, criado: false, alterado: false };
    return { participante: colecaoParticipantes.salvar(completado), criado: false, alterado: true };
  }

  const novo = normalizarParticipante({
    ...participanteVazio(lista),
    ...Object.fromEntries(Object.entries(dadosNota).filter(([, v]) => v)),
    id: novoIdCadastro("par"),
    tipo: papel,
    pessoa,
    documento: doc,
    nome: parte.nome?.trim() || (pessoa === "Jurídica" ? formatarCnpj(doc) : formatarCpf(doc)),
    indicadorIe,
    regime: pessoa === "Física" ? "Pessoa física" : "Não informado",
    origem: "XML de NF-e",
  } as Participante);
  return { participante: colecaoParticipantes.salvar(novo), criado: true, alterado: false };
}

/**
 * Cadastra os itens de uma NF-e EMITIDA pela empresa (o código do item é o da própria empresa).
 * Itens de notas de fornecedores não são cadastrados: o código deles é do fornecedor.
 * Retorna quantos itens novos foram criados.
 */
export function registrarProdutosDaNFe(itens: NFeItem[]): number {
  const lista = listarProdutos();
  const novos: Produto[] = [];
  const chaveDescricao = (descricao: string, ncm?: string) => `${descricao.trim().toLowerCase()}|${soDigitos(ncm)}`;
  const existentesPorDescricao = new Set(lista.map((p) => chaveDescricao(p.descricao, p.ncm)));
  const codigos = new Set(lista.map((p) => p.codigo.trim().toLowerCase()));
  for (const it of itens) {
    if (!it.descricao?.trim()) continue;
    const codigo = it.codigo?.trim();
    if (codigo && codigos.has(codigo.toLowerCase())) continue;
    const chave = chaveDescricao(it.descricao, it.ncm);
    if (!codigo && existentesPorDescricao.has(chave)) continue;
    const cst = (it.cst ?? "").trim();
    const produto = normalizarProduto({
      ...produtoVazio("Produto", [...lista, ...novos]),
      id: novoIdCadastro("prd"),
      codigo: codigo || proximoCodigo([...lista, ...novos]),
      descricao: it.descricao.trim(),
      unidade: (it.unidade ?? "UN").toUpperCase(),
      ncm: it.ncm,
      cest: it.cest,
      gtin: it.gtin && gtinValido(it.gtin) ? it.gtin : undefined,
      origemMercadoria: it.origem ?? "0",
      cfopSaida: /^[567]\d{3}$/.test(it.cfop ?? "") ? it.cfop : undefined,
      cstIcms: cst || undefined,
      aliqIcms: it.aliqIcms,
      precoPadrao: it.unitario || undefined,
      origem: "XML de NF-e",
    });
    if (validarProduto(produto, [...lista, ...novos]).length) continue;
    novos.push(produto);
    codigos.add(produto.codigo.toLowerCase());
    existentesPorDescricao.add(chave);
  }
  colecaoProdutos.salvarVarios(novos);
  return novos.length;
}

/* ------------------------------------------------------------------ */
/* Cadastros antigos (Financeiro › Cadastros e documentos já lançados) */
/* ------------------------------------------------------------------ */

type ParceiroAntigo = {
  tipo?: string; nome?: string; documento?: string; ie?: string; im?: string; suframa?: string; regime?: string;
  uf?: string; municipio?: string; contribuinte?: boolean; retencoes?: string; ativo?: boolean;
};
type ProdutoAntigo = {
  codigo?: string; descricao?: string; ncm?: string; cest?: string; gtin?: string; origem?: string; cfopPadrao?: string;
  cstIcms?: string; csosn?: string; aliqIcms?: number; aliqIpi?: number; aliqPis?: number; aliqCofins?: number;
  unidade?: string; precoPadrao?: number; ativo?: boolean;
};
type ItemAntigo = { descricao?: string; tipo?: string; ncm?: string; cfop?: string; cst?: string; lc116?: string; aliqIcms?: number; aliqIss?: number; unitario?: number };
type DocAntigo = { tipo?: string; grupo?: string; participante?: string; participanteDoc?: string; ufOrigem?: string; ufDestino?: string; municipio?: string; contribuinte?: boolean; itens?: ItemAntigo[] };
type BaseTributaria = Record<string, { parceiros?: ParceiroAntigo[]; produtos?: ProdutoAntigo[]; documentos?: DocAntigo[] }>;

function lerJson<T>(chave: string, padrao: T): T {
  try {
    const raw = localStorage.getItem(chave);
    return raw ? (JSON.parse(raw) as T) : padrao;
  } catch {
    return padrao;
  }
}

const REGIME_ANTIGO: Record<string, RegimeParticipante> = {
  "Simples Nacional": "Simples Nacional", "Lucro Presumido": "Lucro Presumido", "Lucro Real": "Lucro Real",
  MEI: "MEI", "Pessoa física": "Pessoa física", "Imune/Isento": "Imune/Isento",
};

export type CandidatosImportacao = {
  participantes: Participante[];
  produtos: Produto[];
  /** Registros ignorados por CNPJ/CPF inválido (não dá para cadastrar sem corrigir). */
  documentosInvalidos: number;
  fontes: { cadastrosAntigos: number; documentos: number; servicos: number };
};

/**
 * Levanta o que existe nos cadastros antigos (Financeiro › Clientes e fornecedores, Produtos e
 * Serviços) e nos documentos fiscais já lançados, sem gravar nada. Já descarta o que existe no
 * cadastro novo (mesmo CNPJ/CPF ou mesmo código/descrição).
 */
export function candidatosDeCadastrosAntigos(): CandidatosImportacao {
  const sufixo = getStorageSuffix();
  const trib = lerJson<BaseTributaria>(`usecontabil.tributario.v1${sufixo}`, {});
  const fiscal = lerJson<Record<string, Record<string, string>[]>>(`usecontabil.fiscal.docs.v1${sufixo}`, {});
  const financeiro = lerJson<{ servicos?: Record<string, string>[] }>("usecontabil.financeiro.v1", {});

  const participantesAtuais = listarParticipantes();
  const produtosAtuais = listarProdutos();
  const vistosDoc = new Set(participantesAtuais.map((p) => soDigitos(p.documento)).filter(Boolean));
  const vistosCodigo = new Set(produtosAtuais.map((p) => p.codigo.trim().toLowerCase()));
  const vistosDescricao = new Set(produtosAtuais.map((p) => `${p.descricao.trim().toLowerCase()}|${soDigitos(p.ncm)}`));

  const participantes: Participante[] = [];
  const produtos: Produto[] = [];
  let documentosInvalidos = 0;
  const fontes = { cadastrosAntigos: 0, documentos: 0, servicos: 0 };

  const addParticipante = (dados: Partial<Participante> & { documento: string; nome: string }, fonte: keyof typeof fontes) => {
    const doc = soDigitos(dados.documento);
    if (!doc || vistosDoc.has(doc)) return;
    const pessoa: Pessoa | null = doc.length === 14 && cnpjValido(doc) ? "Jurídica" : doc.length === 11 && cpfValido(doc) ? "Física" : null;
    if (!pessoa) {
      documentosInvalidos++;
      vistosDoc.add(doc);
      return;
    }
    vistosDoc.add(doc);
    const base = participanteVazio([...participantesAtuais, ...participantes]);
    const p = normalizarParticipante({
      ...base,
      ...dados,
      id: novoIdCadastro("par"),
      pessoa,
      documento: doc,
      regime: dados.regime ?? (pessoa === "Física" ? "Pessoa física" : "Não informado"),
      uf: dados.uf && (UFS_BR as readonly string[]).includes(dados.uf) ? dados.uf : undefined,
      origem: "Cadastro antigo",
    } as Participante);
    participantes.push(p);
    fontes[fonte]++;
  };

  const addProduto = (dados: Partial<Produto> & { descricao: string }, fonte: keyof typeof fontes) => {
    const descricao = dados.descricao.trim();
    if (!descricao) return;
    const chave = `${descricao.toLowerCase()}|${soDigitos(dados.ncm)}`;
    const codigo = dados.codigo?.trim();
    if ((codigo && vistosCodigo.has(codigo.toLowerCase())) || vistosDescricao.has(chave)) return;
    const tipo = dados.tipo ?? "Produto";
    const base = produtoVazio(tipo, [...produtosAtuais, ...produtos]);
    const p = normalizarProduto({ ...base, ...dados, id: novoIdCadastro("prd"), codigo: codigo || base.codigo, descricao, tipo, origem: "Cadastro antigo" } as Produto);
    // Itens antigos sem NCM entram como estão; o cadastro fica marcado para revisão na tela.
    vistosCodigo.add(p.codigo.toLowerCase());
    vistosDescricao.add(chave);
    produtos.push(p);
    fontes[fonte]++;
  };

  for (const base of Object.values(trib)) {
    for (const par of base.parceiros ?? []) {
      addParticipante(
        {
          documento: par.documento ?? "",
          nome: par.nome ?? "",
          tipo: par.tipo === "Fornecedor" ? "Fornecedor" : par.tipo === "Ambos" ? "Cliente e fornecedor" : "Cliente",
          ie: par.ie,
          im: par.im,
          suframa: par.suframa,
          regime: REGIME_ANTIGO[par.regime ?? ""] ?? undefined,
          uf: par.uf,
          municipio: par.municipio,
          indicadorIe: /^isento$/i.test(par.ie ?? "") ? "Contribuinte isento" : par.contribuinte ? "Contribuinte" : "Não contribuinte",
          retencoes: RETENCOES.filter((r) => (par.retencoes ?? "").toUpperCase().includes(r.split("/")[0])),
          situacao: par.ativo === false ? "Inativo" : "Ativo",
        },
        "cadastrosAntigos",
      );
    }
    for (const pr of base.produtos ?? []) {
      const cfop = soDigitos(pr.cfopPadrao);
      addProduto(
        {
          codigo: pr.codigo,
          descricao: pr.descricao ?? "",
          tipo: "Produto",
          ncm: pr.ncm,
          cest: pr.cest,
          gtin: pr.gtin && gtinValido(pr.gtin) ? pr.gtin : undefined,
          origemMercadoria: pr.origem?.slice(0, 1),
          cfopSaida: /^[567]/.test(cfop) ? cfop : undefined,
          cfopEntrada: /^[123]/.test(cfop) ? cfop : undefined,
          cstIcms: pr.cstIcms || pr.csosn,
          aliqIcms: pr.aliqIcms,
          aliqIpi: pr.aliqIpi,
          aliqPis: pr.aliqPis,
          aliqCofins: pr.aliqCofins,
          unidade: pr.unidade || "UN",
          precoPadrao: pr.precoPadrao,
          situacao: pr.ativo === false ? "Inativo" : "Ativo",
        },
        "cadastrosAntigos",
      );
    }
    for (const d of base.documentos ?? []) {
      const entrada = d.tipo === "Nota de entrada";
      if (d.participanteDoc) {
        addParticipante(
          {
            documento: d.participanteDoc,
            nome: d.participante ?? "",
            tipo: entrada ? "Fornecedor" : d.tipo === "CT-e" ? "Transportadora" : "Cliente",
            uf: entrada ? d.ufOrigem : d.ufDestino,
            municipio: d.municipio,
            // Contribuinte sem IE conhecida fica marcado para revisão (a validação pede a inscrição).
            indicadorIe: d.contribuinte ? "Contribuinte" : "Não contribuinte",
          },
          "documentos",
        );
      }
      if (!entrada && (d.grupo === "faturamento" || d.grupo === "servicos")) {
        for (const it of d.itens ?? []) {
          const servico = it.tipo === "servico";
          addProduto(
            {
              descricao: it.descricao ?? "",
              tipo: servico ? "Serviço" : "Produto",
              ncm: servico ? undefined : it.ncm,
              cfopSaida: !servico && /^[567]\d{3}$/.test(it.cfop ?? "") ? it.cfop : undefined,
              cstIcms: servico ? undefined : it.cst,
              aliqIcms: servico ? undefined : it.aliqIcms,
              itemLc116: servico && /^\d{1,2}\.\d{2}$/.test(it.lc116 ?? "") ? it.lc116 : undefined,
              aliqIss: servico ? it.aliqIss : undefined,
              precoPadrao: it.unitario,
            },
            "documentos",
          );
        }
      }
    }
  }

  const papelPorSlug: Record<string, TipoParticipante> = {
    entradas: "Fornecedor", "servicos-tomados": "Fornecedor", manifestacao: "Fornecedor",
    saidas: "Cliente", "servicos-prestados": "Cliente", transporte: "Transportadora",
  };
  for (const [slug, docs] of Object.entries(fiscal)) {
    const tipo = papelPorSlug[slug];
    if (!tipo) continue;
    for (const d of docs ?? []) {
      if (d.cnpj) addParticipante({ documento: d.cnpj, nome: d.participante ?? "", tipo }, "documentos");
    }
  }

  for (const s of financeiro.servicos ?? []) {
    addProduto(
      {
        codigo: s.codigo,
        descricao: s.servico ?? "",
        tipo: "Serviço",
        unidade: s.unidade || "SV",
        itemLc116: /^\d{1,2}\.\d{2}$/.test(s.itemLc ?? "") ? s.itemLc : undefined,
        aliqIss: parseNumeroBR(s.iss) ?? undefined,
        precoPadrao: parseNumeroBR(s.valor) ?? undefined,
        situacao: s.situacao === "Inativo" ? "Inativo" : "Ativo",
        observacoes: s.observacao || undefined,
      },
      "servicos",
    );
  }

  return { participantes, produtos, documentosInvalidos, fontes };
}

/** Grava os candidatos levantados por `candidatosDeCadastrosAntigos`. */
export function importarCadastrosAntigos(c: CandidatosImportacao = candidatosDeCadastrosAntigos()) {
  // Códigos sequenciais recalculados para não colidir com o que foi cadastrado nesse meio-tempo.
  const participantes = listarParticipantes();
  const produtos = listarProdutos();
  const codigosPar = new Set(participantes.map((p) => p.codigo));
  const codigosPrd = new Set(produtos.map((p) => p.codigo.toLowerCase()));
  const novosPar = c.participantes
    .filter((p) => !participantePorDocumento(p.documento, participantes))
    .map((p) => {
      if (!codigosPar.has(p.codigo)) {
        codigosPar.add(p.codigo);
        return p;
      }
      const codigo = proximoCodigo([...codigosPar].map((x) => ({ codigo: x })));
      codigosPar.add(codigo);
      return { ...p, codigo };
    });
  const novosPrd = c.produtos.map((p) => {
    if (!codigosPrd.has(p.codigo.toLowerCase())) {
      codigosPrd.add(p.codigo.toLowerCase());
      return p;
    }
    const codigo = proximoCodigo([...codigosPrd].map((x) => ({ codigo: x })));
    codigosPrd.add(codigo);
    return { ...p, codigo };
  });
  colecaoParticipantes.salvarVarios(novosPar);
  colecaoProdutos.salvarVarios(novosPrd);
  return { participantes: novosPar.length, produtos: novosPrd.length };
}

/** Pendências de cadastro (usadas pela validação do fechamento e pelos indicadores das telas). */
export function pendenciasDeCadastro() {
  const participantes = listarParticipantes().filter((p) => p.situacao === "Ativo");
  const produtos = listarProdutos().filter((p) => p.situacao === "Ativo");
  return {
    participantesInvalidos: participantes.filter((p) => validarParticipante(p, participantes).length > 0),
    produtosInvalidos: produtos.filter((p) => validarProduto(p, produtos).length > 0),
  };
}
