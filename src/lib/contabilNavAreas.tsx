import {
  Receipt, FileText, FileSpreadsheet, ScrollText, Percent, Scale, ClipboardCheck,
  Send, FileArchive, Database, Table2, Coins, Banknote, TrendingUp, Landmark,
  FileCog, Layers, ListChecks, Building2, Users2, Briefcase, ClipboardList,
  CalendarClock, FolderArchive, Lock, Cog, BadgeDollarSign, Wallet2, Split,
  PieChart, FileDown, FileUp, Truck, ShoppingCart, PackageSearch, KeyRound,
  History, Boxes, Radio, ListTree, HandCoins, Barcode, ShieldCheck, type LucideIcon,
} from "lucide-react";
import type { Category, Col, Module, Row } from "./contabilNav";

const brl = (v: number) =>
  "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMPRESAS = [
  "Metalúrgica Andrade S.A.", "Panificadora Real Ltda.", "TechCore Sistemas ME",
  "Transportes Litoral Ltda.", "Comércio Andes Eireli", "Distribuidora Norte Ltda.",
];
const pick = <T,>(arr: T[], i: number) => arr[i % arr.length];
const dt = (i: number) => `${String(28 - (i % 25)).padStart(2, "0")}/07/2026`;

const col = (key: string, label: string, opts: Partial<Col> = {}): Col => ({ key, label, ...opts });
const num = (key: string, label: string): Col => ({ key, label, align: "right", mono: true });

function mod(
  slug: string,
  title: string,
  icon: LucideIcon,
  desc: string,
  columns: Col[],
  rows: Row[],
  primaryAction?: string,
): Module {
  return { slug, title, icon, desc, columns, rows, primaryAction };
}

// tabela genérica de documentos fiscais
const docs = (prefix: string, tipo: string[], n = 6): Row[] =>
  Array.from({ length: n }, (_, i) => ({
    documento: `${prefix} ${String(10240 + i * 7)}`,
    data: dt(i),
    participante: pick(EMPRESAS, i),
    tipo: pick(tipo, i),
    valor: brl(1_400 + i * 1_237.4),
    status: i % 5 === 4 ? "Pendente" : "Escriturado",
  }));

const COLS_DOC: Col[] = [
  col("documento", "Documento", { mono: true }),
  col("data", "Data", { mono: true }),
  col("participante", "Participante"),
  col("tipo", "Tipo"),
  num("valor", "Valor"),
  col("status", "Status", { align: "center" }),
];

const COLS_OBRIG: Col[] = [
  col("obrigacao", "Obrigação"),
  col("competencia", "Competência", { mono: true }),
  col("prazo", "Prazo", { mono: true }),
  col("responsavel", "Responsável"),
  col("status", "Status", { align: "center" }),
];

const COLS_APUR: Col[] = [
  col("tributo", "Tributo"),
  num("base", "Base de cálculo"),
  num("debito", "Débitos"),
  num("credito", "Créditos"),
  num("apagar", "A recolher"),
  col("status", "Status", { align: "center" }),
];

// ------------------------------------------------------------
// FISCAL
// ------------------------------------------------------------
export const fiscal: Category[] = [
  {
    slug: "documentos",
    title: "Documentos fiscais",
    modules: [
      mod("entradas", "Notas de entrada", FileDown, "NF-e de compras e devoluções recebidas.", COLS_DOC, docs("NF-e", ["Compra", "Devolução", "Remessa", "Bonificação"]), "Importar XML"),
      mod("saidas", "Notas de saída", FileUp, "NF-e emitidas pelas empresas do grupo.", COLS_DOC, docs("NF-e", ["Venda", "Remessa", "Transferência", "Devolução"]), "Nova nota"),
      mod("servicos-tomados", "Serviços tomados", Receipt, "NFS-e recebidas com retenções na fonte.", COLS_DOC, docs("NFS-e", ["Consultoria", "Manutenção", "Transporte", "Locação"])),
      mod("servicos-prestados", "Serviços prestados", ScrollText, "NFS-e emitidas e ISS devido por município.", COLS_DOC, docs("NFS-e", ["Industrialização", "Assistência", "Projeto", "Locação"])),
      mod("transporte", "Conhecimentos de transporte", Truck, "CT-e e MDF-e vinculados às operações.", COLS_DOC, docs("CT-e", ["Rodoviário", "Subcontratação", "Redespacho"], 5)),
      mod("cupons", "Cupons fiscais", Barcode, "NFC-e e reduções Z do varejo.", COLS_DOC, docs("NFC-e", ["Venda balcão", "Cancelamento"], 5)),
      mod("manifestacao", "Manifestação do destinatário", ClipboardCheck, "Ciência, confirmação e desconhecimento de operações.", [
        col("chave", "Chave de acesso", { mono: true }), col("emitente", "Emitente"), col("data", "Emissão", { mono: true }), col("evento", "Evento"), col("status", "Status", { align: "center" }),
      ], Array.from({ length: 5 }, (_, i) => ({
        chave: `3526 0710 ${String(4400 + i)} …8891`,
        emitente: pick(EMPRESAS, i + 1),
        data: dt(i),
        evento: pick(["Ciência da operação", "Confirmação", "Operação não realizada", "Desconhecimento"], i),
        status: i % 3 === 2 ? "Pendente" : "Registrado",
      }))),
    ],
  },
  {
    slug: "escrituracao",
    title: "Escrituração",
    modules: [
      mod("livro-entradas", "Livro de entradas", FileSpreadsheet, "Registro de entradas por CFOP e CST.", [
        col("cfop", "CFOP", { mono: true }), col("descricao", "Operação"), num("contabil", "Valor contábil"), num("base", "Base ICMS"), num("imposto", "ICMS"),
      ], [
        { cfop: "1102", descricao: "Compra para comercialização", contabil: brl(184_200), base: brl(184_200), imposto: brl(33_156) },
        { cfop: "1556", descricao: "Compra de material de uso e consumo", contabil: brl(22_480), base: brl(0), imposto: brl(0) },
        { cfop: "2102", descricao: "Compra interestadual", contabil: brl(96_310), base: brl(96_310), imposto: brl(11_557) },
        { cfop: "1202", descricao: "Devolução de venda", contabil: brl(8_940), base: brl(8_940), imposto: brl(1_609) },
      ]),
      mod("livro-saidas", "Livro de saídas", FileSpreadsheet, "Registro de saídas por CFOP e CST.", [
        col("cfop", "CFOP", { mono: true }), col("descricao", "Operação"), num("contabil", "Valor contábil"), num("base", "Base ICMS"), num("imposto", "ICMS"),
      ], [
        { cfop: "5102", descricao: "Venda de mercadoria", contabil: brl(312_800), base: brl(312_800), imposto: brl(56_304) },
        { cfop: "6102", descricao: "Venda interestadual", contabil: brl(148_950), base: brl(148_950), imposto: brl(17_874) },
        { cfop: "5405", descricao: "Venda com ST", contabil: brl(64_200), base: brl(0), imposto: brl(0) },
        { cfop: "5910", descricao: "Remessa em bonificação", contabil: brl(4_120), base: brl(4_120), imposto: brl(741.6) },
      ]),
      mod("apuracao-icms", "Apuração de ICMS", Scale, "Débitos, créditos e saldo do período.", COLS_APUR, [
        { tributo: "ICMS próprio", base: brl(461_750), debito: brl(74_178), credito: brl(44_713), apagar: brl(29_465), status: "Apurado" },
        { tributo: "ICMS-ST", base: brl(71_604), debito: brl(12_905), credito: brl(0), apagar: brl(12_905), status: "Apurado" },
        { tributo: "DIFAL", base: brl(64_600), debito: brl(3_992), credito: brl(0), apagar: brl(3_992), status: "Em conferência" },
      ]),
      mod("apuracao-ipi", "Apuração de IPI", Percent, "Créditos e débitos de IPI por período.", COLS_APUR, [
        { tributo: "IPI saídas", base: brl(188_400), debito: brl(18_840), credito: brl(0), apagar: brl(18_840), status: "Apurado" },
        { tributo: "IPI entradas", base: brl(122_700), debito: brl(0), credito: brl(12_270), apagar: brl(0), status: "Apurado" },
      ]),
      mod("inventario", "Inventário (Bloco H)", Boxes, "Estoque declarado ao fisco por item.", [
        col("item", "Item"), col("ncm", "NCM", { mono: true }), num("qtd", "Quantidade"), num("unitario", "Custo unitário"), num("total", "Total"),
      ], [
        { item: "Válvula esfera 1/2\"", ncm: "8481.80.99", qtd: "1.240", unitario: brl(38.9), total: brl(48_236) },
        { item: "Chapa aço 2mm", ncm: "7326.90.90", qtd: "860", unitario: brl(112.4), total: brl(96_664) },
        { item: "Cabo flexível 2,5mm", ncm: "8544.42.00", qtd: "3.400", unitario: brl(4.2), total: brl(14_280) },
      ]),
      mod("ciap", "CIAP", Layers, "Controle de crédito de ICMS do ativo permanente.", [
        col("bem", "Bem"), col("entrada", "Entrada", { mono: true }), num("credito", "Crédito total"), col("parcela", "Parcela", { mono: true, align: "center" }), num("mes", "Crédito do mês"),
      ], [
        { bem: "Torno CNC Romi", entrada: "12/03/2025", credito: brl(42_000), parcela: "17/48", mes: brl(875) },
        { bem: "Empilhadeira Hyster", entrada: "08/09/2025", credito: brl(18_600), parcela: "11/48", mes: brl(387.5) },
      ]),
    ],
  },
  {
    slug: "apuracoes",
    title: "Apurações",
    modules: [
      mod("pis-cofins", "PIS / COFINS", Coins, "Regime cumulativo e não cumulativo.", COLS_APUR, [
        { tributo: "PIS não cumulativo", base: brl(461_750), debito: brl(7_618.9), credito: brl(4_286.3), apagar: brl(3_332.6), status: "Apurado" },
        { tributo: "COFINS não cumulativo", base: brl(461_750), debito: brl(35_093), credito: brl(19_741), apagar: brl(15_352), status: "Apurado" },
      ]),
      mod("iss", "ISS", Landmark, "ISS próprio e retido por município.", [
        col("municipio", "Município"), num("base", "Base"), col("aliq", "Alíquota", { align: "right", mono: true }), num("proprio", "ISS próprio"), num("retido", "ISS retido"),
      ], [
        { municipio: "São Paulo / SP", base: brl(84_200), aliq: "5,00%", proprio: brl(4_210), retido: brl(1_120) },
        { municipio: "Caxias do Sul / RS", base: brl(31_500), aliq: "3,00%", proprio: brl(945), retido: brl(0) },
        { municipio: "Recife / PE", base: brl(12_800), aliq: "2,00%", proprio: brl(256), retido: brl(256) },
      ]),
      mod("irpj-csll", "IRPJ / CSLL", BadgeDollarSign, "Estimativa mensal, lucro real e presumido.", COLS_APUR, [
        { tributo: "IRPJ", base: brl(214_600), debito: brl(32_190), credito: brl(6_400), apagar: brl(25_790), status: "Apurado" },
        { tributo: "Adicional de IRPJ", base: brl(194_600), debito: brl(19_460), credito: brl(0), apagar: brl(19_460), status: "Apurado" },
        { tributo: "CSLL", base: brl(214_600), debito: brl(19_314), credito: brl(3_100), apagar: brl(16_214), status: "Apurado" },
      ]),
      mod("simples-nacional", "Simples Nacional", PieChart, "PGDAS-D e segregação de receitas por anexo.", [
        col("anexo", "Anexo"), num("receita", "Receita do mês"), col("aliq", "Alíquota efetiva", { align: "right", mono: true }), num("das", "DAS"), col("status", "Status", { align: "center" }),
      ], [
        { anexo: "Anexo I — Comércio", receita: brl(148_200), aliq: "8,42%", das: brl(12_478.4), status: "Calculado" },
        { anexo: "Anexo III — Serviços", receita: brl(62_400), aliq: "10,18%", das: brl(6_352.3), status: "Calculado" },
      ]),
      mod("retencoes", "Retenções na fonte", Split, "IRRF, CSRF e INSS retidos de terceiros.", [
        col("documento", "Documento", { mono: true }), col("fornecedor", "Fornecedor"), num("base", "Base"), col("tributo", "Tributo"), num("valor", "Retido"),
      ], Array.from({ length: 5 }, (_, i) => ({
        documento: `NFS-e ${3120 + i}`,
        fornecedor: pick(EMPRESAS, i + 2),
        base: brl(6_200 + i * 1_450),
        tributo: pick(["IRRF 1,5%", "CSRF 4,65%", "INSS 11%", "ISS retido"], i),
        valor: brl(280 + i * 190.5),
      }))),
    ],
  },
  {
    slug: "obrigacoes",
    title: "Obrigações acessórias",
    modules: [
      mod("sped-fiscal", "SPED Fiscal (EFD ICMS/IPI)", Database, "Geração, validação e transmissão do arquivo.", COLS_OBRIG, [
        { obrigacao: "EFD ICMS/IPI — Matriz", competencia: "07/2026", prazo: "20/08/2026", responsavel: "Equipe fiscal", status: "Em geração" },
        { obrigacao: "EFD ICMS/IPI — Filial RS", competencia: "07/2026", prazo: "20/08/2026", responsavel: "Equipe fiscal", status: "Pendente" },
        { obrigacao: "EFD ICMS/IPI — Matriz", competencia: "06/2026", prazo: "20/07/2026", responsavel: "Equipe fiscal", status: "Transmitida" },
      ]),
      mod("efd-contribuicoes", "EFD-Contribuições", FileArchive, "Escrituração de PIS/COFINS.", COLS_OBRIG, [
        { obrigacao: "EFD-Contribuições", competencia: "07/2026", prazo: "14/08/2026", responsavel: "Equipe fiscal", status: "Pendente" },
        { obrigacao: "EFD-Contribuições", competencia: "06/2026", prazo: "14/07/2026", responsavel: "Equipe fiscal", status: "Transmitida" },
      ]),
      mod("ecd-ecf", "ECD e ECF", FileCog, "Escrituração contábil digital e fiscal anual.", COLS_OBRIG, [
        { obrigacao: "ECD — ano-base 2025", competencia: "2025", prazo: "31/05/2026", responsavel: "Contabilidade", status: "Transmitida" },
        { obrigacao: "ECF — ano-base 2025", competencia: "2025", prazo: "31/07/2026", responsavel: "Contabilidade", status: "Em revisão" },
      ]),
      mod("dctfweb", "DCTF / DCTFWeb", Send, "Confissão de débitos federais.", COLS_OBRIG, [
        { obrigacao: "DCTFWeb mensal", competencia: "07/2026", prazo: "15/08/2026", responsavel: "Equipe fiscal", status: "Pendente" },
        { obrigacao: "DCTF mensal", competencia: "06/2026", prazo: "15/07/2026", responsavel: "Equipe fiscal", status: "Transmitida" },
      ]),
      mod("reinf", "EFD-Reinf", Radio, "Retenções e informações de terceiros.", COLS_OBRIG, [
        { obrigacao: "EFD-Reinf — eventos R-2010", competencia: "07/2026", prazo: "15/08/2026", responsavel: "Equipe fiscal", status: "Em geração" },
        { obrigacao: "EFD-Reinf — fechamento R-2099", competencia: "06/2026", prazo: "15/07/2026", responsavel: "Equipe fiscal", status: "Transmitida" },
      ]),
      mod("estaduais", "Obrigações estaduais e municipais", Table2, "GIA, Sintegra, DeSTDA e declarações do ISS.", COLS_OBRIG, [
        { obrigacao: "GIA — SP", competencia: "07/2026", prazo: "16/08/2026", responsavel: "Equipe fiscal", status: "Pendente" },
        { obrigacao: "DeSTDA — RS", competencia: "07/2026", prazo: "28/08/2026", responsavel: "Equipe fiscal", status: "Pendente" },
        { obrigacao: "Declaração de ISS — SP", competencia: "07/2026", prazo: "10/08/2026", responsavel: "Equipe fiscal", status: "Em geração" },
      ]),
    ],
  },
  {
    slug: "guias",
    title: "Guias e recolhimentos",
    modules: [
      mod("darf", "DARF", Banknote, "Guias federais emitidas por competência.", [
        col("codigo", "Código", { mono: true }), col("tributo", "Tributo"), col("vencimento", "Vencimento", { mono: true }), num("valor", "Valor"), col("status", "Status", { align: "center" }),
      ], [
        { codigo: "0561", tributo: "IRRF sobre folha", vencimento: "20/08/2026", valor: brl(8_412.9), status: "Emitida" },
        { codigo: "5952", tributo: "PIS não cumulativo", vencimento: "25/08/2026", valor: brl(3_332.6), status: "Emitida" },
        { codigo: "5856", tributo: "COFINS não cumulativo", vencimento: "25/08/2026", valor: brl(15_352), status: "Emitida" },
        { codigo: "2362", tributo: "IRPJ estimativa", vencimento: "31/08/2026", valor: brl(25_790), status: "Pendente" },
      ]),
      mod("estaduais", "GNRE / GARE / DAE", Landmark, "Guias estaduais de ICMS, ST e DIFAL.", [
        col("guia", "Guia"), col("uf", "UF", { align: "center" }), col("vencimento", "Vencimento", { mono: true }), num("valor", "Valor"), col("status", "Status", { align: "center" }),
      ], [
        { guia: "GARE ICMS próprio", uf: "SP", vencimento: "20/08/2026", valor: brl(29_465), status: "Emitida" },
        { guia: "GNRE ICMS-ST", uf: "MG", vencimento: "09/08/2026", valor: brl(4_218), status: "Pendente" },
        { guia: "GNRE DIFAL", uf: "RS", vencimento: "15/08/2026", valor: brl(1_692), status: "Emitida" },
      ]),
      mod("parcelamentos", "Parcelamentos", HandCoins, "Acordos ativos e parcelas em aberto.", [
        col("acordo", "Acordo"), col("orgao", "Órgão"), col("parcela", "Parcela", { align: "center", mono: true }), num("valor", "Valor da parcela"), num("saldo", "Saldo devedor"),
      ], [
        { acordo: "Parcelamento ordinário 2024", orgao: "Receita Federal", parcela: "22/60", valor: brl(4_180), saldo: brl(158_840) },
        { acordo: "ICMS — programa estadual", orgao: "SEFAZ-SP", parcela: "8/24", valor: brl(2_940), saldo: brl(47_040) },
      ]),
      mod("calendario", "Calendário fiscal", CalendarClock, "Vencimentos do mês por empresa e tributo.", [
        col("dia", "Dia", { mono: true, align: "center" }), col("obrigacao", "Obrigação"), col("empresa", "Empresa"), col("status", "Status", { align: "center" }),
      ], [
        { dia: "07/08", obrigacao: "FGTS / DAE", empresa: "Todas", status: "Programado" },
        { dia: "14/08", obrigacao: "EFD-Contribuições", empresa: "Matriz", status: "Programado" },
        { dia: "20/08", obrigacao: "ICMS próprio", empresa: "Matriz + filiais", status: "Programado" },
        { dia: "25/08", obrigacao: "PIS / COFINS", empresa: "Matriz", status: "Programado" },
        { dia: "31/08", obrigacao: "IRPJ / CSLL estimativa", empresa: "Matriz", status: "Programado" },
      ]),
    ],
  },
  {
    slug: "auditoria",
    title: "Auditoria fiscal",
    modules: [
      mod("xml-escrituracao", "XML x escrituração", PackageSearch, "Divergências entre documentos capturados e escriturados.", [
        col("chave", "Documento", { mono: true }), col("divergencia", "Divergência"), col("origem", "Origem"), col("impacto", "Impacto"), col("status", "Status", { align: "center" }),
      ], [
        { chave: "NF-e 10267", divergencia: "XML sem escrituração", origem: "SEFAZ", impacto: "Crédito não aproveitado", status: "Aberta" },
        { chave: "NF-e 10281", divergencia: "Valor divergente", origem: "ERP", impacto: "ICMS a maior", status: "Em análise" },
        { chave: "CT-e 3308", divergencia: "CFOP incompatível", origem: "ERP", impacto: "Reclassificação", status: "Aberta" },
      ]),
      mod("cadastros-criticos", "Divergências de NCM / CST / CFOP", ListChecks, "Itens com classificação fiscal inconsistente.", [
        col("item", "Item"), col("ncm", "NCM", { mono: true }), col("cst", "CST", { mono: true }), col("cfop", "CFOP", { mono: true }), col("alerta", "Alerta"),
      ], [
        { item: "Cabo flexível 2,5mm", ncm: "8544.42.00", cst: "060", cfop: "5405", alerta: "NCM sujeito a ST não configurado" },
        { item: "Chapa aço 2mm", ncm: "7326.90.90", cst: "000", cfop: "5102", alerta: "MVA desatualizada" },
        { item: "Serviço de montagem", ncm: "—", cst: "—", cfop: "5933", alerta: "Item de serviço em nota de mercadoria" },
      ]),
      mod("creditos", "Créditos extemporâneos", TrendingUp, "Oportunidades de recuperação identificadas.", [
        col("origem", "Origem"), col("periodo", "Período", { mono: true }), col("tributo", "Tributo"), num("valor", "Valor estimado"), col("status", "Status", { align: "center" }),
      ], [
        { origem: "Insumos não creditados", periodo: "01/2025 – 12/2025", tributo: "PIS/COFINS", valor: brl(48_320), status: "Em levantamento" },
        { origem: "ICMS-ST pago a maior", periodo: "2025", tributo: "ICMS", valor: brl(22_140), status: "Documentar" },
      ]),
      mod("certidoes", "Certidões e regularidade", ShieldCheck, "Situação cadastral e certidões negativas.", [
        col("orgao", "Órgão"), col("certidao", "Certidão"), col("emissao", "Emissão", { mono: true }), col("validade", "Validade", { mono: true }), col("status", "Status", { align: "center" }),
      ], [
        { orgao: "Receita Federal", certidao: "CND conjunta", emissao: "12/06/2026", validade: "09/12/2026", status: "Válida" },
        { orgao: "SEFAZ-SP", certidao: "CND estadual", emissao: "02/07/2026", validade: "30/09/2026", status: "Válida" },
        { orgao: "Prefeitura SP", certidao: "CND municipal", emissao: "18/03/2026", validade: "16/07/2026", status: "Vencida" },
        { orgao: "Caixa", certidao: "CRF do FGTS", emissao: "10/07/2026", validade: "07/09/2026", status: "Válida" },
      ]),
    ],
  },
];

// ------------------------------------------------------------
// ADMINISTRATIVO
// ------------------------------------------------------------
export const administrativo: Category[] = [
  {
    slug: "cadastros",
    title: "Cadastros",
    modules: [
      mod("clientes", "Clientes", Users2, "Carteira de clientes e dados de faturamento.", [
        col("codigo", "Código", { mono: true }), col("nome", "Cliente"), col("documento", "CNPJ/CPF", { mono: true }), col("cidade", "Cidade / UF"), col("status", "Status", { align: "center" }),
      ], Array.from({ length: 6 }, (_, i) => ({
        codigo: String(1000 + i * 3),
        nome: pick(EMPRESAS, i),
        documento: `1${String(2 + i)}.345.678/0001-9${i}`,
        cidade: pick(["São Paulo / SP", "Caxias do Sul / RS", "Recife / PE", "Curitiba / PR"], i),
        status: i % 5 === 4 ? "Inativo" : "Ativo",
      })), "Novo cliente"),
      mod("fornecedores", "Fornecedores", Briefcase, "Fornecedores, prestadores e condições comerciais.", [
        col("codigo", "Código", { mono: true }), col("nome", "Fornecedor"), col("documento", "CNPJ/CPF", { mono: true }), col("categoria", "Categoria"), col("status", "Status", { align: "center" }),
      ], Array.from({ length: 6 }, (_, i) => ({
        codigo: String(2000 + i * 4),
        nome: pick(EMPRESAS, i + 3),
        documento: `2${String(1 + i)}.876.543/0001-1${i}`,
        categoria: pick(["Matéria-prima", "Serviços", "Utilidades", "Logística"], i),
        status: "Ativo",
      })), "Novo fornecedor"),
      mod("produtos-servicos", "Produtos e serviços", Boxes, "Catálogo com NCM, unidade e preço padrão.", [
        col("codigo", "Código", { mono: true }), col("descricao", "Descrição"), col("ncm", "NCM / LC 116", { mono: true }), col("un", "Un.", { align: "center" }), num("preco", "Preço padrão"),
      ], [
        { codigo: "P-1001", descricao: "Válvula esfera 1/2\"", ncm: "8481.80.99", un: "PC", preco: brl(64.9) },
        { codigo: "P-1002", descricao: "Chapa aço 2mm", ncm: "7326.90.90", un: "KG", preco: brl(148.2) },
        { codigo: "S-2001", descricao: "Serviço de montagem industrial", ncm: "14.01", un: "HR", preco: brl(180) },
      ], "Novo item"),
      mod("bancos", "Bancos e contas", Landmark, "Contas correntes, aplicações e saldos.", [
        col("banco", "Banco"), col("agencia", "Agência", { mono: true }), col("conta", "Conta", { mono: true }), col("tipo", "Tipo"), num("saldo", "Saldo atual"),
      ], [
        { banco: "Banco do Brasil", agencia: "1234-5", conta: "98765-4", tipo: "Conta corrente", saldo: brl(412_880.4) },
        { banco: "Itaú", agencia: "0456", conta: "11223-8", tipo: "Conta corrente", saldo: brl(96_240.1) },
        { banco: "Santander", agencia: "3390", conta: "44120-0", tipo: "Aplicação CDB", saldo: brl(280_000) },
      ], "Nova conta"),
      mod("plano-gerencial", "Plano de contas gerencial", ListTree, "Estrutura gerencial usada nos relatórios internos.", [
        col("conta", "Conta", { mono: true }), col("descricao", "Descrição"), col("natureza", "Natureza"), col("nivel", "Nível", { align: "center", mono: true }),
      ], [
        { conta: "3.1", descricao: "Receita operacional", natureza: "Receita", nivel: "2" },
        { conta: "4.1.01", descricao: "Custo de mercadoria vendida", natureza: "Custo", nivel: "3" },
        { conta: "4.2.03", descricao: "Despesas administrativas", natureza: "Despesa", nivel: "3" },
        { conta: "4.2.05", descricao: "Despesas tributárias", natureza: "Despesa", nivel: "3" },
      ]),
      mod("condicoes-pagamento", "Condições de pagamento", Wallet2, "Prazos, parcelamentos e formas aceitas.", [
        col("codigo", "Código", { mono: true }), col("descricao", "Condição"), col("parcelas", "Parcelas", { align: "center", mono: true }), col("forma", "Forma"),
      ], [
        { codigo: "CP-01", descricao: "À vista", parcelas: "1", forma: "PIX / TED" },
        { codigo: "CP-02", descricao: "28 dias", parcelas: "1", forma: "Boleto" },
        { codigo: "CP-03", descricao: "30/60/90", parcelas: "3", forma: "Boleto" },
      ]),
    ],
  },
  {
    slug: "financeiro-operacional",
    title: "Contas e caixa",
    modules: [
      mod("contas-pagar", "Contas a pagar", FileDown, "Títulos a vencer, vencidos e pagos.", [
        col("titulo", "Título", { mono: true }), col("fornecedor", "Fornecedor"), col("vencimento", "Vencimento", { mono: true }), num("valor", "Valor"), col("status", "Status", { align: "center" }),
      ], Array.from({ length: 6 }, (_, i) => ({
        titulo: `AP-${4100 + i}`,
        fornecedor: pick(EMPRESAS, i + 1),
        vencimento: dt(i),
        valor: brl(3_200 + i * 1_480),
        status: pick(["Em aberto", "Pago", "Vencido", "Programado"], i),
      })), "Novo título"),
      mod("contas-receber", "Contas a receber", FileUp, "Recebíveis por cliente e vencimento.", [
        col("titulo", "Título", { mono: true }), col("cliente", "Cliente"), col("vencimento", "Vencimento", { mono: true }), num("valor", "Valor"), col("status", "Status", { align: "center" }),
      ], Array.from({ length: 6 }, (_, i) => ({
        titulo: `AR-${7300 + i}`,
        cliente: pick(EMPRESAS, i + 2),
        vencimento: dt(i + 2),
        valor: brl(6_400 + i * 2_120),
        status: pick(["Em aberto", "Recebido", "Vencido"], i),
      })), "Novo título"),
      mod("conciliacao", "Conciliação bancária", ClipboardCheck, "Extrato x lançamentos internos.", [
        col("data", "Data", { mono: true }), col("historico", "Histórico"), num("extrato", "Extrato"), num("sistema", "Sistema"), col("situacao", "Situação", { align: "center" }),
      ], [
        { data: "03/07/2026", historico: "Recebimento cliente Andes", extrato: brl(18_400), sistema: brl(18_400), situacao: "Conciliado" },
        { data: "10/07/2026", historico: "Pagamento fornecedor Norte", extrato: brl(9_280), sistema: brl(9_280), situacao: "Conciliado" },
        { data: "16/07/2026", historico: "Tarifa bancária", extrato: brl(148.9), sistema: brl(0), situacao: "Divergente" },
      ]),
      mod("fluxo-caixa", "Fluxo de caixa", TrendingUp, "Projeção de entradas e saídas por semana.", [
        col("periodo", "Período"), num("entradas", "Entradas"), num("saidas", "Saídas"), num("saldo", "Saldo projetado"),
      ], [
        { periodo: "Semana 1 — 03/08", entradas: brl(84_200), saidas: brl(62_400), saldo: brl(21_800) },
        { periodo: "Semana 2 — 10/08", entradas: brl(56_900), saidas: brl(78_300), saldo: brl(-21_400) },
        { periodo: "Semana 3 — 17/08", entradas: brl(102_400), saidas: brl(64_120), saldo: brl(38_280) },
        { periodo: "Semana 4 — 24/08", entradas: brl(71_600), saidas: brl(59_840), saldo: brl(11_760) },
      ]),
      mod("cobranca", "Cobrança e inadimplência", HandCoins, "Títulos vencidos e ações de cobrança.", [
        col("cliente", "Cliente"), col("titulo", "Título", { mono: true }), col("atraso", "Dias em atraso", { align: "center", mono: true }), num("valor", "Valor"), col("acao", "Ação"),
      ], [
        { cliente: "Comércio Andes Eireli", titulo: "AR-7288", atraso: "42", valor: brl(12_400), acao: "Negociação" },
        { cliente: "Panificadora Real Ltda.", titulo: "AR-7301", atraso: "11", valor: brl(3_860), acao: "Cobrança amigável" },
      ]),
    ],
  },
  {
    slug: "contratos",
    title: "Contratos e documentos",
    modules: [
      mod("contratos", "Contratos", ScrollText, "Contratos vigentes, reajustes e vencimentos.", [
        col("contrato", "Contrato", { mono: true }), col("parte", "Contraparte"), col("inicio", "Início", { mono: true }), col("fim", "Vigência até", { mono: true }), num("valor", "Valor mensal"),
      ], [
        { contrato: "CT-2024-011", parte: "Distribuidora Norte Ltda.", inicio: "01/02/2024", fim: "31/01/2027", valor: brl(18_400) },
        { contrato: "CT-2025-004", parte: "TechCore Sistemas ME", inicio: "15/05/2025", fim: "14/05/2027", valor: brl(6_200) },
        { contrato: "CT-2026-002", parte: "Transportes Litoral Ltda.", inicio: "01/03/2026", fim: "28/02/2027", valor: brl(9_800) },
      ], "Novo contrato"),
      mod("certificados", "Certificados e procurações", KeyRound, "e-CNPJ, e-CPF e procurações eletrônicas.", [
        col("tipo", "Tipo"), col("titular", "Titular"), col("emissao", "Emissão", { mono: true }), col("validade", "Validade", { mono: true }), col("status", "Status", { align: "center" }),
      ], [
        { tipo: "e-CNPJ A1", titular: "Matriz", emissao: "02/02/2026", validade: "02/02/2027", status: "Válido" },
        { tipo: "Procuração e-CAC", titular: "Contabilidade interna", emissao: "10/01/2026", validade: "10/01/2028", status: "Válido" },
        { tipo: "Certificado NFS-e", titular: "Filial RS", emissao: "20/08/2025", validade: "20/08/2026", status: "A vencer" },
      ]),
      mod("documentos", "Documentos e anexos", FolderArchive, "Repositório de documentos por empresa e competência.", [
        col("documento", "Documento"), col("empresa", "Empresa"), col("competencia", "Competência", { mono: true }), col("tipo", "Tipo"), col("responsavel", "Enviado por"),
      ], [
        { documento: "Extrato bancário 07/2026", empresa: "Matriz", competencia: "07/2026", tipo: "Bancário", responsavel: "Financeiro" },
        { documento: "Contrato social consolidado", empresa: "Matriz", competencia: "—", tipo: "Societário", responsavel: "Jurídico" },
        { documento: "Balancete 06/2026", empresa: "Filial RS", competencia: "06/2026", tipo: "Contábil", responsavel: "Contabilidade" },
      ], "Enviar documento"),
      mod("agenda", "Agenda administrativa", CalendarClock, "Compromissos, renovações e prazos internos.", [
        col("data", "Data", { mono: true }), col("compromisso", "Compromisso"), col("responsavel", "Responsável"), col("status", "Status", { align: "center" }),
      ], [
        { data: "05/08/2026", compromisso: "Renovação de seguro patrimonial", responsavel: "Administrativo", status: "Programado" },
        { data: "12/08/2026", compromisso: "Reunião de fechamento mensal", responsavel: "Controladoria", status: "Programado" },
        { data: "20/08/2026", compromisso: "Renovação do certificado NFS-e", responsavel: "TI", status: "Atenção" },
      ]),
    ],
  },
  {
    slug: "patrimonio",
    title: "Patrimônio",
    modules: [
      mod("bens", "Bens do imobilizado", Building2, "Cadastro de bens com centro de custo e localização.", [
        col("patrimonio", "Nº patrimônio", { mono: true }), col("bem", "Bem"), col("centro", "Centro de custo"), col("aquisicao", "Aquisição", { mono: true }), num("valor", "Valor de aquisição"),
      ], [
        { patrimonio: "PT-0142", bem: "Torno CNC Romi", centro: "Industrial", aquisicao: "12/03/2025", valor: brl(240_000) },
        { patrimonio: "PT-0177", bem: "Empilhadeira Hyster", centro: "Logística", aquisicao: "08/09/2025", valor: brl(106_000) },
        { patrimonio: "PT-0203", bem: "Servidor Dell R650", centro: "Administrativo", aquisicao: "22/01/2026", valor: brl(48_500) },
      ], "Novo bem"),
      mod("depreciacao", "Depreciação", PieChart, "Cálculo mensal e saldo residual por bem.", [
        col("patrimonio", "Nº patrimônio", { mono: true }), col("bem", "Bem"), col("taxa", "Taxa a.a.", { align: "right", mono: true }), num("mes", "Depreciação do mês"), num("residual", "Valor residual"),
      ], [
        { patrimonio: "PT-0142", bem: "Torno CNC Romi", taxa: "10%", mes: brl(2_000), residual: brl(212_000) },
        { patrimonio: "PT-0177", bem: "Empilhadeira Hyster", taxa: "10%", mes: brl(883.3), residual: brl(96_233.3) },
        { patrimonio: "PT-0203", bem: "Servidor Dell R650", taxa: "20%", mes: brl(808.3), residual: brl(43_650) },
      ]),
      mod("inventario-bens", "Inventário de bens", PackageSearch, "Conferência física x contábil dos bens.", [
        col("patrimonio", "Nº patrimônio", { mono: true }), col("bem", "Bem"), col("local", "Localização"), col("conferido", "Última conferência", { mono: true }), col("situacao", "Situação", { align: "center" }),
      ], [
        { patrimonio: "PT-0142", bem: "Torno CNC Romi", local: "Galpão 2", conferido: "18/06/2026", situacao: "Localizado" },
        { patrimonio: "PT-0177", bem: "Empilhadeira Hyster", local: "Expedição", conferido: "18/06/2026", situacao: "Localizado" },
        { patrimonio: "PT-0203", bem: "Servidor Dell R650", local: "Sala TI", conferido: "—", situacao: "Não conferido" },
      ]),
    ],
  },
  {
    slug: "suprimentos",
    title: "Compras e suprimentos",
    modules: [
      mod("requisicoes", "Requisições de compra", ClipboardList, "Solicitações internas aguardando aprovação.", [
        col("requisicao", "Requisição", { mono: true }), col("solicitante", "Solicitante"), col("centro", "Centro de custo"), col("data", "Data", { mono: true }), col("status", "Status", { align: "center" }),
      ], [
        { requisicao: "RQ-0412", solicitante: "Produção", centro: "Industrial", data: "14/07/2026", status: "Aguardando aprovação" },
        { requisicao: "RQ-0413", solicitante: "TI", centro: "Administrativo", data: "16/07/2026", status: "Aprovada" },
        { requisicao: "RQ-0414", solicitante: "Logística", centro: "Logística", data: "21/07/2026", status: "Em cotação" },
      ], "Nova requisição"),
      mod("cotacoes", "Cotações", ShoppingCart, "Comparativo de propostas por fornecedor.", [
        col("cotacao", "Cotação", { mono: true }), col("item", "Item"), col("fornecedor", "Melhor proposta"), num("valor", "Valor"), col("status", "Status", { align: "center" }),
      ], [
        { cotacao: "CO-0188", item: "Chapa aço 2mm (500kg)", fornecedor: "Distribuidora Norte Ltda.", valor: brl(68_400), status: "Em análise" },
        { cotacao: "CO-0189", item: "Notebooks (5un)", fornecedor: "TechCore Sistemas ME", valor: brl(31_200), status: "Aprovada" },
      ]),
      mod("pedidos", "Pedidos de compra", Truck, "Pedidos emitidos e status de recebimento.", [
        col("pedido", "Pedido", { mono: true }), col("fornecedor", "Fornecedor"), col("previsao", "Previsão", { mono: true }), num("valor", "Valor"), col("status", "Status", { align: "center" }),
      ], [
        { pedido: "PC-1042", fornecedor: "Distribuidora Norte Ltda.", previsao: "08/08/2026", valor: brl(68_400), status: "Em trânsito" },
        { pedido: "PC-1043", fornecedor: "TechCore Sistemas ME", previsao: "14/08/2026", valor: brl(31_200), status: "Aguardando envio" },
        { pedido: "PC-1039", fornecedor: "Comércio Andes Eireli", previsao: "22/07/2026", valor: brl(12_840), status: "Recebido" },
      ]),
    ],
  },
  {
    slug: "controles",
    title: "Controles internos",
    modules: [
      mod("usuarios", "Usuários e permissões", Users2, "Acessos por módulo e perfil.", [
        col("usuario", "Usuário"), col("perfil", "Perfil"), col("areas", "Áreas liberadas"), col("ultimoAcesso", "Último acesso", { mono: true }), col("status", "Status", { align: "center" }),
      ], [
        { usuario: "Marina Costa", perfil: "Controladoria", areas: "Todas", ultimoAcesso: "27/07/2026", status: "Ativo" },
        { usuario: "Rafael Prado", perfil: "Fiscal", areas: "Fiscal, Financeiro", ultimoAcesso: "26/07/2026", status: "Ativo" },
        { usuario: "Carla Mendes", perfil: "Administrativo", areas: "Administrativo", ultimoAcesso: "24/07/2026", status: "Ativo" },
      ], "Novo usuário"),
      mod("auditoria-log", "Log de auditoria", History, "Trilha de alterações e acessos ao sistema.", [
        col("data", "Data/hora", { mono: true }), col("usuario", "Usuário"), col("acao", "Ação"), col("registro", "Registro"),
      ], [
        { data: "27/07/2026 09:12", usuario: "Rafael Prado", acao: "Encerrou competência", registro: "Fiscal · 06/2026" },
        { data: "26/07/2026 17:44", usuario: "Marina Costa", acao: "Alterou parâmetro tributário", registro: "Matriz · Regime" },
        { data: "26/07/2026 11:03", usuario: "Carla Mendes", acao: "Cadastrou fornecedor", registro: "FOR-2016" },
      ]),
      mod("centros-custo", "Centros de custo e rateio", Split, "Estrutura de custos e regras de rateio.", [
        col("codigo", "Código", { mono: true }), col("centro", "Centro de custo"), col("responsavel", "Responsável"), col("criterio", "Critério de rateio"), col("percentual", "%", { align: "right", mono: true }),
      ], [
        { codigo: "CC-01", centro: "Industrial", responsavel: "Gerência industrial", criterio: "Horas máquina", percentual: "48%" },
        { codigo: "CC-02", centro: "Comercial", responsavel: "Diretoria comercial", criterio: "Receita", percentual: "27%" },
        { codigo: "CC-03", centro: "Administrativo", responsavel: "Controladoria", criterio: "Headcount", percentual: "15%" },
        { codigo: "CC-04", centro: "Logística", responsavel: "Supervisão logística", criterio: "Volume expedido", percentual: "10%" },
      ]),
      mod("parametros", "Parâmetros do sistema", Cog, "Configurações gerais e integrações internas.", [
        col("parametro", "Parâmetro"), col("valor", "Valor atual"), col("escopo", "Escopo"), col("atualizado", "Atualizado em", { mono: true }),
      ], [
        { parametro: "Bloqueio de competência encerrada", valor: "Ativo", escopo: "Global", atualizado: "12/05/2026" },
        { parametro: "Aprovação obrigatória de pagamentos", valor: "Acima de R$ 10.000,00", escopo: "Administrativo", atualizado: "03/06/2026" },
        { parametro: "Importação automática de XML", valor: "Diária às 06h", escopo: "Fiscal", atualizado: "18/07/2026" },
      ]),
      mod("politicas", "Políticas e alçadas", Lock, "Alçadas de aprovação por valor e área.", [
        col("politica", "Política"), col("area", "Área"), col("alcada", "Alçada"), col("aprovador", "Aprovador"),
      ], [
        { politica: "Pagamento a fornecedor", area: "Administrativo", alcada: "Até R$ 10.000", aprovador: "Coordenação" },
        { politica: "Pagamento a fornecedor", area: "Administrativo", alcada: "Acima de R$ 10.000", aprovador: "Diretoria" },
        { politica: "Ajuste de apuração fiscal", area: "Fiscal", alcada: "Qualquer valor", aprovador: "Controladoria" },
      ]),
    ],
  },
];
