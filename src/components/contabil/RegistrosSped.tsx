import { useState } from "react";
import { ChevronRight, FileCode2, Layers } from "lucide-react";
import { Badge } from "@/design-system/mj-design-system-db98fa";
import type { BlocoSped, RegistroSped } from "@/lib/obrigacoesStore";

/** Árvore hierárquica Bloco → Registro, com seleção para o painel lateral. */
export default function RegistrosSped({
  blocos,
  onSelect,
  filtro = "",
}: {
  blocos: BlocoSped[];
  onSelect: (r: RegistroSped, bloco: BlocoSped) => void;
  filtro?: string;
}) {
  const [abertos, setAbertos] = useState<string[]>(blocos.slice(0, 2).map((b) => b.codigo));
  const q = filtro.trim().toLowerCase();

  const visiveis = blocos
    .map((b) => ({
      ...b,
      registros: q
        ? b.registros.filter((r) => `${r.codigo} ${r.nome}`.toLowerCase().includes(q))
        : b.registros,
    }))
    .filter((b) => (q ? b.registros.length > 0 : true));

  if (!visiveis.length)
    return <p className="text-sm text-muted-foreground">Nenhum registro corresponde ao filtro.</p>;

  return (
    <div className="space-y-2">
      {visiveis.map((b) => {
        const aberto = q ? true : abertos.includes(b.codigo);
        const linhas = b.registros.reduce((s, r) => s + Math.max(1, r.ocorrencias), 0);
        return (
          <div key={b.codigo} className="rounded-2xl border border-border/70 overflow-hidden">
            <button
              type="button"
              onClick={() =>
                setAbertos((prev) =>
                  prev.includes(b.codigo) ? prev.filter((c) => c !== b.codigo) : [...prev, b.codigo],
                )
              }
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"
            >
              <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${aberto ? "rotate-90" : ""}`} />
              <Layers className="h-4 w-4 text-brand-orange shrink-0" />
              <span className="font-mono text-xs">Bloco {b.codigo}</span>
              <span className="text-sm truncate">{b.nome}</span>
              <span className="ml-auto flex items-center gap-2">
                {!b.obrigatorio && (
                  <Badge variant="secondary" className="rounded-full text-[10px]">facultativo</Badge>
                )}
                <Badge variant="secondary" className="rounded-full text-[10px]">
                  {b.registros.length} reg · {linhas} linhas
                </Badge>
              </span>
            </button>

            {aberto && (
              <div className="border-t border-border/70 divide-y divide-border/60">
                {b.registros.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onSelect(r, b)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 pl-11 text-left hover:bg-muted/40"
                  >
                    <FileCode2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-mono text-xs w-28 shrink-0">{r.codigo}</span>
                    <span className="text-sm truncate">{r.nome}</span>
                    <span className="ml-auto flex items-center gap-3 shrink-0">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {r.ocorrencias} ocorr.
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        linha {r.linha}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
