import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import {
  Button, Card, CardContent, Input, Label, Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import LogoMark from "@/components/LogoMark";

export default function Auth() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/dashboard";
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav(redirect, { replace: true });
    });
  }, [nav, redirect]);

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth`,
    });
    if (result.error) {
      toast.error("Não foi possível iniciar o login com Google");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    nav(redirect, { replace: true });
  };

  const entrar = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setBusy(false);
    if (error) return toast.error("E-mail ou senha inválidos");
    nav(redirect, { replace: true });
  };

  const criarConta = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: { display_name: nome },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada. Verifique seu e-mail para confirmar o acesso.");
  };

  return (
    <div className="min-h-screen bg-aurora flex items-center justify-center px-6 py-10">
      <Card className="rounded-3xl w-full max-w-md shadow-elevated">
        <CardContent className="p-7 space-y-6">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div>
              <h1 className="font-display text-2xl leading-tight">Use Contábil</h1>
              <p className="text-xs text-muted-foreground">
                Seus cadastros ficam salvos na nuvem, em qualquer dispositivo.
              </p>
            </div>
          </div>

          <Tabs defaultValue="entrar">
            <TabsList className="rounded-full">
              <TabsTrigger value="entrar" className="rounded-full">Entrar</TabsTrigger>
              <TabsTrigger value="criar" className="rounded-full">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="entrar" className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="voce@empresa.com.br" />
              </div>
              <div className="space-y-1.5">
                <Label>Senha</Label>
                <Input value={senha} onChange={(e) => setSenha(e.target.value)} type="password" placeholder="••••••••" />
              </div>
              <Button onClick={entrar} disabled={busy} className="w-full rounded-full bg-brand-orange hover:bg-brand-orange/90">
                {busy ? "Entrando…" : "Entrar"}
              </Button>
            </TabsContent>

            <TabsContent value="criar" className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="voce@empresa.com.br" />
              </div>
              <div className="space-y-1.5">
                <Label>Senha</Label>
                <Input value={senha} onChange={(e) => setSenha(e.target.value)} type="password" placeholder="Mínimo de 6 caracteres" />
              </div>
              <Button onClick={criarConta} disabled={busy} className="w-full rounded-full bg-brand-orange hover:bg-brand-orange/90">
                {busy ? "Criando…" : "Criar conta"}
              </Button>
            </TabsContent>
          </Tabs>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button onClick={google} disabled={busy} variant="outline" className="w-full rounded-full">
            Continuar com Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
