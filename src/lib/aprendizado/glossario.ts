/**
 * Glossário técnico da Central de Aprendizado.
 * Conteúdo estático e didático — nenhuma regra fiscal é calculada aqui.
 */

export type AreaAprendizado = "preparativos" | "fiscal" | "financeiro" | "administrativo" | "geral";

export type Termo = {
  slug: string;
  termo: string;
  siglaDe?: string;
  resumo: string;
  detalhe: string;
  area: AreaAprendizado;
  rotas: string[];
  licaoSlug?: string;
};

export const GLOSSARIO: Termo[] = [
  {
    slug: "sped",
    termo: "SPED",
    siglaDe: "Sistema Público de Escrituração Digital",
    resumo: "Plataforma do governo que recebe livros e escriturações em arquivo digital.",
    detalhe:
      "O SPED substituiu os livros fiscais em papel por arquivos digitais assinados. Cada projeto do SPED (Fiscal, Contribuições, ECD, ECF) tem um layout de blocos e registros próprio. Na prática, a empresa escritura os documentos, gera o arquivo, valida no programa validador e transmite. Aqui no sistema a geração é simulada: os registros são montados a partir da escrituração interna, para conferência antes de usar o programa oficial.",
    area: "fiscal",
    rotas: ["/fiscal/obrigacoes/sped-fiscal"],
    licaoSlug: "fiscal-obrigacoes",
  },
  {
    slug: "efd-contribuicoes",
    termo: "EFD-Contribuições",
    resumo: "Escrituração digital das contribuições PIS/Pasep e COFINS.",
    detalhe:
      "Reúne receitas, créditos e retenções do período para demonstrar como se chegou ao PIS e à COFINS devidos. É obrigatória para empresas do Lucro Real e Presumido; o Simples Nacional não entrega. Os créditos só existem no regime não cumulativo (Lucro Real).",
    area: "fiscal",
    rotas: ["/fiscal/obrigacoes/efd-contribuicoes", "/fiscal/apuracoes/pis-cofins"],
    licaoSlug: "fiscal-apuracao-pis-cofins",
  },
  {
    slug: "efd-reinf",
    termo: "EFD-Reinf",
    resumo: "Escrituração de retenções e informações previdenciárias que não passam pela folha.",
    detalhe:
      "Complementa o eSocial: informa retenções de INSS sobre serviços tomados/prestados, retenções na fonte de IR, CSLL, PIS e COFINS, receitas de espetáculos e comercialização rural. Alimenta a DCTFWeb, que gera o DARF único.",
    area: "fiscal",
    rotas: ["/fiscal/obrigacoes/reinf", "/fiscal/apuracoes/retencoes"],
    licaoSlug: "fiscal-apuracao-retencoes",
  },
  {
    slug: "dctfweb",
    termo: "DCTFWeb",
    resumo: "Declaração que confessa os débitos previdenciários e gera o DARF único.",
    detalhe:
      "A DCTFWeb não é digitada: ela é montada com o que foi enviado no eSocial e na EFD-Reinf. Depois de fechada, gera o DARF numerado. Se os débitos não são confessados, não há como pagar corretamente — e o valor pago sem declaração fica sem vínculo.",
    area: "fiscal",
    rotas: ["/fiscal/obrigacoes/dctfweb"],
    licaoSlug: "fiscal-obrigacoes",
  },
  {
    slug: "ecd",
    termo: "ECD",
    siglaDe: "Escrituração Contábil Digital",
    resumo: "Versão digital do Diário, Razão e balancetes.",
    detalhe:
      "Transmite a contabilidade societária do exercício. É a base da ECF: sem ECD consistente, a apuração do IRPJ pelo Lucro Real fica sem lastro.",
    area: "fiscal",
    rotas: ["/fiscal/obrigacoes/ecd-ecf"],
    licaoSlug: "fiscal-obrigacoes",
  },
  {
    slug: "ecf",
    termo: "ECF",
    siglaDe: "Escrituração Contábil Fiscal",
    resumo: "Declaração anual que demonstra a apuração do IRPJ e da CSLL.",
    detalhe:
      "Parte do lucro contábil e aplica as adições, exclusões e compensações (o famoso LALUR eletrônico) até chegar ao lucro real. Também é entregue por empresas do Lucro Presumido, com blocos reduzidos.",
    area: "fiscal",
    rotas: ["/fiscal/obrigacoes/ecd-ecf", "/fiscal/apuracoes/irpj-csll"],
    licaoSlug: "fiscal-apuracao-irpj",
  },
  {
    slug: "ciap",
    termo: "CIAP",
    siglaDe: "Controle de Crédito de ICMS do Ativo Permanente",
    resumo: "Controla o crédito de ICMS de bens do imobilizado, apropriado em 48 parcelas.",
    detalhe:
      "Quando a empresa compra uma máquina, o ICMS pago não vira crédito de uma vez: ele é dividido em 48 parcelas mensais. Cada parcela ainda é proporcional às saídas tributadas sobre o total de saídas do mês — se parte das vendas é isenta, o crédito daquele mês cai na mesma proporção. Se o bem é vendido antes das 48 parcelas, o saldo remanescente é perdido.",
    area: "fiscal",
    rotas: ["/fiscal/escrituracao/ciap"],
    licaoSlug: "fiscal-escrituracao-ciap",
  },
  {
    slug: "difal",
    termo: "DIFAL",
    siglaDe: "Diferencial de Alíquotas do ICMS",
    resumo: "Repartição do ICMS entre estado de origem e estado de destino.",
    detalhe:
      "Em vendas interestaduais para consumidor final, o vendedor recolhe a alíquota interestadual (4%, 7% ou 12%) para a origem e a diferença até a alíquota interna do destino para o estado do comprador. Muitos estados ainda cobram o FCP (Fundo de Combate à Pobreza) junto. Também há DIFAL em compras para uso e consumo ou ativo imobilizado feitas por contribuinte.",
    area: "financeiro",
    rotas: ["/financeiro/tributacao/difal"],
    licaoSlug: "financeiro-difal",
  },
  {
    slug: "icms-st",
    termo: "ICMS-ST",
    siglaDe: "ICMS por Substituição Tributária",
    resumo: "Um contribuinte recolhe antecipadamente o ICMS de toda a cadeia.",
    detalhe:
      "O fabricante ou importador calcula o imposto que seria devido nas etapas seguintes usando uma base presumida (MVA/IVA ou preço de pauta) e recolhe de uma vez. Quem revende mercadoria já com ST não destaca ICMS próprio na saída — e no Simples Nacional essa receita é segregada do PGDAS-D para não pagar duas vezes.",
    area: "financeiro",
    rotas: ["/financeiro/tributacao/st-icms"],
    licaoSlug: "financeiro-st",
  },
  {
    slug: "fator-r",
    termo: "Fator R",
    resumo: "Relação folha/receita que decide se o serviço vai para o Anexo III ou V.",
    detalhe:
      "Fator R = folha de pagamento dos últimos 12 meses ÷ receita bruta dos últimos 12 meses. Se for igual ou maior que 28%, a receita de serviços é tributada pelo Anexo III (alíquota inicial de 6%); abaixo disso, pelo Anexo V (começa em 15,5%). Por isso empresas de serviço acompanham o Fator R mês a mês: pró-labore e encargos entram na folha.",
    area: "fiscal",
    rotas: ["/fiscal/apuracoes/simples-nacional"],
    licaoSlug: "fiscal-apuracao-simples",
  },
  {
    slug: "pgdas-d",
    termo: "PGDAS-D",
    resumo: "Programa em que se declara a receita do Simples e se gera o DAS.",
    detalhe:
      "Declaração mensal por estabelecimento, com a receita segregada por atividade e por tipo (mercado interno, exportação, ST, monofásica, imunidade). A declaração é confissão de dívida: erro na segregação vira imposto pago a mais ou a menos.",
    area: "fiscal",
    rotas: ["/fiscal/apuracoes/simples-nacional"],
    licaoSlug: "fiscal-apuracao-simples",
  },
  {
    slug: "defis",
    termo: "DEFIS",
    resumo: "Declaração anual de informações socioeconômicas do Simples Nacional.",
    detalhe:
      "Entregue até 31 de março do ano seguinte, informa receitas, despesas, sócios, distribuição de lucros e número de empregados. Não gera imposto, mas sua falta bloqueia a geração de DAS de períodos posteriores.",
    area: "financeiro",
    rotas: ["/financeiro/tributacao/defis"],
    licaoSlug: "financeiro-defis",
  },
  {
    slug: "rbt12",
    termo: "RBT12",
    resumo: "Receita bruta acumulada dos 12 meses anteriores ao período de apuração.",
    detalhe:
      "É o valor que define a faixa da tabela do Simples e, portanto, a alíquota efetiva. Alíquota efetiva = (RBT12 × alíquota nominal − parcela a deduzir) ÷ RBT12. Empresas em início de atividade fazem a proporcionalização dos meses.",
    area: "fiscal",
    rotas: ["/fiscal/apuracoes/simples-nacional"],
    licaoSlug: "fiscal-apuracao-simples",
  },
  {
    slug: "anexo-iii-v",
    termo: "Anexo III e Anexo V",
    resumo: "Tabelas de serviços do Simples Nacional, escolhidas pelo Fator R.",
    detalhe:
      "O Anexo III começa em 6% e é mais barato; o Anexo V começa em 15,5%. A diferença entre eles é a intensidade de mão de obra: quem tem folha relevante (Fator R ≥ 28%) entra no III. A mesma empresa pode alternar de anexo de um mês para outro conforme a folha.",
    area: "fiscal",
    rotas: ["/fiscal/apuracoes/simples-nacional"],
    licaoSlug: "fiscal-apuracao-simples",
  },
  {
    slug: "nao-cumulatividade",
    termo: "Não cumulatividade",
    resumo: "Regime em que o imposto pago na entrada vira crédito para abater na saída.",
    detalhe:
      "Vale para ICMS, IPI e, no Lucro Real, para PIS/COFINS. O tributo devido é a diferença entre débitos (saídas) e créditos (entradas). No regime cumulativo (Lucro Presumido) não há crédito: a alíquota é menor, mas incide sobre a receita cheia.",
    area: "fiscal",
    rotas: ["/fiscal/apuracoes/pis-cofins", "/fiscal/escrituracao/apuracao-icms"],
    licaoSlug: "fiscal-apuracao-pis-cofins",
  },
  {
    slug: "cfop",
    termo: "CFOP",
    siglaDe: "Código Fiscal de Operações e Prestações",
    resumo: "Código de 4 dígitos que classifica a natureza da operação.",
    detalhe:
      "O primeiro dígito indica a origem/destino (1/2/3 entradas, 5/6/7 saídas). O CFOP determina se a operação gera crédito, se é tributada, se é devolução, remessa ou exportação — por isso ele comanda praticamente toda a escrituração automática.",
    area: "fiscal",
    rotas: ["/fiscal/documentos/entradas", "/fiscal/documentos/saidas"],
    licaoSlug: "fiscal-documentos",
  },
  {
    slug: "cst",
    termo: "CST / CSOSN",
    resumo: "Código que define a tributação do item no documento fiscal.",
    detalhe:
      "O CST é usado pelo regime normal e o CSOSN pelo Simples Nacional. Ele diz se a operação é tributada, isenta, com substituição, com suspensão ou diferimento — e é o que a escrituração lê para decidir se há débito, crédito ou nada.",
    area: "fiscal",
    rotas: ["/fiscal/auditoria/classificacao"],
    licaoSlug: "fiscal-auditoria",
  },
  {
    slug: "manifestacao-destinatario",
    termo: "Manifestação do destinatário",
    resumo: "Evento em que o comprador confirma, desconhece ou recusa uma NF-e emitida contra ele.",
    detalhe:
      "Evita notas 'frias' em nome da empresa e libera o download do XML completo. As opções são ciência da operação, confirmação, desconhecimento e operação não realizada. Sem manifestação, notas podem ser escrituradas indevidamente.",
    area: "fiscal",
    rotas: ["/fiscal/documentos/manifestacao"],
    licaoSlug: "fiscal-documentos",
  },
  {
    slug: "iss",
    termo: "ISS / ISSQN",
    resumo: "Imposto municipal sobre serviços, de 2% a 5%.",
    detalhe:
      "Incide sobre serviços da lista da LC 116/2003. Regra geral, o imposto é do município do prestador, mas há serviços em que a competência é do tomador (construção civil, limpeza, vigilância, entre outros) — nesses casos há retenção na fonte.",
    area: "fiscal",
    rotas: ["/fiscal/apuracoes/iss"],
    licaoSlug: "fiscal-apuracao-iss",
  },
  {
    slug: "retencao-fonte",
    termo: "Retenções na fonte",
    resumo: "O tomador desconta o tributo do pagamento e recolhe no lugar do prestador.",
    detalhe:
      "Envolve IRRF, PIS/COFINS/CSLL (o conjunto de 4,65%), INSS de 11% sobre cessão de mão de obra e ISS. O prestador compensa o valor retido na sua própria apuração — por isso o controle das retenções precisa bater com as notas.",
    area: "fiscal",
    rotas: ["/fiscal/apuracoes/retencoes"],
    licaoSlug: "fiscal-apuracao-retencoes",
  },
  {
    slug: "lucro-presumido",
    termo: "Lucro Presumido",
    resumo: "Regime que presume o lucro por percentual sobre a receita.",
    detalhe:
      "A base do IRPJ/CSLL é obtida aplicando percentuais de presunção sobre a receita (8% comércio/indústria e 32% serviços para IRPJ; 12% e 32% para CSLL). Apuração trimestral, PIS/COFINS cumulativos (0,65% e 3%).",
    area: "financeiro",
    rotas: ["/financeiro/tabelas/lucro-presumido", "/fiscal/apuracoes/irpj-csll"],
    licaoSlug: "fiscal-apuracao-irpj",
  },
  {
    slug: "lucro-real",
    termo: "Lucro Real",
    resumo: "Regime que parte do lucro contábil ajustado por adições e exclusões.",
    detalhe:
      "IRPJ de 15% mais adicional de 10% sobre o que exceder R$ 20.000/mês e CSLL de 9%. PIS/COFINS não cumulativos (1,65% e 7,6%) com direito a crédito. Permite compensar prejuízos fiscais limitados a 30% do lucro.",
    area: "financeiro",
    rotas: ["/financeiro/tabelas/lucro-real", "/fiscal/apuracoes/irpj-csll"],
    licaoSlug: "fiscal-apuracao-irpj",
  },
  {
    slug: "simei",
    termo: "SIMEI",
    resumo: "Recolhimento em valor fixo mensal do Microempreendedor Individual.",
    detalhe:
      "O MEI paga um DAS fixo (INSS + ICMS ou ISS conforme a atividade), independentemente do faturamento, respeitando o limite anual. Entrega a DASN-SIMEI uma vez por ano.",
    area: "financeiro",
    rotas: ["/financeiro/tabelas/simei"],
    licaoSlug: "financeiro-tabelas",
  },
  {
    slug: "competencia",
    termo: "Regime de competência",
    resumo: "Reconhece receitas e despesas quando ocorrem, não quando o dinheiro entra ou sai.",
    detalhe:
      "É o princípio que separa contabilidade de fluxo de caixa. Uma venda a prazo em julho é receita de julho, mesmo que o recebimento seja em setembro. É por isso que o sistema trabalha sempre com um seletor de competência.",
    area: "geral",
    rotas: ["/financeiro/demonstracoes/dre"],
    licaoSlug: "financeiro-dre",
  },
  {
    slug: "dre",
    termo: "DRE",
    siglaDe: "Demonstração do Resultado do Exercício",
    resumo: "Relatório que parte da receita bruta e chega ao lucro ou prejuízo do período.",
    detalhe:
      "Estrutura: receita bruta − deduções = receita líquida; − CMV/CPV = lucro bruto; − despesas operacionais = resultado operacional; ± resultado financeiro = lucro antes dos tributos; − IRPJ/CSLL = resultado líquido. A análise vertical mostra o peso de cada linha sobre a receita; a horizontal, a variação entre períodos.",
    area: "financeiro",
    rotas: ["/financeiro/demonstracoes/dre"],
    licaoSlug: "financeiro-dre",
  },
  {
    slug: "conciliacao-bancaria",
    termo: "Conciliação bancária",
    resumo: "Confronto entre o extrato do banco e os lançamentos internos.",
    detalhe:
      "Todo valor do extrato deve ter contrapartida no sistema e vice-versa. As diferenças típicas são tarifas não lançadas, cheques não compensados, recebimentos não identificados e duplicidades. Conciliar é pré-requisito para fechar o caixa da competência.",
    area: "financeiro",
    rotas: ["/financeiro/operacional/conciliacao"],
    licaoSlug: "financeiro-conciliacao",
  },
  {
    slug: "depreciacao",
    termo: "Depreciação",
    resumo: "Apropriação, como despesa, do desgaste de um bem ao longo da vida útil.",
    detalhe:
      "Método linear: valor depreciável ÷ vida útil em meses. A Receita publica taxas usuais (móveis 10% a.a., máquinas 10%, veículos 20%, computadores 20%). Contabilmente a vida útil deve refletir o uso real do bem; a diferença entre a taxa contábil e a fiscal vira ajuste na ECF.",
    area: "administrativo",
    rotas: ["/administrativo/patrimonio/depreciacao"],
    licaoSlug: "administrativo-patrimonio",
  },
  {
    slug: "imobilizado",
    termo: "Ativo imobilizado",
    resumo: "Bens tangíveis usados na operação por mais de um exercício.",
    detalhe:
      "Entram pelo custo de aquisição mais gastos necessários para colocar o bem em condição de uso. Não são despesa no mês da compra: viram despesa aos poucos, via depreciação. Baixas por venda ou sucateamento geram ganho ou perda de capital.",
    area: "administrativo",
    rotas: ["/administrativo/patrimonio/bens"],
    licaoSlug: "administrativo-patrimonio",
  },
  {
    slug: "segregacao-funcoes",
    termo: "Segregação de funções",
    resumo: "Quem aprova não é quem executa nem quem confere.",
    detalhe:
      "É o controle interno mais básico contra fraude e erro: separar autorização, custódia e registro. Aparece nas alçadas de aprovação de compras, na liberação de pagamentos e nos perfis de acesso do sistema.",
    area: "administrativo",
    rotas: ["/administrativo/controles/matriz-riscos"],
    licaoSlug: "administrativo-controles",
  },
  {
    slug: "cnae",
    termo: "CNAE",
    siglaDe: "Classificação Nacional de Atividades Econômicas",
    resumo: "Código que identifica a atividade econômica da empresa.",
    detalhe:
      "Define enquadramentos tributários, anexo do Simples, obrigatoriedade de inscrição estadual e até alíquota de ISS. O CNAE principal deve refletir a atividade de maior receita; os secundários cobrem o resto.",
    area: "preparativos",
    rotas: ["/preparativos/cadastros/classe-atividades", "/preparativos/cadastros/empresas/novo"],
    licaoSlug: "preparativos-empresas",
  },
  {
    slug: "certificado-digital",
    termo: "Certificado digital A1 / A3",
    resumo: "Identidade eletrônica usada para assinar e transmitir arquivos fiscais.",
    detalhe:
      "O A1 é um arquivo instalado no computador ou servidor, com validade de 1 ano; o A3 fica em token ou cartão, com validade de até 3 anos. Certificado vencido paralisa emissão de notas e entrega de obrigações — por isso o controle de validade é crítico.",
    area: "preparativos",
    rotas: ["/preparativos/empresa/certificados"],
    licaoSlug: "preparativos-certificados",
  },
  {
    slug: "inscricao-estadual",
    termo: "Inscrição estadual e municipal",
    resumo: "Registros que habilitam a empresa a recolher ICMS e ISS.",
    detalhe:
      "A inscrição estadual é exigida de quem circula mercadoria; a municipal, de quem presta serviço. Uma empresa pode ter as duas. Filiais têm inscrições próprias, e é isso que separa a apuração por estabelecimento.",
    area: "preparativos",
    rotas: ["/preparativos/empresa/inscricoes"],
    licaoSlug: "preparativos-inscricoes",
  },
  {
    slug: "fechamento-competencia",
    termo: "Fechamento de competência",
    resumo: "Rotina que confere, apura e bloqueia o período.",
    detalhe:
      "Sequência típica: conferir cadastros → importar e validar documentos → escriturar → apurar tributos → gerar obrigações e guias → conciliar → encerrar. Depois de encerrada, a competência não deve mais receber lançamentos sem reabertura formal.",
    area: "preparativos",
    rotas: ["/preparativos/servicos/gestao", "/preparativos/servicos/encerramentos"],
    licaoSlug: "preparativos-fechamento",
  },
  {
    slug: "mva",
    termo: "MVA / IVA-ST",
    resumo: "Margem presumida usada para calcular a base do ICMS-ST.",
    detalhe:
      "A base da substituição é o valor da operação acrescido da margem de valor agregado definida por protocolo/convênio. Quando origem e destino têm cargas diferentes, aplica-se o MVA ajustado.",
    area: "financeiro",
    rotas: ["/financeiro/tributacao/st-icms"],
    licaoSlug: "financeiro-st",
  },
  {
    slug: "fcp",
    termo: "FCP",
    siglaDe: "Fundo de Combate à Pobreza",
    resumo: "Adicional de ICMS de 1% a 4% cobrado por vários estados.",
    detalhe:
      "Incide sobre produtos definidos em lei estadual e, no DIFAL, é sempre devido ao estado de destino, recolhido em guia separada em boa parte dos estados.",
    area: "financeiro",
    rotas: ["/financeiro/tributacao/difal"],
    licaoSlug: "financeiro-difal",
  },
  {
    slug: "darf",
    termo: "DARF",
    resumo: "Guia de recolhimento de tributos federais.",
    detalhe:
      "Identificada por um código de receita que diz qual tributo está sendo pago. Em atraso, soma multa de mora de 0,33% ao dia (limitada a 20%) e juros pela Selic acumulada. A DCTFWeb gera um DARF numerado próprio.",
    area: "fiscal",
    rotas: ["/fiscal/guias/darf"],
    licaoSlug: "fiscal-guias",
  },
  {
    slug: "selic",
    termo: "Juros Selic",
    resumo: "Índice usado para corrigir tributos federais pagos em atraso.",
    detalhe:
      "Acumula-se a Selic mensal dos meses entre o vencimento e o pagamento, somando 1% no mês do pagamento. É o padrão federal; estados e municípios têm índices próprios.",
    area: "fiscal",
    rotas: ["/fiscal/guias/darf", "/fiscal/guias/parcelamentos"],
    licaoSlug: "fiscal-guias",
  },
  {
    slug: "livro-registro",
    termo: "Livros de entradas e saídas",
    resumo: "Registro cronológico dos documentos fiscais do período.",
    detalhe:
      "São a ponte entre o documento e a apuração: o livro totaliza bases e impostos por CFOP e CST, e é desse total que sai o ICMS/IPI a recolher. No SPED, correspondem aos registros C100/C170 e apuração no bloco E.",
    area: "fiscal",
    rotas: ["/fiscal/escrituracao/livro-entradas", "/fiscal/escrituracao/livro-saidas"],
    licaoSlug: "fiscal-escrituracao",
  },
  {
    slug: "inventario",
    termo: "Registro de inventário",
    resumo: "Relação de estoques existentes no encerramento do período.",
    detalhe:
      "Base para o cálculo do CMV e obrigatório no bloco H do SPED Fiscal. Divergência entre inventário e movimentação é indício clássico de nota não escriturada.",
    area: "fiscal",
    rotas: ["/fiscal/escrituracao/inventario"],
    licaoSlug: "fiscal-escrituracao",
  },
  {
    slug: "certidao-negativa",
    termo: "CND / CPEND",
    resumo: "Certidão que atesta a regularidade fiscal da empresa.",
    detalhe:
      "A negativa (CND) indica ausência de pendências; a positiva com efeito de negativa (CPEND) indica débitos com exigibilidade suspensa. É exigida em licitações, financiamentos e alterações societárias, e vence normalmente em 180 dias.",
    area: "fiscal",
    rotas: ["/fiscal/auditoria/certidoes"],
    licaoSlug: "fiscal-auditoria",
  },
];

const normalizar = (v: string) =>
  v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const TERMO_MAP = Object.fromEntries(GLOSSARIO.map((t) => [t.slug, t]));

export function buscarTermos(busca: string) {
  const q = normalizar(busca.trim());
  if (!q) return GLOSSARIO;
  return GLOSSARIO.filter((t) =>
    normalizar(`${t.termo} ${t.siglaDe ?? ""} ${t.resumo} ${t.detalhe}`).includes(q),
  );
}

export function termosDaRota(rota: string) {
  return GLOSSARIO.filter((t) => t.rotas.some((r) => rota.startsWith(r)));
}
