/**
 * Cadastros contábeis: plano de contas, centros de custo e históricos padrão.
 *
 * São do GRUPO (valem para todas as empresas da conta), como o "plano de contas unificado" dos
 * sistemas contábeis: cada empresa lança nas mesmas contas e os relatórios filtram por empresa.
 * Persistência: coleções locais sincronizadas com a nuvem (ver nuvemColecoes.ts).
 */
import { criarColecao, useColecoes, type RegistroBase } from "./nuvemColecoes";
import { CENTROS_MODELO, GRUPO_POR_PREFIXO, HISTORICOS_MODELO, PLANO_MODELO } from "./planoContasModelo";

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export const GRUPOS_CONTA = [
  "Ativo", "Passivo", "Patrimônio líquido", "Receitas", "Custos", "Despesas", "Apuração do resultado", "Compensação",
] as const;
export type GrupoConta = (typeof GRUPOS_CONTA)[number];
export type NaturezaConta = "Devedora" | "Credora";
export type TipoConta = "Sintética" | "Analítica";

export type Conta = RegistroBase & {
  codigo: string;
  /** Código reduzido (numérico) para digitação rápida nos lançamentos. */
  reduzido?: string;
  descricao: string;
  tipo: TipoConta;
  natureza: NaturezaConta;
  grupo: GrupoConta;
  /** Conta do plano referencial da Receita Federal (ECD, registro I051). */
  referencial?: string;
  exigeCentroCusto: boolean;
  situacao: "Ativa" | "Inativa";
  observacao?: string;
  origem: "Modelo padrão" | "Manual";
};

export const TIPOS_CENTRO = ["Administrativo", "Comercial", "Produtivo", "Apoio", "Outro"] as const;
export type CentroCusto = RegistroBase & {
  codigo: string;
  descricao: string;
  tipo: (typeof TIPOS_CENTRO)[number];
  responsavel?: string;
  situacao: "Ativo" | "Inativo";
};

export type HistoricoPadrao = RegistroBase & {
  codigo: string;
  texto: string;
  situacao: "Ativo" | "Inativo";
};

export const colecaoContas = criarColecao<Conta>("plano_contas");
export const colecaoCentros = criarColecao<CentroCusto>("centros_custo");
export const colecaoHistoricos = criarColecao<HistoricoPadrao>("historicos");

export const novoId = (prefixo: string) =>
  `${prefixo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/* ------------------------------------------------------------------ */
/* Código da conta                                                     */
/* ------------------------------------------------------------------ */

export const CODIGO_CONTA_RE = /^\d+(\.\d+)*$/;

export const nivelDaConta = (codigo: string) => codigo.split(".").length;

export const codigoPai = (codigo: string) =>
  codigo.includes(".") ? codigo.slice(0, codigo.lastIndexOf(".")) : undefined;

/** Ordena "1.1.2" antes de "1.1.10" (compara segmento a segmento, como número). */
export function compararCodigos(a: string, b: string) {
  const sa = a.split(".");
  const sb = b.split(".");
  for (let i = 0; i < Math.max(sa.length, sb.length); i++) {
    if (sa[i] === undefined) return -1;
    if (sb[i] === undefined) return 1;
    const d = Number(sa[i]) - Number(sb[i]);
    if (d !== 0) return d;
    if (sa[i].length !== sb[i].length) return sa[i].length - sb[i].length;
  }
  return 0;
}

export function grupoPorCodigo(codigo: string): GrupoConta {
  const achado = GRUPO_POR_PREFIXO.find(([p]) => codigo === p || codigo.startsWith(p + "."));
  return (achado?.[1] as GrupoConta) ?? "Ativo";
}

export function naturezaPadrao(grupo: GrupoConta): NaturezaConta {
  return ["Ativo", "Custos", "Despesas", "Compensação"].includes(grupo) ? "Devedora" : "Credora";
}

/** Código de natureza da ECD (registro I050, COD_NAT). */
export function naturezaEcd(grupo: GrupoConta): "01" | "02" | "03" | "04" | "05" {
  if (grupo === "Ativo") return "01";
  if (grupo === "Passivo") return "02";
  if (grupo === "Patrimônio líquido") return "03";
  if (grupo === "Compensação") return "05";
  return "04";
}

/* ------------------------------------------------------------------ */
/* Leitura                                                             */
/* ------------------------------------------------------------------ */

export function listarContas(): Conta[] {
  return colecaoContas.listar().sort((a, b) => compararCodigos(a.codigo, b.codigo));
}

export function contaPorId(id: string | undefined): Conta | undefined {
  return id ? colecaoContas.obter(id) : undefined;
}

export function contaPorCodigo(codigo: string, contas = listarContas()): Conta | undefined {
  const alvo = codigo.trim();
  return contas.find((c) => c.codigo === alvo);
}

export function contasAnaliticasAtivas(contas = listarContas()): Conta[] {
  return contas.filter((c) => c.tipo === "Analítica" && c.situacao === "Ativa");
}

export const filhasDe = (codigo: string, contas: Conta[]) => contas.filter((c) => codigoPai(c.codigo) === codigo);

export function rotuloConta(c: Conta | undefined) {
  return c ? `${c.codigo} — ${c.descricao}` : "Conta não encontrada";
}

export function listarCentros(): CentroCusto[] {
  return colecaoCentros.listar().sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true }));
}

export function listarHistoricos(): HistoricoPadrao[] {
  return colecaoHistoricos.listar().sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true }));
}

export const useContas = () => useColecoes(listarContas);
export const useCentros = () => useColecoes(listarCentros);
export const useHistoricos = () => useColecoes(listarHistoricos);

/* ------------------------------------------------------------------ */
/* Validação e gravação                                                */
/* ------------------------------------------------------------------ */

/** Sem `strict` no tsconfig o `if (!r.ok)` não estreita a união: os dois lados declaram os dois campos. */
export type Resultado<T> = { ok: true; registro: T; erros?: undefined } | { ok: false; erros: string[]; registro?: undefined };

/** Verificações que dependem de outros módulos (lançamentos, cadastros). */
export type UsoDaConta = { lancamentos: number; cadastros: number };
let consultarUso: (contaId: string) => UsoDaConta = () => ({ lancamentos: 0, cadastros: 0 });
export function registrarConsultaDeUsoDaConta(fn: (contaId: string) => UsoDaConta) {
  consultarUso = fn;
}
export const usoDaConta = (contaId: string) => consultarUso(contaId);

export function validarConta(c: Conta, contas = listarContas()): string[] {
  const erros: string[] = [];
  const codigo = c.codigo.trim();
  if (!CODIGO_CONTA_RE.test(codigo)) {
    erros.push("Código inválido: use números separados por ponto (ex.: 1.1.01.001).");
    return erros;
  }
  if (!c.descricao.trim()) erros.push("Informe a descrição da conta.");
  const outra = contas.find((x) => x.id !== c.id && x.codigo === codigo);
  if (outra) erros.push(`Já existe a conta ${outra.codigo} — ${outra.descricao}.`);

  const pai = codigoPai(codigo);
  if (pai) {
    const contaPai = contas.find((x) => x.codigo === pai);
    if (!contaPai) erros.push(`Cadastre antes a conta superior ${pai}.`);
    else if (contaPai.tipo !== "Sintética") erros.push(`A conta superior ${pai} é analítica; transforme-a em sintética antes de criar subcontas.`);
  }

  const anterior = contas.find((x) => x.id === c.id);
  const filhas = anterior ? filhasDe(anterior.codigo, contas) : filhasDe(codigo, contas);
  if (anterior && anterior.codigo !== codigo && filhas.length) {
    erros.push("Esta conta tem subcontas: altere primeiro o código das subcontas.");
  }
  if (c.tipo === "Analítica" && filhas.length) erros.push("Conta com subcontas precisa ser sintética.");
  if (anterior && c.tipo === "Sintética" && anterior.tipo === "Analítica" && usoDaConta(c.id).lancamentos > 0) {
    erros.push("A conta tem lançamentos: só contas analíticas recebem lançamentos.");
  }

  const reduzido = (c.reduzido ?? "").trim();
  if (reduzido) {
    if (!/^\d{1,8}$/.test(reduzido)) erros.push("Código reduzido deve ter só números (até 8 dígitos).");
    const dono = contas.find((x) => x.id !== c.id && (x.reduzido ?? "") === reduzido);
    if (dono) erros.push(`O código reduzido ${reduzido} já é da conta ${dono.codigo}.`);
  }
  const ref = (c.referencial ?? "").trim();
  if (ref && !/^[\d.]{1,40}$/.test(ref)) erros.push("Conta referencial deve ter só números e pontos.");
  return erros;
}

function proximoReduzido(contas: Conta[]) {
  const max = contas.reduce((m, c) => Math.max(m, Number(c.reduzido) || 0), 0);
  return String(max + 1);
}

export function salvarConta(c: Conta): Resultado<Conta> {
  const contas = listarContas();
  const final: Conta = {
    ...c,
    id: c.id || novoId("cta"),
    codigo: c.codigo.trim(),
    descricao: c.descricao.trim(),
    reduzido: (c.reduzido ?? "").trim() || undefined,
    referencial: (c.referencial ?? "").trim() || undefined,
    observacao: (c.observacao ?? "").trim() || undefined,
  };
  if (final.tipo === "Analítica" && !final.reduzido) final.reduzido = proximoReduzido(contas.filter((x) => x.id !== c.id));
  if (final.tipo === "Sintética") final.exigeCentroCusto = false;
  const erros = validarConta(final, contas);
  if (erros.length) return { ok: false, erros };
  return { ok: true, registro: colecaoContas.salvar(final) };
}

/** Motivo pelo qual a conta não pode ser excluída (ou null se pode). */
export function impedimentoExclusaoConta(c: Conta, contas = listarContas()): string | null {
  if (filhasDe(c.codigo, contas).length) return "A conta tem subcontas. Exclua ou mova as subcontas antes.";
  const uso = usoDaConta(c.id);
  if (uso.lancamentos) return `A conta tem ${uso.lancamentos} lançamento(s). Inative a conta em vez de excluir.`;
  if (uso.cadastros) return `A conta está vinculada a ${uso.cadastros} cadastro(s) de clientes, fornecedores ou produtos.`;
  return null;
}

export function excluirConta(id: string): string | null {
  const c = contaPorId(id);
  if (!c) return null;
  const motivo = impedimentoExclusaoConta(c);
  if (motivo) return motivo;
  colecaoContas.remover(id);
  return null;
}

/** Nova conta sugerida abaixo de `pai` (próximo código livre, grupo e natureza herdados). */
export function sugestaoSubconta(pai: Conta | undefined, contas = listarContas()): Pick<Conta, "codigo" | "grupo" | "natureza" | "tipo"> {
  if (!pai) {
    const raizes = contas.filter((c) => !c.codigo.includes("."));
    const prox = raizes.reduce((m, c) => Math.max(m, Number(c.codigo) || 0), 0) + 1;
    const grupo = grupoPorCodigo(String(prox));
    return { codigo: String(prox), grupo, natureza: naturezaPadrao(grupo), tipo: "Sintética" };
  }
  const filhas = filhasDe(pai.codigo, contas);
  const nivel = nivelDaConta(pai.codigo) + 1;
  const largura = filhas[0]?.codigo.split(".").pop()?.length ?? (nivel <= 2 ? 1 : nivel === 3 ? 2 : 3);
  const maior = filhas.reduce((m, f) => Math.max(m, Number(f.codigo.split(".").pop()) || 0), 0);
  const codigo = `${pai.codigo}.${String(maior + 1).padStart(largura, "0")}`;
  return { codigo, grupo: pai.grupo, natureza: pai.natureza, tipo: nivel >= 4 ? "Analítica" : "Sintética" };
}

/** Contas do modelo padrão, prontas para gravar (reduzidos sequenciais nas analíticas). */
export function contasDoModelo(): Omit<Conta, "id">[] {
  const temFilhas = new Set(PLANO_MODELO.map(([c]) => codigoPai(c)).filter(Boolean) as string[]);
  let reduzido = 0;
  return PLANO_MODELO.map(([codigo, descricao]) => {
    const grupo = grupoPorCodigo(codigo);
    const redutora = descricao.startsWith("(-)");
    const padrao = naturezaPadrao(grupo);
    const tipo: TipoConta = temFilhas.has(codigo) ? "Sintética" : "Analítica";
    return {
      codigo,
      descricao,
      tipo,
      grupo,
      natureza: redutora ? (padrao === "Devedora" ? "Credora" : "Devedora") : padrao,
      reduzido: tipo === "Analítica" ? String(++reduzido) : undefined,
      exigeCentroCusto: false,
      situacao: "Ativa",
      origem: "Modelo padrão",
    };
  });
}

/**
 * Acrescenta ao plano as contas do modelo que ainda não existem (pelo código). Não altera nem apaga
 * nada do que já foi cadastrado. Retorna quantas contas foram criadas.
 */
export function carregarPlanoModelo(): number {
  const existentes = listarContas();
  const porCodigo = new Set(existentes.map((c) => c.codigo));
  const usados = new Set(existentes.map((c) => c.reduzido).filter(Boolean));
  let proximo = existentes.reduce((m, c) => Math.max(m, Number(c.reduzido) || 0), 0);
  const novas = contasDoModelo()
    .filter((c) => !porCodigo.has(c.codigo))
    .map((c) => {
      let reduzido = c.reduzido;
      if (reduzido && usados.has(reduzido)) reduzido = String(++proximo);
      if (reduzido) proximo = Math.max(proximo, Number(reduzido));
      return { ...c, reduzido, id: novoId("cta") } as Conta;
    });
  // Contas analíticas já cadastradas que viram "pai" de contas do modelo precisariam mudar de tipo:
  // nesse caso a conta do modelo é ignorada para não quebrar lançamentos existentes.
  const analiticas = new Set(existentes.filter((c) => c.tipo === "Analítica").map((c) => c.codigo));
  const seguras = novas.filter((c) => {
    let pai = codigoPai(c.codigo);
    while (pai) {
      if (analiticas.has(pai)) return false;
      pai = codigoPai(pai);
    }
    return true;
  });
  colecaoContas.salvarVarios(seguras);
  return seguras.length;
}

/* ---------------------------- centros de custo ---------------------------- */

export function validarCentro(c: CentroCusto, centros = listarCentros()): string[] {
  const erros: string[] = [];
  const codigo = c.codigo.trim();
  if (!codigo) erros.push("Informe o código do centro de custo.");
  else if (!/^[\w.-]{1,20}$/.test(codigo)) erros.push("Código do centro de custo: até 20 letras, números, ponto ou hífen.");
  if (!c.descricao.trim()) erros.push("Informe a descrição do centro de custo.");
  const outro = centros.find((x) => x.id !== c.id && x.codigo.toLowerCase() === codigo.toLowerCase());
  if (outro) erros.push(`Já existe o centro de custo ${outro.codigo} — ${outro.descricao}.`);
  return erros;
}

export function salvarCentro(c: CentroCusto): Resultado<CentroCusto> {
  const final = { ...c, id: c.id || novoId("cc"), codigo: c.codigo.trim(), descricao: c.descricao.trim(), responsavel: c.responsavel?.trim() || undefined };
  const erros = validarCentro(final);
  if (erros.length) return { ok: false, erros };
  return { ok: true, registro: colecaoCentros.salvar(final) };
}

export function carregarCentrosModelo(): number {
  const existentes = new Set(listarCentros().map((c) => c.codigo));
  const novos = CENTROS_MODELO.filter(([codigo]) => !existentes.has(codigo)).map(
    ([codigo, descricao, tipo]) => ({ id: novoId("cc"), codigo, descricao, tipo, situacao: "Ativo" }) as CentroCusto,
  );
  colecaoCentros.salvarVarios(novos);
  return novos.length;
}

/* ---------------------------- históricos padrão ---------------------------- */

export function validarHistorico(h: HistoricoPadrao, historicos = listarHistoricos()): string[] {
  const erros: string[] = [];
  const codigo = h.codigo.trim();
  if (!codigo) erros.push("Informe o código do histórico.");
  if (!h.texto.trim()) erros.push("Informe o texto do histórico.");
  const outro = historicos.find((x) => x.id !== h.id && x.codigo.toLowerCase() === codigo.toLowerCase());
  if (outro) erros.push(`Já existe o histórico ${outro.codigo}.`);
  return erros;
}

export function salvarHistorico(h: HistoricoPadrao): Resultado<HistoricoPadrao> {
  const final = { ...h, id: h.id || novoId("hist"), codigo: h.codigo.trim(), texto: h.texto.trim() };
  const erros = validarHistorico(final);
  if (erros.length) return { ok: false, erros };
  return { ok: true, registro: colecaoHistoricos.salvar(final) };
}

export function carregarHistoricosModelo(): number {
  const existentes = new Set(listarHistoricos().map((h) => h.codigo));
  const novos = HISTORICOS_MODELO.filter(([codigo]) => !existentes.has(codigo)).map(
    ([codigo, texto]) => ({ id: novoId("hist"), codigo, texto, situacao: "Ativo" }) as HistoricoPadrao,
  );
  colecaoHistoricos.salvarVarios(novos);
  return novos.length;
}

export const MARCADORES_HISTORICO = ["{documento}", "{participante}", "{competencia}"] as const;

/** Troca os marcadores do histórico padrão pelos dados do lançamento. */
export function montarHistorico(
  texto: string,
  dados: { documento?: string; participante?: string; competencia?: string; complemento?: string },
) {
  const base = texto
    .replace(/\{documento\}/g, dados.documento?.trim() || "s/n")
    .replace(/\{participante\}/g, dados.participante?.trim() || "—")
    .replace(/\{competencia\}/g, dados.competencia?.trim() || "—")
    .trim();
  const complemento = dados.complemento?.trim();
  return complemento ? `${base} ${complemento}`.trim() : base;
}
