import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/design-system/mj-design-system-db98fa";

type Props = {
  children: ReactNode;
  /** Nome do contexto que falhou, exibido na mensagem (ex.: "esta tela"). */
  secao?: string;
};

type State = { erro: Error | null };

/**
 * Barreira de erro: uma tela que estoura na renderização mostra um aviso com o
 * motivo e um caminho de volta, em vez de derrubar a árvore inteira (a tela
 * ficava em branco e o usuário perdia o menu). Fica dentro do shell, de modo
 * que a navegação continua disponível; trocar de rota remonta a barreira.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: null };

  static getDerivedStateFromError(erro: Error): State {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error("Erro ao renderizar a tela:", erro, info.componentStack);
  }

  render() {
    const { erro } = this.state;
    if (!erro) return this.props.children;

    return (
      <div className="mx-auto max-w-xl space-y-3 py-20 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-brand-orange" />
        <h1 className="font-display text-3xl">Não foi possível abrir esta tela</h1>
        <p className="text-sm text-muted-foreground">
          Ocorreu um erro inesperado ao montar {this.props.secao ?? "esta tela"}. O restante do
          sistema continua funcionando — escolha outra tela no menu ou tente novamente.
        </p>
        <p className="break-words rounded-lg border border-border/70 bg-muted/40 p-2 font-mono text-[11px] text-muted-foreground">
          {erro.message || String(erro)}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => this.setState({ erro: null })}
          >
            <RefreshCw className="mr-1.5 h-4 w-4" /> Tentar de novo
          </Button>
          <Button asChild className="rounded-lg bg-brand-orange hover:bg-brand-orange/90">
            <Link to="/dashboard" onClick={() => this.setState({ erro: null })}>
              Voltar ao painel
            </Link>
          </Button>
        </div>
      </div>
    );
  }
}
