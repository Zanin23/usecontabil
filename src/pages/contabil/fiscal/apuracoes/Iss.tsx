import { Landmark } from "lucide-react";
import ApuracaoView from "@/components/contabil/ApuracaoView";
import { MOTORES } from "@/lib/apuracaoStore";

const m = MOTORES[1];

export default function ApuracaoIss() {
  return (
    <ApuracaoView
      motor="iss"
      titulo={m.titulo}
      descricao={m.descricao}
      icone={Landmark}
      submodulos={m.submodulos}
      regras={[
        { se: "Serviço prestado com ISS retido pelo tomador", entao: "não gerar débito de ISS próprio sobre a parcela retida", base: "LC 116/2003" },
        { se: "Serviço tomado com responsabilidade tributária", entao: "recolher o ISS retido em nome do prestador", base: "LC 116/2003, art. 6º" },
        { se: "Município de incidência informado", entao: "aplicar a alíquota da legislação municipal cadastrada", base: "Código Tributário Municipal" },
        { se: "Nota sem município de incidência", entao: "bloquear o fechamento por inconsistência crítica", base: "Controle interno" },
      ]}
    />
  );
}
