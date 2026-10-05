// ============================================================================
// Mapa das telas — "o que é", "de onde vem", "para onde vai", "do que depende".
//
// É a resposta do sistema às perguntas do item 5 do levantamento de UX:
//   • O que esta tela faz?            → oQueFaz
//   • Por que preciso preencher isso? → porQue
//   • Onde essa informação será usada?→ alimenta
//   • De onde vêm os dados exibidos?  → vemDe
//   • O que preciso ter antes?        → requisitos
//   • O que posso fazer depois?       → proximos
//
// A correspondência é por prefixo da rota (a mais longa vence), então
// `/contabil/escrituracao/lancamentos/novo` cai na entrada dos lançamentos.
// ============================================================================

export type LinkTela = { titulo: string; rota: string; porque?: string };

export type TelaDef = {
  /** Prefixo da rota. */
  rota: string;
  oQueFaz: string;
  porQue: string;
  /** Telas ou processos que fornecem os dados exibidos aqui. */
  vemDe?: LinkTela[];
  /** Telas ou relatórios consumidos por estes dados. */
  alimenta?: LinkTela[];
  /** Ids de requisitos (ver requisitos.ts). */
  requisitos?: string[];
  /** Próximos passos naturais do processo. */
  proximos?: LinkTela[];
};

export const TELAS: TelaDef[] = [
  /* ------------------------------ Preparativos ------------------------------ */
  {
    rota: "/preparativos/cadastros/empresas",
    oQueFaz: "Cadastra os CNPJs do grupo, com regime tributário, atividade e situação.",
    porQue:
      "É o primeiro cadastro do sistema: empresa, filiais e unidades delimitam tudo o que vem depois.",
    alimenta: [
      { titulo: "Documentos fiscais", rota: "/fiscal/documentos/entradas" },
      { titulo: "Apurações", rota: "/fiscal/apuracoes" },
      { titulo: "Lançamentos contábeis", rota: "/contabil/escrituracao/lancamentos" },
      { titulo: "Relatórios", rota: "/contabil/relatorios/balancete" },
    ],
    proximos: [
      { titulo: "Cadastrar filiais e unidades", rota: "/preparativos/cadastros/filiais", porque: "toda empresa precisa de ao menos uma unidade ativa" },
      { titulo: "Definir parâmetros da empresa", rota: "/preparativos/empresa/parametros", porque: "regras usadas nas apurações" },
      { titulo: "Cadastrar clientes e fornecedores", rota: "/preparativos/cadastros/participantes", porque: "necessário antes de lançar documentos" },
    ],
  },
  {
    rota: "/preparativos/cadastros/filiais",
    oQueFaz: "Matriz, filiais e unidades operacionais da empresa selecionada.",
    porQue: "Documentos, patrimônio e relatórios são separados por unidade.",
    vemDe: [{ titulo: "Empresas do grupo", rota: "/preparativos/cadastros/empresas" }],
    alimenta: [
      { titulo: "Documentos fiscais", rota: "/fiscal/documentos/saidas" },
      { titulo: "Patrimônio", rota: "/administrativo/patrimonio/bens" },
    ],
    requisitos: ["empresa"],
    proximos: [
      { titulo: "Cadastrar clientes e fornecedores", rota: "/preparativos/cadastros/participantes" },
      { titulo: "Lançar documentos fiscais", rota: "/fiscal/documentos/entradas" },
    ],
  },
  {
    rota: "/preparativos/cadastros/participantes",
    oQueFaz: "Cadastro único de clientes, fornecedores e transportadoras (CNPJ/CPF, IE, endereço, conta contábil).",
    porQue:
      "Todo documento fiscal aponta para um participante. Cadastrar antes evita retrabalho na escrituração.",
    vemDe: [
      { titulo: "Importação de XML de NF-e", rota: "/fiscal/documentos/entradas" },
      { titulo: "Cadastros antigos", rota: "/preparativos/cadastros/participantes" },
    ],
    alimenta: [
      { titulo: "Documentos fiscais", rota: "/fiscal/documentos/entradas" },
      { titulo: "Contas a pagar e receber", rota: "/administrativo/financeiro-operacional/contas-pagar" },
      { titulo: "Lançamentos contábeis", rota: "/contabil/escrituracao/lancamentos" },
      { titulo: "SPED", rota: "/fiscal/obrigacoes/sped-fiscal" },
    ],
    requisitos: ["empresa"],
    proximos: [
      { titulo: "Cadastrar produtos e serviços", rota: "/preparativos/cadastros/produtos-servicos" },
      { titulo: "Lançar notas de entrada", rota: "/fiscal/documentos/entradas", porque: "o XML já cria o participante" },
      { titulo: "Lançar contas a pagar", rota: "/administrativo/financeiro-operacional/contas-pagar" },
    ],
  },
  {
    rota: "/preparativos/cadastros/produtos-servicos",
    oQueFaz: "Itens com NCM, CEST, CFOP, CST, LC 116 e contas contábeis padrão.",
    porQue: "Sem o item cadastrado, a classificação fiscal de cada nota é toda manual.",
    alimenta: [
      { titulo: "Documentos fiscais", rota: "/fiscal/documentos/saidas" },
      { titulo: "Apurações", rota: "/fiscal/apuracoes" },
      { titulo: "Inventário", rota: "/fiscal/escrituracao/inventario" },
      { titulo: "SPED", rota: "/fiscal/obrigacoes/sped-fiscal" },
    ],
    requisitos: ["empresa"],
    proximos: [
      { titulo: "Lançar notas de saída", rota: "/fiscal/documentos/saidas" },
      { titulo: "Gerar livro de saídas", rota: "/fiscal/escrituracao/livro-saidas" },
    ],
  },
  {
    rota: "/preparativos/cadastros/classe-atividades",
    oQueFaz: "Classes de atividade (CNAE) operadas pelas empresas do grupo.",
    porQue: "O CNAE define alíquotas de ISS e alimenta os resumos por atividade.",
    alimenta: [
      { titulo: "Apuração de ISS", rota: "/fiscal/apuracoes/iss" },
      { titulo: "Resumo por atividade", rota: "/preparativos/cadastros/resumo-classe-atividades" },
    ],
    requisitos: ["empresa"],
    proximos: [{ titulo: "Ver resumo por atividade", rota: "/preparativos/cadastros/resumo-classe-atividades" }],
  },
  {
    rota: "/preparativos/empresa/parametros",
    oQueFaz: "Parâmetros fiscais e contábeis da empresa selecionada.",
    porQue: "Definem como os motores calculam e como os lançamentos são sugeridos.",
    vemDe: [{ titulo: "Empresas do grupo", rota: "/preparativos/cadastros/empresas" }],
    alimenta: [
      { titulo: "Apurações", rota: "/fiscal/apuracoes" },
      { titulo: "Lançamentos contábeis", rota: "/contabil/escrituracao/lancamentos" },
      { titulo: "Fechamento", rota: "/preparativos/servicos/gestao" },
    ],
    requisitos: ["empresa"],
    proximos: [
      { titulo: "Informar inscrições", rota: "/preparativos/empresa/inscricoes" },
      { titulo: "Cadastrar certificado digital", rota: "/preparativos/empresa/certificados" },
    ],
  },
  {
    rota: "/preparativos/empresa/inscricoes",
    oQueFaz: "Inscrição estadual, municipal e demais registros da empresa.",
    porQue: "Aparecem nos livros fiscais, guias estaduais e arquivos do SPED.",
    requisitos: ["empresa"],
    alimenta: [
      { titulo: "Guias estaduais", rota: "/fiscal/guias/estaduais" },
      { titulo: "SPED Fiscal", rota: "/fiscal/obrigacoes/sped-fiscal" },
    ],
    proximos: [{ titulo: "Configurar parâmetros", rota: "/preparativos/empresa/parametros" }],
  },
  {
    rota: "/preparativos/empresa/certificados",
    oQueFaz: "Certificados digitais da empresa e sua validade.",
    porQue: "Sem certificado válido não há emissão de documentos nem transmissão de obrigações.",
    requisitos: ["empresa"],
    alimenta: [
      { titulo: "Obrigações acessórias", rota: "/fiscal/obrigacoes" },
      { titulo: "Documentos fiscais", rota: "/fiscal/documentos/saidas" },
    ],
    proximos: [{ titulo: "Consultar certidões", rota: "/fiscal/auditoria/certidoes" }],
  },
  {
    rota: "/preparativos/empresa/dados-empresa",
    oQueFaz: "Dados cadastrais, endereço e responsável técnico da empresa selecionada.",
    porQue: "Aparecem nos cabeçalhos de relatórios internos e no fechamento.",
    requisitos: ["empresa"],
    alimenta: [
      { titulo: "Relatórios", rota: "/contabil/relatorios/balancete" },
      { titulo: "Fechamento", rota: "/preparativos/servicos/gestao" },
    ],
    proximos: [
      { titulo: "Informar inscrições", rota: "/preparativos/empresa/inscricoes" },
      { titulo: "Configurar parâmetros", rota: "/preparativos/empresa/parametros" },
    ],
  },

  /* -------------------------------- Contábil -------------------------------- */
  {
    rota: "/contabil/cadastros/plano-contas",
    oQueFaz: "Plano de contas do grupo: contas sintéticas e analíticas, natureza e referencial da RFB.",
    porQue: "Nenhum lançamento existe sem uma conta analítica ativa para recebê-lo.",
    vemDe: [
      { titulo: "Plano modelo do sistema", rota: "/contabil/cadastros/plano-contas" },
      { titulo: "Importação por planilha", rota: "/contabil/cadastros/plano-contas" },
    ],
    alimenta: [
      { titulo: "Lançamentos contábeis", rota: "/contabil/escrituracao/lancamentos" },
      { titulo: "Balancete", rota: "/contabil/relatorios/balancete" },
      { titulo: "Razão", rota: "/contabil/relatorios/razao" },
      { titulo: "Diário", rota: "/contabil/relatorios/diario" },
      { titulo: "DRE", rota: "/financeiro/demonstracoes/dre" },
    ],
    requisitos: ["empresa"],
    proximos: [
      { titulo: "Cadastrar centros de custo", rota: "/contabil/cadastros/centros-custo", porque: "necessário para ratear despesas" },
      { titulo: "Cadastrar históricos padrão", rota: "/contabil/cadastros/historicos" },
      { titulo: "Fazer o primeiro lançamento", rota: "/contabil/escrituracao/lancamentos" },
    ],
  },
  {
    rota: "/contabil/cadastros/centros-custo",
    oQueFaz: "Áreas que recebem custos e despesas (registro I100 da ECD).",
    porQue: "Permitem ratear despesas e gerar a DRE gerencial por área.",
    alimenta: [
      { titulo: "Lançamentos contábeis", rota: "/contabil/escrituracao/lancamentos" },
      { titulo: "ECD", rota: "/fiscal/obrigacoes/ecd-ecf" },
    ],
    requisitos: ["empresa"],
    proximos: [{ titulo: "Fazer um lançamento", rota: "/contabil/escrituracao/lancamentos" }],
  },
  {
    rota: "/contabil/cadastros/historicos",
    oQueFaz: "Textos prontos para os lançamentos, com marcadores de documento e competência.",
    porQue: "Padronizam o diário e evitam redigitar a mesma explicação toda vez.",
    alimenta: [{ titulo: "Lançamentos contábeis", rota: "/contabil/escrituracao/lancamentos" }],
    requisitos: ["empresa"],
    proximos: [{ titulo: "Fazer um lançamento", rota: "/contabil/escrituracao/lancamentos" }],
  },
  {
    rota: "/contabil/escrituracao/lancamentos",
    oQueFaz: "Partidas dobradas por empresa, com histórico, centro de custo, estorno e bloqueio por competência encerrada.",
    porQue: "É aqui que a movimentação vira contabilidade — tudo o mais é consequência.",
    vemDe: [
      { titulo: "Plano de contas", rota: "/contabil/cadastros/plano-contas" },
      { titulo: "Clientes e fornecedores", rota: "/preparativos/cadastros/participantes" },
      { titulo: "Centros de custo", rota: "/contabil/cadastros/centros-custo" },
      { titulo: "Históricos padrão", rota: "/contabil/cadastros/historicos" },
    ],
    alimenta: [
      { titulo: "Balancete", rota: "/contabil/relatorios/balancete" },
      { titulo: "Razão", rota: "/contabil/relatorios/razao" },
      { titulo: "Diário", rota: "/contabil/relatorios/diario" },
      { titulo: "DRE", rota: "/financeiro/demonstracoes/dre" },
      { titulo: "ECD", rota: "/fiscal/obrigacoes/ecd-ecf" },
    ],
    requisitos: ["empresa", "plano-contas"],
    proximos: [
      { titulo: "Conferir balancete", rota: "/contabil/relatorios/balancete", porque: "valida se débitos e créditos fecham" },
      { titulo: "Ver o razão de uma conta", rota: "/contabil/relatorios/razao" },
      { titulo: "Gerar DRE", rota: "/financeiro/demonstracoes/dre" },
    ],
  },

  /* ------------------------------- Relatórios ------------------------------- */
  {
    rota: "/contabil/relatorios/balancete",
    oQueFaz: "Saldo anterior, débitos, créditos e saldo atual por conta, com conferência débito = crédito.",
    porQue: "É a primeira conferência depois de lançar: se não fecha, algo está errado antes de avançar.",
    vemDe: [{ titulo: "Lançamentos contábeis", rota: "/contabil/escrituracao/lancamentos" }],
    alimenta: [
      { titulo: "DRE", rota: "/financeiro/demonstracoes/dre" },
      { titulo: "ECD", rota: "/fiscal/obrigacoes/ecd-ecf" },
    ],
    requisitos: ["empresa", "plano-contas", "lancamentos"],
    proximos: [
      { titulo: "Abrir o razão", rota: "/contabil/relatorios/razao" },
      { titulo: "Abrir o diário", rota: "/contabil/relatorios/diario" },
      { titulo: "Gerar DRE", rota: "/financeiro/demonstracoes/dre" },
    ],
  },
  {
    rota: "/contabil/relatorios/razao",
    oQueFaz: "Movimento de uma conta, com saldo anterior, contrapartida e saldo linha a linha.",
    porQue: "É o relatório que explica um saldo — usado em auditoria e conferência.",
    vemDe: [
      { titulo: "Lançamentos contábeis", rota: "/contabil/escrituracao/lancamentos" },
      { titulo: "Plano de contas", rota: "/contabil/cadastros/plano-contas" },
    ],
    requisitos: ["empresa", "plano-contas", "lancamentos"],
    proximos: [{ titulo: "Voltar ao balancete", rota: "/contabil/relatorios/balancete" }],
  },
  {
    rota: "/contabil/relatorios/diario",
    oQueFaz: "Lançamentos em ordem cronológica com todas as partidas.",
    porQue: "Visão sequencial da escrituração, usada na conferência do período.",
    vemDe: [{ titulo: "Lançamentos contábeis", rota: "/contabil/escrituracao/lancamentos" }],
    requisitos: ["empresa", "plano-contas", "lancamentos"],
    proximos: [{ titulo: "Voltar ao balancete", rota: "/contabil/relatorios/balancete" }],
  },
  {
    rota: "/financeiro/demonstracoes/dre",
    oQueFaz: "Demonstração do resultado, com análise vertical, horizontal e ajustes de encerramento.",
    porQue: "Mostra o resultado econômico da competência a partir do que foi lançado.",
    vemDe: [
      { titulo: "Lançamentos contábeis", rota: "/contabil/escrituracao/lancamentos" },
      { titulo: "Plano de contas", rota: "/contabil/cadastros/plano-contas" },
    ],
    requisitos: ["empresa", "plano-contas", "lancamentos"],
    proximos: [{ titulo: "Conferir balancete", rota: "/contabil/relatorios/balancete" }],
  },

  /* --------------------------------- Fiscal --------------------------------- */
  {
    rota: "/fiscal/documentos/entradas",
    oQueFaz: "NF-e de compras e devoluções recebidas, com importação de XML.",
    porQue: "É a origem dos livros fiscais: sem a nota, não há crédito nem escrituração.",
    vemDe: [
      { titulo: "Clientes e fornecedores", rota: "/preparativos/cadastros/participantes" },
      { titulo: "Produtos e serviços", rota: "/preparativos/cadastros/produtos-servicos" },
    ],
    alimenta: [
      { titulo: "Livro de entradas", rota: "/fiscal/escrituracao/livro-entradas" },
      { titulo: "Apurações", rota: "/fiscal/apuracoes" },
      { titulo: "SPED Fiscal", rota: "/fiscal/obrigacoes/sped-fiscal" },
    ],
    requisitos: ["empresa", "participantes"],
    proximos: [
      { titulo: "Gerar livro de entradas", rota: "/fiscal/escrituracao/livro-entradas" },
      { titulo: "Lançar notas de saída", rota: "/fiscal/documentos/saidas" },
      { titulo: "Rodar apuração", rota: "/fiscal/apuracoes" },
    ],
  },
  {
    rota: "/fiscal/documentos/saidas",
    oQueFaz: "NF-e emitidas pelas empresas do grupo.",
    porQue: "Geram os débitos de ICMS, IPI, PIS/COFINS e o faturamento da competência.",
    vemDe: [
      { titulo: "Clientes e fornecedores", rota: "/preparativos/cadastros/participantes" },
      { titulo: "Produtos e serviços", rota: "/preparativos/cadastros/produtos-servicos" },
    ],
    alimenta: [
      { titulo: "Livro de saídas", rota: "/fiscal/escrituracao/livro-saidas" },
      { titulo: "Apurações", rota: "/fiscal/apuracoes" },
      { titulo: "Contas a receber", rota: "/administrativo/financeiro-operacional/contas-receber" },
    ],
    requisitos: ["empresa", "participantes"],
    proximos: [
      { titulo: "Gerar livro de saídas", rota: "/fiscal/escrituracao/livro-saidas" },
      { titulo: "Rodar apuração", rota: "/fiscal/apuracoes" },
    ],
  },
  {
    rota: "/fiscal/documentos/servicos-tomados",
    oQueFaz: "NFS-e recebidas, com retenções na fonte.",
    porQue: "Alimentam a apuração de ISS e as retenções a recolher.",
    requisitos: ["empresa", "participantes"],
    alimenta: [
      { titulo: "Apuração de ISS", rota: "/fiscal/apuracoes/iss" },
      { titulo: "Retenções", rota: "/fiscal/apuracoes/retencoes" },
    ],
    proximos: [{ titulo: "Apurar retenções", rota: "/fiscal/apuracoes/retencoes" }],
  },
  {
    rota: "/fiscal/documentos/servicos-prestados",
    oQueFaz: "NFS-e emitidas e ISS devido por município.",
    porQue: "Base da apuração de ISS próprio.",
    requisitos: ["empresa", "participantes"],
    alimenta: [{ titulo: "Apuração de ISS", rota: "/fiscal/apuracoes/iss" }],
    proximos: [{ titulo: "Apurar ISS", rota: "/fiscal/apuracoes/iss" }],
  },
  {
    rota: "/fiscal/escrituracao/livro-entradas",
    oQueFaz: "Registro de entradas por CFOP e CST, gerado a partir dos documentos.",
    porQue: "Consolida os créditos do período e alimenta o SPED Fiscal.",
    vemDe: [{ titulo: "Notas de entrada", rota: "/fiscal/documentos/entradas" }],
    alimenta: [
      { titulo: "Apuração de ICMS", rota: "/fiscal/escrituracao/apuracao-icms" },
      { titulo: "SPED Fiscal", rota: "/fiscal/obrigacoes/sped-fiscal" },
    ],
    requisitos: ["empresa", "documentos"],
    proximos: [
      { titulo: "Apurar ICMS", rota: "/fiscal/escrituracao/apuracao-icms" },
      { titulo: "Gerar SPED Fiscal", rota: "/fiscal/obrigacoes/sped-fiscal" },
    ],
  },
  {
    rota: "/fiscal/escrituracao/livro-saidas",
    oQueFaz: "Registro de saídas por CFOP e CST, gerado a partir dos documentos.",
    porQue: "Consolida os débitos do período e alimenta o SPED Fiscal.",
    vemDe: [{ titulo: "Notas de saída", rota: "/fiscal/documentos/saidas" }],
    alimenta: [
      { titulo: "Apuração de ICMS", rota: "/fiscal/escrituracao/apuracao-icms" },
      { titulo: "SPED Fiscal", rota: "/fiscal/obrigacoes/sped-fiscal" },
    ],
    requisitos: ["empresa", "documentos"],
    proximos: [{ titulo: "Apurar ICMS", rota: "/fiscal/escrituracao/apuracao-icms" }],
  },
  {
    rota: "/fiscal/escrituracao/apuracao-icms",
    oQueFaz: "Débitos, créditos e saldo de ICMS do período.",
    porQue: "Define quanto de ICMS recolher ou quanto de crédito transportar.",
    vemDe: [
      { titulo: "Livro de entradas", rota: "/fiscal/escrituracao/livro-entradas" },
      { titulo: "Livro de saídas", rota: "/fiscal/escrituracao/livro-saidas" },
    ],
    alimenta: [
      { titulo: "Guias estaduais", rota: "/fiscal/guias/estaduais" },
      { titulo: "SPED Fiscal", rota: "/fiscal/obrigacoes/sped-fiscal" },
    ],
    requisitos: ["empresa", "documentos", "escrituracao"],
    proximos: [{ titulo: "Emitir guia estadual", rota: "/fiscal/guias/estaduais" }],
  },
  {
    rota: "/fiscal/escrituracao/inventario",
    oQueFaz: "Estoque declarado ao fisco por item (Bloco H).",
    porQue: "Obrigatório para empresas com estoque; fecha o Bloco H do SPED.",
    alimenta: [{ titulo: "SPED Fiscal", rota: "/fiscal/obrigacoes/sped-fiscal" }],
    requisitos: ["empresa", "produtos"],
    proximos: [{ titulo: "Gerar SPED Fiscal", rota: "/fiscal/obrigacoes/sped-fiscal" }],
  },

  /* -------------------------------- Apurações ------------------------------- */
  {
    rota: "/fiscal/apuracoes",
    oQueFaz: "Motores de PIS/COFINS, ISS, IRPJ/CSLL, Simples Nacional e retenções.",
    porQue: "Transformam documentos em tributos a recolher — é o coração do período.",
    vemDe: [
      { titulo: "Documentos fiscais", rota: "/fiscal/documentos/entradas" },
      { titulo: "Regime da empresa", rota: "/preparativos/cadastros/empresas" },
    ],
    alimenta: [
      { titulo: "Guias (DARF)", rota: "/fiscal/guias/darf" },
      { titulo: "Obrigações acessórias", rota: "/fiscal/obrigacoes" },
      { titulo: "Fechamento", rota: "/preparativos/servicos/gestao" },
    ],
    requisitos: ["empresa", "regime", "documentos"],
    proximos: [
      { titulo: "Emitir guias", rota: "/fiscal/guias/darf" },
      { titulo: "Entregar obrigações", rota: "/fiscal/obrigacoes" },
    ],
  },
  {
    rota: "/fiscal/guias",
    oQueFaz: "DARF, guias estaduais, parcelamentos e calendário de recolhimentos.",
    porQue: "Guias em aberto bloqueiam o encerramento da competência.",
    vemDe: [{ titulo: "Apurações", rota: "/fiscal/apuracoes" }],
    alimenta: [
      { titulo: "Conciliação bancária", rota: "/financeiro/operacional/conciliacao" },
      { titulo: "Fechamento", rota: "/preparativos/servicos/gestao" },
    ],
    requisitos: ["empresa", "documentos"],
    proximos: [
      { titulo: "Conciliar pagamentos", rota: "/financeiro/operacional/conciliacao" },
      { titulo: "Acompanhar encerramento", rota: "/preparativos/servicos/encerramentos" },
    ],
  },
  {
    rota: "/fiscal/obrigacoes",
    oQueFaz: "SPED Fiscal, EFD-Contribuições, ECD/ECF, DCTFWeb, REINF e obrigações estaduais.",
    porQue: "São os arquivos entregues ao fisco; cada um tem prazo próprio.",
    vemDe: [
      { titulo: "Escrituração fiscal", rota: "/fiscal/escrituracao/livro-entradas" },
      { titulo: "Apurações", rota: "/fiscal/apuracoes" },
      { titulo: "Escrituração contábil", rota: "/contabil/escrituracao/lancamentos" },
    ],
    alimenta: [{ titulo: "Fechamento", rota: "/preparativos/servicos/gestao" }],
    requisitos: ["empresa", "documentos", "escrituracao"],
    proximos: [{ titulo: "Acompanhar agenda", rota: "/fiscal/obrigacoes/agenda" }],
  },
  {
    rota: "/fiscal/auditoria",
    oQueFaz: "Cruzamentos entre XML, escrituração, classificação fiscal, créditos e certidões.",
    porQue: "Aponta divergências antes que virem problema na entrega das obrigações.",
    vemDe: [
      { titulo: "Documentos fiscais", rota: "/fiscal/documentos/entradas" },
      { titulo: "Escrituração", rota: "/fiscal/escrituracao/livro-entradas" },
      { titulo: "Apurações", rota: "/fiscal/apuracoes" },
    ],
    requisitos: ["empresa", "documentos"],
    proximos: [{ titulo: "Conciliar contas", rota: "/financeiro/operacional/conciliacao" }],
  },

  /* ------------------------------- Financeiro ------------------------------- */
  {
    rota: "/financeiro/operacional/conciliacao",
    oQueFaz: "Conciliação entre extrato bancário e movimentação contábil/financeira.",
    porQue: "É a prova de que o saldo do banco e o saldo da contabilidade são o mesmo.",
    vemDe: [
      { titulo: "Lançamentos contábeis", rota: "/contabil/escrituracao/lancamentos" },
      { titulo: "Contas a pagar e receber", rota: "/administrativo/financeiro-operacional/contas-pagar" },
      { titulo: "Guias pagas", rota: "/fiscal/guias/darf" },
    ],
    alimenta: [{ titulo: "Fechamento", rota: "/preparativos/servicos/gestao" }],
    requisitos: ["empresa", "plano-contas", "lancamentos"],
    proximos: [
      { titulo: "Conferir balancete", rota: "/contabil/relatorios/balancete" },
      { titulo: "Encerrar competência", rota: "/preparativos/servicos/encerramentos" },
    ],
  },
  {
    rota: "/administrativo/financeiro-operacional/contas-pagar",
    oQueFaz: "Títulos a pagar, com vencimentos, baixas e encargos.",
    porQue: "Alimenta o fluxo de caixa e a conciliação bancária.",
    vemDe: [
      { titulo: "Clientes e fornecedores", rota: "/preparativos/cadastros/participantes" },
      { titulo: "Notas de entrada", rota: "/fiscal/documentos/entradas" },
    ],
    alimenta: [
      { titulo: "Fluxo de caixa", rota: "/administrativo/financeiro-operacional/fluxo-caixa" },
      { titulo: "Conciliação bancária", rota: "/financeiro/operacional/conciliacao" },
    ],
    requisitos: ["empresa", "participantes"],
    proximos: [
      { titulo: "Ver fluxo de caixa", rota: "/administrativo/financeiro-operacional/fluxo-caixa" },
      { titulo: "Conciliar", rota: "/financeiro/operacional/conciliacao" },
    ],
  },
  {
    rota: "/administrativo/financeiro-operacional/contas-receber",
    oQueFaz: "Títulos a receber, com aging e ações de cobrança.",
    porQue: "Mostra quem está em atraso e alimenta o fluxo de caixa.",
    vemDe: [
      { titulo: "Clientes e fornecedores", rota: "/preparativos/cadastros/participantes" },
      { titulo: "Notas de saída", rota: "/fiscal/documentos/saidas" },
    ],
    alimenta: [
      { titulo: "Fluxo de caixa", rota: "/administrativo/financeiro-operacional/fluxo-caixa" },
      { titulo: "Conciliação bancária", rota: "/financeiro/operacional/conciliacao" },
    ],
    requisitos: ["empresa", "participantes"],
    proximos: [{ titulo: "Ver fluxo de caixa", rota: "/administrativo/financeiro-operacional/fluxo-caixa" }],
  },
  {
    rota: "/administrativo/financeiro-operacional/caixa",
    oQueFaz: "Tesouraria: movimentos de caixa e contas da empresa.",
    porQue: "Registra entradas e saídas que não passam por documentos fiscais.",
    requisitos: ["empresa"],
    alimenta: [{ titulo: "Fluxo de caixa", rota: "/administrativo/financeiro-operacional/fluxo-caixa" }],
    proximos: [{ titulo: "Conciliar", rota: "/financeiro/operacional/conciliacao" }],
  },

  /* ------------------------------- Fechamento ------------------------------- */
  {
    rota: "/preparativos/servicos/gestao",
    oQueFaz: "Painel do fechamento: fases do ciclo mensal e tarefas do regime da empresa.",
    porQue: "É o checklist que diz o que falta para o mês poder ser encerrado.",
    vemDe: [
      { titulo: "Documentos fiscais", rota: "/fiscal/documentos/entradas" },
      { titulo: "Lançamentos contábeis", rota: "/contabil/escrituracao/lancamentos" },
      { titulo: "Apurações", rota: "/fiscal/apuracoes" },
    ],
    alimenta: [{ titulo: "Encerramentos", rota: "/preparativos/servicos/encerramentos" }],
    requisitos: ["empresa"],
    proximos: [
      { titulo: "Encerrar competência", rota: "/preparativos/servicos/encerramentos" },
      { titulo: "Ver cadastro de tarefas", rota: "/preparativos/servicos/cadastro-tarefas" },
    ],
  },
  {
    rota: "/preparativos/servicos/encerramentos",
    oQueFaz: "Encerra e reabre competências, com bloqueio de lançamentos e registro de motivo.",
    porQue: "Fecha o mês: depois disso, correções só por estorno.",
    vemDe: [{ titulo: "Gestão do fechamento", rota: "/preparativos/servicos/gestao" }],
    requisitos: ["empresa", "lancamentos"],
    proximos: [{ titulo: "Conferir balancete final", rota: "/contabil/relatorios/balancete" }],
  },

  /* ------------------------------ Administrativo ---------------------------- */
  {
    rota: "/administrativo/controles/usuarios",
    oQueFaz: "Usuários, perfis e liberação de acesso por área.",
    porQue: "Controla quem vê e quem altera cada módulo.",
    alimenta: [{ titulo: "Log de auditoria", rota: "/administrativo/controles/auditoria-log" }],
    proximos: [{ titulo: "Definir políticas e alçadas", rota: "/administrativo/controles/politicas" }],
  },
  {
    rota: "/administrativo/patrimonio",
    oQueFaz: "Bens do imobilizado, depreciação, movimentações e inventário.",
    porQue: "A depreciação do mês vira lançamento contábil; o CIAP usa a entrada do bem.",
    alimenta: [
      { titulo: "Lançamentos contábeis", rota: "/contabil/escrituracao/lancamentos" },
      { titulo: "CIAP", rota: "/fiscal/escrituracao/ciap" },
    ],
    requisitos: ["empresa", "plano-contas"],
    proximos: [{ titulo: "Controlar CIAP", rota: "/fiscal/escrituracao/ciap" }],
  },
  {
    rota: "/administrativo/suprimentos",
    oQueFaz: "Requisições, cotações e pedidos de compra.",
    porQue: "O pedido recebido vira nota de entrada e, depois, contas a pagar.",
    vemDe: [{ titulo: "Clientes e fornecedores", rota: "/preparativos/cadastros/participantes" }],
    alimenta: [
      { titulo: "Notas de entrada", rota: "/fiscal/documentos/entradas" },
      { titulo: "Contas a pagar", rota: "/administrativo/financeiro-operacional/contas-pagar" },
    ],
    requisitos: ["empresa", "participantes"],
    proximos: [{ titulo: "Lançar notas de entrada", rota: "/fiscal/documentos/entradas" }],
  },

  /* ------------------------------- Simples & MEI ---------------------------- */
  {
    rota: "/simples-mei",
    oQueFaz: "Fluxo simplificado das empresas do Simples Nacional e MEI.",
    porQue: "Quem só precisa acompanhar faturamento e lembretes não precisa passar por todo o ciclo.",
    vemDe: [{ titulo: "Empresas do grupo", rota: "/preparativos/cadastros/empresas" }],
    requisitos: ["empresa"],
    proximos: [
      { titulo: "Informar receitas", rota: "/simples-mei/receitas" },
      { titulo: "Ver obrigações", rota: "/simples-mei/obrigacoes" },
    ],
  },
];

/** Tela genérica: usada quando a rota não tem ficha própria. */
export const TELA_PADRAO: TelaDef = {
  rota: "",
  oQueFaz: "Módulo do Use Contábil.",
  porQue: "Consulte o cabeçalho da tela para entender o objetivo deste módulo.",
};

/** Encontra a ficha da tela pela rota (o prefixo mais longo vence). */
export function buscarTela(rota: string): TelaDef | undefined {
  let melhor: { tela: TelaDef; tamanho: number } | undefined;
  for (const tela of TELAS) {
    if (rota === tela.rota || rota.startsWith(tela.rota + "/") || rota.startsWith(tela.rota)) {
      if (!melhor || tela.rota.length > melhor.tamanho) melhor = { tela, tamanho: tela.rota.length };
    }
  }
  return melhor?.tela;
}
