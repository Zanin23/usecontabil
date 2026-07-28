import { FileDown } from "lucide-react";
import CrudDocumentosFiscais from "@/components/contabil/CrudDocumentosFiscais";
import { diaDaCompetencia, novaChave, participante, valorSeq } from "@/lib/fiscalDocMocks";
import { moedaBR, valorBR } from "@/lib/fiscalStore";

const TIPOS = ["Compra", "Devolução", "Remessa", "Bonificação", "Transferência"];
const CFOPS = ["1102", "2102", "1556", "1202", "2551"];

export default function NotasEntrada() {
  return (
    <CrudDocumentosFiscais
      titulo="Notas de entrada"
      descricao="NF-e de compras, devoluções e remessas recebidas pelas empresas do grupo."
      icone={FileDown}
      slug="entradas"
      prefixoId="NFE-E"
      labelNovo="Nova entrada"
      labelImportar="Importar XML"
      dataKey="data"
      statusKey="status"
      statusOk="Escriturado"
      valorKey="valor"
      colunas={["numero", "data", "participante", "tipo", "cfop", "valor", "status"]}
      campos={[
        { key: "numero", label: "Documento", mono: true, required: true, placeholder: "NF-e 10240" },
        { key: "serie", label: "Série", mono: true, placeholder: "1" },
        { key: "chave", label: "Chave de acesso", type: "chave", span: 2, ajuda: "44 dígitos — gerada automaticamente para lançamentos internos." },
        { key: "data", label: "Data de entrada", mono: true, required: true, placeholder: "01/07/2026" },
        { key: "participante", label: "Fornecedor", required: true },
        { key: "cnpj", label: "CNPJ do fornecedor", mono: true },
        { key: "tipo", label: "Natureza", type: "select", options: TIPOS },
        { key: "cfop", label: "CFOP", type: "select", options: CFOPS },
        { key: "valor", label: "Valor total (R$)", mono: true, align: "right", required: true, placeholder: "1.400,00" },
        { key: "baseIcms", label: "Base de ICMS (R$)", mono: true, align: "right" },
        { key: "icms", label: "ICMS creditado (R$)", mono: true, align: "right" },
        { key: "status", label: "Status", type: "select", options: ["Escriturado", "Pendente", "Rejeitado"] },
        { key: "observacao", label: "Observação", type: "textarea", span: 2 },
      ]}
      exemplo={(comp) =>
        Array.from({ length: 6 }, (_, i) => {
          const p = participante(i);
          const valor = valorSeq(i);
          const base = valorBR(valor);
          return {
            numero: `NF-e ${10240 + i * 7}`,
            serie: "1",
            chave: novaChave(),
            data: diaDaCompetencia(comp, i),
            participante: p.nome,
            cnpj: p.cnpj,
            tipo: TIPOS[i % TIPOS.length],
            cfop: CFOPS[i % CFOPS.length],
            valor,
            baseIcms: valor,
            icms: moedaBR(base * 0.18),
            status: i % 5 === 4 ? "Pendente" : "Escriturado",
            observacao: "",
          };
        })
      }
      indicadoresExtras={(docs) => [
        {
          label: "ICMS creditado",
          valor: `R$ ${moedaBR(docs.reduce((s, d) => s + valorBR(d.icms), 0))}`,
        },
      ]}
      dicas={[
        "Entradas pendentes bloqueiam a apuração de ICMS da competência — escriture antes do fechamento.",
        "Confira o CFOP: operações de uso e consumo (1556) não geram crédito de ICMS.",
        "Devoluções de venda entram com CFOP 1202 e estornam o débito da nota original.",
      ]}
    />
  );
}
