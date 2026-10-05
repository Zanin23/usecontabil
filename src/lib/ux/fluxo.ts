// ============================================================================
// Fluxo de uso do sistema — "por onde começo?" e "qual é o próximo passo?".
//
// É a sequência em que o sistema realmente funciona: cada etapa depende do
// que foi feito antes. O dashboard e o assistente de configuração leem daqui,
// então mudar a ordem aqui muda a orientação em todo o sistema.
// ============================================================================
import type { Contexto } from "./contexto";
import { avaliar, type NivelRequisito, REQUISITO_POR_ID } from "./requisitos";

export type EtapaFluxo = {
  /** Requisito que marca a etapa como concluída. */
  id: string;
  ordem: number;
  titulo: string;
  /** Uma frase: o que o usuário faz nesta etapa. */
  acao: string;
  /** Para que serve — responde "por que preciso preencher isso?". */
  porque: string;
  rota: string;
  /** Etapas que dependem desta (mostradas como "depois disso"). */
  libera: string[];
  /** Crítico = impede o ciclo mensal. Opcional = recomendado, mas dá para seguir. */
  essencial: boolean;
};

export const FLUXO: EtapaFluxo[] = [
  {
    id: "empresa",
    ordem: 1,
    titulo: "Cadastrar a empresa",
    acao: "Registre o CNPJ, a razão social e o regime tributário.",
    porque: "Tudo no sistema é ligado a uma empresa: sem ela nenhum módulo tem onde guardar os dados.",
    rota: "/preparativos/cadastros/empresas",
    libera: ["unidade", "plano-contas", "participantes"],
    essencial: true,
  },
  {
    id: "regime",
    ordem: 2,
    titulo: "Definir o regime tributário",
    acao: "Informe Simples Nacional, Lucro Presumido, Lucro Real ou MEI.",
    porque: "O regime escolhe qual motor de apuração roda e quais tabelas são usadas.",
    rota: "/preparativos/cadastros/empresas",
    libera: ["documentos", "apuracao"],
    essencial: true,
  },
  {
    id: "unidade",
    ordem: 3,
    titulo: "Cadastrar matriz e filiais",
    acao: "Registre ao menos uma unidade ativa para a empresa.",
    porque: "Documentos, patrimônio e relatórios são separados por unidade.",
    rota: "/preparativos/cadastros/filiais",
    libera: ["participantes", "documentos"],
    essencial: true,
  },
  {
    id: "plano-contas",
    ordem: 4,
    titulo: "Montar o plano de contas",
    acao: "Importe o plano modelo ou uma planilha, ou cadastre as contas à mão.",
    porque: "Nenhum lançamento contábil existe sem uma conta analítica ativa para recebê-lo.",
    rota: "/contabil/cadastros/plano-contas",
    libera: ["lancamentos", "balancete"],
    essencial: true,
  },
  {
    id: "participantes",
    ordem: 5,
    titulo: "Cadastrar clientes e fornecedores",
    acao: "Cadastre à mão ou importe um XML de NF-e — o XML cria o cadastro sozinho.",
    porque: "Todo documento fiscal aponta para um participante; sem ele a escrituração trava.",
    rota: "/preparativos/cadastros/participantes",
    libera: ["documentos", "titulos"],
    essencial: true,
  },
  {
    id: "produtos",
    ordem: 6,
    titulo: "Cadastrar produtos e serviços",
    acao: "Informe NCM, CFOP, CST e alíquotas dos itens.",
    porque: "Com o item cadastrado a classificação fiscal da nota deixa de ser manual.",
    rota: "/preparativos/cadastros/produtos-servicos",
    libera: ["documentos", "inventario"],
    essencial: false,
  },
  {
    id: "parametros",
    ordem: 7,
    titulo: "Configurar os parâmetros da empresa",
    acao: "Defina as regras de lançamento e as preferências fiscais.",
    porque: "Os motores de apuração e o fechamento leem estes parâmetros.",
    rota: "/preparativos/empresa/parametros",
    libera: ["apuracao"],
    essencial: false,
  },
  {
    id: "documentos",
    ordem: 8,
    titulo: "Lançar os documentos fiscais",
    acao: "Importe XMLs ou registre as notas de entrada, saída e serviços do período.",
    porque: "É a origem de tudo: livros, apurações, guias e obrigações nascem aqui.",
    rota: "/fiscal/documentos/entradas",
    libera: ["escrituracao", "apuracao", "lancamentos"],
    essencial: true,
  },
  {
    id: "lancamentos",
    ordem: 9,
    titulo: "Fazer os lançamentos contábeis",
    acao: "Registre as partidas dobradas da competência.",
    porque: "Transforma a movimentação em contabilidade — balancete, razão e DRE vêm daqui.",
    rota: "/contabil/escrituracao/lancamentos",
    libera: ["balancete", "dre", "conciliacao"],
    essencial: true,
  },
  {
    id: "escrituracao",
    ordem: 10,
    titulo: "Gerar a escrituração fiscal",
    acao: "Confira os livros de entradas e saídas e a apuração de ICMS/IPI.",
    porque: "Consolida débitos e créditos do período e alimenta o SPED.",
    rota: "/fiscal/escrituracao/livro-entradas",
    libera: ["apuracao", "obrigacoes"],
    essencial: false,
  },
  {
    id: "apuracao",
    ordem: 11,
    titulo: "Rodar as apurações",
    acao: "Execute o motor do regime e revise a memória de cálculo.",
    porque: "É o que transforma documentos em tributos a recolher.",
    rota: "/fiscal/apuracoes",
    libera: ["guias", "obrigacoes"],
    essencial: false,
  },
  {
    id: "guias",
    ordem: 12,
    titulo: "Emitir e acompanhar as guias",
    acao: "Gere DARF, DAS e guias estaduais e registre os pagamentos.",
    porque: "Guia em aberto bloqueia o encerramento da competência.",
    rota: "/fiscal/guias/darf",
    libera: ["conciliacao", "encerramento"],
    essencial: false,
  },
  {
    id: "titulos",
    ordem: 13,
    titulo: "Controlar contas a pagar e a receber",
    acao: "Registre os títulos e acompanhe vencimentos e baixas.",
    porque: "Alimenta o fluxo de caixa e a conciliação bancária.",
    rota: "/administrativo/financeiro-operacional/contas-pagar",
    libera: ["conciliacao"],
    essencial: false,
  },
  {
    id: "conciliacao",
    ordem: 14,
    titulo: "Conciliar",
    acao: "Compare extrato, lançamentos contábeis e pagamentos.",
    porque: "É a prova de que o saldo do banco e o da contabilidade são o mesmo.",
    rota: "/financeiro/operacional/conciliacao",
    libera: ["encerramento"],
    essencial: false,
  },
];

export type EstadoEtapa = EtapaFluxo & {
  concluida: boolean;
  /** Frase curta da situação (falta ou pronto). */
  texto: string;
  nivel: NivelRequisito;
  /** Botão de ação que resolve a etapa. */
  acaoBotao: string;
};

/** Avalia o fluxo inteiro contra o retrato atual do sistema. */
export function avaliarFluxo(c: Contexto): EstadoEtapa[] {
  return FLUXO.map((etapa) => {
    const req = REQUISITO_POR_ID[etapa.id];
    const estado = avaliar(etapa.id, c);
    return {
      ...etapa,
      concluida: estado.ok,
      texto: estado.texto,
      nivel: req?.nivel ?? "recomendado",
      acaoBotao: req?.acao ?? "Abrir",
    };
  });
}

/** Primeira etapa ainda não concluída — é o "continuar de onde parei". */
export function proximaEtapa(etapas: EstadoEtapa[]): EstadoEtapa | undefined {
  return etapas.find((e) => !e.concluida);
}

/** Progresso geral de configuração (0 a 100). */
export function progressoFluxo(etapas: EstadoEtapa[]) {
  const essenciais = etapas.filter((e) => e.essencial);
  const base = essenciais.length ? essenciais : etapas;
  const feitas = base.filter((e) => e.concluida).length;
  return {
    feitas,
    total: base.length,
    porcentagem: base.length ? Math.round((feitas / base.length) * 100) : 100,
  };
}
