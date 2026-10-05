// ============================================================================
// Retorno ao processo de origem.
//
// Quando o usuário é levado de uma tela para cadastrar algo que faltava, a
// rota de destino recebe `?voltar=/rota/original`. Este componente mostra a
// faixa "você está aqui para resolver X" e devolve o usuário ao processo —
// eliminando a navegação manual de volta.
// ============================================================================
import { useNavigate, useSearchParams } from "react-router-dom";
import { CornerUpLeft } from "lucide-react";
import { Button } from "@/design-system/mj-design-system-db98fa";
import { trilhaDaRota } from "@/lib/ux/navModelo";

export function useRetorno() {
  const [params] = useSearchParams();
  const voltar = params.get("voltar");
  return {
    voltar: voltar && voltar.startsWith("/") ? voltar : null,
    temRetorno: Boolean(voltar && voltar.startsWith("/")),
  };
}

export default function RetornoProcesso({
  /** Texto do que está sendo resolvido (ex.: "cadastrar o plano de contas"). */
  resolvendo,
  className,
}: {
  resolvendo?: string;
  className?: string;
}) {
  const { voltar } = useRetorno();
  const navigate = useNavigate();
  if (!voltar) return null;

  const origem = trilhaDaRota(voltar);

  return (
    <div
      className={
        className ??
        "mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-primary/35 bg-primary/[0.06] px-4 py-3 text-sm"
      }
    >
      <CornerUpLeft className="h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        Você está aqui para
        {resolvendo ? ` ${resolvendo} ` : " resolver uma pendência "}
        e depois volta para{" "}
        <strong className="font-medium">
          {origem ? origem.item.titulo : "o processo anterior"}
        </strong>
        .
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 rounded-lg"
        onClick={() => navigate(voltar)}
      >
        Voltar para {origem ? origem.item.titulo : "o processo"}
      </Button>
    </div>
  );
}
