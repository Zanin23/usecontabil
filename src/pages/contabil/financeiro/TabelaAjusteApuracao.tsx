import { FileCog } from "lucide-react";
import CrudTabelaFinanceiro from "@/components/contabil/CrudTabelaFinanceiro";
import { numeroBR } from "@/lib/financeiroStore";

export default function TabelaAjusteApuracao() {
  return (
    <CrudTabelaFinanceiro
      titulo="Ajustes de apuração"
      descricao="Adições, exclusões e estornos lançados na apuração mensal dos tributos das empresas do grupo."
      icone={FileCog}
      tabela="ajuste-apuracao"
      prefixoId="AJ"
      labelNovo="Novo ajuste"
      vigencia="Competência atual"
      badgeKey="tipo"
      colunas={["codigo", "descricao", "tributo", "tipo", "valor"]}
      campos={[
        { key: "codigo", label: "Código", mono: true, required: true, placeholder: "AJ-01" },
        { key: "tributo", label: "Tributo", type: "select", required: true, options: ["IRPJ", "CSLL", "PIS", "COFINS", "ICMS", "IPI", "ISS"] },
        { key: "descricao", label: "Descrição", required: true, span: 2, placeholder: "Estorno de crédito de ICMS uso e consumo" },
        { key: "tipo", label: "Tipo", type: "select", options: ["Adição", "Exclusão", "Estorno", "Crédito"] },
        { key: "valor", label: "Valor (R$)", mono: true, align: "right", required: true, placeholder: "-4.212,00" },
        { key: "observacao", label: "Fundamentação", type: "textarea", span: 2 },
      ]}
      padrao={[
        { codigo: "AJ-01", tributo: "ICMS", descricao: "Estorno de crédito — uso e consumo", tipo: "Estorno", valor: "-4.212,00", observacao: "" },
        { codigo: "AJ-02", tributo: "IRPJ", descricao: "Adição temporária — provisão trabalhista", tipo: "Adição", valor: "48.200,00", observacao: "" },
        { codigo: "AJ-03", tributo: "IRPJ", descricao: "Exclusão de dividendos recebidos", tipo: "Exclusão", valor: "-12.400,00", observacao: "" },
        { codigo: "AJ-04", tributo: "PIS", descricao: "Crédito sobre insumos", tipo: "Crédito", valor: "-8.412,00", observacao: "" },
      ]}
      indicadores={(l) => {
        const soma = l.reduce((s, x) => s + numeroBR(x.valor), 0);
        return [
          { label: "Ajustes lançados", valor: String(l.length) },
          { label: "Efeito líquido", valor: `R$ ${soma.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
          { label: "Adições", valor: String(l.filter((x) => x.tipo === "Adição").length) },
          { label: "Exclusões / créditos", valor: String(l.filter((x) => x.tipo === "Exclusão" || x.tipo === "Crédito").length) },
        ];
      }}
      dicas={[
        "Use valores negativos para exclusões, estornos e créditos — o efeito líquido é somado automaticamente.",
        "Todo ajuste deve ter fundamentação registrada para sustentar a apuração em uma fiscalização interna.",
        "Ajustes de IRPJ/CSLL compõem o LALUR; os de PIS/COFINS entram na apuração de contribuições.",
      ]}
    />
  );
}
