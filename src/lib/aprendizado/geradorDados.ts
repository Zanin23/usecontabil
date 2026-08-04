/**
 * Gerador de dados de treinamento para o Modo Prática.
 * Popula os stores tributário e fiscal com dados fictícios para fins pedagógicos.
 */
import { saveEmpresa, novoId, registrarAuditoria } from "@/lib/tributarioStore";
import { saveDocs, novoDocId, moedaBR, chaveFicticia } from "@/lib/fiscalStore";
import { PRODUTOS_TREINAMENTO, PARCEIROS_TREINAMENTO } from "./seedPratica";

export function popularDadosPratica(empresaId: string, competencia: string) {
  if (!empresaId) return;

  // 1. Cadastros Analíticos (Tributário Store)
  saveEmpresa(empresaId, {
    produtos: PRODUTOS_TREINAMENTO.map(p => ({ ...p, id: novoId("p") })),
    parceiros: PARCEIROS_TREINAMENTO.map(p => ({ ...p, id: novoId("parc") }))
  });

  // 2. Documentos Fiscais (Fiscal Store)
  const docsSaida = [
    {
      id: novoDocId("nf"),
      empresaId,
      competencia,
      tipo: "NF-e",
      numero: "101",
      serie: "1",
      emissao: `10/${competencia.split('-')[1]}/${competencia.split('-')[0]}`,
      participante: "Lojão das Roupas ME",
      participanteDoc: "44.555.666/0001-77",
      valor: moedaBR(1500.00),
      baseIcms: moedaBR(1500.00),
      icms: moedaBR(180.00),
      status: "Autorizado",
      chave: chaveFicticia(),
      cfop: "5102"
    },
    {
      id: novoDocId("nf"),
      empresaId,
      competencia,
      tipo: "NF-e",
      numero: "102",
      serie: "1",
      emissao: `15/${competencia.split('-')[1]}/${competencia.split('-')[0]}`,
      participante: "Consumidor Final Silva",
      participanteDoc: "999.888.777-66",
      valor: moedaBR(250.00),
      baseIcms: moedaBR(250.00),
      icms: moedaBR(30.00),
      status: "Autorizado",
      chave: chaveFicticia(),
      cfop: "6108"
    }
  ];

  const docsEntrada = [
    {
      id: novoDocId("nf"),
      empresaId,
      competencia,
      tipo: "Nota de entrada",
      numero: "5501",
      serie: "1",
      emissao: `02/${competencia.split('-')[1]}/${competencia.split('-')[0]}`,
      participante: "Tecelagem São João Ltda",
      participanteDoc: "11.222.333/0001-44",
      valor: moedaBR(5000.00),
      baseIcms: moedaBR(5000.00),
      icms: moedaBR(600.00),
      status: "Autorizado",
      chave: chaveFicticia(),
      cfop: "1102"
    }
  ];

  saveDocs("saidas", docsSaida as any);
  saveDocs("entradas", docsEntrada as any);

  // 3. Auditoria
  registrarAuditoria(empresaId, {
    origem: "Modo Prática",
    acao: "Carga de dados de treinamento",
    detalhe: "Dados fictícios de produtos, parceiros e notas fiscais gerados para laboratório.",
    competencia
  });

  return true;
}
