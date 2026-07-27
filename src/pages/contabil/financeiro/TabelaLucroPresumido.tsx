import { TrendingUp } from "lucide-react";
import CrudTabelaFinanceiro from "@/components/contabil/CrudTabelaFinanceiro";

export default function TabelaLucroPresumido() {
  return (
    <CrudTabelaFinanceiro
      titulo="Lucro Presumido"
      descricao="Percentuais de presunção de IRPJ e CSLL por atividade, além das alíquotas cumulativas de PIS/COFINS."
      icone={TrendingUp}
      tabela="lucro-presumido"
      prefixoId="LP"
      labelNovo="Nova atividade"
      vigencia="Competências de 2026"
      badgeKey="atividade"
      colunas={["atividade", "irpj", "csll", "pis", "cofins"]}
      campos={[
        { key: "atividade", label: "Atividade", required: true, span: 2, placeholder: "Comércio / Indústria" },
        { key: "irpj", label: "Presunção IRPJ", mono: true, align: "right", required: true, placeholder: "8,00%" },
        { key: "csll", label: "Presunção CSLL", mono: true, align: "right", required: true, placeholder: "12,00%" },
        { key: "pis", label: "PIS cumulativo", mono: true, align: "right", placeholder: "0,65%" },
        { key: "cofins", label: "COFINS cumulativo", mono: true, align: "right", placeholder: "3,00%" },
      ]}
      padrao={[
        { atividade: "Comércio / Indústria", irpj: "8,00%", csll: "12,00%", pis: "0,65%", cofins: "3,00%" },
        { atividade: "Transporte de carga", irpj: "8,00%", csll: "12,00%", pis: "0,65%", cofins: "3,00%" },
        { atividade: "Transporte de passageiros", irpj: "16,00%", csll: "12,00%", pis: "0,65%", cofins: "3,00%" },
        { atividade: "Serviços em geral", irpj: "32,00%", csll: "32,00%", pis: "0,65%", cofins: "3,00%" },
        { atividade: "Serviços hospitalares", irpj: "8,00%", csll: "12,00%", pis: "0,65%", cofins: "3,00%" },
        { atividade: "Revenda de combustíveis", irpj: "1,60%", csll: "12,00%", pis: "0,65%", cofins: "3,00%" },
      ]}
      indicadores={(l) => [
        { label: "Atividades cadastradas", valor: String(l.length) },
      ]}
      dicas={[
        "A base do IRPJ/CSLL é a receita bruta multiplicada pelo percentual de presunção da atividade.",
        "Empresas com mais de uma atividade devem segregar as receitas por percentual.",
        "No presumido o PIS/COFINS é cumulativo: não há aproveitamento de créditos sobre insumos.",
      ]}
    />
  );
}
