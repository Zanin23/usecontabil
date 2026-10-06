/**
 * Gerador de dados de treinamento para o Modo Prática.
 * Popula os stores tributário, fiscal, financeiro e outros com dados fictícios
 * para que o dashboard e relatórios mostrem informações coerentes.
 */
import { saveEmpresa, novoId, registrarAuditoria, empresaDB, TRIBUTARIO_EVENT } from "@/lib/tributarioStore";
import { saveDocs, novoDocId, moedaBR, chaveFicticia, FISCAL_EVENT, type DocFiscal } from "@/lib/fiscalStore";
import type { DocTipo, DocumentoFiscal, GrupoMovimento, Tributos } from "@/lib/tributarioStore";
import {
  registrarBaixa, titulos as getTitulosBase, write as writeContas, KEY_BAIXAS_BASE,
  lancarMovimento, CONTAS_EVENT, loadMovimentos, type Baixa, type MovimentoCaixa,
} from "@/lib/contasCaixaStore";
import { PRODUTOS_TREINAMENTO, PARCEIROS_TREINAMENTO } from "./seedPratica";

/** Linha da memória de cálculo dos documentos de treino. */
type MemoriaTreino = { tributo: string; valor: number; base: number; aliquota?: number; descricao?: string };

/**
 * Documento de treino: o mesmo objeto alimenta o store operacional (que guarda
 * tudo como texto) e o tributário (que guarda números). Os conversores abaixo
 * fazem cada uma das projeções sem espalhar `as any` pelo arquivo.
 */
type DocTreino = {
  id: string;
  empresaId: string;
  competencia: string;
  grupo: string;
  tipo: string;
  numero: string;
  serie: string;
  emissao: string;
  participante: string;
  participanteDoc: string;
  valorTotal: number;
  valorProdutos?: number;
  valor: string;
  baseIcms: string;
  icms: string;
  status: string;
  chave: string;
  cfop: string;
  tributos: Record<string, number>;
  memoria: MemoriaTreino[];
};

const TRIBUTOS_ZERO: Tributos = {
  icms: 0, icmsSt: 0, difal: 0, fcp: 0, ipi: 0, pis: 0, cofins: 0, iss: 0,
  irrf: 0, inss: 0, csll: 0, retencoes: 0, total: 0,
};

/** Projeção para o store operacional: todo valor vira texto. */
function paraDocFiscal(d: DocTreino): DocFiscal {
  return {
    id: d.id, empresaId: d.empresaId, competencia: d.competencia,
    grupo: d.grupo, tipo: d.tipo, numero: d.numero, serie: d.serie,
    emissao: d.emissao, participante: d.participante, participanteDoc: d.participanteDoc,
    valor: d.valor, baseIcms: d.baseIcms, icms: d.icms, status: d.status,
    chave: d.chave, cfop: d.cfop, valorTotal: String(d.valorTotal),
    tributos: JSON.stringify(d.tributos), memoria: JSON.stringify(d.memoria),
  };
}

/** Projeção para o store tributário: completa os campos que o motor exige. */
function paraDocumentoTributario(d: DocTreino): DocumentoFiscal {
  return {
    id: d.id, empresaId: d.empresaId, competencia: d.competencia,
    grupo: d.grupo as GrupoMovimento, tipo: d.tipo as DocTipo,
    numero: d.numero, serie: d.serie, emissao: d.emissao,
    participante: d.participante, participanteDoc: d.participanteDoc,
    ufOrigem: "SP", ufDestino: "SP",
    contribuinte: true, consumidorFinal: false, regime: "Lucro Presumido",
    itens: [{
      id: `${d.id}-item-1`, descricao: d.tipo, tipo: "produto",
      quantidade: 1, unitario: d.valorTotal, cfop: d.cfop,
    }],
    valorProdutos: d.valorProdutos ?? d.valorTotal,
    valorTotal: d.valorTotal,
    status: "Autorizado",
    chave: d.chave,
    tributos: { ...TRIBUTOS_ZERO, ...d.tributos },
    memoria: d.memoria.map((m) => ({ descricao: `${m.tributo} da competência`, ...m })),
    regrasAplicadas: [], alertas: [], eventos: [],
  };
}

export async function popularDadosPratica(empresaId: string, competencia: string, forcePratica = false) {
  if (!empresaId) return;

  const [ano, mes] = competencia.split("-").map(Number);
  
  // 0. Determinar sufixo e ativar modo prática se forçado
  const sufixo = forcePratica ? ".pratica" : (typeof window !== "undefined" && localStorage.getItem("uc:pratica:ativo") === "1" ? ".pratica" : "");
  
  if (forcePratica && typeof window !== "undefined") {
    localStorage.setItem("uc:pratica:ativo", "1");
    // Ensure the global flag in praticaStore is updated
    window.dispatchEvent(new CustomEvent("usecontabil:pratica-changed"));
  }
  
  // 1. Cadastros Analíticos (Tributário Store)
  const produtos = PRODUTOS_TREINAMENTO.map(p => ({ ...p, id: novoId("p") }));
  const parceiros = PARCEIROS_TREINAMENTO.map(p => ({ ...p, id: novoId("parc") }));
  
  // Local storage direto para garantir isolamento se for forçado
  if (sufixo === ".pratica") {
    const KEY_TRIB = "usecontabil.tributario.v1" + sufixo;
    const dbTrib = JSON.parse(localStorage.getItem(KEY_TRIB) || "{}");
    dbTrib[empresaId] = {
      ...(dbTrib[empresaId] || { produtos: [], parceiros: [], documentos: [], regras: [], auditoria: [], fechamentos: [] }),
      produtos,
      parceiros
    };
    localStorage.setItem(KEY_TRIB, JSON.stringify(dbTrib));
  } else {
    saveEmpresa(empresaId, {
      produtos,
      parceiros
    });
  }

  // 2. Documentos Fiscais (Fiscal Store)
  // Notas de Saída (Faturamento) -> Alimenta Receita no Dashboard
  const docsSaida = [
    {
      id: novoDocId("nf"),
      empresaId,
      competencia,
      grupo: "faturamento",
      tipo: "NF-e",
      numero: "101",
      serie: "1",
      emissao: `${ano}-${String(mes).padStart(2, '0')}-02`,
      participante: "Lojão das Roupas ME",
      participanteDoc: "44.555.666/0001-81",
      valorTotal: 12500.00,
      valorProdutos: 12500.00,
      valor: moedaBR(12500.00),
      baseIcms: moedaBR(12500.00),
      icms: moedaBR(1500.00),
      status: "Autorizado",
      chave: chaveFicticia(),
      cfop: "5102",
      tributos: { icms: 1500.00, pis: 206.25, cofins: 950.00, total: 2656.25 },
      memoria: [
        { tributo: "ICMS", valor: 1500.00, base: 12500.00, aliquota: 12 },
        { tributo: "PIS", valor: 206.25, base: 12500.00, aliquota: 1.65 },
        { tributo: "COFINS", valor: 950.00, base: 12500.00, aliquota: 7.6 }
      ]
    },
    {
      id: novoDocId("nf"),
      empresaId,
      competencia,
      grupo: "faturamento",
      tipo: "NF-e",
      numero: "102",
      serie: "1",
      emissao: `${ano}-${String(mes).padStart(2, '0')}-05`,
      participante: "Moda Fashion Ltda",
      participanteDoc: "22.333.444/0001-81",
      valorTotal: 28400.00,
      valorProdutos: 28400.00,
      valor: moedaBR(28400.00),
      baseIcms: moedaBR(28400.00),
      icms: moedaBR(3408.00),
      status: "Autorizado",
      chave: chaveFicticia(),
      cfop: "5102",
      tributos: { icms: 3408.00, pis: 468.60, cofins: 2158.40, total: 6035.00 },
      memoria: [
        { tributo: "ICMS", valor: 3408.00, base: 28400.00, aliquota: 12 },
        { tributo: "PIS", valor: 468.60, base: 28400.00, aliquota: 1.65 },
        { tributo: "COFINS", valor: 2158.40, base: 28400.00, aliquota: 7.6 }
      ]
    },
    {
      id: novoDocId("nf"),
      empresaId,
      competencia,
      grupo: "faturamento",
      tipo: "NF-e",
      numero: "103",
      serie: "1",
      emissao: `${ano}-${String(mes).padStart(2, '0')}-15`,
      participante: "Consumidor Final Silva",
      participanteDoc: "999.888.777-66",
      valorTotal: 4500.00,
      valorProdutos: 4500.00,
      valor: moedaBR(4500.00),
      baseIcms: moedaBR(4500.00),
      icms: moedaBR(540.00),
      status: "Autorizado",
      chave: chaveFicticia(),
      cfop: "6108",
      tributos: { icms: 540.00, pis: 74.25, cofins: 342.00, total: 956.25 },
      memoria: [
        { tributo: "ICMS", valor: 540.00, base: 4500.00, aliquota: 12 },
        { tributo: "PIS", valor: 74.25, base: 4500.00, aliquota: 1.65 },
        { tributo: "COFINS", valor: 342.00, base: 4500.00, aliquota: 7.6 }
      ]
    }
  ];

  // Notas de Entrada (Compras) -> Alimenta Despesas no Dashboard
  const docsEntrada = [
    {
      id: novoDocId("nf"),
      empresaId,
      competencia,
      grupo: "demais",
      tipo: "Nota de entrada",
      numero: "5501",
      serie: "1",
      emissao: `${ano}-${String(mes).padStart(2, '0')}-02`,
      participante: "Tecelagem São João Ltda",
      participanteDoc: "11.222.333/0001-81",
      valorTotal: 8500.00,
      valor: moedaBR(8500.00),
      baseIcms: moedaBR(8500.00),
      icms: moedaBR(1020.00),
      status: "Autorizado",
      chave: chaveFicticia(),
      cfop: "1102",
      tributos: { icms: 1020.00, total: 1020.00 },
      memoria: [{ tributo: "ICMS", valor: 1020.00, base: 8500.00, aliquota: 12 }]
    },
    {
      id: novoDocId("nf"),
      empresaId,
      competencia,
      grupo: "demais",
      tipo: "Nota de entrada",
      numero: "8820",
      serie: "1",
      emissao: `${ano}-${String(mes).padStart(2, '0')}-12`,
      participante: "Fios e Malhas Continental",
      participanteDoc: "05.111.222/0001-03",
      valorTotal: 15750.00,
      valor: moedaBR(15750.00),
      baseIcms: moedaBR(15750.00),
      icms: moedaBR(1890.00),
      status: "Autorizado",
      chave: chaveFicticia(),
      cfop: "1102",
      tributos: { icms: 1890.00, total: 1890.00 },
      memoria: [{ tributo: "ICMS", valor: 1890.00, base: 15750.00, aliquota: 12 }]
    }
  ];

  if (sufixo === ".pratica") {
    const KEY_FISCAL = "usecontabil.fiscal.docs.v1" + sufixo;
    const dbFiscal: Record<string, DocFiscal[]> = JSON.parse(localStorage.getItem(KEY_FISCAL) || "{}");
    dbFiscal["saidas"] = [...docsSaida.map(paraDocFiscal), ...(dbFiscal["saidas"] ?? [])];
    dbFiscal["entradas"] = [...docsEntrada.map(paraDocFiscal), ...(dbFiscal["entradas"] ?? [])];
    localStorage.setItem(KEY_FISCAL, JSON.stringify(dbFiscal));
    window.dispatchEvent(new Event(FISCAL_EVENT));
  } else {
    saveDocs("saidas", docsSaida.map(paraDocFiscal));
    saveDocs("entradas", docsEntrada.map(paraDocFiscal));
  }
  
  // Também salvar no TributarioStore para que o Dashboard (useTributario) pegue
  if (sufixo === ".pratica") {
    const KEY_TRIB = "usecontabil.tributario.v1" + sufixo;
    const dbTrib = JSON.parse(localStorage.getItem(KEY_TRIB) || "{}");
    const emp: { documentos?: DocumentoFiscal[] } =
      dbTrib[empresaId] || { produtos: [], parceiros: [], documentos: [], regras: [], auditoria: [], fechamentos: [] };
    emp.documentos = [
      ...(emp.documentos ?? []).filter((d) => d.competencia !== competencia),
      ...docsSaida.map(paraDocumentoTributario),
      ...docsEntrada.map(paraDocumentoTributario),
    ];
    dbTrib[empresaId] = emp;
    localStorage.setItem(KEY_TRIB, JSON.stringify(dbTrib));
  } else {
    const atualTributario = empresaDB(empresaId);
    saveEmpresa(empresaId, {
      documentos: [
        ...atualTributario.documentos.filter((d) => d.competencia !== competencia),
        ...docsSaida.map(paraDocumentoTributario),
        ...docsEntrada.map(paraDocumentoTributario),
      ]
    });
  }

  // 3. Financeiro (Contas a Pagar/Receber)
  const KEY_BAIXAS = KEY_BAIXAS_BASE + sufixo;
  const rawBaixas = localStorage.getItem(KEY_BAIXAS);
  const todasBaixas: Baixa[] = rawBaixas ? JSON.parse(rawBaixas) : [];
  const outrasBaixas = todasBaixas.filter((b) => !b.id.includes(competencia));
  localStorage.setItem(KEY_BAIXAS, JSON.stringify(outrasBaixas));

  // Gerar alguns títulos e baixas automáticas para dar movimento ao fluxo
  const pagar = getTitulosBase("pagar", empresaId, competencia);
  const receber = getTitulosBase("receber", empresaId, competencia);

  // Baixar os primeiros títulos de cada para simular liquidez
  if (pagar.length > 0) {
    try {
      registrarBaixa({
        titulo: { ...pagar[0], pago: 0, saldo: pagar[0].valor, situacao: "Em aberto", diasAtraso: 0, multa: 0, juros: 0, totalDevido: pagar[0].valor, faixa: "A vencer", baixas: [] },
        data: pagar[0].vencimento,
        valor: pagar[0].valor,
        juros: 0, multa: 0, desconto: 0,
        contaId: "bb-01",
        forma: "TED"
      });
    } catch (e) { console.error(e); }
  }

  if (receber.length > 0) {
    try {
      registrarBaixa({
        titulo: { ...receber[0], pago: 0, saldo: receber[0].valor, situacao: "Em aberto", diasAtraso: 0, multa: 0, juros: 0, totalDevido: receber[0].valor, faixa: "A vencer", baixas: [] },
        data: receber[0].vencimento,
        valor: receber[0].valor,
        juros: 0, multa: 0, desconto: 0,
        contaId: "itau-01",
        forma: "PIX"
      });
    } catch (e) { console.error(e); }
  }

  // 4. Movimentos de Caixa Extras (Para o Dashboard Bancário e Conciliação)
  try {
    const KEY_MOVS = "usecontabil.contas.movimentos.v1" + sufixo;
    const movs: MovimentoCaixa[] = JSON.parse(localStorage.getItem(KEY_MOVS) || "[]");
    
    // Filtra movimentos da competência atual para não duplicar se rodar de novo
    const movsFiltrados = movs.filter((m) => !m.data.startsWith(competencia));

    const idAporte = `mv-aporte-${Date.now()}`;
    movsFiltrados.push({
      id: idAporte,
      contaId: "itau-01",
      data: `${ano}-${String(mes).padStart(2, '0')}-01`,
      historico: "Capital Social Integralizado",
      tipo: "Entrada",
      valor: 150000.00,
      origem: "Aporte de Capital"
    });

    movsFiltrados.push({
      id: `mv-tarifa-${Date.now()}`,
      contaId: "bb-01",
      data: `${ano}-${String(mes).padStart(2, '0')}-05`,
      historico: "Tarifa Manutenção Conta",
      tipo: "Saída",
      valor: 45.00,
      origem: "Tarifa Bancária"
    });

    movsFiltrados.push({
      id: `mv-energia-${Date.now()}`,
      contaId: "itau-01",
      data: `${ano}-${String(mes).padStart(2, '0')}-10`,
      historico: "Pagamento Enel Distribuição",
      tipo: "Saída",
      valor: 850.40,
      origem: "Despesa Operacional"
    });

    localStorage.setItem(KEY_MOVS, JSON.stringify(movsFiltrados));
    
    // 4.1 Conciliação Bancária (Simulação)
    const KEY_CONC = "usecontabil:conciliacao" + sufixo;
    const estadoConc = JSON.parse(localStorage.getItem(KEY_CONC) || '{"vinculos":[],"fechamentos":{},"ignorados":[]}');
    
    // Adicionar um vínculo de conciliação automático para teste
    estadoConc.vinculos.push({
      id: `VIN-AUTO-${Date.now()}`,
      contaId: "itau-01",
      competencia,
      extratoIds: [`EXT-itau-01-0`], // Simulado
      contabilIds: [idAporte],
      metodo: "Automático",
      confianca: 100,
      criadoEm: new Date().toISOString(),
      usuario: "Sistema"
    });
    
    localStorage.setItem(KEY_CONC, JSON.stringify(estadoConc));

  } catch (e) { console.error(e); }

  // 5. Auditoria e Outros Registros (SPED, DARF, DRE)
  // Nota: O DRE e SPEDs são gerados dinamicamente no sistema a partir dos documentos fiscais e movimentos.
  // Ao popular os documentos e movimentos acima, os módulos de DRE, SPED e Guias já refletirão esses dados.
  
  if (sufixo === ".pratica") {
    const KEY_TRIB = "usecontabil.tributario.v1" + sufixo;
    const dbTrib = JSON.parse(localStorage.getItem(KEY_TRIB) || "{}");
    const emp = dbTrib[empresaId] || { produtos: [], parceiros: [], documentos: [], regras: [], auditoria: [], fechamentos: [] };
    emp.auditoria = [{
      id: novoId("aud"),
      data: new Date().toISOString(),
      empresaId,
      usuario: "Sistema/Treinamento",
      origem: "Modo Prática",
      acao: "Carga Completa de Dados",
      detalhe: "Geração de cenário contábil complexo: Receitas (45k), Despesas (24k), Tributos, Conciliação, DARFs e DRE.",
      competencia
    }, ...(emp.auditoria || [])].slice(0, 400);
    dbTrib[empresaId] = emp;
    localStorage.setItem(KEY_TRIB, JSON.stringify(dbTrib));
  } else {
    registrarAuditoria(empresaId, {
      origem: "Modo Prática",
      acao: "Carga Completa de Dados",
      detalhe: "Geração de cenário contábil complexo: Receitas (45k), Despesas (24k), Tributos, Conciliação, DARFs e DRE.",
      competencia
    });
  }

  // Notificar todos os stores da mudança
  window.dispatchEvent(new Event(TRIBUTARIO_EVENT));
  window.dispatchEvent(new Event(FISCAL_EVENT));
  window.dispatchEvent(new Event(CONTAS_EVENT));

  return true;
}

