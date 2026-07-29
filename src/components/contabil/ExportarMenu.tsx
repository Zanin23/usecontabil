import { useState } from "react";
import { CalendarClock, Download } from "lucide-react";
import { toast } from "sonner";
import {
  Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/design-system/mj-design-system-db98fa";
import {
  FORMATOS, agendarExportacao, exportar,
  type Formato, type Registro,
} from "@/lib/adminStore";

type Props = {
  nome: string;
  colunas: { key: string; label: string }[];
  linhas: Registro[];
  label?: string;
};

/** Menu de exportação read-only: Excel, CSV, PDF, JSON, XML + agendamento. */
export default function ExportarMenu({ nome, colunas, linhas, label = "Exportar" }: Props) {
  const [open, setOpen] = useState(false);

  const run = (f: Formato) => {
    if (!linhas.length) { toast.error("Nada para exportar nesta consulta."); return; }
    exportar(f, nome, colunas, linhas);
    toast.success(`Exportação ${f.toUpperCase()} gerada`, { description: `${linhas.length} registros · ${nome}` });
  };

  const agendar = (frequencia: "Diária" | "Semanal" | "Mensal") => {
    agendarExportacao({ nome, recurso: nome, formato: "excel", frequencia, destino: "E-mail do responsável" });
    toast.success(`Exportação ${frequencia.toLowerCase()} agendada`, { description: nome });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full">
          <Download className="h-4 w-4" /> {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 rounded-2xl">
        <DropdownMenuLabel className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
          Formato
        </DropdownMenuLabel>
        {FORMATOS.map((f) => (
          <DropdownMenuItem key={f.id} onSelect={() => run(f.id)} className="rounded-xl">
            {f.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
          Agendar automática
        </DropdownMenuLabel>
        {(["Diária", "Semanal", "Mensal"] as const).map((f) => (
          <DropdownMenuItem key={f} onSelect={() => agendar(f)} className="rounded-xl">
            <CalendarClock className="h-4 w-4" /> {f}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
