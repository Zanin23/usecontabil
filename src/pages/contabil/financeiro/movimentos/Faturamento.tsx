import { ShoppingCart } from "lucide-react";
import MovimentoView from "@/components/contabil/MovimentoView";

export default function Faturamento() {
  return (
    <MovimentoView
      grupo="faturamento"
      titulo="Faturamento"
      descricao="NF-e, NFC-e, CF-e/SAT, venda balcão, pedidos e orçamentos com cálculo automático de ICMS, ST, DIFAL, IPI e PIS/COFINS."
      icone={ShoppingCart}
      dicas={[
        "A emissão passa pelo motor de regras antes da transmissão — bloqueios impedem o envio.",
        "Operação interestadual para não contribuinte consumidor final calcula DIFAL com base dupla e FCP.",
        "Itens com MVA preenchida geram ICMS-ST e FCP-ST automaticamente.",
        "Cada documento guarda memória de cálculo, regras aplicadas e timeline completa.",
      ]}
    />
  );
}
