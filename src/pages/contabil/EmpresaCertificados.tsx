import { Award } from "lucide-react";
import CrudEmpresa from "@/components/contabil/CrudEmpresa";

export default function EmpresaCertificados() {
  return (
    <CrudEmpresa
      titulo="Certificados"
      descricao="Certificados digitais A1/A3 vinculados à empresa e seus prazos de validade."
      icone={Award}
      colecao="certificados"
      prefixoId="CRT"
      labelNovo="Novo certificado"
      statusKey="situacao"
      colunas={["titular", "tipo", "ac", "validade", "situacao"]}
      campos={[
        { key: "titular", label: "Titular", required: true, placeholder: "RAZAO SOCIAL:CNPJ", span: 2 },
        { key: "tipo", label: "Tipo", type: "select", options: ["A1", "A3"] },
        { key: "ac", label: "Autoridade certificadora", placeholder: "AC Certisign RFB G5" },
        { key: "emissao", label: "Emissão", type: "date" },
        { key: "validade", label: "Validade", type: "date", required: true },
        { key: "uso", label: "Usos", placeholder: "NF-e · e-CAC · DCTFWeb", span: 2 },
        { key: "situacao", label: "Situação", type: "select", options: ["Ativo", "A vencer", "Vencido", "Revogado"] },
        { key: "observacao", label: "Observações", type: "textarea", span: 2 },
      ]}
      dicas={[
        "Mantenha ao menos um certificado A1 ativo por empresa para transmissões automáticas.",
        "Acompanhe a validade: renovações devem começar 30 dias antes do vencimento.",
        "Registre em 'Usos' quais obrigações dependem daquele certificado.",
        "Certificados vencidos travam o envio de obrigações no encerramento da competência.",
      ]}
    />
  );
}
