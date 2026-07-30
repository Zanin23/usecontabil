import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Subscribes to auth state and returns the current Supabase user (or null). */
export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // listener first, then initial fetch — avoids race per Supabase guidance
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setUser(data.session?.user ?? null);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    return () => sub.subscription.unsubscribe();
  }, []);

  return { user, loading };
}

export function displayNameFor(user: User | null): string {
  if (!user) return "";
  const meta = (user.user_metadata ?? {}) as { display_name?: string; full_name?: string; name?: string };
  return meta.display_name || meta.full_name || meta.name || user.email || "You";
}