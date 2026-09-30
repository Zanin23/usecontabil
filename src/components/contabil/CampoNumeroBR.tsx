import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Input } from "@/design-system/mj-design-system-db98fa";
import { formatarNumeroBR, parseNumeroBR } from "@/lib/numeros";

type Props = Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: number | undefined;
  /** Chamado a cada alteração; `undefined` quando o texto está vazio ou não é número. */
  onChange: (valor: number | undefined) => void;
  /** Casas decimais fixas ao exibir (ex.: 2 para valores em reais: "89,90"). Sem ela, mostra como digitado. */
  casasDecimais?: number;
};

/**
 * Campo numérico pt-BR que MANTÉM o que a pessoa digita (vírgula/ponto no fim, zeros à direita)
 * e só reformata ao sair do campo. O padrão antigo `value={numero}` + `Number(texto)` no onChange
 * apagava a vírgula a cada tecla: digitar "42,90" resultava em 4290.
 */
export default function CampoNumeroBR({ value, onChange, onBlur, onFocus, casasDecimais, ...resto }: Props) {
  const formatar = (n: number | undefined | null) =>
    casasDecimais === undefined || n === undefined || n === null || !Number.isFinite(n)
      ? formatarNumeroBR(n)
      : n.toFixed(casasDecimais).replace(".", ",");
  const [texto, setTexto] = useState(() => formatar(value));
  const digitando = useRef(false);

  // Acompanha mudanças vindas de fora (ex.: limpar/trocar item) enquanto a pessoa não está digitando.
  useEffect(() => {
    if (!digitando.current) setTexto(formatar(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, casasDecimais]);

  const numero = parseNumeroBR(texto);
  return (
    <Input
      {...resto}
      inputMode="decimal"
      value={texto}
      aria-invalid={texto.trim() !== "" && numero === null ? true : undefined}
      onFocus={(e) => { digitando.current = true; onFocus?.(e); }}
      onBlur={(e) => {
        digitando.current = false;
        setTexto(formatar(parseNumeroBR(texto)));
        onBlur?.(e);
      }}
      onChange={(e) => {
        setTexto(e.target.value);
        onChange(parseNumeroBR(e.target.value) ?? undefined);
      }}
    />
  );
}
