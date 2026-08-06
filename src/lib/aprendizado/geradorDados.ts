/**
 * Gerador de dados de treinamento para o Modo Prática.
 * Popula os stores tributário, fiscal, financeiro e outros com dados fictícios
 * para que o dashboard e relatórios mostrem informações coerentes.
 */
import { saveEmpresa, novoId, registrarAuditoria, empresaDB } from "@/lib/tributarioStore";
import { saveDocs, novoDocId, moedaBR, chaveFicticia, FISCAL_EVENT } from "@/lib/fiscalStore";
import { registrarBaixa, titulos as getTitulosBase, write as writeContas, KEY_BAIXAS_BASE, lancarMovimento } from "@/lib/contasCaixaStore";
import { PRODUTOS_TREINAMENTO, PARCEIROS_TREINAMENTO } from "./seedPratica";

export function popularDadosPratica(empresaId: string, competencia: string, forcePratica = false) {
  if (!empresaId) return;

  const [ano, mes] = competencia.split("-").map(Number);
  
  // 0. Garantir sufixo correto se for forçado
  const sufixo = forcePratica ? ".pratica" : (typeof window !== "undefined" && localStorage.getItem("uc:pratica:ativo") === "1" ? ".pratica" : "");
  
  // 1. Cadastros Analíticos (Tributário Store)
  const produtos = PRODUTOS_TREINAMENTO.map(p => ({ ...p, id: novoId("p") }));
  const parceiros = PARCEIROS_TREINAMENTO.map(p => ({ ...p, id: novoId("parc") }));
  
  // Local storage direto para garantir isolamento se for forçado
  if (forcePratica) {
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
      emissao: `${ano}-${String(mes).padStart(2, '0')}-10`,
      participante: "Lojão das Roupas ME",
      participanteDoc: "44.555.666/0001-77",
      valorTotal: 12500.00,
      valorProdutos: 12500.00,
      valor: moedaBR(12500.00),
      baseIcms: moedaBR(12500.00),
      icms: moedaBR(1500.00),
      status: "Autorizado",
      chave: chaveFicticia(),
      cfop: "5102",
      tributos: {
        icms: 1500.00,
        pis: 206.25,
        cofins: 950.00,
        total: 2656.25
      },
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
      tributos: {
        icms: 540.00,
        pis: 74.25,
        cofins: 342.00,
        total: 956.25
      },
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
      participanteDoc: "11.222.333/0001-44",
      valorTotal: 8500.00,
      valor: moedaBR(8500.00),
      baseIcms: moedaBR(8500.00),
      icms: moedaBR(1020.00),
      status: "Autorizado",
      chave: chaveFicticia(),
      cfop: "1102",
      tributos: { icms: 1020.00, total: 1020.00 },
      memoria: [{ tributo: "ICMS", valor: 1020.00, base: 8500.00, aliquota: 12 }]
    }
  ];

  if (forcePratica) {
    const KEY_FISCAL = "usecontabil.fiscal.docs.v1" + sufixo;
    const dbFiscal = JSON.parse(localStorage.getItem(KEY_FISCAL) || "{}");
    dbFiscal["saidas"] = [...(docsSaida as any), ...(dbFiscal["saidas"] || [])];
    dbFiscal["entradas"] = [...(docsEntrada as any), ...(dbFiscal["entradas"] || [])];
    localStorage.setItem(KEY_FISCAL, JSON.stringify(dbFiscal));
    window.dispatchEvent(new Event(FISCAL_EVENT));
  } else {
    saveDocs("saidas", docsSaida as any);
    saveDocs("entradas", docsEntrada as any);
  }
  
  // Também salvar no TributarioStore para que o Dashboard (useTributario) pegue
  if (forcePratica) {
    const KEY_TRIB = "usecontabil.tributario.v1" + sufixo;
    const dbTrib = JSON.parse(localStorage.getItem(KEY_TRIB) || "{}");
    const emp = dbTrib[empresaId] || { produtos: [], parceiros: [], documentos: [], regras: [], auditoria: [], fechamentos: [] };
    emp.documentos = [
      ...(emp.documentos || []).filter((d: any) => d.competencia !== competencia),
      ...docsSaida as any,
      ...docsEntrada as any
    ];
    dbTrib[empresaId] = emp;
    localStorage.setItem(KEY_TRIB, JSON.stringify(dbTrib));
  } else {
    const atualTributario = empresaDB(empresaId);
    saveEmpresa(empresaId, {
      documentos: [
        ...atualTributario.documentos.filter(d => d.competencia !== competencia),
        ...docsSaida as any,
        ...docsEntrada as any
      ]
    });
  }

  // 3. Financeiro (Contas a Pagar/Receber)
  const KEY_BAIXAS = KEY_BAIXAS_BASE + sufixo;
  const todasBaixas = JSON.parse(localStorage.getItem(KEY_BAIXAS) || "[]");
  const outrasBaixas = todasBaixas.filter((b: any) => !b.id.includes(competencia));
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

  // 4. Movimentos de Caixa Extras (Para o Dashboard Bancário)
  try {
    lancarMovimento({
      contaId: "cx-01",
      data: `${ano}-${String(mes).padStart(2, '0')}-01`,
      historico: "Aporte de Capital Inicial - Treinamento",
      tipo: "Entrada",
      valor: 50000.00
    });
  } catch (e) { console.error(e); }

  // 5. Auditoria
  registrarAuditoria(empresaId, {
    origem: "Modo Prática",
    acao: "Carga Completa de Dashboard",
    detalhe: "Geração de movimento contábil completo: Receitas (17k), Despesas (8.5k), Tributos, Baixas Financeiras e Aporte de Capital.",
    competencia
  });

  return true;
}

