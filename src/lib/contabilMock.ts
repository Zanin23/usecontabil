// Mock data para o Use Contábil — protótipo visual sem integração real.

export const EMPRESAS = [
  { id: "e1", cnpj: "12.345.678/0001-90", razao: "Metalúrgica Andrade S.A.", regime: "LUCRO_REAL" },
  { id: "e2", cnpj: "45.678.901/0001-22", razao: "Panificadora Real Ltda.", regime: "SIMPLES_NACIONAL" },
  { id: "e3", cnpj: "98.765.432/0001-10", razao: "TechCore Sistemas ME", regime: "LUCRO_PRESUMIDO" },
  { id: "e4", cnpj: "22.333.444/0001-55", razao: "Transportes Litoral Ltda.", regime: "LUCRO_PRESUMIDO" },
];

export const COMPETENCIAS = ["2026-04", "2026-05", "2026-07", "2026-06"];

export const KPIS = [
  { label: "Fechamento contábil", value: "Jul/2026", trend: "Em aberto", tone: "warn" as const },
  { label: "Pendências eSocial", value: "12", trend: "+3 hoje", tone: "danger" as const },
  { label: "Impostos a vencer (7d)", value: "R$ 284.912,55", trend: "5 guias", tone: "warn" as const },
  { label: "Faturamento acumulado", value: "R$ 4.812.309,00", trend: "+8,4% MoM", tone: "success" as const },
];

export const STATUS_FECHAMENTO = [
  { modulo: "Pessoal (Folha)", competencia: "07/2026", responsavel: "Marina Costa", status: "CONCLUIDO", atualizado: "há 2h" },
  { modulo: "Fiscal (Entradas)", competencia: "07/2026", responsavel: "Rafael Prado", status: "EM_ANDAMENTO", atualizado: "há 30min" },
  { modulo: "Fiscal (Saídas)", competencia: "07/2026", responsavel: "Rafael Prado", status: "EM_ANDAMENTO", atualizado: "há 30min" },
  { modulo: "Contábil (Diário)", competencia: "07/2026", responsavel: "Juliana Reis", status: "PENDENTE", atualizado: "ontem" },
  { modulo: "Tributos (Apuração)", competencia: "07/2026", responsavel: "Juliana Reis", status: "PENDENTE", atualizado: "—" },
  { modulo: "eSocial (Periódicos)", competencia: "07/2026", responsavel: "Marina Costa", status: "ATRASADO", atualizado: "há 3 dias" },
];

export const ALERTAS = [
  { tipo: "erro", titulo: "Rejeição S-1200", detalhe: "Colaborador Pedro Almeida — CPF divergente na base CAGED", tempo: "há 12min" },
  { tipo: "info", titulo: "Sincronização ERP", detalhe: "1.204 notas de entrada importadas do TOTVS Protheus", tempo: "há 1h" },
  { tipo: "aviso", titulo: "DCTFWeb vence 15/11", detalhe: "Guia consolidada de R$ 62.410,22 pendente de transmissão", tempo: "há 2h" },
  { tipo: "erro", titulo: "Divergência conciliação", detalhe: "Extrato Itaú Ag. 0325 — R$ 1.240,00 sem contrapartida", tempo: "há 4h" },
  { tipo: "info", titulo: "Backup fiscal concluído", detalhe: "XMLs de outubro arquivados no cofre digital", tempo: "há 6h" },
];

export type Lancamento = {
  id: string;
  data: string;
  debito: string;
  debitoNome: string;
  credito: string;
  creditoNome: string;
  historico: string;
  valor: number;
  centro: string;
  origem: "MANUAL" | "ERP" | "OFX";
};

export const LANCAMENTOS: Lancamento[] = [
  { id: "L-24081", data: "2026-07-31", debito: "1.1.02.001", debitoNome: "Bco Itaú c/c 0325-2", credito: "3.1.01.001", creditoNome: "Receita de vendas mercado interno", historico: "Faturamento NF 44821 — Cliente Delta", valor: 128_450.00, centro: "Comercial-SP", origem: "ERP" },
  { id: "L-24082", data: "2026-07-31", debito: "4.1.02.005", debitoNome: "Salários e ordenados", credito: "2.1.03.001", creditoNome: "Salários a pagar", historico: "Folha competência 07/2026 — 128 colab.", valor: 612_308.75, centro: "Administrativo", origem: "MANUAL" },
  { id: "L-24083", data: "2026-07-30", debito: "1.1.03.002", debitoNome: "Duplicatas a receber", credito: "3.1.01.001", creditoNome: "Receita de vendas mercado interno", historico: "NF 44819 — Cliente Vento Sul", valor: 34_290.00, centro: "Comercial-RS", origem: "ERP" },
  { id: "L-24084", data: "2026-07-30", debito: "4.1.03.011", debitoNome: "Energia elétrica", credito: "1.1.02.001", creditoNome: "Bco Itaú c/c 0325-2", historico: "CEMIG matriz — competência 05/2026", valor: 18_770.42, centro: "Industrial", origem: "OFX" },
  { id: "L-24085", data: "2026-07-30", debito: "1.1.02.001", debitoNome: "Bco Itaú c/c 0325-2", credito: "1.1.03.002", creditoNome: "Duplicatas a receber", historico: "Recebimento boleto NF 44780", valor: 9_420.00, centro: "Financeiro", origem: "OFX" },
  { id: "L-24086", data: "2026-07-29", debito: "4.1.02.008", debitoNome: "INSS sobre folha", credito: "2.1.03.014", creditoNome: "INSS a recolher", historico: "INSS patronal 20% + RAT — 07/2026", valor: 147_154.10, centro: "Administrativo", origem: "MANUAL" },
  { id: "L-24087", data: "2026-07-29", debito: "1.1.05.002", debitoNome: "Estoque produtos acabados", credito: "3.2.01.001", creditoNome: "Custo de produção", historico: "Baixa OP 8823 — Produto SKU-4412", valor: 82_016.00, centro: "Industrial", origem: "ERP" },
  { id: "L-24088", data: "2026-07-28", debito: "4.1.05.001", debitoNome: "Despesas com viagens", credito: "1.1.02.001", creditoNome: "Bco Itaú c/c 0325-2", historico: "Reembolso vendedor R. Prado — SP-CWB", valor: 2_180.55, centro: "Comercial-SP", origem: "MANUAL" },
  { id: "L-24089", data: "2026-07-28", debito: "1.2.03.001", debitoNome: "Máquinas e equipamentos", credito: "2.1.02.004", creditoNome: "Fornecedores nacionais", historico: "NF 118820 — Prensa hidráulica PH-40", valor: 214_500.00, centro: "Industrial", origem: "ERP" },
  { id: "L-24090", data: "2026-07-27", debito: "4.1.03.007", debitoNome: "Aluguéis e condomínios", credito: "1.1.02.001", creditoNome: "Bco Itaú c/c 0325-2", historico: "Aluguel matriz — competência 07/2026", valor: 42_000.00, centro: "Administrativo", origem: "OFX" },
];

export type Colaborador = {
  id: string;
  matricula: string;
  nome: string;
  cargo: string;
  salario: number;
  proventos: number;
  descontos: number;
  liquido: number;
  status: "CALCULADO" | "PENDENTE" | "ERRO";
};

export const COLABORADORES: Colaborador[] = [
  { id: "c1", matricula: "0012", nome: "Aline Bezerra", cargo: "Analista Contábil Pleno", salario: 6800, proventos: 7420.5, descontos: 1682.11, liquido: 5738.39, status: "CALCULADO" },
  { id: "c2", matricula: "0027", nome: "Bruno Tavares", cargo: "Operador de CNC", salario: 3450, proventos: 4290.0, descontos: 812.34, liquido: 3477.66, status: "CALCULADO" },
  { id: "c3", matricula: "0031", nome: "Carla Mendes", cargo: "Coordenadora Fiscal", salario: 9200, proventos: 9840.0, descontos: 2611.08, liquido: 7228.92, status: "CALCULADO" },
  { id: "c4", matricula: "0042", nome: "Diego Ramos", cargo: "Auxiliar Administrativo", salario: 2280, proventos: 2410.0, descontos: 260.45, liquido: 2149.55, status: "CALCULADO" },
  { id: "c5", matricula: "0058", nome: "Elisa Nogueira", cargo: "Controller", salario: 14500, proventos: 15870.0, descontos: 4622.19, liquido: 11247.81, status: "CALCULADO" },
  { id: "c6", matricula: "0063", nome: "Fábio Prado", cargo: "Vendedor Externo", salario: 3100, proventos: 5820.0, descontos: 998.42, liquido: 4821.58, status: "PENDENTE" },
  { id: "c7", matricula: "0071", nome: "Gabriela Reis", cargo: "Assistente de DP", salario: 3600, proventos: 3720.0, descontos: 452.10, liquido: 3267.90, status: "CALCULADO" },
  { id: "c8", matricula: "0088", nome: "Henrique Vilela", cargo: "Gerente Industrial", salario: 12000, proventos: 13210.0, descontos: 3812.44, liquido: 9397.56, status: "CALCULADO" },
  { id: "c9", matricula: "0094", nome: "Isabela Costa", cargo: "Analista de Custos", salario: 5800, proventos: 6120.0, descontos: 1220.66, liquido: 4899.34, status: "ERRO" },
  { id: "c10", matricula: "0102", nome: "João Peixoto", cargo: "Almoxarife", salario: 2600, proventos: 2720.0, descontos: 298.14, liquido: 2421.86, status: "CALCULADO" },
  { id: "c11", matricula: "0117", nome: "Karina Duarte", cargo: "Analista de RH", salario: 5100, proventos: 5310.0, descontos: 1010.22, liquido: 4299.78, status: "CALCULADO" },
  { id: "c12", matricula: "0129", nome: "Leandro Guimarães", cargo: "Motorista", salario: 2900, proventos: 3510.0, descontos: 402.19, liquido: 3107.81, status: "CALCULADO" },
];

export type EventoESocial = {
  id: string;
  tipo: string;
  descricao: string;
  colaborador?: string;
  competencia: string;
  status: "PENDENTE" | "PROCESSANDO" | "ENVIADO" | "ACEITO" | "REJEITADO";
  recibo?: string;
  erro?: string;
};

export const EVENTOS_ESOCIAL: EventoESocial[] = [
  { id: "ev1", tipo: "S-1200", descricao: "Remuneração de trabalhador", colaborador: "Aline Bezerra", competencia: "07/2026", status: "ACEITO", recibo: "1.2.202607.00048291" },
  { id: "ev2", tipo: "S-1200", descricao: "Remuneração de trabalhador", colaborador: "Bruno Tavares", competencia: "07/2026", status: "ACEITO", recibo: "1.2.202607.00048292" },
  { id: "ev3", tipo: "S-1200", descricao: "Remuneração de trabalhador", colaborador: "Pedro Almeida", competencia: "07/2026", status: "REJEITADO", erro: "CPF divergente da base RET (Registro de Eventos Trabalhistas)" },
  { id: "ev4", tipo: "S-1210", descricao: "Pagamentos de rendimentos do trabalho", competencia: "07/2026", status: "PROCESSANDO" },
  { id: "ev5", tipo: "S-2200", descricao: "Admissão — Novo colaborador", colaborador: "Luana Freitas", competencia: "07/2026", status: "ENVIADO" },
  { id: "ev6", tipo: "S-1299", descricao: "Fechamento dos eventos periódicos", competencia: "07/2026", status: "PENDENTE" },
  { id: "ev7", tipo: "S-1000", descricao: "Informações do empregador", competencia: "—", status: "ACEITO", recibo: "1.2.202601.00000021" },
  { id: "ev8", tipo: "S-2299", descricao: "Desligamento — Colaborador demitido", colaborador: "Marco Ribeiro", competencia: "07/2026", status: "ACEITO", recibo: "1.2.202607.00047102" },
];

export const DRE = [
  { conta: "3.0.00.000", nome: "RECEITA OPERACIONAL BRUTA", valor: 4_812_309.00, nivel: 1 },
  { conta: "3.1.00.000", nome: "Receita de vendas de mercadorias", valor: 3_910_842.00, nivel: 2 },
  { conta: "3.2.00.000", nome: "Receita de prestação de serviços", valor: 901_467.00, nivel: 2 },
  { conta: "3.9.00.000", nome: "(-) DEDUÇÕES DA RECEITA BRUTA", valor: -882_144.65, nivel: 1 },
  { conta: "3.9.01.000", nome: "ICMS sobre vendas", valor: -498_720.10, nivel: 2 },
  { conta: "3.9.02.000", nome: "PIS/COFINS sobre vendas", valor: -302_144.55, nivel: 2 },
  { conta: "3.9.03.000", nome: "ISS sobre serviços", valor: -81_280.00, nivel: 2 },
  { conta: "3.9.99.000", nome: "= RECEITA OPERACIONAL LÍQUIDA", valor: 3_930_164.35, nivel: 1, total: true },
  { conta: "4.0.00.000", nome: "(-) CUSTO DAS MERCADORIAS/SERVIÇOS", valor: -2_128_490.22, nivel: 1 },
  { conta: "4.9.99.000", nome: "= LUCRO BRUTO", valor: 1_801_674.13, nivel: 1, total: true },
  { conta: "5.0.00.000", nome: "(-) DESPESAS OPERACIONAIS", valor: -1_204_312.88, nivel: 1 },
  { conta: "5.1.00.000", nome: "Despesas comerciais", valor: -428_190.44, nivel: 2 },
  { conta: "5.2.00.000", nome: "Despesas administrativas", valor: -612_308.75, nivel: 2 },
  { conta: "5.3.00.000", nome: "Despesas gerais", valor: -163_813.69, nivel: 2 },
  { conta: "6.0.00.000", nome: "= RESULTADO OPERACIONAL", valor: 597_361.25, nivel: 1, total: true },
  { conta: "7.0.00.000", nome: "(-) IRPJ / CSLL", valor: -203_102.83, nivel: 1 },
  { conta: "9.9.99.999", nome: "= LUCRO LÍQUIDO DO EXERCÍCIO", valor: 394_258.42, nivel: 1, total: true },
];

export const CONECTORES_ERP = [
  { id: "erp1", nome: "TOTVS Protheus", ambiente: "Produção", ultimaSync: "há 12min", status: "OK", registros: 4218 },
  { id: "erp2", nome: "SAP Business One", ambiente: "Homologação", ultimaSync: "há 3h", status: "OK", registros: 812 },
  { id: "erp3", nome: "Bling ERP", ambiente: "Produção", ultimaSync: "há 2 dias", status: "ATENCAO", registros: 128 },
  { id: "erp4", nome: "Omie", ambiente: "Produção", ultimaSync: "falhou", status: "ERRO", registros: 0 },
];

export const MAPEAMENTO_CONTAS = [
  { erpCampo: "CTA_RECEITA_MI", erpDesc: "Receita mercado interno", contaDestino: "3.1.01.001", contaNome: "Receita de vendas mercado interno" },
  { erpCampo: "CTA_RECEITA_ME", erpDesc: "Receita mercado externo", contaDestino: "3.1.02.001", contaNome: "Receita de vendas exportação" },
  { erpCampo: "CTA_CMV_PROD", erpDesc: "CMV produção", contaDestino: "4.1.01.001", contaNome: "Custo dos produtos vendidos" },
  { erpCampo: "CTA_FRETE_SAIDA", erpDesc: "Frete sobre vendas", contaDestino: "5.1.02.003", contaNome: "Fretes e carretos sobre vendas" },
  { erpCampo: "CTA_COMISSAO", erpDesc: "Comissões de vendedores", contaDestino: "5.1.01.004", contaNome: "Comissões sobre vendas" },
  { erpCampo: "CTA_ICMS_REC", erpDesc: "ICMS a recuperar", contaDestino: "1.1.06.002", contaNome: "ICMS a recuperar" },
  { erpCampo: "CTA_PIS_REC", erpDesc: "PIS a recuperar", contaDestino: "1.1.06.003", contaNome: "PIS a recuperar" },
  { erpCampo: "CTA_COFINS_REC", erpDesc: "COFINS a recuperar", contaDestino: "1.1.06.004", contaNome: "COFINS a recuperar" },
];

export function brl(v: number) {
  const sign = v < 0 ? "-" : "";
  return sign + "R$ " + Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
