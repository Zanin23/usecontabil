import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: { ...corsHeaders, "Access-Control-Allow-Headers": `${corsHeaders["Access-Control-Allow-Headers"] ?? "authorization, x-client-info, apikey, content-type"}, x-admin-password` },
    });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "verify") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- AuthZ: require an authenticated admin for every non-`verify` action.
    // `supabase.functions.invoke` forwards the caller's JWT in Authorization,
    // so we verify it server-side and confirm the user has the `admin` role
    // in `user_roles` before doing anything sensitive (list/report leak PII;
    // upsert/delete mutate the role-play catalog).
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: roleRow } = await supa
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "upsert") {
      const rp = body.role_play;
      if (!rp?.slug || !rp?.name) {
        return new Response(JSON.stringify({ error: "slug and name required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supa.from("role_plays")
        .upsert(rp, { onConflict: "slug" })
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ role_play: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { error } = await supa.from("role_plays").delete().eq("id", body.id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list") {
      const { data, error } = await supa.from("role_plays")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ role_plays: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "report") {
      const { data: sessions, error: sErr } = await supa.from("sessions")
        .select("id, user_id, role_play_id, status, difficulty, total_score, duration_seconds, started_at, ended_at, transcript, scores, green_flags, red_flags")
        .order("started_at", { ascending: false })
        .limit(1000);
      if (sErr) throw sErr;

      const rpIds = Array.from(new Set((sessions ?? []).map((s) => s.role_play_id).filter(Boolean))) as string[];
      const userIds = Array.from(new Set((sessions ?? []).map((s) => s.user_id).filter(Boolean))) as string[];

      const [{ data: rps }, { data: profiles }] = await Promise.all([
        rpIds.length
          ? supa.from("role_plays").select("id, name, slug, role, topic").in("id", rpIds)
          : Promise.resolve({ data: [] as Array<{ id: string; name: string; slug: string; role: string; topic: string }> }),
        userIds.length
          ? supa.from("profiles").select("id, display_name").in("id", userIds)
          : Promise.resolve({ data: [] as Array<{ id: string; display_name: string | null }> }),
      ]);

      // Fall back to auth metadata (full_name / name) when a profile is missing
      // a real display name. Email is used as a last resort.
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name] as const));
      const enriched = await Promise.all(userIds.map(async (uid) => {
        const cur = profileMap.get(uid);
        const looksLikeEmail = !cur || cur.includes("@") || cur.trim() === "";
        if (!looksLikeEmail) return { id: uid, display_name: cur };
        try {
          const { data } = await supa.auth.admin.getUserById(uid);
          const meta = (data.user?.user_metadata ?? {}) as Record<string, string>;
          const name = meta.full_name || meta.name || meta.display_name || cur || data.user?.email || null;
          return { id: uid, display_name: name };
        } catch {
          return { id: uid, display_name: cur ?? null };
        }
      }));

      return new Response(JSON.stringify({
        sessions: sessions ?? [],
        role_plays: rps ?? [],
        profiles: enriched,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});