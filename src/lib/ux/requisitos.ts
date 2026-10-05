// ============================================================================
// Catálogo de requisitos — "o que precisa existir antes".
//
// Cada requisito é uma unidade de configuração/cadastro que outras telas
// consomem. A tela declara de quais requisitos depende (ver telas.ts) e o
// sistema calcula, a partir do retrato em contexto.ts, o que ainda falta.
//
// Manter o requisito aqui (e não dentro da tela) é o que permite responder
// "o que preciso cadastrar?" em qualquer lugar, inclusive no dashboard.
// ============================================================================
import type { Contexto } from "./contexto";

export type NivelRequisito = "critico" | "recomendado";

export type GrupoRequisito = "configuracao" | "cadastros" | "movimentos" | "apuracao";

export type Requisito = {
  id: string;
  /** Nome curto, como o usuário chama o cadastro. */
  titulo: string;
  /** Explicação de uma linha: o que é e para que serve. */
  oQue: string;
  /** Rota onde o usuário resolve a pendência. */
  destino: string;
  /** Rótulo do botão que leva até a solução. */
  acao: string;
  /** Crítico = a tela não faz sentido sem ele. Recomendado = funciona, mas avisa. */
  nivel: NivelRequisito;
  grupo: GrupoRequisito;
  /** Onde esta informação é consumida (mostrado como "alimenta"). */
  alimenta: string[];
  /** `true` quando está satisfeito. */
  verificar: (c: Contexto) => boolean;
  /** Frase curta do que falta (exibida quando não satisfeito). */
  detalhe: (c: Contexto) => string;
  /** Frase curta do que já está pronto. */
  pronto: (c: Contexto) => string;
};

const n = (v: number, um: string, varios: string) =>
  `${v} ${v === 1 ? um : varios}`;

export const REQUISITOS: Requisito[] = [
  /* ------------------------------ Configuração ------------------------------ */
  {
    id: "empresa",
    titulo: "Empresa do grupo cadastrada",
    oQue: "O CNPJ que será o centro de tudo: todos os módulos leem a empresa selecionada no topo.",
    destino: "/preparativos/cadastros/empresas",
    acao: "Cadastrar empresa",
    nivel: "critico",
    grupo: "configuracao",
    alimenta: ["Documentos fiscais", "Escrituração", "Apurações", "Lançamentos contábeis", "Relatórios"],
    verificar: (c) => c.totalEmpresas > 0,
    detalhe: () => "Nenhuma empresa cadastrada — sem ela o sistema não tem onde guardar os dados.",
    pronto: (c) => n(c.totalEmpresas, "empresa cadastrada", "empresas cadastradas"),
  },
  {
    id: "empresa-cnpj",
    titulo: "CNPJ da empresa preenchido",
    oQue: "Identifica a empresa nos documentos, apurações e arquivos gerados.",
    destino: "/preparativos/cadastros/empresas",
    acao: "Completar cadastro",
    nivel: "critico",
    grupo: "configuracao",
    alimenta: ["Documentos fiscais", "Obrigações acessórias", "Guias"],
    verificar: (c) => c.empresaCnpj,
    detalhe: () => "O cadastro da empresa selecionada está sem CNPJ válido.",
    pronto: () => "CNPJ conferido",
  },
  {
    id: "regime",
    titulo: "Regime tributário definido",
    oQue: "Simples Nacional, Lucro Presumido, Lucro Real ou MEI. Define qual motor de apuração roda.",
    destino: "/preparativos/cadastros/empresas",
    acao: "Definir regime",
    nivel: "critico",
    grupo: "configuracao",
    alimenta: ["Apurações", "Tabelas por regime", "Guias", "Fechamento"],
    verificar: (c) => c.regimeDefinido,
    detalhe: () => "Sem regime definido, os cálculos usam Lucro Presumido por padrão.",
    pronto: (c) => c.regime || "Regime definido",
  },
  {
    id: "unidade",
    titulo: "Matriz ou filial ativa",
    oQue: "A unidade onde os documentos e lançamentos são registrados.",
    destino: "/preparativos/cadastros/filiais",
    acao: "Cadastrar unidade",
    nivel: "critico",
    grupo: "configuracao",
    alimenta: ["Documentos fiscais", "Patrimônio", "Relatórios por unidade"],
    verificar: (c) => c.filiaisAtivas > 0,
    detalhe: () => "Nenhuma unidade ativa para a empresa selecionada.",
    pronto: (c) => n(c.filiaisAtivas, "unidade ativa", "unidades ativas"),
  },
  {
    id: "atividade",
    titulo: "Classe de atividade (CNAE) vinculada",
    oQue: "Classifica a operação e alimenta os resumos e alíquotas de ISS.",
    destino: "/preparativos/cadastros/classe-atividades",
    acao: "Vincular atividade",
    nivel: "recomendado",
    grupo: "configuracao",
    alimenta: ["Resumo por atividade", "Apuração de ISS", "Fechamento"],
    verificar: (c) => Boolean(c.empresa?.atividade && c.empresa.atividade !== "—"),
    detalhe: () => "A empresa ainda não tem uma classe de atividade vinculada.",
    pronto: () => "Atividade vinculada",
  },
  {
    id: "parametros",
    titulo: "Parâmetros da empresa",
    oQue: "Regras de lançamento, centros padrão e preferências fiscais da empresa.",
    destino: "/preparativos/empresa/parametros",
    acao: "Configurar parâmetros",
    nivel: "recomendado",
    grupo: "configuracao",
    alimenta: ["Lançamentos contábeis", "Apurações", "Fechamento"],
    verificar: (c) => c.parametrosEmpresa > 0,
    detalhe: () => "Nenhum parâmetro cadastrado para a empresa selecionada.",
    pronto: () => "Parâmetros configurados",
  },
  {
    id: "inscricoes",
    titulo: "Inscrições estadual e municipal",
    oQue: "IE e IM usadas nos livros fiscais e nas guias estaduais.",
    destino: "/preparativos/empresa/inscricoes",
    acao: "Informar inscrições",
    nivel: "recomendado",
    grupo: "configuracao",
    alimenta: ["Livros fiscais", "Guias estaduais", "SPED"],
    verificar: (c) => c.inscricoes > 0,
    detalhe: () => "Nenhuma inscrição cadastrada para a empresa selecionada.",
    pronto: () => "Inscrições informadas",
  },
  {
    id: "certificados",
    titulo: "Certificado digital",
    oQue: "Usado nas transmissões de obrigações e emissão de documentos.",
    destino: "/preparativos/empresa/certificados",
    acao: "Cadastrar certificado",
    nivel: "recomendado",
    grupo: "configuracao",
    alimenta: ["Obrigações acessórias", "Documentos fiscais"],
    verificar: (c) => c.certificados > 0,
    detalhe: () => "Nenhum certificado cadastrado para a empresa selecionada.",
    pronto: () => "Certificado cadastrado",
  },

  /* -------------------------------- Cadastros ------------------------------- */
  {
    id: "plano-contas",
    titulo: "Plano de contas com contas analíticas",
    oQue: "A estrutura que recebe os lançamentos. Só contas analíticas e ativas recebem valores.",
    destino: "/contabil/cadastros/plano-contas",
    acao: "Abrir plano de contas",
    nivel: "critico",
    grupo: "cadastros",
    alimenta: ["Lançamentos contábeis", "Balancete", "Razão", "Diário", "DRE"],
    verificar: (c) => c.contasAnaliticas > 0,
    detalhe: (c) =>
      c.contas > 0
        ? "Existem contas, mas nenhuma analítica ativa — lançamentos não terão onde cair."
        : "Nenhuma conta cadastrada. É possível importar o plano modelo ou uma planilha.",
    pronto: (c) => n(c.contasAnaliticas, "conta analítica", "contas analíticas"),
  },
  {
    id: "centros-custo",
    titulo: "Centros de custo",
    oQue: "Separaram custos e despesas por área; exigidos na ECD (registro I100).",
    destino: "/contabil/cadastros/centros-custo",
    acao: "Cadastrar centro de custo",
    nivel: "recomendado",
    grupo: "cadastros",
    alimenta: ["Lançamentos contábeis", "DRE gerencial", "Rateios"],
    verificar: (c) => c.centros > 0,
    detalhe: () => "Nenhum centro de custo cadastrado — os lançamentos ficarão sem rateio.",
    pronto: (c) => n(c.centros, "centro de custo", "centros de custo"),
  },
  {
    id: "historicos",
    titulo: "Históricos padrão",
    oQue: "Textos prontos que aceleram o lançamento e padronizam a escrituração.",
    destino: "/contabil/cadastros/historicos",
    acao: "Cadastrar histórico",
    nivel: "recomendado",
    grupo: "cadastros",
    alimenta: ["Lançamentos contábeis", "Diário", "Razão"],
    verificar: (c) => c.historicos > 0,
    detalhe: () => "Nenhum histórico padrão — os lançamentos exigirão digitação do texto.",
    pronto: (c) => n(c.historicos, "histórico", "históricos"),
  },
  {
    id: "participantes",
    titulo: "Clientes e fornecedores",
    oQue: "Cadastro único do grupo: quem compra, quem vende e quem presta serviço.",
    destino: "/preparativos/cadastros/participantes",
    acao: "Cadastrar participante",
    nivel: "critico",
    grupo: "cadastros",
    alimenta: ["Documentos fiscais", "Contas a pagar e receber", "Lançamentos contábeis", "SPED"],
    verificar: (c) => c.participantes > 0,
    detalhe: () =>
      "Nenhum cliente ou fornecedor cadastrado. Dica: importar um XML de NF-e cria o cadastro automaticamente.",
    pronto: (c) =>
      `${c.participantes} cadastros · ${c.clientes} clientes · ${c.fornecedores} fornecedores`,
  },
  {
    id: "produtos",
    titulo: "Produtos e serviços",
    oQue: "Itens com NCM, CFOP, CST e alíquotas — base da classificação fiscal.",
    destino: "/preparativos/cadastros/produtos-servicos",
    acao: "Cadastrar item",
    nivel: "recomendado",
    grupo: "cadastros",
    alimenta: ["Documentos fiscais", "Apurações", "Inventário", "SPED"],
    verificar: (c) => c.produtos + c.servicos > 0,
    detalhe: () => "Nenhum produto ou serviço cadastrado — a classificação fiscal ficará manual.",
    pronto: (c) => `${n(c.produtos, "produto", "produtos")} · ${n(c.servicos, "serviço", "serviços")}`,
  },

  /* ------------------------------- Movimentos ------------------------------- */
  {
    id: "documentos",
    titulo: "Documentos fiscais na competência",
    oQue: "Notas de entrada, saída e serviços do período. Alimentam os livros e as apurações.",
    destino: "/fiscal/documentos/entradas",
    acao: "Lançar documentos",
    nivel: "critico",
    grupo: "movimentos",
    alimenta: ["Livros fiscais", "Apurações", "Guias", "Obrigações acessórias"],
    verificar: (c) => c.documentosPeriodo > 0,
    detalhe: () => "Nenhum documento fiscal na competência selecionada.",
    pronto: (c) => n(c.documentosPeriodo, "documento no período", "documentos no período"),
  },
  {
    id: "lancamentos",
    titulo: "Lançamentos contábeis",
    oQue: "Partidas dobradas que formam o balancete, o razão e o diário.",
    destino: "/contabil/escrituracao/lancamentos",
    acao: "Novo lançamento",
    nivel: "critico",
    grupo: "movimentos",
    alimenta: ["Balancete", "Razão", "Diário", "DRE", "SPED Contábil (ECD)"],
    verificar: (c) => c.lancamentosPeriodo > 0,
    detalhe: () => "Nenhum lançamento contábil na competência selecionada.",
    pronto: (c) => n(c.lancamentosPeriodo, "lançamento no período", "lançamentos no período"),
  },
  {
    id: "titulos",
    titulo: "Contas a pagar e a receber",
    oQue: "Títulos do financeiro, usados na conciliação e no fluxo de caixa.",
    destino: "/administrativo/financeiro-operacional/contas-pagar",
    acao: "Abrir contas a pagar",
    nivel: "recomendado",
    grupo: "movimentos",
    alimenta: ["Conciliação bancária", "Fluxo de caixa", "Fechamento"],
    verificar: (c) => c.titulosPagar + c.titulosReceber > 0,
    detalhe: () => "Nenhum título a pagar ou a receber na competência.",
    pronto: (c) => `${c.titulosPagar} a pagar · ${c.titulosReceber} a receber`,
  },

  /* -------------------------------- Apuração -------------------------------- */
  {
    id: "escrituracao",
    titulo: "Escrituração fiscal gerada",
    oQue: "Livros de entradas e saídas, apuração de ICMS/IPI, inventário e CIAP.",
    destino: "/fiscal/escrituracao/livro-entradas",
    acao: "Abrir livro de entradas",
    nivel: "recomendado",
    grupo: "apuracao",
    alimenta: ["Apurações", "Obrigações acessórias", "Auditoria fiscal"],
    verificar: (c) => c.escrituracao > 0,
    detalhe: () => "Nenhum livro ou apuração gerado nesta competência.",
    pronto: (c) => n(c.escrituracao, "registro gerado", "registros gerados"),
  },
  {
    id: "apuracao",
    titulo: "Apuração do período conferida",
    oQue: "Rodar o motor do regime e revisar a memória de cálculo antes de gerar as guias.",
    destino: "/fiscal/apuracoes",
    acao: "Rodar apuração",
    nivel: "recomendado",
    grupo: "apuracao",
    alimenta: ["Guias", "Obrigações acessórias", "Fechamento"],
    verificar: (c) => c.apuracoes > 0,
    detalhe: () => "Nenhum motor de apuração saiu de \"Aberta\" nesta competência.",
    pronto: (c) => n(c.apuracoes, "motor conferido", "motores conferidos"),
  },
  {
    id: "conciliacao",
    titulo: "Conciliação bancária conferida",
    oQue: "Confrontar extrato, lançamentos contábeis e pagamentos até a diferença de saldo zerar.",
    destino: "/financeiro/operacional/conciliacao",
    acao: "Abrir conciliação",
    nivel: "recomendado",
    grupo: "apuracao",
    alimenta: ["Fechamento", "Balancete", "Fluxo de caixa"],
    verificar: (c) => c.contasConciliadas > 0,
    detalhe: (c) =>
      c.contasBancarias > 0
        ? "Nenhuma conta bancária com conciliação concluída nesta competência."
        : "Não há contas bancárias monitoradas para conciliar.",
    pronto: (c) =>
      `${c.contasConciliadas} de ${c.contasBancarias} conta(s) conciliada(s)`,
  },
  {
    id: "guias",
    titulo: "Guias de recolhimento",
    oQue: "DARF, DAS e guias estaduais geradas a partir das apurações.",
    destino: "/fiscal/guias/darf",
    acao: "Abrir guias",
    nivel: "recomendado",
    grupo: "apuracao",
    alimenta: ["Conciliação bancária", "Fechamento"],
    verificar: (c) => c.guias > 0,
    detalhe: () => "Nenhuma guia gerada nesta competência.",
    pronto: (c) =>
      c.guiasAbertas > 0
        ? `${n(c.guias, "guia", "guias")} · ${c.guiasAbertas} em aberto`
        : `${n(c.guias, "guia", "guias")} · todas quitadas`,
  },
];

export const REQUISITO_POR_ID = Object.fromEntries(REQUISITOS.map((r) => [r.id, r])) as Record<
  string,
  Requisito
>;

export type EstadoRequisito = {
  id: string;
  requisito: Requisito;
  ok: boolean;
  /** Frase explicando a situação atual (falta ou pronto). */
  texto: string;
};

/** Avalia um requisito contra o retrato do sistema. */
export function avaliar(id: string, c: Contexto): EstadoRequisito {
  const requisito = REQUISITO_POR_ID[id];
  if (!requisito) {
    return { id, requisito: REQUISITOS[0], ok: true, texto: "" };
  }
  const ok = requisito.verificar(c);
  return { id, requisito, ok, texto: ok ? requisito.pronto(c) : requisito.detalhe(c) };
}

/** Avalia vários requisitos de uma vez. */
export function avaliarVarios(ids: string[], c: Contexto): EstadoRequisito[] {
  return ids.map((id) => avaliar(id, c));
}

/** Separa o que está pronto do que falta, mantendo a ordem declarada. */
export function separarPendencias(estados: EstadoRequisito[]) {
  return {
    prontos: estados.filter((e) => e.ok),
    criticos: estados.filter((e) => !e.ok && e.requisito.nivel === "critico"),
    recomendados: estados.filter((e) => !e.ok && e.requisito.nivel === "recomendado"),
  };
}
