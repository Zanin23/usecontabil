/**
 * Ambiente de validação: uma empresa do grupo "em operação" num navegador limpo.
 *
 * Diferente dos ambientes enxutos dos testes de unidade, aqui o objetivo é
 * deixar TODAS as telas com dados plausíveis (cadastros, plano de contas,
 * lançamentos, documentos fiscais, apuração, simples/MEI…), para que a
 * varredura de rotas exercite também as tabelas, os cartões e os cálculos —
 * não só o estado vazio.
 *
 * Tudo passa pelos stores reais (mesmas regras de validação da interface) e
 * nada sai do navegador simulado: `supabaseFalso` intercepta a nuvem.
 */
import { vi } from "vitest";
import { COMPETENCIAS } from "@/lib/competencia";

export const EMPRESA_VALIDACAO = {
  id: "EMP-1",
  cnpj: "11.222.333/0001-81",
  razao: "Confecções Exemplo Ltda",
  regime: "Simples Nacional",
  atividade: "Confecção de peças de vestuário",
  status: "Ativa",
  createdAt: "2026-01-01T00:00:00Z",
  raw: {
    cidade: "Apucarana",
    uf: "PR",
    cep: "86800-000",
    logradouro: "Av. Central",
    numero: "1000",
    bairro: "Centro",
    cnae: "1412-6/01",
  },
};

export const COMPETENCIA_VALIDACAO = "2026-07";

/** Zera navegador + nuvem simulada e deixa a empresa escolhida na competência do teste. */
export async function prepararAmbienteBase() {
  vi.resetModules();
  localStorage.clear();
  const nuvem = await import("./supabaseFalso");
  nuvem.limparSupabaseFalso();
  nuvem.estadoFalso.usuario = {
    id: "user-1",
    email: "teste@exemplo.com.br",
    user_metadata: { display_name: "Usuário de validação" },
  };
  nuvem.tabelasFalsas.user_roles = [
    { id: "r1", user_id: "user-1", role: "admin" },
    { id: "r2", user_id: "user-1", role: "contabil" },
  ];
  nuvem.tabelasFalsas.profiles = [{ id: "user-1", display_name: "Usuário de validação" }];

  const { saveEmpresa } = await import("@/lib/empresasStore");
  await saveEmpresa({ ...EMPRESA_VALIDACAO });
  localStorage.setItem("usecontabil.empresaAtual.v1", EMPRESA_VALIDACAO.id);
  localStorage.setItem("usecontabil_competencia", COMPETENCIA_VALIDACAO);
}

/** Empresa em operação: cadastros, contábil, fiscal e administrativo preenchidos. */
export async function prepararAmbienteOperacional() {
  await prepararAmbienteBase();
  await semearCadastrosContabeis();
  await semearFiscal();
  await semearAdministrativo();
}

/**
 * Empresa em operação **e em conformidade**: além dos cadastros e do movimento,
 * tem contador responsável (CRC), certificado digital vigente e uma filial.
 * É o ambiente em que as obrigações acessórias podem ser geradas de fato.
 */
export async function prepararAmbienteCompleto() {
  await prepararAmbienteOperacional();
  await semearConformidade();
}

/** Contador responsável, certificado vigente e filial — destravam as obrigações. */
async function semearConformidade() {
  const { saveEmpresa } = await import("@/lib/empresasStore");
  await saveEmpresa({
    ...EMPRESA_VALIDACAO,
    raw: {
      ...EMPRESA_VALIDACAO.raw,
      contador: "Marta Vieira Contabilidade",
      responsavelContabil: "Marta Vieira",
      crc: "PR-1SP123456/O-3",
    },
  });

  const dados = await import("@/lib/empresaDadosStore");
  const empresaId = EMPRESA_VALIDACAO.id;
  dados.saveRegistro("certificados", {
    id: dados.novoId("CER"), empresaId, titular: "CONFECCOES EXEMPLO LTDA:11.222.333/0001-81",
    tipo: "e-CNPJ A1", ac: "AC Certisign RFB G5", emissao: "2026-01-15",
    validade: "2027-01-15", situacao: "Ativo",
  });

  const { saveFilial } = await import("@/lib/filiaisStore");
  saveFilial({
    id: "UN-001", nome: "Confecções Exemplo — Filial Londrina", tipo: "Filial", empresaId,
    cnpj: "41.703.214/0001-01", inscEstadual: "9075541230", cidade: "Londrina", uf: "PR",
    endereco: "Rua das Lojas, 250 — Centro", responsavel: "Marta Vieira",
    email: "filial@confecoesexemplo.com.br", telefone: "(43) 3333-1010",
    centroCusto: "Administrativo", status: "Ativa",
  });
}

/** Cadastros do grupo + núcleo contábil: plano de contas, centros, históricos e lançamentos. */
async function semearCadastrosContabeis() {
  const cadastros = await import("@/lib/cadastrosStore");
  const contabil = await import("@/lib/planoContasStore");

  contabil.carregarPlanoModelo();
  contabil.carregarCentrosModelo();
  contabil.carregarHistoricosModelo();

  cadastros.salvarParticipante({
    id: "", codigo: "CLI-001", tipo: "Cliente", pessoa: "Jurídica",
    documento: "18.442.910/0001-90", nome: "Lojas Vestir Bem Ltda.", fantasia: "Vestir Bem",
    indicadorIe: "Contribuinte", ie: "9052144870", regime: "Lucro Presumido",
    cep: "86010-000", logradouro: "Rua das Lojas", numero: "250", bairro: "Centro",
    municipio: "Londrina", codigoMunicipio: "4113700", uf: "PR",
    email: "compras@vestirbem.com.br", telefone: "(43) 3333-1010",
    retencoes: [], situacao: "Ativo", origem: "Manual",
  });
  cadastros.salvarParticipante({
    id: "", codigo: "FOR-001", tipo: "Fornecedor", pessoa: "Jurídica",
    documento: "76.221.043/0001-69", nome: "Malharia Cianorte S.A.",
    indicadorIe: "Contribuinte", ie: "9011223344", regime: "Lucro Real",
    cep: "87200-000", logradouro: "Av. da Malharia", numero: "45", bairro: "Industrial",
    municipio: "Cianorte", codigoMunicipio: "4105508", uf: "PR",
    retencoes: [], situacao: "Ativo", origem: "Manual",
  });
  cadastros.salvarProduto({
    id: "", codigo: "CAM-001", descricao: "Camiseta malha algodão 30.1 — masculina", tipo: "Produto",
    tipoItem: "00", unidade: "PC", ncm: "61091000", origemMercadoria: "0",
    cfopSaida: "5101", cstIcms: "101", aliqIcms: 0, cstPis: "49", aliqPis: 0,
    cstCofins: "49", aliqCofins: 0, precoPadrao: 34.9, situacao: "Ativo", origem: "Manual",
  });
  cadastros.salvarProduto({
    id: "", codigo: "SRV-001", descricao: "Facção — costura de peças por encomenda", tipo: "Serviço",
    tipoItem: "09", unidade: "SV", itemLc116: "14.05", aliqIss: 3, precoPadrao: 18500,
    situacao: "Ativo", origem: "Manual",
  });

  const contas = contabil.listarContas().filter((c) => c.tipo === "Analítica" && c.situacao === "Ativa");
  const banco = contas.find((c) => c.codigo.startsWith("1.1.2")) ?? contas[1];
  const receita = contas.find((c) => c.codigo.startsWith("3.")) ?? contas[2];
  const { salvarLancamento, novoIdLancamento } = await import("@/lib/lancamentosStore");
  if (banco && receita && banco.id !== receita.id) {
    salvarLancamento({
      id: "", empresaId: EMPRESA_VALIDACAO.id, numero: 0, data: `${COMPETENCIA_VALIDACAO}-05`,
      tipo: "Normal", historico: "Recebimento de vendas da competência",
      documento: "NFC-e 1042", origem: "Manual",
      partidas: [
        { id: novoIdLancamento("pt"), contaId: banco.id, tipo: "D", valor: 1250.5 },
        { id: novoIdLancamento("pt"), contaId: receita.id, tipo: "C", valor: 1250.5 },
      ],
    });
  }
}

/** Documentos fiscais da competência (entradas, saídas, serviços e transporte). */
async function semearFiscal() {
  const { carregarDemonstracao } = await import("@/lib/tributarioStore");
  carregarDemonstracao(EMPRESA_VALIDACAO.id, COMPETENCIA_VALIDACAO, "Simples Nacional");
}

/** Rotinas administrativas: inscrições, pagamentos, parâmetros, certificados e faturamento Simples/MEI. */
async function semearAdministrativo() {
  const dados = await import("@/lib/empresaDadosStore");
  const empresaId = EMPRESA_VALIDACAO.id;
  dados.saveRegistro("inscricoes", {
    id: dados.novoId("INS"), empresaId, tipo: "Inscrição Estadual", orgao: "SEFAZ/PR",
    numero: "9075541230", uf: "PR", inicio: "2021-05-10", situacao: "Ativa",
    observacao: "Contribuinte de ICMS.",
  });
  dados.saveRegistro("pagamentos", {
    id: dados.novoId("PAG"), empresaId, banco: "Banco do Brasil", tipo: "Corrente PJ",
    agencia: "1483-2", conta: "24.551-9", chavePix: "41.703.214/0001-01", situacao: "Ativa", observacao: "",
  });
  dados.saveRegistro("parametros", {
    id: dados.novoId("PAR"), empresaId, grupo: "Fiscal", parametro: "CSOSN padrão de saída",
    valor: "101", vigencia: "2026-01-01", responsavel: "Fiscal",
  });

  const { salvarFaturamentoSimplesMei } = await import("@/lib/simplesMeiStore");
  salvarFaturamentoSimplesMei({
    empresaId, data: `${COMPETENCIA_VALIDACAO}-10`, tipo: "Comércio/indústria",
    descricao: "Vendas de julho (informado)", valor: 48500,
  });
}

/** Competências disponíveis no seletor (a base de teste usa 2026). */
export const COMPETENCIAS_VALIDACAO = COMPETENCIAS.filter((c) => c.startsWith("2026"));
