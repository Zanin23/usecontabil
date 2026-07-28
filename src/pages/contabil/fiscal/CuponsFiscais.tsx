import { Barcode } from "lucide-react";
import CrudDocumentosFiscais from "@/components/contabil/CrudDocumentosFiscais";
import { diaDaCompetencia, valorSeq } from "@/lib/fiscalDocMocks";
import { moedaBR, valorBR } from "@/lib/fiscalStore";

export default function CuponsFiscais() {
  return (
    <CrudDocumentosFiscais
      titulo="Cupons fiscais"
      descricao="NFC-e e reduções Z do varejo consolidadas por equipamento e data."
      icone={Barcode}
      slug="cupons"
      prefixoId="NFCE"
      labelNovo="Nova redução Z"
      labelImportar="Importar movimento"
      dataKey="data"
      statusKey="status"
      statusOk="Consolidado"
      valorKey="valor"
      colunas={["numero", "data", "equipamento", "cupons", "valor", "icms", "status"]}
      campos={[
        { key: "numero", label: "Documento / Redução Z", mono: true, required: true, placeholder: "NFC-e 0184" },
        { key: "equipamento", label: "Equipamento (PDV)", required: true, placeholder: "PDV 01 — Loja Centro" },
        { key: "data", label: "Data do movimento", mono: true, required: true, placeholder: "01/07/2026" },
        { key: "cupons", label: "Qtd. de cupons", mono: true, align: "right", placeholder: "184" },
        { key: "valor", label: "Total do dia (R$)", mono: true, align: "right", required: true },
        { key: "cancelados", label: "Cancelamentos (R$)", mono: true, align: "right" },
        { key: "baseIcms", label: "Base de ICMS (R$)", mono: true, align: "right" },
        { key: "icms", label: "ICMS (R$)", mono: true, align: "right" },
        { key: "status", label: "Status", type: "select", options: ["Consolidado", "Pendente", "Divergente"] },
        { key: "observacao", label: "Observação", type: "textarea", span: 2 },
      ]}
      exemplo={(comp) =>
        Array.from({ length: 6 }, (_, i) => {
          const valor = valorSeq(i, 8_400, 2_130.6);
          const v = valorBR(valor);
          return {
            numero: `Z ${String(184 + i).padStart(4, "0")}`,
            equipamento: `PDV 0${(i % 3) + 1} — Loja ${["Centro", "Shopping", "Norte"][i % 3]}`,
            data: diaDaCompetencia(comp, i),
            cupons: String(120 + i * 17),
            valor,
            cancelados: moedaBR(v * 0.008),
            baseIcms: moedaBR(v * 0.82),
            icms: moedaBR(v * 0.82 * 0.18),
            status: i === 5 ? "Divergente" : "Consolidado",
            observacao: "",
          };
        })
      }
      indicadoresExtras={(docs) => [
        {
          label: "Cupons emitidos",
          valor: String(docs.reduce((s, d) => s + Number(d.cupons || 0), 0)),
        },
      ]}
      dicas={[
        "Reduções Z divergentes indicam falha de transmissão do PDV — reprocesse antes de escriturar.",
        "Cancelamentos devem ser abatidos do total do dia para compor a base de ICMS correta.",
        "Cada equipamento precisa de uma redução Z por dia de funcionamento.",
      ]}
    />
  );
}
