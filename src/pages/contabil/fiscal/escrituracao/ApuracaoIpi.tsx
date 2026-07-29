import { Percent } from "lucide-react";
import CrudEscrituracao, { MemoriaCalculo } from "@/components/contabil/CrudEscrituracao";
import { gerarApuracaoIpi, linhasDoPeriodo, somar } from "@/lib/escrituracaoStore";
import { moedaBR } from "@/lib/fiscalStore";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { useCompetencia } from "@/lib/competencia";

export default function ApuracaoIpi() {
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();

  return (
    <CrudEscrituracao
      titulo="Apuração de IPI"
      descricao="Confronto entre o IPI destacado nas saídas e o crédito das entradas de insumos, por competência."
      icone={Percent}
      slug="apuracao-ipi"
      prefixoId="IPI"
      labelNovo="Ajuste manual"
      gerar={{
        label: "Apurar competência",
        executar: gerarApuracaoIpi,
        vazio: "Gere os livros de entradas e saídas antes de apurar o IPI.",
      }}
      campos={[
        { key: "tributo", label: "Linha", type: "select", options: ["IPI — saídas", "IPI — entradas", "Saldo do período", "Ajuste"], required: true },
        { key: "base", label: "Base / valor das operações (R$)", mono: true, align: "right" },
        { key: "debito", label: "Débitos (R$)", mono: true, align: "right" },
        { key: "credito", label: "Créditos (R$)", mono: true, align: "right" },
        { key: "apagar", label: "Saldo a recolher (R$)", mono: true, align: "right" },
        { key: "saldoCredor", label: "Saldo credor (R$)", mono: true, align: "right" },
        { key: "status", label: "Situação", type: "select", options: ["Apurado", "A recolher", "Saldo credor", "Sem movimento", "Encerrado"] },
        { key: "memoria", label: "Memória de cálculo", type: "textarea", span: 2 },
      ]}
      colunas={["tributo", "base", "debito", "credito", "apagar", "status"]}
      totais={["debito", "credito", "apagar"]}
      statusKey="status"
      statusOk="Encerrado"
      kpis={(l) => [
        { label: "Débitos", valor: `R$ ${moedaBR(somar(l.filter((x) => x.tributo !== "Saldo do período"), "debito"))}` },
        { label: "Créditos", valor: `R$ ${moedaBR(somar(l.filter((x) => x.tributo !== "Saldo do período"), "credito"))}` },
        { label: "A recolher", valor: `R$ ${moedaBR(somar(l.filter((x) => x.tributo === "Saldo do período"), "apagar"))}` },
        { label: "Saldo credor", valor: `R$ ${moedaBR(somar(l.filter((x) => x.tributo === "Saldo do período"), "saldoCredor"))}` },
      ]}
      alerta={() => {
        if (!empresa) return null;
        const entradas = linhasDoPeriodo("livro-entradas", empresa.id, competencia);
        const saidas = linhasDoPeriodo("livro-saidas", empresa.id, competencia);
        if (!entradas.length && !saidas.length) return "Sem livros gerados nesta competência — o IPI apurado ficará zerado.";
        if (!somar(entradas, "ipi") && !somar(saidas, "ipi"))
          return "Nenhuma linha dos livros tem IPI destacado. Informe o IPI nas linhas do livro antes de apurar, ou a empresa não é contribuinte de IPI.";
        return null;
      }}
      painel={(l) => <MemoriaCalculo linhas={l.filter((x) => x.memoria)} />}
      dicas={[
        "Só empresas industriais ou equiparadas apuram IPI — comércio puro não tem esta apuração.",
        "O IPI é apurado a partir do valor destacado nas linhas dos livros de entradas e saídas.",
        "Crédito de IPI só existe em entradas de insumos e mercadorias industrializadas para revenda.",
        "Saldo credor é transportado; saldo devedor gera DARF do código correspondente.",
        "A periodicidade (mensal ou decendial) depende do enquadramento definido nos parâmetros da empresa.",
      ]}
    />
  );
}
