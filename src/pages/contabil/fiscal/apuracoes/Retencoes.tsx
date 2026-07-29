import { Split } from "lucide-react";
import ApuracaoView from "@/components/contabil/ApuracaoView";
import { MOTORES } from "@/lib/apuracaoStore";

const m = MOTORES[4];

export default function ApuracaoRetencoes() {
  return (
    <ApuracaoView
      motor="retencoes"
      titulo={m.titulo}
      descricao={m.descricao}
      icone={Split}
      submodulos={m.submodulos}
      regras={[
        { se: "Serviço tomado de pessoa jurídica sujeito a retenção", entao: "reter 1,5% de IRRF sobre o valor do serviço", base: "IN RFB 1.234/2012, art. 3º" },
        { se: "Serviço tomado sujeito a CSRF", entao: "reter 4,65% (PIS 0,65% + COFINS 3% + CSLL 1%)", base: "Lei 10.833/2003, art. 30" },
        { se: "Cessão de mão de obra", entao: "reter 11% de INSS e recolher em GPS/DARF", base: "IN RFB 2.110/2022, art. 109" },
        { se: "Tomador é responsável tributário do ISS", entao: "reter o ISS e recolher ao município do serviço", base: "LC 116/2003, art. 6º" },
        { se: "Documento acima de R$ 5.000 sem retenção informada", entao: "sinalizar inconsistência para conferência", base: "Controle interno" },
      ]}
    />
  );
}
