import { Briefcase } from "lucide-react";
import CrudTabelaFinanceiro from "@/components/contabil/CrudTabelaFinanceiro";
import { numeroBR } from "@/lib/financeiroStore";

export default function CadastroServicos() {
  return (
    <CrudTabelaFinanceiro
      titulo="Serviços"
      descricao="Catálogo de serviços faturáveis entre as empresas do grupo, com CNAE, ISS e preço base."
      icone={Briefcase}
      tabela="servicos"
      prefixoId="SVC"
      labelNovo="Novo serviço"
      badgeKey="situacao"
      colunas={["codigo", "servico", "unidade", "cnae", "iss", "valor", "situacao"]}
      campos={[
        { key: "codigo", label: "Código", mono: true, required: true, placeholder: "SVC-001", ajuda: "Identificador único do serviço." },
        { key: "servico", label: "Nome do Serviço", required: true, span: 2, placeholder: "Ex: Consultoria em TI", ajuda: "Descrição clara para emissão da NFS-e." },
        { key: "unidade", label: "Unidade", type: "select", options: ["UN", "HR", "KM", "MES", "DIA"], required: true, ajuda: "Unidade de medida para cobrança." },
        { key: "cnae", label: "CNAE", mono: true, placeholder: "6920-6/01", ajuda: "Classificação Nacional de Atividades Econômicas." },
        { key: "itemLc", label: "Item LC 116", mono: true, placeholder: "17.19", ajuda: "Item da lista de serviços da Lei Complementar 116/03." },
        { key: "iss", label: "Alíquota ISS (%)", mono: true, align: "right", placeholder: "5,00", ajuda: "Percentual do imposto municipal." },
        { key: "valor", label: "Preço Base (R$)", mono: true, align: "right", required: true, placeholder: "0,00", ajuda: "Valor padrão unitário do serviço." },
        { key: "situacao", label: "Situação", type: "select", options: ["Ativo", "Inativo"], ajuda: "Somente serviços ativos podem ser faturados." },
        { key: "observacao", label: "Instruções Internas", type: "textarea", span: 2, placeholder: "Detalhes sobre a execução ou particularidades do serviço..." },
      ]}
      padrao={[
        { codigo: "SVC-001", servico: "Rateio de estrutura administrativa", unidade: "MES", cnae: "6920-6/01", itemLc: "17.19", iss: "5,00", valor: "4.200,00", situacao: "Ativo", observacao: "" },
        { codigo: "SVC-002", servico: "Escrituração fiscal entre unidades", unidade: "UN", cnae: "6920-6/01", itemLc: "17.19", iss: "5,00", valor: "1.800,00", situacao: "Ativo", observacao: "" },
        { codigo: "SVC-003", servico: "Suporte de TI compartilhado", unidade: "HR", cnae: "6209-1/00", itemLc: "1.07", iss: "2,00", valor: "3.600,00", situacao: "Ativo", observacao: "" },
        { codigo: "SVC-004", servico: "Locação de espaço industrial", unidade: "MES", cnae: "6810-2/02", itemLc: "3.03", iss: "0,00", valor: "12.000,00", situacao: "Ativo", observacao: "" },
      ]}
      indicadores={(l) => [
        { label: "Serviços cadastrados", valor: String(l.length) },
        { label: "Ativos", valor: String(l.filter((x) => x.situacao === "Ativo").length) },
        {
          label: "Ticket médio",
          valor: l.length
            ? `R$ ${(l.reduce((s, x) => s + numeroBR(x.valor), 0) / l.length).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
            : "—",
        },
      ]}
      dicas={[
        "Cada serviço faturado entre empresas do grupo precisa de CNAE e item da LC 116 para emitir NFS-e.",
        "A alíquota de ISS varia por município — confira a inscrição municipal da unidade prestadora.",
        "Serviços descontinuados devem ficar como 'Inativo' para preservar o histórico de faturamento.",
      ]}
    />
  );
}
