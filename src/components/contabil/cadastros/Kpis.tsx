import { Card, CardContent } from "@/design-system/mj-design-system-db98fa";

/** Faixa de indicadores das telas de cadastros e contabilidade. */
export default function Kpis({ itens }: { itens: { rotulo: string; valor: string; dica?: string }[] }) {
  return (
    <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {itens.map((k) => (
        <Card key={k.rotulo} className="rounded-xl shadow-card">
          <CardContent className="p-4">
            <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{k.rotulo}</div>
            <div className="mt-1 font-display text-xl">{k.valor}</div>
            {k.dica ? <div className="mt-0.5 text-xs text-muted-foreground">{k.dica}</div> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
