import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, X, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button, Card, CardContent, Input } from "@/design-system/mj-design-system-db98fa";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AssistenteContexto = Record<string, unknown>;

type Msg = { role: "user" | "assistant"; content: string };

const SUGESTOES = [
  "Qual é o próximo passo do fechamento?",
  "O que falta para eu encerrar a competência?",
  "Como resolvo as pendências de cadastro?",
  "Me explique a fase de conciliação.",
];

export default function AssistenteFechamento({
  contexto,
  resumo,
  rotulo = "IA do fechamento",
}: {
  contexto: AssistenteContexto;
  resumo: string;
  rotulo?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo?.({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (aberto) inputRef.current?.focus();
  }, [aberto]);

  const enviar = async (texto: string) => {
    const pergunta = texto.trim();
    if (!pergunta || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: pergunta }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gestao-assistente`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              sess.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
            }`,
          },
          body: JSON.stringify({ messages: next, contexto }),
        },
      );

      if (resp.status === 429) throw new Error("Muitas solicitações. Tente novamente em instantes.");
      if (resp.status === 402) throw new Error("Créditos de IA esgotados no workspace.");
      if (!resp.ok || !resp.body) throw new Error("Não foi possível falar com a IA agora.");

      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
            if (delta) {
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = {
                  role: "assistant",
                  content: copy[copy.length - 1].content + delta,
                };
                return copy;
              });
            }
          } catch {
            /* ignora chunks parciais */
          }
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao consultar a IA");
      setMessages((m) => (m[m.length - 1]?.content === "" ? m.slice(0, -1) : m));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  if (!aberto) {
    return (
      <Button
        onClick={() => setAberto(true)}
        className="fixed bottom-6 right-6 z-40 rounded-lg bg-brand-orange hover:bg-brand-orange/90 shadow-glow"
      >
        <Sparkles className="h-4 w-4 mr-2" /> {rotulo}
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 z-40 w-[380px] max-w-[calc(100vw-2rem)] rounded-xl shadow-elevated overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-brand-orange/15 grid place-items-center shrink-0">
            <Bot className="h-4 w-4 text-brand-orange" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{rotulo}</div>
            <p className="text-xs text-muted-foreground truncate">{resumo}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full shrink-0"
          onClick={() => setAberto(false)}
          aria-label="Fechar assistente"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <CardContent className="p-0">
        <div ref={scrollRef} className="h-[340px] overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Posso indicar os próximos passos, o que falta cadastrar e como concluir cada fase da
                competência.
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    onClick={() => enviar(s)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-left hover:border-brand-orange hover:text-brand-orange transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[85%] rounded-xl bg-brand-orange/12 text-foreground px-3 py-2 text-sm"
                  : "max-w-[90%] rounded-2xl bg-muted text-foreground px-3 py-2 text-sm"
              }
            >
              {m.role === "assistant" ? (
                <div className="text-sm leading-relaxed text-foreground space-y-2 [&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0 [&_strong]:text-brand-orange [&_strong]:font-semibold [&_a]:text-brand-orange [&_a]:underline [&_code]:text-foreground [&_code]:bg-background/60 [&_code]:px-1 [&_code]:rounded [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                m.content
              )}
            </div>
          ))}


          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>{messages[messages.length-1]?.role === "assistant" ? "Gerando análise..." : "Consultando..."}</span>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar(input);
          }}
          className="flex items-center gap-2 border-t border-border p-3"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre o fechamento…"
            className="rounded-full"
          />
          <Button
            type="submit"
            size="icon"
            disabled={loading || !input.trim()}
            className="rounded-lg bg-brand-orange hover:bg-brand-orange/90 shrink-0"
            aria-label="Enviar"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
