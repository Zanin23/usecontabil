import { Percent } from "lucide-react";
import CrudTabelaFinanceiro from "@/components/contabil/CrudTabelaFinanceiro";

export default function TabelaSimplesNacional() {
  return (
    <CrudTabelaFinanceiro
      titulo="Simples Nacional"
      descricao="Faixas de receita bruta em 12 meses, alíquota nominal e parcela a deduzir por anexo."
      icone={Percent}
      tabela="simples-nacional"
      prefixoId="SN"
      labelNovo="Nova faixa"
      vigencia="Competências de 2026"
      badgeKey="anexo"
      colunas={["anexo", "faixa", "receita", "aliq", "deduzir"]}
      campos={[
        {
          key: "anexo", label: "Anexo", type: "select", required: true,
          options: ["Anexo I — Comércio", "Anexo II — Indústria", "Anexo III — Serviços", "Anexo IV — Serviços", "Anexo V — Serviços"],
        },
        { key: "faixa", label: "Faixa", required: true, placeholder: "1ª" },
        { key: "receita", label: "Receita bruta 12m", mono: true, required: true, placeholder: "Até R$ 180.000" },
        { key: "aliq", label: "Alíquota nominal", mono: true, align: "right", required: true, placeholder: "4,00%" },
        { key: "deduzir", label: "Parcela a deduzir (R$)", mono: true, align: "right", placeholder: "0,00" },
      ]}
      padrao={[
        { anexo: "Anexo I — Comércio", faixa: "1ª", receita: "Até R$ 180.000", aliq: "4,00%", deduzir: "0,00" },
        { anexo: "Anexo I — Comércio", faixa: "2ª", receita: "Até R$ 360.000", aliq: "7,30%", deduzir: "5.940,00" },
        { anexo: "Anexo I — Comércio", faixa: "3ª", receita: "Até R$ 720.000", aliq: "9,50%", deduzir: "13.860,00" },
        { anexo: "Anexo I — Comércio", faixa: "4ª", receita: "Até R$ 1.800.000", aliq: "10,70%", deduzir: "22.500,00" },
        { anexo: "Anexo I — Comércio", faixa: "5ª", receita: "Até R$ 3.600.000", aliq: "14,30%", deduzir: "87.300,00" },
        { anexo: "Anexo I — Comércio", faixa: "6ª", receita: "Até R$ 4.800.000", aliq: "19,00%", deduzir: "378.000,00" },
        { anexo: "Anexo III — Serviços", faixa: "1ª", receita: "Até R$ 180.000", aliq: "6,00%", deduzir: "0,00" },
        { anexo: "Anexo III — Serviços", faixa: "2ª", receita: "Até R$ 360.000", aliq: "11,20%", deduzir: "9.360,00" },
        { anexo: "Anexo III — Serviços", faixa: "3ª", receita: "Até R$ 720.000", aliq: "13,50%", deduzir: "17.640,00" },
      ]}
      indicadores={(l) => [
        { label: "Faixas cadastradas", valor: String(l.length) },
        { label: "Anexos cobertos", valor: String(new Set(l.map((x) => x.anexo)).size) },
      ]}
      dicas={[
        "A alíquota efetiva é (RBT12 × alíquota nominal − parcela a deduzir) ÷ RBT12.",
        "Cadastre apenas os anexos que as empresas do grupo realmente utilizam.",
        "Revise as faixas a cada mudança de tabela na LC 123 para não distorcer a apuração.",
      ]}
    />
  );
}
