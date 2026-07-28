import { Truck } from "lucide-react";
import CrudDocumentosFiscais from "@/components/contabil/CrudDocumentosFiscais";
import { diaDaCompetencia, novaChave, participante, valorSeq } from "@/lib/fiscalDocMocks";
import { moedaBR, valorBR } from "@/lib/fiscalStore";

const TIPOS = ["Rodoviário", "Subcontratação", "Redespacho", "Complemento de frete"];
const CFOPS = ["1352", "2352", "5932", "6932"];

export default function ConhecimentosTransporte() {
  return (
    <CrudDocumentosFiscais
      titulo="Conhecimentos de transporte"
      descricao="CT-e e MDF-e vinculados às operações de entrada e saída do grupo."
      icone={Truck}
      slug="transporte"
      prefixoId="CTE"
      labelNovo="Novo CT-e"
      labelImportar="Importar XML"
      dataKey="data"
      statusKey="status"
      statusOk="Escriturado"
      valorKey="valor"
      colunas={["numero", "data", "participante", "tipo", "cfop", "valor", "status"]}
      campos={[
        { key: "numero", label: "Documento", mono: true, required: true, placeholder: "CT-e 7710" },
        { key: "modelo", label: "Modelo", type: "select", options: ["CT-e (57)", "MDF-e (58)"] },
        { key: "chave", label: "Chave de acesso", type: "chave", span: 2 },
        { key: "data", label: "Data de emissão", mono: true, required: true, placeholder: "01/07/2026" },
        { key: "participante", label: "Transportador", required: true },
        { key: "cnpj", label: "CNPJ do transportador", mono: true },
        { key: "tipo", label: "Tipo de serviço", type: "select", options: TIPOS },
        { key: "cfop", label: "CFOP", type: "select", options: CFOPS },
        { key: "docVinculado", label: "Documento vinculado", mono: true, placeholder: "NF-e 22140" },
        { key: "valor", label: "Valor do frete (R$)", mono: true, align: "right", required: true },
        { key: "icms", label: "ICMS do frete (R$)", mono: true, align: "right" },
        { key: "status", label: "Status", type: "select", options: ["Escriturado", "Pendente", "Cancelado"] },
        { key: "observacao", label: "Observação", type: "textarea", span: 2 },
      ]}
      exemplo={(comp) =>
        Array.from({ length: 5 }, (_, i) => {
          const p = participante(i + 3);
          const valor = valorSeq(i, 480, 312.7);
          return {
            numero: `CT-e ${7710 + i * 4}`,
            modelo: "CT-e (57)",
            chave: novaChave(),
            data: diaDaCompetencia(comp, i + 3),
            participante: p.nome,
            cnpj: p.cnpj,
            tipo: TIPOS[i % TIPOS.length],
            cfop: CFOPS[i % CFOPS.length],
            docVinculado: `NF-e ${22140 + i * 5}`,
            valor,
            icms: moedaBR(valorBR(valor) * 0.12),
            status: i === 2 ? "Pendente" : "Escriturado",
            observacao: "",
          };
        })
      }
      indicadoresExtras={(docs) => [
        {
          label: "ICMS sobre frete",
          valor: `R$ ${moedaBR(docs.reduce((s, d) => s + valorBR(d.icms), 0))}`,
        },
      ]}
      dicas={[
        "Vincule o CT-e à nota transportada para que o frete componha o custo da operação.",
        "Fretes sobre compras geram crédito de ICMS quando a mercadoria também gera.",
        "MDF-e é documento de manifesto e não gera valor de frete próprio.",
      ]}
    />
  );
}
