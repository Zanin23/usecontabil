/**
 * Importação por planilha (CSV ou Excel) dos dados de abertura da contabilidade:
 *
 * 1. **Plano de contas** — cria (ou atualiza, pelo código) as contas do plano do grupo;
 * 2. **Balancete de abertura** — confere conta a conta e grava um **lançamento contábil do tipo
 *    "Abertura"** com uma partida de débito ou crédito por conta, validado pelas mesmas regras dos
 *    lançamentos digitados (débitos = créditos, conta analítica e ativa, competência aberta).
 *
 * O que entra na planilha é conferido linha a linha e nada é gravado pela metade: quando há erro em
 * alguma linha, o resultado aponta a linha e o motivo.
 */
import {
  compararCodigos, grupoPorCodigo, listarContas, naturezaPadrao, salvarConta,
  type Conta, type GrupoConta, type NaturezaConta, type TipoConta,
} from "./planoContasStore";
import {
  arred, novoIdLancamento, salvarLancamento, type Lancamento, type Partida, type Resultado,
} from "./lancamentosStore";
import { parseNumeroBR } from "./numeros";
import { linhaVazia, textoDaCelula, type CelulaPlanilha } from "./planilha";

export type ProblemaImportacao = { linha: number; mensagem: string };

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Número de uma célula: número do .xlsx como veio; texto pela convenção brasileira. */
export function numeroDaCelula(c: CelulaPlanilha | undefined): number | null {
  if (c === null || c === undefined) return null;
  if (typeof c === "number") return Number.isFinite(c) ? c : null;
  const texto = c.trim();
  if (!texto) return null;
  return parseNumeroBR(texto);
}

/* ------------------------------------------------------------------ */
/* Cabeçalho                                                           */
/* ------------------------------------------------------------------ */

type Mapa = Record<string, number>;

function mapearColunas(celulas: CelulaPlanilha[], aliases: Record<string, string[]>): Mapa {
  const textos = celulas.map((c) => normalizar(textoDaCelula(c)));
  const mapa: Mapa = {};
  const usados = new Set<number>();
  const acharEm = (campo: string, exato: boolean) => {
    const nomes = aliases[campo] ?? [];
    const i = textos.findIndex((t, idx) => {
      if (!t || usados.has(idx)) return false;
      return exato ? nomes.includes(t) : nomes.some((n) => t.includes(n));
    });
    if (i >= 0) {
      mapa[campo] = i;
      usados.add(i);
    }
  };
  // Primeiro os nomes exatos (evita "conta" casar com "descrição da conta"); depois os parciais.
  for (const campo of Object.keys(aliases)) acharEm(campo, true);
  for (const campo of Object.keys(aliases)) if (!(campo in mapa)) acharEm(campo, false);
  return mapa;
}

function acharCabecalho(
  linhas: CelulaPlanilha[][],
  aliases: Record<string, string[]>,
  obrigatorios: string[][],
): { indice: number; mapa: Mapa } | null {
  for (let i = 0; i < Math.min(linhas.length, 15); i++) {
    const mapa = mapearColunas(linhas[i], aliases);
    if (obrigatorios.every((grupo) => grupo.some((campo) => campo in mapa))) return { indice: i, mapa };
  }
  return null;
}

const valor = (linha: CelulaPlanilha[], mapa: Mapa, campo: string) =>
  campo in mapa ? textoDaCelula(linha[mapa[campo]]) : "";

/* ------------------------------------------------------------------ */
/* Plano de contas                                                     */
/* ------------------------------------------------------------------ */

export type ContaImportada = {
  linha: number;
  codigo: string;
  descricao: string;
  tipo?: TipoConta;
  natureza?: NaturezaConta;
  grupo?: GrupoConta;
  reduzido?: string;
  referencial?: string;
  exigeCentroCusto?: boolean;
  situacao?: "Ativa" | "Inativa";
};

export type LeituraPlanoContas = {
  /** Linha do cabeçalho na planilha (1 = primeira linha). */
  cabecalho: number;
  contas: ContaImportada[];
  erros: ProblemaImportacao[];
  linhasIgnoradas: number;
};

const ALIASES_PLANO: Record<string, string[]> = {
  codigo: ["codigo", "codigo da conta", "conta", "cod", "classificacao", "codigo contabil"],
  descricao: ["descricao", "descricao da conta", "nome", "nome da conta", "conta descricao"],
  tipo: ["tipo", "tipo de conta", "sintetica analitica", "s a", "grau"],
  natureza: ["natureza", "natureza da conta", "devedora credora", "d c", "indicador de natureza"],
  grupo: ["grupo", "grupo da conta", "grupo contabil"],
  reduzido: ["reduzido", "codigo reduzido", "cod reduzido", "codigo de digitacao", "codigo rapido"],
  referencial: ["referencial", "conta referencial", "referencial rfb", "codigo referencial", "referencial da rfb"],
  exigeCentroCusto: ["exige centro de custo", "centro de custo", "usa centro de custo", "requer centro de custo"],
  situacao: ["situacao", "status", "ativa inativa", "condicao"],
};

const GRUPOS_NORMALIZADOS: [string, GrupoConta][] = [
  ["ativo", "Ativo"],
  ["passivo", "Passivo"],
  ["patrimonio liquido", "Patrimônio líquido"],
  ["pl", "Patrimônio líquido"],
  ["receita", "Receitas"],
  ["receitas", "Receitas"],
  ["custo", "Custos"],
  ["custos", "Custos"],
  ["despesa", "Despesas"],
  ["despesas", "Despesas"],
  ["apuracao do resultado", "Apuração do resultado"],
  ["compensacao", "Compensação"],
];

const grupoDaCelula = (texto: string): GrupoConta | undefined => {
  const t = normalizar(texto);
  if (!t) return undefined;
  const exato = GRUPOS_NORMALIZADOS.find(([nome]) => nome === t);
  if (exato) return exato[1];
  const parcial = GRUPOS_NORMALIZADOS.find(([nome]) => t.includes(nome));
  return parcial?.[1];
};

const tipoDaCelula = (texto: string): TipoConta | undefined => {
  const t = normalizar(texto);
  if (!t) return undefined;
  if (/^(s\b|sintet|s$)/.test(t)) return "Sintética";
  if (/^(a\b|analit|a$)/.test(t)) return "Analítica";
  return undefined;
};

const naturezaDaCelula = (texto: string): NaturezaConta | undefined => {
  const t = normalizar(texto);
  if (!t) return undefined;
  if (/^(d\b|devedor|d$)/.test(t)) return "Devedora";
  if (/^(c\b|credor|c$)/.test(t)) return "Credora";
  return undefined;
};

const simNao = (texto: string) => /^(s|sim|1|x|verdadeiro|true)$/.test(normalizar(texto));

/**
 * Lê as linhas da planilha do plano de contas. Não grava nada: só devolve as contas reconhecidas e
 * os problemas encontrados (com o número da linha da planilha).
 */
export function lerPlanoDeContas(linhas: CelulaPlanilha[][]): LeituraPlanoContas {
  const cabecalho = acharCabecalho(linhas, ALIASES_PLANO, [["codigo"], ["descricao"]]);
  if (!cabecalho) {
    throw new Error(
      'Não encontrei o cabeçalho da planilha. A primeira linha precisa ter, no mínimo, as colunas "Código" e "Descrição".',
    );
  }
  const { indice, mapa } = cabecalho;
  const erros: ProblemaImportacao[] = [];
  const contas: ContaImportada[] = [];
  let linhasIgnoradas = 0;

  const registros = linhas.slice(indice + 1).filter((l) => !linhaVazia(l));
  const temFilhas = new Set<string>();
  for (const linha of registros) {
    const codigo = valor(linha, mapa, "codigo").trim();
    if (!codigo) continue;
    const partes = codigo.split(".");
    // Todo ancestral de uma conta importada é sintético, não apenas o pai direto.
    for (let n = 1; n < partes.length; n++) temFilhas.add(partes.slice(0, n).join("."));
  }

  registros.forEach((linha, i) => {
    const numero = indice + i + 2; // linha real na planilha (1 = primeira)
    if (linhaVazia(linha)) return;
    const codigo = valor(linha, mapa, "codigo").trim();
    const descricao = valor(linha, mapa, "descricao").trim();
    if (!codigo && !descricao) {
      linhasIgnoradas++;
      return;
    }
    if (!codigo) {
      erros.push({ linha: numero, mensagem: "Linha sem o código da conta." });
      return;
    }
    if (!/^\d+(\.\d+)*$/.test(codigo)) {
      erros.push({ linha: numero, mensagem: `Código inválido: "${codigo}" (use números separados por ponto, ex.: 1.1.01.001).` });
      return;
    }
    if (!descricao) {
      erros.push({ linha: numero, mensagem: `Informe a descrição da conta ${codigo}.` });
      return;
    }
    const grupo = grupoDaCelula(valor(linha, mapa, "grupo")) ?? grupoPorCodigo(codigo);
    const tipoTexto = valor(linha, mapa, "tipo");
    const tipo = tipoDaCelula(tipoTexto) ?? (temFilhas.has(codigo) ? "Sintética" : "Analítica");
    const naturezaTexto = valor(linha, mapa, "natureza");
    const natureza = naturezaDaCelula(naturezaTexto) ?? naturezaPadrao(grupo);
    const reduzido = valor(linha, mapa, "reduzido").replace(/\D/g, "");
    const referencial = valor(linha, mapa, "referencial").trim();
    const exigeTexto = valor(linha, mapa, "exigeCentroCusto");
    const situacaoTexto = normalizar(valor(linha, mapa, "situacao"));

    if (tipoTexto && !tipoDaCelula(tipoTexto)) {
      erros.push({
        linha: numero,
        mensagem: `Tipo de conta não reconhecido: "${tipoTexto}" (use "Sintética" ou "Analítica").`,
      });
      return;
    }
    if (naturezaTexto && !naturezaDaCelula(naturezaTexto)) {
      erros.push({
        linha: numero,
        mensagem: `Natureza não reconhecida: "${naturezaTexto}" (use "Devedora" ou "Credora").`,
      });
      return;
    }

    contas.push({
      linha: numero,
      codigo,
      descricao,
      tipo,
      natureza,
      grupo,
      reduzido: reduzido || undefined,
      referencial: referencial || undefined,
      exigeCentroCusto: tipo === "Analítica" ? simNao(exigeTexto) : false,
      situacao: /^inativa|^inativo|^i\b/.test(situacaoTexto) ? "Inativa" : "Ativa",
    });
  });

  contas.sort((a, b) => compararCodigos(a.codigo, b.codigo));
  return { cabecalho: indice + 1, contas, erros, linhasIgnoradas };
}

export type ResultadoPlanoContas = {
  criadas: number;
  atualizadas: number;
  ignoradas: number;
  /** Contas superiores criadas automaticamente como sintéticas para sustentar a hierarquia. */
  superiores: number;
  erros: ProblemaImportacao[];
};

/** Contas superiores ausentes viram sintéticas para que a hierarquia do código feche. */
function completarSuperiores(contas: ContaImportada[], existentes: Map<string, Conta>): ContaImportada[] {
  const conhecidos = new Set([...existentes.keys(), ...contas.map((c) => c.codigo)]);
  const faltantes = new Map<string, ContaImportada>();
  for (const item of contas) {
    const partes = item.codigo.split(".");
    for (let n = 1; n < partes.length; n++) {
      const codigo = partes.slice(0, n).join(".");
      if (conhecidos.has(codigo) || faltantes.has(codigo)) continue;
      faltantes.set(codigo, {
        linha: item.linha,
        codigo,
        descricao: `Conta superior ${codigo} (criada na importação)`,
        tipo: "Sintética",
        grupo: grupoPorCodigo(codigo),
        natureza: naturezaPadrao(grupoPorCodigo(codigo)),
        situacao: "Ativa",
      });
    }
  }
  return [...faltantes.values()];
}

/**
 * Grava as contas lidas, uma a uma, pelas mesmas regras da tela do plano de contas. Contas que já
 * existem são atualizadas quando `atualizarExistentes` (o padrão) — e nunca perdem o vínculo com
 * lançamentos, porque a gravação preserva o id e a origem.
 *
 * Planilhas que trazem só as contas analíticas funcionam: as contas superiores que faltarem são
 * criadas como sintéticas (nome provisório "Conta superior …") e contadas em `superiores`.
 */
export function importarPlanoDeContas(
  contas: ContaImportada[],
  opcoes: { atualizarExistentes?: boolean } = {},
): ResultadoPlanoContas {
  const atualizar = opcoes.atualizarExistentes ?? true;
  const existentes = new Map(listarContas().map((c) => [c.codigo, c]));
  const superiores = completarSuperiores(contas, existentes);
  const resultado: ResultadoPlanoContas = { criadas: 0, atualizadas: 0, ignoradas: 0, superiores: 0, erros: [] };
  const lista = [...contas, ...superiores].sort((a, b) => compararCodigos(a.codigo, b.codigo));

  for (const item of lista) {
    const atual = existentes.get(item.codigo);
    if (atual && !atualizar) {
      resultado.ignoradas++;
      continue;
    }
    const conta: Conta = atual
      ? {
          ...atual,
          descricao: item.descricao,
          tipo: item.tipo ?? atual.tipo,
          natureza: item.natureza ?? atual.natureza,
          grupo: item.grupo ?? atual.grupo,
          reduzido: item.reduzido ?? atual.reduzido,
          referencial: item.referencial ?? atual.referencial,
          exigeCentroCusto: item.exigeCentroCusto ?? atual.exigeCentroCusto,
          situacao: item.situacao ?? atual.situacao,
        }
      : {
          id: "",
          codigo: item.codigo,
          descricao: item.descricao,
          tipo: item.tipo ?? "Analítica",
          natureza: item.natureza ?? naturezaPadrao(item.grupo ?? grupoPorCodigo(item.codigo)),
          grupo: item.grupo ?? grupoPorCodigo(item.codigo),
          reduzido: item.reduzido,
          referencial: item.referencial,
          exigeCentroCusto: item.exigeCentroCusto ?? false,
          situacao: item.situacao ?? "Ativa",
          origem: "Importação",
        };
    const r = salvarConta(conta);
    if (!r.ok) {
      resultado.erros.push({ linha: item.linha, mensagem: `${item.codigo}: ${r.erros.join(" ")}` });
      continue;
    }
    if (atual) resultado.atualizadas++;
    else {
      resultado.criadas++;
      if (item.descricao.startsWith("Conta superior ")) resultado.superiores++;
    }
  }
  return resultado;
}

/* ------------------------------------------------------------------ */
/* Balancete de abertura                                               */
/* ------------------------------------------------------------------ */

export type LinhaAbertura = {
  linha: number;
  /** Texto da conta como veio na planilha (código ou reduzido). */
  conta: string;
  contaId: string;
  codigo: string;
  descricao: string;
  tipo: "D" | "C";
  valor: number;
};

export type LeituraBalancete = {
  cabecalho: number;
  linhas: LinhaAbertura[];
  debitos: number;
  creditos: number;
  diferenca: number;
  erros: ProblemaImportacao[];
  linhasIgnoradas: number;
};

const ALIASES_BALANCETE: Record<string, string[]> = {
  conta: ["conta", "codigo", "codigo da conta", "cod", "reduzido", "codigo reduzido", "classificacao"],
  descricao: ["descricao", "descricao da conta", "nome", "nome da conta", "historico"],
  debito: ["debito", "debitos", "valor debito", "saldo devedor", "saldo devedor d", "d"],
  credito: ["credito", "creditos", "valor credito", "saldo credor", "saldo credor c", "c"],
  saldo: ["saldo", "saldo final", "saldo atual", "valor", "saldo em reais"],
};

/**
 * Lê a planilha do balancete de abertura: uma linha por conta, com Débito **ou** Crédito (ou uma
 * coluna Saldo, positiva = devedor e negativa = credor). Resolve cada conta no plano já cadastrado.
 */
export function lerBalanceteAbertura(linhas: CelulaPlanilha[][]): LeituraBalancete {
  const cabecalho = acharCabecalho(linhas, ALIASES_BALANCETE, [["conta"], ["debito", "credito", "saldo"]]);
  if (!cabecalho) {
    throw new Error(
      'Não encontrei o cabeçalho da planilha. A primeira linha precisa ter a coluna "Conta" e, ao menos, uma entre "Débito", "Crédito" ou "Saldo".',
    );
  }
  const { indice, mapa } = cabecalho;
  const contas = listarContas();
  const porCodigo = new Map(contas.map((c) => [c.codigo, c]));
  const porReduzido = new Map(contas.filter((c) => c.reduzido).map((c) => [String(c.reduzido), c]));
  const erros: ProblemaImportacao[] = [];
  const linhasLidas: LinhaAbertura[] = [];
  let linhasIgnoradas = 0;

  linhas.slice(indice + 1).forEach((linha, i) => {
    const numero = indice + i + 2;
    if (linhaVazia(linha)) {
      linhasIgnoradas++;
      return;
    }
    const contaTexto = valor(linha, mapa, "conta").trim();
    const brutoDebito = numeroDaCelula("debito" in mapa ? linha[mapa.debito] : null);
    const brutoCredito = numeroDaCelula("credito" in mapa ? linha[mapa.credito] : null);
    const brutoSaldo = numeroDaCelula("saldo" in mapa ? linha[mapa.saldo] : null);
    const semValores = !brutoDebito && !brutoCredito && !brutoSaldo;

    if (!contaTexto) {
      if (semValores) linhasIgnoradas++;
      else erros.push({ linha: numero, mensagem: "Linha com valor, mas sem a conta." });
      return;
    }
    // A célula pode trazer o código da conta ("1.1.01.001") ou o reduzido ("1"). Quando o texto casa
    // com uma conta sintética pelo código e existe uma analítica com esse reduzido, vale a analítica:
    // conta sintética não recebe lançamento.
    const porCodigoExato = porCodigo.get(contaTexto);
    const porReduzidoExato = porReduzido.get(contaTexto.replace(/\D/g, ""));
    const conta =
      porCodigoExato && porCodigoExato.tipo === "Analítica"
        ? porCodigoExato
        : porReduzidoExato?.tipo === "Analítica"
          ? porReduzidoExato
          : (porCodigoExato ?? porReduzidoExato);
    if (!conta) {
      // Linhas de total do balancete ("TOTAL", "SOMA DO ATIVO"…) são puladas de propósito.
      if (semValores || /^(total|soma|subtotal)\b/.test(normalizar(contaTexto))) linhasIgnoradas++;
      else erros.push({ linha: numero, mensagem: `Conta "${contaTexto}" não encontrada no plano de contas. Importe o plano antes do balancete.` });
      return;
    }
    if (semValores) {
      linhasIgnoradas++;
      return;
    }
    if (brutoDebito !== null && brutoDebito < 0) {
      erros.push({ linha: numero, mensagem: `Conta ${conta.codigo}: débito negativo. Informe o valor no lado correto (débito ou crédito).` });
      return;
    }
    if (brutoCredito !== null && brutoCredito < 0) {
      erros.push({ linha: numero, mensagem: `Conta ${conta.codigo}: crédito negativo. Informe o valor no lado correto (débito ou crédito).` });
      return;
    }
    const preenchidos = [brutoDebito, brutoCredito, brutoSaldo].filter((v) => v !== null && v !== 0).length;
    if (preenchidos > 1) {
      erros.push({ linha: numero, mensagem: `Conta ${conta.codigo}: informe o valor em apenas um lado (débito, crédito ou saldo).` });
      return;
    }
    const tipo: "D" | "C" = brutoCredito ? "C" : brutoDebito ? "D" : (brutoSaldo ?? 0) >= 0 ? "D" : "C";
    const valorLinha = arred(Math.abs(brutoCredito ?? brutoDebito ?? brutoSaldo ?? 0));
    if (valorLinha === 0) {
      linhasIgnoradas++;
      return;
    }
    if (linhasLidas.some((l) => l.contaId === conta.id)) {
      erros.push({ linha: numero, mensagem: `A conta ${conta.codigo} aparece mais de uma vez na planilha — some os valores em uma única linha.` });
      return;
    }
    linhasLidas.push({
      linha: numero,
      conta: contaTexto,
      contaId: conta.id,
      codigo: conta.codigo,
      descricao: conta.descricao,
      tipo,
      valor: valorLinha,
    });
  });

  const debitos = arred(linhasLidas.filter((l) => l.tipo === "D").reduce((s, l) => s + l.valor, 0));
  const creditos = arred(linhasLidas.filter((l) => l.tipo === "C").reduce((s, l) => s + l.valor, 0));
  return {
    cabecalho: indice + 1,
    linhas: linhasLidas,
    debitos,
    creditos,
    diferenca: arred(debitos - creditos),
    erros,
    linhasIgnoradas,
  };
}

export type OpcoesAbertura = {
  empresaId: string;
  data: string;
  historico: string;
  documento?: string;
};

/** Monta (sem gravar) o lançamento de abertura com uma partida por linha do balancete. */
export function montarLancamentoAbertura(leitura: LeituraBalancete, opcoes: OpcoesAbertura): Lancamento {
  const partidas: Partida[] = leitura.linhas.map((l) => ({
    id: novoIdLancamento("pt"),
    contaId: l.contaId,
    tipo: l.tipo,
    valor: l.valor,
  }));
  return {
    id: "",
    empresaId: opcoes.empresaId,
    numero: 0,
    data: opcoes.data,
    tipo: "Abertura",
    historico: opcoes.historico.trim() || "Balancete de abertura",
    documento: opcoes.documento?.trim() || undefined,
    partidas,
    origem: "Importação",
  };
}

/**
 * Grava o lançamento de abertura. Antes de gravar, exige que a planilha esteja lida e que débitos e
 * créditos fechem — a diferença é mostrada em reais para corrigir a planilha.
 */
export function importarBalanceteAbertura(leitura: LeituraBalancete, opcoes: OpcoesAbertura): Resultado<Lancamento> {
  if (!leitura.linhas.length) {
    return { ok: false, erros: ["Nenhuma linha válida para importar: confira se as contas existem no plano de contas."] };
  }
  if (leitura.erros.length) {
    return { ok: false, erros: [`A planilha tem ${leitura.erros.length} linha(s) com problema. Corrija e importe novamente.`] };
  }
  const considerar = (v: number) => Math.round(v * 100);
  if (considerar(leitura.debitos) !== considerar(leitura.creditos)) {
    return {
      ok: false,
      erros: [
        `Débitos (R$ ${leitura.debitos.toFixed(2)}) e créditos (R$ ${leitura.creditos.toFixed(2)}) não fecham: diferença de R$ ${Math.abs(leitura.diferenca).toFixed(2)}.`,
      ],
    };
  }
  return salvarLancamento(montarLancamentoAbertura(leitura, opcoes));
}

/** Lançamentos de abertura já existentes (a tela avisa antes de importar de novo). */
export function aberturasExistentes(lancamentos: Lancamento[]): Lancamento[] {
  return lancamentos.filter((l) => l.tipo === "Abertura" && !l.estornoDeId && !l.estornadoPorId);
}
