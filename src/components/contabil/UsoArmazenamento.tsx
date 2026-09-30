import { useEffect, useState } from "react";
import { Database } from "lucide-react";
import { LIMITE_ESTIMADO_CARACTERES, usoArmazenamento, type UsoArmazenamento as Uso } from "@/lib/armazenamento";

const fmt = (n: number) => n.toLocaleString("pt-BR");
const NOMES: Record<string, string> = {
  "usecontabil.tributario.v1": "Base tributária (Financeiro)",
  "usecontabil.fiscal.docs.v1": "Documentos fiscais",
  "usecontabil.escrituracao.v1": "Escrituração",
  "usecontabil.apuracoes.v1": "Apurações",
  "usecontabil.obrigacoes.v1": "Obrigações",
  "usecontabil_guias_v1": "Guias",
};

/** Mostra quanto do armazenamento do navegador já foi usado — os dados do sistema ficam só neste navegador. */
export default function UsoArmazenamento() {
  const [uso, setUso] = useState<Uso | null>(null);
  useEffect(() => setUso(usoArmazenamento()), []);
  if (!uso) return null;
  const alerta = uso.percentual >= 80;
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Database className="h-4 w-4 text-brand-orange" /> Armazenamento deste navegador
        <span className={`ml-auto text-xs font-mono ${alerta ? "text-warn" : "text-muted-foreground"}`}>{uso.percentual}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={uso.percentual} aria-valuemin={0} aria-valuemax={100} aria-label="Uso do armazenamento do navegador">
        <div className={`h-full rounded-full ${alerta ? "bg-warn" : "bg-brand-orange"}`} style={{ width: `${uso.percentual}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        {fmt(uso.caracteres)} de ≈ {fmt(LIMITE_ESTIMADO_CARACTERES)} caracteres. Os lançamentos ficam apenas neste navegador; ao encher, novos dados deixam de ser salvos.
      </p>
      <ul className="text-xs text-muted-foreground space-y-0.5">
        {uso.maiores.map((m) => (
          <li key={m.chave} className="flex justify-between gap-3">
            <span className="truncate">{NOMES[m.chave] ?? m.chave}</span>
            <span className="font-mono">{fmt(m.caracteres)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
