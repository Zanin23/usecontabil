import { Layers } from "lucide-react";
import CrudEscrituracao from "@/components/contabil/CrudEscrituracao";
import { somar } from "@/lib/escrituracaoStore";
import { moedaBR, valorBR } from "@/lib/fiscalStore";

const parcelaNum = (p: string) => Number((p ?? "").split("/")[0]) || 0;

export default function Ciap() {
  return (
    <CrudEscrituracao
      titulo="CIAP"
      descricao="Controle do crédito de ICMS do ativo imobilizado, apropriado em 48 parcelas mensais."
      icone={Layers}
      slug="ciap"
      prefixoId="CIAP"
      labelNovo="Novo bem"
      campos={[
        { key: "bem", label: "Bem do ativo imobilizado", required: true, span: 2, placeholder: "Torno CNC Romi" },
        { key: "documento", label: "Nota fiscal de aquisição", mono: true, placeholder: "NF-e 10240" },
        { key: "entrada", label: "Data de entrada", mono: true, required: true, placeholder: "12/03/2025" },
        { key: "valorBem", label: "Valor do bem (R$)", mono: true, align: "right", placeholder: "300.000,00" },
        { key: "credito", label: "Crédito total de ICMS (R$)", mono: true, align: "right", required: true, placeholder: "42.000,00", ajuda: "ICMS destacado na nota do bem — é ele que se divide em 48 parcelas." },
        { key: "parcela", label: "Parcela atual (1 a 48)", mono: true, align: "right", required: true, placeholder: "17" },
        {
          key: "mes", label: "Crédito do mês (R$)", mono: true, align: "right",
          calc: (l) => (parcelaNum(l.parcela) > 48 ? moedaBR(0) : moedaBR(valorBR(l.credito) / 48)),
        },
        {
          key: "acumulado", label: "Crédito já apropriado (R$)", mono: true, align: "right",
          calc: (l) => moedaBR((valorBR(l.credito) / 48) * Math.min(parcelaNum(l.parcela), 48)),
        },
        {
          key: "situacao", label: "Situação", type: "select",
          options: ["Em apropriação", "Encerrado", "Baixado", "Suspenso"],
        },
        { key: "observacao", label: "Observação", type: "textarea", span: 2 },
      ]}
      colunas={["bem", "entrada", "credito", "parcela", "mes", "acumulado", "situacao"]}
      totais={["credito", "mes", "acumulado"]}
      statusKey="situacao"
      statusOk="Encerrado"
      kpis={(l) => [
        { label: "Bens controlados", valor: String(l.length) },
        { label: "Crédito do mês", valor: `R$ ${moedaBR(somar(l, "mes"))}` },
        { label: "Crédito total", valor: `R$ ${moedaBR(somar(l, "credito"))}` },
        { label: "Já apropriado", valor: `R$ ${moedaBR(somar(l, "acumulado"))}` },
      ]}
      alerta={(l) => {
        const encerrar = l.filter((b) => parcelaNum(b.parcela) >= 48 && b.situacao !== "Encerrado");
        return encerrar.length
          ? `${encerrar.length} bem(ns) chegaram à 48ª parcela — marque a situação como "Encerrado" para parar a apropriação.`
          : null;
      }}
      dicas={[
        "O crédito de ICMS do ativo imobilizado é apropriado em 48 parcelas mensais iguais (1/48 por mês).",
        "A parcela do mês é calculada automaticamente e entra como crédito na apuração de ICMS da competência.",
        "A apropriação depende da proporção de saídas tributadas — operações isentas reduzem o crédito aproveitável.",
        "Bem alienado antes das 48 parcelas perde o crédito restante: marque como \"Baixado\".",
        "Avance a parcela a cada competência para o controle acompanhar o CIAP declarado no Bloco G do SPED.",
      ]}
    />
  );
}
