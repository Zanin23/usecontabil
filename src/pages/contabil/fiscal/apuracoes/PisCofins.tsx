import { Coins } from "lucide-react";
import ApuracaoView from "@/components/contabil/ApuracaoView";
import { MOTORES } from "@/lib/apuracaoStore";

const m = MOTORES[0];

export default function ApuracaoPisCofins() {
  return (
    <ApuracaoView
      motor="pis-cofins"
      titulo={m.titulo}
      descricao={m.descricao}
      icone={Coins}
      submodulos={m.submodulos}
      regras={[
        { se: "Regime = Lucro Real", entao: "apurar pelo não cumulativo (PIS 1,65% / COFINS 7,6%) com direito a crédito", base: "Leis 10.637/2002 e 10.833/2003" },
        { se: "Regime = Lucro Presumido", entao: "apurar pelo cumulativo (PIS 0,65% / COFINS 3%) sem crédito", base: "Lei 9.718/1998" },
        { se: "CFOP de substituição tributária ou receita monofásica", entao: "excluir o valor da base de PIS/COFINS", base: "IN RFB 2.121/2022" },
        { se: "CFOP de uso, consumo ou ativo imobilizado", entao: "vedar a apropriação do crédito", base: "Lei 10.833/2003, art. 3º" },
        { se: "Receita de exportação", entao: "aplicar não incidência das contribuições", base: "CF/88, art. 149, §2º, I" },
      ]}
    />
  );
}
