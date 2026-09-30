import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const senhaTemporaria = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return "Uc" + btoa(String.fromCharCode(...bytes)).replace(/[^a-zA-Z0-9]/g, "x") + "!7";
};

type Corpo = {
  action?: string;
  id?: string;
  email?: string;
  nome?: string;
  cargo?: string;
  perfil?: string;
  permissoes?: unknown;
  duploFator?: boolean;
  ativo?: boolean;
  observacao?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Não autenticado." }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const caller = userData?.user;
    if (!caller) return json({ error: "Sessão inválida." }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // primeiro acesso: se ninguém é admin ainda, o solicitante assume o papel
    const { count: adminCount } = await admin
      .from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
    if (!adminCount) {
      await admin.from("user_roles").insert({ user_id: caller.id, role: "admin" });
    }
    const { data: papel } = await admin
      .from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin").maybeSingle();
    const ehAdmin = !!papel;

    const body: Corpo = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action ?? "sync";

    // Nenhuma ação é permitida a quem não é admin — nem a listagem ("sync"): ela usa a chave de serviço
    // e devolve nome, e-mail, perfil e permissões de TODOS os usuários, contornando o RLS de `usuarios`.
    // (Quem abre o primeiro acesso já virou admin acima, então o bootstrap continua funcionando.)
    if (!ehAdmin) {
      return json({ error: "Apenas administradores podem gerenciar usuários." }, 403);
    }

    if (action === "sync") {
      // traz as contas reais do provedor de autenticação para o cadastro
      const { data: lista, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) throw error;
      for (const u of lista.users) {
        if (!u.email) continue;
        const meta = (u.user_metadata ?? {}) as Record<string, string>;
        const nome = meta.display_name || meta.full_name || meta.name || u.email;
        const { data: existente } = await admin
          .from("usuarios").select("id, nome").or(`auth_user_id.eq.${u.id},email.eq.${u.email}`).maybeSingle();
        if (existente) {
          await admin.from("usuarios").update({
            auth_user_id: u.id,
            situacao: "ativo",
            ultimo_acesso: u.last_sign_in_at ?? null,
            nome: existente.nome || nome,
          }).eq("id", existente.id);
        } else {
          await admin.from("usuarios").insert({
            auth_user_id: u.id,
            email: u.email,
            nome,
            perfil: u.id === caller.id ? "Controladoria" : "Consulta",
            situacao: "ativo",
            ultimo_acesso: u.last_sign_in_at ?? null,
          });
        }
      }
      const { data: rows } = await admin.from("usuarios").select("*").order("criado_em", { ascending: false });
      return json({ usuarios: rows ?? [], admin: ehAdmin });
    }

    if (action === "convidar") {
      const email = (body.email ?? "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "E-mail inválido." }, 400);

      const senha = senhaTemporaria();
      const { data: criado, error: erroCriacao } = await admin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { display_name: body.nome || email },
      });
      if (erroCriacao) {
        const msg = String(erroCriacao.message || "");
        return json({ error: msg.includes("already") ? "Já existe uma conta com este e-mail." : msg }, 400);
      }

      const { data: row, error: erroRow } = await admin.from("usuarios").upsert({
        auth_user_id: criado.user!.id,
        email,
        nome: body.nome || email,
        cargo: body.cargo ?? "",
        perfil: body.perfil ?? "Consulta",
        permissoes: body.permissoes ?? [],
        duplo_fator: !!body.duploFator,
        ativo: body.ativo ?? true,
        observacao: body.observacao ?? null,
        situacao: "ativo",
      }, { onConflict: "auth_user_id" }).select().single();
      if (erroRow) throw erroRow;

      return json({ usuario: row, senhaTemporaria: senha });
    }

    if (action === "redefinir-senha") {
      const { data: row } = await admin.from("usuarios").select("auth_user_id").eq("id", body.id!).maybeSingle();
      if (!row?.auth_user_id) return json({ error: "Usuário sem conta de acesso." }, 400);
      const senha = senhaTemporaria();
      const { error } = await admin.auth.admin.updateUserById(row.auth_user_id, { password: senha });
      if (error) throw error;
      return json({ senhaTemporaria: senha });
    }

    if (action === "excluir") {
      const { data: row } = await admin.from("usuarios").select("auth_user_id").eq("id", body.id!).maybeSingle();
      if (row?.auth_user_id) {
        if (row.auth_user_id === caller.id) return json({ error: "Você não pode excluir a própria conta." }, 400);
        await admin.auth.admin.deleteUser(row.auth_user_id).catch(() => undefined);
      }
      await admin.from("usuarios").delete().eq("id", body.id!);
      return json({ ok: true });
    }

    if (action === "bloquear") {
      const { data: row } = await admin.from("usuarios").select("auth_user_id, ativo").eq("id", body.id!).maybeSingle();
      if (!row) return json({ error: "Usuário não encontrado." }, 404);
      const novo = !row.ativo;
      if (row.auth_user_id) {
        await admin.auth.admin.updateUserById(row.auth_user_id, {
          ban_duration: novo ? "none" : "876000h",
        }).catch(() => undefined);
      }
      await admin.from("usuarios").update({ ativo: novo }).eq("id", body.id!);
      return json({ ativo: novo });
    }

    return json({ error: "Ação desconhecida." }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Falha inesperada." }, 500);
  }
});
