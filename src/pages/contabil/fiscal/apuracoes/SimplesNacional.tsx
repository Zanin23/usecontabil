import { PieChart } from "lucide-react";
import ApuracaoView from "@/components/contabil/ApuracaoView";
import { MOTORES } from "@/lib/apuracaoStore";

const m = MOTORES[3];

export default function ApuracaoSimples() {
  return (
    <ApuracaoView
      motor="simples-nacional"
      titulo={m.titulo}
      descricao={m.descricao}
      icone={PieChart}
      submodulos={m.submodulos}
      parametros={[
        {
          key: "rbt12",
          label: "RBT12 — receita bruta dos últimos 12 meses (R$)",
          ajuda: "Define a faixa e a alíquota efetiva. Sem esse valor o sistema projeta a receita do mês × 12.",
          placeholder: "1.850.000,00",
        },
        {
          key: "folha12",
          label: "Folha de salários dos últimos 12 meses (R$)",
          ajuda: "Usada no Fator R: folha ÷ RBT12. Igual ou acima de 28% os serviços vão para o Anexo III.",
          placeholder: "540.000,00",
        },
      ]}
      regras={[
        { se: "Fator R ≥ 28%", entao: "tributar os serviços pelo Anexo III", base: "LC 123/2006, art. 18, §5º-J" },
        { se: "Fator R < 28%", entao: "tributar os serviços pelo Anexo V", base: "LC 123/2006, art. 18, §5º-M" },
        { se: "Receita com ICMS-ST", entao: "segregar a parcela de ICMS do DAS", base: "LC 123/2006, art. 18, §4º-A" },
        { se: "Receita monofásica", entao: "excluir PIS/COFINS da parcela do DAS", base: "LC 123/2006, art. 18, §4º-A, IV" },
        { se: "Receita de exportação", entao: "afastar PIS, COFINS, ICMS e ISS da parcela exportada", base: "LC 123/2006, art. 18, §14" },
        { se: "Faixa determinada pelo RBT12", entao: "alíquota efetiva = (RBT12 × nominal − parcela a deduzir) ÷ RBT12", base: "LC 123/2006, art. 18, §1º" },
      ]}
    />
  );
}
