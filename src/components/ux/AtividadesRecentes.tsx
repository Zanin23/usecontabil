// ============================================================================
// Últimas atividades — o que foi criado ou alterado por último no sistema.
// ============================================================================
import { Link } from "react-router-dom";
import { Inbox } from "lucide-react";
import { Card, CardContent, cn } from "@/design-system/mj-design-system-db98fa";
import { useAtividades } from "@/lib/ux/atividades";
import { useEmpresaAtual } from "@/lib/empresaAtual";

const COR_TIPO: Record<string, string> = {
  Lançamento: "bg-brand-purple/12 text-brand-purple",
  Documento: "bg-brand-orange/12 text-brand-orange",
  Cadastro: "bg-brand-blue/12 text-brand-blue",
  Guia: "bg-brand-pink/12 text-brand-pink",
  Auditoria: "bg-muted text-muted-foreground",
};

const dataHora = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

export default function AtividadesRecentes({
  className,
  limite = 8,
}: {
  className?: string;
  limite?: number;
}) {
  const { empresaId } = useEmpresaAtual();
  const itens = useAtividades(empresaId, limite);

  return (
    <Card className={cn("rounded-xl border-border/70", className)}>
      <CardContent className="p-5">
        <h2 className="font-display text-xl">Últimas atividades</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Registros criados ou alterados recentemente, em qualquer módulo.
        </p>

        {itens.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-8 text-center">
            <Inbox className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nada ainda. Quando você cadastrar ou lançar algo, aparece aqui.
            </p>
            <Link to="/preparativos/cadastros/empresas" className="text-xs text-primary underline">
              Começar pelo cadastro da empresa
            </Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border/60">
            {itens.map((a) => (
              <li key={a.id}>
                <Link
                  to={a.rota}
                  className="flex items-start gap-3 py-2 transition hover:bg-accent/40"
                >
                  <span
                    className={cn(
                      "mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                      COR_TIPO[a.tipo] ?? "bg-muted text-muted-foreground",
                    )}
                  >
                    {a.tipo}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{a.titulo}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {a.detalhe}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {dataHora(a.quando)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
