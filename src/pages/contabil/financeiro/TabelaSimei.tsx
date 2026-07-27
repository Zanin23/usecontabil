import { Coins } from "lucide-react";
import CrudTabelaFinanceiro from "@/components/contabil/CrudTabelaFinanceiro";
import { numeroBR } from "@/lib/financeiroStore";

export default function TabelaSimei() {
  return (
    <CrudTabelaFinanceiro
      titulo="SIMEI"
      descricao="Valor mensal fixo do MEI por tipo de atividade, usado nas unidades do grupo enquadradas no SIMEI."
      icone={Coins}
      tabela="simei"
      prefixoId="SIMEI"
      labelNovo="Nova linha"
      vigencia="Competências de 2026"
      badgeKey="atividade"
      colunas={["atividade", "inss", "icms", "iss", "total"]}
      campos={[
        { key: "atividade", label: "Atividade", required: true, span: 2, placeholder: "Comércio, Serviços…" },
        { key: "inss", label: "INSS (R$)", mono: true, align: "right", required: true, placeholder: "70,60" },
        { key: "icms", label: "ICMS (R$)", mono: true, align: "right", placeholder: "1,00" },
        { key: "iss", label: "ISS (R$)", mono: true, align: "right", placeholder: "5,00" },
        { key: "total", label: "Total mensal (R$)", mono: true, align: "right", required: true, placeholder: "76,60" },
      ]}
      padrao={[
        { atividade: "Comércio ou indústria", inss: "70,60", icms: "1,00", iss: "0,00", total: "71,60" },
        { atividade: "Serviços", inss: "70,60", icms: "0,00", iss: "5,00", total: "75,60" },
        { atividade: "Comércio e serviços", inss: "70,60", icms: "1,00", iss: "5,00", total: "76,60" },
      ]}
      indicadores={(l) => [
        { label: "Linhas cadastradas", valor: String(l.length) },
        {
          label: "Maior DAS mensal",
          valor: l.length ? `R$ ${Math.max(...l.map((x) => numeroBR(x.total))).toFixed(2).replace(".", ",")}` : "—",
        },
      ]}
      dicas={[
        "O SIMEI é um valor fixo mensal — não varia com o faturamento, apenas com o tipo de atividade.",
        "Atualize a linha de INSS sempre que o salário mínimo mudar (5% do mínimo vigente).",
        "Unidades do grupo enquadradas no SIMEI usam esta tabela na geração do DAS.",
      ]}
    />
  );
}
