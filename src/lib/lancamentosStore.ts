/**
 * Escrituração contábil: lançamentos em partidas dobradas, estorno, Razão, Balancete e Diário.
 *
 * Regras:
 * - todo lançamento tem ao menos um débito e um crédito, e a soma dos débitos é igual à dos créditos;
 * - só contas ANALÍTICAS e ATIVAS recebem lançamentos (estornos podem usar conta inativada depois);
 * - competência encerrada (Preparativos › Serviços › Encerramentos) não aceita lançamento, alteração
 *   nem exclusão; a correção é feita por estorno numa competência aberta;
 * - lançamento estornado não pode ser alterado nem excluído (exclua antes o estorno, se ainda aberto);
 * - numeração sequencial por empresa.
 * Persistência: coleção local sincronizada com a nuvem (ver nuvemColecoes.ts).
 */
import { criarColecao, useColecoes, type RegistroBase } from "./nuvemColecoes";
import {
  codigoPai, compararCodigos, contaPorId, listarCentros, listarContas, registrarConsultaDeUsoDaConta,
  type Conta,
} from "./planoContasStore";
import { cadastrosQueUsamConta, participantePorId } from "./cadastrosStore";
import { read } from "./storeUtils";
import { usuarioAtual } from "./usuarioAtual";

export type TipoPartida = "D" | "C";

export type Partida = {
  id: string;
  contaId: string;
  tipo: TipoPartida;
  valor: number;
  centroCustoId?: string;
  participanteId?: string;
  complemento?: string;
};

export const TIPOS_LANCAMENTO = ["Normal", "Abertura", "Encerramento", "Estorno"] as const;
export type TipoLancamento = (typeof TIPOS_LANCAMENTO)[number];

export type Lancamento = RegistroBase & {
  empresaId: string;
  numero: number;
  /** Data do fato (AAAA-MM-DD); define a competência. */
  data: string;
  tipo: TipoLancamento;
  historicoId?: string;
  historico: string;
  documento?: string;
  partidas: Partida[];
  origem: "Manual" | "Importação" | "Integração";
  estornoDeId?: string;
  estornadoPorId?: string;
  criadoPor?: string;
  alteradoPor?: string;
};

export const colecaoLancamentos = criarColecao<Lancamento>("lancamentos");

export const novoIdLancamento = (prefixo = "lct") =>
  `${prefixo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/* ------------------------------------------------------------------ */
/* Formatação                                                          */
/* ------------------------------------------------------------------ */

export const centavos = (v: number) => Math.round((Number.isFinite(v) ? v : 0) * 100);
export const arred = (v: number) => centavos(v) / 100;

export const moeda = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Saldo com indicador: positivo = devedor (D), negativo = credor (C). */
export const saldoDC = (v: number) => (centavos(v) === 0 ? "0,00" : `${moeda(Math.abs(v))} ${v > 0 ? "D" : "C"}`);

export const dataBR = (iso?: string) => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10).split("-").reverse().join("/") : "—");

export const competenciaDaData = (data: string) => data.slice(0, 7);

export function dataValida(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

/** Último dia do mês de uma competência AAAA-MM. */
export function fimDaCompetencia(competencia: string) {
  const [a, m] = competencia.split("-").map(Number);
  const d = new Date(Date.UTC(a, m, 0));
  return d.toISOString().slice(0, 10);
}

export const totalDebitos = (l: Pick<Lancamento, "partidas">) =>
  arred(l.partidas.filter((p) => p.tipo === "D").reduce((s, p) => s + p.valor, 0));
export const totalCreditos = (l: Pick<Lancamento, "partidas">) =>
  arred(l.partidas.filter((p) => p.tipo === "C").reduce((s, p) => s + p.valor, 0));

/* ------------------------------------------------------------------ */
/* Leitura                                                             */
/* ------------------------------------------------------------------ */

const ordemLancamento = (a: Lancamento, b: Lancamento) => a.data.localeCompare(b.data) || a.numero - b.numero;

export function listarLancamentos(empresaId?: string | null, inicio?: string, fim?: string): Lancamento[] {
  if (!empresaId) return [];
  return colecaoLancamentos
    .listar()
    .filter((l) => l.empresaId === empresaId && (!inicio || l.data >= inicio) && (!fim || l.data <= fim))
    .sort(ordemLancamento);
}

export const useLancamentos = (empresaId?: string | null, inicio?: string, fim?: string) =>
  useColecoes(() => listarLancamentos(empresaId, inicio, fim), [empresaId, inicio, fim]);

export function proximoNumero(empresaId: string) {
  return colecaoLancamentos.listar().reduce((m, l) => (l.empresaId === empresaId ? Math.max(m, l.numero || 0) : m), 0) + 1;
}

/** Competência encerrada em Preparativos › Serviços › Encerramentos (mesma base do gestaoStore). */
export function competenciaEncerrada(empresaId: string, competencia: string): boolean {
  const fechamentos = read<{ key: string }[]>("usecontabil.fechamentos.v1", []);
  return fechamentos.some((f) => f.key === `${empresaId}|${competencia}`);
}

/** Quantas partidas usam a conta (em todas as empresas). */
export function lancamentosDaConta(contaId: string): number {
  let n = 0;
  for (const l of colecaoLancamentos.listar()) for (const p of l.partidas) if (p.contaId === contaId) n++;
  return n;
}

export function lancamentosDoParticipante(participanteId: string): number {
  return colecaoLancamentos.listar().filter((l) => l.partidas.some((p) => p.participanteId === participanteId)).length;
}

export function lancamentosDoCentro(centroId: string): number {
  return colecaoLancamentos.listar().filter((l) => l.partidas.some((p) => p.centroCustoId === centroId)).length;
}

registrarConsultaDeUsoDaConta((contaId) => ({ lancamentos: lancamentosDaConta(contaId), cadastros: cadastrosQueUsamConta(contaId) }));

/* ------------------------------------------------------------------ */
/* Validação e gravação                                                */
/* ------------------------------------------------------------------ */

/** Sem `strict` no tsconfig o `if (!r.ok)` não estreita a união: os dois lados declaram os dois campos. */
export type Resultado<T> = { ok: true; registro: T; erros?: undefined } | { ok: false; erros: string[]; registro?: undefined };

const nomeCompetencia = (competencia: string) => {
  const [a, m] = competencia.split("-");
  return `${m}/${a}`;
};

export function validarLancamento(l: Lancamento, contas: Conta[] = listarContas()): string[] {
  const erros: string[] = [];
  if (!l.empresaId) erros.push("Selecione a empresa no topo da tela.");
  if (!dataValida(l.data)) erros.push("Informe uma data válida.");
  else if (l.empresaId && competenciaEncerrada(l.empresaId, competenciaDaData(l.data))) {
    erros.push(`A competência ${nomeCompetencia(competenciaDaData(l.data))} está encerrada. Reabra em Preparativos › Serviços › Encerramentos ou lance numa competência aberta.`);
  }
  if (!l.historico.trim()) erros.push("Informe o histórico.");

  const partidas = l.partidas ?? [];
  if (partidas.length < 2) erros.push("O lançamento precisa de pelo menos um débito e um crédito.");
  const porId = new Map(contas.map((c) => [c.id, c]));
  const centros = new Map(listarCentros().map((c) => [c.id, c]));
  partidas.forEach((p, i) => {
    const n = i + 1;
    const conta = porId.get(p.contaId);
    if (!p.contaId || !conta) erros.push(`Linha ${n}: escolha a conta.`);
    else {
      if (conta.tipo !== "Analítica") erros.push(`Linha ${n}: ${conta.codigo} é conta sintética — lance numa conta analítica.`);
      if (conta.situacao !== "Ativa" && l.tipo !== "Estorno") erros.push(`Linha ${n}: a conta ${conta.codigo} está inativa.`);
      if (conta.exigeCentroCusto && !p.centroCustoId) erros.push(`Linha ${n}: a conta ${conta.codigo} exige centro de custo.`);
    }
    if (!(Number.isFinite(p.valor) && centavos(p.valor) > 0)) erros.push(`Linha ${n}: informe um valor maior que zero.`);
    if (p.centroCustoId && !centros.get(p.centroCustoId)) erros.push(`Linha ${n}: centro de custo não encontrado.`);
    if (p.participanteId && !participantePorId(p.participanteId)) erros.push(`Linha ${n}: cliente/fornecedor não encontrado.`);
  });
  const temD = partidas.some((p) => p.tipo === "D");
  const temC = partidas.some((p) => p.tipo === "C");
  if (partidas.length >= 2 && (!temD || !temC)) erros.push("O lançamento precisa de pelo menos um débito e um crédito.");
  const d = centavos(partidas.filter((p) => p.tipo === "D").reduce((s, p) => s + (p.valor || 0), 0));
  const c = centavos(partidas.filter((p) => p.tipo === "C").reduce((s, p) => s + (p.valor || 0), 0));
  if (temD && temC && d !== c) erros.push(`Débitos (${moeda(d / 100)}) e créditos (${moeda(c / 100)}) não batem: diferença de ${moeda(Math.abs(d - c) / 100)}.`);
  return [...new Set(erros)];
}

function registrarNoLog(acao: string, detalhe: string) {
  // Import dinâmico: a trilha de auditoria carrega módulos pesados que esta tela não precisa.
  void import("./auditoriaStore").then((m) => m.registrarLog(acao, detalhe, usuarioAtual())).catch(() => {});
}

export function salvarLancamento(l: Lancamento): Resultado<Lancamento> {
  const anterior = l.id ? colecaoLancamentos.obter(l.id) : undefined;
  if (anterior) {
    if (anterior.estornadoPorId) return { ok: false, erros: ["Lançamento estornado não pode ser alterado."] };
    if (competenciaEncerrada(anterior.empresaId, competenciaDaData(anterior.data))) {
      return { ok: false, erros: [`A competência ${nomeCompetencia(competenciaDaData(anterior.data))} está encerrada: corrija por estorno.`] };
    }
  }
  const final: Lancamento = {
    ...l,
    id: l.id || novoIdLancamento(),
    historico: l.historico.trim(),
    documento: l.documento?.trim() || undefined,
    partidas: l.partidas.map((p) => ({
      ...p,
      id: p.id || novoIdLancamento("pt"),
      valor: arred(p.valor),
      centroCustoId: p.centroCustoId || undefined,
      participanteId: p.participanteId || undefined,
      complemento: p.complemento?.trim() || undefined,
    })),
    numero: anterior?.numero ?? (l.numero || proximoNumero(l.empresaId)),
    criadoPor: anterior?.criadoPor ?? l.criadoPor ?? usuarioAtual(),
    alteradoPor: anterior ? usuarioAtual() : undefined,
  };
  const erros = validarLancamento(final);
  if (erros.length) return { ok: false, erros };
  const salvo = colecaoLancamentos.salvar(final);
  if (anterior) registrarNoLog("Lançamento contábil alterado", `Nº ${salvo.numero} de ${dataBR(salvo.data)} — ${salvo.historico} (R$ ${moeda(totalDebitos(salvo))})`);
  return { ok: true, registro: salvo };
}

/** Motivo pelo qual o lançamento não pode ser excluído (ou null). */
export function impedimentoExclusao(l: Lancamento): string | null {
  if (competenciaEncerrada(l.empresaId, competenciaDaData(l.data))) {
    return `A competência ${nomeCompetencia(competenciaDaData(l.data))} está encerrada: corrija por estorno.`;
  }
  if (l.estornadoPorId) {
    const estorno = colecaoLancamentos.obter(l.estornadoPorId);
    return `Este lançamento foi estornado${estorno ? ` (estorno nº ${estorno.numero})` : ""}. Exclua o estorno antes.`;
  }
  return null;
}

export function excluirLancamento(id: string): string | null {
  const l = colecaoLancamentos.obter(id);
  if (!l) return null;
  const motivo = impedimentoExclusao(l);
  if (motivo) return motivo;
  if (l.estornoDeId) {
    const original = colecaoLancamentos.obter(l.estornoDeId);
    if (original) colecaoLancamentos.salvar({ ...original, estornadoPorId: undefined });
  }
  colecaoLancamentos.remover(id);
  registrarNoLog("Lançamento contábil excluído", `Nº ${l.numero} de ${dataBR(l.data)} — ${l.historico} (R$ ${moeda(totalDebitos(l))})`);
  return null;
}

/** Estorna invertendo débitos e créditos, na data informada (competência aberta). */
export function estornarLancamento(id: string, dados: { data: string; motivo?: string }): Resultado<Lancamento> {
  const original = colecaoLancamentos.obter(id);
  if (!original) return { ok: false, erros: ["Lançamento não encontrado."] };
  if (original.estornadoPorId) return { ok: false, erros: ["Este lançamento já foi estornado."] };
  if (original.tipo === "Estorno") return { ok: false, erros: ["Não se estorna um estorno: exclua-o, se a competência estiver aberta."] };
  const motivo = dados.motivo?.trim();
  const r = salvarLancamento({
    id: "",
    empresaId: original.empresaId,
    numero: 0,
    data: dados.data,
    tipo: "Estorno",
    historico: `Estorno do lançamento nº ${original.numero} de ${dataBR(original.data)}${motivo ? ` — ${motivo}` : ""}`,
    documento: original.documento,
    partidas: original.partidas.map((p) => ({ ...p, id: "", tipo: p.tipo === "D" ? "C" : "D" })),
    origem: "Manual",
    estornoDeId: original.id,
  });
  if (!r.ok) return r;
  colecaoLancamentos.salvar({ ...original, estornadoPorId: r.registro.id });
  registrarNoLog("Lançamento contábil estornado", `Nº ${original.numero} estornado pelo nº ${r.registro.numero}${motivo ? ` — ${motivo}` : ""}`);
  return r;
}

/* ------------------------------------------------------------------ */
/* Razão, Balancete e Diário                                           */
/* ------------------------------------------------------------------ */

type Movimento = { anterior: number; debitos: number; creditos: number };

function movimentosPorConta(empresaId: string, inicio: string, fim: string) {
  const mov = new Map<string, Movimento>();
  for (const l of colecaoLancamentos.listar()) {
    if (l.empresaId !== empresaId || l.data > fim) continue;
    const antes = l.data < inicio;
    for (const p of l.partidas) {
      const m = mov.get(p.contaId) ?? { anterior: 0, debitos: 0, creditos: 0 };
      const cents = centavos(p.valor);
      if (antes) m.anterior += p.tipo === "D" ? cents : -cents;
      else if (p.tipo === "D") m.debitos += cents;
      else m.creditos += cents;
      mov.set(p.contaId, m);
    }
  }
  return mov;
}

export type LinhaBalancete = {
  conta: Conta;
  nivel: number;
  saldoAnterior: number;
  debitos: number;
  creditos: number;
  saldoAtual: number;
};

export type Balancete = {
  linhas: LinhaBalancete[];
  totais: { debitos: number; creditos: number; devedor: number; credor: number };
  /** Movimento em contas que não existem mais no plano (não deveria acontecer). */
  semConta: number;
};

/**
 * Balancete de verificação do período. Valores em reais; saldos com sinal (positivo = devedor).
 * As sintéticas somam as analíticas abaixo delas. Os totais somam só as analíticas.
 */
export function gerarBalancete(
  empresaId: string,
  inicio: string,
  fim: string,
  opcoes: { ocultarZeradas?: boolean; nivelMaximo?: number } = {},
): Balancete {
  const contas = listarContas();
  const porCodigo = new Map(contas.map((c) => [c.codigo, c]));
  const porId = new Map(contas.map((c) => [c.id, c]));
  const acumulado = new Map<string, Movimento>();
  const mov = movimentosPorConta(empresaId, inicio, fim);
  let semConta = 0;
  let totalD = 0;
  let totalC = 0;
  let devedor = 0;
  let credor = 0;

  for (const [contaId, m] of mov) {
    const conta = porId.get(contaId);
    if (!conta) {
      semConta += m.debitos + m.creditos;
      continue;
    }
    totalD += m.debitos;
    totalC += m.creditos;
    const saldo = m.anterior + m.debitos - m.creditos;
    if (saldo > 0) devedor += saldo;
    else credor -= saldo;
    let codigo: string | undefined = conta.codigo;
    while (codigo) {
      const alvo = porCodigo.get(codigo);
      if (alvo) {
        const a = acumulado.get(alvo.id) ?? { anterior: 0, debitos: 0, creditos: 0 };
        a.anterior += m.anterior;
        a.debitos += m.debitos;
        a.creditos += m.creditos;
        acumulado.set(alvo.id, a);
      }
      codigo = codigoPai(codigo);
    }
  }

  const linhas: LinhaBalancete[] = [];
  for (const conta of contas) {
    const nivel = conta.codigo.split(".").length;
    if (opcoes.nivelMaximo && nivel > opcoes.nivelMaximo) continue;
    const a = acumulado.get(conta.id) ?? { anterior: 0, debitos: 0, creditos: 0 };
    const saldoAtual = a.anterior + a.debitos - a.creditos;
    if (opcoes.ocultarZeradas && a.anterior === 0 && a.debitos === 0 && a.creditos === 0) continue;
    linhas.push({
      conta,
      nivel,
      saldoAnterior: a.anterior / 100,
      debitos: a.debitos / 100,
      creditos: a.creditos / 100,
      saldoAtual: saldoAtual / 100,
    });
  }
  linhas.sort((x, y) => compararCodigos(x.conta.codigo, y.conta.codigo));
  return {
    linhas,
    totais: { debitos: totalD / 100, creditos: totalC / 100, devedor: devedor / 100, credor: credor / 100 },
    semConta: semConta / 100,
  };
}

export type LinhaRazao = {
  lancamento: Lancamento;
  partida: Partida;
  contrapartida: string;
  debito: number;
  credito: number;
  saldo: number;
};

export type Razao = {
  conta?: Conta;
  saldoAnterior: number;
  linhas: LinhaRazao[];
  debitos: number;
  creditos: number;
  saldoFinal: number;
};

/** Razão analítico de uma conta no período, com saldo anterior e saldo a cada linha. */
export function gerarRazao(empresaId: string, contaId: string, inicio: string, fim: string): Razao {
  const conta = contaPorId(contaId);
  const contas = new Map(listarContas().map((c) => [c.id, c]));
  let anterior = 0;
  const doPeriodo: { l: Lancamento; p: Partida }[] = [];
  for (const l of colecaoLancamentos.listar()) {
    if (l.empresaId !== empresaId || l.data > fim) continue;
    for (const p of l.partidas) {
      if (p.contaId !== contaId) continue;
      if (l.data < inicio) anterior += p.tipo === "D" ? centavos(p.valor) : -centavos(p.valor);
      else doPeriodo.push({ l, p });
    }
  }
  doPeriodo.sort((a, b) => ordemLancamento(a.l, b.l));
  let saldo = anterior;
  let debitos = 0;
  let creditos = 0;
  const linhas = doPeriodo.map(({ l, p }) => {
    const cents = centavos(p.valor);
    if (p.tipo === "D") {
      saldo += cents;
      debitos += cents;
    } else {
      saldo -= cents;
      creditos += cents;
    }
    const outras = l.partidas.filter((x) => x.tipo !== p.tipo);
    const contrapartida =
      outras.length === 1 ? (contas.get(outras[0].contaId)?.codigo ?? "—") + " " + (contas.get(outras[0].contaId)?.descricao ?? "") : outras.length ? "Diversas" : "—";
    return {
      lancamento: l,
      partida: p,
      contrapartida: contrapartida.trim(),
      debito: p.tipo === "D" ? cents / 100 : 0,
      credito: p.tipo === "C" ? cents / 100 : 0,
      saldo: saldo / 100,
    };
  });
  return { conta, saldoAnterior: anterior / 100, linhas, debitos: debitos / 100, creditos: creditos / 100, saldoFinal: saldo / 100 };
}

/** Resumo para os indicadores das telas contábeis. */
export function resumoEscrituracao(empresaId: string | null | undefined, inicio: string, fim: string) {
  const lancs = listarLancamentos(empresaId, inicio, fim);
  const movimento = lancs.reduce((s, l) => s + totalDebitos(l), 0);
  return {
    quantidade: lancs.length,
    movimento: arred(movimento),
    estornos: lancs.filter((l) => l.tipo === "Estorno").length,
    desbalanceados: lancs.filter((l) => centavos(totalDebitos(l)) !== centavos(totalCreditos(l))).length,
  };
}
