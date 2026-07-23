import { Link, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useIsAdmin } from "@/lib/adminRole";
import { useAuthUser, displayNameFor } from "@/lib/useAuthUser";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LogoMark from "@/components/LogoMark";

/** Minimal top nav matching the editorial design direction. */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { isAdmin } = useIsAdmin();
  const { user } = useAuthUser();
  const onAdmin = pathname.startsWith("/admin");

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="mx-auto max-w-7xl px-6 md:px-8 py-4 flex items-center justify-between gap-4">
          <Link to="/practice" className="flex items-center gap-2.5">
            <LogoMark className="h-8 w-8" />
            <span className="font-display font-bold text-xl tracking-tight">
              Rehearsal
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                to="/admin"
                className={`px-4 py-2 border border-border rounded-lg text-sm font-medium flex items-center gap-2 transition-colors hover:bg-cream ${
                  onAdmin ? "bg-cream" : ""
                }`}
              >
                Admin console
                <span className="w-1.5 h-1.5 bg-brand-blue rounded-full" />
              </Link>
            )}
            {user && (
              <>
                <span className="hidden sm:inline text-sm text-foreground/60">{displayNameFor(user)}</span>
                <button
                  onClick={signOut}
                  className="px-3 py-2 rounded-lg border border-border hover:bg-cream transition-colors inline-flex items-center gap-1.5 text-sm text-foreground/70"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
