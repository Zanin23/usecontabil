// ============================================================================
// Administrativo › Patrimônio (Ativo Imobilizado)
// ----------------------------------------------------------------------------
// Motor de controle patrimonial inspirado em Domínio, Alterdata, Questor, SCI,
// Fortes e TOTVS: cadastro de bens, depreciação, movimentações (transferência,
// baixa, reavaliação) e inventário físico.
//
// Regras implementadas:
//  R1  Base depreciável = valor de aquisição (+ benfeitorias/reavaliações)
//      − valor residual estimado (% informado sobre o valor corrigido).
//  R2  Depreciação linear mensal = base depreciável ÷ vida útil (meses).
//      A quota nunca ultrapassa o saldo ainda não depreciado.
//  R3  A depreciação começa no mês seguinte ao da entrada em operação
//      (regime "mês subsequente"), padrão dos sistemas contábeis brasileiros.
//  R4  Taxa anual = 12 ÷ vida útil × 100. Ex.: 120 meses → 10% a.a.
//      Turno adicional aplica coeficiente 1,5 (2 turnos) ou 2,0 (3 turnos),
//      conforme a prática de depreciação acelerada.
//  R5  Bem baixado não deprecia a partir do mês da baixa.
//  R6  Resultado da baixa = valor de venda − valor contábil residual.
//      Positivo é ganho de capital, negativo é perda — ambos registrados.
//  R7  Bem totalmente depreciado permanece ativo no cadastro com residual
//      igual ao valor residual estimado (nunca zera o registro).
//  R8  Transferência altera centro de custo e/ou localização e fica no
//      histórico auditável; nunca altera valores.
//  R9  Inventário compara físico × contábil por local: bem não conferido na
//      contagem vira divergência, e local diferente vira "a transferir".
//  R10 Nada é excluído em silêncio: toda alteração dispara evento para
//      atualizar as telas abertas.
// ============================================================================

export const PATRIMONIO_EVENT = "usecontabil:patrimonio-changed";

const KEY_BENS = "usecontabil.adm.patrimonio.bens.v1";
const KEY_MOVS = "usecontabil.adm.patrimonio.movs.v1";
const KEY_INVENTARIO = "usecontabil.adm.patrimonio.inventario.v1";

/* ================================ utils ================================== */

export const brl = (v: number) =>
  "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const pct = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export const dataBR = (iso: string) => {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
};

export const hojeISO = () => new Date().toISOString().slice(0, 10);

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const round = (v: number) => Math.round(v * 100) / 100;

/** meses inteiros entre duas competências AAAA-MM */
const mesesEntre = (de: string, ate: string) => {
  const [a1, m1] = de.split("-").map(Number);
  const [a2, m2] = ate.split("-").map(Number);
  return (a2 - a1) * 12 + (m2 - m1);
};

const compDe = (iso: string) => iso.slice(0, 7);

function ler<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      window.localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    const dados = JSON.parse(raw);
    return Array.isArray(dados) ? (dados as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function gravar<T>(key: string, dados: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(dados));
  window.dispatchEvent(new CustomEvent(PATRIMONIO_EVENT));
}

/* ================================ tipos ================================== */

export type GrupoBem =
  | "Máquinas e equipamentos"
  | "Veículos"
  | "Móveis e utensílios"
  | "Computadores e periféricos"
  | "Imóveis"
  | "Instalações"
  | "Ferramentas"
  | "Intangível";

export type MotivoBaixa = "Venda" | "Sucateamento" | "Doação" | "Perda / sinistro" | "Devolução";

export type Bem = {
  id: string;
  empresaId?: string;
  patrimonio: string;
  descricao: string;
  grupo: GrupoBem;
  contaContabil: string;
  centroCusto: string;
  localizacao: string;
  responsavel: string;
  fornecedor: string;
  notaFiscal: string;
  aquisicao: string;          // ISO
  inicioOperacao: string;     // ISO — base para R3
  valorAquisicao: number;
  benfeitorias: number;       // acréscimos capitalizados
  residualPercent: number;    // % do valor corrigido (R1)
  vidaUtilMeses: number;
  turnos: 1 | 2 | 3;          // R4
  deprecia: boolean;
  creditoCiap: boolean;       // ICMS do ativo imobilizado (48 parcelas)
  observacoes?: string;
  // baixa
  baixaData?: string;
  baixaMotivo?: MotivoBaixa;
  baixaValor?: number;
  baixaDocumento?: string;
};

export type TipoMovimento = "Aquisição" | "Transferência" | "Benfeitoria" | "Baixa" | "Reavaliação";

export type Movimento = {
  id: string;
  bemId: string;
  patrimonio: string;
  data: string;
  tipo: TipoMovimento;
  descricao: string;
  de?: string;
  para?: string;
  valor?: number;
  autor: string;
};

export type SituacaoContagem = "Localizado" | "Local divergente" | "Não localizado" | "Pendente";

export type Contagem = {
  id: string;
  bemId: string;
  competencia: string;
  data: string;
  localEncontrado: string;
  situacao: SituacaoContagem;
  responsavel: string;
  observacao?: string;
};

export type BemCalculado = Bem & {
  valorCorrigido: number;
  valorResidualEstimado: number;
  baseDepreciavel: number;
  coeficienteTurno: number;
  taxaAnual: number;
  quotaMensal: number;
  mesesDepreciados: number;
  depreciacaoAcumulada: number;
  depreciacaoCompetencia: number;
  valorContabil: number;
  percentDepreciado: number;
  mesesRestantes: number;
  fimVidaUtil: string;
  situacao: "Em operação" | "Totalmente depreciado" | "Baixado" | "Não depreciável" | "A iniciar";
  resultadoBaixa?: number;
};

/* =============================== semente ================================= */

const CENTROS = ["Industrial", "Logística", "Administrativo", "Comercial", "TI"];
const LOCAIS = ["Galpão 1", "Galpão 2", "Expedição", "Sala TI", "Escritório matriz", "Filial RS", "Pátio"];

type Semente = [string, string, GrupoBem, number, number, string, string, string, 1 | 2 | 3];

const SEMENTE: Semente[] = [
  ["PT-0142", "Torno CNC Romi GL 240", "Máquinas e equipamentos", 240_000, 120, "2025-03-12", "Industrial", "Galpão 2", 2],
  ["PT-0155", "Prensa hidráulica 60t", "Máquinas e equipamentos", 132_000, 120, "2025-04-28", "Industrial", "Galpão 1", 2],
  ["PT-0163", "Compressor parafuso 50HP", "Máquinas e equipamentos", 78_400, 120, "2025-06-10", "Industrial", "Galpão 1", 1],
  ["PT-0177", "Empilhadeira Hyster H2.5", "Máquinas e equipamentos", 106_000, 120, "2025-09-08", "Logística", "Expedição", 2],
  ["PT-0184", "Caminhão VW Delivery 9.170", "Veículos", 289_000, 48, "2025-10-02", "Logística", "Pátio", 1],
  ["PT-0188", "Fiat Fiorino 1.4", "Veículos", 118_500, 60, "2025-11-19", "Comercial", "Pátio", 1],
  ["PT-0195", "Sistema de exaustão industrial", "Instalações", 64_200, 120, "2025-12-05", "Industrial", "Galpão 2", 1],
  ["PT-0203", "Servidor Dell PowerEdge R650", "Computadores e periféricos", 48_500, 60, "2026-01-22", "TI", "Sala TI", 3],
  ["PT-0207", "Switch core Cisco C9300", "Computadores e periféricos", 27_900, 60, "2026-01-22", "TI", "Sala TI", 3],
  ["PT-0211", "Notebooks Dell Latitude (lote 8)", "Computadores e periféricos", 41_600, 60, "2026-02-14", "Administrativo", "Escritório matriz", 1],
  ["PT-0219", "Mobiliário escritório — estações", "Móveis e utensílios", 36_800, 120, "2026-02-27", "Administrativo", "Escritório matriz", 1],
  ["PT-0224", "Galpão anexo — obra civil", "Imóveis", 980_000, 300, "2026-03-16", "Industrial", "Galpão 2", 1],
  ["PT-0231", "Ferramental de corte", "Ferramentas", 22_300, 60, "2026-04-09", "Industrial", "Galpão 1", 2],
  ["PT-0238", "Licença ERP — módulo produção", "Intangível", 96_000, 60, "2026-05-04", "TI", "Sala TI", 1],
  ["PT-0244", "Ar-condicionado VRF (4 evaporadoras)", "Instalações", 58_700, 120, "2026-06-11", "Administrativo", "Filial RS", 1],
];

const CONTA: Record<GrupoBem, string> = {
  "Máquinas e equipamentos": "1.2.3.01.001",
  "Veículos": "1.2.3.01.004",
  "Móveis e utensílios": "1.2.3.01.002",
  "Computadores e periféricos": "1.2.3.01.003",
  "Imóveis": "1.2.3.01.005",
  "Instalações": "1.2.3.01.006",
  "Ferramentas": "1.2.3.01.007",
  "Intangível": "1.2.4.01.001",
};

const RESIDUAL: Record<GrupoBem, number> = {
  "Máquinas e equipamentos": 10,
  "Veículos": 20,
  "Móveis e utensílios": 10,
  "Computadores e periféricos": 5,
  "Imóveis": 20,
  "Instalações": 5,
  "Ferramentas": 0,
  "Intangível": 0,
};

const FORNECEDORES = [
  "Distribuidora Norte Ltda.", "TechCore Sistemas ME", "Metalúrgica Andrade S.A.",
  "Comércio Andes Eireli", "Transportes Litoral Ltda.",
];

function sementeBens(): Bem[] {
  return SEMENTE.map(([patrimonio, descricao, grupo, valor, vida, aquisicao, centro, local, turnos], i) => ({
    id: `bem-seed-${patrimonio}`,
    patrimonio,
    descricao,
    grupo,
    contaContabil: CONTA[grupo],
    centroCusto: centro,
    localizacao: local,
    responsavel: centro === "TI" ? "Coordenação de TI" : `Gestor ${centro}`,
    fornecedor: FORNECEDORES[i % FORNECEDORES.length],
    notaFiscal: String(48_200 + i * 137),
    aquisicao,
    inicioOperacao: aquisicao,
    valorAquisicao: valor,
    benfeitorias: i === 0 ? 18_000 : 0,
    residualPercent: RESIDUAL[grupo],
    vidaUtilMeses: vida,
    turnos,
    deprecia: true,
    creditoCiap: grupo === "Máquinas e equipamentos" || grupo === "Veículos",
    ...(patrimonio === "PT-0188"
      ? { baixaData: "2026-06-24", baixaMotivo: "Venda" as MotivoBaixa, baixaValor: 96_000, baixaDocumento: "NF-e 10 4471" }
      : {}),
  }));
}

function sementeMovimentos(bens: Bem[]): Movimento[] {
  const movs: Movimento[] = bens.map((b) => ({
    id: `mov-seed-aq-${b.patrimonio}`,
    bemId: b.id,
    patrimonio: b.patrimonio,
    data: b.aquisicao,
    tipo: "Aquisição",
    descricao: `Entrada por ${b.fornecedor} — NF ${b.notaFiscal}`,
    valor: b.valorAquisicao,
    autor: "Integração ERP",
  }));
  movs.push({
    id: "mov-seed-tr-1", bemId: "bem-seed-PT-0177", patrimonio: "PT-0177", data: "2026-04-18",
    tipo: "Transferência", descricao: "Realocação para atender a expedição", de: "Galpão 1", para: "Expedição",
    autor: "Administrativo",
  });
  movs.push({
    id: "mov-seed-be-1", bemId: "bem-seed-PT-0142", patrimonio: "PT-0142", data: "2026-05-09",
    tipo: "Benfeitoria", descricao: "Retrofit do painel de comando (capitalizado)", valor: 18_000,
    autor: "Engenharia",
  });
  const baixado = bens.find((b) => b.baixaData);
  if (baixado) {
    movs.push({
      id: "mov-seed-bx-1", bemId: baixado.id, patrimonio: baixado.patrimonio, data: baixado.baixaData!,
      tipo: "Baixa", descricao: `Venda — ${baixado.baixaDocumento}`, valor: baixado.baixaValor,
      autor: "Controladoria",
    });
  }
  return movs.sort((a, b) => b.data.localeCompare(a.data));
}

function sementeContagens(bens: Bem[]): Contagem[] {
  const alvo = bens.filter((b) => !b.baixaData).slice(0, 10);
  return alvo.map((b, i) => {
    const situacao: SituacaoContagem =
      i === 3 ? "Local divergente" : i === 7 ? "Não localizado" : i >= 8 ? "Pendente" : "Localizado";
    return {
      id: `cnt-seed-${b.patrimonio}`,
      bemId: b.id,
      competencia: "2026-07",
      data: situacao === "Pendente" ? "" : "2026-07-18",
      localEncontrado: situacao === "Local divergente" ? "Galpão 1" : situacao === "Pendente" ? "" : b.localizacao,
      situacao,
      responsavel: "Inventário interno",
      observacao: situacao === "Não localizado" ? "Bem não encontrado na contagem física do local cadastrado." : undefined,
    };
  });
}

/* ============================== leitura ================================== */

export function listarBens(): Bem[] {
  return ler(KEY_BENS, sementeBens());
}

export function listarMovimentos(): Movimento[] {
  return ler(KEY_MOVS, sementeMovimentos(listarBens())).sort((a, b) => b.data.localeCompare(a.data));
}

export function listarContagens(): Contagem[] {
  return ler(KEY_INVENTARIO, sementeContagens(listarBens()));
}

export const GRUPOS: GrupoBem[] = [
  "Máquinas e equipamentos", "Veículos", "Móveis e utensílios", "Computadores e periféricos",
  "Imóveis", "Instalações", "Ferramentas", "Intangível",
];
export const MOTIVOS_BAIXA: MotivoBaixa[] = ["Venda", "Sucateamento", "Doação", "Perda / sinistro", "Devolução"];
export const CENTROS_CUSTO = CENTROS;
export const LOCALIZACOES = LOCAIS;
export const CONTA_POR_GRUPO = CONTA;
export const RESIDUAL_SUGERIDO = RESIDUAL;

/* ============================== motor ==================================== */

const COEF_TURNO: Record<1 | 2 | 3, number> = { 1: 1, 2: 1.5, 3: 2 };

/** Calcula a posição do bem até a competência informada (AAAA-MM). */
export function calcularBem(b: Bem, competencia: string | string[]): BemCalculado {
  const compRef = Array.isArray(competencia) ? competencia[competencia.length - 1] : (competencia || "");
  const valorCorrigido = round(b.valorAquisicao + (b.benfeitorias || 0));
  const valorResidualEstimado = round(valorCorrigido * (b.residualPercent / 100));
  const baseDepreciavel = round(Math.max(valorCorrigido - valorResidualEstimado, 0));
  const coeficienteTurno = COEF_TURNO[b.turnos] ?? 1;
  const vidaEfetiva = Math.max(Math.round(b.vidaUtilMeses / coeficienteTurno), 1);
  const taxaAnual = round((12 / vidaEfetiva) * 100);
  const quotaBase = b.deprecia ? round(baseDepreciavel / vidaEfetiva) : 0;

  // R3 — começa no mês seguinte ao início de operação
  const compInicio = compDe(b.inicioOperacao || b.aquisicao);
  const acumuladaAte = (comp: string) => {
    if (!b.deprecia) return 0;
    const limite = b.baixaData ? menor(compDe(b.baixaData), comp) : comp;
    const meses = Math.max(Math.min(mesesEntre(compInicio, limite), vidaEfetiva), 0);
    return round(Math.min(quotaBase * meses, baseDepreciavel));
  };
  const compLimite = b.baixaData ? menor(compDe(b.baixaData), compRef) : compRef;
  const decorridos = mesesEntre(compInicio, compLimite); // 0 no mês da entrada
  const mesesDepreciados = b.deprecia ? Math.max(Math.min(decorridos, vidaEfetiva), 0) : 0;

  const depreciacaoAcumulada = acumuladaAte(compRef);
  const encerrado = mesesDepreciados >= vidaEfetiva;
  const quotaMensal = b.deprecia && !encerrado ? quotaBase : 0;
  const depreciacaoCompetencia = round(depreciacaoAcumulada - acumuladaAte(mesAnterior(compRef)));


  const valorContabil = round(valorCorrigido - depreciacaoAcumulada);
  const percentDepreciado = baseDepreciavel > 0 ? round((depreciacaoAcumulada / baseDepreciavel) * 100) : 0;
  const mesesRestantes = Math.max(vidaEfetiva - mesesDepreciados, 0);

  const situacao: BemCalculado["situacao"] = b.baixaData
    ? "Baixado"
    : !b.deprecia
      ? "Não depreciável"
      : decorridos <= 0
        ? "A iniciar"
        : encerrado
          ? "Totalmente depreciado"
          : "Em operação";

  return {
    ...b,
    valorCorrigido,
    valorResidualEstimado,
    baseDepreciavel,
    coeficienteTurno,
    taxaAnual,
    quotaMensal,
    mesesDepreciados,
    depreciacaoAcumulada,
    depreciacaoCompetencia: situacao === "Baixado" ? 0 : depreciacaoCompetencia,
    valorContabil,
    percentDepreciado,
    mesesRestantes,
    fimVidaUtil: addMesesISO(compInicio + "-01", vidaEfetiva),
    situacao,
    resultadoBaixa: b.baixaData ? round((b.baixaValor || 0) - valorContabil) : undefined,
  };
}

const menor = (a: string, b: string) => (a < b ? a : b);
const mesAnterior = (comp: string) => {
  const [a, m] = comp.split("-").map(Number);
  const d = new Date(a, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};


function addMesesISO(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00");
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

export function bensCalculados(competencia: string | string[]): BemCalculado[] {
  return listarBens()
    .map((b) => calcularBem(b, competencia))
    .sort((a, b) => a.patrimonio.localeCompare(b.patrimonio));
}

export type ResumoPatrimonio = {
  qtdAtivos: number;
  qtdBaixados: number;
  valorAquisicao: number;
  depreciacaoAcumulada: number;
  valorContabil: number;
  despesaCompetencia: number;
  totalmenteDepreciados: number;
  resultadoBaixasAno: number;
};

export function resumoPatrimonio(competencia: string | string[]): ResumoPatrimonio {
  const lista = bensCalculados(competencia);
  const compRef = Array.isArray(competencia) ? competencia[competencia.length - 1] : competencia;
  const ativos = lista.filter((b) => b.situacao !== "Baixado");
  const ano = compRef.slice(0, 4);
  return {
    qtdAtivos: ativos.length,
    qtdBaixados: lista.length - ativos.length,
    valorAquisicao: round(ativos.reduce((s, b) => s + b.valorCorrigido, 0)),
    depreciacaoAcumulada: round(ativos.reduce((s, b) => s + b.depreciacaoAcumulada, 0)),
    valorContabil: round(ativos.reduce((s, b) => s + b.valorContabil, 0)),
    despesaCompetencia: round(ativos.reduce((s, b) => s + b.depreciacaoCompetencia, 0)),
    totalmenteDepreciados: ativos.filter((b) => b.situacao === "Totalmente depreciado").length,
    resultadoBaixasAno: round(
      lista
        .filter((b) => b.baixaData?.startsWith(ano))
        .reduce((s, b) => s + (b.resultadoBaixa || 0), 0),
    ),
  };
}

export function porGrupo(competencia: string) {
  const mapa = new Map<string, { grupo: string; aquisicao: number; contabil: number; depreciacao: number; qtd: number }>();
  for (const b of bensCalculados(competencia)) {
    if (b.situacao === "Baixado") continue;
    const atual = mapa.get(b.grupo) || { grupo: b.grupo, aquisicao: 0, contabil: 0, depreciacao: 0, qtd: 0 };
    atual.aquisicao = round(atual.aquisicao + b.valorCorrigido);
    atual.contabil = round(atual.contabil + b.valorContabil);
    atual.depreciacao = round(atual.depreciacao + b.depreciacaoCompetencia);
    atual.qtd += 1;
    mapa.set(b.grupo, atual);
  }
  return [...mapa.values()].sort((a, b) => b.aquisicao - a.aquisicao);
}

export function porCentroCusto(competencia: string) {
  const mapa = new Map<string, { centro: string; contabil: number; depreciacao: number; qtd: number }>();
  for (const b of bensCalculados(competencia)) {
    if (b.situacao === "Baixado") continue;
    const c = b.centroCusto || "Não informado";
    const atual = mapa.get(c) || { centro: c, contabil: 0, depreciacao: 0, qtd: 0 };
    atual.contabil = round(atual.contabil + b.valorContabil);
    atual.depreciacao = round(atual.depreciacao + b.depreciacaoCompetencia);
    atual.qtd += 1;
    mapa.set(c, atual);
  }
  return [...mapa.values()].sort((a, b) => b.depreciacao - a.depreciacao);
}

/** Projeção da despesa de depreciação nos próximos 12 meses. */
export function projecaoDepreciacao(competencia: string) {
  const meses: { mes: string; despesa: number }[] = [];
  const [ano, mes] = competencia.split("-").map(Number);
  for (let i = 0; i < 12; i++) {
    const d = new Date(ano, mes - 1 + i, 1);
    const comp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const despesa = round(
      listarBens().reduce((s, b) => s + calcularBem(b, comp).depreciacaoCompetencia, 0),
    );
    meses.push({ mes: comp.slice(5) + "/" + comp.slice(2, 4), despesa });
  }
  return meses;
}

/** Razão auxiliar do bem: memória de cálculo mês a mês. */
export function memoriaCalculo(b: BemCalculado, ateCompetencia: string) {
  const linhas: { competencia: string; quota: number; acumulada: number; contabil: number }[] = [];
  const compInicio = compDe(b.inicioOperacao || b.aquisicao);
  const total = Math.min(mesesEntre(compInicio, ateCompetencia), b.mesesDepreciados);
  let acumulada = 0;
  for (let i = 1; i <= Math.max(total, 0); i++) {
    const quota = Math.min(b.quotaMensal || b.baseDepreciavel / Math.max(b.mesesDepreciados, 1), b.baseDepreciavel - acumulada);
    acumulada = round(acumulada + quota);
    const d = new Date(compInicio + "-01T00:00:00");
    d.setMonth(d.getMonth() + i);
    linhas.push({
      competencia: `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`,
      quota: round(quota),
      acumulada,
      contabil: round(b.valorCorrigido - acumulada),
    });
  }
  return linhas.slice(-24).reverse();
}

/* ============================== escrita ================================== */

export function salvarBem(entrada: Partial<Bem> & { patrimonio: string; descricao: string }): Bem {
  const bens = listarBens();
  if (!entrada.patrimonio.trim()) throw new Error("Informe o número de patrimônio.");
  if (!entrada.descricao.trim()) throw new Error("Informe a descrição do bem.");
  const duplicado = bens.some(
    (b) => b.patrimonio.toLowerCase() === entrada.patrimonio.trim().toLowerCase() && b.id !== entrada.id,
  );
  if (duplicado) throw new Error("Já existe um bem com este número de patrimônio.");
  if (!entrada.valorAquisicao || entrada.valorAquisicao <= 0) throw new Error("Informe o valor de aquisição.");
  if (!entrada.vidaUtilMeses || entrada.vidaUtilMeses <= 0) throw new Error("Informe a vida útil em meses.");

  const grupo = (entrada.grupo || "Máquinas e equipamentos") as GrupoBem;
  const existente = bens.find((b) => b.id === entrada.id);
  const bem: Bem = {
    id: existente?.id || uid("bem"),
    empresaId: entrada.empresaId ?? existente?.empresaId,
    patrimonio: entrada.patrimonio.trim(),
    descricao: entrada.descricao.trim(),
    grupo,
    contaContabil: entrada.contaContabil || CONTA[grupo],
    centroCusto: entrada.centroCusto || "",
    localizacao: entrada.localizacao || "",
    responsavel: entrada.responsavel || "",
    fornecedor: entrada.fornecedor || "",
    notaFiscal: entrada.notaFiscal || "",
    aquisicao: entrada.aquisicao || hojeISO(),
    inicioOperacao: entrada.inicioOperacao || entrada.aquisicao || hojeISO(),
    valorAquisicao: round(entrada.valorAquisicao),
    benfeitorias: round(entrada.benfeitorias || existente?.benfeitorias || 0),
    residualPercent: entrada.residualPercent ?? RESIDUAL[grupo],
    vidaUtilMeses: entrada.vidaUtilMeses,
    turnos: (entrada.turnos || 1) as 1 | 2 | 3,
    deprecia: entrada.deprecia ?? true,
    creditoCiap: entrada.creditoCiap ?? false,
    observacoes: entrada.observacoes,
    baixaData: existente?.baixaData,
    baixaMotivo: existente?.baixaMotivo,
    baixaValor: existente?.baixaValor,
    baixaDocumento: existente?.baixaDocumento,
  };

  const novos = existente ? bens.map((b) => (b.id === bem.id ? bem : b)) : [...bens, bem];
  gravar(KEY_BENS, novos);
  if (!existente) {
    registrarMovimento({
      bemId: bem.id, patrimonio: bem.patrimonio, data: bem.aquisicao, tipo: "Aquisição",
      descricao: `Entrada${bem.fornecedor ? ` por ${bem.fornecedor}` : ""}${bem.notaFiscal ? ` — NF ${bem.notaFiscal}` : ""}`,
      valor: bem.valorAquisicao, autor: "Administrativo",
    });
  }
  return bem;
}

export function excluirBem(id: string) {
  gravar(KEY_BENS, listarBens().filter((b) => b.id !== id));
  gravar(KEY_MOVS, listarMovimentos().filter((m) => m.bemId !== id));
  gravar(KEY_INVENTARIO, listarContagens().filter((c) => c.bemId !== id));
}

export function registrarMovimento(m: Omit<Movimento, "id">) {
  gravar(KEY_MOVS, [{ ...m, id: uid("mov") }, ...listarMovimentos()]);
}

/** R8 — transferência de centro de custo e/ou localização. */
export function transferirBem(
  id: string,
  destino: { centroCusto?: string; localizacao?: string; responsavel?: string; data: string; motivo: string; autor?: string },
) {
  const bens = listarBens();
  const bem = bens.find((b) => b.id === id);
  if (!bem) throw new Error("Bem não encontrado.");
  if (bem.baixaData) throw new Error("Bem baixado não pode ser transferido.");
  const de = `${bem.centroCusto} · ${bem.localizacao}`;
  const atualizado: Bem = {
    ...bem,
    centroCusto: destino.centroCusto || bem.centroCusto,
    localizacao: destino.localizacao || bem.localizacao,
    responsavel: destino.responsavel || bem.responsavel,
  };
  gravar(KEY_BENS, bens.map((b) => (b.id === id ? atualizado : b)));
  registrarMovimento({
    bemId: id, patrimonio: bem.patrimonio, data: destino.data || hojeISO(), tipo: "Transferência",
    descricao: destino.motivo || "Transferência interna",
    de, para: `${atualizado.centroCusto} · ${atualizado.localizacao}`,
    autor: destino.autor || "Administrativo",
  });
  return atualizado;
}

/** Benfeitoria capitalizada — soma ao valor do bem (R1). */
export function registrarBenfeitoria(id: string, valor: number, descricao: string, data: string) {
  const bens = listarBens();
  const bem = bens.find((b) => b.id === id);
  if (!bem) throw new Error("Bem não encontrado.");
  if (valor <= 0) throw new Error("Informe o valor capitalizado.");
  const atualizado = { ...bem, benfeitorias: round((bem.benfeitorias || 0) + valor) };
  gravar(KEY_BENS, bens.map((b) => (b.id === id ? atualizado : b)));
  registrarMovimento({
    bemId: id, patrimonio: bem.patrimonio, data: data || hojeISO(), tipo: "Benfeitoria",
    descricao: descricao || "Benfeitoria capitalizada", valor: round(valor), autor: "Administrativo",
  });
}

/** R5/R6 — baixa do bem com apuração de ganho ou perda de capital. */
export function baixarBem(
  id: string,
  dados: { data: string; motivo: MotivoBaixa; valor: number; documento?: string },
  competencia: string,
) {
  const bens = listarBens();
  const bem = bens.find((b) => b.id === id);
  if (!bem) throw new Error("Bem não encontrado.");
  if (bem.baixaData) throw new Error("Este bem já está baixado.");
  if (!dados.data) throw new Error("Informe a data da baixa.");
  if (dados.data < bem.aquisicao) throw new Error("A baixa não pode ser anterior à aquisição.");

  const calculado = calcularBem(bem, competencia);
  const atualizado: Bem = {
    ...bem,
    baixaData: dados.data,
    baixaMotivo: dados.motivo,
    baixaValor: round(dados.valor || 0),
    baixaDocumento: dados.documento,
  };
  gravar(KEY_BENS, bens.map((b) => (b.id === id ? atualizado : b)));
  const resultado = round((dados.valor || 0) - calculado.valorContabil);
  registrarMovimento({
    bemId: id, patrimonio: bem.patrimonio, data: dados.data, tipo: "Baixa",
    descricao: `${dados.motivo}${dados.documento ? ` — ${dados.documento}` : ""} · resultado ${brl(resultado)}`,
    valor: round(dados.valor || 0), autor: "Controladoria",
  });
  return resultado;
}

export function estornarBaixa(id: string) {
  const bens = listarBens();
  const bem = bens.find((b) => b.id === id);
  if (!bem) throw new Error("Bem não encontrado.");
  const atualizado: Bem = { ...bem, baixaData: undefined, baixaMotivo: undefined, baixaValor: undefined, baixaDocumento: undefined };
  gravar(KEY_BENS, bens.map((b) => (b.id === id ? atualizado : b)));
  registrarMovimento({
    bemId: id, patrimonio: bem.patrimonio, data: hojeISO(), tipo: "Reavaliação",
    descricao: "Estorno da baixa — bem retornou ao imobilizado", autor: "Controladoria",
  });
}

export function excluirMovimento(id: string) {
  gravar(KEY_MOVS, listarMovimentos().filter((m) => m.id !== id));
}

/* ============================= inventário ================================ */

export type LinhaInventario = BemCalculado & {
  contagem?: Contagem;
  situacaoInventario: SituacaoContagem;
};

/** R9 — confronto físico × contábil da competência. */
export function inventarioCompetencia(competencia: string): LinhaInventario[] {
  const contagens = listarContagens().filter((c) => c.competencia === competencia);
  return bensCalculados(competencia)
    .filter((b) => b.situacao !== "Baixado")
    .map((b) => {
      const contagem = contagens.find((c) => c.bemId === b.id);
      const situacaoInventario: SituacaoContagem = !contagem
        ? "Pendente"
        : contagem.situacao === "Localizado" && contagem.localEncontrado && contagem.localEncontrado !== b.localizacao
          ? "Local divergente"
          : contagem.situacao;
      return { ...b, contagem, situacaoInventario };
    });
}

export function resumoInventario(competencia: string) {
  const linhas = inventarioCompetencia(competencia);
  const conta = (s: SituacaoContagem) => linhas.filter((l) => l.situacaoInventario === s).length;
  const conferidos = conta("Localizado");
  return {
    total: linhas.length,
    conferidos,
    divergentes: conta("Local divergente"),
    naoLocalizados: conta("Não localizado"),
    pendentes: conta("Pendente"),
    percentual: linhas.length ? round((conferidos / linhas.length) * 100) : 0,
    valorNaoLocalizado: round(
      linhas.filter((l) => l.situacaoInventario === "Não localizado").reduce((s, l) => s + l.valorContabil, 0),
    ),
  };
}

export function registrarContagem(dados: {
  bemId: string;
  competencia: string;
  situacao: SituacaoContagem;
  localEncontrado: string;
  responsavel: string;
  observacao?: string;
}) {
  const contagens = listarContagens();
  const existente = contagens.find((c) => c.bemId === dados.bemId && c.competencia === dados.competencia);
  const registro: Contagem = {
    id: existente?.id || uid("cnt"),
    bemId: dados.bemId,
    competencia: dados.competencia,
    data: hojeISO(),
    localEncontrado: dados.localEncontrado,
    situacao: dados.situacao,
    responsavel: dados.responsavel || "Inventário interno",
    observacao: dados.observacao,
  };
  gravar(
    KEY_INVENTARIO,
    existente ? contagens.map((c) => (c.id === registro.id ? registro : c)) : [...contagens, registro],
  );
}

/** Regulariza a localização do bem conforme a contagem física. */
export function acatarLocalContagem(bemId: string, competencia: string) {
  const contagem = listarContagens().find((c) => c.bemId === bemId && c.competencia === competencia);
  if (!contagem || !contagem.localEncontrado) throw new Error("Não há local físico registrado para este bem.");
  transferirBem(bemId, {
    localizacao: contagem.localEncontrado,
    data: hojeISO(),
    motivo: `Regularização por inventário ${competencia}`,
    autor: "Inventário interno",
  });
}
