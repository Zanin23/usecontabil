// ============================================================================
// Seletor de participante — evita redigitar o que já está no cadastro único.
//
// Nos formulários de documento fiscal, o usuário digita o nome do cliente,
// fornecedor ou transportador e o sistema procura no cadastro: ao escolher,
// CNPJ, UF e IE vêm prontos (nunca pedir duas vezes a mesma informação).
// Se o cadastro estiver vazio, o próprio seletor leva para cadastrar.
// ============================================================================
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Search, UserRoundPlus } from "lucide-react";
import {
  Button, Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
  Popover, PopoverContent, PopoverTrigger, cn,
} from "@/design-system/mj-design-system-db98fa";
import {
  ehCliente, ehFornecedor, useParticipantes, type Participante,
} from "@/lib/cadastrosStore";

export type PapelParticipante = "Cliente" | "Fornecedor" | "Transportadora" | "Todos";

const ROTULO: Record<PapelParticipante, string> = {
  Cliente: "clientes",
  Fornecedor: "fornecedores",
  Transportadora: "transportadoras",
  Todos: "participantes",
};

export const ROTA_PARTICIPANTES = "/preparativos/cadastros/participantes";

/** Um participante serve para o papel pedido? */
export function participanteServe(p: Participante, papel: PapelParticipante): boolean {
  if (papel === "Todos") return true;
  if (papel === "Cliente") return ehCliente(p);
  if (papel === "Fornecedor") return ehFornecedor(p);
  return p.tipo === "Transportadora" || ehFornecedor(p);
}

export default function SeletorParticipante({
  papel = "Todos",
  selecionadoId,
  onEscolher,
  className,
}: {
  papel?: PapelParticipante;
  /** Id do participante herdado — marca a escolha atual na lista. */
  selecionadoId?: string | null;
  onEscolher: (p: Participante) => void;
  className?: string;
}) {
  const participantes = useParticipantes().filter((p) => p.situacao === "Ativo");
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return participantes
      .filter((p) => participanteServe(p, papel))
      .filter((p) =>
        termo
          ? [p.nome, p.fantasia, p.documento, p.codigo, p.municipio, p.uf]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(termo)
          : true,
      )
      .slice(0, 50);
  }, [participantes, papel, busca]);

  const doPapel = participantes.filter((p) => participanteServe(p, papel)).length;

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("h-9 shrink-0 rounded-full", className)}
          title={`Buscar ${ROTULO[papel]} já cadastrados para preencher CNPJ, UF e IE automaticamente`}
        >
          <Search className="mr-1.5 h-3.5 w-3.5" />
          Buscar no cadastro
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(26rem,calc(100vw-2rem))] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            value={busca}
            onValueChange={setBusca}
            placeholder={`Nome, CNPJ ou código do ${ROTULO[papel].replace(/s$/, "")}…`}
          />
          <CommandList>
            {lista.length === 0 ? (
              <CommandEmpty className="px-3 py-6 text-center text-xs text-muted-foreground">
                {doPapel === 0
                  ? `Nenhum ${ROTULO[papel].replace(/s$/, "")} cadastrado ainda.`
                  : "Nenhum participante encontrado com esse termo."}
                <div className="mt-3">
                  <Button asChild size="sm" variant="outline" className="h-8 rounded-full text-xs">
                    <Link to={ROTA_PARTICIPANTES}>
                      <UserRoundPlus className="mr-1.5 h-3.5 w-3.5" />
                      Cadastrar participante
                    </Link>
                  </Button>
                </div>
              </CommandEmpty>
            ) : (
              <CommandGroup heading={`${lista.length} de ${doPapel} ${ROTULO[papel]}`}>
                {lista.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={p.id}
                    onSelect={() => {
                      onEscolher(p);
                      setAberto(false);
                      setBusca("");
                    }}
                    className="flex items-start gap-2"
                  >
                    <Check
                      className={cn(
                        "mt-0.5 h-3.5 w-3.5 shrink-0",
                        selecionadoId === p.id ? "text-success" : "text-transparent",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{p.nome}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {p.documento}
                        {p.municipio ? ` · ${p.municipio}` : ""}
                        {p.uf ? `/${p.uf}` : ""}
                        {p.ie ? ` · IE ${p.ie}` : ""}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
        <div className="border-t border-border/60 px-3 py-2">
          <Link
            to={ROTA_PARTICIPANTES}
            className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Não achou? Abrir o cadastro de participantes
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
