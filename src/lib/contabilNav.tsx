import {
  Settings2, Users2, Wallet, Building2, Briefcase, ClipboardList, ListTree, Layers,
  Workflow, CheckSquare, FileArchive, Calculator, Table2, UserCheck, UserPlus, Scale,
  MapPin, Wallet2, CalendarClock, Plane, HeartPulse, Fingerprint, CalendarX2, FileDown,
  FileUp, Timer, ArrowDownToLine, Receipt, PartyPopper, Gift, FileText, UserSquare2,
  Stethoscope, BarChart3, PieChart, LineChart, ClipboardCheck, Radio, FileCog, Award,
  Database, ListChecks, Lock, Send, Fingerprint as Punch, Landmark, FolderArchive, Split,
  Percent, FileSpreadsheet, Coins, TrendingUp, ScrollText, Banknote, FileBarChart2,
  BadgeDollarSign, Cog, Package, Sparkles, Gauge, type LucideIcon,
} from "lucide-react";
import { fiscal, administrativo } from "./contabilNavAreas";


// ------------------------------------------------------------
// Types
// ------------------------------------------------------------
export type Col = { key: string; label: string; align?: "right" | "center"; mono?: boolean };
export type Row = Record<string, string | number>;
export type Module = {
  slug: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  columns: Col[];
  rows: Row[];
  primaryAction?: string;
};
export type Category = { slug: string; title: string; modules: Module[] };
export type Area = {
  slug: string;
  title: string;
  code: string;
  icon: LucideIcon;
  accent: "orange" | "blue" | "purple" | "pink";
  eyebrow: string;
  blurb: string;
  categories: Category[];
};

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
const NAMES = [
  "Aline Bezerra", "Bruno Tavares", "Carla Mendes", "Diego Ramos", "Elisa Nogueira",
  "Fábio Prado", "Gabriela Reis", "Henrique Vilela", "Isabela Costa", "João Peixoto",
  "Karina Duarte", "Leandro Guimarães", "Marina Costa", "Nelson Barros", "Otávio Lima",
  "Patrícia Souto", "Rafael Prado", "Sônia Vieira", "Tiago Almeida", "Vitória Rocha",
];
const EMPRESAS = [
  "Metalúrgica Andrade S.A.", "Panificadora Real Ltda.", "TechCore Sistemas ME",
  "Transportes Litoral Ltda.", "Comércio Andes Eireli", "Distribuidora Norte Ltda.",
];
const CARGOS = [
  "Analista Contábil Pleno", "Operador de CNC", "Coordenadora Fiscal",
  "Auxiliar Administrativo", "Controller", "Vendedor Externo", "Assistente de DP",
  "Gerente Industrial", "Analista de Custos", "Almoxarife", "Analista de RH", "Motorista",
];
const CENTROS = ["Comercial-SP", "Comercial-RS", "Administrativo", "Industrial", "Financeiro", "Logística"];

const brl = (v: number) =>
  "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const cpf = (i: number) => {
  const s = String(1000000000 + i * 137).padStart(11, "0");
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9, 11)}`;
};
const cnpj = (i: number) => {
  const s = String(10000000000000 + i * 91739).padStart(14, "0");
  return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12, 14)}`;
};
const dateBr = (i: number) => {
  const d = 28 - (i % 25);
  return `${String(d).padStart(2, "0")}/10/2024`;
};
const pick = <T,>(arr: T[], i: number) => arr[i % arr.length];

// generic row generators
const people = (n = 8): Row[] =>
  Array.from({ length: n }, (_, i) => ({
    matricula: String(120 + i * 7).padStart(4, "0"),
    nome: pick(NAMES, i),
    cargo: pick(CARGOS, i),
    admissao: dateBr(i + 3),
    salario: brl(2400 + i * 685.5),
    situacao: i % 6 === 5 ? "Afastado" : "Ativo",
  }));

const money = (
  labels: [string, string][],
  n = 8,
): Row[] =>
  Array.from({ length: n }, (_, i) => {
    const [a, b] = labels;
    return {
      codigo: `${String(1000 + i * 13).padStart(5, "0")}`,
      [a[0]]: pick(NAMES, i + 2),
      [b[0]]: brl(1200 + i * 942.75),
      competencia: "10/2024",
    };
  });

// ------------------------------------------------------------
// Column shorthands
// ------------------------------------------------------------
const C = {
  codigo: { key: "codigo", label: "Código", mono: true } as Col,
  descricao: { key: "descricao", label: "Descrição" } as Col,
  valor: (k = "valor", l = "Valor"): Col => ({ key: k, label: l, align: "right", mono: true }),
  data: (k = "data", l = "Data"): Col => ({ key: k, label: l, mono: true }),
  status: { key: "status", label: "Status", align: "center" } as Col,
};

// small factory for tabelas de referência
const tabelaFaixas = (
  header: string,
  rows: Array<[string, string, string]>,
): { columns: Col[]; rows: Row[] } => ({
  columns: [
    { key: "faixa", label: "Faixa" },
    { key: "de", label: header, align: "right", mono: true },
    { key: "aliq", label: "Alíquota", align: "right", mono: true },
  ],
  rows: rows.map(([faixa, de, aliq]) => ({ faixa, de, aliq })),
});

// ------------------------------------------------------------
// PREPARATIVOS
// ------------------------------------------------------------
const preparativos: Category[] = [
  {
    slug: "cadastros",
    title: "Cadastros",
    modules: [
      {
        slug: "filiais",
        title: "Filiais e unidades",
        icon: Building2,
        desc: "Matriz, filiais e unidades operacionais do grupo.",
        columns: [
          C.codigo,
          { key: "nome", label: "Unidade" },
          { key: "cidade", label: "Cidade / UF" },
          { key: "responsavel", label: "Responsável interno" },
          C.status,
        ],
        rows: [],
        primaryAction: "Nova unidade",
      },
      {
        slug: "empresas",
        title: "Empresas do grupo",
        icon: Briefcase,
        desc: "CNPJs do grupo econômico — regime tributário e situação.",
        columns: [
          { key: "cnpj", label: "CNPJ", mono: true },
          { key: "razao", label: "Razão social" },
          { key: "regime", label: "Regime" },
          { key: "atividade", label: "Atividade" },
          C.status,
        ],
        rows: [],
        primaryAction: "Nova empresa",
      },
      {
        slug: "classe-atividades",
        title: "Classe de atividades",
        icon: Layers,
        desc: "Classificação CNAE das atividades operadas pelas empresas.",
        columns: [
          { key: "cnae", label: "CNAE", mono: true },
          { key: "descricao", label: "Descrição" },
          { key: "tipo", label: "Tipo" },
          { key: "aliq", label: "Alíq. ISS", align: "right", mono: true },
        ],
        rows: [
          { cnae: "2521-7/00", descricao: "Fabricação de tanques e reservatórios metálicos", tipo: "Indústria", aliq: "—" },
          { cnae: "4711-3/02", descricao: "Comércio varejista de mercadorias em geral", tipo: "Comércio", aliq: "—" },
          { cnae: "6202-3/00", descricao: "Desenvolvimento e licenciamento de softwares", tipo: "Serviços", aliq: "2,50%" },
          { cnae: "4930-2/02", descricao: "Transporte rodoviário de carga intermunicipal", tipo: "Transporte", aliq: "—" },
          { cnae: "6920-6/01", descricao: "Atividades de contabilidade", tipo: "Serviços", aliq: "5,00%" },
          { cnae: "1091-1/02", descricao: "Fabricação de produtos de padaria", tipo: "Indústria", aliq: "—" },
        ],
      },
      {
        slug: "resumo-classe-atividades",
        title: "Resumo classe de atividades",
        icon: ListTree,
        desc: "Consolidado de empresas por classe CNAE.",
        columns: [
          { key: "grupo", label: "Grupo CNAE" },
          { key: "empresas", label: "Empresas", align: "right", mono: true },
          { key: "colaboradores", label: "Colaboradores", align: "right", mono: true },
          { key: "faturamento", label: "Faturamento 10/24", align: "right", mono: true },
        ],
        rows: [
          { grupo: "Indústria metalúrgica", empresas: 3, colaboradores: 214, faturamento: brl(4_812_309) },
          { grupo: "Comércio varejista", empresas: 4, colaboradores: 86, faturamento: brl(1_204_112) },
          { grupo: "Serviços de TI", empresas: 2, colaboradores: 42, faturamento: brl(618_500) },
          { grupo: "Transporte rodoviário", empresas: 2, colaboradores: 58, faturamento: brl(910_240) },
          { grupo: "Panificação", empresas: 1, colaboradores: 22, faturamento: brl(184_320) },
        ],
      },
    ],
  },
  {
    slug: "servicos",
    title: "Serviços",
    modules: [
      {
        slug: "gestao",
        title: "Gestão",
        icon: ClipboardList,
        desc: "Painel de gestão das obrigações internas por empresa/filial.",
        columns: [
          { key: "empresa", label: "Empresa / Filial" },
          { key: "obrigacao", label: "Obrigação" },
          { key: "vencimento", label: "Vencimento", mono: true },
          { key: "responsavel", label: "Responsável interno" },
          C.status,
        ],
        rows: [
          { empresa: "Metalúrgica Andrade — Matriz", obrigacao: "DCTFWeb", vencimento: "15/07/2026", responsavel: "R. Prado", status: "Em andamento" },
          { empresa: "Andrade Comércio — Filial Sul", obrigacao: "DAS Simples Nacional", vencimento: "20/07/2026", responsavel: "C. Mendes", status: "Pendente" },
          { empresa: "TechCore — Unidade TI", obrigacao: "EFD Contribuições", vencimento: "14/07/2026", responsavel: "J. Reis", status: "Concluído" },
          { empresa: "Transportes Litoral — Filial NE", obrigacao: "SPED Fiscal", vencimento: "25/07/2026", responsavel: "R. Prado", status: "Pendente" },
          { empresa: "Andrade Distribuição — CD Sul", obrigacao: "GIA-ST", vencimento: "10/07/2026", responsavel: "M. Costa", status: "Atrasado" },
        ],
      },
      {
        slug: "fases-processos",
        title: "Fases e processos",
        icon: Workflow,
        desc: "Etapas dos processos de fechamento interno por empresa.",
        columns: [
          { key: "processo", label: "Processo" },
          { key: "fase", label: "Fase atual" },
          { key: "conclusao", label: "Conclusão", align: "right", mono: true },
          { key: "prazo", label: "Prazo", mono: true },
        ],
        rows: [
          { processo: "Fechamento contábil 07/26", fase: "Conciliação bancária", conclusao: "62%", prazo: "18/07" },
          { processo: "Fechamento fiscal 07/26", fase: "Apuração ICMS", conclusao: "48%", prazo: "20/07" },
          { processo: "Folha 07/26", fase: "Cálculo INSS/IRRF", conclusao: "100%", prazo: "05/07" },
          { processo: "eSocial periódicos 07/26", fase: "Envio S-1200", conclusao: "84%", prazo: "15/07" },
          { processo: "DCTFWeb 07/26", fase: "Aguardando fechamento", conclusao: "0%", prazo: "22/07" },
        ],
      },
      {
        slug: "cadastro-tarefas",
        title: "Cadastro de tarefas",
        icon: CheckSquare,
        desc: "Modelos de tarefas recorrentes e checklist mensal.",
        columns: [
          C.codigo,
          { key: "tarefa", label: "Tarefa" },
          { key: "periodicidade", label: "Periodicidade" },
          { key: "responsavel", label: "Responsável padrão" },
        ],
        rows: [
          { codigo: "TRF-001", tarefa: "Importar XMLs de entrada", periodicidade: "Diária", responsavel: "R. Prado" },
          { codigo: "TRF-002", tarefa: "Conciliação bancária Itaú", periodicidade: "Semanal", responsavel: "J. Reis" },
          { codigo: "TRF-003", tarefa: "Apuração ICMS", periodicidade: "Mensal", responsavel: "R. Prado" },
          { codigo: "TRF-004", tarefa: "Fechamento folha", periodicidade: "Mensal", responsavel: "M. Costa" },
          { codigo: "TRF-005", tarefa: "Envio DCTFWeb", periodicidade: "Mensal", responsavel: "R. Prado" },
          { codigo: "TRF-006", tarefa: "Emissão DAS Simples", periodicidade: "Mensal", responsavel: "C. Mendes" },
        ],
      },
      {
        slug: "encerramentos",
        title: "Encerramentos",
        icon: FileArchive,
        desc: "Histórico de encerramentos concluídos por competência.",
        columns: [
          { key: "competencia", label: "Competência", mono: true },
          { key: "empresa", label: "Empresa / Filial" },
          { key: "encerrado", label: "Encerrado em", mono: true },
          { key: "responsavel", label: "Responsável interno" },
          C.status,
        ],
        rows: [
          { competencia: "05/2026", empresa: "Metalúrgica Andrade — Matriz", encerrado: "12/06/2026", responsavel: "M. Andrade", status: "Assinado" },
          { competencia: "05/2026", empresa: "Andrade Comércio — Filial Sul", encerrado: "10/06/2026", responsavel: "C. Mendes", status: "Assinado" },
          { competencia: "05/2026", empresa: "TechCore — Unidade TI", encerrado: "08/06/2026", responsavel: "J. Reis", status: "Assinado" },
          { competencia: "06/2026", empresa: "Metalúrgica Andrade — Matriz", encerrado: "—", responsavel: "—", status: "Em aberto" },
          { competencia: "06/2026", empresa: "Andrade Comércio — Filial Sul", encerrado: "—", responsavel: "—", status: "Em aberto" },
        ],
      },
    ],
  },
  {
    slug: "empresa",
    title: "Empresa",
    modules: [
      {
        slug: "dados-empresa",
        title: "Dados da empresa",
        icon: Building2,
        desc: "Ficha cadastral, endereço, contatos e responsáveis legais.",
        columns: [
          { key: "campo", label: "Campo" },
          { key: "valor", label: "Valor" },
        ],
        rows: [
          { campo: "Razão social", valor: "Metalúrgica Andrade S.A." },
          { campo: "Nome fantasia", valor: "Andrade Metal" },
          { campo: "CNPJ", valor: "12.345.678/0001-90" },
          { campo: "Natureza jurídica", valor: "204-6 — Sociedade Anônima Fechada" },
          { campo: "Regime tributário", valor: "Lucro Real trimestral" },
          { campo: "CNAE principal", valor: "2521-7/00 — Fabricação de tanques metálicos" },
          { campo: "Endereço matriz", valor: "Rod. Fernão Dias, km 84 — Betim/MG · CEP 32.657-000" },
          { campo: "Telefone", valor: "(31) 3512-8400" },
          { campo: "E-mail fiscal", valor: "fiscal@andrademetal.com.br" },
          { campo: "Responsável legal", valor: "Marcos Andrade — CPF 128.470.921-04" },
          { campo: "Contador interno responsável", valor: "Elisa Nogueira — CRC MG-084.221/O-2" },
        ],
      },
      {
        slug: "inscricoes",
        title: "Inscrições",
        icon: ScrollText,
        desc: "Inscrições federais, estaduais, municipais e específicas.",
        columns: [
          { key: "tipo", label: "Tipo" },
          { key: "orgao", label: "Órgão" },
          { key: "numero", label: "Número", mono: true },
          { key: "situacao", label: "Situação", align: "center" },
        ],
        rows: [
          { tipo: "CNPJ", orgao: "Receita Federal", numero: "12.345.678/0001-90", situacao: "Ativa" },
          { tipo: "Inscrição Estadual", orgao: "SEF/MG", numero: "062.184.220.0044", situacao: "Ativa" },
          { tipo: "Inscrição Estadual ST", orgao: "SEFAZ/SP", numero: "395.028.410.118", situacao: "Ativa" },
          { tipo: "Inscrição Municipal", orgao: "Prefeitura de Betim", numero: "184.221-0", situacao: "Ativa" },
          { tipo: "CEI/CNO", orgao: "Receita Federal", numero: "12.482.10924/91", situacao: "Ativa" },
          { tipo: "NIRE", orgao: "JUCEMG", numero: "31300298401", situacao: "Ativa" },
          { tipo: "SUFRAMA", orgao: "SUFRAMA", numero: "—", situacao: "Não se aplica" },
          { tipo: "Registro CREA/OS", orgao: "CREA-MG", numero: "128.4402/D", situacao: "Ativa" },
        ],
      },
      {
        slug: "pagamentos",
        title: "Pagamentos",
        icon: Banknote,
        desc: "Contas correntes, chaves PIX e formas de pagamento cadastradas.",
        columns: [
          { key: "banco", label: "Banco" },
          { key: "agencia", label: "Agência", mono: true },
          { key: "conta", label: "Conta", mono: true },
          { key: "tipo", label: "Tipo" },
          { key: "saldo", label: "Saldo atual", align: "right", mono: true },
          { key: "situacao", label: "Situação", align: "center" },
        ],
        rows: [
          { banco: "Itaú", agencia: "0325-2", conta: "12.480-9", tipo: "Corrente PJ", saldo: brl(842_120.55), situacao: "Ativa" },
          { banco: "Bradesco", agencia: "1204-7", conta: "94.221-1", tipo: "Corrente PJ", saldo: brl(214_800.12), situacao: "Ativa" },
          { banco: "Santander", agencia: "3092-1", conta: "01.882.402-4", tipo: "Investimento", saldo: brl(1_240_800.00), situacao: "Ativa" },
          { banco: "Caixa Econômica", agencia: "0044-8", conta: "1.284-0", tipo: "FGTS convênio", saldo: brl(48_212.44), situacao: "Ativa" },
          { banco: "PIX chave CNPJ", agencia: "—", conta: "12.345.678/0001-90", tipo: "Recebimento", saldo: brl(0), situacao: "Ativa" },
          { banco: "BB Empresas", agencia: "1220-3", conta: "48.842-6", tipo: "Folha de pagamento", saldo: brl(0), situacao: "Suspensa" },
        ],
      },
      {
        slug: "parametros",
        title: "Parâmetros",
        icon: Cog,
        desc: "Parâmetros operacionais da empresa (contábeis, fiscais e sistema).",
        columns: [
          { key: "grupo", label: "Grupo" },
          { key: "parametro", label: "Parâmetro" },
          { key: "valor", label: "Valor" },
        ],
        rows: [
          { grupo: "Contábil", parametro: "Plano de contas", valor: "PC-ANDRADE 2024" },
          { grupo: "Contábil", parametro: "Moeda funcional", valor: "BRL — Real brasileiro" },
          { grupo: "Contábil", parametro: "Fechamento mensal", valor: "Até dia 15 do mês seguinte" },
          { grupo: "Fiscal", parametro: "Regime PIS/COFINS", valor: "Não cumulativo" },
          { grupo: "Fiscal", parametro: "Escrituração SPED Contábil", valor: "Obrigatória — anual" },
          { grupo: "Fiscal", parametro: "Layout NF-e", valor: "4.00" },
          { grupo: "Folha", parametro: "Período aquisitivo", valor: "Data de admissão" },
          { grupo: "Folha", parametro: "Pagamento salários", valor: "5º dia útil" },
          { grupo: "Sistema", parametro: "Certificado digital padrão", valor: "A1 — CN=ANDRADE METALURGICA" },
          { grupo: "Sistema", parametro: "Ambiente eSocial", valor: "Produção Restrita" },
        ],
      },
      {
        slug: "certificados",
        title: "Certificados",
        icon: Award,
        desc: "Certificados digitais A1/A3 vinculados à empresa.",
        columns: [
          { key: "titular", label: "Titular" },
          { key: "tipo", label: "Tipo", align: "center" },
          { key: "ac", label: "Autoridade certificadora" },
          { key: "emissao", label: "Emissão", mono: true },
          { key: "validade", label: "Validade", mono: true },
          { key: "uso", label: "Uso" },
          { key: "situacao", label: "Situação", align: "center" },
        ],
        rows: [
          { titular: "ANDRADE METALURGICA:12345678000190", tipo: "A1", ac: "AC Certisign RFB G5", emissao: "12/12/2023", validade: "12/12/2025", uso: "NF-e · eSocial · DCTFWeb", situacao: "Ativo" },
          { titular: "ANDRADE METALURGICA:12345678000190", tipo: "A3", ac: "AC Serasa RFB v5", emissao: "08/03/2023", validade: "08/03/2026", uso: "e-CAC · Procurações", situacao: "Ativo" },
          { titular: "MARCOS ANDRADE:12847092104", tipo: "A1", ac: "AC Certisign PF G5", emissao: "01/04/2024", validade: "01/04/2025", uso: "Assinatura contratos", situacao: "Ativo" },
          { titular: "ANDRADE FILIAL SUL:12345678000271", tipo: "A1", ac: "AC Soluti RFB G5", emissao: "15/08/2023", validade: "15/08/2024", uso: "NF-e filial", situacao: "Vencido" },
          { titular: "ELISA NOGUEIRA:04812029410", tipo: "A3", ac: "AC OAB", emissao: "22/02/2024", validade: "22/02/2027", uso: "Assinatura DCTF", situacao: "Ativo" },
        ],
      },
    ],
  },
];


// ------------------------------------------------------------
// FINANCEIRO
// ------------------------------------------------------------
const financeiro: Category[] = [
  {
    slug: "cadastros",
    title: "Cadastros",
    modules: [
      {
        slug: "servicos",
        title: "Serviços",
        icon: Briefcase,
        desc: "Catálogo de serviços faturáveis.",
        columns: [
          C.codigo,
          { key: "servico", label: "Serviço" },
          { key: "cnae", label: "CNAE", mono: true },
          { key: "iss", label: "Alíq. ISS", align: "right", mono: true },
          { key: "valor", label: "Preço base", align: "right", mono: true },
        ],
        rows: [
          { codigo: "SVC-001", servico: "Consultoria contábil mensal", cnae: "6920-6/01", iss: "5,00%", valor: brl(4_200) },
          { codigo: "SVC-002", servico: "Escrituração fiscal", cnae: "6920-6/01", iss: "5,00%", valor: brl(1_800) },
          { codigo: "SVC-003", servico: "Folha de pagamento (por colab.)", cnae: "6920-6/01", iss: "5,00%", valor: brl(38) },
          { codigo: "SVC-004", servico: "Abertura de empresa", cnae: "6920-6/01", iss: "5,00%", valor: brl(1_400) },
          { codigo: "SVC-005", servico: "Planejamento tributário", cnae: "7020-4/00", iss: "2,50%", valor: brl(12_000) },
        ],
      },
      {
        slug: "produtos",
        title: "Produtos",
        icon: Package,
        desc: "Cadastro fiscal com NCM, CEST, CFOP e tributação.",
        columns: [C.codigo, { key: "descricao", label: "Produto" }, { key: "ncm", label: "NCM", mono: true }],
        rows: [],
      },
      {
        slug: "clientes-fornecedores",
        title: "Clientes e fornecedores",
        icon: Users2,
        desc: "Parceiros com regime, inscrições e retenções.",
        columns: [{ key: "nome", label: "Parceiro" }, { key: "documento", label: "CNPJ/CPF", mono: true }, { key: "uf", label: "UF" }],
        rows: [],
      },
    ],
  },

  {
    slug: "tabelas",
    title: "Tabelas",
    modules: [
      {
        slug: "simei",
        title: "SIMEI",
        icon: Coins,
        desc: "Valor mensal do MEI por atividade.",
        columns: [
          { key: "atividade", label: "Atividade" },
          { key: "inss", label: "INSS", align: "right", mono: true },
          { key: "icms", label: "ICMS", align: "right", mono: true },
          { key: "iss", label: "ISS", align: "right", mono: true },
          { key: "total", label: "Total mensal", align: "right", mono: true },
        ],
        rows: [
          { atividade: "Comércio ou indústria", inss: brl(70.6), icms: brl(1), iss: brl(0), total: brl(71.6) },
          { atividade: "Serviços", inss: brl(70.6), icms: brl(0), iss: brl(5), total: brl(75.6) },
          { atividade: "Comércio e serviços", inss: brl(70.6), icms: brl(1), iss: brl(5), total: brl(76.6) },
        ],
      },
      tabelasFaixas("simples-nacional", "Simples Nacional", "Anexo I — Comércio", [
        ["1ª", "Até R$ 180.000", "4,00%"],
        ["2ª", "Até R$ 360.000", "7,30%"],
        ["3ª", "Até R$ 720.000", "9,50%"],
        ["4ª", "Até R$ 1.800.000", "10,70%"],
        ["5ª", "Até R$ 3.600.000", "14,30%"],
        ["6ª", "Até R$ 4.800.000", "19,00%"],
      ]),
      {
        slug: "lucro-real",
        title: "Lucro Real",
        icon: TrendingUp,
        desc: "Alíquotas e adicionais no Lucro Real.",
        columns: [
          { key: "tributo", label: "Tributo" },
          { key: "aliq", label: "Alíquota", align: "right", mono: true },
          { key: "base", label: "Base" },
        ],
        rows: [
          { tributo: "IRPJ", aliq: "15,00%", base: "Lucro real trimestral" },
          { tributo: "IRPJ adicional", aliq: "10,00%", base: "Excedente a R$ 60.000/trim." },
          { tributo: "CSLL", aliq: "9,00%", base: "Resultado ajustado" },
          { tributo: "PIS não cumulativo", aliq: "1,65%", base: "Receita bruta" },
          { tributo: "COFINS não cumulativo", aliq: "7,60%", base: "Receita bruta" },
        ],
      },
      {
        slug: "lucro-presumido",
        title: "Lucro Presumido",
        icon: TrendingUp,
        desc: "Percentuais de presunção por atividade.",
        columns: [
          { key: "atividade", label: "Atividade" },
          { key: "irpj", label: "Presunção IRPJ", align: "right", mono: true },
          { key: "csll", label: "Presunção CSLL", align: "right", mono: true },
        ],
        rows: [
          { atividade: "Comércio / Indústria", irpj: "8,00%", csll: "12,00%" },
          { atividade: "Transporte de carga", irpj: "8,00%", csll: "12,00%" },
          { atividade: "Serviços em geral", irpj: "32,00%", csll: "32,00%" },
          { atividade: "Serviços hospitalares", irpj: "8,00%", csll: "12,00%" },
          { atividade: "Revenda combustíveis", irpj: "1,60%", csll: "12,00%" },
        ],
      },
      {
        slug: "ajuste-apuracao",
        title: "Ajuste de apuração",
        icon: FileCog,
        desc: "Ajustes lançados na apuração mensal.",
        columns: [
          C.codigo, { key: "descricao", label: "Descrição" }, { key: "tributo", label: "Tributo" }, { key: "valor", label: "Valor", align: "right", mono: true },
        ],
        rows: [
          { codigo: "AJ-01", descricao: "Estorno crédito ICMS uso e consumo", tributo: "ICMS", valor: brl(-4_212) },
          { codigo: "AJ-02", descricao: "Adição temporária provisão trabalhista", tributo: "IRPJ", valor: brl(48_200) },
          { codigo: "AJ-03", descricao: "Exclusão dividendos recebidos", tributo: "IRPJ", valor: brl(-12_400) },
          { codigo: "AJ-04", descricao: "Crédito PIS insumos", tributo: "PIS", valor: brl(-8_412) },
        ],
      },
      {
        slug: "ajuste-documento-fiscal",
        title: "Ajuste documento fiscal",
        icon: FileSpreadsheet,
        desc: "Correções em documentos fiscais escriturados.",
        columns: [
          { key: "nfe", label: "NF-e", mono: true }, { key: "emissao", label: "Emissão", mono: true }, { key: "ajuste", label: "Ajuste" }, { key: "valor", label: "Valor", align: "right", mono: true },
        ],
        rows: [
          { nfe: "44821", emissao: "31/10/2024", ajuste: "CFOP corrigido 5102 → 5405", valor: brl(0) },
          { nfe: "44780", emissao: "22/10/2024", ajuste: "Base ICMS-ST redimensionada", valor: brl(-1_240) },
          { nfe: "44712", emissao: "14/10/2024", ajuste: "Inclusão CFOP 5949", valor: brl(320) },
          { nfe: "44659", emissao: "08/10/2024", ajuste: "Correção NCM 8481.80.99", valor: brl(0) },
        ],
      },
      {
        slug: "apuracao-pis-cofins",
        title: "Apuração PIS/COFINS",
        icon: PieChart,
        desc: "Apuração consolidada de contribuições.",
        columns: [
          { key: "grupo", label: "Grupo" }, { key: "base", label: "Base", align: "right", mono: true }, { key: "pis", label: "PIS", align: "right", mono: true }, { key: "cofins", label: "COFINS", align: "right", mono: true },
        ],
        rows: [
          { grupo: "Receitas tributáveis", base: brl(3_930_164), pis: brl(64_847), cofins: brl(298_692) },
          { grupo: "Créditos insumos", base: brl(2_128_490), pis: brl(-35_120), cofins: brl(-161_765) },
          { grupo: "Créditos energia", base: brl(48_212), pis: brl(-795), cofins: brl(-3_664) },
          { grupo: "Saldo apurado", base: brl(1_753_462), pis: brl(28_932), cofins: brl(133_263) },
        ],
      },
    ],
  },
  {
    slug: "movimentos",
    title: "Movimentos",
    modules: [
      {
        slug: "servicos",
        title: "Serviços",
        icon: Briefcase,
        desc: "NFS-e emitidas no período.",
        columns: [
          { key: "nfse", label: "NFS-e", mono: true }, { key: "data", label: "Data", mono: true }, { key: "tomador", label: "Tomador" }, { key: "servico", label: "Serviço" }, { key: "valor", label: "Valor", align: "right", mono: true },
        ],
        rows: Array.from({ length: 8 }, (_, i) => ({
          nfse: String(9820 + i),
          data: dateBr(i + 2),
          tomador: pick(EMPRESAS, i),
          servico: pick(["Consultoria contábil", "Escrituração fiscal", "Folha", "Planejamento tributário"], i),
          valor: brl(1_800 + i * 620),
        })),
      },
      {
        slug: "faturamento",
        title: "Faturamento",
        icon: Wallet,
        desc: "NF-e de saída (mercadorias).",
        columns: [
          { key: "nfe", label: "NF-e", mono: true }, { key: "data", label: "Data", mono: true }, { key: "cliente", label: "Cliente" }, { key: "cfop", label: "CFOP", mono: true }, { key: "valor", label: "Valor", align: "right", mono: true },
        ],
        rows: Array.from({ length: 8 }, (_, i) => ({
          nfe: String(44810 + i),
          data: dateBr(i),
          cliente: pick(EMPRESAS, i + 1),
          cfop: pick(["5102", "5405", "5910", "6102"], i),
          valor: brl(4_200 + i * 1840),
        })),
      },
      {
        slug: "conclusao-fiscal",
        title: "Conclusão fiscal",
        icon: ClipboardCheck,
        desc: "Encerramento fiscal por empresa/competência.",
        columns: [
          { key: "empresa", label: "Empresa" }, { key: "competencia", label: "Competência", mono: true }, { key: "encerrado", label: "Encerrado em", mono: true }, C.status,
        ],
        rows: [
          { empresa: "Metalúrgica Andrade S.A.", competencia: "09/2024", encerrado: "10/10/2024", status: "Concluído" },
          { empresa: "TechCore Sistemas ME", competencia: "09/2024", encerrado: "08/10/2024", status: "Concluído" },
          { empresa: "Metalúrgica Andrade S.A.", competencia: "10/2024", encerrado: "—", status: "Em aberto" },
          { empresa: "Panificadora Real Ltda.", competencia: "10/2024", encerrado: "—", status: "Em aberto" },
        ],
      },
      {
        slug: "demais-documentos",
        title: "Demais documentos",
        icon: FileText,
        desc: "CT-e, NFC-e e demais documentos fiscais.",
        columns: [
          { key: "doc", label: "Documento", mono: true }, { key: "tipo", label: "Tipo" }, { key: "data", label: "Data", mono: true }, { key: "valor", label: "Valor", align: "right", mono: true },
        ],
        rows: [
          { doc: "CT-e 3221", tipo: "Conhecimento transporte", data: "28/10/2024", valor: brl(4_120) },
          { doc: "CT-e 3222", tipo: "Conhecimento transporte", data: "29/10/2024", valor: brl(2_840) },
          { doc: "NFC-e 812", tipo: "Cupom fiscal", data: "31/10/2024", valor: brl(310.55) },
          { doc: "MDF-e 118", tipo: "Manifesto de carga", data: "27/10/2024", valor: brl(0) },
        ],
      },
    ],
  },
  {
    slug: "tributacao",
    title: "Tributação",
    modules: [
      {
        slug: "difal",
        title: "DIFAL",
        icon: Percent,
        desc: "Diferencial de alíquota ICMS interestadual.",
        columns: [
          { key: "nfe", label: "NF-e", mono: true }, { key: "uforigem", label: "UF Origem" }, { key: "ufdest", label: "UF Destino" }, { key: "base", label: "Base", align: "right", mono: true }, { key: "difal", label: "DIFAL", align: "right", mono: true },
        ],
        rows: [
          { nfe: "44810", uforigem: "SP", ufdest: "MG", base: brl(12_400), difal: brl(620) },
          { nfe: "44814", uforigem: "SP", ufdest: "RS", base: brl(28_200), difal: brl(1_692) },
          { nfe: "44819", uforigem: "SP", ufdest: "BA", base: brl(9_800), difal: brl(686) },
          { nfe: "44820", uforigem: "SP", ufdest: "PE", base: brl(14_200), difal: brl(994) },
        ],
      },
      {
        slug: "st-icms",
        title: "ST de ICMS",
        icon: Scale,
        desc: "Substituição tributária de ICMS.",
        columns: [
          { key: "nfe", label: "NF-e", mono: true }, { key: "ncm", label: "NCM", mono: true }, { key: "mva", label: "MVA", align: "right", mono: true }, { key: "baseST", label: "Base ST", align: "right", mono: true }, { key: "icmsST", label: "ICMS-ST", align: "right", mono: true },
        ],
        rows: [
          { nfe: "44810", ncm: "8481.80.99", mva: "44,20%", baseST: brl(17_884), icmsST: brl(3_218) },
          { nfe: "44814", ncm: "7326.90.90", mva: "38,10%", baseST: brl(38_924), icmsST: brl(7_006) },
          { nfe: "44819", ncm: "8544.42.00", mva: "52,00%", baseST: brl(14_896), icmsST: brl(2_681) },
        ],
      },
      {
        slug: "defis",
        title: "DEFIS",
        icon: FileBarChart2,
        desc: "Declaração de Informações Socioeconômicas e Fiscais (Simples).",
        columns: [
          { key: "empresa", label: "Empresa" }, { key: "anoBase", label: "Ano-base", mono: true }, { key: "receita", label: "Receita bruta", align: "right", mono: true }, C.status,
        ],
        rows: [
          { empresa: "Panificadora Real Ltda.", anoBase: "2023", receita: brl(1_820_400), status: "Transmitida" },
          { empresa: "TechCore Sistemas ME", anoBase: "2023", receita: brl(612_240), status: "Transmitida" },
          { empresa: "Comércio Andes Eireli", anoBase: "2023", receita: brl(2_412_800), status: "Retificada" },
        ],
      },
      {
        slug: "avancada",
        title: "Tributação avançada",
        icon: Sparkles,
        desc: "Monofásico, drawback, ZFM, suspensão, diferimento e incentivos.",
        columns: [{ key: "motor", label: "Motor" }, { key: "tributo", label: "Tributo" }],
        rows: [],
      },
      {
        slug: "motor-tributario",
        title: "Motor tributário",
        icon: Cog,
        desc: "Rule engine com vigência, UF, versão e correção sugerida.",
        columns: [{ key: "regra", label: "Regra" }, { key: "categoria", label: "Categoria" }],
        rows: [],
      },
      {
        slug: "dashboard-executivo",
        title: "Dashboard executivo",
        icon: Gauge,
        desc: "KPIs de faturamento, carga tributária e compliance.",
        columns: [{ key: "indicador", label: "Indicador" }, { key: "valor", label: "Valor", align: "right", mono: true }],
        rows: [],
      },
    ],

  },
  {
    slug: "operacional",
    title: "Operacional",
    modules: [
      {
        slug: "conciliacao",
        title: "Conciliação bancária",
        icon: Landmark,
        desc: "Conciliação de extratos bancários com a movimentação contábil.",
        columns: [
          { key: "conta", label: "Conta", mono: true },
          { key: "banco", label: "Banco" },
          { key: "agencia", label: "Agência", mono: true },
          { key: "saldoBanco", label: "Saldo banco", align: "right", mono: true },
          { key: "saldoContabil", label: "Saldo contábil", align: "right", mono: true },
          { key: "diferenca", label: "Diferença", align: "right", mono: true },
          { key: "status", label: "Status" },
        ],
        rows: [
          { conta: "237 / CC 12345-6", banco: "Bradesco", agencia: "1234", saldoBanco: "R$ 1.248.920,33", saldoContabil: "R$ 1.248.920,33", diferenca: "R$ 0,00", status: "Conciliado" },
          { conta: "341 / CC 98765-4", banco: "Itaú", agencia: "5678", saldoBanco: "R$ 842.115,50", saldoContabil: "R$ 841.315,50", diferenca: "R$ 800,00", status: "Divergente" },
          { conta: "001 / CC 45678-9", banco: "Banco do Brasil", agencia: "9012", saldoBanco: "R$ 315.440,00", saldoContabil: "R$ 315.440,00", diferenca: "R$ 0,00", status: "Conciliado" },
          { conta: "104 / CC 00012-3", banco: "Caixa Econômica", agencia: "3456", saldoBanco: "R$ 0,00", saldoContabil: "R$ 0,00", diferenca: "R$ 0,00", status: "Não utilizada" },
        ],
      },
    ],

  },
  {
    slug: "demonstracoes",
    title: "Demonstrações",
    modules: [
      {
        slug: "dre",
        title: "DRE",
        icon: TrendingUp,
        desc: "Demonstração do resultado da competência, com análise vertical, horizontal e ajustes de encerramento.",
        columns: [
          { key: "conta", label: "Conta" },
          { key: "valor", label: "Competência", align: "right", mono: true },
          { key: "av", label: "AV %", align: "right", mono: true },
        ],
        rows: [],
      },
    ],

  },
];


// helper for "tabela por faixas" pattern used in financeiro/tabelas
function tabelasFaixas(
  slug: string,
  title: string,
  descRotulo: string,
  rows: Array<[string, string, string]>,
): Module {
  return {
    slug,
    title,
    icon: Percent,
    desc: `${descRotulo} — faixas vigentes.`,
    columns: [
      { key: "faixa", label: "Faixa" },
      { key: "receita", label: "Receita bruta 12m", align: "right", mono: true },
      { key: "aliq", label: "Alíquota nominal", align: "right", mono: true },
    ],
    rows: rows.map(([faixa, receita, aliq]) => ({ faixa, receita, aliq })),
  };
}

// ------------------------------------------------------------
// AREAS export
// ------------------------------------------------------------
export const AREAS: Area[] = [
  {
    slug: "preparativos",
    title: "Preparativos",
    code: "02",
    icon: Settings2,
    accent: "blue",
    eyebrow: "Setup corporativo",
    blurb: "Cadastros base do grupo: matriz, filiais, empresas do grupo e catálogo de serviços internos.",
    categories: preparativos,
  },
  {
    slug: "fiscal",
    title: "Fiscal",
    code: "03",
    icon: Receipt,
    accent: "orange",
    eyebrow: "Documentos & obrigações",
    blurb: "Documentos fiscais, escrituração, apurações, obrigações acessórias e guias das empresas do grupo.",
    categories: fiscal,
  },
  {
    slug: "financeiro",
    title: "Financeiro",
    code: "04",
    icon: Wallet,
    accent: "orange",
    eyebrow: "Tributário",
    blurb: "Faturamento, apurações e regimes tributários das empresas do grupo.",
    categories: financeiro,
  },
  {
    slug: "administrativo",
    title: "Administrativo",
    code: "05",
    icon: Briefcase,
    accent: "purple",
    eyebrow: "Rotina corporativa",
    blurb: "Cadastros, contas a pagar e receber, contratos, patrimônio, compras e controles internos.",
    categories: administrativo,
  },
];


export const AREA_MAP = Object.fromEntries(AREAS.map((a) => [a.slug, a]));

export function findArea(areaSlug?: string) {
  if (!areaSlug) return undefined;
  return AREA_MAP[areaSlug];
}
export function findCategory(areaSlug?: string, catSlug?: string) {
  const area = findArea(areaSlug);
  if (!area || !catSlug) return { area };
  const category = area.categories.find((c) => c.slug === catSlug);
  return { area, category };
}
export function findModule(areaSlug?: string, catSlug?: string, modSlug?: string) {
  const { area, category } = findCategory(areaSlug, catSlug);
  if (!category || !modSlug) return { area, category };
  const module = category.modules.find((m) => m.slug === modSlug);
  return { area, category, module };
}
