import { Split } from "lucide-react";
import MotorTributacaoView from "@/components/contabil/MotorTributacaoView";

export default function Difal() {
  return (
    <MotorTributacaoView
      config={{
        titulo: "DIFAL",
        destaque: "EC 87/2015",
        descricao: "Diferencial de alíquotas nas operações interestaduais destinadas a consumidor final não contribuinte, com base dupla, FCP e partilha integral ao destino.",
        icone: Split,
        tributos: ["DIFAL", "FCP"],
        parametros: [
          { label: "Fundamento", valor: "EC 87/2015 + LC 190/2022" },
          { label: "Base de cálculo", valor: "Base dupla (por dentro)", hint: "Base = valor / (1 − alíquota interna do destino)" },
          { label: "Partilha", valor: "100% destino", hint: "Vigente desde 2019" },
          { label: "FCP", valor: "2,00%", hint: "Percentual padrão parametrizável por UF" },
          { label: "Recolhimento", valor: "GNRE / DAE por operação" },
        ],
        dicas: [
          "O DIFAL só é calculado quando há operação interestadual, consumidor final e destinatário não contribuinte.",
          "A base dupla é aplicada conforme LC 190/2022: base = valor / (1 − alíquota interna).",
          "Empresas do Simples Nacional não recolhem DIFAL na condição de remetente.",
          "O FCP é somado ao DIFAL e recolhido ao estado de destino na mesma guia.",
        ],
      }}
    />
  );
}
