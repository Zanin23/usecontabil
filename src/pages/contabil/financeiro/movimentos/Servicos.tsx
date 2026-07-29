import { Receipt } from "lucide-react";
import MovimentoView from "@/components/contabil/MovimentoView";

export default function MovimentoServicos() {
  return (
    <MovimentoView
      grupo="servicos"
      titulo="Serviços — NFS-e e RPS"
      descricao="Emissão, cancelamento, substituição e retenções dos serviços prestados, com apuração de ISS por município e trilha de eventos."
      icone={Receipt}
      dicas={[
        "O RPS é convertido em NFS-e na transmissão; a numeração é sequencial por série.",
        "A alíquota de ISS é buscada do item do serviço e pode ser sobrescrita por operação.",
        "Serviços prestados a pessoa jurídica geram automaticamente as retenções federais.",
        "Cancelamento e substituição ficam registrados na timeline e na trilha de auditoria.",
      ]}
    />
  );
}
