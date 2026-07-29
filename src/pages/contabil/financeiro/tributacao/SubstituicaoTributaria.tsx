import { Layers } from "lucide-react";
import MotorTributacaoView from "@/components/contabil/MotorTributacaoView";

export default function SubstituicaoTributaria() {
  return (
    <MotorTributacaoView
      config={{
        titulo: "Substituição tributária",
        destaque: "ICMS-ST",
        descricao: "Motor de ICMS-ST com MVA/IVA, preço médio ponderado, base reduzida, FCP-ST e regras por convênio, protocolo e estado.",
        icone: Layers,
        tributos: ["ICMS-ST", "FCP-ST"],
        parametros: [
          { label: "Fundamento", valor: "Convênio ICMS 142/2018" },
          { label: "Base ST", valor: "(valor + IPI + frete) × (1 + MVA)" },
          { label: "ICMS-ST", valor: "Base ST × alíq. interna − ICMS próprio" },
          { label: "FCP-ST", valor: "2,00% sobre a base ST" },
          { label: "MVA ajustada", valor: "Aplicada quando origem ≠ destino" },
        ],
        dicas: [
          "A MVA é cadastrada no produto e pode ser sobrescrita item a item na emissão.",
          "Produtos com CEST e CST 10/60 indicam operação sujeita à substituição tributária.",
          "O FCP-ST acompanha o ICMS-ST e é recolhido junto ao estado de destino.",
          "Convênios e protocolos definem quais UFs aplicam ST para cada segmento.",
        ],
      }}
    />
  );
}
