import { Users2 } from "lucide-react";
import { toast } from "sonner";
import CrudTributario, { type CampoTributario } from "@/components/contabil/CrudTributario";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { useCompetencia } from "@/lib/competencia";
import {
  carregarDemonstracao, empresaDB, removerParceiro, salvarParceiro, UFS, useTributario,
  type Parceiro,
} from "@/lib/tributarioStore";

const CAMPOS: CampoTributario[] = [
  { key: "tipo", label: "Tipo", type: "select", options: ["Cliente", "Fornecedor", "Ambos"], coluna: true, span: 1, ajuda: "Define em quais operações o participante pode ser usado." },
  { key: "nome", label: "Nome / razão social", required: true, coluna: true, span: 2, ajuda: "Razão social exatamente como consta no CNPJ." },
  { key: "documento", label: "CPF / CNPJ", required: true, mono: true, coluna: true, span: 1, ajuda: "Determina a incidência das retenções de IRRF, CSLL, PIS e COFINS." },
  { key: "ie", label: "Inscrição estadual", mono: true, span: 1, ajuda: "Use ISENTO quando o participante não for inscrito." },
  { key: "im", label: "Inscrição municipal", mono: true, span: 1, ajuda: "Necessária para NFS-e e retenção de ISS no município." },
  { key: "suframa", label: "SUFRAMA", mono: true, span: 1, ajuda: "Inscrição na Zona Franca de Manaus — habilita isenção de ICMS/IPI." },
  { key: "crt", label: "CRT", type: "select", options: ["1", "2", "3", "4", "—"], span: 1, ajuda: "1 Simples Nacional, 2 Simples com excesso de sublimite, 3 regime normal, 4 MEI." },
  { key: "regime", label: "Regime tributário", type: "select", options: ["Simples Nacional", "Lucro Presumido", "Lucro Real", "MEI", "Pessoa física", "Imune/Isento"], coluna: true, span: 1 },
  { key: "uf", label: "UF", type: "select", options: [...UFS], mono: true, coluna: true, span: 1, ajuda: "Define alíquota interestadual, DIFAL e protocolos de ST." },
  { key: "municipio", label: "Município", span: 1 },
  { key: "contribuinte", label: "Contribuinte de ICMS", type: "switch", coluna: true, span: 1, ajuda: "Não contribuinte em operação interestadual gera DIFAL pela EC 87/2015." },
  { key: "consumidorFinal", label: "Consumidor final", type: "switch", span: 1 },
  { key: "retencoes", label: "Retenções aplicáveis", span: 2, ajuda: "Ex.: ISS, IRRF, INSS, CSLL/PIS/COFINS." },
  { key: "limiteCredito", label: "Limite de crédito", type: "number", align: "right", mono: true, span: 1 },
  { key: "responsavel", label: "Responsável interno", span: 1 },
  { key: "ativo", label: "Ativo", type: "switch", coluna: true, span: 1 },
];

export default function ClientesFornecedores() {
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const empresaId = empresa?.id ?? "";
  const parceiros = useTributario(() => empresaDB(empresaId).parceiros, [empresaId]);

  const clientes = parceiros.filter((p) => p.tipo !== "Fornecedor");
  const fornecedores = parceiros.filter((p) => p.tipo !== "Cliente");
  const semDoc = parceiros.filter((p) => p.documento.replace(/\D/g, "").length < 11);

  return (
    <CrudTributario
      titulo="Clientes e fornecedores"
      descricao="Cadastro fiscal dos participantes: documento, inscrições, SUFRAMA, CRT, regime, contribuinte e retenções que orientam a tributação."
      icone={Users2}
      campos={CAMPOS}
      registros={parceiros as unknown as ({ id: string } & Record<string, unknown>)[]}
      prefixoId="par"
      labelNovo="Novo participante"
      onSalvar={(r) => salvarParceiro(empresaId, r as unknown as Parceiro)}
      onRemover={(id) => removerParceiro(empresaId, id)}
      onDemonstracao={empresaId ? () => { carregarDemonstracao(empresaId, competencia, empresa?.regime); toast.success("Base de demonstração carregada."); } : undefined}
      kpis={[
        { label: "Participantes", valor: String(parceiros.length) },
        { label: "Clientes", valor: String(clientes.length) },
        { label: "Fornecedores", valor: String(fornecedores.length) },
        { label: "Cadastros incompletos", valor: String(semDoc.length) },
      ]}
      dicas={[
        "Participante não contribuinte em outra UF aciona automaticamente o cálculo de DIFAL.",
        "Pessoa jurídica em serviços dispara retenção de IRRF 1,5% e CSLL/PIS/COFINS 4,65% acima de R$ 215,05.",
        "Inscrição municipal é obrigatória para NFS-e com retenção de ISS na fonte.",
        "SUFRAMA habilita isenção de ICMS e IPI em remessas para a Zona Franca de Manaus.",
      ]}
    />
  );
}
