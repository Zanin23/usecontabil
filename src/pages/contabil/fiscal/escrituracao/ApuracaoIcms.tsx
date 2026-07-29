import { Scale } from "lucide-react";
import CrudEscrituracao, { MemoriaCalculo } from "@/components/contabil/CrudEscrituracao";
import {
  competenciaAnterior, documentosPendentes, gerarApuracaoIcms, linhasDoPeriodo, saldoCredorAnterior, somar,
} from "@/lib/escrituracaoStore";
import { moedaBR } from "@/lib/fiscalStore";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";

export default function ApuracaoIcms() {
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();

  return (
    <CrudEscrituracao
      titulo="Apuração de ICMS"
      descricao="Débitos das saídas menos créditos das entradas, CIAP e saldo credor anterior — calculada a partir dos livros da competência."
      icone={Scale}
      slug="apuracao-icms"
      prefixoId="APU"
      labelNovo="Ajuste manual"
      gerar={{
        label: "Apurar competência",
        executar: gerarApuracaoIcms,
        vazio: "Gere os livros de entradas e saídas antes de apurar o ICMS.",
      }}
      campos={[
        { key: "tributo", label: "Tributo", type: "select", options: ["ICMS próprio", "ICMS-ST", "DIFAL", "Ajuste de apuração"], required: true },
        { key: "base", label: "Base de cálculo (R$)", mono: true, align: "right" },
        { key: "debito", label: "Débitos (R$)", mono: true, align: "right" },
        { key: "credito", label: "Créditos (R$)", mono: true, align: "right" },
        { key: "apagar", label: "Saldo a recolher (R$)", mono: true, align: "right" },
        { key: "saldoCredor", label: "Saldo credor a transportar (R$)", mono: true, align: "right" },
        { key: "status", label: "Situação", type: "select", options: ["A recolher", "Saldo credor", "Em conferência", "Sem movimento", "Encerrado"] },
        { key: "memoria", label: "Memória de cálculo", type: "textarea", span: 2, ajuda: "Explique a origem dos valores — fica registrado para auditoria interna." },
      ]}
      colunas={["tributo", "base", "debito", "credito", "apagar", "status"]}
      totais={["base", "debito", "credito", "apagar"]}
      statusKey="status"
      statusOk="Encerrado"
      kpis={(l) => [
        { label: "Débitos", valor: `R$ ${moedaBR(somar(l, "debito"))}` },
        { label: "Créditos", valor: `R$ ${moedaBR(somar(l, "credito"))}` },
        { label: "A recolher", valor: `R$ ${moedaBR(somar(l, "apagar"))}` },
        { label: "Saldo credor", valor: `R$ ${moedaBR(somar(l, "saldoCredor"))}` },
      ]}
      alerta={() => {
        if (!empresa) return null;
        const pend = documentosPendentes(empresa.id, competencia);
        if (pend) return `${pend} documento(s) pendentes na competência — a apuração não pode ser encerrada com documento em aberto.`;
        const entradas = linhasDoPeriodo("livro-entradas", empresa.id, competencia).length;
        const saidas = linhasDoPeriodo("livro-saidas", empresa.id, competencia).length;
        if (!entradas || !saidas) return "Gere o livro de entradas e o livro de saídas desta competência antes de apurar.";
        const anterior = saldoCredorAnterior(empresa.id, competencia);
        return anterior
          ? `Saldo credor de R$ ${moedaBR(anterior)} transportado de ${formatCompetencia(competenciaAnterior(competencia))} e já abatido nesta apuração.`
          : null;
      }}
      painel={(l) => <MemoriaCalculo linhas={l.filter((x) => x.memoria)} />}
      dicas={[
        "A apuração não é digitada: ela é o resultado dos livros. Use \"Apurar competência\" e ajuste só o que for exceção.",
        "Saldo credor apurado não vira guia — é transportado automaticamente para a competência seguinte.",
        "ICMS-ST e DIFAL são recolhidos em guias separadas do ICMS próprio.",
        "Créditos de CIAP entram somados aos créditos das entradas na linha do ICMS próprio.",
        "Encerre a apuração só depois de zerar os documentos pendentes da competência.",
      ]}
    />
  );
}
