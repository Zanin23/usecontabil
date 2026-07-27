import { TrendingUp } from "lucide-react";
import CrudTabelaFinanceiro from "@/components/contabil/CrudTabelaFinanceiro";

export default function TabelaLucroReal() {
  return (
    <CrudTabelaFinanceiro
      titulo="Lucro Real"
      descricao="Alíquotas, adicionais e bases dos tributos apurados no Lucro Real das empresas do grupo."
      icone={TrendingUp}
      tabela="lucro-real"
      prefixoId="LR"
      labelNovo="Novo tributo"
      vigencia="Competências de 2026"
      badgeKey="tributo"
      colunas={["tributo", "aliq", "base", "periodicidade"]}
      campos={[
        { key: "tributo", label: "Tributo", required: true, placeholder: "IRPJ, CSLL, PIS…" },
        { key: "aliq", label: "Alíquota", mono: true, align: "right", required: true, placeholder: "15,00%" },
        { key: "base", label: "Base de cálculo", required: true, span: 2, placeholder: "Lucro real trimestral" },
        { key: "periodicidade", label: "Periodicidade", type: "select", options: ["Mensal", "Trimestral", "Anual"] },
        { key: "observacao", label: "Observações", type: "textarea", span: 2 },
      ]}
      padrao={[
        { tributo: "IRPJ", aliq: "15,00%", base: "Lucro real", periodicidade: "Trimestral", observacao: "" },
        { tributo: "IRPJ adicional", aliq: "10,00%", base: "Excedente a R$ 60.000/trimestre", periodicidade: "Trimestral", observacao: "R$ 20.000/mês na apuração mensal por estimativa." },
        { tributo: "CSLL", aliq: "9,00%", base: "Resultado ajustado", periodicidade: "Trimestral", observacao: "" },
        { tributo: "PIS não cumulativo", aliq: "1,65%", base: "Receita bruta", periodicidade: "Mensal", observacao: "Permite créditos sobre insumos." },
        { tributo: "COFINS não cumulativo", aliq: "7,60%", base: "Receita bruta", periodicidade: "Mensal", observacao: "Permite créditos sobre insumos." },
      ]}
      indicadores={(l) => [
        { label: "Tributos cadastrados", valor: String(l.length) },
        { label: "Apurações mensais", valor: String(l.filter((x) => x.periodicidade === "Mensal").length) },
      ]}
      dicas={[
        "O adicional de IRPJ incide apenas sobre o excedente do limite do período de apuração.",
        "No não cumulativo, lance os créditos em Ajuste de apuração para chegar ao saldo devido.",
        "Confirme a periodicidade escolhida (trimestral ou anual por estimativa) antes do primeiro recolhimento do ano.",
      ]}
    />
  );
}
