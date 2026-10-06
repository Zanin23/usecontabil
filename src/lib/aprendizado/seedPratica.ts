/**
 * Dados de semente para o Modo Prática (Treinamento).
 * Contém cenários realistas de diferentes ramos para laboratórios.
 */
import { Produto, Parceiro } from "@/lib/tributarioStore";

export const PRODUTOS_TREINAMENTO: Produto[] = [
  {
    id: "p1",
    codigo: "001",
    descricao: "Camiseta Algodão Básica",
    ncm: "61091000",
    origem: "0",
    unidade: "UN",
    precoPadrao: 45.90,
    cfopPadrao: "5101",
    cstIcms: "000",
    aliqIcms: 18,
    aliqIpi: 0,
    aliqPis: 1.65,
    aliqCofins: 7.6,
    ativo: true
  },
  {
    id: "p2",
    codigo: "002",
    descricao: "Calça Jeans Masculina",
    ncm: "62034200",
    origem: "0",
    unidade: "UN",
    precoPadrao: 129.90,
    cfopPadrao: "5101",
    cstIcms: "000",
    aliqIcms: 18,
    aliqIpi: 0,
    aliqPis: 1.65,
    aliqCofins: 7.6,
    ativo: true
  },
  {
    id: "p3",
    codigo: "003",
    descricao: "Jaqueta de Couro Sintético",
    ncm: "42031000",
    origem: "2",
    unidade: "UN",
    precoPadrao: 299.00,
    cfopPadrao: "5101",
    cstIcms: "010",
    aliqIcms: 18,
    mva: 45,
    aliqIpi: 5,
    aliqPis: 1.65,
    aliqCofins: 7.6,
    ativo: true
  }
];

export const PARCEIROS_TREINAMENTO: Parceiro[] = [
  {
    id: "parc1",
    nome: "Tecelagem São João Ltda",
    documento: "11.222.333/0001-81",
    tipo: "Fornecedor",
    uf: "SP",
    crt: "3",
    regime: "Lucro Real",
    contribuinte: true,
    consumidorFinal: false,
    retencoes: "Nenhuma",
    ativo: true
  },
  {
    id: "parc2",
    nome: "Lojão das Roupas ME",
    documento: "44.555.666/0001-81",
    tipo: "Cliente",
    uf: "RJ",
    crt: "1",
    regime: "Simples Nacional",
    contribuinte: true,
    consumidorFinal: false,
    retencoes: "Nenhuma",
    ativo: true
  },
  {
    id: "parc3",
    nome: "Consumidor Final Silva",
    documento: "999.888.777-66",
    tipo: "Cliente",
    uf: "MG",
    crt: "0",
    regime: "Pessoa Física",
    contribuinte: false,
    consumidorFinal: true,
    retencoes: "Nenhuma",
    ativo: true
  }
];

export const CENARIOS_PRATICA = [
  {
    id: "cenario-simples",
    titulo: "Simulação Simples Nacional",
    empresa: "Treina Confecções Ltda",
    regime: "Simples Nacional",
    dados: {
      rbt12: 1250000,
      receitaComercio: 85000,
      receitaServicos: 15000,
      folha12: 380000
    }
  },
  {
    id: "cenario-difal",
    titulo: "Venda Interestadual (DIFAL)",
    origem: "SP",
    destino: "MG",
    produto: "Calça Jeans Masculina",
    valor: 129.90,
    fcp: 2
  }
];
