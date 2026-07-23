import { useEffect, useRef } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/lib/useAuthUser";
import { toast } from "sonner";

/**
 * Deep-link route: /r/:slug
 * Resolves the role-play by slug, creates a session for the signed-in user,
 * and routes straight into the call. Sends unauth users through /auth first.
 */
export default function RolePlayDeepLink() {
  const { slug = "" } = useParams();
  const { user, loading } = useAuthUser();
  const nav = useNavigate();
  const started = useRef(false);

  useEffect(() => {
    if (loading || started.current) return;
    if (!user) {
      nav(`/auth?redirect=/r/${slug}`, { replace: true });
      return;
    }
    started.current = true;
    (async () => {
      const { data: rp, error: rpErr } = await supabase
        .from("role_plays")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (rpErr || !rp) {
        toast.error("Role-play not found");
        nav("/", { replace: true });
        return;
      }
      const { data: sess, error: sessErr } = await supabase
        .from("sessions")
        .insert({ user_id: user.id, difficulty: "standard", role_play_id: rp.id })
        .select("id")
        .single();
      if (sessErr || !sess) {
        toast.error(sessErr?.message ?? "Failed to start session");
        nav("/", { replace: true });
        return;
      }
      nav(`/call/${sess.id}`, { replace: true });
    })();
  }, [user?.id, loading, slug, nav]);

  if (!slug) return <Navigate to="/" replace />;
  return (
    <div className="min-h-screen bg-aurora flex items-center justify-center">
      <div className="text-muted-foreground text-sm">Starting role-play…</div>
    </div>
  );
}