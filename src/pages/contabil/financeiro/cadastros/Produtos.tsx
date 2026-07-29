import { Package } from "lucide-react";
import { toast } from "sonner";
import CrudTributario, { type CampoTributario } from "@/components/contabil/CrudTributario";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { useCompetencia } from "@/lib/competencia";
import {
  brl, carregarDemonstracao, empresaDB, removerProduto, salvarProduto, useTributario,
  type Produto,
} from "@/lib/tributarioStore";

const CAMPOS: CampoTributario[] = [
  { key: "codigo", label: "Código interno", required: true, mono: true, coluna: true, span: 1, ajuda: "Código usado internamente e no XML do documento fiscal (cProd)." },
  { key: "descricao", label: "Descrição", required: true, coluna: true, span: 2, ajuda: "Descrição comercial que será impressa no documento fiscal." },
  { key: "ncm", label: "NCM", required: true, mono: true, coluna: true, span: 1, ajuda: "Nomenclatura Comum do Mercosul, 8 dígitos. Consulte a TIPI ou o Portal Único Siscomex." },
  { key: "cest", label: "CEST", mono: true, span: 1, ajuda: "Obrigatório para mercadorias sujeitas à substituição tributária (Convênio ICMS 142/2018)." },
  { key: "gtin", label: "GTIN / EAN", mono: true, span: 1, ajuda: "Código de barras do produto. Use SEM GTIN quando não houver." },
  { key: "origem", label: "Origem", type: "select", options: ["0", "1", "2", "3", "4", "5", "6", "7", "8"], span: 1, ajuda: "0 nacional, 1 importação direta, 2 mercado interno importado... define alíquota interestadual de 4%." },
  { key: "cfopPadrao", label: "CFOP padrão", required: true, mono: true, coluna: true, span: 1, ajuda: "CFOP sugerido na venda. 5xxx dentro do estado, 6xxx interestadual." },
  { key: "cstIcms", label: "CST ICMS", mono: true, span: 1, ajuda: "Tributação do ICMS no regime normal. 00 tributado, 10 com ST, 40 isento, 60 ST retido." },
  { key: "csosn", label: "CSOSN", mono: true, span: 1, ajuda: "Usado apenas por empresas do Simples Nacional no lugar do CST." },
  { key: "aliqIcms", label: "Alíquota ICMS %", type: "number", align: "right", mono: true, span: 1, ajuda: "Alíquota interna aplicável. Deixe 0 para usar a alíquota padrão da UF." },
  { key: "aliqIpi", label: "Alíquota IPI %", type: "number", align: "right", mono: true, span: 1, ajuda: "Conforme a TIPI para o NCM informado." },
  { key: "aliqPis", label: "Alíquota PIS %", type: "number", align: "right", mono: true, span: 1, ajuda: "0,65% cumulativo, 1,65% não cumulativo, 0 para monofásico revenda." },
  { key: "aliqCofins", label: "Alíquota COFINS %", type: "number", align: "right", mono: true, span: 1, ajuda: "3% cumulativo, 7,6% não cumulativo." },
  { key: "mva", label: "MVA / IVA-ST %", type: "number", align: "right", mono: true, span: 1, ajuda: "Margem de valor agregado do protocolo/convênio aplicável ao produto." },
  { key: "unidade", label: "Unidade", span: 1, ajuda: "UN, KG, PC, CX, L…" },
  { key: "peso", label: "Peso (kg)", type: "number", span: 1 },
  { key: "grupo", label: "Grupo", span: 1 },
  { key: "marca", label: "Marca", span: 1 },
  { key: "fabricante", label: "Fabricante", span: 1 },
  { key: "codigoAnp", label: "Código ANP", mono: true, span: 1, ajuda: "Obrigatório para combustíveis e lubrificantes." },
  { key: "beneficio", label: "Benefício fiscal", span: 1, ajuda: "Código do benefício (cBenef) quando houver redução, isenção ou diferimento." },
  { key: "precoPadrao", label: "Preço padrão", type: "number", align: "right", mono: true, coluna: true, span: 1 },
  { key: "ativo", label: "Ativo", type: "switch", coluna: true, span: 1 },
];

export default function Produtos() {
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const empresaId = empresa?.id ?? "";
  const produtos = useTributario(() => empresaDB(empresaId).produtos, [empresaId]);

  const ativos = produtos.filter((p) => p.ativo);
  const st = produtos.filter((p) => (p.mva ?? 0) > 0);
  const semNcm = produtos.filter((p) => !p.ncm);

  return (
    <CrudTributario
      titulo="Produtos"
      descricao="Cadastro fiscal completo dos produtos: NCM, CEST, origem, CFOP, CST/CSOSN, MVA e benefícios que alimentam o motor tributário."
      icone={Package}
      campos={CAMPOS}
      registros={produtos as unknown as ({ id: string } & Record<string, unknown>)[]}
      prefixoId="prd"
      labelNovo="Novo produto"
      onSalvar={(r) => salvarProduto(empresaId, r as unknown as Produto)}
      onRemover={(id) => removerProduto(empresaId, id)}
      onDemonstracao={empresaId ? () => { carregarDemonstracao(empresaId, competencia, empresa?.regime); toast.success("Base de demonstração carregada."); } : undefined}
      kpis={[
        { label: "Produtos cadastrados", valor: String(produtos.length) },
        { label: "Ativos", valor: String(ativos.length) },
        { label: "Sujeitos à ST", valor: String(st.length) },
        { label: "Preço médio", valor: brl(produtos.length ? produtos.reduce((s, p) => s + (p.precoPadrao || 0), 0) / produtos.length : 0) },
      ]}
      dicas={[
        semNcm.length ? `${semNcm.length} produto(s) sem NCM — o motor de regras bloqueia a emissão nesse caso.` : "Todos os produtos possuem NCM informado.",
        "A MVA preenchida ativa automaticamente o cálculo de ICMS-ST e FCP-ST na emissão.",
        "Produtos com origem 1, 2, 3 ou 8 usam alíquota interestadual de 4% (Resolução SF 13/2012).",
        "O CFOP padrão é sugerido no item do documento e pode ser ajustado por operação.",
      ]}
    />
  );
}
