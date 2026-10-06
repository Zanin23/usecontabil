// ============================================================================
// Modelo de navegação por processo (menus laterais e trilhas).
//
// O modelo antigo (AREAS em lib/contabilNav.tsx) continua existindo porque é a
// base das rotas `/:area/:categoria/:modulo`, do mapa de telas da documentação
// e da busca (Ctrl+K). Este arquivo não o substitui: ele reorganiza as MESMAS
// rotas na ordem em que o usuário realmente trabalha — configuração, cadastro,
// lançamento, escrituração, apuração, conciliação, obrigações, relatórios e
// fechamento. Nenhuma tela foi removida; nenhuma rota mudou de endereço.
// ============================================================================
import {
  BadgeDollarSign, BarChart3, BookOpen, Briefcase, Building2, Calculator, CalendarClock,
  ClipboardCheck, Coins, Cog, FileSpreadsheet, FileText, Flag, FlaskConical, Gauge,
  GraduationCap, Landmark, LayoutDashboard, Lock, Map as MapIcon, Package, Percent, PieChart, Receipt,
  Scale, ScrollText, Search, Settings2, ShieldCheck, Split, Truck, Users2, Wallet,
  type LucideIcon,
} from "lucide-react";

export type ItemNav = {
  titulo: string;
  rota: string;
  /** Texto curto explicando o item — aparece no menu expandido e na busca. */
  desc?: string;
  icon: LucideIcon;
};

export type SubgrupoNav = {
  titulo: string | null;
  itens: ItemNav[];
};

export type SecaoNav = {
  id: string;
  codigo: string;
  titulo: string;
  /** Frase que resume o papel da seção no ciclo. */
  resumo: string;
  icon: LucideIcon;
  accent: "orange" | "blue" | "purple" | "pink";
  subgrupos: SubgrupoNav[];
};

export const SECOES: SecaoNav[] = [
  {
    id: "inicio",
    codigo: "01",
    titulo: "Início",
    resumo: "Painel da competência: números, pendências e por onde continuar.",
    icon: LayoutDashboard,
    accent: "orange",
    subgrupos: [
      {
        titulo: null,
        itens: [
          { titulo: "Visão geral contábil", rota: "/dashboard", desc: "Visão geral, pendências e próximos passos", icon: LayoutDashboard },
          { titulo: "Mapa do sistema", rota: "/mapa-sistema", desc: "O que depende do quê e o que já está pronto", icon: MapIcon },
          { titulo: "Simples & MEI", rota: "/simples-mei", desc: "Fluxo simplificado do Simples Nacional e MEI", icon: PieChart },
        ],
      },
    ],
  },
  {
    id: "configuracao",
    codigo: "02",
    titulo: "Configuração",
    resumo: "O que precisa existir antes de qualquer lançamento.",
    icon: Settings2,
    accent: "blue",
    subgrupos: [
      {
        titulo: "Empresas e unidades",
        itens: [
          { titulo: "Empresas do grupo", rota: "/preparativos/cadastros/empresas", desc: "CNPJ, regime tributário e situação", icon: Building2 },
          { titulo: "Filiais e unidades", rota: "/preparativos/cadastros/filiais", desc: "Matriz, filiais e unidades operacionais", icon: Building2 },
          { titulo: "Classe de atividades", rota: "/preparativos/cadastros/classe-atividades", desc: "CNAE das atividades do grupo", icon: Flag },
          { titulo: "Resumo por classe de atividades", rota: "/preparativos/cadastros/resumo-classe-atividades", desc: "Consolidado de empresas por CNAE", icon: BarChart3 },
        ],
      },
      {
        titulo: "Empresa selecionada",
        itens: [
          { titulo: "Dados da empresa", rota: "/preparativos/empresa/dados-empresa", desc: "Endereço, contato e responsável", icon: Briefcase },
          { titulo: "Inscrições", rota: "/preparativos/empresa/inscricoes", desc: "Inscrição estadual e municipal", icon: ClipboardCheck },
          { titulo: "Parâmetros", rota: "/preparativos/empresa/parametros", desc: "Regras fiscais e contábeis da empresa", icon: Cog },
          { titulo: "Certificados", rota: "/preparativos/empresa/certificados", desc: "Certificados digitais e validade", icon: ShieldCheck },
          { titulo: "Pagamentos", rota: "/preparativos/empresa/pagamentos", desc: "Formas e contas de pagamento", icon: Wallet },
        ],
      },
      {
        titulo: "Acessos e regras",
        itens: [
          { titulo: "Usuários e permissões", rota: "/administrativo/controles/usuarios", desc: "Quem acessa cada área", icon: Users2 },
          { titulo: "Políticas e alçadas", rota: "/administrativo/controles/politicas", desc: "Aprovações por valor e área", icon: Lock },
          { titulo: "Parâmetros do sistema", rota: "/administrativo/controles/parametros", desc: "Configurações gerais", icon: Cog },
          { titulo: "Centros de custo e rateio", rota: "/administrativo/controles/centros-custo", desc: "Critérios de rateio", icon: Split },
          { titulo: "Avisos", rota: "/administrativo/controles/avisos", desc: "Notificações publicadas no sistema", icon: ClipboardCheck },
          { titulo: "Log de auditoria", rota: "/administrativo/controles/auditoria-log", desc: "Trilha de alterações e acessos", icon: ScrollText },
        ],
      },
    ],
  },
  {
    id: "cadastros",
    codigo: "03",
    titulo: "Cadastros",
    resumo: "As informações que alimentam documentos, lançamentos e relatórios.",
    icon: Package,
    accent: "purple",
    subgrupos: [
      {
        titulo: "Cadastros do grupo",
        itens: [
          { titulo: "Clientes e fornecedores", rota: "/preparativos/cadastros/participantes", desc: "Cadastro único de participantes", icon: Users2 },
          { titulo: "Produtos e serviços", rota: "/preparativos/cadastros/produtos-servicos", desc: "Itens com NCM, CFOP, CST e alíquotas", icon: Package },
        ],
      },
      {
        titulo: "Cadastros contábeis",
        itens: [
          { titulo: "Plano de contas", rota: "/contabil/cadastros/plano-contas", desc: "Contas sintéticas e analíticas do grupo", icon: FileSpreadsheet },
          { titulo: "Centros de custo", rota: "/contabil/cadastros/centros-custo", desc: "Áreas que recebem custos e despesas", icon: Split },
          { titulo: "Históricos padrão", rota: "/contabil/cadastros/historicos", desc: "Textos prontos para os lançamentos", icon: ScrollText },
        ],
      },
      {
        titulo: "Cadastros administrativos",
        itens: [
          { titulo: "Bens do imobilizado", rota: "/administrativo/patrimonio/bens", desc: "Bens do imobilizado", icon: Building2 },
          { titulo: "Contratos", rota: "/administrativo/contratos/contratos", desc: "Contratos, certificados e documentos", icon: FileText },
          { titulo: "Cadastros analíticos", rota: "/administrativo/cadastros", desc: "Base somente-leitura vinda do ERP", icon: Briefcase },
        ],
      },
    ],
  },
  {
    id: "lancamentos",
    codigo: "04",
    titulo: "Lançamentos",
    resumo: "A movimentação do período: notas, lançamentos contábeis e títulos.",
    icon: Receipt,
    accent: "orange",
    subgrupos: [
      {
        titulo: "Documentos fiscais",
        itens: [
          { titulo: "Notas de entrada", rota: "/fiscal/documentos/entradas", desc: "Compras e devoluções recebidas", icon: Receipt },
          { titulo: "Notas de saída", rota: "/fiscal/documentos/saidas", desc: "Notas emitidas pelo grupo", icon: Receipt },
          { titulo: "Serviços tomados", rota: "/fiscal/documentos/servicos-tomados", desc: "NFS-e recebidas com retenções", icon: FileText },
          { titulo: "Serviços prestados", rota: "/fiscal/documentos/servicos-prestados", desc: "NFS-e emitidas e ISS devido", icon: FileText },
          { titulo: "Conhecimentos de transporte", rota: "/fiscal/documentos/transporte", desc: "CT-e e MDF-e", icon: Truck },
          { titulo: "Cupons fiscais", rota: "/fiscal/documentos/cupons", desc: "NFC-e e reduções Z", icon: Receipt },
          { titulo: "Manifestação do destinatário", rota: "/fiscal/documentos/manifestacao", desc: "Ciência e confirmação de operações", icon: ClipboardCheck },
        ],
      },
      {
        titulo: "Movimentos",
        itens: [
          { titulo: "Faturamento", rota: "/financeiro/movimentos/faturamento", desc: "Receitas do período", icon: Wallet },
          { titulo: "Serviços", rota: "/financeiro/movimentos/servicos", desc: "Movimento de serviços", icon: Briefcase },
          { titulo: "Demais documentos", rota: "/financeiro/movimentos/demais-documentos", desc: "Outros documentos do período", icon: FileText },
          { titulo: "Conclusão fiscal", rota: "/financeiro/movimentos/conclusao-fiscal", desc: "Fechamento do movimento", icon: ClipboardCheck },
        ],
      },
      {
        titulo: "Contabilidade",
        itens: [
          { titulo: "Lançamentos contábeis", rota: "/contabil/escrituracao/lancamentos", desc: "Partidas dobradas da competência", icon: Calculator },
        ],
      },
      {
        titulo: "Financeiro",
        itens: [
          { titulo: "Contas a pagar", rota: "/administrativo/financeiro-operacional/contas-pagar", desc: "Títulos a pagar", icon: Wallet },
          { titulo: "Contas a receber", rota: "/administrativo/financeiro-operacional/contas-receber", desc: "Títulos a receber", icon: Wallet },
          { titulo: "Caixa e tesouraria", rota: "/administrativo/financeiro-operacional/caixa", desc: "Movimentos de caixa", icon: Landmark },
          { titulo: "Fluxo de caixa", rota: "/administrativo/financeiro-operacional/fluxo-caixa", desc: "Projeção semanal de caixa", icon: BarChart3 },
          { titulo: "Cobrança", rota: "/administrativo/financeiro-operacional/cobranca", desc: "Ações sobre títulos em atraso", icon: BadgeDollarSign },
        ],
      },
      {
        titulo: "Suprimentos",
        itens: [
          { titulo: "Requisições", rota: "/administrativo/suprimentos/requisicoes", desc: "Solicitações internas", icon: ClipboardCheck },
          { titulo: "Cotações", rota: "/administrativo/suprimentos/cotacoes", desc: "Comparativo de propostas", icon: Scale },
          { titulo: "Pedidos de compra", rota: "/administrativo/suprimentos/pedidos", desc: "Pedidos emitidos", icon: Truck },
        ],
      },
    ],
  },
  {
    id: "escrituracao",
    codigo: "05",
    titulo: "Escrituração",
    resumo: "Livros e apurações de ICMS/IPI gerados a partir dos documentos.",
    icon: FileSpreadsheet,
    accent: "pink",
    subgrupos: [
      {
        titulo: null,
        itens: [
          { titulo: "Livro de entradas", rota: "/fiscal/escrituracao/livro-entradas", desc: "Entradas por CFOP e CST", icon: FileSpreadsheet },
          { titulo: "Livro de saídas", rota: "/fiscal/escrituracao/livro-saidas", desc: "Saídas por CFOP e CST", icon: FileSpreadsheet },
          { titulo: "Apuração de ICMS", rota: "/fiscal/escrituracao/apuracao-icms", desc: "Débitos, créditos e saldo", icon: Scale },
          { titulo: "Apuração de IPI", rota: "/fiscal/escrituracao/apuracao-ipi", desc: "Créditos e débitos de IPI", icon: Percent },
          { titulo: "Inventário", rota: "/fiscal/escrituracao/inventario", desc: "Estoque declarado (Bloco H)", icon: Package },
          { titulo: "CIAP", rota: "/fiscal/escrituracao/ciap", desc: "Crédito de ICMS do ativo permanente", icon: Building2 },
        ],
      },
    ],
  },
  {
    id: "apuracao",
    codigo: "06",
    titulo: "Apuração e recolhimento",
    resumo: "Transforma documentos em tributos, guias e obrigações.",
    icon: Coins,
    accent: "orange",
    subgrupos: [
      {
        titulo: "Apurações",
        itens: [
          { titulo: "Painel de apurações", rota: "/fiscal/apuracoes", desc: "Visão dos motores do período", icon: Calculator },
          { titulo: "PIS / COFINS", rota: "/fiscal/apuracoes/pis-cofins", desc: "Cumulativo e não cumulativo", icon: Coins },
          { titulo: "ISS", rota: "/fiscal/apuracoes/iss", desc: "ISS próprio e retido", icon: Landmark },
          { titulo: "IRPJ / CSLL", rota: "/fiscal/apuracoes/irpj-csll", desc: "Lucro real e presumido", icon: BadgeDollarSign },
          { titulo: "Simples Nacional", rota: "/fiscal/apuracoes/simples-nacional", desc: "PGDAS-D e segregação por anexo", icon: PieChart },
          { titulo: "Retenções", rota: "/fiscal/apuracoes/retencoes", desc: "Retenções na fonte", icon: Percent },
        ],
      },
      {
        titulo: "Tabelas e motor",
        itens: [
          { titulo: "Motor tributário", rota: "/financeiro/tributacao/motor-tributario", desc: "Regras com vigência e correção sugerida", icon: Cog },
          { titulo: "Tributação avançada", rota: "/financeiro/tributacao/avancada", desc: "Monofásico, drawback, ZFM e incentivos", icon: Cog },
          { titulo: "Simples Nacional", rota: "/financeiro/tabelas/simples-nacional", desc: "Tabelas e faixas do Simples", icon: PieChart },
          { titulo: "Lucro Presumido", rota: "/financeiro/tabelas/lucro-presumido", desc: "Tabelas do Lucro Presumido", icon: Percent },
          { titulo: "Lucro Real", rota: "/financeiro/tabelas/lucro-real", desc: "Tabelas do Lucro Real", icon: Percent },
          { titulo: "SIMEI", rota: "/financeiro/tabelas/simei", desc: "Tabela do MEI", icon: Percent },
          { titulo: "Ajustes de apuração", rota: "/financeiro/tabelas/ajuste-apuracao", desc: "Ajustes que entram na apuração do período", icon: Scale },
          { titulo: "Ajustes de documento fiscal", rota: "/financeiro/tabelas/ajuste-documento-fiscal", desc: "Correções por documento antes de escriturar", icon: Scale },
          { titulo: "Apuração de PIS e COFINS", rota: "/financeiro/tabelas/apuracao-pis-cofins", desc: "Base, alíquotas e ajustes do PIS/COFINS", icon: Percent },
          { titulo: "DIFAL", rota: "/financeiro/tributacao/difal", desc: "Diferencial de alíquota", icon: Scale },
          { titulo: "Substituição tributária", rota: "/financeiro/tributacao/st-icms", desc: "ICMS-ST", icon: Scale },
          { titulo: "DEFIS", rota: "/financeiro/tributacao/defis", desc: "Declaração do Simples", icon: FileText },
        ],
      },
      {
        titulo: "Guias",
        itens: [
          { titulo: "Painel de guias", rota: "/fiscal/guias", desc: "Todas as guias do período", icon: BadgeDollarSign },
          { titulo: "DARF", rota: "/fiscal/guias/darf", desc: "Guias federais", icon: BadgeDollarSign },
          { titulo: "Guias estaduais", rota: "/fiscal/guias/estaduais", desc: "GNRE e DARE", icon: Landmark },
          { titulo: "Parcelamentos", rota: "/fiscal/guias/parcelamentos", desc: "Parcelamentos em andamento", icon: CalendarClock },
          { titulo: "Calendário", rota: "/fiscal/guias/calendario", desc: "Recolhimentos por data", icon: CalendarClock },
        ],
      },
      {
        titulo: "Obrigações acessórias",
        itens: [
          { titulo: "Painel de obrigações", rota: "/fiscal/obrigacoes", desc: "Monitor de entregas", icon: ClipboardCheck },
          { titulo: "Agenda fiscal", rota: "/fiscal/obrigacoes/agenda", desc: "Prazos da competência", icon: CalendarClock },
          { titulo: "SPED Fiscal", rota: "/fiscal/obrigacoes/sped-fiscal", desc: "Escrituração fiscal digital", icon: FileSpreadsheet },
          { titulo: "EFD-Contribuições", rota: "/fiscal/obrigacoes/efd-contribuicoes", desc: "PIS/COFINS", icon: FileSpreadsheet },
          { titulo: "ECD e ECF", rota: "/fiscal/obrigacoes/ecd-ecf", desc: "Escrituração contábil e fiscal", icon: FileSpreadsheet },
          { titulo: "DCTFWeb", rota: "/fiscal/obrigacoes/dctfweb", desc: "Declaração de débitos e créditos", icon: FileText },
          { titulo: "REINF", rota: "/fiscal/obrigacoes/reinf", desc: "Retenções na fonte", icon: FileText },
          { titulo: "Estaduais", rota: "/fiscal/obrigacoes/estaduais", desc: "Obrigações estaduais", icon: Landmark },
        ],
      },
    ],
  },
  {
    id: "conciliacao",
    codigo: "07",
    titulo: "Conciliação e auditoria",
    resumo: "Confere se o que foi lançado bate com o que aconteceu.",
    icon: ShieldCheck,
    accent: "pink",
    subgrupos: [
      {
        titulo: null,
        itens: [
          { titulo: "Conciliação bancária", rota: "/financeiro/operacional/conciliacao", desc: "Extrato × movimentação contábil", icon: Landmark },
          { titulo: "Painel de auditoria", rota: "/fiscal/auditoria", desc: "Cruzamentos e achados do período", icon: ShieldCheck },
          { titulo: "XML × escrituração", rota: "/fiscal/auditoria/xml-escrituracao", desc: "Divergências entre XML e livros", icon: FileSpreadsheet },
          { titulo: "Classificação fiscal", rota: "/fiscal/auditoria/classificacao", desc: "CFOP, CST e NCM", icon: Scale },
          { titulo: "Créditos", rota: "/fiscal/auditoria/creditos", desc: "Oportunidades de crédito", icon: Coins },
          { titulo: "Certidões", rota: "/fiscal/auditoria/certidoes", desc: "Validade das certidões", icon: ClipboardCheck },
          { titulo: "Regras de auditoria", rota: "/fiscal/auditoria/regras", desc: "Regras parametrizáveis", icon: Cog },
          { titulo: "Auditoria cadastral", rota: "/administrativo/auditoria", desc: "Inconsistências nos cadastros", icon: ShieldCheck },
          { titulo: "Pesquisa global", rota: "/administrativo/pesquisa", desc: "Busca em toda a base", icon: Search },
        ],
      },
    ],
  },
  {
    id: "relatorios",
    codigo: "08",
    titulo: "Relatórios",
    resumo: "O resultado do período em forma de demonstrações e painéis.",
    icon: BarChart3,
    accent: "purple",
    subgrupos: [
      {
        titulo: "Contábeis",
        itens: [
          { titulo: "Balancete de verificação", rota: "/contabil/relatorios/balancete", desc: "Saldos por conta", icon: Scale },
          { titulo: "Razão", rota: "/contabil/relatorios/razao", desc: "Movimento de uma conta", icon: FileText },
          { titulo: "Diário", rota: "/contabil/relatorios/diario", desc: "Lançamentos em ordem cronológica", icon: ScrollText },
        ],
      },
      {
        titulo: "Gerenciais",
        itens: [
          { titulo: "DRE", rota: "/financeiro/demonstracoes/dre", desc: "Resultado do exercício", icon: BarChart3 },
          { titulo: "Dashboard executivo", rota: "/administrativo/dashboard", desc: "Indicadores consolidados", icon: Gauge },
          { titulo: "Painel tributário", rota: "/financeiro/tributacao/dashboard-executivo", desc: "Carga tributária", icon: Gauge },
        ],
      },
    ],
  },
  {
    id: "fechamento",
    codigo: "09",
    titulo: "Fechamento",
    resumo: "O checklist do mês e o encerramento da competência.",
    icon: ClipboardCheck,
    accent: "blue",
    subgrupos: [
      {
        titulo: null,
        itens: [
          { titulo: "Gestão do fechamento", rota: "/preparativos/servicos/gestao", desc: "Fases e tarefas do mês", icon: ClipboardCheck },
          { titulo: "Fases e processos", rota: "/preparativos/servicos/fases-processos", desc: "Modelagem do ciclo mensal", icon: Cog },
          { titulo: "Cadastro de tarefas", rota: "/preparativos/servicos/cadastro-tarefas", desc: "Tarefas por regime tributário", icon: ClipboardCheck },
          { titulo: "Encerramentos", rota: "/preparativos/servicos/encerramentos", desc: "Encerrar e reabrir competências", icon: Lock },
        ],
      },
    ],
  },
  {
    id: "aprender",
    codigo: "10",
    titulo: "Aprender",
    resumo: "Trilhas, lições e modo prática sobre os mesmos motores do sistema.",
    icon: GraduationCap,
    accent: "purple",
    subgrupos: [
      {
        titulo: null,
        itens: [
          { titulo: "Central", rota: "/aprender", desc: "Trilhas e lições", icon: GraduationCap },
          { titulo: "Glossário", rota: "/aprender/glossario", desc: "Termos contábeis e fiscais", icon: BookOpen },
          { titulo: "Modo prática", rota: "/aprender/pratica", desc: "Laboratórios com dados fictícios", icon: FlaskConical },
        ],
      },
    ],
  },
];

/** Índice rota → item, para trilhas e destaques de menu. */
const INDICE = new Map<string, { secao: SecaoNav; item: ItemNav }>();
for (const secao of SECOES) {
  for (const sub of secao.subgrupos) {
    for (const item of sub.itens) INDICE.set(item.rota, { secao, item });
  }
}

/** Todos os itens de navegação, em ordem de seção (usado pela busca de telas). */
export function todosOsItens(): { secao: SecaoNav; item: ItemNav }[] {
  return SECOES.flatMap((secao) =>
    secao.subgrupos.flatMap((sub) => sub.itens.map((item) => ({ secao, item }))),
  );
}

/**
 * Trilha de navegação para a rota informada.
 * Ex.: /contabil/escrituracao/lancamentos → ["Contabilidade (seção)", "Lançamentos"].
 */
export function trilhaDaRota(rota: string): { secao: SecaoNav; item: ItemNav } | undefined {
  const exato = INDICE.get(rota);
  if (exato) return exato;
  let melhor: { secao: SecaoNav; item: ItemNav; tamanho: number } | undefined;
  for (const [chave, valor] of INDICE) {
    if (rota.startsWith(chave + "/") || rota.startsWith(chave)) {
      if (!melhor || chave.length > melhor.tamanho) melhor = { ...valor, tamanho: chave.length };
    }
  }
  return melhor ? { secao: melhor.secao, item: melhor.item } : undefined;
}

/** Seção ativa para a rota (usado para abrir o menu no lugar certo). */
export function secaoDaRota(rota: string): SecaoNav | undefined {
  return trilhaDaRota(rota)?.secao;
}
