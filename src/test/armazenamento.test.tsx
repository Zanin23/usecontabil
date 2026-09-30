/**
 * Cota do navegador (achado Q1): ao encher o localStorage, o usuário via "Failed to execute 'setItem'
 * on 'Storage'… exceeded the quota" (inglês técnico) e o dado não era salvo.
 */
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toast = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

import UsoArmazenamento from "@/components/contabil/UsoArmazenamento";
import { ehErroDeCota, instalarGuardaDeCota, MSG_ARMAZENAMENTO_CHEIO, usoArmazenamento } from "@/lib/armazenamento";

const cotaEstourada = () => new DOMException("The quota has been exceeded.", "QuotaExceededError");

describe("guarda de cota", () => {
  let restaurarOriginal: () => void;
  let desfazerGuarda: () => void;

  beforeEach(() => {
    localStorage.clear();
    toast.error.mockClear();
    // simula um navegador cheio: chaves "cheio*" estouram a cota
    const setItemReal = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k: string, v: string) {
      if (k.startsWith("cheio")) throw cotaEstourada();
      return setItemReal.call(this, k, v);
    };
    restaurarOriginal = () => { Storage.prototype.setItem = setItemReal; };
    desfazerGuarda = instalarGuardaDeCota();
  });
  afterEach(() => { desfazerGuarda(); restaurarOriginal(); });

  it("estouro de cota vira erro em português e avisa o usuário uma vez", () => {
    let erro: unknown;
    try { localStorage.setItem("cheio:1", "x"); } catch (e) { erro = e; }
    expect(ehErroDeCota(erro)).toBe(true);
    expect((erro as DOMException).message).toBe(MSG_ARMAZENAMENTO_CHEIO);
    expect(() => localStorage.setItem("cheio:2", "y")).toThrow(/Armazenamento do navegador cheio/);
    expect(toast.error).toHaveBeenCalledTimes(1); // não enche a tela de avisos
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/NÃO foi salvo/), expect.objectContaining({ id: "armazenamento-cheio" }));
  });

  it("gravações normais não são afetadas", () => {
    localStorage.setItem("normal", "1");
    expect(localStorage.getItem("normal")).toBe("1");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("outros erros passam intactos e instalar duas vezes não empilha guardas", () => {
    const segunda = instalarGuardaDeCota();
    expect(segunda).toBe(desfazerGuarda);
    const setItemAtual = Storage.prototype.setItem;
    Storage.prototype.setItem = function () { throw new TypeError("outro problema"); };
    expect(() => localStorage.setItem("a", "b")).toThrow(TypeError);
    Storage.prototype.setItem = setItemAtual;
  });
});

describe("uso do armazenamento", () => {
  beforeEach(() => localStorage.clear());

  it("soma caracteres, calcula o percentual e lista as maiores chaves", () => {
    localStorage.setItem("pequena", "a".repeat(10));
    localStorage.setItem("usecontabil.tributario.v1", "b".repeat(2_000));
    const uso = usoArmazenamento(localStorage, 10_000);
    expect(uso.caracteres).toBe("pequena".length + 10 + "usecontabil.tributario.v1".length + 2_000);
    expect(uso.percentual).toBe(Math.round((uso.caracteres / 10_000) * 100));
    expect(uso.maiores[0].chave).toBe("usecontabil.tributario.v1");
  });

  it("<UsoArmazenamento /> mostra o percentual e o nome amigável da chave mais pesada", () => {
    localStorage.setItem("usecontabil.fiscal.docs.v1", "x".repeat(50_000));
    render(<UsoArmazenamento />);
    expect(screen.getByRole("progressbar", { name: /uso do armazenamento/i })).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByText("Documentos fiscais")).toBeInTheDocument();
  });
});
