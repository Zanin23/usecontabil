import { FileSpreadsheet } from "lucide-react";
import CrudTabelaFinanceiro from "@/components/contabil/CrudTabelaFinanceiro";
import { numeroBR } from "@/lib/financeiroStore";

export default function TabelaAjusteDocumentoFiscal() {
  return (
    <CrudTabelaFinanceiro
      titulo="Ajustes de documento fiscal"
      descricao="Correções aplicadas em documentos fiscais já escriturados — CFOP, NCM, bases e valores."
      icone={FileSpreadsheet}
      tabela="ajuste-documento-fiscal"
      prefixoId="ADF"
      labelNovo="Novo ajuste"
      vigencia="Competência atual"
      badgeKey="situacao"
      colunas={["documento", "emissao", "ajuste", "valor", "situacao"]}
      campos={[
        { key: "documento", label: "Documento", mono: true, required: true, placeholder: "NF-e 44821" },
        { key: "emissao", label: "Emissão", mono: true, required: true, placeholder: "31/07/2026" },
        { key: "ajuste", label: "Ajuste aplicado", required: true, span: 2, placeholder: "CFOP corrigido 5102 → 5405" },
        { key: "valor", label: "Impacto (R$)", mono: true, align: "right", placeholder: "-1.240,00" },
        { key: "situacao", label: "Situação", type: "select", options: ["Pendente", "Aplicado", "Cancelado"] },
        { key: "observacao", label: "Justificativa", type: "textarea", span: 2 },
      ]}
      padrao={[
        { documento: "NF-e 44821", emissao: "31/07/2026", ajuste: "CFOP corrigido 5102 → 5405", valor: "0,00", situacao: "Aplicado", observacao: "" },
        { documento: "NF-e 44780", emissao: "22/07/2026", ajuste: "Base de ICMS-ST redimensionada", valor: "-1.240,00", situacao: "Aplicado", observacao: "" },
        { documento: "NF-e 44712", emissao: "14/07/2026", ajuste: "Inclusão de CFOP 5949", valor: "320,00", situacao: "Pendente", observacao: "" },
        { documento: "NF-e 44659", emissao: "08/07/2026", ajuste: "Correção de NCM 8481.80.99", valor: "0,00", situacao: "Aplicado", observacao: "" },
      ]}
      indicadores={(l) => [
        { label: "Ajustes registrados", valor: String(l.length) },
        { label: "Pendentes", valor: String(l.filter((x) => x.situacao === "Pendente").length) },
        {
          label: "Impacto acumulado",
          valor: `R$ ${l.reduce((s, x) => s + numeroBR(x.valor), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        },
      ]}
      dicas={[
        "Ajustes pendentes bloqueiam a conclusão fiscal da competência — regularize antes do encerramento.",
        "Registre sempre a justificativa: ela é a trilha de auditoria interna do documento corrigido.",
        "Correções que alteram valor exigem revisão da apuração do tributo afetado.",
      ]}
    />
  );
}
