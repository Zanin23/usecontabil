import { Navigate, useLocation } from "react-router-dom";
import { useAuthUser } from "@/lib/useAuthUser";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/design-system/mj-design-system-db98fa";
import LogoMark from "./LogoMark";
import { LogOut } from "lucide-react";

/**
 * Gate that ensures the user is signed in before rendering children.
 * While the session is being resolved we render nothing (avoids a flash
 * of the protected UI). When signed out, we redirect to /auth and pass
 * the originally-requested path as ?redirect=… so Auth can send the
 * user back after sign-in.
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthUser();
  const location = useLocation();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setAuthorized(null);
      return;
    }

    const checkAccess = async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      if (error) {
        console.error("Erro ao verificar acesso:", error);
        setAuthorized(false);
        return;
      }

      // Se o usuário tem QUALQUER papel na tabela user_roles, ele está liberado.
      // Caso contrário, o administrador ainda não liberou o acesso dele.
      setAuthorized(data && data.length > 0);
    };

    checkAccess();
  }, [user]);

  if (loading || (user && authorized === null)) return null;

  if (!user) {
    const redirect = location.pathname + location.search;
    return <Navigate to={`/auth?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-aurora flex items-center justify-center px-6 py-10">
        <Card className="rounded-3xl w-full max-w-md shadow-elevated border-brand-orange/20">
          <CardContent className="p-7 space-y-6 text-center">
            <div className="flex justify-center">
              <LogoMark />
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-2xl leading-tight">Acesso <span className="text-brand-orange">Pendente</span></h1>
              <p className="text-sm text-muted-foreground">
                Sua conta foi criada com sucesso, mas o acesso ao sistema ainda não foi liberado.
              </p>
              <div className="p-4 bg-brand-orange/10 rounded-2xl border border-brand-orange/20 text-xs text-brand-orange font-medium mt-4">
                Solicite ao administrador a liberação do seu perfil para começar a utilizar o Use Contábil.
              </div>
            </div>
            
            <button 
              onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition mx-auto"
            >
              <LogOut className="h-3 w-3" />
              Sair da conta
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}