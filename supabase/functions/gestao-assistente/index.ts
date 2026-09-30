import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SYSTEM = `Você é a IA assistente do "Use Contábil", um sistema de contabilidade INTERNA de um grupo empresarial (não é escritório de contabilidade).
Sua função é ajudar o usuário a concluir os passos do fechamento da competência.

Regras:
- Responda sempre em português do Brasil, de forma objetiva e prática.
- Use o contexto do fechamento fornecido (empresa, competência, fases, tarefas e pendências) para dar orientações concretas.
- Quando houver pendências de cadastro, indique exatamente o que falta e em qual tela resolver.
- Sugira a ordem dos próximos passos (no máximo 3 por vez) e o que conferir em cada um.
- O sistema é um protótipo visual: não há integração real com a Receita Federal ou órgãos oficiais. Nunca prometa envio ou consulta oficial.
- Não invente dados que não estejam no contexto. Se algo não estiver informado, diga o que precisa ser preenchido.
- Use markdown curto (listas e negrito). Nada de textos longos.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Só usuário autenticado E liberado (com papel) usa a IA. Antes a função não validava ninguém:
    // qualquer chamada com a chave pública consumia créditos de IA.
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Não autenticado." }, 401);
    const { data: papeis } = await userClient.from("user_roles").select("role").eq("user_id", userData.user.id).limit(1);
    if (!papeis?.length) return json({ error: "Acesso ainda não liberado." }, 403);

    const { messages, contexto } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY ausente" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        stream: true,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "system",
            content: `Contexto atual do fechamento (JSON):\n${JSON.stringify(contexto ?? {}, null, 2)}`,
          },
          ...messages.slice(-12).map((m: { role: string; content: string }) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: String(m.content ?? "").slice(0, 4000),
          })),
        ],
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      return new Response(JSON.stringify({ error: detail }), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(resp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
