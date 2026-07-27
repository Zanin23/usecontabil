import { ScrollText } from "lucide-react";
import CrudEmpresa from "@/components/contabil/CrudEmpresa";

export default function EmpresaInscricoes() {
  return (
    <CrudEmpresa
      titulo="Inscrições"
      descricao="Inscrições federais, estaduais, municipais e específicas da empresa do grupo."
      icone={ScrollText}
      colecao="inscricoes"
      prefixoId="INS"
      labelNovo="Nova inscrição"
      statusKey="situacao"
      colunas={["tipo", "orgao", "numero", "inicio", "situacao"]}
      campos={[
        {
          key: "tipo", label: "Tipo de inscrição", type: "select", required: true,
          options: ["CNPJ", "Inscrição Estadual", "Inscrição Estadual ST", "Inscrição Municipal", "CEI/CNO", "NIRE", "SUFRAMA", "Registro em conselho"],
        },
        { key: "orgao", label: "Órgão emissor", required: true, placeholder: "Receita Federal, SEFAZ/MG, Prefeitura…" },
        { key: "numero", label: "Número", required: true, mono: true, placeholder: "Somente o número da inscrição" },
        { key: "uf", label: "UF", placeholder: "MG" },
        { key: "inicio", label: "Início de vigência", type: "date" },
        {
          key: "situacao", label: "Situação", type: "select",
          options: ["Ativa", "Suspensa", "Baixada", "Isenta", "Não se aplica"],
        },
        { key: "observacao", label: "Observações", type: "textarea", span: 2 },
      ]}
      dicas={[
        "O CNPJ e a natureza jurídica saem do cartão CNPJ da Receita Federal.",
        "A Inscrição Estadual pode ser conferida no SINTEGRA do estado da unidade.",
        "A Inscrição Municipal é emitida junto com o alvará e é exigida para NFS-e.",
        "Marque 'Isenta' quando a unidade não estiver obrigada — evita pendência no fechamento.",
      ]}
    />
  );
}
