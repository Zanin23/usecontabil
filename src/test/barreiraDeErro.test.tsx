/**
 * Barreira de erro: uma tela que estoura na renderização precisa mostrar um
 * aviso com caminho de volta — antes dela, o erro derrubava a árvore inteira e
 * a tela ficava em branco (foi o que aconteceu em `/aprender/pratica`).
 */
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ErrorBoundary from "@/components/ErrorBoundary";

function Explode(): JSX.Element {
  throw new Error("scrollTo is not a function");
}

describe("Barreira de erro", () => {
  it("mostra o aviso, o motivo e o caminho de volta em vez de tela branca", () => {
    // O React registra o erro no console; o teste só confere o fallback.
    const erroOriginal = console.error;
    console.error = vi.fn();
    try {
      render(
        <MemoryRouter>
          <ErrorBoundary secao="esta tela">
            <Explode />
          </ErrorBoundary>
        </MemoryRouter>,
      );
    } finally {
      console.error = erroOriginal;
    }

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Não foi possível abrir esta tela/);
    expect(screen.getByText(/scrollTo is not a function/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tentar de novo/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Voltar ao painel/ })).toHaveAttribute("href", "/dashboard");
  });

  it("renderiza os filhos normalmente quando nada falha", () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <p>tela saudável</p>
        </ErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByText("tela saudável")).toBeInTheDocument();
  });
});
