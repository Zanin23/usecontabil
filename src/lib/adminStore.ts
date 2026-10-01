// ============================================================================
// Administrativo — Cadastros Analíticos (READ ONLY)
// ----------------------------------------------------------------------------
// Este módulo NÃO cadastra nada. Todos os registros chegam por sincronização
// de APIs do ERP principal (aqui simulada de forma determinística/visual).
// A camada abaixo entrega: banco de leitura, indicadores, relatórios,
// motor de auditoria cadastral, pesquisa global, log de acessos e exportações.
// Nenhuma escrita é exposta: não há create/update/delete.
// ============================================================================
import { useEffect, useMemo, useState } from "react";
import { cnpjValido, cpfValido, documentoValido } from "./documentos";
import { getStorageSuffix } from "./praticaStore";

export const ORIGEM_ERP = "ERP Principal · Protheus/Sync";
export const READ_ONLY_MSG =
  "Cadastro somente leitura. Ainda não há integração com um ERP: estes dados são de exemplo.";

const ACESSO_KEY_BASE = "usecontabil.admin.acessos.v1";
/** Chave no modo atual: o modo prática grava com o sufixo `.pratica`. */
const ACESSO_KEY = () => ACESSO_KEY_BASE + getStorageSuffix();
export const ADMIN_EVENT = "usecontabil:admin-changed";

/* ============================== tipos =================================== */

export type DominioSlug =
  | "clientes"
  | "fornecedores"
  | "produtos-servicos"
  | "bancos"
  | "plano-gerencial"
  | "condicoes-pagamento";

export type Registro = Record<string, string | number | boolean | null>;

export type Campo = {
  key: string;
  label: string;
  grupo: string;
  tipo?: "texto" | "numero" | "moeda" | "data" | "status";
};

export type Relatorio = {
  slug: string;
  titulo: string;
  desc: string;
  filtro: (r: Registro) => boolean;
  agrupar?: string;
};

export type Criticidade = "Crítica" | "Alta" | "Média" | "Baixa";

export type RegraAuditoria = {
  slug: string;
  titulo: string;
  criticidade: Criticidade;
  campo: string;
  sugestao: string;
  teste: (r: Registro, todos: Registro[]) => boolean;
};

export type Achado = {
  id: string;
  dominio: DominioSlug;
  dominioTitulo: string;
  regra: string;
  titulo: string;
  criticidade: Criticidade;
  campo: string;
  sugestao: string;
  cadastro: string;
  chave: string;
  origem: string;
};

export type Dominio = {
  slug: DominioSlug;
  titulo: string;
  desc: string;
  chave: string;
  rotulo: string;
  campos: Campo[];
  colunas: string[];
  facetas: { key: string; label: string }[];
  relatorios: Relatorio[];
  regras: RegraAuditoria[];
  registros: Registro[];
  sincronizadoEm: string;
  sistemaOrigem: string;
};

/* ============================ helpers ==================================== */

const pick = <T,>(arr: T[], i: number) => arr[i % arr.length];
export const brl = (n: number) =>
  "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const num = (n: number) => n.toLocaleString("pt-BR");

/** gerador pseudo-aleatório determinístico */
function rnd(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const digitos = (v: unknown) => String(v ?? "").replace(/\D/g, "");

export { cnpjValido, cpfValido, documentoValido };

export function gtinValido(v: unknown) {
  const c = digitos(v);
  if (![8, 12, 13, 14].includes(c.length)) return false;
  const rev = c.split("").reverse().map(Number);
  const soma = rev.slice(1).reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (soma % 10)) % 10 === rev[0];
}

const emailValido = (v: unknown) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(v ?? ""));

/* ========================= dados sincronizados =========================== */

const UFS = ["SP", "RS", "PE", "PR", "MG", "SC", "BA", "GO", "RJ", "CE"];
const CIDADES: Record<string, string> = {
  SP: "São Paulo", RS: "Caxias do Sul", PE: "Recife", PR: "Curitiba", MG: "Belo Horizonte",
  SC: "Joinville", BA: "Salvador", GO: "Goiânia", RJ: "Rio de Janeiro", CE: "Fortaleza",
};
const SEGMENTOS = ["Indústria", "Varejo", "Atacado", "Serviços", "Construção", "Agronegócio", "Tecnologia"];
const REGIMES = ["Simples Nacional", "Lucro Presumido", "Lucro Real", "MEI", "Imune/Isento"];
const VENDEDORES = ["Marina Costa", "Rafael Prado", "Sônia Vieira", "Tiago Almeida", "Karina Duarte"];
const CENTROS = ["Comercial-SP", "Comercial-RS", "Industrial", "Serviços", "Exportação"];
const GRUPOS_ECON = ["Grupo Andrade", "Grupo Litoral", "Independente", "Grupo Norte", "Grupo Andes"];
const RAZOES = [
  "Metalúrgica Andrade S.A.", "Panificadora Real Ltda.", "TechCore Sistemas ME",
  "Transportes Litoral Ltda.", "Comércio Andes Eireli", "Distribuidora Norte Ltda.",
  "Indústria Vale Verde Ltda.", "Atacadão Serrano S.A.", "Construtora Pilar Ltda.",
  "AgroCampo Insumos Ltda.", "Nordeste Alimentos S.A.", "Óptica Visão Clara ME",
  "Logística Prime Ltda.", "Química Bandeirante S.A.", "Papelaria Central Ltda.",
  "Editora Horizonte Ltda.", "Clínica Vida Plena ME", "Auto Peças Rota Sul Ltda.",
];
const PESSOAS = [
  "Aline Bezerra", "Bruno Tavares", "Carla Mendes", "Diego Ramos", "Elisa Nogueira",
  "Fábio Prado", "Gabriela Reis", "Henrique Vilela",
];
const CNAES = ["25.11-0-00", "10.91-1-01", "62.01-5-01", "49.30-2-02", "46.49-4-99", "41.20-4-00", "01.11-3-01"];

/** monta CNPJ válido a partir de um número-base */
function mkCnpj(base: number) {
  const raiz = String(base).padStart(8, "0").slice(-8) + "0001";
  const calc = (b: string, pesos: number[]) => {
    const soma = b.split("").reduce((acc, d, i) => acc + Number(d) * pesos[i], 0);
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(raiz, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(raiz + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const c = `${raiz}${d1}${d2}`;
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}

function mkClientes(): Registro[] {
  const r = rnd(17);
  return Array.from({ length: 64 }, (_, i) => {
    const pj = i % 7 !== 3;
    const uf = pick(UFS, i);
    const invalido = i % 19 === 5;
    const status = i % 13 === 4 ? "Bloqueado" : i % 9 === 7 ? "Inativo" : "Ativo";
    const fat = Math.round(r() * 1_800_000);
    return {
      codigo: `C-${String(1000 + i * 3)}`,
      tipo: pj ? "Pessoa Jurídica" : "Pessoa Física",
      razao: pj ? pick(RAZOES, i) : pick(PESSOAS, i),
      fantasia: pj ? pick(RAZOES, i).split(" ").slice(0, 2).join(" ") : "",
      documento: pj ? (invalido ? "11.111.111/0001-11" : mkCnpj(11000000 + i * 371)) : `${String(100 + i)}.${String(200 + i)}.${String(300 + i)}-0${i % 9}`,
      ie: i % 6 === 2 ? "" : `${110 + i}.${String(400 + i)}.${String(500 + i)}`,
      im: i % 5 === 1 ? "" : String(90000 + i * 13),
      suframa: uf === "AM" ? "1234567" : i % 17 === 3 ? "8901234" : "",
      crt: pj ? pick(["1 - Simples Nacional", "3 - Regime Normal"], i) : "—",
      regime: i % 11 === 6 ? "" : pick(REGIMES, i),
      cnae: pick(CNAES, i),
      cadastro: `${String((i % 28) + 1).padStart(2, "0")}/${String((i % 12) + 1).padStart(2, "0")}/${2023 + (i % 4)}`,
      status,
      municipio: CIDADES[uf],
      uf,
      cep: i % 8 === 6 ? "" : `${String(10000 + i * 97).slice(0, 5)}-${String(100 + i).slice(0, 3)}`,
      endereco: i % 8 === 6 ? "" : `Rua ${pick(PESSOAS, i + 1).split(" ")[0]}, ${100 + i}`,
      responsavel: i % 10 === 8 ? "" : pick(PESSOAS, i + 2),
      email: i % 12 === 9 ? "contato@@erro" : `contato${i}@${pick(RAZOES, i).split(" ")[0].toLowerCase()}.com.br`,
      telefone: i % 14 === 11 ? "" : `(${11 + (i % 80)}) 9${String(8000 + i)}-${String(1000 + i)}`,
      segmento: pick(SEGMENTOS, i),
      limite: Math.round(r() * 300_000),
      vendedor: pick(VENDEDORES, i),
      centro: pick(CENTROS, i),
      grupo: pick(GRUPOS_ECON, i),
      faturamento: fat,
      inadimplente: i % 15 === 2,
      exportador: i % 16 === 4,
      isento: i % 6 === 2,
      ultimoMovimento: i % 7 === 5 ? "" : `${String((i % 28) + 1).padStart(2, "0")}/0${(i % 6) + 1}/2026`,
      sistemaOrigem: ORIGEM_ERP,
    };
  });
}

function mkFornecedores(): Registro[] {
  const r = rnd(29);
  const cat = ["Matéria-prima", "Serviços", "Transportadora", "Fabricante", "Importador", "Utilidades"];
  return Array.from({ length: 48 }, (_, i) => {
    const uf = pick(UFS, i + 2);
    return {
      codigo: `F-${String(2000 + i * 4)}`,
      razao: pick(RAZOES, i + 5),
      fantasia: pick(RAZOES, i + 5).split(" ")[0],
      documento: i % 21 === 7 ? "00.000.000/0001-00" : mkCnpj(22000000 + i * 517),
      ie: i % 9 === 3 ? "ISENTO" : i % 7 === 2 ? "" : `${210 + i}.${String(300 + i)}.${String(700 + i)}`,
      categoria: i % 23 === 6 ? "" : pick(cat, i),
      classificacao: i % 23 === 6 ? "" : pick(["A", "B", "C"], i),
      regime: pick(REGIMES, i + 1),
      cnae: pick(CNAES, i + 1),
      status: i % 11 === 5 ? "Bloqueado" : i % 8 === 6 ? "Inativo" : "Ativo",
      municipio: CIDADES[uf],
      uf,
      cep: `${String(20000 + i * 71).slice(0, 5)}-${String(200 + i).slice(0, 3)}`,
      endereco: i % 9 === 4 ? "" : `Av. Industrial, ${200 + i}`,
      condicao: pick(["À vista", "28 dias", "30/60/90", "45 dias"], i),
      contato: i % 10 === 3 ? "" : pick(PESSOAS, i),
      email: `compras${i}@fornecedor${i}.com.br`,
      telefone: i % 13 === 8 ? "" : `(${11 + (i % 80)}) 3${String(200 + i)}-${String(4000 + i)}`,
      compras: Math.round(r() * 900_000),
      pedidos: Math.round(r() * 180),
      ultimoMovimento: i % 6 === 4 ? "" : `${String((i % 28) + 1).padStart(2, "0")}/0${(i % 6) + 1}/2026`,
      sistemaOrigem: ORIGEM_ERP,
    };
  });
}

function mkProdutos(): Registro[] {
  const r = rnd(41);
  const grupos = ["Metalurgia", "Elétrica", "Hidráulica", "Embalagem", "Serviços", "Insumos"];
  const marcas = ["Bandeirante", "Vale Verde", "TechCore", "Serrano", "Genérico"];
  const ncms = ["8481.80.99", "7326.90.90", "3923.21.90", "8544.49.00", "2523.29.10", "4819.10.00"];
  return Array.from({ length: 72 }, (_, i) => {
    const servico = i % 8 === 7;
    const estoque = servico ? 0 : Math.round(r() * 900);
    return {
      codigo: servico ? `S-${2000 + i}` : `P-${1000 + i}`,
      descricao: servico
        ? pick(["Montagem industrial", "Manutenção preventiva", "Consultoria técnica", "Instalação elétrica"], i)
        : `${pick(["Válvula esfera", "Chapa aço", "Cabo flexível", "Filme stretch", "Conector", "Rolamento"], i)} ${1 + (i % 9)}/${2 + (i % 4)}"`,
      tipo: servico ? "Serviço" : "Produto",
      ncm: servico ? "14.01" : i % 17 === 3 ? "" : pick(ncms, i),
      ncmExpirado: !servico && i % 29 === 8,
      cest: servico ? "—" : i % 5 === 1 ? "" : `28.${String(10 + (i % 80))}.00`,
      gtin: servico ? "SEM GTIN" : i % 12 === 5 ? "7891234567890" : `789${String(1000000 + i * 7919)}${(i * 3) % 10}`,
      origem: pick(["0 - Nacional", "1 - Importação direta", "2 - Mercado interno importado"], i),
      unidade: servico ? "HR" : pick(["PC", "KG", "MT", "CX", "UN"], i),
      grupo: pick(grupos, i),
      marca: servico ? "—" : pick(marcas, i),
      preco: i % 23 === 9 ? 0 : Math.round(r() * 4000) / 2 + 10,
      cst: i % 14 === 6 ? "" : pick(["00", "20", "40", "60", "102"], i),
      tributacao: i % 14 === 6 ? "" : pick(["Tributado integralmente", "Isento", "Substituição tributária", "Monofásico"], i),
      fornecedor: pick(RAZOES, i + 5),
      categoria: pick(["Revenda", "Consumo", "Imobilizado", "Produção"], i),
      peso: servico ? 0 : Math.round(r() * 4000) / 100,
      estoque,
      vendas: Math.round(r() * 500),
      status: i % 10 === 9 ? "Inativo" : "Ativo",
      sistemaOrigem: ORIGEM_ERP,
    };
  });
}

function mkBancos(): Registro[] {
  const r = rnd(53);
  const bancos = ["Banco do Brasil", "Itaú Unibanco", "Santander", "Bradesco", "Caixa", "Sicredi", "BTG Pactual"];
  return Array.from({ length: 18 }, (_, i) => {
    const saldo = Math.round((r() - 0.15) * 800_000);
    const bloq = Math.round(r() * 20_000);
    return {
      codigo: `CTA-${100 + i}`,
      banco: pick(bancos, i),
      agencia: `${String(1000 + i * 37).slice(0, 4)}-${i % 10}`,
      conta: `${String(10000 + i * 811)}-${(i * 7) % 10}`,
      tipo: pick(["Conta corrente", "Conta corrente", "Aplicação CDB", "Conta pagamento", "Poupança"], i),
      saldo,
      disponivel: saldo - bloq,
      bloqueado: bloq,
      aplicacao: i % 4 === 2 ? Math.round(r() * 400_000) : 0,
      rentabilidade: i % 4 === 2 ? Math.round(r() * 130) / 100 : 0,
      carteira: pick(["17 - Cobrança simples", "09 - Simples", "—"], i),
      pix: i % 5 === 3 ? "" : `pix${i}@usecontabil.com.br`,
      convenio: i % 3 === 0 ? String(3000000 + i * 13) : "",
      status: i % 9 === 8 ? "Inativa" : "Ativa",
      ultimoMovimento: i % 6 === 5 ? "" : `${String((i % 28) + 1).padStart(2, "0")}/07/2026`,
      conciliacao: i % 7 === 4 ? Math.round(r() * 6000) : 0,
      sistemaOrigem: ORIGEM_ERP,
    };
  });
}

function mkPlano(): Registro[] {
  const r = rnd(67);
  const base = [
    ["1", "Ativo", "Ativo", 1, ""], ["1.1", "Ativo circulante", "Ativo", 2, "1"],
    ["1.1.01", "Caixa e equivalentes", "Ativo", 3, "1.1"], ["1.1.02", "Clientes a receber", "Ativo", 3, "1.1"],
    ["2", "Passivo", "Passivo", 1, ""], ["2.1", "Passivo circulante", "Passivo", 2, "2"],
    ["2.1.01", "Fornecedores", "Passivo", 3, "2.1"], ["2.1.02", "Obrigações tributárias", "Passivo", 3, "2.1"],
    ["3", "Receitas", "Receita", 1, ""], ["3.1", "Receita operacional", "Receita", 2, "3"],
    ["3.1.01", "Venda de mercadorias", "Receita", 3, "3.1"], ["3.1.02", "Prestação de serviços", "Receita", 3, "3.1"],
    ["4", "Custos e despesas", "Despesa", 1, ""], ["4.1", "Custos", "Custo", 2, "4"],
    ["4.1.01", "CMV", "Custo", 3, "4.1"], ["4.1.02", "Mão de obra direta", "Custo", 3, "4.1"],
    ["4.2", "Despesas operacionais", "Despesa", 2, "4"], ["4.2.01", "Despesas comerciais", "Despesa", 3, "4.2"],
    ["4.2.03", "Despesas administrativas", "Despesa", 3, "4.2"], ["4.2.05", "Despesas tributárias", "Despesa", 3, "4.2"],
    ["4.2.07", "Despesas financeiras", "Despesa", 3, "4.2"], ["5.9.01", "Conta órfã importada", "", 3, "5.9"],
    ["4.2.03", "Despesas administrativas (dup.)", "Despesa", 3, "4.2"],
  ] as const;
  return base.map((b, i) => ({
    conta: b[0],
    descricao: b[1],
    natureza: b[2],
    nivel: b[3],
    contaPai: b[4],
    grupo: String(b[0]).split(".")[0],
    subgrupo: String(b[0]).split(".").slice(0, 2).join("."),
    tipo: Number(b[3]) >= 3 ? "Analítica" : "Sintética",
    centroResultado: pick(CENTROS, i),
    lancamentos: Number(b[3]) >= 3 ? Math.round(r() * 400) : 0,
    status: i % 11 === 10 ? "Inativa" : "Ativa",
    sistemaOrigem: ORIGEM_ERP,
  }));
}

function mkCondicoes(): Registro[] {
  const r = rnd(83);
  const descr = ["À vista", "7 dias", "14 dias", "28 dias", "30/60", "30/60/90", "45/75/105", "Entrada + 3x", "60 dias", "Boleto 10x"];
  return descr.map((d, i) => {
    const parcelas = [1, 1, 1, 1, 2, 3, 3, 4, 1, 10][i];
    const prazo = [0, 7, 14, 28, 45, 60, 90, 60, 60, 300][i];
    return {
      codigo: `CP-${String(i + 1).padStart(2, "0")}`,
      descricao: d,
      parcelas,
      prazoMedio: prazo,
      entrada: i === 7 ? "Sim" : "Não",
      forma: pick(["PIX", "Boleto", "TED", "Cartão", "Depósito"], i),
      juros: i > 6 ? Math.round(r() * 300) / 100 : 0,
      desconto: i < 2 ? Math.round(r() * 500) / 100 : 0,
      multa: 2,
      utilizacao: Math.round(r() * 420),
      status: i === 9 ? "Inativa" : "Ativa",
      sistemaOrigem: ORIGEM_ERP,
    };
  });
}

/* ============================ domínios =================================== */

const campo = (key: string, label: string, grupo: string, tipo?: Campo["tipo"]): Campo =>
  ({ key, label, grupo, tipo });

const semMov = (r: Registro) => !r.ultimoMovimento;

export const DOMINIOS: Dominio[] = [
  {
    slug: "clientes",
    titulo: "Clientes",
    desc: "Consulta completa da carteira de clientes sincronizada do ERP.",
    chave: "codigo",
    rotulo: "razao",
    sincronizadoEm: "29/07/2026 06:15",
    sistemaOrigem: ORIGEM_ERP,
    colunas: ["codigo", "razao", "documento", "municipio", "uf", "regime", "status"],
    facetas: [
      { key: "status", label: "Situação" },
      { key: "uf", label: "UF" },
      { key: "segmento", label: "Segmento" },
      { key: "regime", label: "Regime tributário" },
      { key: "vendedor", label: "Vendedor" },
    ],
    campos: [
      campo("codigo", "Código", "Identificação"), campo("tipo", "Tipo de pessoa", "Identificação"),
      campo("razao", "Razão social / Nome", "Identificação"), campo("fantasia", "Nome fantasia", "Identificação"),
      campo("documento", "CNPJ / CPF", "Identificação"), campo("ie", "Inscrição estadual", "Fiscal"),
      campo("im", "Inscrição municipal", "Fiscal"), campo("suframa", "SUFRAMA", "Fiscal"),
      campo("crt", "CRT", "Fiscal"), campo("regime", "Regime tributário", "Fiscal"),
      campo("cnae", "CNAE principal", "Fiscal"), campo("cadastro", "Data de cadastro", "Identificação", "data"),
      campo("status", "Situação", "Identificação", "status"),
      campo("endereco", "Endereço", "Endereço"), campo("municipio", "Município", "Endereço"),
      campo("uf", "UF", "Endereço"), campo("cep", "CEP", "Endereço"),
      campo("responsavel", "Responsável", "Contato"), campo("email", "E-mail", "Contato"),
      campo("telefone", "Telefone", "Contato"),
      campo("segmento", "Segmento", "Comercial"), campo("limite", "Limite de crédito", "Comercial", "moeda"),
      campo("vendedor", "Vendedor", "Comercial"), campo("centro", "Centro de custo", "Comercial"),
      campo("grupo", "Grupo econômico", "Comercial"),
      campo("faturamento", "Faturamento 12m", "Histórico", "moeda"),
      campo("ultimoMovimento", "Último movimento", "Histórico", "data"),
      campo("sistemaOrigem", "Sistema de origem", "Sincronização"),
    ],
    relatorios: [
      { slug: "ativos", titulo: "Clientes ativos", desc: "Carteira em situação ativa.", filtro: (r) => r.status === "Ativo" },
      { slug: "inativos", titulo: "Clientes inativos", desc: "Sem atividade cadastral.", filtro: (r) => r.status === "Inativo" },
      { slug: "bloqueados", titulo: "Clientes bloqueados", desc: "Bloqueio comercial/financeiro.", filtro: (r) => r.status === "Bloqueado" },
      { slug: "por-uf", titulo: "Clientes por UF", desc: "Distribuição geográfica.", filtro: () => true, agrupar: "uf" },
      { slug: "por-cidade", titulo: "Clientes por cidade", desc: "Concentração municipal.", filtro: () => true, agrupar: "municipio" },
      { slug: "por-cnae", titulo: "Clientes por CNAE", desc: "Atividade econômica.", filtro: () => true, agrupar: "cnae" },
      { slug: "por-vendedor", titulo: "Clientes por vendedor", desc: "Carteira por responsável.", filtro: () => true, agrupar: "vendedor" },
      { slug: "sem-movimento", titulo: "Clientes sem movimentação", desc: "Sem faturamento no período.", filtro: semMov },
      { slug: "novos", titulo: "Clientes novos", desc: "Cadastrados a partir de 2026.", filtro: (r) => String(r.cadastro).endsWith("2026") },
      { slug: "inadimplentes", titulo: "Clientes inadimplentes", desc: "Títulos vencidos no financeiro.", filtro: (r) => r.inadimplente === true },
      { slug: "exportadores", titulo: "Clientes exportadores", desc: "Operações com o exterior.", filtro: (r) => r.exportador === true },
      { slug: "isentos", titulo: "Clientes isentos", desc: "Sem inscrição estadual / isentos.", filtro: (r) => r.isento === true },
      { slug: "por-regime", titulo: "Clientes por regime", desc: "Regime tributário informado.", filtro: () => true, agrupar: "regime" },
    ],
    regras: [
      { slug: "sem-ie", titulo: "Cliente sem inscrição estadual", criticidade: "Alta", campo: "ie", sugestao: "Informar IE ou marcar como isento no ERP.", teste: (r) => !r.ie && r.tipo === "Pessoa Jurídica" },
      { slug: "sem-im", titulo: "Cliente sem inscrição municipal", criticidade: "Baixa", campo: "im", sugestao: "Informar IM para emissão de NFS-e.", teste: (r) => !r.im },
      { slug: "endereco", titulo: "Endereço incompleto", criticidade: "Média", campo: "cep", sugestao: "Completar logradouro e CEP no ERP.", teste: (r) => !r.cep || !r.endereco },
      { slug: "duplicado", titulo: "Cadastro duplicado", criticidade: "Crítica", campo: "documento", sugestao: "Unificar cadastros no ERP de origem.", teste: (r, all) => all.filter((x) => x.documento === r.documento).length > 1 },
      { slug: "doc-invalido", titulo: "CNPJ/CPF inválido", criticidade: "Crítica", campo: "documento", sugestao: "Corrigir documento na origem.", teste: (r) => !documentoValido(r.documento) },
      { slug: "sem-responsavel", titulo: "Cliente sem responsável", criticidade: "Baixa", campo: "responsavel", sugestao: "Vincular responsável comercial.", teste: (r) => !r.responsavel },
      { slug: "sem-contato", titulo: "Contato inválido ou ausente", criticidade: "Média", campo: "email", sugestao: "Revisar e-mail e telefone.", teste: (r) => !r.telefone || !emailValido(r.email) },
      { slug: "sem-regime", titulo: "Sem regime tributário", criticidade: "Alta", campo: "regime", sugestao: "Definir regime para cálculo correto.", teste: (r) => !r.regime },
    ],
    registros: mkClientes(),
  },
  {
    slug: "fornecedores",
    titulo: "Fornecedores",
    desc: "Fornecedores, prestadores, transportadoras, fabricantes e importadores.",
    chave: "codigo",
    rotulo: "razao",
    sincronizadoEm: "29/07/2026 06:15",
    sistemaOrigem: ORIGEM_ERP,
    colunas: ["codigo", "razao", "documento", "categoria", "uf", "status"],
    facetas: [
      { key: "status", label: "Situação" }, { key: "uf", label: "UF" },
      { key: "categoria", label: "Categoria" }, { key: "regime", label: "Regime" },
    ],
    campos: [
      campo("codigo", "Código", "Identificação"), campo("razao", "Razão social", "Identificação"),
      campo("fantasia", "Nome fantasia", "Identificação"), campo("documento", "CNPJ", "Identificação"),
      campo("ie", "Inscrição estadual", "Fiscal"), campo("regime", "Regime tributário", "Fiscal"),
      campo("cnae", "CNAE", "Fiscal"), campo("categoria", "Categoria", "Comercial"),
      campo("classificacao", "Classificação", "Comercial"), campo("condicao", "Condição de pagamento", "Comercial"),
      campo("endereco", "Endereço", "Endereço"), campo("municipio", "Município", "Endereço"),
      campo("uf", "UF", "Endereço"), campo("cep", "CEP", "Endereço"),
      campo("contato", "Contato", "Contato"), campo("email", "E-mail", "Contato"),
      campo("telefone", "Telefone", "Contato"),
      campo("compras", "Compras 12m", "Histórico", "moeda"), campo("pedidos", "Pedidos 12m", "Histórico", "numero"),
      campo("ultimoMovimento", "Último movimento", "Histórico", "data"),
      campo("status", "Situação", "Identificação", "status"),
      campo("sistemaOrigem", "Sistema de origem", "Sincronização"),
    ],
    relatorios: [
      { slug: "por-uf", titulo: "Fornecedores por UF", desc: "Distribuição geográfica.", filtro: () => true, agrupar: "uf" },
      { slug: "por-cnae", titulo: "Fornecedores por CNAE", desc: "Atividade econômica.", filtro: () => true, agrupar: "cnae" },
      { slug: "por-categoria", titulo: "Fornecedores por categoria", desc: "Tipo de fornecimento.", filtro: () => true, agrupar: "categoria" },
      { slug: "sem-movimento", titulo: "Sem movimentação", desc: "Sem compras no período.", filtro: semMov },
      { slug: "mais-utilizados", titulo: "Mais utilizados", desc: "Maior volume de pedidos.", filtro: (r) => Number(r.pedidos) > 90 },
      { slug: "bloqueados", titulo: "Fornecedores bloqueados", desc: "Impedidos de operar.", filtro: (r) => r.status === "Bloqueado" },
    ],
    regras: [
      { slug: "doc-invalido", titulo: "CNPJ inválido", criticidade: "Crítica", campo: "documento", sugestao: "Corrigir CNPJ no ERP.", teste: (r) => !documentoValido(r.documento) },
      { slug: "ie", titulo: "IE inconsistente", criticidade: "Alta", campo: "ie", sugestao: "Informar IE ou marcar ISENTO.", teste: (r) => !r.ie },
      { slug: "duplicado", titulo: "Duplicidade de cadastro", criticidade: "Crítica", campo: "documento", sugestao: "Unificar no ERP de origem.", teste: (r, all) => all.filter((x) => x.documento === r.documento).length > 1 },
      { slug: "incompleto", titulo: "Cadastro incompleto", criticidade: "Média", campo: "endereco", sugestao: "Completar endereço e contato.", teste: (r) => !r.endereco || !r.telefone },
      { slug: "sem-classificacao", titulo: "Fornecedor sem classificação", criticidade: "Baixa", campo: "categoria", sugestao: "Classificar categoria e curva ABC.", teste: (r) => !r.categoria || !r.classificacao },
    ],
    registros: mkFornecedores(),
  },
  {
    slug: "produtos-servicos",
    titulo: "Produtos e serviços",
    desc: "Catálogo fiscal e comercial com NCM, CEST, GTIN e tributação.",
    chave: "codigo",
    rotulo: "descricao",
    sincronizadoEm: "29/07/2026 06:20",
    sistemaOrigem: ORIGEM_ERP,
    colunas: ["codigo", "descricao", "tipo", "ncm", "unidade", "preco", "status"],
    facetas: [
      { key: "tipo", label: "Tipo" }, { key: "grupo", label: "Grupo" },
      { key: "marca", label: "Marca" }, { key: "status", label: "Situação" },
      { key: "tributacao", label: "Tributação" },
    ],
    campos: [
      campo("codigo", "Código", "Identificação"), campo("descricao", "Descrição", "Identificação"),
      campo("tipo", "Tipo", "Identificação"), campo("ncm", "NCM / LC 116", "Fiscal"),
      campo("cest", "CEST", "Fiscal"), campo("gtin", "GTIN / EAN", "Fiscal"),
      campo("origem", "Origem", "Fiscal"), campo("cst", "CST/CSOSN", "Fiscal"),
      campo("tributacao", "Tributação", "Fiscal"),
      campo("unidade", "Unidade", "Comercial"), campo("grupo", "Grupo", "Comercial"),
      campo("marca", "Marca / Fabricante", "Comercial"), campo("preco", "Preço", "Comercial", "moeda"),
      campo("fornecedor", "Fornecedor principal", "Comercial"), campo("categoria", "Categoria", "Comercial"),
      campo("peso", "Peso (kg)", "Logística", "numero"), campo("estoque", "Estoque", "Logística", "numero"),
      campo("vendas", "Vendas 12m", "Histórico", "numero"), campo("status", "Situação", "Identificação", "status"),
      campo("sistemaOrigem", "Sistema de origem", "Sincronização"),
    ],
    relatorios: [
      { slug: "produtos", titulo: "Produtos", desc: "Itens de mercadoria.", filtro: (r) => r.tipo === "Produto" },
      { slug: "servicos", titulo: "Serviços", desc: "Itens de serviço (LC 116).", filtro: (r) => r.tipo === "Serviço" },
      { slug: "por-ncm", titulo: "Produtos por NCM", desc: "Agrupamento fiscal.", filtro: (r) => r.tipo === "Produto", agrupar: "ncm" },
      { slug: "por-cest", titulo: "Produtos por CEST", desc: "Itens sujeitos a ST.", filtro: (r) => r.tipo === "Produto", agrupar: "cest" },
      { slug: "por-fabricante", titulo: "Produtos por fabricante", desc: "Marca / fabricante.", filtro: (r) => r.tipo === "Produto", agrupar: "marca" },
      { slug: "por-grupo", titulo: "Produtos por grupo", desc: "Grupo mercadológico.", filtro: () => true, agrupar: "grupo" },
      { slug: "sem-movimento", titulo: "Sem movimentação", desc: "Sem vendas no período.", filtro: (r) => Number(r.vendas) === 0 },
      { slug: "inativos", titulo: "Produtos inativos", desc: "Fora de linha.", filtro: (r) => r.status === "Inativo" },
      { slug: "tributados", titulo: "Produtos tributados", desc: "Tributação integral.", filtro: (r) => r.tributacao === "Tributado integralmente" },
      { slug: "isentos", titulo: "Produtos isentos", desc: "Isentos ou não tributados.", filtro: (r) => r.tributacao === "Isento" },
    ],
    regras: [
      { slug: "sem-ncm", titulo: "Produto sem NCM", criticidade: "Crítica", campo: "ncm", sugestao: "Classificar NCM no cadastro do ERP.", teste: (r) => r.tipo === "Produto" && !r.ncm },
      { slug: "sem-cest", titulo: "Produto sem CEST", criticidade: "Média", campo: "cest", sugestao: "Informar CEST para itens de ST.", teste: (r) => r.tipo === "Produto" && !r.cest },
      { slug: "sem-cst", titulo: "Produto sem CST/CSOSN", criticidade: "Alta", campo: "cst", sugestao: "Definir CST conforme o regime.", teste: (r) => !r.cst },
      { slug: "sem-tributacao", titulo: "Produto sem tributação", criticidade: "Crítica", campo: "tributacao", sugestao: "Vincular perfil tributário.", teste: (r) => !r.tributacao },
      { slug: "gtin", titulo: "GTIN inválido", criticidade: "Média", campo: "gtin", sugestao: "Corrigir dígito verificador do GTIN.", teste: (r) => r.tipo === "Produto" && !gtinValido(r.gtin) },
      { slug: "ncm-expirado", titulo: "NCM expirado", criticidade: "Alta", campo: "ncm", sugestao: "Atualizar para NCM vigente na TIPI.", teste: (r) => r.ncmExpirado === true },
      { slug: "preco-zero", titulo: "Preço zerado", criticidade: "Média", campo: "preco", sugestao: "Revisar tabela de preços no ERP.", teste: (r) => Number(r.preco) === 0 && r.tipo === "Produto" },
      { slug: "descricao-dup", titulo: "Descrição duplicada", criticidade: "Baixa", campo: "descricao", sugestao: "Padronizar descrições no catálogo.", teste: (r, all) => all.filter((x) => x.descricao === r.descricao).length > 1 },
    ],
    registros: mkProdutos(),
  },
  {
    slug: "bancos",
    titulo: "Bancos e contas",
    desc: "Contas correntes, aplicações, carteiras, PIX e convênios.",
    chave: "codigo",
    rotulo: "banco",
    sincronizadoEm: "29/07/2026 06:05",
    sistemaOrigem: "ERP Principal · Módulo Tesouraria",
    colunas: ["codigo", "banco", "agencia", "conta", "tipo", "saldo", "status"],
    facetas: [{ key: "banco", label: "Banco" }, { key: "tipo", label: "Tipo" }, { key: "status", label: "Situação" }],
    campos: [
      campo("codigo", "Código", "Identificação"), campo("banco", "Banco", "Identificação"),
      campo("agencia", "Agência", "Identificação"), campo("conta", "Conta", "Identificação"),
      campo("tipo", "Tipo", "Identificação"), campo("status", "Situação", "Identificação", "status"),
      campo("saldo", "Saldo atual", "Saldos", "moeda"), campo("disponivel", "Saldo disponível", "Saldos", "moeda"),
      campo("bloqueado", "Saldo bloqueado", "Saldos", "moeda"), campo("aplicacao", "Aplicações", "Saldos", "moeda"),
      campo("rentabilidade", "Rentabilidade (% a.m.)", "Saldos", "numero"),
      campo("carteira", "Carteira", "Operacional"), campo("pix", "Chave PIX", "Operacional"),
      campo("convenio", "Convênio", "Operacional"), campo("conciliacao", "Diferença conciliação", "Operacional", "moeda"),
      campo("ultimoMovimento", "Último movimento", "Histórico", "data"),
      campo("sistemaOrigem", "Sistema de origem", "Sincronização"),
    ],
    relatorios: [
      { slug: "saldo-diario", titulo: "Saldo diário", desc: "Posição consolidada por conta.", filtro: () => true },
      { slug: "extrato", titulo: "Extrato sintético", desc: "Movimentação por conta.", filtro: (r) => !!r.ultimoMovimento },
      { slug: "aplicacoes", titulo: "Aplicações financeiras", desc: "Contas com aplicação.", filtro: (r) => Number(r.aplicacao) > 0 },
      { slug: "pix", titulo: "Chaves PIX", desc: "Contas com PIX cadastrado.", filtro: (r) => !!r.pix },
      { slug: "conciliacoes", titulo: "Conciliações pendentes", desc: "Diferenças em aberto.", filtro: (r) => Number(r.conciliacao) > 0 },
    ],
    regras: [
      { slug: "inativa", titulo: "Conta inativa", criticidade: "Baixa", campo: "status", sugestao: "Encerrar conta no ERP se não utilizada.", teste: (r) => r.status === "Inativa" },
      { slug: "sem-mov", titulo: "Conta sem movimentação", criticidade: "Média", campo: "ultimoMovimento", sugestao: "Avaliar encerramento ou reativação.", teste: semMov },
      { slug: "negativa", titulo: "Conta com saldo negativo", criticidade: "Alta", campo: "saldo", sugestao: "Verificar limite/cheque especial.", teste: (r) => Number(r.saldo) < 0 },
      { slug: "conciliacao", titulo: "Diferença de conciliação", criticidade: "Crítica", campo: "conciliacao", sugestao: "Conciliar extrato x razão no ERP.", teste: (r) => Number(r.conciliacao) > 0 },
    ],
    registros: mkBancos(),
  },
  {
    slug: "plano-gerencial",
    titulo: "Plano de contas gerencial",
    desc: "Estrutura gerencial hierárquica usada nos relatórios internos.",
    chave: "conta",
    rotulo: "descricao",
    sincronizadoEm: "28/07/2026 22:40",
    sistemaOrigem: "ERP Principal · Contabilidade",
    colunas: ["conta", "descricao", "natureza", "tipo", "nivel", "status"],
    facetas: [{ key: "natureza", label: "Natureza" }, { key: "tipo", label: "Tipo" }, { key: "grupo", label: "Grupo" }],
    campos: [
      campo("conta", "Código", "Identificação"), campo("descricao", "Descrição", "Identificação"),
      campo("natureza", "Natureza", "Classificação"), campo("grupo", "Grupo", "Classificação"),
      campo("subgrupo", "Subgrupo", "Classificação"), campo("nivel", "Nível", "Classificação", "numero"),
      campo("contaPai", "Conta pai", "Hierarquia"), campo("tipo", "Analítica / Sintética", "Hierarquia"),
      campo("centroResultado", "Centro de resultado", "Gerencial"),
      campo("lancamentos", "Lançamentos 12m", "Histórico", "numero"),
      campo("status", "Situação", "Identificação", "status"),
      campo("sistemaOrigem", "Sistema de origem", "Sincronização"),
    ],
    relatorios: [
      { slug: "completo", titulo: "Plano completo", desc: "Todas as contas.", filtro: () => true },
      { slug: "hierarquia", titulo: "Hierarquia", desc: "Contas por nível.", filtro: () => true, agrupar: "nivel" },
      { slug: "sem-uso", titulo: "Contas sem uso", desc: "Sem lançamentos no período.", filtro: (r) => Number(r.lancamentos) === 0 },
      { slug: "analiticas", titulo: "Contas analíticas", desc: "Contas de lançamento.", filtro: (r) => r.tipo === "Analítica" },
      { slug: "sinteticas", titulo: "Contas sintéticas", desc: "Contas totalizadoras.", filtro: (r) => r.tipo === "Sintética" },
      { slug: "centros", titulo: "Centros de resultado", desc: "Distribuição gerencial.", filtro: () => true, agrupar: "centroResultado" },
    ],
    regras: [
      { slug: "duplicado", titulo: "Conta duplicada", criticidade: "Crítica", campo: "conta", sugestao: "Eliminar duplicidade no plano do ERP.", teste: (r, all) => all.filter((x) => x.conta === r.conta).length > 1 },
      { slug: "hierarquia", titulo: "Hierarquia inválida", criticidade: "Alta", campo: "contaPai", sugestao: "Revisar nível x conta pai.", teste: (r) => Number(r.nivel) > 1 && !r.contaPai },
      { slug: "orfa", titulo: "Conta órfã", criticidade: "Alta", campo: "contaPai", sugestao: "Vincular a uma conta pai existente.", teste: (r, all) => !!r.contaPai && !all.some((x) => x.conta === r.contaPai) },
      { slug: "sem-classificacao", titulo: "Conta sem classificação", criticidade: "Média", campo: "natureza", sugestao: "Definir natureza contábil.", teste: (r) => !r.natureza },
    ],
    registros: mkPlano(),
  },
  {
    slug: "condicoes-pagamento",
    titulo: "Condições de pagamento",
    desc: "Prazos, parcelamentos, formas, juros e descontos praticados.",
    chave: "codigo",
    rotulo: "descricao",
    sincronizadoEm: "28/07/2026 22:40",
    sistemaOrigem: "ERP Principal · Comercial",
    colunas: ["codigo", "descricao", "parcelas", "prazoMedio", "forma", "utilizacao", "status"],
    facetas: [{ key: "forma", label: "Forma" }, { key: "status", label: "Situação" }],
    campos: [
      campo("codigo", "Código", "Identificação"), campo("descricao", "Descrição", "Identificação"),
      campo("parcelas", "Parcelas", "Condição", "numero"), campo("prazoMedio", "Prazo médio (dias)", "Condição", "numero"),
      campo("entrada", "Entrada", "Condição"), campo("forma", "Forma de pagamento", "Condição"),
      campo("juros", "Juros (%)", "Encargos", "numero"), campo("desconto", "Desconto (%)", "Encargos", "numero"),
      campo("multa", "Multa (%)", "Encargos", "numero"),
      campo("utilizacao", "Utilizações 12m", "Histórico", "numero"),
      campo("status", "Situação", "Identificação", "status"),
      campo("sistemaOrigem", "Sistema de origem", "Sincronização"),
    ],
    relatorios: [
      { slug: "por-prazo", titulo: "Por prazo", desc: "Ordenado por prazo médio.", filtro: () => true, agrupar: "prazoMedio" },
      { slug: "por-forma", titulo: "Por forma de pagamento", desc: "Meios aceitos.", filtro: () => true, agrupar: "forma" },
      { slug: "por-parcelas", titulo: "Por quantidade de parcelas", desc: "Parcelamento praticado.", filtro: () => true, agrupar: "parcelas" },
      { slug: "por-utilizacao", titulo: "Por utilização", desc: "Condições mais usadas.", filtro: (r) => Number(r.utilizacao) > 0 },
    ],
    regras: [
      { slug: "sem-uso", titulo: "Condição sem utilização", criticidade: "Baixa", campo: "utilizacao", sugestao: "Inativar condição no ERP.", teste: (r) => Number(r.utilizacao) === 0 },
      { slug: "parcelamento", titulo: "Parcelamento inconsistente", criticidade: "Média", campo: "parcelas", sugestao: "Prazo médio incompatível com parcelas.", teste: (r) => Number(r.parcelas) > 1 && Number(r.prazoMedio) < Number(r.parcelas) * 15 },
      { slug: "prazo", titulo: "Prazo inválido", criticidade: "Alta", campo: "prazoMedio", sugestao: "Prazo acima da política (180 dias).", teste: (r) => Number(r.prazoMedio) > 180 },
    ],
    registros: mkCondicoes(),
  },
];

export const DOMINIO_MAP = Object.fromEntries(DOMINIOS.map((d) => [d.slug, d])) as Record<DominioSlug, Dominio>;
export const getDominio = (slug?: string) => (slug ? DOMINIO_MAP[slug as DominioSlug] : undefined);

/* ============================ auditoria ================================== */

export const CRITICIDADES: Criticidade[] = ["Crítica", "Alta", "Média", "Baixa"];

export const CORES_CRIT: Record<Criticidade, string> = {
  "Crítica": "hsl(var(--destructive))",
  "Alta": "var(--brand-orange)",
  "Média": "var(--brand-purple)",
  "Baixa": "var(--brand-blue)",
};

export function auditarDominio(d: Dominio): Achado[] {
  const out: Achado[] = [];
  for (const reg of d.registros) {
    for (const regra of d.regras) {
      let falhou = false;
      try { falhou = regra.teste(reg, d.registros); } catch { falhou = false; }
      if (!falhou) continue;
      out.push({
        id: `${d.slug}:${reg[d.chave]}:${regra.slug}`,
        dominio: d.slug,
        dominioTitulo: d.titulo,
        regra: regra.slug,
        titulo: regra.titulo,
        criticidade: regra.criticidade,
        campo: regra.campo,
        sugestao: regra.sugestao,
        cadastro: String(reg[d.rotulo] ?? reg[d.chave]),
        chave: String(reg[d.chave]),
        origem: String(reg.sistemaOrigem ?? d.sistemaOrigem),
      });
    }
  }
  return out;
}

export function auditarTudo(): Achado[] {
  return DOMINIOS.flatMap(auditarDominio);
}

export function resumoCriticidade(achados: Achado[]) {
  return CRITICIDADES.map((c) => ({ nome: c, total: achados.filter((a) => a.criticidade === c).length }));
}

/** Índice de qualidade cadastral: 100 = nenhum achado ponderado. */
export function qualidadeCadastral(achados: Achado[], totalRegistros: number) {
  const peso: Record<Criticidade, number> = { "Crítica": 4, "Alta": 2.5, "Média": 1.2, "Baixa": 0.5 };
  const p = achados.reduce((acc, a) => acc + peso[a.criticidade], 0);
  const max = Math.max(totalRegistros, 1) * 2;
  return Math.max(0, Math.round(100 - (p / max) * 100));
}

/* ======================== agregações / indicadores ======================= */

export function agrupar(regs: Registro[], key: string) {
  const map = new Map<string, number>();
  for (const r of regs) {
    const k = String(r[key] ?? "").trim() || "— não informado";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total);
}

export function somaPor(regs: Registro[], key: string, valor: string, limite = 8) {
  const map = new Map<string, number>();
  for (const r of regs) {
    const k = String(r[key] ?? "").trim() || "— não informado";
    map.set(k, (map.get(k) ?? 0) + Number(r[valor] ?? 0));
  }
  return [...map.entries()]
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limite);
}

export function totalCampo(regs: Registro[], key: string) {
  return regs.reduce((acc, r) => acc + Number(r[key] ?? 0), 0);
}

/* =========================== pesquisa global ============================= */

export type ResultadoBusca = {
  dominio: DominioSlug;
  dominioTitulo: string;
  chave: string;
  titulo: string;
  subtitulo: string;
  registro: Registro;
};

export function pesquisaGlobal(termo: string, limitePorDominio = 8): ResultadoBusca[] {
  const t = termo.trim().toLowerCase();
  if (t.length < 2) return [];
  const digits = t.replace(/\D/g, "");
  const out: ResultadoBusca[] = [];
  for (const d of DOMINIOS) {
    let n = 0;
    for (const r of d.registros) {
      if (n >= limitePorDominio) break;
      const blob = Object.values(r).join(" ").toLowerCase();
      const hit = blob.includes(t) || (digits.length >= 3 && blob.replace(/\D/g, "").includes(digits));
      if (!hit) continue;
      n++;
      out.push({
        dominio: d.slug,
        dominioTitulo: d.titulo,
        chave: String(r[d.chave]),
        titulo: String(r[d.rotulo] ?? r[d.chave]),
        subtitulo: [r[d.chave], r.documento ?? r.ncm ?? r.conta ?? r.forma, r.status]
          .filter(Boolean).join(" · "),
        registro: r,
      });
    }
  }
  return out;
}

/* ============================ log de acessos ============================= */

export type Acesso = { id: string; em: string; usuario: string; recurso: string; acao: string };

const readAcessos = (): Acesso[] => {
  try { return JSON.parse(localStorage.getItem(ACESSO_KEY()) ?? "[]"); } catch { return []; }
};

export function registrarAcesso(recurso: string, acao = "Consulta") {
  const lista = readAcessos();
  lista.unshift({
    id: crypto.randomUUID(),
    em: new Date().toLocaleString("pt-BR"),
    usuario: "Usuário atual",
    recurso,
    acao,
  });
  localStorage.setItem(ACESSO_KEY(), JSON.stringify(lista.slice(0, 300)));
  window.dispatchEvent(new CustomEvent(ADMIN_EVENT));
}

export function useAcessos() {
  const [lista, setLista] = useState<Acesso[]>(readAcessos);
  useEffect(() => {
    const h = () => setLista(readAcessos());
    window.addEventListener(ADMIN_EVENT, h);
    return () => window.removeEventListener(ADMIN_EVENT, h);
  }, []);
  return lista;
}

/** registra o acesso uma vez ao abrir a tela */
export function useRegistrarAcesso(recurso: string) {
  useEffect(() => { registrarAcesso(recurso); }, [recurso]);
}

/* ============================= sincronização ============================= */

export type LogSync = {
  id: string;
  em: string;
  dominio: string;
  registros: number;
  novos: number;
  alterados: number;
  status: "Concluída" | "Concluída com avisos";
  duracao: string;
};

export const LOG_SYNC: LogSync[] = DOMINIOS.map((d, i) => ({
  id: d.slug,
  em: d.sincronizadoEm,
  dominio: d.titulo,
  registros: d.registros.length,
  novos: (i * 3) % 7,
  alterados: (i * 5) % 11,
  status: i % 4 === 1 ? "Concluída com avisos" : "Concluída",
  duracao: `${2 + i}s`,
}));

/* ============================== exportações ============================== */

export type Formato = "excel" | "csv" | "pdf" | "json" | "xml";
export const FORMATOS: { id: Formato; label: string }[] = [
  { id: "excel", label: "Excel (.xls)" },
  { id: "csv", label: "CSV" },
  { id: "pdf", label: "PDF" },
  { id: "json", label: "JSON" },
  { id: "xml", label: "XML" },
];

const baixar = (conteudo: string, nome: string, mime: string) => {
  const url = URL.createObjectURL(new Blob([conteudo], { type: `${mime};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
};

const escaparHtml = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function exportar(
  formato: Formato,
  nome: string,
  colunas: { key: string; label: string }[],
  linhas: Registro[],
) {
  const val = (r: Registro, k: string) => (r[k] === null || r[k] === undefined ? "" : String(r[k]));
  if (formato === "json") {
    baixar(JSON.stringify(linhas, null, 2), `${nome}.json`, "application/json");
  } else if (formato === "csv") {
    const head = colunas.map((c) => c.label).join(";");
    const body = linhas.map((r) => colunas.map((c) => `"${val(r, c.key).replace(/"/g, '""')}"`).join(";"));
    baixar([head, ...body].join("\n"), `${nome}.csv`, "text/csv");
  } else if (formato === "xml") {
    const body = linhas
      .map((r) => `  <registro>\n${colunas.map((c) => `    <${c.key}>${escaparHtml(val(r, c.key))}</${c.key}>`).join("\n")}\n  </registro>`)
      .join("\n");
    baixar(`<?xml version="1.0" encoding="UTF-8"?>\n<exportacao origem="${nome}">\n${body}\n</exportacao>`, `${nome}.xml`, "application/xml");
  } else {
    const tabela = `<table border="1"><thead><tr>${colunas.map((c) => `<th>${escaparHtml(c.label)}</th>`).join("")}</tr></thead><tbody>${linhas
      .map((r) => `<tr>${colunas.map((c) => `<td>${escaparHtml(val(r, c.key))}</td>`).join("")}</tr>`)
      .join("")}</tbody></table>`;
    if (formato === "excel") {
      baixar(`<html><meta charset="utf-8">${tabela}</html>`, `${nome}.xls`, "application/vnd.ms-excel");
    } else {
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(
          `<html><head><meta charset="utf-8"><title>${escaparHtml(nome)}</title>` +
          `<style>body{font-family:sans-serif;padding:24px}h1{font-size:18px}table{border-collapse:collapse;width:100%;font-size:11px}td,th{border:1px solid #ddd;padding:4px 6px;text-align:left}</style>` +
          `</head><body><h1>${escaparHtml(nome)}</h1><p>Use Contábil · exportação somente leitura · ${new Date().toLocaleString("pt-BR")}</p>${tabela}</body></html>`,
        );
        w.document.close();
        w.focus();
        w.print();
      }
    }
  }
  registrarAcesso(nome, `Exportação ${formato.toUpperCase()}`);
}

/* ======================== agendamento de exportações ===================== */

const AGENDA_KEY_BASE = "usecontabil.admin.agenda.v1";
const AGENDA_KEY = () => AGENDA_KEY_BASE + getStorageSuffix();
export type Agendamento = {
  id: string;
  nome: string;
  recurso: string;
  formato: Formato;
  frequencia: "Diária" | "Semanal" | "Mensal";
  destino: string;
  criadoEm: string;
};

const readAgenda = (): Agendamento[] => {
  try { return JSON.parse(localStorage.getItem(AGENDA_KEY()) ?? "[]"); } catch { return []; }
};

export function agendarExportacao(a: Omit<Agendamento, "id" | "criadoEm">) {
  const lista = readAgenda();
  lista.unshift({ ...a, id: crypto.randomUUID(), criadoEm: new Date().toLocaleString("pt-BR") });
  localStorage.setItem(AGENDA_KEY(), JSON.stringify(lista.slice(0, 50)));
  window.dispatchEvent(new CustomEvent(ADMIN_EVENT));
}

export function removerAgendamento(id: string) {
  localStorage.setItem(AGENDA_KEY(), JSON.stringify(readAgenda().filter((a) => a.id !== id)));
  window.dispatchEvent(new CustomEvent(ADMIN_EVENT));
}

export function useAgendamentos() {
  const [lista, setLista] = useState<Agendamento[]>(readAgenda);
  useEffect(() => {
    const h = () => setLista(readAgenda());
    window.addEventListener(ADMIN_EVENT, h);
    return () => window.removeEventListener(ADMIN_EVENT, h);
  }, []);
  return lista;
}

/* ============================== integrações ============================== */

export const INTEGRACOES = [
  { nome: "ERP Principal", tipo: "Origem", status: "Conectado", detalhe: "REST · sync 06:15" },
  { nome: "CRM", tipo: "Origem", status: "Conectado", detalhe: "Clientes e contatos" },
  { nome: "Financeiro", tipo: "Origem", status: "Conectado", detalhe: "Títulos e bancos" },
  { nome: "Fiscal", tipo: "Origem", status: "Conectado", detalhe: "NCM, CST e regimes" },
  { nome: "Contábil", tipo: "Origem", status: "Conectado", detalhe: "Plano gerencial" },
  { nome: "Data Warehouse", tipo: "Destino", status: "Publicando", detalhe: "Carga incremental diária" },
  { nome: "Power BI", tipo: "Destino", status: "Publicando", detalhe: "Dataset administrativo" },
  { nome: "Microsoft Fabric", tipo: "Destino", status: "Configurado", detalhe: "Lakehouse read-only" },
  { nome: "Apache Superset", tipo: "Destino", status: "Configurado", detalhe: "Views analíticas" },
  { nome: "Metabase", tipo: "Destino", status: "Configurado", detalhe: "Coleção cadastros" },
] as const;

/* ============================ hooks utilitários ========================== */

export function useDominioFiltrado(d: Dominio | undefined, busca: string, facetas: Record<string, string>) {
  return useMemo(() => {
    if (!d) return [];
    const t = busca.trim().toLowerCase();
    const digits = t.replace(/\D/g, "");
    return d.registros.filter((r) => {
      for (const [k, v] of Object.entries(facetas)) {
        if (v && v !== "todos" && String(r[k] ?? "") !== v) return false;
      }
      if (!t) return true;
      const blob = Object.values(r).join(" ").toLowerCase();
      return blob.includes(t) || (digits.length >= 3 && blob.replace(/\D/g, "").includes(digits));
    });
  }, [d, busca, facetas]);
}
