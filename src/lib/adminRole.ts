import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/lib/useAuthUser";

/** Returns true if the signed-in user has the admin role. */
export function useIsAdmin() {
  const { user, loading: authLoading } = useAuthUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (authLoading) return;
    if (!user) { setIsAdmin(false); setLoading(false); return; }
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setIsAdmin(!!data);
        setLoading(false);
      });
    return () => { active = false; };
  }, [user?.id, authLoading]);

  return { isAdmin, loading: loading || authLoading, user };
}