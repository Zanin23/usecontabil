import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn, Input } from "@/design-system/mj-design-system-db98fa";
import type { Conta } from "@/lib/planoContasStore";
import type { Participante } from "@/lib/cadastrosStore";
import type { CentroCusto } from "@/lib/planoContasStore";
import { soDigitos } from "@/lib/documentos";
import { normalizarBusca } from "@/lib/busca";


type Props<T> = {
  itens: T[];
  valor?: string;
  onChange: (id: string | undefined) => void;
  idDe: (item: T) => string;
  /** Texto mostrado no campo quando o item está escolhido. */
  rotulo: (item: T) => string;
  /** Coluna curta à esquerda na lista (ex.: código). */
  codigo?: (item: T) => string;
  /** Texto principal na lista. */
  titulo: (item: T) => string;
  /** Texto miúdo à direita na lista. */
  detalhe?: (item: T) => string | undefined;
  /** Pontua o item para o termo digitado: 2 = exato, 1 = contém, 0 = fora. */
  pontuar: (item: T, termo: string) => number;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  invalido?: boolean;
  permitirLimpar?: boolean;
  vazio?: string;
};

/**
 * Campo de busca com lista (combobox acessível): digite código, reduzido ou parte do nome, use as
 * setas e Enter para escolher. Usado para contas, clientes/fornecedores e centros de custo.
 */
export default function SeletorBusca<T>({
  itens, valor, onChange, idDe, rotulo, codigo, titulo, detalhe, pontuar, placeholder, ariaLabel, className,
  disabled, invalido, permitirLimpar = true, vazio = "Nada encontrado.",
}: Props<T>) {
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const idLista = useId();
  const selecionado = useMemo(() => itens.find((i) => idDe(i) === valor), [itens, valor, idDe]);

  const opcoes = useMemo(() => {
    const termo = normalizarBusca(texto);
    if (!termo) return itens.slice(0, 60);
    return itens
      .map((i) => ({ i, p: pontuar(i, termo) }))
      .filter((x) => x.p > 0)
      .sort((a, b) => b.p - a.p)
      .slice(0, 60)
      .map((x) => x.i);
  }, [itens, texto, pontuar]);

  const escolher = (item?: T) => {
    onChange(item ? idDe(item) : undefined);
    setAberto(false);
    setTexto("");
  };

  const aoTeclar = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAberto(true);
      setAtivo((a) => Math.min(a + 1, Math.max(opcoes.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      if (aberto && opcoes[ativo]) {
        e.preventDefault();
        escolher(opcoes[ativo]);
      }
    } else if (e.key === "Escape") {
      setAberto(false);
      setTexto("");
    }
  };

  return (
    <div className={cn("relative", className)}>
      <Input
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={aberto}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-invalid={invalido || undefined}
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        className={cn("rounded-xl pr-8", invalido && "border-destructive")}
        value={aberto ? texto : selecionado ? rotulo(selecionado) : ""}
        onFocus={() => {
          setAberto(true);
          setTexto("");
          setAtivo(0);
        }}
        onBlur={() => setAberto(false)}
        onChange={(e) => {
          setTexto(e.target.value);
          setAberto(true);
          setAtivo(0);
        }}
        onKeyDown={aoTeclar}
      />
      {permitirLimpar && selecionado && !aberto && !disabled ? (
        <button
          type="button"
          aria-label={`Limpar ${ariaLabel.toLowerCase()}`}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => escolher(undefined)}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
      {aberto ? (
        <ul
          id={idLista}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 z-50 mt-1 max-h-72 w-full min-w-[300px] overflow-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {opcoes.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">{vazio}</li>
          ) : (
            opcoes.map((item, i) => (
              <li
                key={idDe(item)}
                role="option"
                aria-selected={i === ativo}
                onMouseDown={(e) => {
                  e.preventDefault();
                  escolher(item);
                }}
                onMouseEnter={() => setAtivo(i)}
                className={cn(
                  "flex cursor-pointer items-baseline gap-2 rounded-lg px-2 py-1.5 text-sm",
                  i === ativo ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                )}
              >
                {codigo ? <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">{codigo(item)}</span> : null}
                <span className="flex-1 truncate">{titulo(item)}</span>
                {detalhe?.(item) ? <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{detalhe(item)}</span> : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

/* ------------------------------ atalhos prontos ------------------------------ */

type Base = { valor?: string; onChange: (id: string | undefined) => void; ariaLabel?: string; className?: string; disabled?: boolean; invalido?: boolean; placeholder?: string };

const pontuarConta = (c: Conta, termo: string) => {
  if (c.reduzido === termo || c.codigo === termo) return 3;
  if (c.codigo.startsWith(termo)) return 2;
  return normalizarBusca(c.descricao).includes(termo) ? 1 : 0;
};

export function SeletorConta({ contas, ...p }: Base & { contas: Conta[] }) {
  return (
    <SeletorBusca
      itens={contas}
      valor={p.valor}
      onChange={p.onChange}
      idDe={(c) => c.id}
      rotulo={(c) => `${c.codigo} — ${c.descricao}`}
      codigo={(c) => c.codigo}
      titulo={(c) => c.descricao}
      detalhe={(c) => (c.reduzido ? `#${c.reduzido}` : c.tipo === "Sintética" ? "sintética" : undefined)}
      pontuar={pontuarConta}
      placeholder={p.placeholder ?? "Código, reduzido ou nome da conta"}
      ariaLabel={p.ariaLabel ?? "Conta"}
      className={p.className}
      disabled={p.disabled}
      invalido={p.invalido}
      vazio="Nenhuma conta encontrada. Confira o plano de contas."
    />
  );
}

const pontuarParticipante = (x: Participante, termo: string) => {
  const doc = soDigitos(x.documento);
  if (x.codigo.toLowerCase() === termo || (soDigitos(termo) && doc === soDigitos(termo))) return 3;
  if (soDigitos(termo).length >= 3 && doc.includes(soDigitos(termo))) return 2;
  return normalizarBusca(`${x.nome} ${x.fantasia ?? ""}`).includes(termo) ? 1 : 0;
};

export function SeletorParticipante({ participantes, ...p }: Base & { participantes: Participante[] }) {
  return (
    <SeletorBusca
      itens={participantes}
      valor={p.valor}
      onChange={p.onChange}
      idDe={(x) => x.id}
      rotulo={(x) => `${x.nome} (${x.documento || x.codigo})`}
      codigo={(x) => x.codigo}
      titulo={(x) => x.nome}
      detalhe={(x) => x.documento}
      pontuar={pontuarParticipante}
      placeholder={p.placeholder ?? "Nome, código ou CNPJ/CPF"}
      ariaLabel={p.ariaLabel ?? "Cliente ou fornecedor"}
      className={p.className}
      disabled={p.disabled}
      invalido={p.invalido}
      vazio="Nenhum cadastro encontrado."
    />
  );
}

const pontuarCentro = (c: CentroCusto, termo: string) => {
  if (c.codigo.toLowerCase() === termo) return 3;
  if (c.codigo.toLowerCase().startsWith(termo)) return 2;
  return normalizarBusca(c.descricao).includes(termo) ? 1 : 0;
};

export function SeletorCentro({ centros, ...p }: Base & { centros: CentroCusto[] }) {
  return (
    <SeletorBusca
      itens={centros}
      valor={p.valor}
      onChange={p.onChange}
      idDe={(c) => c.id}
      rotulo={(c) => `${c.codigo} — ${c.descricao}`}
      codigo={(c) => c.codigo}
      titulo={(c) => c.descricao}
      detalhe={(c) => c.tipo}
      pontuar={pontuarCentro}
      placeholder={p.placeholder ?? "Centro de custo"}
      ariaLabel={p.ariaLabel ?? "Centro de custo"}
      className={p.className}
      disabled={p.disabled}
      invalido={p.invalido}
      vazio="Nenhum centro de custo encontrado."
    />
  );
}
