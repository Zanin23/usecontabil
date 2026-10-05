// ============================================================================
// Retrato vivo do sistema — a base de todo o mecanismo de dependências.
//
// Este arquivo responde, de um só lugar, à pergunta "o que já existe no
// sistema agora?". Cada requisito (ver requisitos.ts) é avaliado contra este
// retrato, o que mantém a lógica de "o que falta" fora das telas.
//
// Regra importante: aqui só se LÊ. Nenhuma função grava ou apaga dados — o
// mecanismo de orientação nunca altera a base do usuário.
// ============================================================================
import { useEffect, useMemo, useState } from "react";
import { EMPRESAS_EVENT, loadEmpresas, type EmpresaRecord } from "@/lib/empresasStore";
import { FILIAIS_EVENT, loadFiliais } from "@/lib/filiaisStore";
import { listarParticipantes, listarProdutos } from "@/lib/cadastrosStore";
import { listarCentros, listarContas, listarHistoricos } from "@/lib/planoContasStore";
import { competenciaDaData, listarLancamentos } from "@/lib/lancamentosStore";
import { FISCAL_EVENT, loadDocs, type DocSlug } from "@/lib/fiscalStore";
import { ESCRITURACAO_EVENT, loadLinhas, type EscSlug } from "@/lib/escrituracaoStore";
import { COLECOES_EVENT } from "@/lib/nuvemColecoes";
import { GUIAS_EVENT, listarGuias } from "@/lib/guiasStore";
import { APURACAO_EVENT, getEstado, type MotorSlug } from "@/lib/apuracaoStore";
import { OBRIGACOES_EVENT, monitorar } from "@/lib/obrigacoesStore";
import { EMPRESA_DADOS_EVENT, loadRegistros } from "@/lib/empresaDadosStore";
import { GESTAO_EVENT, loadFechamentos, pendenciasCadastro } from "@/lib/gestaoStore";
import { CONTAS_EVENT, loadMovimentos, titulos } from "@/lib/contasCaixaStore";
import { CONCILIACAO_EVENT, contas as contasBancarias, resultado as resultadoConciliacao } from "@/lib/conciliacaoStore";
import { regimeDefinido } from "@/lib/regime";
import { NOTIFICACOES_EVENT } from "@/lib/notificacoesStore";

/** Eventos que, quando disparados, podem mudar o retrato do sistema. */
const EVENTOS = [
  EMPRESAS_EVENT,
  FILIAIS_EVENT,
  FISCAL_EVENT,
  ESCRITURACAO_EVENT,
  COLECOES_EVENT,
  APURACAO_EVENT,
  GUIAS_EVENT,
  OBRIGACOES_EVENT,
  EMPRESA_DADOS_EVENT,
  GESTAO_EVENT,
  NOTIFICACOES_EVENT,
  CONTAS_EVENT,
  CONCILIACAO_EVENT,
  "storage",
  "focus",
] as const;

/** Contador que sobe a cada evento relevante — usado como gatilho do useMemo. */
export function useTick(extra: unknown[] = []): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    EVENTOS.forEach((e) => window.addEventListener(e, bump));
    return () => EVENTOS.forEach((e) => window.removeEventListener(e, bump));
  }, []);
  // Mudanças de contexto (empresa/competência) também precisam recalcular.
  const chave = extra.join("|");
  useEffect(() => setTick((t) => t + 1), [chave]);
  return tick;
}

const MOTORES: MotorSlug[] = ["pis-cofins", "iss", "irpj-csll", "simples-nacional", "retencoes"];

/** Qual motor de apuração corresponde ao regime informado no cadastro. */
function motorDoRegime(regime?: string): MotorSlug {
  const r = (regime ?? "").toLowerCase();
  if (r.includes("simples") || r.includes("mei") || r.includes("simei")) return "simples-nacional";
  if (r.includes("real")) return "irpj-csll";
  return "pis-cofins";
}

/** Situação da conciliação bancária (a lista de contas é fixa no protótipo). */
function conciliacao(empresaId: string | null, competencia: string) {
  try {
    const contas = contasBancarias();
    const resultados = contas.map((c) => resultadoConciliacao(c, empresaId, competencia));
    return {
      contasBancarias: contas.length,
      contasConciliadas: resultados.filter((r) => r.fechada || r.percentual === 100).length,
    };
  } catch {
    return { contasBancarias: 0, contasConciliadas: 0 };
  }
}

/** Documentos fiscais considerados no retrato. */
const SLUGS_DOC = [
  "entradas",
  "saidas",
  "servicos-tomados",
  "servicos-prestados",
  "transporte",
  "cupons",
] as DocSlug[];

/** Livros e apurações da escrituração fiscal considerados no retrato. */
const SLUGS_ESC = [
  "livro-entradas",
  "livro-saidas",
  "apuracao-icms",
  "apuracao-ipi",
  "inventario",
  "ciap",
] as EscSlug[];

export type Contexto = {
  /** Empresa selecionada no cabeçalho (null = nenhuma). */
  empresaId: string | null;
  empresa?: EmpresaRecord;
  totalEmpresas: number;
  /** Empresa existe e tem CNPJ preenchido. */
  empresaCnpj: boolean;
  regimeDefinido: boolean;
  regime: string;
  filiais: number;
  filiaisAtivas: number;
  temMatriz: boolean;

  participantes: number;
  clientes: number;
  fornecedores: number;
  produtos: number;
  servicos: number;

  contas: number;
  contasAnaliticas: number;
  centros: number;
  historicos: number;

  lancamentos: number;
  lancamentosPeriodo: number;

  documentos: number;
  documentosPeriodo: number;
  escrituracao: number;

  inscricoes: number;
  parametrosEmpresa: number;
  certificados: number;

  titulosPagar: number;
  titulosReceber: number;
  movimentosCaixa: number;

  guias: number;
  guiasAbertas: number;
  obrigacoesPendentes: number;
  /** Quantos motores de apuração já saíram de "Aberta" nesta competência. */
  apuracoes: number;
  /** Contas bancárias com conciliação concluída ou fechada na competência. */
  contasConciliadas: number;
  /** Contas bancárias monitoradas na conciliação. */
  contasBancarias: number;
  /** Motor que corresponde ao regime da empresa (usado para sugerir o próximo passo). */
  motorDoRegime: MotorSlug;

  /** Pendências de cadastro já calculadas pelo motor de gestão do fechamento. */
  pendenciasCadastro: number;
  pendenciasCriticasCadastro: number;
  competenciaEncerrada: boolean;
};

/**
 * Monta o retrato do sistema. Puro (sem React) para poder ser usado em
 * funções de avaliação e em testes.
 */
export function coletarContexto(empresaId: string | null, competencia: string): Contexto {
  const empresas = loadEmpresas();
  const empresa = empresas.find((e) => e.id === empresaId);
  const filiais = loadFiliais().filter((f) => f.empresaId === empresaId);

  const participantes = listarParticipantes();
  const produtos = listarProdutos();
  const contas = listarContas();

  const eh = (p: { tipo?: string }, tipo: "Cliente" | "Fornecedor") =>
    (p.tipo ?? "").includes(tipo);

  const docs = SLUGS_DOC.flatMap((s) => loadDocs(s));
  const docsDaEmpresa = docs.filter((d) => d.empresaId === empresaId);
  const esc = SLUGS_ESC.flatMap((s) => loadLinhas(s)).filter(
    (l) => l.empresaId === empresaId && l.competencia === competencia,
  );

  const lancamentos = listarLancamentos(empresaId);
  const guias = listarGuias(empresaId, competencia);

  let obrigacoesPendentes = 0;
  try {
    obrigacoesPendentes = empresaId
      ? monitorar(empresaId, competencia).filter(
          (m) => m.status !== "Transmitida" && m.status !== "Não iniciada",
        ).length
      : 0;
  } catch {
    obrigacoesPendentes = 0;
  }

  const pend = empresaId ? pendenciasCadastro(empresaId) : [];
  const fechado = empresaId
    ? loadFechamentos().some((f) => f.key === `${empresaId}|${competencia}`)
    : false;

  return {
    empresaId,
    empresa,
    totalEmpresas: empresas.length,
    empresaCnpj: Boolean(empresa && (empresa.cnpj ?? "").replace(/\D/g, "").length >= 14),
    regimeDefinido: regimeDefinido(empresa?.regime),
    regime: empresa?.regime ?? "",
    filiais: filiais.length,
    filiaisAtivas: filiais.filter((f) => f.status === "Ativa").length,
    temMatriz: filiais.some((f) => f.tipo === "Matriz"),

    participantes: participantes.length,
    clientes: participantes.filter((p) => eh(p, "Cliente")).length,
    fornecedores: participantes.filter((p) => eh(p, "Fornecedor")).length,
    produtos: produtos.filter((p) => p.tipo === "Produto").length,
    servicos: produtos.filter((p) => p.tipo === "Serviço").length,

    contas: contas.length,
    contasAnaliticas: contas.filter((c) => c.tipo === "Analítica" && c.situacao === "Ativa").length,
    centros: listarCentros().length,
    historicos: listarHistoricos().length,

    lancamentos: lancamentos.length,
    lancamentosPeriodo: lancamentos.filter((l) => competenciaDaData(l.data) === competencia).length,

    documentos: docsDaEmpresa.length,
    documentosPeriodo: docsDaEmpresa.filter((d) => d.competencia === competencia).length,
    escrituracao: esc.length,

    inscricoes: loadRegistros("inscricoes", empresaId).length,
    parametrosEmpresa: loadRegistros("parametros", empresaId).length,
    certificados: loadRegistros("certificados", empresaId).length,

    titulosPagar: titulos("pagar", empresaId ?? "geral", competencia).length,
    titulosReceber: titulos("receber", empresaId ?? "geral", competencia).length,
    movimentosCaixa: loadMovimentos().length,

    apuracoes: MOTORES.filter(
      (m) => (getEstado(m, empresaId, competencia).status ?? "Aberta") !== "Aberta",
    ).length,
    motorDoRegime: motorDoRegime(empresa?.regime),
    ...conciliacao(empresaId, competencia),

    guias: guias.length,
    guiasAbertas: guias.filter((g) => g.status === "Em aberto" || g.status === "Vencida").length,
    obrigacoesPendentes,

    pendenciasCadastro: pend.filter((p) => !p.resolvida).length,
    pendenciasCriticasCadastro: pend.filter((p) => !p.resolvida && p.critica).length,
    competenciaEncerrada: fechado,
  };
}

/** Retrato reativo: recalcula quando os dados mudam, a empresa ou a competência. */
export function useContexto(empresaId: string | null, competencia: string): Contexto {
  const tick = useTick([empresaId ?? "", competencia]);
  return useMemo(
    () => coletarContexto(empresaId, competencia),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [empresaId, competencia, tick],
  );
}
