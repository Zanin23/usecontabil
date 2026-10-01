import { CircleAlert } from "lucide-react";

/** Erros de validação exibidos dentro do formulário (além do aviso rápido). */
export default function ListaErros({ erros }: { erros: string[] }) {
  if (!erros.length) return null;
  return (
    <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <div className="mb-1 flex items-center gap-2 font-medium text-destructive">
        <CircleAlert className="h-4 w-4" /> Corrija antes de salvar
      </div>
      <ul className="list-disc space-y-0.5 pl-5 text-destructive/90">
        {erros.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </div>
  );
}
