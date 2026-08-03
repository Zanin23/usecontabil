/**
 * Conteúdo das lições da Central de Aprendizado.
 * Cada lição combina "como usar a tela" + "o conceito contábil/fiscal por trás".
 * Nenhuma regra fiscal é calculada aqui — os motores continuam nos stores de domínio.
 */
import type { AreaAprendizado } from "./glossario";

export type PraticaId = "simples" | "icms-difal" | "pis-cofins" | "retencoes";

export type Licao = {
  slug: string;
  area: AreaAprendizado;
  titulo: string;
  resumo: string;
  rota: string;
  /** rotas adicionais que também abrem esta lição */
  rotasExtras?: string[];
  comoUsar: string[];
  conceito: string[];
  baseLegal?: string[];
  termos: string[];
  praticaId?: PraticaId;
  nivel: "Introdução" | "Intermediário" | "Avançado";
};

export const LICOES: Licao[] = [
  /* ------------------------------ Preparativos ------------------------------ */
  {
    slug: "preparativos-empresas",
    area: "preparativos",
    titulo: "Cadastro de empresas do grupo",
    resumo: "O cadastro que alimenta todo o resto do sistema.",
    rota: "/preparativos/cadastros/empresas/novo",
    rotasExtras: ["/preparativos/cadastros/classe-atividades", "/preparativos/cadastros/resumo-classe-atividades"],
    nivel: "Introdução",
    comoUsar: [
      "Informe o CNPJ e use a busca automática para trazer razão social, endereço e CNAEs públicos.",
      "Confira o regime tributário: é ele que define quais motores de apuração serão usados nesta empresa.",
      "Percorra as abas Dados, Senhas, Fiscal e Societário — campos obrigatórios ficam marcados.",
      "Salve. A empresa passa a aparecer no seletor do topo e em todas as telas por competência.",
    ],
    conceito: [
      "Contabilidade é sempre por pessoa jurídica e por estabelecimento. O CNPJ define a entidade; a inscrição estadual/municipal define o estabelecimento que apura.",
      "O regime tributário (Simples, Presumido, Real ou MEI) não é uma etiqueta: ele muda base de cálculo, alíquota, direito a crédito e quais declarações são entregues.",
      "O CNAE principal determina o anexo do Simples, a incidência de ISS ou ICMS e várias obrigações estaduais.",
    ],
    termos: ["cnae", "lucro-presumido", "lucro-real", "simei", "inscricao-estadual"],
  },
  {
    slug: "preparativos-filiais",
    area: "preparativos",
    titulo: "Filiais e unidades",
    resumo: "Por que cada estabelecimento apura separado.",
    rota: "/preparativos/cadastros/filiais",
    nivel: "Introdução",
    comoUsar: [
      "Cadastre cada filial com CNPJ próprio (mesma raiz, ordem diferente) e sua inscrição estadual.",
      "Marque a matriz — ela concentra as obrigações centralizadas, como DCTFWeb e ECF.",
      "Filiais inativas devem ser encerradas no cadastro, e não excluídas, para preservar o histórico.",
    ],
    conceito: [
      "ICMS, IPI e ISS são apurados por estabelecimento: cada filial tem seus próprios livros e sua própria guia.",
      "IRPJ, CSLL, PIS e COFINS são apurados de forma centralizada na matriz, somando todos os estabelecimentos.",
      "Essa dupla lógica é a razão de o sistema pedir empresa e filial em telas diferentes.",
    ],
    termos: ["inscricao-estadual", "fechamento-competencia"],
  },
  {
    slug: "preparativos-inscricoes",
    area: "preparativos",
    titulo: "Inscrições e parâmetros da empresa",
    resumo: "Onde o sistema aprende como a empresa é tributada.",
    rota: "/preparativos/empresa/inscricoes",
    rotasExtras: ["/preparativos/empresa/parametros", "/preparativos/empresa/dados-empresa", "/preparativos/empresa/pagamentos"],
    nivel: "Introdução",
    comoUsar: [
      "Preencha inscrição estadual, municipal e eventuais inscrições de substituto tributário em outros estados.",
      "Em Parâmetros, defina regime, forma de apuração e códigos de receita padrão das guias.",
      "Estas informações são lidas pelos motores de apuração: alterá-las muda o resultado do período em aberto.",
    ],
    conceito: [
      "Inscrição de substituto tributário em outro estado é o que permite recolher ICMS-ST por GNRE em vez de guia avulsa nota a nota.",
      "Parâmetros mal preenchidos são a causa mais comum de apuração 'estranha': antes de duvidar do cálculo, confira o cadastro.",
    ],
    termos: ["inscricao-estadual", "icms-st"],
  },
  {
    slug: "preparativos-certificados",
    area: "preparativos",
    titulo: "Certificados digitais",
    resumo: "A chave que assina tudo que sai da empresa.",
    rota: "/preparativos/empresa/certificados",
    nivel: "Introdução",
    comoUsar: [
      "Registre tipo (A1 ou A3), titular e data de validade de cada certificado.",
      "Acompanhe os avisos de vencimento — o sistema gera notificação antes de expirar.",
    ],
    conceito: [
      "O certificado é a identidade eletrônica da empresa: sem ele não há emissão de NF-e nem transmissão de SPED.",
      "A renovação leva dias: por isso o controle de validade faz parte do calendário fiscal, não da rotina de TI.",
    ],
    termos: ["certificado-digital"],
  },
  {
    slug: "preparativos-fechamento",
    area: "preparativos",
    titulo: "Gestão de fechamento e encerramentos",
    resumo: "A rotina que amarra todas as áreas na competência.",
    rota: "/preparativos/servicos/gestao",
    rotasExtras: [
      "/preparativos/servicos/fases-processos",
      "/preparativos/servicos/cadastro-tarefas",
      "/preparativos/servicos/encerramentos",
    ],
    nivel: "Intermediário",
    comoUsar: [
      "Escolha a empresa e a competência no topo — as fases mostradas mudam conforme o regime tributário.",
      "Clique em uma fase para expandir e ver as tarefas ligadas a ela; cada tarefa leva à tela responsável.",
      "Resolva as pendências apontadas (cadastros incompletos, documentos sem validação, guias sem pagamento).",
      "Em Encerramentos, feche a competência. Reabrir exige justificativa e fica registrado.",
    ],
    conceito: [
      "Fechar a competência é declarar que aquele período está conferido: escriturado, apurado, declarado e conciliado.",
      "A ordem importa — apurar antes de escriturar produz números que mudam depois; conciliar antes de lançar produz falsas diferenças.",
      "O bloqueio do período é um controle interno: impede que um lançamento retroativo altere números já declarados.",
    ],
    termos: ["fechamento-competencia", "competencia"],
  },

  /* --------------------------------- Fiscal --------------------------------- */
  {
    slug: "fiscal-documentos",
    area: "fiscal",
    titulo: "Documentos fiscais",
    resumo: "A porta de entrada de todo o fiscal.",
    rota: "/fiscal/documentos",
    nivel: "Introdução",
    comoUsar: [
      "Escolha o tipo de documento (entradas, saídas, serviços, transporte, cupons) e a competência.",
      "Importe ou lance manualmente; confira CFOP, CST e valores antes de validar.",
      "Documentos validados alimentam automaticamente a escrituração e as apurações — não é preciso redigitar.",
    ],
    conceito: [
      "O documento fiscal é o fato gerador registrado: sem ele não existe crédito, débito nem obrigação.",
      "O CFOP conta o que aconteceu (venda, devolução, remessa, exportação) e o CST/CSOSN conta como aquilo é tributado. Essa dupla comanda a escrituração.",
      "Data de emissão define a competência; data de entrada define quando o crédito pode ser aproveitado.",
    ],
    termos: ["cfop", "cst", "manifestacao-destinatario"],
  },
  {
    slug: "fiscal-escrituracao",
    area: "fiscal",
    titulo: "Escrituração fiscal",
    resumo: "Do documento avulso ao livro totalizado.",
    rota: "/fiscal/escrituracao",
    nivel: "Intermediário",
    comoUsar: [
      "Os livros de entradas e saídas são derivados dos documentos válidos da competência — eles não são digitados.",
      "Se um valor parecer errado, volte ao documento de origem: o livro apenas totaliza.",
      "Apuração de ICMS e IPI mostram débitos, créditos e saldo; Inventário e CIAP complementam o bloco H e G do SPED.",
    ],
    conceito: [
      "Escriturar é organizar cronologicamente os documentos e totalizá-los por CFOP e CST para permitir a apuração.",
      "O ICMS é não cumulativo: imposto devido = débitos das saídas − créditos das entradas. Saldo credor não some, transporta para o mês seguinte.",
      "O crédito exige que a entrada seja tributada e destinada à atividade — entradas isentas ou para uso e consumo, em regra, não geram crédito.",
    ],
    termos: ["livro-registro", "nao-cumulatividade", "inventario", "ciap"],
  },
  {
    slug: "fiscal-escrituracao-ciap",
    area: "fiscal",
    titulo: "CIAP: crédito de ICMS do imobilizado",
    resumo: "Por que o crédito da máquina leva 4 anos.",
    rota: "/fiscal/escrituracao/ciap",
    nivel: "Avançado",
    comoUsar: [
      "Cadastre o bem com valor, ICMS destacado e data de entrada.",
      "O sistema distribui o crédito em 48 parcelas e aplica o coeficiente de saídas tributadas do mês.",
      "Baixas antes do fim das 48 parcelas encerram o crédito remanescente.",
    ],
    conceito: [
      "Como o bem será usado por vários anos, a legislação não permite tomar o crédito de uma vez: são 48 parcelas mensais.",
      "Cada parcela é multiplicada pela proporção entre saídas tributadas e saídas totais do mês — quem tem muita venda isenta aproveita menos.",
      "Fórmula da parcela: (ICMS do bem ÷ 48) × (saídas tributadas ÷ saídas totais).",
    ],
    baseLegal: ["LC 87/1996, art. 20, §5º"],
    termos: ["ciap", "imobilizado", "nao-cumulatividade"],
  },
  {
    slug: "fiscal-apuracao-simples",
    area: "fiscal",
    titulo: "Apuração do Simples Nacional",
    resumo: "RBT12, alíquota efetiva, Fator R e segregação de receitas.",
    rota: "/fiscal/apuracoes/simples-nacional",
    nivel: "Intermediário",
    praticaId: "simples",
    comoUsar: [
      "Informe RBT12 e folha dos últimos 12 meses nos parâmetros da apuração.",
      "Confira a segregação: receitas com ST, monofásicas e de exportação saem da base.",
      "Abra a memória de cálculo de cada linha para ver faixa, alíquota nominal, parcela a deduzir e alíquota efetiva.",
    ],
    conceito: [
      "A alíquota do Simples não é a da tabela: é a efetiva = (RBT12 × alíquota nominal − parcela a deduzir) ÷ RBT12.",
      "O Fator R (folha 12 meses ÷ receita 12 meses) decide se o serviço vai para o Anexo III (6% inicial) ou para o Anexo V (15,5% inicial).",
      "Receita com ICMS-ST já recolhido e receita monofásica de PIS/COFINS são segregadas para não pagar duas vezes o mesmo tributo.",
    ],
    baseLegal: ["LC 123/2006, arts. 18 e 18-A"],
    termos: ["rbt12", "fator-r", "anexo-iii-v", "pgdas-d", "icms-st"],
  },
  {
    slug: "fiscal-apuracao-pis-cofins",
    area: "fiscal",
    titulo: "Apuração de PIS e COFINS",
    resumo: "Cumulativo x não cumulativo e a lógica dos créditos.",
    rota: "/fiscal/apuracoes/pis-cofins",
    nivel: "Intermediário",
    praticaId: "pis-cofins",
    comoUsar: [
      "O regime vem do cadastro da empresa: Presumido usa cumulativo, Real usa não cumulativo.",
      "Confira as linhas de crédito — só aparecem no não cumulativo, e apenas para insumos permitidos.",
      "Ajustes de exclusão (ICMS na base, receitas monofásicas) são lançados na aba de ajustes, com histórico.",
    ],
    conceito: [
      "Cumulativo: 0,65% de PIS e 3% de COFINS sobre a receita, sem crédito nenhum.",
      "Não cumulativo: 1,65% e 7,6%, com crédito sobre insumos, energia, aluguel de PJ, depreciação e fretes de venda.",
      "O conceito de insumo é o de essencialidade e relevância para a atividade — não é qualquer despesa.",
      "O ICMS destacado na nota não compõe a base de PIS/COFINS (Tema 69 do STF).",
    ],
    baseLegal: ["Leis 10.637/2002 e 10.833/2003", "STF, RE 574.706 (Tema 69)"],
    termos: ["nao-cumulatividade", "efd-contribuicoes"],
  },
  {
    slug: "fiscal-apuracao-iss",
    area: "fiscal",
    titulo: "Apuração de ISS",
    resumo: "Onde o serviço é tributado e quem recolhe.",
    rota: "/fiscal/apuracoes/iss",
    nivel: "Intermediário",
    comoUsar: [
      "As notas de serviços prestados alimentam a apuração; as tomadas alimentam o ISS retido.",
      "Confira o município de incidência de cada nota — ele define a alíquota aplicada.",
      "Serviços com retenção aparecem separados: o valor retido é abatido do ISS a recolher.",
    ],
    conceito: [
      "Regra geral: o ISS é devido no município do prestador. As exceções da LC 116/2003 deslocam a competência para o município do tomador.",
      "As alíquotas variam de 2% a 5% por município e por item da lista de serviços.",
      "Retenção não é imposto novo: é antecipação feita pelo tomador, que o prestador compensa.",
    ],
    baseLegal: ["LC 116/2003"],
    termos: ["iss", "retencao-fonte"],
  },
  {
    slug: "fiscal-apuracao-irpj",
    area: "fiscal",
    titulo: "Apuração de IRPJ e CSLL",
    resumo: "Presunção, lucro real e o adicional de 10%.",
    rota: "/fiscal/apuracoes/irpj-csll",
    nivel: "Avançado",
    comoUsar: [
      "No Presumido, o sistema aplica os percentuais de presunção sobre a receita do trimestre.",
      "No Real, parte do resultado contábil e aplica adições e exclusões lançadas nos ajustes.",
      "Confira as antecipações e retenções: elas abatem o valor a recolher.",
    ],
    conceito: [
      "Presumido: base de IRPJ = 8% da receita (comércio/indústria) ou 32% (serviços); CSLL = 12% ou 32%.",
      "Real: base = lucro contábil + adições − exclusões − compensação de prejuízo (limitada a 30%).",
      "IRPJ é 15% sobre a base, mais adicional de 10% sobre o que exceder R$ 20.000 por mês do período; CSLL é 9%.",
    ],
    baseLegal: ["Lei 9.430/1996", "Decreto 9.580/2018 (RIR)"],
    termos: ["lucro-presumido", "lucro-real", "ecf"],
  },
  {
    slug: "fiscal-apuracao-retencoes",
    area: "fiscal",
    titulo: "Retenções na fonte",
    resumo: "Quem retém, quanto retém e quem compensa.",
    rota: "/fiscal/apuracoes/retencoes",
    nivel: "Intermediário",
    praticaId: "retencoes",
    comoUsar: [
      "As notas de serviços tomados geram retenções a recolher; as prestadas geram retenções a compensar.",
      "Confira os limites de dispensa antes de gerar as guias.",
      "As retenções apuradas alimentam a EFD-Reinf e a DCTFWeb do período.",
    ],
    conceito: [
      "IRRF sobre serviços profissionais: 1,5% sobre o valor do serviço.",
      "PIS/COFINS/CSLL: 4,65% em conjunto, quando o tomador é pessoa jurídica e o serviço está na lista.",
      "INSS: 11% sobre cessão de mão de obra e empreitada.",
      "ISS: conforme a legislação do município do tomador.",
      "Reter é antecipar: o prestador compensa o valor na apuração dele, e por isso a retenção precisa constar na nota.",
    ],
    baseLegal: ["Lei 10.833/2003, arts. 30 a 36", "IN RFB 971/2009"],
    termos: ["retencao-fonte", "efd-reinf", "dctfweb"],
  },
  {
    slug: "fiscal-obrigacoes",
    area: "fiscal",
    titulo: "Obrigações acessórias",
    resumo: "SPED, EFD-Contribuições, ECD/ECF, DCTFWeb e REINF.",
    rota: "/fiscal/obrigacoes",
    nivel: "Intermediário",
    comoUsar: [
      "A agenda mostra o que vence na competência, por empresa e por regime.",
      "Cada obrigação exibe a base usada, os registros gerados e as inconsistências antes do fechamento.",
      "Gere o arquivo, confira os blocos e marque como entregue — o status alimenta o encerramento.",
    ],
    conceito: [
      "Obrigação principal é pagar o tributo; obrigação acessória é informar. A multa por não informar existe mesmo sem imposto a pagar.",
      "As declarações se encadeiam: eSocial e EFD-Reinf alimentam a DCTFWeb; a ECD alimenta a ECF.",
      "Declaração é confissão de dívida — o que foi declarado pode ser cobrado diretamente, sem auto de infração.",
      "Neste sistema a geração é simulada, para conferência interna antes do uso dos programas oficiais.",
    ],
    termos: ["sped", "efd-contribuicoes", "efd-reinf", "dctfweb", "ecd", "ecf"],
  },
  {
    slug: "fiscal-guias",
    area: "fiscal",
    titulo: "Guias e recolhimentos",
    resumo: "Vencimentos, multa de mora, juros e parcelamentos.",
    rota: "/fiscal/guias",
    nivel: "Intermediário",
    comoUsar: [
      "As guias nascem das apurações; ajuste apenas data de pagamento e responsável.",
      "Ao informar pagamento em atraso, o sistema recalcula multa e juros e mostra a composição.",
      "O calendário concentra os vencimentos do mês por empresa.",
    ],
    conceito: [
      "Multa de mora federal: 0,33% por dia de atraso, limitada a 20%.",
      "Juros: soma da Selic dos meses entre vencimento e pagamento, mais 1% no mês do pagamento.",
      "Parcelar interrompe a cobrança, mas confessa a dívida e impede discutir o débito depois.",
    ],
    termos: ["darf", "selic"],
  },
  {
    slug: "fiscal-auditoria",
    area: "fiscal",
    titulo: "Auditoria fiscal",
    resumo: "Cruzamentos que encontram erro antes do fisco.",
    rota: "/fiscal/auditoria",
    nivel: "Avançado",
    comoUsar: [
      "Rode as regras da competência e trate as inconsistências por gravidade.",
      "Cada achado leva à tela de origem, com o documento apontado.",
      "Certidões e classificação fiscal têm painéis próprios de acompanhamento.",
    ],
    conceito: [
      "O fisco cruza XML autorizado × escrituração × declaração × pagamento. Auditar internamente é antecipar esse cruzamento.",
      "Erros mais comuns: nota autorizada não escriturada, CFOP incompatível com o CST, crédito indevido sobre entrada isenta e divergência de inventário.",
      "Corrigir antes da entrega custa retificação; corrigir depois custa multa.",
    ],
    termos: ["cst", "certidao-negativa", "sped"],
  },

  /* -------------------------------- Financeiro ------------------------------- */
  {
    slug: "financeiro-tabelas",
    area: "financeiro",
    titulo: "Tabelas de regimes tributários",
    resumo: "As faixas e percentuais que os motores consultam.",
    rota: "/financeiro/tabelas/simei",
    rotasExtras: [
      "/financeiro/tabelas/simples-nacional",
      "/financeiro/tabelas/lucro-real",
      "/financeiro/tabelas/lucro-presumido",
      "/financeiro/tabelas/ajuste-apuracao",
      "/financeiro/tabelas/ajuste-documento-fiscal",
      "/financeiro/tabelas/apuracao-pis-cofins",
    ],
    nivel: "Introdução",
    comoUsar: [
      "Consulte a tabela vigente por regime antes de conferir uma apuração.",
      "As tabelas são parametrizadas: alterá-las muda o resultado dos motores nas próximas apurações.",
    ],
    conceito: [
      "Toda alíquota tem uma tabela e uma vigência. Conferir apuração é, quase sempre, conferir qual tabela foi aplicada.",
      "Parcela a deduzir existe para suavizar a mudança de faixa: sem ela, faturar R$ 1 a mais aumentaria muito o imposto.",
    ],
    termos: ["rbt12", "lucro-presumido", "lucro-real", "simei"],
  },
  {
    slug: "financeiro-difal",
    area: "financeiro",
    titulo: "DIFAL",
    resumo: "A divisão do ICMS entre origem e destino.",
    rota: "/financeiro/tributacao/difal",
    nivel: "Avançado",
    praticaId: "icms-difal",
    comoUsar: [
      "Informe UF de origem e destino, valor da operação e origem do produto (nacional ou importado).",
      "O sistema aplica a alíquota interestadual, a interna do destino e o FCP, mostrando a memória de cálculo.",
    ],
    conceito: [
      "Alíquota interestadual: 4% para produto importado, 7% do Sul/Sudeste para Norte/Nordeste/Centro-Oeste e ES, 12% nos demais casos.",
      "DIFAL = valor × (alíquota interna do destino − alíquota interestadual). O FCP é somado à parte do destino.",
      "Em venda para consumidor final não contribuinte, quem recolhe é o remetente; para contribuinte, o destinatário.",
    ],
    baseLegal: ["EC 87/2015", "LC 190/2022"],
    termos: ["difal", "fcp"],
  },
  {
    slug: "financeiro-st",
    area: "financeiro",
    titulo: "Substituição tributária",
    resumo: "Antecipar o imposto de toda a cadeia.",
    rota: "/financeiro/tributacao/st-icms",
    nivel: "Avançado",
    comoUsar: [
      "Verifique se o NCM do produto está no protocolo do estado de destino.",
      "Informe a MVA aplicável; o sistema calcula base presumida, ICMS-ST e o próprio.",
    ],
    conceito: [
      "Base ST = (valor + frete + IPI + despesas) × (1 + MVA). ICMS-ST = base ST × alíquota interna − ICMS próprio.",
      "Quando origem e destino têm cargas diferentes, usa-se o MVA ajustado.",
      "Quem revende produto com ST não destaca ICMS na saída e, no Simples, segrega essa receita no PGDAS-D.",
    ],
    termos: ["icms-st", "mva", "pgdas-d"],
  },
  {
    slug: "financeiro-defis",
    area: "financeiro",
    titulo: "DEFIS e obrigações anuais do Simples",
    resumo: "O que se declara depois do fim do ano.",
    rota: "/financeiro/tributacao/defis",
    nivel: "Introdução",
    comoUsar: [
      "Confira receitas, despesas, sócios e lucros distribuídos do ano-calendário.",
      "A DEFIS é anual: a competência selecionada serve apenas para localizar o ano-base.",
    ],
    conceito: [
      "A DEFIS informa dados socioeconômicos, não gera imposto — mas sua ausência impede gerar DAS de períodos seguintes.",
      "O lucro distribuído isento é limitado à base de presunção, salvo com contabilidade regular que comprove lucro maior.",
    ],
    termos: ["defis", "pgdas-d"],
  },
  {
    slug: "financeiro-movimentos",
    area: "financeiro",
    titulo: "Movimentos e faturamento",
    resumo: "Onde o documento vira número tributável.",
    rota: "/financeiro/movimentos/faturamento",
    rotasExtras: [
      "/financeiro/movimentos/servicos",
      "/financeiro/movimentos/demais-documentos",
      "/financeiro/movimentos/conclusao-fiscal",
      "/financeiro/cadastros/produtos",
      "/financeiro/cadastros/clientes-fornecedores",
    ],
    nivel: "Intermediário",
    comoUsar: [
      "Lance itens com NCM, CFOP e CST; o motor calcula os tributos e monta a memória por item.",
      "Use a conclusão fiscal para revisar o lote antes de liberar para a escrituração.",
    ],
    conceito: [
      "O cálculo é por item, não por nota: cada item tem sua base, sua alíquota e seu tratamento.",
      "NCM define IPI, ST e benefícios; CFOP define a natureza; CST define a tributação. Errar um deles contamina toda a cadeia.",
    ],
    termos: ["cfop", "cst", "icms-st"],
  },
  {
    slug: "financeiro-dre",
    area: "financeiro",
    titulo: "DRE",
    resumo: "Da receita bruta ao resultado líquido.",
    rota: "/financeiro/demonstracoes/dre",
    nivel: "Intermediário",
    comoUsar: [
      "Escolha a competência e compare com o período anterior (análise horizontal).",
      "A coluna de análise vertical mostra o peso de cada linha sobre a receita líquida.",
    ],
    conceito: [
      "A DRE segue o regime de competência: registra o fato, não o caixa.",
      "Lucro bruto mede eficiência operacional; resultado operacional mede a gestão; resultado líquido é o que sobra depois dos tributos.",
      "Margem caindo com receita subindo é sinal clássico de custo crescendo mais rápido que o preço.",
    ],
    termos: ["dre", "competencia"],
  },
  {
    slug: "financeiro-conciliacao",
    area: "financeiro",
    titulo: "Conciliação bancária",
    resumo: "Fazer o extrato e o sistema contarem a mesma história.",
    rota: "/financeiro/operacional/conciliacao",
    nivel: "Introdução",
    comoUsar: [
      "Importe ou selecione o extrato e concilie lado a lado com os lançamentos internos.",
      "Sobras do lado do banco viram lançamento novo; sobras do lado interno viram investigação.",
    ],
    conceito: [
      "Conciliar é comprovar que o saldo contábil da conta corresponde ao saldo real no banco.",
      "Diferenças recorrentes indicam processo quebrado — tarifa não parametrizada, recebimento sem baixa, duplicidade de lançamento.",
    ],
    termos: ["conciliacao-bancaria", "competencia"],
  },

  /* ------------------------------ Administrativo ----------------------------- */
  {
    slug: "administrativo-contas",
    area: "administrativo",
    titulo: "Contas, caixa e fluxo",
    resumo: "A visão de caixa ao lado da visão de competência.",
    rota: "/administrativo/financeiro-operacional",
    nivel: "Introdução",
    comoUsar: [
      "Acompanhe contas a pagar e a receber por vencimento e por conta.",
      "O fluxo de caixa projeta entradas e saídas a partir dos títulos em aberto.",
    ],
    conceito: [
      "Regime de caixa mostra liquidez; regime de competência mostra resultado. Empresa lucrativa pode quebrar por caixa.",
      "Título em aberto vencido é o principal indicador antecedente de problema de capital de giro.",
    ],
    termos: ["competencia", "conciliacao-bancaria"],
  },
  {
    slug: "administrativo-contratos",
    area: "administrativo",
    titulo: "Contratos e documentos",
    resumo: "Vigências, reajustes e guarda de documentos.",
    rota: "/administrativo/contratos",
    nivel: "Introdução",
    comoUsar: [
      "Cadastre vigência, índice de reajuste e responsáveis; o sistema avisa antes do vencimento.",
      "Anexe documentos ao contrato para manter a trilha de evidência.",
    ],
    conceito: [
      "Contrato com renovação automática esquecida é passivo silencioso: continua gerando despesa sem revisão de preço.",
      "Guarda documental fiscal segue, em regra, 5 anos; documentos societários e trabalhistas exigem prazos maiores.",
    ],
    termos: ["certidao-negativa"],
  },
  {
    slug: "administrativo-patrimonio",
    area: "administrativo",
    titulo: "Patrimônio e depreciação",
    resumo: "Bens, vida útil e baixa.",
    rota: "/administrativo/patrimonio",
    nivel: "Intermediário",
    comoUsar: [
      "Cadastre o bem com custo de aquisição, data e vida útil; a depreciação mensal é calculada a partir daí.",
      "Movimentações registram transferência, baixa e reavaliação; o inventário confirma a existência física.",
    ],
    conceito: [
      "Depreciação linear = (custo − valor residual) ÷ vida útil em meses.",
      "A vida útil contábil deve refletir o uso real; a fiscal segue as taxas da Receita. A diferença vira ajuste na ECF.",
      "Bens do imobilizado com ICMS destacado alimentam o CIAP.",
    ],
    termos: ["depreciacao", "imobilizado", "ciap"],
  },
  {
    slug: "administrativo-suprimentos",
    area: "administrativo",
    titulo: "Compras e suprimentos",
    resumo: "Requisição, cotação, pedido e recebimento.",
    rota: "/administrativo/suprimentos",
    nivel: "Introdução",
    comoUsar: [
      "A requisição vira cotação, a cotação vira pedido e o pedido é confrontado com a nota no recebimento.",
      "Alçadas de aprovação bloqueiam a emissão do pedido acima do limite do perfil.",
    ],
    conceito: [
      "O 'three-way match' (pedido × nota × recebimento) é o controle que impede pagar o que não foi comprado ou não chegou.",
      "Sem requisição formal, não há como comprovar necessidade — e a despesa fica frágil em auditoria.",
    ],
    termos: ["segregacao-funcoes"],
  },
  {
    slug: "administrativo-controles",
    area: "administrativo",
    titulo: "Controles internos",
    resumo: "Riscos, alçadas, perfis e avisos.",
    rota: "/administrativo/controles",
    nivel: "Intermediário",
    comoUsar: [
      "A matriz de riscos liga risco, controle, responsável e frequência de teste.",
      "Perfis e permissões controlam o que cada usuário enxerga nos módulos.",
      "Avisos manuais publicam comunicados internos no painel de notificações.",
    ],
    conceito: [
      "Controle interno é o conjunto de rotinas que dá confiança à informação contábil — não é burocracia.",
      "Segregação de funções, alçadas e trilha de auditoria são os três pilares mínimos.",
    ],
    termos: ["segregacao-funcoes"],
  },
  {
    slug: "administrativo-cadastros",
    area: "administrativo",
    titulo: "Cadastros analíticos",
    resumo: "Camada de leitura sobre dados do ERP.",
    rota: "/administrativo/cadastros",
    nivel: "Introdução",
    comoUsar: [
      "Estas telas são somente leitura: analisam volume, concentração e qualidade dos cadastros.",
      "Use a pesquisa global para localizar um registro em qualquer domínio.",
    ],
    conceito: [
      "Qualidade de cadastro é pré-requisito fiscal: NCM, CFOP padrão e regime do parceiro definem como o documento será tributado.",
      "Concentração alta em poucos parceiros é risco operacional e de crédito.",
    ],
    termos: ["cnae", "cfop"],
  },
];

export const LICAO_MAP = Object.fromEntries(LICOES.map((l) => [l.slug, l]));

/** Encontra a lição mais específica para uma rota (match por prefixo mais longo). */
export function licaoDaRota(rota: string): Licao | undefined {
  let melhor: { licao: Licao; tamanho: number } | undefined;
  for (const licao of LICOES) {
    for (const r of [licao.rota, ...(licao.rotasExtras ?? [])]) {
      if (rota === r || rota.startsWith(r + "/") || rota.startsWith(r)) {
        if (!melhor || r.length > melhor.tamanho) melhor = { licao, tamanho: r.length };
      }
    }
  }
  return melhor?.licao;
}

export const AVISO_SIMULACAO =
  "Os módulos fiscais deste sistema são simulações internas para conferência e estudo. Não há conexão com Receita Federal, SEFAZ ou prefeituras: nada é transmitido, consultado ou validado em órgão oficial.";
