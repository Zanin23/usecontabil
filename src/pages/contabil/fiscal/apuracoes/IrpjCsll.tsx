import { BadgeDollarSign } from "lucide-react";
import ApuracaoView from "@/components/contabil/ApuracaoView";
import { MOTORES } from "@/lib/apuracaoStore";

const m = MOTORES[2];

export default function ApuracaoIrpjCsll() {
  return (
    <ApuracaoView
      motor="irpj-csll"
      titulo={m.titulo}
      descricao={m.descricao}
      icone={BadgeDollarSign}
      submodulos={m.submodulos}
      regras={[
        { se: "Regime = Lucro Presumido e receita = mercadorias", entao: "presumir 8% para IRPJ e 12% para CSLL", base: "Lei 9.249/1995, arts. 15 e 20" },
        { se: "Regime = Lucro Presumido e receita = serviços", entao: "presumir 32% para IRPJ e CSLL", base: "Lei 9.249/1995, art. 15, §1º, III" },
        { se: "Regime = Lucro Real", entao: "partir do resultado contábil e ajustar por adições e exclusões do LALUR/LACS", base: "RIR/2018, arts. 260 e 261" },
        { se: "Base do IRPJ superior a R$ 20.000 no mês", entao: "aplicar adicional de 10% sobre o excedente", base: "Lei 9.249/1995, art. 3º, §1º" },
        { se: "Existe prejuízo fiscal acumulado", entao: "compensar no máximo 30% do lucro real do período", base: "Lei 9.065/1995, art. 15" },
        { se: "Houve IRRF ou CSRF sofrido", entao: "compensar com o imposto devido da competência", base: "IN RFB 1.234/2012" },
      ]}
    />
  );
}
