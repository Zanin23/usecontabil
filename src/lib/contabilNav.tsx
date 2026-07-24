import {
  Settings2, Users2, Wallet, Building2, Briefcase, ClipboardList, ListTree, Layers,
  Workflow, CheckSquare, FileArchive, Calculator, Table2, UserCheck, UserPlus, Scale,
  MapPin, Wallet2, CalendarClock, Plane, HeartPulse, Fingerprint, CalendarX2, FileDown,
  FileUp, Timer, ArrowDownToLine, Receipt, PartyPopper, Gift, FileText, UserSquare2,
  Stethoscope, BarChart3, PieChart, LineChart, ClipboardCheck, Radio, FileCog, Award,
  Database, ListChecks, Lock, Send, Fingerprint as Punch, Landmark, FolderArchive, Split,
  Percent, FileSpreadsheet, Coins, TrendingUp, ScrollText, Banknote, FileBarChart2,
  BadgeDollarSign, Cog, type LucideIcon,
} from "lucide-react";

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
        rows: [
          { codigo: "UN-001", nome: "Matriz — Sede administrativa", cidade: "São Paulo/SP", responsavel: "M. Andrade", status: "Ativa" },
          { codigo: "UN-002", nome: "Filial Sul", cidade: "Porto Alegre/RS", responsavel: "R. Prado", status: "Ativa" },
          { codigo: "UN-003", nome: "Filial Nordeste", cidade: "Recife/PE", responsavel: "C. Mendes", status: "Ativa" },
          { codigo: "UN-004", nome: "Unidade Fabril", cidade: "Betim/MG", responsavel: "H. Vilela", status: "Ativa" },
          { codigo: "UN-005", nome: "Centro de Distribuição Sul", cidade: "Curitiba/PR", responsavel: "E. Nogueira", status: "Inativa" },
        ],
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
        rows: Array.from({ length: 6 }, (_, i) => ({
          cnpj: cnpj(i + 1),
          razao: pick(EMPRESAS, i),
          regime: pick(["Lucro Real", "Simples Nacional", "Lucro Presumido", "SIMEI"], i),
          atividade: pick(["Indústria", "Comércio", "Serviços", "Transporte"], i),
          status: "Ativa",
        })),
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
// PESSOAL — helpers used across many modules
// ------------------------------------------------------------
const inssTab = tabelaFaixas("Salário até", [
  ["1", brl(1412.0), "7,50%"],
  ["2", brl(2666.68), "9,00%"],
  ["3", brl(4000.03), "12,00%"],
  ["4", brl(7786.02), "14,00%"],
]);
const irrfTab = tabelaFaixas("Base até", [
  ["Isento", brl(2259.2), "0,00%"],
  ["1", brl(2826.65), "7,50%"],
  ["2", brl(3751.05), "15,00%"],
  ["3", brl(4664.68), "22,50%"],
  ["4", "acima", "27,50%"],
]);

const pessoal: Category[] = [
  {
    slug: "cadastros",
    title: "Cadastros",
    modules: [
      {
        slug: "rendimentos-descontos",
        title: "Rendimentos e descontos",
        icon: Calculator,
        desc: "Eventos que compõem proventos e descontos da folha.",
        columns: [
          C.codigo,
          { key: "evento", label: "Evento" },
          { key: "tipo", label: "Tipo" },
          { key: "base", label: "Base cálc." },
          { key: "incide", label: "Incidências" },
        ],
        rows: [
          { codigo: "001", evento: "Salário base", tipo: "Provento", base: "Horas", incide: "INSS · IRRF · FGTS" },
          { codigo: "005", evento: "Hora extra 50%", tipo: "Provento", base: "Horas", incide: "INSS · IRRF · FGTS" },
          { codigo: "012", evento: "Adicional noturno", tipo: "Provento", base: "% Salário", incide: "INSS · IRRF · FGTS" },
          { codigo: "101", evento: "INSS", tipo: "Desconto", base: "Bruto", incide: "—" },
          { codigo: "103", evento: "IRRF", tipo: "Desconto", base: "Bruto − INSS − Deps.", incide: "—" },
          { codigo: "110", evento: "Vale-transporte", tipo: "Desconto", base: "6% Salário", incide: "—" },
          { codigo: "115", evento: "Plano de saúde", tipo: "Desconto", base: "Valor fixo", incide: "—" },
        ],
      },
      {
        slug: "base-calculo",
        title: "Base de cálculo",
        icon: Table2,
        desc: "Bases usadas por eventos e tributos.",
        columns: [
          C.codigo,
          { key: "base", label: "Base" },
          { key: "formula", label: "Fórmula" },
        ],
        rows: [
          { codigo: "BC-01", base: "Base INSS", formula: "Proventos tributáveis" },
          { codigo: "BC-02", base: "Base IRRF", formula: "Bruto − INSS − Dependentes − Pensão" },
          { codigo: "BC-03", base: "Base FGTS", formula: "Proventos tributáveis" },
          { codigo: "BC-04", base: "Base 13º", formula: "Média 12m proventos fixos + variáveis" },
          { codigo: "BC-05", base: "Base férias", formula: "Salário + médias + 1/3 constitucional" },
        ],
      },
      {
        slug: "tipo-evento",
        title: "Tipo de evento",
        icon: ListTree,
        desc: "Classificação dos eventos usados na folha.",
        columns: [
          C.codigo,
          { key: "tipo", label: "Tipo" },
          { key: "natureza", label: "Natureza" },
        ],
        rows: [
          { codigo: "1", tipo: "Provento", natureza: "Soma no bruto" },
          { codigo: "2", tipo: "Desconto", natureza: "Subtrai do bruto" },
          { codigo: "3", tipo: "Base", natureza: "Compõe base de cálculo" },
          { codigo: "4", tipo: "Informativo", natureza: "Não impacta líquido" },
          { codigo: "5", tipo: "Provisão", natureza: "Apenas contábil" },
        ],
      },
      {
        slug: "esocial",
        title: "eSocial (cadastro)",
        icon: Radio,
        desc: "Parâmetros de eventos S-1000 até S-5000.",
        columns: [
          { key: "codigo", label: "Evento", mono: true },
          { key: "descricao", label: "Descrição" },
          { key: "grupo", label: "Grupo" },
          C.status,
        ],
        rows: [
          { codigo: "S-1000", descricao: "Informações do empregador", grupo: "Tabelas", status: "Ativo" },
          { codigo: "S-1005", descricao: "Estabelecimentos", grupo: "Tabelas", status: "Ativo" },
          { codigo: "S-1010", descricao: "Rubricas", grupo: "Tabelas", status: "Ativo" },
          { codigo: "S-1200", descricao: "Remuneração do trabalhador", grupo: "Periódico", status: "Ativo" },
          { codigo: "S-1210", descricao: "Pagamentos de rendimentos", grupo: "Periódico", status: "Ativo" },
          { codigo: "S-2200", descricao: "Admissão", grupo: "Não periódico", status: "Ativo" },
          { codigo: "S-2299", descricao: "Desligamento", grupo: "Não periódico", status: "Ativo" },
        ],
      },
      {
        slug: "classe-funcionario",
        title: "Classe funcionário",
        icon: UserSquare2,
        desc: "Grupos funcionais para regras diferenciadas.",
        columns: [
          C.codigo,
          { key: "classe", label: "Classe" },
          { key: "sindicato", label: "Sindicato" },
          { key: "colab", label: "Colaboradores", align: "right", mono: true },
        ],
        rows: [
          { codigo: "CL-01", classe: "Administrativo", sindicato: "SEAAC-SP", colab: 42 },
          { codigo: "CL-02", classe: "Produção", sindicato: "STIMM-BH", colab: 118 },
          { codigo: "CL-03", classe: "Comercial", sindicato: "SEC-SP", colab: 24 },
          { codigo: "CL-04", classe: "Motoristas", sindicato: "SINDMOT", colab: 12 },
          { codigo: "CL-05", classe: "Diretoria", sindicato: "—", colab: 6 },
        ],
      },
      {
        slug: "ferias-direitos",
        title: "Férias e direitos",
        icon: Plane,
        desc: "Regras de aquisição de férias por classe.",
        columns: [
          C.codigo,
          { key: "regra", label: "Regra" },
          { key: "aquisitivo", label: "Período aquisitivo" },
          { key: "dias", label: "Dias", align: "right", mono: true },
        ],
        rows: [
          { codigo: "F-01", regra: "Regra CLT padrão", aquisitivo: "12 meses", dias: 30 },
          { codigo: "F-02", regra: "Faltas 6–14 dias", aquisitivo: "12 meses", dias: 24 },
          { codigo: "F-03", regra: "Faltas 15–23 dias", aquisitivo: "12 meses", dias: 18 },
          { codigo: "F-04", regra: "Faltas 24–32 dias", aquisitivo: "12 meses", dias: 12 },
          { codigo: "F-05", regra: "Regime proporcional", aquisitivo: "Meses trabalhados", dias: 30 },
        ],
      },
      {
        slug: "afastamentos",
        title: "Afastamentos",
        icon: CalendarX2,
        desc: "Motivos de afastamento cadastrados.",
        columns: [
          C.codigo,
          { key: "motivo", label: "Motivo" },
          { key: "categoria", label: "Categoria" },
          { key: "remunerado", label: "Remunerado", align: "center" },
        ],
        rows: [
          { codigo: "01", motivo: "Acidente/doença por acidente de trabalho", categoria: "Acidentário", remunerado: "Sim" },
          { codigo: "03", motivo: "Doença não relacionada ao trabalho", categoria: "Previdenciário", remunerado: "15 dias" },
          { codigo: "17", motivo: "Licença-maternidade", categoria: "Maternidade", remunerado: "Sim" },
          { codigo: "18", motivo: "Licença-paternidade", categoria: "Paternidade", remunerado: "Sim" },
          { codigo: "27", motivo: "Serviço militar", categoria: "Serviço militar", remunerado: "Não" },
        ],
      },
      {
        slug: "motivo-demissao",
        title: "Motivo de demissão",
        icon: FileText,
        desc: "Códigos de rescisão utilizados no eSocial.",
        columns: [
          C.codigo,
          { key: "motivo", label: "Motivo" },
          { key: "verbas", label: "Verbas rescisórias" },
        ],
        rows: [
          { codigo: "02", motivo: "Rescisão sem justa causa por iniciativa do empregador", verbas: "Aviso + Multa 40% FGTS + Férias + 13º" },
          { codigo: "03", motivo: "Rescisão com justa causa por iniciativa do empregador", verbas: "Saldo salário + Férias vencidas" },
          { codigo: "07", motivo: "Rescisão por iniciativa do empregado", verbas: "Saldo + Férias + 13º" },
          { codigo: "11", motivo: "Rescisão por acordo entre as partes", verbas: "Aviso 50% + Multa 20% FGTS + Férias + 13º" },
          { codigo: "17", motivo: "Rescisão por término de contrato experiência", verbas: "Saldo + Férias prop. + 13º prop." },
        ],
      },
    ],
  },
  {
    slug: "tabelas",
    title: "Tabelas",
    modules: [
      { slug: "inss", title: "INSS", icon: Percent, desc: "Alíquotas progressivas de contribuição previdenciária.", columns: inssTab.columns, rows: inssTab.rows },
      { slug: "irrf", title: "IRRF", icon: Percent, desc: "Tabela progressiva mensal do imposto de renda.", columns: irrfTab.columns, rows: irrfTab.rows },
      {
        slug: "salario-minimo",
        title: "Salário mínimo",
        icon: BadgeDollarSign,
        desc: "Histórico do salário mínimo nacional aplicado.",
        columns: [
          { key: "vigencia", label: "Vigência", mono: true },
          { key: "valor", label: "Valor", align: "right", mono: true },
          { key: "decreto", label: "Norma" },
        ],
        rows: [
          { vigencia: "01/2022", valor: brl(1212), decreto: "MP 1.091/2021" },
          { vigencia: "05/2023", valor: brl(1320), decreto: "MP 1.172/2023" },
          { vigencia: "01/2024", valor: brl(1412), decreto: "Decreto 11.864/2023" },
        ],
      },
      {
        slug: "salario-familia",
        title: "Salário família",
        icon: Users2,
        desc: "Cota mensal por filho menor de 14 anos.",
        columns: [
          { key: "faixa", label: "Faixa salarial" },
          { key: "cota", label: "Cota por dependente", align: "right", mono: true },
        ],
        rows: [
          { faixa: "Até R$ 1.819,26", cota: brl(62.04) },
          { faixa: "Acima de R$ 1.819,26", cota: brl(0) },
        ],
      },
      {
        slug: "contrato-sindical",
        title: "Contrato sindical patronal",
        icon: ScrollText,
        desc: "Convenções coletivas vigentes por categoria.",
        columns: [
          C.codigo,
          { key: "categoria", label: "Categoria" },
          { key: "vigencia", label: "Vigência", mono: true },
          { key: "reajuste", label: "Reajuste", align: "right", mono: true },
        ],
        rows: [
          { codigo: "CCT-2024/1", categoria: "Metalúrgicos MG", vigencia: "05/2024–04/2025", reajuste: "5,80%" },
          { codigo: "CCT-2024/2", categoria: "Comerciários SP", vigencia: "09/2024–08/2025", reajuste: "4,90%" },
          { codigo: "CCT-2024/3", categoria: "Motoristas RS", vigencia: "03/2024–02/2025", reajuste: "6,10%" },
          { codigo: "CCT-2024/4", categoria: "Panificação Nacional", vigencia: "07/2024–06/2025", reajuste: "5,20%" },
        ],
      },
    ],
  },
  {
    slug: "colaboradores",
    title: "Colaboradores",
    modules: [
      {
        slug: "empregados",
        title: "Empregados",
        icon: UserCheck,
        desc: "Cadastro completo de colaboradores CLT.",
        columns: [
          { key: "matricula", label: "Matrícula", mono: true },
          { key: "nome", label: "Nome" },
          { key: "cargo", label: "Cargo" },
          { key: "admissao", label: "Admissão", mono: true },
          { key: "salario", label: "Salário", align: "right", mono: true },
          { key: "situacao", label: "Situação", align: "center" },
        ],
        rows: people(12),
        primaryAction: "Novo empregado",
      },
      {
        slug: "autonomos",
        title: "Autônomos",
        icon: UserPlus,
        desc: "Prestadores de serviço pessoa física.",
        columns: [
          { key: "cpf", label: "CPF", mono: true },
          { key: "nome", label: "Nome" },
          { key: "atividade", label: "Atividade" },
          { key: "ultimoPag", label: "Último pagamento", align: "right", mono: true },
        ],
        rows: Array.from({ length: 6 }, (_, i) => ({
          cpf: cpf(i + 4),
          nome: pick(NAMES, i + 5),
          atividade: pick(["Consultoria fiscal", "Manutenção elétrica", "Transporte", "Design", "Auditoria", "TI"], i),
          ultimoPag: brl(1800 + i * 620),
        })),
      },
      {
        slug: "processo-trabalhista",
        title: "Processo trabalhista",
        icon: Scale,
        desc: "Processos ativos e provisões trabalhistas.",
        columns: [
          { key: "processo", label: "Processo", mono: true },
          { key: "reclamante", label: "Reclamante" },
          { key: "valor", label: "Valor causa", align: "right", mono: true },
          { key: "fase", label: "Fase" },
          { key: "risco", label: "Risco", align: "center" },
        ],
        rows: [
          { processo: "0012345-11.2024.5.02", reclamante: "Marco Ribeiro", valor: brl(48_200), fase: "Conhecimento", risco: "Médio" },
          { processo: "0022891-04.2024.5.03", reclamante: "Sueli Freitas", valor: brl(112_800), fase: "Instrução", risco: "Alto" },
          { processo: "0031102-77.2023.5.02", reclamante: "Pedro Almeida", valor: brl(22_400), fase: "Execução", risco: "Baixo" },
          { processo: "0009834-02.2024.5.04", reclamante: "Luana Freitas", valor: brl(64_150), fase: "Recursal", risco: "Médio" },
        ],
      },
    ],
  },
  {
    slug: "setores",
    title: "Setores",
    modules: [
      {
        slug: "tomador-servicos",
        title: "Tomador de serviços",
        icon: MapPin,
        desc: "Tomadores para rateio de folha e SEFIP.",
        columns: [
          { key: "cnpj", label: "CNPJ tomador", mono: true },
          { key: "nome", label: "Tomador" },
          { key: "obra", label: "Obra/CNO" },
          { key: "colab", label: "Colaboradores alocados", align: "right", mono: true },
        ],
        rows: Array.from({ length: 5 }, (_, i) => ({
          cnpj: cnpj(i + 20),
          nome: pick(["Construtora Alvorada", "Petrocore Refinaria", "Aeroporto GRU", "Shopping Centro Leste", "Hospital Vida Nova"], i),
          obra: `CNO ${String(100200 + i * 137)}`,
          colab: 8 + i * 4,
        })),
      },
      {
        slug: "centro-custo",
        title: "Centro de custo",
        icon: Layers,
        desc: "Centros de custo para rateio contábil.",
        columns: [
          C.codigo,
          { key: "centro", label: "Centro de custo" },
          { key: "gestor", label: "Gestor" },
          { key: "colab", label: "Colaboradores", align: "right", mono: true },
        ],
        rows: CENTROS.map((c, i) => ({
          codigo: `CC-${String(10 + i * 5).padStart(3, "0")}`,
          centro: c,
          gestor: pick(NAMES, i + 1),
          colab: 12 + i * 7,
        })),
      },
    ],
  },
  {
    slug: "preparacoes",
    title: "Preparações",
    modules: [
      {
        slug: "movimento-fixo",
        title: "Movimento fixo",
        icon: CalendarClock,
        desc: "Eventos fixos aplicados em toda folha do colaborador.",
        columns: [
          { key: "matricula", label: "Matrícula", mono: true },
          { key: "nome", label: "Colaborador" },
          { key: "evento", label: "Evento" },
          { key: "valor", label: "Valor", align: "right", mono: true },
        ],
        rows: people(8).map((r, i) => ({
          matricula: r.matricula, nome: r.nome,
          evento: pick(["Adic. periculosidade", "Quebra de caixa", "Adic. tempo serviço", "Comissão fixa"], i),
          valor: brl(180 + i * 92.5),
        })),
      },
      {
        slug: "movimento-variavel",
        title: "Movimento variável",
        icon: CalendarClock,
        desc: "Lançamentos variáveis do mês (horas, comissões, faltas).",
        columns: [
          { key: "matricula", label: "Matrícula", mono: true },
          { key: "nome", label: "Colaborador" },
          { key: "evento", label: "Evento" },
          { key: "qtd", label: "Qtd.", align: "right", mono: true },
          { key: "valor", label: "Valor", align: "right", mono: true },
        ],
        rows: people(8).map((r, i) => ({
          matricula: r.matricula, nome: r.nome,
          evento: pick(["Hora extra 50%", "Hora extra 100%", "DSR s/ HE", "Comissão", "Prêmio produção"], i),
          qtd: (2 + i * 1.5).toFixed(1),
          valor: brl(120 + i * 74),
        })),
      },
      {
        slug: "adiantamento",
        title: "Adiantamento",
        icon: ArrowDownToLine,
        desc: "Prévia do adiantamento quinzenal.",
        columns: [
          { key: "matricula", label: "Matrícula", mono: true },
          { key: "nome", label: "Colaborador" },
          { key: "percentual", label: "%", align: "right", mono: true },
          { key: "valor", label: "Valor adiant.", align: "right", mono: true },
        ],
        rows: people(8).map((r, i) => ({
          matricula: r.matricula, nome: r.nome,
          percentual: "40%",
          valor: brl(960 + i * 274),
        })),
      },
      {
        slug: "plano-saude",
        title: "Plano de saúde",
        icon: HeartPulse,
        desc: "Vínculos ativos por operadora.",
        columns: [
          { key: "matricula", label: "Matrícula", mono: true },
          { key: "nome", label: "Titular" },
          { key: "operadora", label: "Operadora" },
          { key: "dependentes", label: "Depend.", align: "right", mono: true },
          { key: "mensalidade", label: "Mensalidade", align: "right", mono: true },
        ],
        rows: people(8).map((r, i) => ({
          matricula: r.matricula, nome: r.nome,
          operadora: pick(["Unimed", "Bradesco Saúde", "Amil", "SulAmérica"], i),
          dependentes: i % 4,
          mensalidade: brl(320 + i * 145),
        })),
      },
      {
        slug: "cartao-ponto",
        title: "Cartão ponto",
        icon: Fingerprint,
        desc: "Espelho de ponto por colaborador.",
        columns: [
          { key: "matricula", label: "Matrícula", mono: true },
          { key: "nome", label: "Colaborador" },
          { key: "hExtras", label: "H. extras", align: "right", mono: true },
          { key: "faltas", label: "Faltas", align: "right", mono: true },
          { key: "atrasos", label: "Atrasos", align: "right", mono: true },
        ],
        rows: people(10).map((r, i) => ({
          matricula: r.matricula, nome: r.nome,
          hExtras: `${(i * 2.5).toFixed(1)}h`,
          faltas: i % 5 === 4 ? 1 : 0,
          atrasos: `${(i * 4)}min`,
        })),
      },
      {
        slug: "faltas",
        title: "Faltas",
        icon: CalendarX2,
        desc: "Registro de faltas do período.",
        columns: [
          { key: "data", label: "Data", mono: true },
          { key: "matricula", label: "Matrícula", mono: true },
          { key: "nome", label: "Colaborador" },
          { key: "motivo", label: "Motivo" },
          { key: "abonada", label: "Abonada", align: "center" },
        ],
        rows: Array.from({ length: 6 }, (_, i) => ({
          data: dateBr(i + 5),
          matricula: String(120 + i * 17).padStart(4, "0"),
          nome: pick(NAMES, i + 2),
          motivo: pick(["Não justificado", "Atestado médico", "Consulta", "Falecimento familiar", "Consulta odont.", "Doação sangue"], i),
          abonada: i % 2 === 0 ? "Sim" : "Não",
        })),
      },
      {
        slug: "importacao-cartao-ponto",
        title: "Importação cartão ponto",
        icon: FileUp,
        desc: "Arquivos AFD/AFDT importados.",
        columns: [
          { key: "arquivo", label: "Arquivo" },
          { key: "empresa", label: "Empresa" },
          { key: "linhas", label: "Linhas", align: "right", mono: true },
          { key: "importado", label: "Importado em", mono: true },
          C.status,
        ],
        rows: [
          { arquivo: "AFD_202410_matriz.txt", empresa: "Metalúrgica Andrade", linhas: 8420, importado: "01/11 08:12", status: "OK" },
          { arquivo: "AFD_202410_filial.txt", empresa: "Andrade Filial Sul", linhas: 2140, importado: "01/11 08:15", status: "OK" },
          { arquivo: "AFDT_202410_prod.txt", empresa: "Metalúrgica Andrade", linhas: 12980, importado: "01/11 08:22", status: "Alerta" },
          { arquivo: "AFD_202410_admin.txt", empresa: "TechCore Sistemas", linhas: 640, importado: "01/11 09:04", status: "OK" },
        ],
      },
      {
        slug: "importacao-folha",
        title: "Importação de folha",
        icon: FileUp,
        desc: "Lotes de folha importados de outros sistemas.",
        columns: [
          { key: "arquivo", label: "Arquivo" },
          { key: "competencia", label: "Competência", mono: true },
          { key: "colab", label: "Colab.", align: "right", mono: true },
          { key: "total", label: "Total bruto", align: "right", mono: true },
          C.status,
        ],
        rows: [
          { arquivo: "folha_10-2024_metalurgica.csv", competencia: "10/2024", colab: 128, total: brl(612_308.75), status: "Importada" },
          { arquivo: "folha_10-2024_techcore.csv", competencia: "10/2024", colab: 22, total: brl(184_211.10), status: "Importada" },
          { arquivo: "folha_10-2024_panificadora.csv", competencia: "10/2024", colab: 18, total: brl(78_945.44), status: "Divergência" },
        ],
      },
      {
        slug: "trabalho-intermitente",
        title: "Trabalho intermitente",
        icon: Timer,
        desc: "Convocações e horas do regime intermitente.",
        columns: [
          { key: "matricula", label: "Matrícula", mono: true },
          { key: "nome", label: "Colaborador" },
          { key: "convocacoes", label: "Convocações", align: "right", mono: true },
          { key: "horas", label: "Horas", align: "right", mono: true },
          { key: "total", label: "Total pago", align: "right", mono: true },
        ],
        rows: people(6).map((r, i) => ({
          matricula: r.matricula, nome: r.nome,
          convocacoes: 2 + i,
          horas: `${(8 + i * 4).toFixed(1)}h`,
          total: brl(180 + i * 92),
        })),
      },
    ],
  },
  {
    slug: "movimentacoes",
    title: "Movimentações",
    modules: [
      { slug: "adiantamento", title: "Adiantamento", icon: ArrowDownToLine, desc: "Processamento do adiantamento salarial.", columns: [{key:"matricula",label:"Mat.",mono:true},{key:"nome",label:"Colaborador"},{key:"valor",label:"Adiantamento",align:"right",mono:true},{key:"pagamento",label:"Pagto",mono:true},C.status], rows: people(8).map((r,i)=>({matricula:r.matricula,nome:r.nome,valor:brl(900+i*245),pagamento:"20/10/2024",status:"Pago"})) },
      { slug: "folha-pagamento", title: "Folha de pagamento", icon: Wallet, desc: "Folha mensal calculada.", columns: [{key:"matricula",label:"Mat.",mono:true},{key:"nome",label:"Colaborador"},{key:"proventos",label:"Proventos",align:"right",mono:true},{key:"descontos",label:"Descontos",align:"right",mono:true},{key:"liquido",label:"Líquido",align:"right",mono:true}], rows: people(10).map((r,i)=>{ const p=2400+i*685; const d=p*0.22; return{matricula:r.matricula,nome:r.nome,proventos:brl(p),descontos:brl(d),liquido:brl(p-d)}}) },
      { slug: "aviso-ferias", title: "Aviso de férias", icon: Send, desc: "Avisos emitidos aos colaboradores.", columns: [{key:"matricula",label:"Mat.",mono:true},{key:"nome",label:"Colaborador"},{key:"inicio",label:"Início",mono:true},{key:"dias",label:"Dias",align:"right",mono:true},C.status], rows: people(6).map((r,i)=>({matricula:r.matricula,nome:r.nome,inicio:dateBr(i+8),dias:30,status:"Emitido"})) },
      { slug: "ferias", title: "Férias", icon: Plane, desc: "Férias em gozo no período.", columns: [{key:"matricula",label:"Mat.",mono:true},{key:"nome",label:"Colaborador"},{key:"inicio",label:"Início",mono:true},{key:"fim",label:"Fim",mono:true},{key:"valor",label:"Valor",align:"right",mono:true}], rows: people(6).map((r,i)=>({matricula:r.matricula,nome:r.nome,inicio:dateBr(i+5),fim:dateBr(i+5+30),valor:brl(3200+i*512)})) },
      { slug: "rescisoes", title: "Rescisões", icon: FileText, desc: "Rescisões calculadas no período.", columns: [{key:"matricula",label:"Mat.",mono:true},{key:"nome",label:"Colaborador"},{key:"motivo",label:"Motivo"},{key:"data",label:"Data",mono:true},{key:"valor",label:"Líquido",align:"right",mono:true}], rows: [
        {matricula:"0087",nome:"Marco Ribeiro",motivo:"Sem justa causa (empregador)",data:"18/10/2024",valor:brl(12_840.55)},
        {matricula:"0106",nome:"Sueli Freitas",motivo:"Pedido demissão",data:"22/10/2024",valor:brl(4_211.00)},
        {matricula:"0119",nome:"Pedro Almeida",motivo:"Acordo entre partes",data:"25/10/2024",valor:brl(7_902.18)},
      ]},
      { slug: "decimo-terceiro", title: "13º salário", icon: Gift, desc: "Cálculo da primeira/segunda parcela.", columns: [{key:"matricula",label:"Mat.",mono:true},{key:"nome",label:"Colaborador"},{key:"parcela",label:"Parcela"},{key:"valor",label:"Valor",align:"right",mono:true}], rows: people(8).map((r,i)=>({matricula:r.matricula,nome:r.nome,parcela:i%2?"2ª":"1ª",valor:brl(1200+i*312)})) },
      { slug: "folha-avulsa", title: "Folha avulsa", icon: Receipt, desc: "Pagamentos avulsos fora do ciclo padrão.", columns: [{key:"matricula",label:"Mat.",mono:true},{key:"nome",label:"Colaborador"},{key:"motivo",label:"Motivo"},{key:"valor",label:"Valor",align:"right",mono:true}], rows: people(5).map((r,i)=>({matricula:r.matricula,nome:r.nome,motivo:pick(["Prêmio","Complemento","Bonificação","Ajuste"],i),valor:brl(500+i*180)})) },
      { slug: "autonomos", title: "Autônomos", icon: UserPlus, desc: "Pagamentos a prestadores autônomos.", columns: [{key:"cpf",label:"CPF",mono:true},{key:"nome",label:"Prestador"},{key:"servico",label:"Serviço"},{key:"valor",label:"Bruto",align:"right",mono:true},{key:"liquido",label:"Líquido",align:"right",mono:true}], rows: Array.from({length:5},(_,i)=>{const b=1800+i*412;return{cpf:cpf(i+8),nome:pick(NAMES,i+7),servico:pick(["Consultoria","Manutenção","TI","Auditoria","Transporte"],i),valor:brl(b),liquido:brl(b*0.85)}}) },
      { slug: "folha-plano-saude", title: "Folha plano de saúde", icon: Stethoscope, desc: "Consolidado mensal do plano.", columns: [{key:"operadora",label:"Operadora"},{key:"vidas",label:"Vidas",align:"right",mono:true},{key:"empresa",label:"Empresa",align:"right",mono:true},{key:"colab",label:"Colaborador",align:"right",mono:true},{key:"total",label:"Total",align:"right",mono:true}], rows: [
        {operadora:"Unimed",vidas:82,empresa:brl(18_420),colab:brl(6_140),total:brl(24_560)},
        {operadora:"Bradesco Saúde",vidas:42,empresa:brl(11_212),colab:brl(3_820),total:brl(15_032)},
        {operadora:"Amil",vidas:24,empresa:brl(6_140),colab:brl(2_010),total:brl(8_150)},
        {operadora:"SulAmérica",vidas:18,empresa:brl(4_820),colab:brl(1_620),total:brl(6_440)},
      ]},
    ],
  },
  {
    slug: "demonstracoes",
    title: "Demonstrações",
    modules: [
      { slug: "folha-adiantamento", title: "Folha de adiantamento", icon: FileBarChart2, desc: "Relatório detalhado por colaborador.", columns: [{key:"matricula",label:"Mat.",mono:true},{key:"nome",label:"Colaborador"},{key:"bruto",label:"Bruto",align:"right",mono:true},{key:"adiant",label:"Adiantamento",align:"right",mono:true}], rows: people(10).map((r,i)=>({matricula:r.matricula,nome:r.nome,bruto:brl(2400+i*685),adiant:brl(960+i*274)})) },
      { slug: "folha-pagamento", title: "Folha pagamento", icon: FileBarChart2, desc: "Espelho da folha do mês.", columns: [{key:"matricula",label:"Mat.",mono:true},{key:"nome",label:"Colaborador"},{key:"prov",label:"Proventos",align:"right",mono:true},{key:"desc",label:"Descontos",align:"right",mono:true},{key:"liq",label:"Líquido",align:"right",mono:true}], rows: people(10).map((r,i)=>{const p=2400+i*685;const d=p*0.22;return{matricula:r.matricula,nome:r.nome,prov:brl(p),desc:brl(d),liq:brl(p-d)}}) },
      { slug: "folha-13", title: "Folha 13º salário", icon: Gift, desc: "Demonstrativo consolidado do 13º.", columns: [{key:"matricula",label:"Mat.",mono:true},{key:"nome",label:"Colaborador"},{key:"parcela",label:"Parcela"},{key:"valor",label:"Valor",align:"right",mono:true}], rows: people(8).map((r,i)=>({matricula:r.matricula,nome:r.nome,parcela:i%2?"2ª":"1ª",valor:brl(1200+i*312)})) },
      { slug: "folha-avulsa", title: "Folha avulsa", icon: Receipt, desc: "Espelho de folhas avulsas.", columns: [{key:"matricula",label:"Mat.",mono:true},{key:"nome",label:"Colaborador"},{key:"motivo",label:"Motivo"},{key:"valor",label:"Valor",align:"right",mono:true}], rows: people(5).map((r,i)=>({matricula:r.matricula,nome:r.nome,motivo:pick(["Prêmio","Ajuste","Bonificação"],i),valor:brl(500+i*180)})) },
      { slug: "liquido-folha", title: "Líquido da folha", icon: Banknote, desc: "Total líquido por banco de pagamento.", columns: [{key:"banco",label:"Banco"},{key:"agencia",label:"Agência",mono:true},{key:"colab",label:"Colab.",align:"right",mono:true},{key:"total",label:"Total líquido",align:"right",mono:true}], rows: [
        {banco:"Itaú",agencia:"0325-2",colab:82,total:brl(412_820.44)},
        {banco:"Bradesco",agencia:"1204-7",colab:28,total:brl(118_302.10)},
        {banco:"Santander",agencia:"3092-1",colab:14,total:brl(52_014.90)},
        {banco:"Caixa",agencia:"0044-8",colab:4,total:brl(9_820.00)},
      ]},
      { slug: "resumo-adiantamento", title: "Resumo adiantamento", icon: BarChart3, desc: "Totalizadores por evento.", columns: [{key:"evento",label:"Evento"},{key:"colab",label:"Colab.",align:"right",mono:true},{key:"total",label:"Total",align:"right",mono:true}], rows: [
        {evento:"Adiantamento salarial",colab:128,total:brl(214_820)},
        {evento:"Desconto adiantamento",colab:128,total:brl(-214_820)},
      ]},
      { slug: "resumo-folha", title: "Resumo folha", icon: BarChart3, desc: "Totalizadores da folha mensal.", columns: [{key:"evento",label:"Evento"},{key:"colab",label:"Colab.",align:"right",mono:true},{key:"total",label:"Total",align:"right",mono:true}], rows: [
        {evento:"Salários",colab:128,total:brl(512_820)},
        {evento:"Horas extras",colab:82,total:brl(38_402)},
        {evento:"INSS",colab:128,total:brl(-84_412)},
        {evento:"IRRF",colab:96,total:brl(-42_218)},
        {evento:"FGTS",colab:128,total:brl(48_012)},
      ]},
      { slug: "resumo-ferias", title: "Resumo férias", icon: Plane, desc: "Totais de férias no período.", columns: [{key:"tipo",label:"Tipo"},{key:"colab",label:"Colab.",align:"right",mono:true},{key:"total",label:"Total",align:"right",mono:true}], rows: [
        {tipo:"Férias gozadas",colab:12,total:brl(48_212)},
        {tipo:"1/3 constitucional",colab:12,total:brl(16_070)},
        {tipo:"Abono pecuniário",colab:3,total:brl(9_800)},
      ]},
      { slug: "resumo-rescisao", title: "Resumo rescisão", icon: FileText, desc: "Rescisões consolidadas.", columns: [{key:"tipo",label:"Tipo"},{key:"colab",label:"Colab.",align:"right",mono:true},{key:"total",label:"Total",align:"right",mono:true}], rows: [
        {tipo:"Sem justa causa",colab:2,total:brl(24_412)},
        {tipo:"Pedido demissão",colab:1,total:brl(4_211)},
        {tipo:"Acordo",colab:1,total:brl(7_902)},
      ]},
      { slug: "resumo-13", title: "Resumo 13º", icon: Gift, desc: "Consolidado do 13º pago.", columns: [{key:"parcela",label:"Parcela"},{key:"colab",label:"Colab.",align:"right",mono:true},{key:"total",label:"Total",align:"right",mono:true}], rows: [
        {parcela:"1ª parcela",colab:128,total:brl(214_820)},
        {parcela:"2ª parcela",colab:128,total:brl(198_412)},
      ]},
      { slug: "resumo-folha-avulsa", title: "Resumo folha avulsa", icon: Receipt, desc: "Consolidado das folhas avulsas.", columns: [{key:"motivo",label:"Motivo"},{key:"colab",label:"Colab.",align:"right",mono:true},{key:"total",label:"Total",align:"right",mono:true}], rows: [
        {motivo:"Prêmios",colab:12,total:brl(18_400)},
        {motivo:"Complementos",colab:6,total:brl(4_220)},
        {motivo:"Bonificações",colab:4,total:brl(6_100)},
      ]},
      { slug: "previsao-rescisao", title: "Previsão rescisão", icon: LineChart, desc: "Simulação de rescisões para provisão.", columns: [{key:"matricula",label:"Mat.",mono:true},{key:"nome",label:"Colaborador"},{key:"tipo",label:"Tipo simulado"},{key:"valor",label:"Estimativa",align:"right",mono:true}], rows: people(6).map((r,i)=>({matricula:r.matricula,nome:r.nome,tipo:pick(["Sem justa causa","Acordo","Pedido demissão"],i),valor:brl(8000+i*1420)})) },
    ],
  },
  {
    slug: "esocial",
    title: "eSocial",
    modules: [
      { slug: "arquivos", title: "Arquivos", icon: FolderArchive, desc: "Arquivos XML gerados e transmitidos.", columns: [{key:"arquivo",label:"Arquivo"},{key:"evento",label:"Evento",mono:true},{key:"tamanho",label:"Tam.",align:"right",mono:true},{key:"gerado",label:"Gerado",mono:true},C.status], rows: [
        {arquivo:"S1200_202410_0001.xml",evento:"S-1200",tamanho:"84 KB",gerado:"05/11 14:22",status:"Aceito"},
        {arquivo:"S1210_202410_0001.xml",evento:"S-1210",tamanho:"42 KB",gerado:"05/11 14:24",status:"Processando"},
        {arquivo:"S1299_202410_0001.xml",evento:"S-1299",tamanho:"3 KB",gerado:"—",status:"Pendente"},
        {arquivo:"S2200_202410_0007.xml",evento:"S-2200",tamanho:"18 KB",gerado:"03/11 09:12",status:"Aceito"},
      ]},
      { slug: "parametros", title: "Parâmetros", icon: Cog, desc: "Ambiente e certificados eSocial.", columns: [{key:"parametro",label:"Parâmetro"},{key:"valor",label:"Valor"}], rows: [
        {parametro:"Ambiente",valor:"Produção Restrita"},
        {parametro:"Versão leiaute",valor:"S-1.2"},
        {parametro:"Certificado A1",valor:"CN=ANDRADE METALURGICA (Válido até 12/2025)"},
        {parametro:"Proxy",valor:"Não configurado"},
        {parametro:"Timeout envio",valor:"90 s"},
      ]},
      { slug: "qualificacoes", title: "Qualificações", icon: Award, desc: "Qualificação cadastral dos colaboradores.", columns: [{key:"matricula",label:"Mat.",mono:true},{key:"nome",label:"Colaborador"},{key:"cpf",label:"CPF",mono:true},{key:"resultado",label:"Resultado"}], rows: people(8).map((r,i)=>({matricula:r.matricula,nome:r.nome,cpf:cpf(i+2),resultado:i%7===6?"Divergência nome":"OK"})) },
      { slug: "dados", title: "Dados", icon: Database, desc: "Base de dados enviada nas tabelas eSocial.", columns: [{key:"tabela",label:"Tabela"},{key:"registros",label:"Registros",align:"right",mono:true},{key:"atualizado",label:"Atualizada em",mono:true}], rows: [
        {tabela:"S-1005 Estabelecimentos",registros:5,atualizado:"01/10/2024"},
        {tabela:"S-1010 Rubricas",registros:214,atualizado:"01/10/2024"},
        {tabela:"S-1020 Lotações",registros:12,atualizado:"01/10/2024"},
        {tabela:"S-1030 Cargos",registros:48,atualizado:"01/10/2024"},
      ]},
      { slug: "tarefas-importacoes", title: "Tarefas e importações", icon: ListChecks, desc: "Fila de tarefas de importação para o eSocial.", columns: [{key:"tarefa",label:"Tarefa"},{key:"empresa",label:"Empresa"},{key:"agendada",label:"Agendada",mono:true},C.status], rows: [
        {tarefa:"Importar S-2200 lote 07",empresa:"Metalúrgica Andrade",agendada:"06/11 06:00",status:"Concluída"},
        {tarefa:"Importar S-1200 folha 10/24",empresa:"Todas",agendada:"05/11 05:30",status:"Concluída"},
        {tarefa:"Reprocessar S-1200 CPF divergente",empresa:"Metalúrgica Andrade",agendada:"07/11 09:00",status:"Agendada"},
      ]},
    ],
  },
  {
    slug: "encerramento",
    title: "Encerramento",
    modules: [
      { slug: "fechamento", title: "Fechamento", icon: Lock, desc: "Checklist de fechamento da folha.", columns: [{key:"etapa",label:"Etapa"},{key:"responsavel",label:"Responsável"},C.status], rows: [
        {etapa:"Conferir movimento variável",responsavel:"M. Costa",status:"Concluído"},
        {etapa:"Calcular INSS/IRRF",responsavel:"M. Costa",status:"Concluído"},
        {etapa:"Fechar folha 10/2024",responsavel:"M. Costa",status:"Concluído"},
        {etapa:"Aprovar direção",responsavel:"E. Nogueira",status:"Em andamento"},
      ]},
      { slug: "enviar-recibos", title: "Enviar recibos", icon: Send, desc: "Distribuição de holerites por e-mail.", columns: [{key:"lote",label:"Lote"},{key:"colab",label:"Colab.",align:"right",mono:true},{key:"enviados",label:"Enviados",align:"right",mono:true},C.status], rows: [
        {lote:"Folha 10/2024",colab:128,enviados:126,status:"2 pendentes"},
        {lote:"Adiantamento 10/2024",colab:128,enviados:128,status:"Concluído"},
        {lote:"Férias 10/2024",colab:6,enviados:6,status:"Concluído"},
      ]},
      { slug: "gerar-cartao-ponto", title: "Gerar cartão ponto", icon: Punch, desc: "Geração de espelhos assinados.", columns: [{key:"empresa",label:"Empresa"},{key:"competencia",label:"Competência",mono:true},{key:"colab",label:"Colab.",align:"right",mono:true},C.status], rows: [
        {empresa:"Metalúrgica Andrade",competencia:"10/2024",colab:128,status:"Gerado"},
        {empresa:"Andrade Filial Sul",competencia:"10/2024",colab:42,status:"Gerado"},
        {empresa:"TechCore Sistemas",competencia:"10/2024",colab:22,status:"Pendente"},
      ]},
      { slug: "bancos", title: "Bancos", icon: Landmark, desc: "Arquivos de remessa bancária.", columns: [{key:"banco",label:"Banco"},{key:"layout",label:"Layout"},{key:"total",label:"Total",align:"right",mono:true},C.status], rows: [
        {banco:"Itaú",layout:"CNAB 240",total:brl(412_820.44),status:"Gerado"},
        {banco:"Bradesco",layout:"CNAB 240",total:brl(118_302.10),status:"Gerado"},
        {banco:"Santander",layout:"CNAB 240",total:brl(52_014.90),status:"Aguardando"},
      ]},
      { slug: "arquivos", title: "Arquivos", icon: FileArchive, desc: "Arquivos legais de encerramento (SEFIP, GRRF).", columns: [{key:"arquivo",label:"Arquivo"},{key:"tipo",label:"Tipo"},{key:"gerado",label:"Gerado",mono:true}], rows: [
        {arquivo:"SEFIP_202410.SFP",tipo:"SEFIP",gerado:"05/11/2024"},
        {arquivo:"GRRF_0087_202410.GRF",tipo:"GRRF",gerado:"18/10/2024"},
        {arquivo:"CAGED_202410.txt",tipo:"CAGED",gerado:"04/11/2024"},
      ]},
      { slug: "rateios", title: "Rateios", icon: Split, desc: "Rateios contábeis por centro de custo.", columns: [{key:"centro",label:"Centro de custo"},{key:"perc",label:"%",align:"right",mono:true},{key:"valor",label:"Valor",align:"right",mono:true}], rows: [
        {centro:"Industrial",perc:"48%",valor:brl(294_388.20)},
        {centro:"Comercial-SP",perc:"22%",valor:brl(134_907.92)},
        {centro:"Administrativo",perc:"18%",valor:brl(110_015.57)},
        {centro:"Logística",perc:"8%",valor:brl(48_984.70)},
        {centro:"Financeiro",perc:"4%",valor:brl(24_492.36)},
      ]},
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
    eyebrow: "Setup do escritório",
    blurb: "Cadastros base do escritório, empresas atendidas e catálogo de serviços recorrentes.",
    categories: preparativos,
  },
  {
    slug: "pessoal",
    title: "Pessoal",
    code: "03",
    icon: Users2,
    accent: "purple",
    eyebrow: "Departamento pessoal",
    blurb: "Folha, eSocial, colaboradores e todo o ciclo do departamento pessoal.",
    categories: pessoal,
  },
  {
    slug: "financeiro",
    title: "Financeiro",
    code: "04",
    icon: Wallet,
    accent: "orange",
    eyebrow: "Fiscal & tributário",
    blurb: "Faturamento, apurações e regimes tributários das empresas atendidas.",
    categories: financeiro,
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
