import { Cog } from "lucide-react";
import CrudEmpresa from "@/components/contabil/CrudEmpresa";

export default function EmpresaParametros() {
  return (
    <CrudEmpresa
      titulo="Parâmetros"
      descricao="Parâmetros contábeis, fiscais e de sistema que orientam o fechamento da empresa."
      icone={Cog}
      colecao="parametros"
      prefixoId="PAR"
      labelNovo="Novo parâmetro"
      colunas={["grupo", "parametro", "valor", "vigencia"]}
      campos={[
        {
          key: "grupo", label: "Grupo", type: "select", required: true,
          options: ["Contábil", "Fiscal", "Financeiro", "Sistema"],
        },
        { key: "parametro", label: "Parâmetro", required: true, placeholder: "Plano de contas, Regime PIS/COFINS…" },
        { key: "valor", label: "Valor", required: true, span: 2 },
        { key: "vigencia", label: "Vigente a partir de", type: "date" },
        { key: "responsavel", label: "Responsável" },
        { key: "observacao", label: "Observações", type: "textarea", span: 2 },
      ]}
      sugestoes={[
        { grupo: "Contábil", parametro: "Plano de contas", valor: "Plano padrão do grupo" },
        { grupo: "Contábil", parametro: "Prazo de fechamento mensal", valor: "Até o dia 15 do mês seguinte" },
        { grupo: "Fiscal", parametro: "Regime PIS/COFINS", valor: "Não cumulativo" },
        { grupo: "Fiscal", parametro: "Layout NF-e", valor: "4.00" },
        { grupo: "Financeiro", parametro: "Data padrão de pagamento de tributos", valor: "Vencimento legal" },
        { grupo: "Sistema", parametro: "Certificado digital padrão", valor: "A1 da matriz" },
      ]}
      dicas={[
        "Parâmetros definem o comportamento do fechamento — revise-os antes de iniciar a competência.",
        "Use 'Modelos sugeridos' para criar rapidamente a base mínima de parâmetros da empresa.",
        "Ao alterar um parâmetro no meio do exercício, registre a data de vigência.",
        "Parâmetros fiscais devem acompanhar o regime tributário informado no cadastro da empresa.",
      ]}
    />
  );
}
