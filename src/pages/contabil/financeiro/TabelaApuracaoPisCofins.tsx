import { PieChart } from "lucide-react";
import CrudTabelaFinanceiro from "@/components/contabil/CrudTabelaFinanceiro";
import { numeroBR } from "@/lib/financeiroStore";

const money = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export default function TabelaApuracaoPisCofins() {
  return (
    <CrudTabelaFinanceiro
      titulo="Apuração de PIS e COFINS"
      descricao="Bases, débitos e créditos que compõem o saldo apurado das contribuições na competência."
      icone={PieChart}
      tabela="apuracao-pis-cofins"
      prefixoId="PC"
      labelNovo="Novo grupo"
      vigencia="Competência atual"
      badgeKey="natureza"
      colunas={["grupo", "natureza", "base", "pis", "cofins"]}
      campos={[
        { key: "grupo", label: "Grupo", required: true, span: 2, placeholder: "Receitas tributáveis" },
        { key: "natureza", label: "Natureza", type: "select", options: ["Débito", "Crédito", "Saldo"] },
        { key: "base", label: "Base (R$)", mono: true, align: "right", required: true, placeholder: "3.930.164,00" },
        { key: "pis", label: "PIS (R$)", mono: true, align: "right", required: true, placeholder: "64.847,00" },
        { key: "cofins", label: "COFINS (R$)", mono: true, align: "right", required: true, placeholder: "298.692,00" },
      ]}
      padrao={[
        { grupo: "Receitas tributáveis", natureza: "Débito", base: "3.930.164,00", pis: "64.847,00", cofins: "298.692,00" },
        { grupo: "Créditos sobre insumos", natureza: "Crédito", base: "2.128.490,00", pis: "-35.120,00", cofins: "-161.765,00" },
        { grupo: "Créditos de energia elétrica", natureza: "Crédito", base: "48.212,00", pis: "-795,00", cofins: "-3.664,00" },
      ]}
      indicadores={(l) => {
        const pis = l.filter((x) => x.natureza !== "Saldo").reduce((s, x) => s + numeroBR(x.pis), 0);
        const cofins = l.filter((x) => x.natureza !== "Saldo").reduce((s, x) => s + numeroBR(x.cofins), 0);
        return [
          { label: "Grupos lançados", valor: String(l.length) },
          { label: "PIS a recolher", valor: money(pis) },
          { label: "COFINS a recolher", valor: money(cofins) },
          { label: "Total das contribuições", valor: money(pis + cofins) },
        ];
      }}
      dicas={[
        "Lance créditos com valores negativos — os indicadores já calculam o saldo devido de cada contribuição.",
        "Linhas com natureza 'Saldo' são informativas e não entram no somatório dos indicadores.",
        "No regime cumulativo não há créditos: cadastre apenas os grupos de débito.",
      ]}
    />
  );
}
