/**
 * Trilhas de aprendizado — agrupam lições por área do sistema.
 */
import { Settings2, Receipt, Wallet, Briefcase, type LucideIcon } from "lucide-react";
import { LICOES, type Licao } from "./conteudo";
import type { AreaAprendizado } from "./glossario";

export type Trilha = {
  slug: AreaAprendizado;
  titulo: string;
  subtitulo: string;
  icon: LucideIcon;
  licoes: Licao[];
};

const meta: { slug: AreaAprendizado; titulo: string; subtitulo: string; icon: LucideIcon }[] = [
  {
    slug: "preparativos",
    titulo: "Preparativos",
    subtitulo: "Cadastro das empresas, parâmetros e a rotina de fechamento por competência.",
    icon: Settings2,
  },
  {
    slug: "fiscal",
    titulo: "Fiscal",
    subtitulo: "Documentos, escrituração, apurações, obrigações acessórias, guias e auditoria.",
    icon: Receipt,
  },
  {
    slug: "financeiro",
    titulo: "Financeiro",
    subtitulo: "Regimes tributários, movimentos, DIFAL, substituição, DRE e conciliação.",
    icon: Wallet,
  },
  {
    slug: "administrativo",
    titulo: "Administrativo",
    subtitulo: "Contas e caixa, contratos, patrimônio, compras e controles internos.",
    icon: Briefcase,
  },
];

export const TRILHAS: Trilha[] = meta.map((m) => ({
  ...m,
  licoes: LICOES.filter((l) => l.area === m.slug),
}));

export const TRILHA_MAP = Object.fromEntries(TRILHAS.map((t) => [t.slug, t]));

export function trilhaDaLicao(slug: string) {
  return TRILHAS.find((t) => t.licoes.some((l) => l.slug === slug));
}
