import { Receipt } from "lucide-react";
import CrudDocumentosFiscais from "@/components/contabil/CrudDocumentosFiscais";
import { diaDaCompetencia, participante, valorSeq } from "@/lib/fiscalDocMocks";
import { moedaBR, valorBR } from "@/lib/fiscalStore";

const TIPOS = ["Consultoria", "Manutenção", "Transporte", "Locação", "Tecnologia"];

export default function ServicosTomados() {
  return (
    <CrudDocumentosFiscais
      titulo="Serviços tomados"
      descricao="NFS-e recebidas de prestadores, com ISS e retenções na fonte."
      icone={Receipt}
      slug="servicos-tomados"
      prefixoId="NFST"
      labelNovo="Nova NFS-e tomada"
      labelImportar="Importar XML (NF-e)"
      dataKey="data"
      statusKey="status"
      statusOk="Escriturado"
      valorKey="valor"
      colunas={["numero", "data", "participante", "tipo", "valor", "issRetido", "status"]}
      campos={[
        { key: "numero", label: "NFS-e", mono: true, required: true, placeholder: "NFS-e 4821" },
        { key: "municipio", label: "Município do serviço", placeholder: "São Paulo / SP" },
        { key: "data", label: "Data do serviço", mono: true, required: true, placeholder: "01/07/2026" },
        { key: "participante", label: "Prestador", type: "participante", required: true, ajuda: "Escolha no cadastro para trazer CNPJ, UF e IE sem digitar de novo." },
        { key: "cnpj", label: "CNPJ do prestador", mono: true },
        { key: "uf", label: "UF do participante", placeholder: "SP", ajuda: "Herdada do cadastro; entra no DIFAL e na partilha do ICMS entre estados." },
        { key: "tipo", label: "Natureza do serviço", type: "select", options: TIPOS },
        { key: "valor", label: "Valor do serviço (R$)", mono: true, align: "right", required: true },
        { key: "issRetido", label: "ISS retido (R$)", mono: true, align: "right" },
        { key: "irrf", label: "IRRF (R$)", mono: true, align: "right" },
        { key: "pccss", label: "PIS/COFINS/CSLL (R$)", mono: true, align: "right" },
        { key: "inss", label: "INSS retido (R$)", mono: true, align: "right" },
        { key: "status", label: "Status", type: "select", options: ["Escriturado", "Pendente", "Cancelado"] },
        { key: "observacao", label: "Observação", type: "textarea", span: 2 },
      ]}
      exemplo={(comp) =>
        Array.from({ length: 5 }, (_, i) => {
          const p = participante(i + 1);
          const valor = valorSeq(i, 3_200, 940.5);
          const v = valorBR(valor);
          return {
            numero: `NFS-e ${4821 + i * 3}`,
            municipio: ["São Paulo / SP", "Caxias do Sul / RS", "Recife / PE"][i % 3],
            data: diaDaCompetencia(comp, i),
            participante: p.nome,
            cnpj: p.cnpj,
            tipo: TIPOS[i % TIPOS.length],
            valor,
            issRetido: i % 2 === 0 ? moedaBR(v * 0.05) : "0,00",
            irrf: moedaBR(v * 0.015),
            pccss: moedaBR(v * 0.0465),
            inss: "0,00",
            status: i === 4 ? "Pendente" : "Escriturado",
            observacao: "",
          };
        })
      }
      indicadoresExtras={(docs) => [
        {
          label: "Retenções",
          valor: `R$ ${moedaBR(
            docs.reduce(
              (s, d) => s + valorBR(d.issRetido) + valorBR(d.irrf) + valorBR(d.pccss) + valorBR(d.inss),
              0,
            ),
          )}`,
        },
      ]}
      dicas={[
        "Retenções na fonte geram guias próprias — confira os vencimentos antes do encerramento.",
        "ISS retido é devido ao município do prestador ou do tomador conforme o item da lista de serviços.",
        "Serviços de cessão de mão de obra exigem retenção de 11% de INSS.",
      ]}
    />
  );
}
