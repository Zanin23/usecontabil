import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button, Card, CardContent } from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function Auth() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/practice";
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav(redirect, { replace: true });
    });
  }, [nav, redirect]);

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}${redirect}`,
    });
    if (result.error) { toast.error("Couldn't start Google sign-in"); setBusy(false); return; }
    if (result.redirected) return;
    nav(redirect, { replace: true });
  };

  return (
    <div className="min-h-screen bg-aurora flex items-center justify-center px-6 py-10">
      <Card className="rounded-2xl w-full max-w-sm shadow-elevated">
        <CardContent className="p-6 space-y-6">
          <div>
            <Link to="/"><Button variant="ghost" size="sm" className="rounded-lg -ml-2"><ArrowLeft className="h-4 w-4 mr-1" />Home</Button></Link>
          </div>
          <h1 className="font-display text-3xl text-foreground">
            Welcome back.
          </h1>

          <p className="text-sm text-muted-foreground">
            Sign in with your Google account to start role-playing.
          </p>
          <Button onClick={google} disabled={busy} className="w-full rounded-lg bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground h-11">
            {busy ? "Working…" : "Continue with Google"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}