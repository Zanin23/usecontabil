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

import { trilhaDaRota } from "./navModelo";

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

  /* ------------------------------- 01 Início -------------------------------- */
  {
    rota: "/dashboard",
    oQueFaz: "Painel da competência: indicadores, pendências de cadastro, próximos passos, atalhos e últimas atividades.",
    porQue: "É o ponto de partida do mês — mostra o que já está pronto e o que ainda trava os lançamentos.",
    vemDe: [
      { titulo: "Empresas do grupo", rota: "/preparativos/cadastros/empresas" },
      { titulo: "Clientes e fornecedores", rota: "/preparativos/cadastros/participantes" },
      { titulo: "Documentos fiscais", rota: "/fiscal/documentos/entradas" },
    ],
    proximos: [
      { titulo: "Continuar a configuração", rota: "/preparativos/cadastros/empresas" },
      { titulo: "Lançar os documentos do mês", rota: "/fiscal/documentos/entradas" },
      { titulo: "Ver o mapa do sistema", rota: "/mapa-sistema" },
    ],
  },
  {
    rota: "/mapa-sistema",
    oQueFaz: "Mostra o encadeamento do sistema — configuração, cadastros, lançamentos, escrituração, apuração, conciliação, relatórios e fechamento — e o que já está pronto.",
    porQue: "É o mapa para quando o usuário se perde: mostra o caminho completo e a tela de cada etapa.",
    vemDe: [{ titulo: "Dashboard", rota: "/dashboard" }],
    requisitos: ["empresa"],
    proximos: [{ titulo: "Voltar ao dashboard", rota: "/dashboard" }],
  },

  /* ----------------------------- 02 Configuração ---------------------------- */
  {
    rota: "/preparativos/cadastros/resumo-classe-atividades",
    oQueFaz: "Consolida as empresas do grupo por classe de atividade (CNAE).",
    porQue: "Ajuda a conferir se cada CNPJ está classificado na atividade certa — a classificação define tributos e anexos.",
    vemDe: [
      { titulo: "Empresas do grupo", rota: "/preparativos/cadastros/empresas" },
      { titulo: "Classe de atividades", rota: "/preparativos/cadastros/classe-atividades" },
    ],
    alimenta: [
      { titulo: "Parâmetros da empresa", rota: "/preparativos/empresa/parametros" },
      { titulo: "Apurações", rota: "/fiscal/apuracoes" },
    ],
    requisitos: ["empresa"],
    proximos: [{ titulo: "Revisar parâmetros da empresa", rota: "/preparativos/empresa/parametros" }],
  },
  {
    rota: "/preparativos/empresa/pagamentos",
    oQueFaz: "Formas de pagamento, contas bancárias e caixas usados nos títulos e na conciliação.",
    porQue: "Todo título precisa de uma forma de pagamento; sem isso o contas a pagar/receber e a conciliação ficam incompletos.",
    vemDe: [{ titulo: "Empresas do grupo", rota: "/preparativos/cadastros/empresas" }],
    alimenta: [
      { titulo: "Contas a pagar e receber", rota: "/administrativo/financeiro-operacional/contas-pagar" },
      { titulo: "Conciliação bancária", rota: "/financeiro/operacional/conciliacao" },
    ],
    requisitos: ["empresa"],
  },
  {
    rota: "/administrativo/controles/politicas",
    oQueFaz: "Políticas internas e alçadas de aprovação por valor e área.",
    porQue: "Define quem aprova o quê — evita lançamento aprovado pela pessoa errada e sustenta a trilha de auditoria.",
    alimenta: [
      { titulo: "Contas a pagar e receber", rota: "/administrativo/financeiro-operacional/contas-pagar" },
      { titulo: "Log de auditoria", rota: "/administrativo/controles/auditoria-log" },
    ],
    requisitos: ["empresa"],
    proximos: [{ titulo: "Definir parâmetros do sistema", rota: "/administrativo/controles/parametros" }],
  },
  {
    rota: "/administrativo/controles/parametros",
    oQueFaz: "Parâmetros gerais do sistema, por empresa ou por escopo.",
    porQue: "Concentra as chaves de comportamento (numeração, bloqueios de período, arredondamentos) que valem para todas as telas.",
    alimenta: [
      { titulo: "Lançamentos contábeis", rota: "/contabil/escrituracao/lancamentos" },
      { titulo: "Apurações", rota: "/fiscal/apuracoes" },
    ],
    requisitos: ["empresa"],
  },
  {
    rota: "/administrativo/controles/centros-custo",
    oQueFaz: "Centros de custo, áreas e critérios de rateio.",
    porQue: "Os lançamentos e títulos apontam para um centro de custo; sem cadastro não há rateio nem análise por área.",
    alimenta: [
      { titulo: "Lançamentos contábeis", rota: "/contabil/escrituracao/lancamentos" },
      { titulo: "Relatórios", rota: "/contabil/relatorios/balancete" },
    ],
    requisitos: ["empresa", "plano-contas"],
  },
  {
    rota: "/administrativo/controles/avisos",
    oQueFaz: "Avisos publicados para os usuários do sistema.",
    porQue: "É o canal para comunicar prazo de obrigação, mudança de regra ou pendência coletiva.",
    alimenta: [{ titulo: "Log de auditoria", rota: "/administrativo/controles/auditoria-log" }],
    requisitos: ["empresa"],
  },
  {
    rota: "/administrativo/controles/auditoria-log",
    oQueFaz: "Trilha de alterações e acessos, com autor e data de cada operação.",
    porQue: "Serve de prova de auditoria: mostra quem alterou, quando e o que mudou.",
    vemDe: [
      { titulo: "Usuários e acessos", rota: "/administrativo/controles/usuarios" },
      { titulo: "Políticas e alçadas", rota: "/administrativo/controles/politicas" },
    ],
    requisitos: ["empresa"],
  },

  /* ------------------------------ 03 Cadastros ------------------------------ */
  {
    rota: "/administrativo/contratos/contratos",
    oQueFaz: "Contratos, aditivos, certificados digitais e procurações, com vigência e renovação.",
    porQue: "Contrato vencido ou certificado expirado interrompe o faturamento e a assinatura de obrigações.",
    vemDe: [{ titulo: "Clientes e fornecedores", rota: "/preparativos/cadastros/participantes" }],
    alimenta: [
      { titulo: "Faturamento", rota: "/financeiro/movimentos/faturamento" },
      { titulo: "Contas a pagar e receber", rota: "/administrativo/financeiro-operacional/contas-pagar" },
    ],
    requisitos: ["empresa", "participantes"],
    proximos: [{ titulo: "Conferir certificados da empresa", rota: "/preparativos/empresa/certificados" }],
  },
  {
    rota: "/administrativo/cadastros",
    oQueFaz: "Base analítica somente-leitura dos cadastros recebidos do ERP (contas, participantes, itens).",
    porQue: "É a conferência do que veio de fora — o cadastro editável fica em Preparativos › Cadastros.",
    vemDe: [
      { titulo: "Clientes e fornecedores", rota: "/preparativos/cadastros/participantes" },
      { titulo: "Produtos e serviços", rota: "/preparativos/cadastros/produtos-servicos" },
    ],
    alimenta: [{ titulo: "Auditoria cadastral", rota: "/administrativo/auditoria" }],
    requisitos: ["empresa"],
  },

  /* ----------------------------- 04 Lançamentos ----------------------------- */
  {
    rota: "/fiscal/documentos/transporte",
    oQueFaz: "Conhecimentos de transporte (CT-e) e manifestos de carga (MDF-e) do período.",
    porQue: "O frete tem crédito de ICMS próprio e compõe o custo da mercadoria — sem o CT-e o crédito se perde.",
    vemDe: [{ titulo: "Clientes e fornecedores", rota: "/preparativos/cadastros/participantes" }],
    alimenta: [
      { titulo: "Livro de entradas", rota: "/fiscal/escrituracao/livro-entradas" },
      { titulo: "Apuração de ICMS", rota: "/fiscal/escrituracao/apuracao-icms" },
    ],
    requisitos: ["empresa", "participantes"],
    proximos: [{ titulo: "Escriturar o livro de entradas", rota: "/fiscal/escrituracao/livro-entradas" }],
  },
  {
    rota: "/fiscal/documentos/cupons",
    oQueFaz: "Cupons fiscais (NFC-e) e reduções Z das operações de balcão.",
    porQue: "O varejo escritura as vendas por resumo; cupom a cupom só quando há crédito a destacar.",
    vemDe: [{ titulo: "Produtos e serviços", rota: "/preparativos/cadastros/produtos-servicos" }],
    alimenta: [
      { titulo: "Livro de saídas", rota: "/fiscal/escrituracao/livro-saidas" },
      { titulo: "Apuração de ICMS", rota: "/fiscal/escrituracao/apuracao-icms" },
    ],
    requisitos: ["empresa", "produtos"],
    proximos: [{ titulo: "Escriturar o livro de saídas", rota: "/fiscal/escrituracao/livro-saidas" }],
  },
  {
    rota: "/fiscal/documentos/manifestacao",
    oQueFaz: "Manifestação do destinatário: ciência, confirmação, desconhecimento e não realização das operações.",
    porQue: "Nota não manifestada trava a empresa no SEFAZ e some do livro de entradas.",
    vemDe: [{ titulo: "Notas de entrada", rota: "/fiscal/documentos/entradas" }],
    alimenta: [
      { titulo: "Livro de entradas", rota: "/fiscal/escrituracao/livro-entradas" },
      { titulo: "Apuração de ICMS", rota: "/fiscal/escrituracao/apuracao-icms" },
    ],
    requisitos: ["empresa", "participantes", "certificados"],
  },
  {
    rota: "/financeiro/movimentos/faturamento",
    oQueFaz: "Movimento de faturamento do período: NF-e, NFC-e, venda balcão, pedidos e orçamentos.",
    porQue: "É a base das receitas — alimenta a apuração de ICMS/PIS/COFINS e a DRE.",
    vemDe: [
      { titulo: "Produtos e serviços", rota: "/preparativos/cadastros/produtos-servicos" },
      { titulo: "Notas de saída", rota: "/fiscal/documentos/saidas" },
    ],
    alimenta: [
      { titulo: "Livro de saídas", rota: "/fiscal/escrituracao/livro-saidas" },
      { titulo: "Conclusão fiscal", rota: "/financeiro/movimentos/conclusao-fiscal" },
      { titulo: "DRE", rota: "/financeiro/demonstracoes/dre" },
    ],
    requisitos: ["empresa", "produtos"],
    proximos: [{ titulo: "Fechar a conclusão fiscal", rota: "/financeiro/movimentos/conclusao-fiscal" }],
  },
  {
    rota: "/financeiro/movimentos/servicos",
    oQueFaz: "Serviços prestados no período (NFS-e e RPS), com ISS por município e retenções.",
    porQue: "Serviço tem apuração municipal própria — misturar com mercadoria distorce o ISS.",
    vemDe: [
      { titulo: "Serviços prestados", rota: "/fiscal/documentos/servicos-prestados" },
      { titulo: "Produtos e serviços", rota: "/preparativos/cadastros/produtos-servicos" },
    ],
    alimenta: [
      { titulo: "Apuração de ISS", rota: "/fiscal/apuracoes/iss" },
      { titulo: "Conclusão fiscal", rota: "/financeiro/movimentos/conclusao-fiscal" },
    ],
    requisitos: ["empresa", "produtos", "participantes"],
  },
  {
    rota: "/financeiro/movimentos/demais-documentos",
    oQueFaz: "Demais documentos do período: CT-e, MDF-e, notas complementares e de ajuste, recibos.",
    porQue: "Documentos que não são venda nem compra típica, mas mudam bases e créditos (complemento de ICMS, ajuste, frete).",
    vemDe: [
      { titulo: "Conhecimentos de transporte", rota: "/fiscal/documentos/transporte" },
      { titulo: "Notas de entrada", rota: "/fiscal/documentos/entradas" },
    ],
    alimenta: [{ titulo: "Conclusão fiscal", rota: "/financeiro/movimentos/conclusao-fiscal" }],
    requisitos: ["empresa", "participantes"],
  },
  {
    rota: "/financeiro/movimentos/conclusao-fiscal",
    oQueFaz: "Confere e fecha o movimento do período, liberando escrituração e apuração.",
    porQue: "Enquanto o movimento não fecha, os livros e as apurações ficam parciais.",
    vemDe: [
      { titulo: "Faturamento", rota: "/financeiro/movimentos/faturamento" },
      { titulo: "Serviços", rota: "/financeiro/movimentos/servicos" },
      { titulo: "Demais documentos", rota: "/financeiro/movimentos/demais-documentos" },
    ],
    alimenta: [
      { titulo: "Livro de saídas", rota: "/fiscal/escrituracao/livro-saidas" },
      { titulo: "Apurações", rota: "/fiscal/apuracoes" },
      { titulo: "Fechamento do mês", rota: "/preparativos/servicos/gestao" },
    ],
    requisitos: ["empresa", "documentos"],
    proximos: [{ titulo: "Escriturar e apurar", rota: "/fiscal/escrituracao/livro-saidas" }],
  },
  {
    rota: "/administrativo/financeiro-operacional/fluxo-caixa",
    oQueFaz: "Projeção semanal de entradas e saídas, a partir dos títulos com vencimento.",
    porQue: "Antecipa aperto de caixa — mostra a semana em que as saídas passam as entradas.",
    vemDe: [
      { titulo: "Contas a pagar e receber", rota: "/administrativo/financeiro-operacional/contas-pagar" },
      { titulo: "Conciliação bancária", rota: "/financeiro/operacional/conciliacao" },
    ],
    requisitos: ["empresa", "titulos"],
  },
  {
    rota: "/administrativo/financeiro-operacional/cobranca",
    oQueFaz: "Títulos vencidos e ações de cobrança (aviso, negociação, protesto).",
    porQue: "Inadimplência vira perda e distorce o fluxo de caixa — aqui ela é acompanhada e cobrada.",
    vemDe: [{ titulo: "Contas a pagar e receber", rota: "/administrativo/financeiro-operacional/contas-pagar" }],
    alimenta: [
      { titulo: "Fluxo de caixa", rota: "/administrativo/financeiro-operacional/fluxo-caixa" },
      { titulo: "Dashboard", rota: "/dashboard" },
    ],
    requisitos: ["empresa", "titulos"],
  },

  /* ----------------------------- 05 Escrituração ---------------------------- */
  {
    rota: "/fiscal/escrituracao/apuracao-ipi",
    oQueFaz: "Apuração de IPI do período: créditos por entrada, débitos por saída e saldo a recolher.",
    porQue: "Só empresas industriais/importadoras apuram IPI — o saldo vira guia de recolhimento.",
    vemDe: [
      { titulo: "Documentos fiscais", rota: "/fiscal/documentos/entradas" },
      { titulo: "Livro de saídas", rota: "/fiscal/escrituracao/livro-saidas" },
    ],
    alimenta: [{ titulo: "Guias e obrigações", rota: "/fiscal/obrigacoes" }],
    requisitos: ["empresa", "escrituracao"],
    proximos: [{ titulo: "Emitir guias do período", rota: "/fiscal/obrigacoes" }],
  },
  {
    rota: "/fiscal/escrituracao/ciap",
    oQueFaz: "Controle do crédito de ICMS do ativo permanente (CIAP) em 48 parcelas.",
    porQue: "Bem do imobilizado gera crédito de ICMS parcelado — sem o CIAP o crédito é perdido ou lançado a maior.",
    vemDe: [
      { titulo: "Patrimônio", rota: "/administrativo/patrimonio/bens" },
      { titulo: "Notas de entrada", rota: "/fiscal/documentos/entradas" },
    ],
    alimenta: [{ titulo: "Apuração de ICMS", rota: "/fiscal/escrituracao/apuracao-icms" }],
    requisitos: ["empresa", "plano-contas"],
  },

  /* ------------------------ 06 Apuração e recolhimento ---------------------- */
  {
    rota: "/financeiro/tributacao/motor-tributario",
    oQueFaz: "Regras tributárias com vigência, prioridade e correção sugerida por item de documento.",
    porQue: "É o cérebro do cálculo — regra desatualizada ou fora de vigência produz tributo errado.",
    vemDe: [
      { titulo: "Produtos e serviços", rota: "/preparativos/cadastros/produtos-servicos" },
      { titulo: "Parâmetros da empresa", rota: "/preparativos/empresa/parametros" },
    ],
    alimenta: [
      { titulo: "Faturamento", rota: "/financeiro/movimentos/faturamento" },
      { titulo: "Apurações", rota: "/fiscal/apuracoes" },
    ],
    requisitos: ["empresa", "regime", "produtos"],
  },
  {
    rota: "/financeiro/tributacao/avancada",
    oQueFaz: "Tratamentos especiais: monofásico, drawback, Zona Franca de Manaus e incentivos.",
    porQue: "São exceções que mudam alíquota e base — aplicadas aqui, não em cada documento.",
    vemDe: [{ titulo: "Motor tributário", rota: "/financeiro/tributacao/motor-tributario" }],
    alimenta: [{ titulo: "Apurações", rota: "/fiscal/apuracoes" }],
    requisitos: ["empresa", "produtos"],
  },
  {
    rota: "/financeiro/tabelas/simples-nacional",
    oQueFaz: "Anexos, faixas de faturamento e alíquotas do Simples Nacional.",
    porQue: "Define a alíquota efetiva do mês a partir da receita acumulada dos últimos 12 meses.",
    vemDe: [{ titulo: "Empresas do grupo", rota: "/preparativos/cadastros/empresas" }],
    alimenta: [
      { titulo: "Apuração do Simples", rota: "/fiscal/apuracoes/simples-nacional" },
      { titulo: "Simples & MEI", rota: "/simples-mei" },
    ],
    requisitos: ["empresa", "regime"],
  },
  {
    rota: "/financeiro/tabelas/lucro-presumido",
    oQueFaz: "Percentuais de presunção e alíquotas do Lucro Presumido por atividade.",
    porQue: "É a tabela usada para calcular IRPJ e CSLL do trimestre no regime presumido.",
    vemDe: [{ titulo: "Classe de atividades", rota: "/preparativos/cadastros/classe-atividades" }],
    alimenta: [{ titulo: "Apuração de IRPJ e CSLL", rota: "/fiscal/apuracoes/irpj-csll" }],
    requisitos: ["empresa", "regime", "atividade"],
  },
  {
    rota: "/financeiro/tabelas/lucro-real",
    oQueFaz: "Tabelas do Lucro Real: adições, exclusões, compensações e alíquotas.",
    porQue: "No Lucro Real o imposto sai do lucro contábil ajustado — a tabela parametriza os ajustes.",
    vemDe: [{ titulo: "Balancete", rota: "/contabil/relatorios/balancete" }],
    alimenta: [{ titulo: "Apuração de IRPJ e CSLL", rota: "/fiscal/apuracoes/irpj-csll" }],
    requisitos: ["empresa", "regime", "escrituracao"],
  },
  {
    rota: "/financeiro/tabelas/simei",
    oQueFaz: "Tabela do MEI: valor fixo mensal, limites de faturamento e atividades permitidas.",
    porQue: "Controla o teto de R$ 81 mil e o que fazer ao estourar — inclusive o desenquadramento.",
    vemDe: [{ titulo: "Empresas do grupo", rota: "/preparativos/cadastros/empresas" }],
    alimenta: [
      { titulo: "Simples & MEI", rota: "/simples-mei" },
      { titulo: "Guias e obrigações", rota: "/fiscal/obrigacoes" },
    ],
    requisitos: ["empresa", "regime"],
  },
  {
    rota: "/financeiro/tabelas/ajuste-apuracao",
    oQueFaz: "Ajustes da apuração do período (incentivos, estornos, adições e exclusões) com vigência.",
    porQue: "Valores que não estão na nota mas mudam o tributo devido — sem eles a guia sai errada.",
    vemDe: [
      { titulo: "Motor tributário", rota: "/financeiro/tributacao/motor-tributario" },
      { titulo: "Apurações", rota: "/fiscal/apuracoes" },
    ],
    alimenta: [
      { titulo: "Apuração de ICMS", rota: "/fiscal/escrituracao/apuracao-icms" },
      { titulo: "Guias e obrigações", rota: "/fiscal/obrigacoes" },
    ],
    requisitos: ["empresa", "regime"],
  },
  {
    rota: "/financeiro/tabelas/ajuste-documento-fiscal",
    oQueFaz: "Ajustes aplicados por documento fiscal antes da escrituração (CFOP, CST, base e alíquota).",
    porQue: "Corrige o que veio errado do XML ou do ERP sem reescrever o documento original.",
    vemDe: [
      { titulo: "Documentos fiscais", rota: "/fiscal/documentos/entradas" },
      { titulo: "Motor tributário", rota: "/financeiro/tributacao/motor-tributario" },
    ],
    alimenta: [
      { titulo: "Livro de entradas", rota: "/fiscal/escrituracao/livro-entradas" },
      { titulo: "Apurações", rota: "/fiscal/apuracoes" },
    ],
    requisitos: ["empresa", "documentos"],
  },
  {
    rota: "/financeiro/tabelas/apuracao-pis-cofins",
    oQueFaz: "Parâmetros da apuração de PIS/COFINS: regime cumulativo ou não cumulativo, alíquotas e ajustes.",
    porQue: "Define como a contribuição é calculada no período e o que pode ser creditado.",
    vemDe: [
      { titulo: "Motor tributário", rota: "/financeiro/tributacao/motor-tributario" },
      { titulo: "Faturamento", rota: "/financeiro/movimentos/faturamento" },
    ],
    alimenta: [
      { titulo: "Apuração de PIS/COFINS", rota: "/fiscal/apuracoes/pis-cofins" },
      { titulo: "EFD-Contribuições", rota: "/fiscal/obrigacoes/efd-contribuicoes" },
    ],
    requisitos: ["empresa", "regime"],
  },
  {
    rota: "/financeiro/tributacao/difal",
    oQueFaz: "Diferencial de alíquota (DIFAL) nas operações interestaduais para consumidor final.",
    porQue: "Venda interestadual para contribuinte ou consumidor final tem parte do ICMS para o estado de destino.",
    vemDe: [
      { titulo: "Notas de saída", rota: "/fiscal/documentos/saidas" },
      { titulo: "Motor tributário", rota: "/financeiro/tributacao/motor-tributario" },
    ],
    alimenta: [
      { titulo: "Apuração de ICMS", rota: "/fiscal/escrituracao/apuracao-icms" },
      { titulo: "Guias e obrigações", rota: "/fiscal/obrigacoes" },
    ],
    requisitos: ["empresa", "participantes", "documentos"],
  },
  {
    rota: "/financeiro/tributacao/st-icms",
    oQueFaz: "Substituição tributária (ICMS-ST): pauta, MVA e ressarcimento.",
    porQue: "Na ST o imposto é retido antes da venda — quem não controla fica com crédito ou dívida escondida.",
    vemDe: [
      { titulo: "Motor tributário", rota: "/financeiro/tributacao/motor-tributario" },
      { titulo: "Produtos e serviços", rota: "/preparativos/cadastros/produtos-servicos" },
    ],
    alimenta: [{ titulo: "Apuração de ICMS", rota: "/fiscal/escrituracao/apuracao-icms" }],
    requisitos: ["empresa", "produtos"],
  },
  {
    rota: "/financeiro/tributacao/defis",
    oQueFaz: "Geração e conferência do DEFIS (declaração do Simples Nacional).",
    porQue: "O DEFIS informa a receita do ano ao Fisco — divergência com a apuração gera malha.",
    vemDe: [
      { titulo: "Apuração do Simples", rota: "/fiscal/apuracoes/simples-nacional" },
      { titulo: "Simples & MEI", rota: "/simples-mei" },
    ],
    alimenta: [{ titulo: "Guias e obrigações", rota: "/fiscal/obrigacoes" }],
    requisitos: ["empresa", "regime", "apuracao"],
  },

  /* ------------------------ 07 Conciliação e auditoria ---------------------- */
  {
    rota: "/administrativo/auditoria",
    oQueFaz: "Inconsistências nos cadastros: participantes e produtos incompletos ou inválidos.",
    porQue: "Cadastro incompleto atravessa a escrituração e volta como rejeição de obrigação — melhor corrigir na origem.",
    vemDe: [
      { titulo: "Clientes e fornecedores", rota: "/preparativos/cadastros/participantes" },
      { titulo: "Produtos e serviços", rota: "/preparativos/cadastros/produtos-servicos" },
      { titulo: "Cadastros analíticos", rota: "/administrativo/cadastros" },
    ],
    requisitos: ["empresa"],
    proximos: [{ titulo: "Corrigir participantes", rota: "/preparativos/cadastros/participantes" }],
  },
  {
    rota: "/administrativo/pesquisa",
    oQueFaz: "Pesquisa global em toda a base: participantes, produtos, documentos, títulos e lançamentos.",
    porQue: "Evita abrir tela por tela quando o usuário só precisa localizar um registro.",
    requisitos: ["empresa"],
  },

  /* ------------------------------ 08 Relatórios ----------------------------- */
  {
    rota: "/administrativo/dashboard",
    oQueFaz: "Indicadores consolidados por área: financeiro, fiscal, contábil e administrativo.",
    porQue: "Visão de diretoria — o outro dashboard é operacional, este compara áreas e períodos.",
    vemDe: [
      { titulo: "Relatórios contábeis", rota: "/contabil/relatorios/balancete" },
      { titulo: "Painel tributário", rota: "/financeiro/tributacao/dashboard-executivo" },
    ],
    requisitos: ["empresa"],
  },
  {
    rota: "/financeiro/tributacao/dashboard-executivo",
    oQueFaz: "Carga tributária do período por tributo, regime e empresa, com comparativo de períodos.",
    porQue: "Mostra para onde vai o imposto e onde o planejamento tributário pode agir.",
    vemDe: [
      { titulo: "Apurações", rota: "/fiscal/apuracoes" },
      { titulo: "Guias e obrigações", rota: "/fiscal/obrigacoes" },
    ],
    requisitos: ["empresa", "apuracao"],
  },

  /* ------------------------------ 09 Fechamento ----------------------------- */
  {
    rota: "/preparativos/servicos/fases-processos",
    oQueFaz: "Modelagem das fases e processos do ciclo mensal do escritório.",
    porQue: "Define a ordem de execução (etapas, responsáveis e prazos) que a gestão do fechamento acompanha.",
    vemDe: [{ titulo: "Empresas do grupo", rota: "/preparativos/cadastros/empresas" }],
    alimenta: [
      { titulo: "Cadastro de tarefas", rota: "/preparativos/servicos/cadastro-tarefas" },
      { titulo: "Gestão do fechamento", rota: "/preparativos/servicos/gestao" },
    ],
    requisitos: ["empresa"],
    proximos: [{ titulo: "Cadastrar tarefas por regime", rota: "/preparativos/servicos/cadastro-tarefas" }],
  },
  {
    rota: "/preparativos/servicos/cadastro-tarefas",
    oQueFaz: "Tarefas do fechamento por regime tributário, com prazo e responsável.",
    porQue: "Cada regime tem obrigações próprias; a tarefa certa evita esquecer um prazo legal.",
    vemDe: [{ titulo: "Fases e processos", rota: "/preparativos/servicos/fases-processos" }],
    alimenta: [{ titulo: "Gestão do fechamento", rota: "/preparativos/servicos/gestao" }],
    requisitos: ["empresa", "regime"],
  },

  /* -------------------------------- 10 Aprender ----------------------------- */
  {
    rota: "/aprender",
    oQueFaz: "Central de aprendizagem: trilhas guiadas do ciclo contábil/fiscal e lições curtas.",
    porQue: "Responde \"como faço isso?\" sem depender de suporte — cada lição aponta para a tela correspondente.",
    alimenta: [
      { titulo: "Glossário", rota: "/aprender/glossario" },
      { titulo: "Modo prática", rota: "/aprender/pratica" },
    ],
    proximos: [{ titulo: "Testar no modo prática", rota: "/aprender/pratica" }],
  },
  {
    rota: "/aprender/glossario",
    oQueFaz: "Glossário de termos contábeis, fiscais e do sistema.",
    porQue: "Traduz o jargão na hora da dúvida, sem sair da tarefa.",
    vemDe: [{ titulo: "Central de aprendizagem", rota: "/aprender" }],
  },
  {
    rota: "/aprender/pratica",
    oQueFaz: "Laboratórios com dados fictícios para treinar o ciclo sem tocar nos dados reais.",
    porQue: "Permite errar e refazer; o modo prática é isolado da base real da empresa.",
    vemDe: [{ titulo: "Central de aprendizagem", rota: "/aprender" }],
    requisitos: ["empresa"],
  },
];

/** Tela genérica: usada quando a rota não está no menu nem tem ficha própria. */
export const TELA_PADRAO: TelaDef = {
  rota: "",
  oQueFaz: "Módulo do Use Contábil.",
  porQue: "Consulte o cabeçalho da tela para entender o objetivo deste módulo.",
};

/**
 * Ficha derivada do menu: cobre qualquer rota que ainda não tenha ficha escrita
 * (nunca deixa a tela sem responder "o que faz" e "por que existe").
 */
export function fichaDoMenu(rota: string): TelaDef | undefined {
  const trilha = trilhaDaRota(rota);
  if (!trilha) return undefined;
  const { secao, item } = trilha;
  return {
    rota: item.rota,
    oQueFaz: item.desc ? `${item.titulo} — ${item.desc}` : `${item.titulo}: etapa do fluxo do sistema.`,
    porQue: `${secao.resumo} Esta tela é a etapa "${item.titulo}" desse fluxo.`,
  };
}

const CACHE_FICHAS = new Map<string, TelaDef>();

/** Encontra a ficha da tela pela rota (o prefixo mais longo vence). */
export function buscarTela(rota: string): TelaDef | undefined {
  const emCache = CACHE_FICHAS.get(rota);
  if (emCache) return emCache;

  let melhor: { tela: TelaDef; tamanho: number } | undefined;
  for (const tela of TELAS) {
    if (rota === tela.rota || rota.startsWith(tela.rota + "/") || rota.startsWith(tela.rota)) {
      if (!melhor || tela.rota.length > melhor.tamanho) melhor = { tela, tamanho: tela.rota.length };
    }
  }
  const ficha = melhor?.tela ?? fichaDoMenu(rota);
  if (ficha) CACHE_FICHAS.set(rota, ficha);
  return ficha;
}
