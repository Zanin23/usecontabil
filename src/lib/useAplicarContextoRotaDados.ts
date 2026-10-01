import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { COMPETENCIAS, useCompetencia } from "@/lib/competencia";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { lerParametrosRotaDados } from "@/lib/rotasDados";

/** Sincroniza os filtros explícitos da URL com o contexto compartilhado do app. */
export function useAplicarContextoRotaDados() {
  const [searchParams] = useSearchParams();
  const query = searchParams.toString();
  const destino = lerParametrosRotaDados(query);
  const assinatura = `${destino.empresaId ?? ""}\u0000${destino.competencia ?? ""}`;
  const assinaturaAnterior = useRef<string | null>(null);
  const contextoPendente = useRef<{ empresaId: string | null; competencia: string | null } | null>(null);
  const { empresas, empresaId, setEmpresaId } = useEmpresaAtual();
  const { competencia, setCompetencia } = useCompetencia();

  useEffect(() => {
    // Trata empresa e competência como contexto de entrada. Mudanças feitas
    // depois pelo usuário não devem ser sobrescritas enquanto a query persiste.
    if (assinaturaAnterior.current !== assinatura) {
      assinaturaAnterior.current = assinatura;
      contextoPendente.current = {
        empresaId: destino.empresaId,
        competencia: destino.competencia,
      };
    }

    const pendente = contextoPendente.current;
    if (!pendente) return;

    if (pendente.empresaId) {
      if (empresas.some((empresa) => empresa.id === pendente.empresaId)) {
        if (pendente.empresaId !== empresaId) setEmpresaId(pendente.empresaId);
        pendente.empresaId = null;
      }
    }

    if (pendente.competencia) {
      if (COMPETENCIAS.includes(pendente.competencia) && pendente.competencia !== competencia) {
        setCompetencia(pendente.competencia);
      }
      pendente.competencia = null;
    }

    if (!pendente.empresaId && !pendente.competencia) contextoPendente.current = null;
  }, [assinatura, destino.empresaId, destino.competencia, empresas, empresaId, competencia, setEmpresaId, setCompetencia]);
}
