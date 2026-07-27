import { Banknote } from "lucide-react";
import CrudEmpresa from "@/components/contabil/CrudEmpresa";

export default function EmpresaPagamentos() {
  return (
    <CrudEmpresa
      titulo="Pagamentos"
      descricao="Contas correntes, chaves PIX e formas de pagamento usadas pela empresa do grupo."
      icone={Banknote}
      colecao="pagamentos"
      prefixoId="PAG"
      labelNovo="Nova conta"
      statusKey="situacao"
      colunas={["banco", "agencia", "conta", "tipo", "situacao"]}
      campos={[
        { key: "banco", label: "Banco / Instituição", required: true, placeholder: "Itaú, Bradesco, PIX chave CNPJ…" },
        {
          key: "tipo", label: "Finalidade", type: "select",
          options: ["Corrente PJ", "Investimento", "Folha de pagamento", "FGTS convênio", "Recebimento PIX", "Pagamento de tributos"],
        },
        { key: "agencia", label: "Agência", mono: true },
        { key: "conta", label: "Conta", mono: true, required: true },
        { key: "chavePix", label: "Chave PIX", placeholder: "CNPJ, e-mail ou aleatória" },
        { key: "situacao", label: "Situação", type: "select", options: ["Ativa", "Suspensa", "Encerrada"] },
        { key: "observacao", label: "Observações", type: "textarea", span: 2 },
      ]}
      dicas={[
        "Cadastre ao menos uma conta ativa por empresa — ela é usada nos pagamentos de guias e da folha.",
        "Separe a conta de folha da conta operacional para facilitar a conciliação do fechamento.",
        "A chave PIX do CNPJ agiliza recebimentos entre empresas do grupo.",
        "Contas encerradas devem ficar com situação 'Encerrada' em vez de serem apagadas, preservando o histórico.",
      ]}
    />
  );
}
