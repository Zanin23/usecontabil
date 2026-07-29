import { FileSpreadsheet } from "lucide-react";
import CrudEscrituracao from "@/components/contabil/CrudEscrituracao";
import { descricaoCfop, documentosPendentes, gerarLivroSaidas, somar } from "@/lib/escrituracaoStore";
import { moedaBR } from "@/lib/fiscalStore";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { useCompetencia } from "@/lib/competencia";

const CFOPS = ["5102", "5202", "5405", "5910", "5929", "5933", "5949", "6102", "6108"];

export default function LivroSaidas() {
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();

  return (
    <CrudEscrituracao
      titulo="Livro de saídas"
      descricao="Registro de saídas por CFOP — consolida notas de saída, cupons (NFC-e) e NFS-e prestadas da competência."
      icone={FileSpreadsheet}
      slug="livro-saidas"
      prefixoId="LVS"
      labelNovo="Nova linha"
      gerar={{
        label: "Gerar dos documentos",
        executar: gerarLivroSaidas,
        vazio: "Nenhum documento de saída lançado nesta competência.",
      }}
      campos={[
        { key: "cfop", label: "CFOP", type: "select", options: CFOPS, required: true, mono: true },
        { key: "descricao", label: "Operação", span: 2, calc: (l) => descricaoCfop(l.cfop) },
        { key: "documentos", label: "Qtd. documentos", mono: true, align: "right", placeholder: "1" },
        { key: "contabil", label: "Valor contábil (R$)", mono: true, align: "right", required: true, placeholder: "25.000,00" },
        { key: "base", label: "Base de ICMS (R$)", mono: true, align: "right" },
        { key: "icms", label: "ICMS debitado (R$)", mono: true, align: "right" },
        { key: "ipi", label: "IPI debitado (R$)", mono: true, align: "right" },
        { key: "isentas", label: "Isentas / não tributadas (R$)", mono: true, align: "right" },
        { key: "outras", label: "Outras (ST, bonificação) (R$)", mono: true, align: "right" },
        { key: "origem", label: "Origem", type: "select", options: ["Documentos fiscais", "Lançamento manual"] },
      ]}
      colunas={["cfop", "descricao", "documentos", "contabil", "base", "icms", "outras"]}
      totais={["contabil", "base", "icms", "outras"]}
      kpis={(l) => [
        { label: "CFOPs", valor: String(l.length) },
        { label: "Faturamento", valor: `R$ ${moedaBR(somar(l, "contabil"))}` },
        { label: "Débito de ICMS", valor: `R$ ${moedaBR(somar(l, "icms"))}` },
        { label: "Sem débito próprio", valor: `R$ ${moedaBR(somar(l, "outras"))}` },
      ]}
      alerta={() => {
        if (!empresa) return null;
        const pend = documentosPendentes(empresa.id, competencia);
        return pend
          ? `${pend} documento(s) em digitação ou divergentes na competência — o débito apurado pode estar incompleto.`
          : null;
      }}
      dicas={[
        "Saídas com ST (5405/6404) não têm débito próprio: o imposto já foi retido pelo substituto.",
        "Bonificações e remessas (5910/5949) entram sem base de cálculo, mas precisam constar no livro.",
        "NFS-e prestada (5933) é registrada para conferência do ISS — não gera ICMS.",
        "Cupons fiscais entram consolidados por dia, já líquidos dos cancelamentos.",
        "Regere o livro após qualquer correção nos documentos para a apuração ficar coerente.",
      ]}
    />
  );
}
