import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  GraduationCap, BookOpen, Info, Loader2, Send, Sparkles, X, CheckCircle2, FlaskConical,
} from "lucide-react";
import {
  Badge, Button, Input, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/design-system/mj-design-system-db98fa";
import { usePratica } from "@/lib/praticaStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AVISO_SIMULACAO, licaoDaRota } from "@/lib/aprendizado/conteudo";
import { TERMO_MAP } from "@/lib/aprendizado/glossario";
import { marcarLicao } from "@/lib/aprendizadoStore";
import { LABS } from "@/lib/aprendizado/labs";

type Msg = { role: "user" | "assistant"; content: string };

const SUGESTOES = [
  "Por que esta tela existe no fechamento?",
  "Como o sistema chega a esse valor?",
  "Quais erros são mais comuns aqui?",
  "Explique o conceito com um exemplo numérico",
];

/**
 * Painel "Entender esta tela": explicação operacional + conceito contábil/fiscal,
 * termos do glossário e assistente de IA para perguntas de "por quê".
 */
export default function AjudaTela() {
  const { pathname } = useLocation();
  const licao = useMemo(() => licaoDaRota(pathname), [pathname]);
  const [aberto, setAberto] = useState(false);
  const { praticaAtiva } = usePratica();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [pergunta, setPergunta] = useState("");
  const [carregando, setCarregando] = useState(false);
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMsgs([]);
    setPergunta("");
  }, [pathname]);

  useEffect(() => {
    if (aberto && licao) void marcarLicao(licao.slug, "vista");
  }, [aberto, licao]);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, carregando]);

  if (!licao) return null;

  const temLab = !!licao.praticaId && LABS.some((l) => l.id === licao.praticaId);

  const perguntar = async (texto: string) => {
    const conteudo = texto.trim();
    if (!conteudo || carregando) return;
    const novas: Msg[] = [...msgs, { role: "user", content: conteudo }];
    setMsgs(novas);
    setPergunta("");
    setCarregando(true);
    try {
      const { data, error } = await supabase.functions.invoke("gestao-assistente", {
        body: {
          messages: novas,
          contexto: {
            modo: praticaAtiva ? "pratica" : "aprendizado",
            instrucao: praticaAtiva
              ? "Você é um Tutor Contábil em Modo Prática. O usuário está usando o sistema real como laboratório. Explique cada campo, sugira valores de teste e explique o impacto contábil/fiscal de cada ação nesta tela específica."
              : "Responda em tom didático, explicando o PORQUÊ e o COMO FUNCIONA, não apenas onde clicar. Use exemplos numéricos curtos quando ajudar.",
            tela: pathname,
            licao: {
              titulo: licao.titulo,
              comoUsar: licao.comoUsar,
              conceito: licao.conceito,
              baseLegal: licao.baseLegal ?? [],
            },
            aviso: AVISO_SIMULACAO,
          },
        },
      });
      if (error) throw error;
      const resposta =
        typeof data === "string"
          ? data
          : (data?.resposta as string) ?? (data?.content as string) ?? "";
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: resposta || "Não consegui responder agora. Tente reformular a pergunta." },
      ]);
    } catch (e) {
      toast.error("Não foi possível consultar a IA agora.");
      setMsgs((m) => [...m, { role: "assistant", content: "Falha ao consultar a IA. Tente novamente em instantes." }]);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <>
      <Button
        variant={praticaAtiva ? "default" : "outline"}
        size="sm"
        className={`rounded-md h-9 gap-2 ${
          praticaAtiva 
            ? "bg-brand-orange text-primary-foreground hover:bg-brand-orange/90 shadow-glow animate-pulse-soft" 
            : ""
        }`}
        onClick={() => setAberto(true)}
        title={praticaAtiva ? "Tutor de Aprendizado Prático" : "Entender esta tela"}
        aria-label={praticaAtiva ? "Tutor de Aprendizado Prático" : "Entender esta tela"}
      >
        {praticaAtiva ? <BrainCircuit className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
        <span className="hidden 2xl:inline">
          {praticaAtiva ? "Tutor Prático" : "Entender esta tela"}
        </span>
      </Button>

      <Sheet open={aberto} onOpenChange={setAberto}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="text-left">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-widest">
                {licao.nivel}
              </Badge>
              <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-widest">
                {licao.area}
              </Badge>
            </div>
            <SheetTitle className="font-display text-2xl flex items-center gap-2">
              {praticaAtiva && <BrainCircuit className="h-5 w-5 text-brand-orange" />}
              {praticaAtiva ? `Tutor Prático: ${licao.titulo}` : licao.titulo}
            </SheetTitle>
            <SheetDescription>
              {praticaAtiva 
                ? "Você está em Modo Prática. Use o sistema para aprender fazendo, com ajuda da IA em tempo real." 
                : licao.resumo}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6 text-sm">
            <section className="rounded-2xl border border-border bg-card p-4">
              <h3 className="flex items-center gap-2 font-display text-lg">
                <Info className="h-4 w-4 text-brand-orange" />O que esta tela faz
              </h3>
              <ol className="mt-3 space-y-2 text-muted-foreground list-decimal pl-5">
                {licao.comoUsar.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ol>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4">
              <h3 className="flex items-center gap-2 font-display text-lg">
                <BookOpen className="h-4 w-4 text-brand-orange" />O conceito por trás
              </h3>
              <ul className="mt-3 space-y-2 text-muted-foreground list-disc pl-5">
                {licao.conceito.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              {licao.baseLegal?.length ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Base legal de referência: {licao.baseLegal.join(" · ")}
                </p>
              ) : null}
            </section>

            {licao.termos.length > 0 && (
              <section>
                <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Termos desta tela</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {licao.termos.map((slug) => {
                    const termo = TERMO_MAP[slug];
                    if (!termo) return null;
                    return (
                      <Link key={slug} to={`/aprender/glossario?termo=${slug}`} onClick={() => setAberto(false)}>
                        <Badge variant="secondary" className="rounded-full" title={termo.resumo}>
                          {termo.termo}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            <div className="flex flex-wrap gap-2">
              <Link to={`/aprender/licao/${licao.slug}`} onClick={() => setAberto(false)}>
                <Button variant="outline" size="sm" className="rounded-full gap-2">
                  <BookOpen className="h-4 w-4" />
                  Ver lição completa
                </Button>
              </Link>
              {temLab && (
                <Link to={`/aprender/pratica?lab=${licao.praticaId}`} onClick={() => setAberto(false)}>
                  <Button variant="outline" size="sm" className="rounded-full gap-2">
                    <FlaskConical className="h-4 w-4" />
                    Praticar com dados fictícios
                  </Button>
                </Link>
              )}
              <Button
                size="sm"
                className="rounded-full gap-2 bg-brand-orange hover:bg-brand-orange/90"
                onClick={() => {
                  void marcarLicao(licao.slug, "concluida");
                  toast.success("Lição marcada como estudada.");
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                Marcar como estudada
              </Button>
            </div>

            <section className="rounded-2xl border border-border bg-card p-4">
              <h3 className="flex items-center gap-2 font-display text-lg">
                {praticaAtiva ? (
                  <BrainCircuit className="h-4 w-4 text-brand-orange" />
                ) : (
                  <Sparkles className="h-4 w-4 text-brand-orange" />
                )}
                {praticaAtiva ? "Tutor Contábil (IA)" : "Perguntar à IA"}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {praticaAtiva 
                  ? "Em modo prática, a IA explica como cada dado que você digitar afeta a contabilidade real."
                  : "Pergunte o porquê, não só o onde clicar."}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => perguntar(s)}
                    className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {msgs.length > 0 && (
                <div className="mt-4 space-y-3">
                  {msgs.map((m, i) => (
                    <div
                      key={i}
                      className={
                        m.role === "user"
                          ? "rounded-2xl bg-primary text-primary-foreground px-3 py-2 text-sm ml-8"
                          : "text-sm text-foreground [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                      }
                    >
                      {m.role === "user" ? m.content : <ReactMarkdown>{m.content}</ReactMarkdown>}
                    </div>
                  ))}
                  {carregando && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Pensando…
                    </div>
                  )}
                  <div ref={fim} />
                </div>
              )}

              <form
                className="mt-4 flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void perguntar(pergunta);
                }}
              >
                <Input
                  value={pergunta}
                  onChange={(e) => setPergunta(e.target.value)}
                  placeholder="Ex.: por que essa apuração deu esse valor?"
                  className="rounded-full"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="rounded-full bg-brand-orange hover:bg-brand-orange/90"
                  disabled={carregando || !pergunta.trim()}
                  aria-label="Enviar pergunta"
                >
                  {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </section>

            <p className="rounded-2xl border border-border bg-muted p-3 text-xs text-muted-foreground">
              {AVISO_SIMULACAO}
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
