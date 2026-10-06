// Helpers de apoio para gerar movimento de exemplo nas telas de documentos fiscais.
// Todos os dados são internos/visuais — não há integração com a Receita.
import { chaveFicticia, moedaBR } from "@/lib/fiscalStore";

export const PARTICIPANTES = [
  { nome: "Metalúrgica Andrade S.A.", cnpj: "12.345.678/0001-95" },
  { nome: "Panificadora Real Ltda.", cnpj: "23.456.789/0001-95" },
  { nome: "TechCore Sistemas ME", cnpj: "34.567.890/0001-30" },
  { nome: "Transportes Litoral Ltda.", cnpj: "45.678.901/0001-75" },
  { nome: "Comércio Andes Eireli", cnpj: "56.789.012/0001-00" },
  { nome: "Distribuidora Norte Ltda.", cnpj: "67.890.123/0001-16" },
];

export function diaDaCompetencia(competencia: string, i: number) {
  const [y, m] = competencia.split("-");
  const dia = String(((i * 4) % 27) + 1).padStart(2, "0");
  return `${dia}/${m}/${y}`;
}

export const valorSeq = (i: number, base = 1_400, passo = 1_237.4) => moedaBR(base + i * passo);

export const participante = (i: number) => PARTICIPANTES[i % PARTICIPANTES.length];

export const novaChave = () => chaveFicticia();
