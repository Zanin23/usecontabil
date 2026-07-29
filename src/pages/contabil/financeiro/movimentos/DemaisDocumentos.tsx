import { Truck } from "lucide-react";
import MovimentoView from "@/components/contabil/MovimentoView";

export default function DemaisDocumentos() {
  return (
    <MovimentoView
      grupo="demais"
      titulo="Demais documentos"
      descricao="CT-e, MDF-e, BP-e, NF3-e, notas de entrada, complementares, de ajuste e recibos — todos integrados à escrituração e à apuração."
      icone={Truck}
      dicas={[
        "Notas complementares e de ajuste referenciam o documento original na timeline.",
        "Notas de entrada alimentam os créditos de ICMS, IPI, PIS e COFINS da competência.",
        "CT-e e MDF-e registram o frete e o manifesto vinculados às operações de saída.",
        "Todos os documentos entram no fechamento da competência e na auditoria fiscal.",
      ]}
    />
  );
}
