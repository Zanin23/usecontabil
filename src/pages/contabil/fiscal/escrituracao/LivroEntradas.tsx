import { FileSpreadsheet } from "lucide-react";
import CrudEscrituracao from "@/components/contabil/CrudEscrituracao";
import { descricaoCfop, documentosPendentes, gerarLivroEntradas, somar } from "@/lib/escrituracaoStore";
import { moedaBR } from "@/lib/fiscalStore";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { useCompetencia } from "@/lib/competencia";

const CFOPS = ["1102", "1202", "1352", "1403", "1556", "2102", "2352", "2551", "2556"];

export default function LivroEntradas() {
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();

  return (
    <CrudEscrituracao
      titulo="Livro de entradas"
      descricao="Registro de entradas consolidado por CFOP — nasce das notas de entrada, CT-e e serviços tomados da competência."
      icone={FileSpreadsheet}
      slug="livro-entradas"
      prefixoId="LVE"
      labelNovo="Nova linha"
      gerar={{
        label: "Gerar dos documentos",
        executar: gerarLivroEntradas,
        vazio: "Nenhum documento de entrada lançado nesta competência.",
      }}
      campos={[
        { key: "cfop", label: "CFOP", type: "select", options: CFOPS, required: true, mono: true },
        { key: "descricao", label: "Operação", span: 2, calc: (l) => descricaoCfop(l.cfop) },
        { key: "documentos", label: "Qtd. documentos", mono: true, align: "right", placeholder: "1" },
        { key: "contabil", label: "Valor contábil (R$)", mono: true, align: "right", required: true, placeholder: "10.000,00" },
        { key: "base", label: "Base de ICMS (R$)", mono: true, align: "right", ajuda: "Zero em operações sem crédito (uso e consumo, ST, ativo)." },
        { key: "icms", label: "ICMS creditado (R$)", mono: true, align: "right" },
        { key: "ipi", label: "IPI creditado (R$)", mono: true, align: "right" },
        { key: "isentas", label: "Isentas / não tributadas (R$)", mono: true, align: "right" },
        { key: "outras", label: "Outras (R$)", mono: true, align: "right" },
        { key: "origem", label: "Origem", type: "select", options: ["Documentos fiscais", "Lançamento manual"] },
      ]}
      colunas={["cfop", "descricao", "documentos", "contabil", "base", "icms", "outras"]}
      totais={["contabil", "base", "icms", "outras"]}
      kpis={(l) => [
        { label: "CFOPs", valor: String(l.length) },
        { label: "Valor contábil", valor: `R$ ${moedaBR(somar(l, "contabil"))}` },
        { label: "Crédito de ICMS", valor: `R$ ${moedaBR(somar(l, "icms"))}` },
        { label: "Sem crédito", valor: `R$ ${moedaBR(somar(l, "outras"))}` },
      ]}
      alerta={() => {
        if (!empresa) return null;
        const pend = documentosPendentes(empresa.id, competencia);
        return pend
          ? `${pend} documento(s) da competência ainda estão pendentes — regularize antes de gerar o livro, senão o crédito de ICMS sai a menor.`
          : null;
      }}
      dicas={[
        "O livro é derivado dos documentos: use \"Gerar dos documentos\" sempre que houver novo lançamento na competência.",
        "CFOP 1556/2556 (uso e consumo) e 1403 (ST) não geram crédito de ICMS — o valor vai para a coluna Outras.",
        "Devolução de venda (1202) estorna o débito da nota original e entra como crédito.",
        "Frete de CT-e com CFOP 1352/2352 gera crédito quando a operação de origem é tributada.",
        "Linhas manuais convivem com as geradas, mas são substituídas ao regerar a competência.",
      ]}
    />
  );
}
