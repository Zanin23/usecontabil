import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import PageHeader from "@/components/contabil/PageHeader";
import StatusNuvem from "./StatusNuvem";

type Trilha = { rotulo: string; para?: string };

/**
 * Cabeçalho das telas de cadastros e contabilidade.
 *
 * Mantido como adaptador fino do `PageHeader`: as telas antigas continuam
 * chamando este componente, mas a trilha, o título e as ações saem do mesmo
 * componente padronizado do sistema (sem dois padrões de cabeçalho).
 */
export default function CabecalhoPagina({
  trilha, icone, titulo, descricao, acoes, children,
}: {
  trilha: Trilha[];
  icone: LucideIcon;
  titulo: string;
  descricao: string;
  acoes?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <PageHeader
      trail={[...trilha.map((t) => ({ label: t.rotulo, to: t.para })), { label: titulo }]}
      icon={icone}
      eyebrow={trilha.map((t) => t.rotulo).join(" · ")}
      title={titulo}
      description={descricao}
      actions={acoes}
      badges={<StatusNuvem />}
      trilhaAutomatica={false}
    >
      {children}
    </PageHeader>
  );
}
