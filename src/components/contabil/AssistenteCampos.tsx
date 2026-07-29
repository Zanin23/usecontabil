import { useEffect, useRef, useState } from "react";
import { HelpCircle, Loader2, Send, Sparkles, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button, Input } from "@/design-system/mj-design-system-db98fa";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CampoAjuda = {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  required?: boolean;
  ajuda?: string;
  placeholder?: string;
};

type Msg = { role: "user" | "assistant"; content: string };

const SUGESTOES = [
  "Explique cada campo deste formulário",
  "Quais campos são obrigatórios e por quê?",
  "Onde encontro essas informações?",
  "Dê um exemplo preenchido",
];

/**
 * Assistente de campos: painel de IA embutido nos diálogos de cadastro,
 * explicando o que cada campo significa e onde obter a informação.
 */
export default function AssistenteCampos({
  titulo,
  campos,
  draft,
  contextoExtra,
}: {
  titulo: string;
  campos: CampoAjuda[];
  draft?: Record<string, string>;
  contextoExtra?: Record<string, unknown>;
}) {
  const [aberto, setAberto] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
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

    const contexto = {
      tela: titulo,
      modo: "ajuda_de_preenchimento_de_formulario",
      instrucao:
        "Explique de forma objetiva o significado de cada campo, o formato esperado e onde a informação costuma ser encontrada (documentos, portais, sistemas internos). Seja direto e use listas curtas.",
      campos: campos.map((c) => ({
        campo: c.label,
        obrigatorio: !!c.required,
        tipo: c.type ?? "text",
        opcoes: c.options,
        exemplo: c.placeholder,
        ajuda: c.ajuda,
      })),
      preenchimentoAtual: draft ?? null,
      ...(contextoExtra ?? {}),
    };

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
        type="button"
        variant="outline"
        className="rounded-full w-full justify-start text-brand-orange border-brand-orange/40 hover:bg-brand-orange/10"
        onClick={() => setAberto(true)}
      >
        <Sparkles className="h-4 w-4 mr-2" />
        IA ajudante — o que significa cada campo?
      </Button>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-orange/30 bg-muted/40 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <HelpCircle className="h-4 w-4 text-brand-orange shrink-0" />
          <span className="text-sm font-medium truncate">IA ajudante · {titulo}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full shrink-0"
          onClick={() => setAberto(false)}
          aria-label="Fechar ajuda"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div ref={scrollRef} className="max-h-[220px] overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Pergunte o que preencher em cada campo, o formato esperado e onde encontrar a
              informação.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  type="button"
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
                ? "ml-auto max-w-[85%] rounded-2xl bg-brand-orange/15 text-foreground px-3 py-2 text-sm"
                : "max-w-[95%] text-sm text-foreground"
            }
          >
            {m.role === "assistant" ? (
              <div className="leading-relaxed space-y-2 [&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0 [&_strong]:text-brand-orange [&_strong]:font-semibold [&_code]:bg-background/60 [&_code]:px-1 [&_code]:rounded">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            ) : (
              m.content
            )}
          </div>
        ))}

        {loading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Consultando…
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border p-2">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              enviar(input);
            }
          }}
          placeholder="Ex.: o que é alíquota de ISS?"
          className="rounded-full"
        />
        <Button
          type="button"
          size="icon"
          disabled={loading || !input.trim()}
          onClick={() => enviar(input)}
          className="rounded-full bg-brand-orange hover:bg-brand-orange/90 shrink-0"
          aria-label="Enviar"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
