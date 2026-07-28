import { ScrollText } from "lucide-react";
import CrudDocumentosFiscais from "@/components/contabil/CrudDocumentosFiscais";
import { diaDaCompetencia, participante, valorSeq } from "@/lib/fiscalDocMocks";
import { moedaBR, valorBR } from "@/lib/fiscalStore";

const TIPOS = ["Industrialização", "Assistência técnica", "Projeto", "Locação", "Consultoria"];
const MUNICIPIOS = ["São Paulo / SP", "Caxias do Sul / RS", "Recife / PE", "Curitiba / PR"];

export default function ServicosPrestados() {
  return (
    <CrudDocumentosFiscais
      titulo="Serviços prestados"
      descricao="NFS-e emitidas pelo grupo e ISS devido por município."
      icone={ScrollText}
      slug="servicos-prestados"
      prefixoId="NFSP"
      labelNovo="Nova NFS-e"
      labelImportar="Importar lote"
      dataKey="data"
      statusKey="status"
      statusOk="Emitida"
      valorKey="valor"
      colunas={["numero", "data", "participante", "municipio", "valor", "iss", "status"]}
      campos={[
        { key: "numero", label: "NFS-e", mono: true, required: true, placeholder: "NFS-e 9012" },
        { key: "municipio", label: "Município de incidência", type: "select", options: MUNICIPIOS },
        { key: "data", label: "Data de emissão", mono: true, required: true, placeholder: "01/07/2026" },
        { key: "participante", label: "Tomador", required: true },
        { key: "cnpj", label: "CNPJ do tomador", mono: true },
        { key: "tipo", label: "Natureza do serviço", type: "select", options: TIPOS },
        { key: "valor", label: "Valor do serviço (R$)", mono: true, align: "right", required: true },
        { key: "aliquota", label: "Alíquota de ISS", mono: true, align: "right", placeholder: "5,00%" },
        { key: "iss", label: "ISS devido (R$)", mono: true, align: "right" },
        { key: "issRetido", label: "ISS retido pelo tomador (R$)", mono: true, align: "right" },
        { key: "status", label: "Status", type: "select", options: ["Emitida", "Em digitação", "Cancelada"] },
        { key: "observacao", label: "Discriminação do serviço", type: "textarea", span: 2 },
      ]}
      exemplo={(comp) =>
        Array.from({ length: 5 }, (_, i) => {
          const p = participante(i + 3);
          const valor = valorSeq(i, 5_400, 1_620.8);
          const aliq = [0.05, 0.03, 0.02, 0.04][i % 4];
          return {
            numero: `NFS-e ${9012 + i * 2}`,
            municipio: MUNICIPIOS[i % MUNICIPIOS.length],
            data: diaDaCompetencia(comp, i + 2),
            participante: p.nome,
            cnpj: p.cnpj,
            tipo: TIPOS[i % TIPOS.length],
            valor,
            aliquota: `${(aliq * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%`,
            iss: moedaBR(valorBR(valor) * aliq),
            issRetido: i % 3 === 0 ? moedaBR(valorBR(valor) * aliq) : "0,00",
            status: i === 3 ? "Em digitação" : "Emitida",
            observacao: "",
          };
        })
      }
      indicadoresExtras={(docs) => [
        {
          label: "ISS devido",
          valor: `R$ ${moedaBR(docs.reduce((s, d) => s + valorBR(d.iss) - valorBR(d.issRetido), 0))}`,
        },
      ]}
      dicas={[
        "O ISS retido pelo tomador é abatido do ISS próprio a recolher no município.",
        "Cada município tem alíquota e prazo próprios — confira antes de gerar a guia.",
        "Notas em digitação não entram no resumo de ISS da competência.",
      ]}
    />
  );
}
