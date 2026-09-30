import { ClipboardCheck } from "lucide-react";
import CrudDocumentosFiscais from "@/components/contabil/CrudDocumentosFiscais";
import { diaDaCompetencia, novaChave, participante, valorSeq } from "@/lib/fiscalDocMocks";

const EVENTOS = [
  "Ciência da operação",
  "Confirmação da operação",
  "Operação não realizada",
  "Desconhecimento da operação",
];

export default function ManifestacaoDestinatario() {
  return (
    <CrudDocumentosFiscais
      titulo="Manifestação do destinatário"
      descricao="Registro interno de ciência, confirmação e desconhecimento das operações recebidas."
      icone={ClipboardCheck}
      slug="manifestacao"
      prefixoId="MDE"
      labelNovo="Nova manifestação"
      labelImportar="Importar XML da nota"
      dataKey="data"
      statusKey="status"
      statusOk="Registrado"
      valorKey="valor"
      colunas={["chave", "emitente", "data", "evento", "valor", "status"]}
      campos={[
        { key: "chave", label: "Chave de acesso", type: "chave", span: 2, required: true },
        { key: "emitente", label: "Emitente", required: true },
        { key: "cnpj", label: "CNPJ do emitente", mono: true },
        { key: "data", label: "Emissão", mono: true, required: true, placeholder: "01/07/2026" },
        { key: "valor", label: "Valor da nota (R$)", mono: true, align: "right" },
        { key: "evento", label: "Evento", type: "select", options: EVENTOS },
        { key: "prazo", label: "Prazo para manifestar", mono: true, placeholder: "180 dias" },
        { key: "status", label: "Status", type: "select", options: ["Registrado", "Pendente", "Rejeitado"] },
        { key: "justificativa", label: "Justificativa", type: "textarea", span: 2 },
      ]}
      exemplo={(comp) =>
        Array.from({ length: 5 }, (_, i) => {
          const p = participante(i + 1);
          return {
            chave: novaChave(),
            emitente: p.nome,
            cnpj: p.cnpj,
            data: diaDaCompetencia(comp, i),
            valor: valorSeq(i, 2_100, 1_480.2),
            evento: EVENTOS[i % EVENTOS.length],
            prazo: "180 dias",
            status: i % 3 === 2 ? "Pendente" : "Registrado",
            justificativa: "",
          };
        })
      }
      indicadoresExtras={(docs) => [
        {
          label: "Desconhecidas",
          valor: String(docs.filter((d) => d.evento === "Desconhecimento da operação").length),
        },
      ]}
      dicas={[
        "Manifestações pendentes indicam notas destinadas ao grupo que ainda não foram avaliadas.",
        "Desconhecimento e operação não realizada exigem justificativa registrada para auditoria interna.",
        "Após confirmar a operação, escriture a nota na tela de Notas de entrada.",
      ]}
    />
  );
}
