import { FileUp } from "lucide-react";
import CrudDocumentosFiscais from "@/components/contabil/CrudDocumentosFiscais";
import { diaDaCompetencia, novaChave, participante, valorSeq } from "@/lib/fiscalDocMocks";
import { moedaBR, valorBR } from "@/lib/fiscalStore";

const TIPOS = ["Venda", "Remessa", "Transferência", "Devolução", "Bonificação"];
const CFOPS = ["5102", "6102", "5405", "5910", "6202"];

export default function NotasSaida() {
  return (
    <CrudDocumentosFiscais
      titulo="Notas de saída"
      descricao="NF-e emitidas pelas empresas do grupo, com débito de ICMS por CFOP."
      icone={FileUp}
      slug="saidas"
      prefixoId="NFE-S"
      labelNovo="Nova nota"
      labelImportar="Importar XML"
      dataKey="data"
      statusKey="status"
      statusOk="Autorizada"
      valorKey="valor"
      colunas={["numero", "data", "participante", "tipo", "cfop", "valor", "status"]}
      campos={[
        { key: "numero", label: "Documento", mono: true, required: true, placeholder: "NF-e 22140" },
        { key: "serie", label: "Série", mono: true, placeholder: "1" },
        { key: "chave", label: "Chave de acesso", type: "chave", span: 2 },
        { key: "data", label: "Data de emissão", mono: true, required: true, placeholder: "01/07/2026" },
        { key: "participante", label: "Destinatário", type: "participante", required: true, ajuda: "Escolha no cadastro para trazer CNPJ, UF e IE sem digitar de novo." },
        { key: "cnpj", label: "CNPJ do destinatário", mono: true },
        { key: "uf", label: "UF do participante", placeholder: "SP", ajuda: "Herdada do cadastro; entra no DIFAL e na partilha do ICMS entre estados." },
        { key: "tipo", label: "Natureza", type: "select", options: TIPOS },
        { key: "cfop", label: "CFOP", type: "select", options: CFOPS },
        { key: "valor", label: "Valor total (R$)", mono: true, align: "right", required: true, placeholder: "3.200,00" },
        { key: "baseIcms", label: "Base de ICMS (R$)", mono: true, align: "right" },
        { key: "icms", label: "ICMS debitado (R$)", mono: true, align: "right" },
        { key: "status", label: "Status", type: "select", options: ["Autorizada", "Em digitação", "Cancelada", "Denegada"] },
        { key: "observacao", label: "Informações complementares", type: "textarea", span: 2 },
      ]}
      exemplo={(comp) =>
        Array.from({ length: 6 }, (_, i) => {
          const p = participante(i + 2);
          const valor = valorSeq(i, 2_600, 1_890.3);
          const comST = CFOPS[i % CFOPS.length] === "5405";
          return {
            numero: `NF-e ${22140 + i * 5}`,
            serie: "1",
            chave: novaChave(),
            data: diaDaCompetencia(comp, i + 1),
            participante: p.nome,
            cnpj: p.cnpj,
            tipo: TIPOS[i % TIPOS.length],
            cfop: CFOPS[i % CFOPS.length],
            valor,
            baseIcms: comST ? "0,00" : valor,
            icms: comST ? "0,00" : moedaBR(valorBR(valor) * 0.18),
            status: i % 6 === 5 ? "Em digitação" : "Autorizada",
            observacao: "",
          };
        })
      }
      indicadoresExtras={(docs) => [
        {
          label: "ICMS debitado",
          valor: `R$ ${moedaBR(docs.reduce((s, d) => s + valorBR(d.icms), 0))}`,
        },
      ]}
      dicas={[
        "Notas em digitação não compõem o livro de saídas nem a apuração da competência.",
        "Vendas com substituição tributária (CFOP 5405) saem sem base e sem débito próprio de ICMS.",
        "Notas canceladas permanecem na listagem para manter a sequência numérica auditável.",
      ]}
    />
  );
}
