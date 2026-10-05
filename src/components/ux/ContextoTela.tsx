// ============================================================================
// "Entenda esta tela" — o bloco de contexto que responde às cinco perguntas
// do usuário sem exigir que ele conheça a estrutura do sistema:
//   O que faz? · Por que preencher? · De onde vêm os dados?
//   O que isto alimenta? · Qual é o próximo passo?
//
// Uso: <ContextoTela /> no topo da tela (ele descobre a rota sozinho).
// ============================================================================
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownLeft, ArrowRight, ArrowUpRight, ChevronDown, GraduationCap, Info, Lightbulb,
} from "lucide-react";
import { Badge, Button, cn } from "@/design-system/mj-design-system-db98fa";
import { useOrientacao } from "@/lib/ux/useOrientacao";
import SeloRequisito from "./SeloRequisito";

const CHAVE = "uc:contexto-tela";

export default function ContextoTela({
  className,
  /** Esconde a seção de requisitos (útil em telas que já mostram o bloqueio). */
  semRequisitos = false,
}: {
  className?: string;
  semRequisitos?: boolean;
}) {
  const { tela, estados, vemDe, alimenta, proximos } = useOrientacao();
  const [aberto, setAberto] = useState(true);

  useEffect(() => {
    try {
      setAberto(localStorage.getItem(CHAVE) !== "fechado");
    } catch {
      /* navegador sem localStorage: mantém aberto */
    }
  }, []);

  const alternar = () => {
    const novo = !aberto;
    setAberto(novo);
    try {
      localStorage.setItem(CHAVE, novo ? "aberto" : "fechado");
    } catch {
      /* sem persistência não há problema */
    }
  };

  const vazio = !vemDe.length && !alimenta.length && !proximos.length && !estados.length;
  if (vazio && !tela.oQueFaz) return null;

  return (
    <section
      className={cn(
        "rounded-xl border border-border/70 bg-muted/25 text-sm",
        className,
      )}
      aria-label="Contexto da tela"
    >
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberto}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
      >
        <Info className="h-4 w-4 shrink-0 text-primary" />
        <span className="font-medium">Contexto da tela</span>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          o que faz, de onde vêm os dados e o que falta
        </span>
        {!aberto && (
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {tela.oQueFaz}
          </span>
        )}
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            aberto && "rotate-180",
          )}
        />
      </button>

      {aberto && (
        <div className="space-y-4 border-t border-border/60 px-4 py-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Item rotulo="O que esta tela faz" icone={Info}>
              {tela.oQueFaz}
            </Item>
            <Item rotulo="Por que preciso preencher" icone={Lightbulb}>
              {tela.porQue}
            </Item>
          </div>

          {!semRequisitos && estados.length > 0 && (
            <div>
              <Rotulo>O que precisa estar cadastrado antes</Rotulo>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {estados.map((e) => (
                  <SeloRequisito key={e.id} estado={e} />
                ))}
              </div>
            </div>
          )}

          {vemDe.length > 0 && (
            <div>
              <Rotulo>
                <ArrowDownLeft className="h-3 w-3" /> De onde vêm os dados exibidos aqui
              </Rotulo>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {vemDe.map((l) => (
                  <ChipLink key={l.rota + l.titulo} to={l.rota} titulo={l.titulo} />
                ))}
              </div>
            </div>
          )}

          {alimenta.length > 0 && (
            <div>
              <Rotulo>
                <ArrowUpRight className="h-3 w-3" /> O que esta tela alimenta
              </Rotulo>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {alimenta.map((l) => (
                  <ChipLink key={l.rota + l.titulo} to={l.rota} titulo={l.titulo} />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-full px-3 text-xs"
              onClick={() => window.dispatchEvent(new Event("uc:abrir-ajuda-tela"))}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              Conceito, base legal e dúvidas
            </Button>
            <Link
              to="/mapa-sistema"
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Ver o mapa completo do sistema
            </Link>
          </div>

          {proximos.length > 0 && (
            <div>
              <Rotulo>
                <ArrowRight className="h-3 w-3" /> Qual é o próximo passo
              </Rotulo>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {proximos.map((p) => (
                  <Button
                    key={p.rota + p.titulo}
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-full px-3 text-xs"
                  >
                    <Link to={p.rota} title={p.porque}>
                      {p.titulo}
                      <ArrowRight className="ml-1.5 h-3 w-3" />
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
      {children}
    </div>
  );
}

function Item({
  rotulo,
  icone: Icone,
  children,
}: {
  rotulo: string;
  icone: typeof Info;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        <Icone className="h-3 w-3" />
        {rotulo}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-foreground/90">{children}</p>
    </div>
  );
}

function ChipLink({ to, titulo }: { to: string; titulo: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
    >
      {titulo}
      <ArrowUpRight className="h-3 w-3" />
    </Link>
  );
}

export { ChipLink };

/** Badge resumido de "requisito atendido / pendente" usado em cabeçalhos. */
export function ResumoRequisitos() {
  const { estados, criticos } = useOrientacao();
  if (!estados.length) return null;
  const pendentes = criticos.length;
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-md",
        pendentes ? "border-warn/50 text-warn" : "border-success/40 text-success",
      )}
    >
      {pendentes
        ? `${pendentes} cadastro(s) pendente(s) antes de usar`
        : "Cadastros necessários prontos"}
    </Badge>
  );
}
