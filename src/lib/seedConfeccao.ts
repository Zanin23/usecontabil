/**
 * População da base de demonstração de uma indústria de confecção
 * (Simples Nacional — CNAE 1412-6/01, fabricação de peças de vestuário).
 *
 * Todos os dados são internos/visuais, sem qualquer integração com a Receita.
 * Roda uma única vez por empresa (guarda em localStorage).
 */
import { COMPETENCIAS } from "@/lib/competencia";
import { saveRegistro, loadRegistros, type Colecao, type Registro } from "@/lib/empresaDadosStore";
import {
  empresaDB, novoId, processarDocumento, registrarAuditoria,
  salvarDocumento, salvarParceiro, salvarProduto,
  type DocStatus, type DocumentoFiscal, type Parceiro, type Produto, type UF,
} from "@/lib/tributarioStore";

const GUARDA = "usecontabil.seed.confeccao.v2";

/* --------------------------------- produtos -------------------------------- */

type Base = { codigo: string; descricao: string; ncm: string; grupo: string; preco: number; unidade: string };

const CATALOGO: Base[] = [
  { codigo: "CAM-001", descricao: "Camiseta malha algodão 30.1 — masculina", ncm: "61091000", grupo: "Malharia", preco: 34.9, unidade: "PC" },
  { codigo: "CAM-002", descricao: "Camiseta malha algodão 30.1 — feminina", ncm: "61091000", grupo: "Malharia", preco: 36.5, unidade: "PC" },
  { codigo: "CAL-010", descricao: "Calça jeans masculina 14oz", ncm: "62034200", grupo: "Jeanswear", preco: 89.9, unidade: "PC" },
  { codigo: "CAL-011", descricao: "Calça jeans feminina skinny", ncm: "62046200", grupo: "Jeanswear", preco: 94.9, unidade: "PC" },
  { codigo: "MOL-020", descricao: "Moletom flanelado com capuz", ncm: "61103000", grupo: "Inverno", preco: 118.0, unidade: "PC" },
  { codigo: "BER-030", descricao: "Bermuda sarja masculina", ncm: "62034900", grupo: "Sarja", preco: 62.0, unidade: "PC" },
  { codigo: "VES-040", descricao: "Vestido viscose estampado", ncm: "62044400", grupo: "Feminino", preco: 129.9, unidade: "PC" },
  { codigo: "UNI-050", descricao: "Camisa polo uniforme corporativo", ncm: "61051000", grupo: "Uniformes", preco: 58.0, unidade: "PC" },
];

const INSUMOS: Base[] = [
  { codigo: "TEC-100", descricao: "Malha PV 67/33 — rolo 25kg", ncm: "60063200", grupo: "Tecidos", preco: 780.0, unidade: "RL" },
  { codigo: "TEC-101", descricao: "Tecido jeans índigo 14oz — rolo", ncm: "52094200", grupo: "Tecidos", preco: 1240.0, unidade: "RL" },
  { codigo: "AVI-200", descricao: "Aviamentos (linha, zíper, botão) — kit", ncm: "96071100", grupo: "Aviamentos", preco: 410.0, unidade: "CX" },
  { codigo: "EMB-300", descricao: "Embalagem plástica personalizada — milheiro", ncm: "39232190", grupo: "Embalagem", preco: 220.0, unidade: "MI" },
];

function produtos(): Produto[] {
  const venda = CATALOGO.map<Produto>((b, i) => ({
    id: novoId("prd"), codigo: b.codigo, descricao: b.descricao, ncm: b.ncm, cest: "",
    gtin: `789${(4100000000 + i).toString().padStart(10, "0")}`,
    origem: "0", cfopPadrao: "5101", cstIcms: "", csosn: "101",
    aliqIcms: 0, aliqIpi: 0, aliqPis: 0, aliqCofins: 0,
    unidade: b.unidade, peso: 0.3, grupo: b.grupo, marca: "Zanin Confecções",
    fabricante: "41.703.214 HELIO ZANIN NETO", precoPadrao: b.preco, ativo: true,
  }));
  const insumo = INSUMOS.map<Produto>((b) => ({
    id: novoId("prd"), codigo: b.codigo, descricao: b.descricao, ncm: b.ncm, cest: "",
    origem: "0", cfopPadrao: "1101", cstIcms: "", csosn: "102",
    aliqIcms: 0, aliqIpi: 0, aliqPis: 0, aliqCofins: 0,
    unidade: b.unidade, grupo: b.grupo, precoPadrao: b.preco, ativo: true,
  }));
  return [...venda, ...insumo];
}

/* -------------------------------- parceiros -------------------------------- */

const CLIENTES: { nome: string; doc: string; uf: UF; municipio: string; ie?: string; contribuinte: boolean; consumidorFinal: boolean; regime: string; crt: string }[] = [
  { nome: "Lojas Vestir Bem Ltda.", doc: "18.442.910/0001-52", uf: "PR", municipio: "Londrina", ie: "9052144870", contribuinte: true, consumidorFinal: false, regime: "Lucro Presumido", crt: "3" },
  { nome: "Moda Sul Distribuidora Ltda.", doc: "23.771.605/0001-11", uf: "SC", municipio: "Blumenau", ie: "2557712340", contribuinte: true, consumidorFinal: false, regime: "Lucro Real", crt: "3" },
  { nome: "Boutique Aurora ME", doc: "31.884.220/0001-70", uf: "SP", municipio: "São Paulo", ie: "ISENTO", contribuinte: false, consumidorFinal: false, regime: "Simples Nacional", crt: "1" },
  { nome: "Uniformes Paraná Eireli", doc: "27.115.998/0001-04", uf: "PR", municipio: "Maringá", ie: "9033118820", contribuinte: true, consumidorFinal: false, regime: "Simples Nacional", crt: "1" },
  { nome: "Camila Ferreira (consumidora final)", doc: "084.552.310-45", uf: "PR", municipio: "Apucarana", contribuinte: false, consumidorFinal: true, regime: "Pessoa física", crt: "—" },
];

const FORNECEDORES: { nome: string; doc: string; uf: UF; municipio: string; ie: string; regime: string; crt: string }[] = [
  { nome: "Malharia Cianorte S.A.", doc: "76.221.043/0001-88", uf: "PR", municipio: "Cianorte", ie: "9011223344", regime: "Lucro Real", crt: "3" },
  { nome: "Têxtil Índigo Nordeste Ltda.", doc: "12.554.881/0001-29", uf: "CE", municipio: "Fortaleza", ie: "0655412300", regime: "Lucro Presumido", crt: "3" },
  { nome: "Aviamentos Bandeirantes Ltda.", doc: "45.902.117/0001-63", uf: "SP", municipio: "Americana", ie: "1109934470", regime: "Simples Nacional", crt: "1" },
  { nome: "Transportes Litoral Ltda.", doc: "45.678.912/0001-33", uf: "PR", municipio: "Apucarana", ie: "9088776655", regime: "Lucro Presumido", crt: "3" },
];

function parceiros(): Parceiro[] {
  return [
    ...CLIENTES.map<Parceiro>((c) => ({
      id: novoId("par"), tipo: "Cliente", nome: c.nome, documento: c.doc, ie: c.ie,
      crt: c.crt, regime: c.regime, uf: c.uf, municipio: c.municipio,
      contribuinte: c.contribuinte, consumidorFinal: c.consumidorFinal,
      retencoes: "Nenhuma", limiteCredito: c.consumidorFinal ? undefined : 120000,
      responsavel: "Comercial", ativo: true,
    })),
    ...FORNECEDORES.map<Parceiro>((f) => ({
      id: novoId("par"), tipo: "Fornecedor", nome: f.nome, documento: f.doc, ie: f.ie,
      crt: f.crt, regime: f.regime, uf: f.uf, municipio: f.municipio,
      contribuinte: true, consumidorFinal: false, retencoes: "Nenhuma",
      responsavel: "Suprimentos", ativo: true,
    })),
  ];
}

/* -------------------------------- documentos ------------------------------- */

function documentos(empresaId: string): DocumentoFiscal[] {
  const base = {
    empresaId, ufOrigem: "PR" as UF, regime: "Simples Nacional",
    status: "Autorizado" as DocStatus, eventos: [], alertas: [], regrasAplicadas: [],
    memoria: [], tributos: { icms: 0, icmsSt: 0, difal: 0, fcp: 0, ipi: 0, pis: 0, cofins: 0, iss: 0, irrf: 0, inss: 0, csll: 0, retencoes: 0, total: 0 },
  };

  const docs: DocumentoFiscal[] = [];
  let numero = 4820;
  let numeroEntrada = 9310;

  COMPETENCIAS.forEach((competencia, ci) => {
    // sazonalidade: inverno (mai–jul) vende mais moletom
    const fator = 1 + ci * 0.06;

    CLIENTES.forEach((cli, i) => {
      const prod = CATALOGO[(ci + i) % CATALOGO.length];
      const prod2 = CATALOGO[(ci + i + 3) % CATALOGO.length];
      const qtd = cli.consumidorFinal ? 6 : Math.round((120 + i * 45) * fator);
      const qtd2 = cli.consumidorFinal ? 3 : Math.round((80 + i * 25) * fator);
      const interestadual = cli.uf !== "PR";
      const cfop = interestadual ? "6101" : "5101";
      const itens = [
        { id: novoId("it"), descricao: prod.descricao, tipo: "produto" as const, quantidade: qtd, unitario: prod.preco, ncm: prod.ncm, cfop, cst: "101" },
        { id: novoId("it"), descricao: prod2.descricao, tipo: "produto" as const, quantidade: qtd2, unitario: prod2.preco, ncm: prod2.ncm, cfop, cst: "101" },
      ];
      const total = itens.reduce((s, it) => s + it.quantidade * it.unitario, 0);
      numero += 1;
      docs.push({
        ...base, competencia, id: novoId("doc"), grupo: "faturamento",
        tipo: cli.consumidorFinal ? "NFC-e" : "NF-e",
        numero: String(numero), serie: "1",
        emissao: `${competencia}-${String(4 + i * 5).padStart(2, "0")}`,
        participante: cli.nome, participanteDoc: cli.doc,
        ufDestino: cli.uf, municipio: cli.municipio,
        contribuinte: cli.contribuinte, consumidorFinal: cli.consumidorFinal,
        itens, valorProdutos: total, valorTotal: total,
      } as DocumentoFiscal);
    });

    // compras de insumos (entradas)
    FORNECEDORES.slice(0, 3).forEach((f, i) => {
      const ins = INSUMOS[(ci + i) % INSUMOS.length];
      const qtd = 4 + i * 2;
      const total = qtd * ins.preco;
      numeroEntrada += 1;
      docs.push({
        ...base, competencia, id: novoId("doc"), grupo: "demais", tipo: "Nota de entrada",
        numero: String(numeroEntrada), serie: "1",
        emissao: `${competencia}-${String(3 + i * 4).padStart(2, "0")}`,
        participante: f.nome, participanteDoc: f.doc,
        ufDestino: "PR", municipio: f.municipio, contribuinte: true, consumidorFinal: false,
        itens: [{ id: novoId("it"), descricao: ins.descricao, tipo: "produto", quantidade: qtd, unitario: ins.preco, ncm: ins.ncm, cfop: f.uf === "PR" ? "1101" : "2101", cst: "102" }],
        valorProdutos: total, valorTotal: total,
      } as DocumentoFiscal);
    });

    // frete sobre vendas
    numeroEntrada += 1;
    docs.push({
      ...base, competencia, id: novoId("doc"), grupo: "demais", tipo: "CT-e",
      numero: String(numeroEntrada), serie: "1",
      emissao: `${competencia}-26`,
      participante: "Transportes Litoral Ltda.", participanteDoc: "45.678.912/0001-33",
      ufDestino: "PR", municipio: "Apucarana", contribuinte: true, consumidorFinal: false,
      itens: [{ id: novoId("it"), descricao: "Frete rodoviário sobre vendas — CIF", tipo: "servico", quantidade: 1, unitario: 2450 + ci * 130, aliqIss: 0 }],
      valorProdutos: 2450 + ci * 130, valorTotal: 2450 + ci * 130,
    } as DocumentoFiscal);

    // serviço de facção (industrialização por encomenda)
    numero += 1;
    docs.push({
      ...base, competencia, id: novoId("doc"), grupo: "servicos", tipo: "NFS-e",
      numero: String(numero), serie: "A",
      emissao: `${competencia}-24`,
      participante: "Moda Sul Distribuidora Ltda.", participanteDoc: "23.771.605/0001-11",
      ufDestino: "SC", municipio: "Apucarana", contribuinte: false, consumidorFinal: false,
      itens: [{ id: novoId("it"), descricao: "Facção — costura de peças por encomenda", tipo: "servico", quantidade: 1, unitario: 18500 + ci * 900, lc116: "14.05", aliqIss: 3 }],
      valorProdutos: 18500 + ci * 900, valorTotal: 18500 + ci * 900,
    } as DocumentoFiscal);
  });

  return docs;
}

/* --------------------------- cadastros da empresa -------------------------- */

function cadastrosEmpresa(empresaId: string) {
  const add = (colecao: Colecao, prefixo: string, dados: Record<string, string>[]) => {
    const existentes = loadRegistros(colecao, empresaId);
    dados.forEach((d) => {
      const chave = Object.values(d)[1] ?? "";
      if (existentes.some((r) => Object.values(r).includes(chave))) return;
      saveRegistro(colecao, { ...d, id: novoId(prefixo), empresaId } as Registro);
    });
  };

  add("inscricoes", "INS", [
    { tipo: "CNPJ", orgao: "Receita Federal", numero: "41.703.214/0001-01", uf: "PR", inicio: "2021-04-26", situacao: "Ativa", observacao: "CNAE principal 1412-6/01 — confecção de peças de vestuário." },
    { tipo: "Inscrição Estadual", orgao: "SEFAZ/PR", numero: "9075541230", uf: "PR", inicio: "2021-05-10", situacao: "Ativa", observacao: "Contribuinte de ICMS — indústria de confecção." },
    { tipo: "Inscrição Municipal", orgao: "Prefeitura de Apucarana", numero: "114520", uf: "PR", inicio: "2021-05-12", situacao: "Ativa", observacao: "Habilitada para emissão de NFS-e de facção (LC 116, item 14.05)." },
    { tipo: "CEI/CNO", orgao: "Receita Federal", numero: "—", uf: "PR", situacao: "Não se aplica", observacao: "Sem obra própria em andamento." },
  ]);

  add("pagamentos", "PAG", [
    { banco: "Banco do Brasil", tipo: "Corrente PJ", agencia: "1483-2", conta: "24.551-9", chavePix: "41.703.214/0001-01", situacao: "Ativa", observacao: "Conta operacional — recebimento de clientes." },
    { banco: "Sicredi", tipo: "Pagamento de tributos", agencia: "0721", conta: "18.330-4", chavePix: "", situacao: "Ativa", observacao: "Débito do DAS e demais guias." },
    { banco: "Caixa Econômica Federal", tipo: "FGTS convênio", agencia: "0369", conta: "003-77120-5", chavePix: "", situacao: "Ativa", observacao: "Recolhimento de FGTS da produção." },
  ]);

  add("parametros", "PAR", [
    { grupo: "Fiscal", parametro: "Regime tributário", valor: "Simples Nacional — Anexo II (indústria)", vigencia: "2026-01-01", responsavel: "Contabilidade" },
    { grupo: "Fiscal", parametro: "CSOSN padrão de saída", valor: "101 — tributada com permissão de crédito de ICMS", vigencia: "2026-01-01", responsavel: "Fiscal" },
    { grupo: "Fiscal", parametro: "Layout NF-e", valor: "4.00 — série 1 (indústria) e série 2 (NFC-e)", vigencia: "2026-01-01", responsavel: "TI" },
    { grupo: "Fiscal", parametro: "Fator R", valor: "Não aplicável — receita industrial no Anexo II", vigencia: "2026-01-01", responsavel: "Contabilidade" },
    { grupo: "Contábil", parametro: "Critério de estoque", valor: "Custo médio ponderado móvel", vigencia: "2026-01-01", responsavel: "Controladoria" },
    { grupo: "Contábil", parametro: "Prazo de fechamento mensal", valor: "Até o dia 15 do mês seguinte", vigencia: "2026-01-01", responsavel: "Controladoria" },
    { grupo: "Financeiro", parametro: "Vencimento do DAS", valor: "Dia 20 do mês seguinte à competência", vigencia: "2026-01-01", responsavel: "Financeiro" },
    { grupo: "Sistema", parametro: "Certificado digital padrão", valor: "A1 da matriz — Apucarana/PR", vigencia: "2026-01-01", responsavel: "TI" },
  ]);

  add("certificados", "CRT", [
    { titular: "41.703.214 HELIO ZANIN NETO:41703214000101", tipo: "A1", ac: "AC Certisign RFB G5", emissao: "2026-01-15", validade: "2027-01-15", uso: "NF-e · NFC-e · NFS-e · e-CAC · DCTFWeb", situacao: "Ativo", observacao: "Instalado no servidor de emissão da fábrica." },
    { titular: "HELIO ZANIN NETO:08455231045", tipo: "A3", ac: "AC Serasa RFB", emissao: "2025-08-01", validade: "2026-08-01", uso: "Procuração e-CAC · Gov.br", situacao: "A vencer", observacao: "Renovar 30 dias antes do vencimento." },
  ]);
}

/* --------------------------------- execução -------------------------------- */

export function popularBaseConfeccao(empresaId: string) {
  cadastrosEmpresa(empresaId);

  const db = empresaDB(empresaId);
  if (db.produtos.length === 0 && db.parceiros.length === 0 && db.documentos.length === 0) {
    const prods = produtos();
    const pars = parceiros();
    const docs = documentos(empresaId).map((d) => processarDocumento(d, empresaId));
    prods.forEach((p) => salvarProduto(empresaId, p));
    pars.forEach((p) => salvarParceiro(empresaId, p));
    docs.forEach((d) => salvarDocumento(empresaId, d, "Documento importado (base inicial)"));
    registrarAuditoria(empresaId, {
      competencia: COMPETENCIAS[COMPETENCIAS.length - 1],
      origem: "Base inicial",
      acao: "Base de confecção (Simples Nacional) populada",
      detalhe: `${prods.length} produtos, ${pars.length} parceiros, ${docs.length} documentos`,
    });
  }
}

export function popularBaseConfeccaoUmaVez(empresaId?: string | null) {
  if (!empresaId) return;
  const chave = `${GUARDA}:${empresaId}`;
  if (localStorage.getItem(chave)) return;
  try {
    popularBaseConfeccao(empresaId);
    localStorage.setItem(chave, new Date().toISOString());
  } catch {
    /* seed é best-effort */
  }
}
