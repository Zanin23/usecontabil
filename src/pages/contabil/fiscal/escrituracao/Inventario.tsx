import { Boxes } from "lucide-react";
import CrudEscrituracao from "@/components/contabil/CrudEscrituracao";
import { somar } from "@/lib/escrituracaoStore";
import { moedaBR, valorBR } from "@/lib/fiscalStore";
import { useCompetencia } from "@/lib/competencia";

export default function Inventario() {
  const { competencia } = useCompetencia();
  const mes = competencia.split("-")[1];

  return (
    <CrudEscrituracao
      titulo="Inventário (Bloco H)"
      descricao="Estoque declarado ao fisco por item, com custo unitário e total — base do Bloco H do SPED Fiscal."
      icone={Boxes}
      slug="inventario"
      prefixoId="INV"
      labelNovo="Novo item"
      campos={[
        { key: "item", label: "Descrição do item", required: true, span: 2, placeholder: "Válvula esfera 1/2\"" },
        { key: "codigo", label: "Código interno", mono: true, placeholder: "PRD-0148" },
        { key: "ncm", label: "NCM", mono: true, required: true, placeholder: "8481.80.99", ajuda: "8 dígitos — precisa bater com o NCM usado nas notas de entrada do item." },
        { key: "unidade", label: "Unidade", type: "select", options: ["UN", "PC", "KG", "MT", "CX", "LT"] },
        { key: "qtd", label: "Quantidade", mono: true, align: "right", required: true, placeholder: "1.240" },
        { key: "unitario", label: "Custo unitário (R$)", mono: true, align: "right", required: true, placeholder: "38,90" },
        {
          key: "total", label: "Valor total (R$)", mono: true, align: "right",
          calc: (l) => moedaBR(valorBR(l.qtd) * valorBR(l.unitario)),
        },
        { key: "propriedade", label: "Propriedade / posse", type: "select", options: ["Próprio em meu poder", "Próprio em poder de terceiros", "De terceiros em meu poder"] },
        { key: "observacao", label: "Observação", type: "textarea", span: 2 },
      ]}
      colunas={["item", "ncm", "unidade", "qtd", "unitario", "total"]}
      totais={["total"]}
      kpis={(l) => [
        { label: "Itens", valor: String(l.length) },
        { label: "Valor do estoque", valor: `R$ ${moedaBR(somar(l, "total"))}` },
        { label: "Data-base", valor: `31/${mes}` },
        {
          label: "Custo médio",
          valor: l.length ? `R$ ${moedaBR(somar(l, "total") / l.length)}` : "R$ 0,00",
        },
      ]}
      alerta={(l) =>
        mes === "12" && !l.length
          ? "Dezembro é a competência do inventário anual — o Bloco H sem itens é rejeitado na entrega do SPED Fiscal."
          : null
      }
      dicas={[
        "O inventário é declarado na competência definida pelo estado — normalmente dezembro, com data-base 31/12.",
        "O valor total é calculado automaticamente: quantidade × custo unitário.",
        "Itens de terceiros em seu poder entram no inventário com indicação de propriedade, sem compor o estoque próprio.",
        "O custo unitário deve seguir o critério contábil adotado (médio ponderado, na maioria dos casos).",
        "Divergência entre o inventário e o razão de estoques trava o fechamento contábil do período.",
      ]}
    />
  );
}
