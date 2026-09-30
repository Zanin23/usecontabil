/**
 * Digitação de valores (achados V1 e C1 da validação funcional):
 *  - valorBR("1234.56") virava 123.456 (×100) e "1.5" virava 15, sem aviso;
 *  - "Cupons emitidos" virava NaN com "100,00" (Number("100,00"));
 *  - em Movimentos, o campo numérico apagava a vírgula a cada tecla: "42,90" virava 4290.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import CampoNumeroBR from "@/components/contabil/CampoNumeroBR";
import { valorBR } from "@/lib/fiscalStore";
import { formatarNumeroBR, parseNumeroBR } from "@/lib/numeros";

describe("parseNumeroBR", () => {
  it.each([
    ["1.234,56", 1234.56],
    ["1234,56", 1234.56],
    ["1234.56", 1234.56], // era 123456
    ["1.5", 1.5], // era 15
    ["0.99", 0.99], // era 99
    ["0.500", 0.5],
    [".5", 0.5],
    ["10.000", 10000], // milhar BR
    ["1.234.567", 1234567],
    ["1.234.567,89", 1234567.89],
    ["10,000", 10], // vírgula é decimal no padrão brasileiro
    ["R$ 1.234,56", 1234.56],
    ["R$ 50", 50],
    ["-50,00", -50],
    ["(50,00)", -50],
    ["+7", 7],
    ["42", 42],
    [0, 0],
    [12.5, 12.5],
  ])("%j → %s", (entrada, esperado) => {
    expect(parseNumeroBR(entrada)).toBe(esperado);
  });

  it.each([["abc"], [""], ["   "], ["1,234.56"], ["1.2.3"], ["1,2,3"], ["12a"], ["--5"], [undefined], [null], [NaN]])(
    "%j → inválido (null)",
    (entrada) => {
      expect(parseNumeroBR(entrada)).toBeNull();
    },
  );
});

describe("valorBR (usado por documentos, apuração e escrituração)", () => {
  it("mantém o comportamento para o formato brasileiro e corrige o ponto decimal", () => {
    expect(valorBR("1.234,56")).toBe(1234.56);
    expect(valorBR("R$ 50")).toBe(50);
    expect(valorBR("1234.56")).toBe(1234.56);
    expect(valorBR("1.5")).toBe(1.5);
  });
  it("texto inválido ou vazio vira 0 (nunca NaN)", () => {
    expect(valorBR("abc")).toBe(0);
    expect(valorBR("")).toBe(0);
    expect(valorBR(undefined)).toBe(0);
    expect(Number.isNaN(valorBR("1,234.56"))).toBe(false);
  });
});

describe("formatarNumeroBR", () => {
  it("usa vírgula decimal e sem milhar", () => {
    expect(formatarNumeroBR(42.9)).toBe("42,9");
    expect(formatarNumeroBR(1234.5)).toBe("1234,5");
    expect(formatarNumeroBR(0)).toBe("0");
    expect(formatarNumeroBR(undefined)).toBe("");
  });
});

describe("<CampoNumeroBR />", () => {
  function Teste({ aoMudar }: { aoMudar: (n: number | undefined) => void }) {
    const [n, setN] = useState<number | undefined>(0);
    return <CampoNumeroBR aria-label="valor" value={n} onChange={(v) => { setN(v); aoMudar(v); }} />;
  }
  const digitar = (campo: HTMLElement, texto: string) => {
    let atual = "";
    for (const ch of texto) {
      atual += ch;
      fireEvent.change(campo, { target: { value: atual } });
    }
  };

  it("digitar \"42,90\" resulta em 42,9 — a vírgula não some no meio da digitação", () => {
    const aoMudar = vi.fn();
    render(<Teste aoMudar={aoMudar} />);
    const campo = screen.getByLabelText("valor") as HTMLInputElement;
    fireEvent.focus(campo);
    fireEvent.change(campo, { target: { value: "" } });
    digitar(campo, "42,90");
    expect(campo.value).toBe("42,90"); // continua como digitado enquanto edita
    expect(aoMudar).toHaveBeenLastCalledWith(42.9); // antes: 4290
    fireEvent.blur(campo);
    expect(campo.value).toBe("42,9"); // reformata ao sair
  });

  it("aceita ponto decimal e marca como inválido o que não é número", () => {
    const aoMudar = vi.fn();
    render(<Teste aoMudar={aoMudar} />);
    const campo = screen.getByLabelText("valor") as HTMLInputElement;
    fireEvent.focus(campo);
    digitar(campo, "2.5");
    expect(aoMudar).toHaveBeenLastCalledWith(2.5);
    expect(campo).not.toHaveAttribute("aria-invalid");
    fireEvent.change(campo, { target: { value: "abc" } });
    expect(aoMudar).toHaveBeenLastCalledWith(undefined);
    expect(campo).toHaveAttribute("aria-invalid", "true");
  });
});
