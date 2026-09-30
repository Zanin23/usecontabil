import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import {
  Button, Card, CardContent, Input, Label, Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import {
  Building2, CalendarCheck2, Cloud, Lock, LogIn, Mail, ShieldCheck, Sparkles, User, UserPlus,
} from "lucide-react";
import LogoMark from "@/components/LogoMark";

/** Destaques mostrados ao lado do formulário (telas grandes). */
const DESTAQUES = [
  {
    icon: Building2,
    cor: "bg-primary/12 text-primary",
    titulo: "Empresas, filiais e grupo",
    texto: "Cadastro e regime tributário de cada empresa, num só painel.",
  },
  {
    icon: CalendarCheck2,
    cor: "bg-brand-blue/12 text-brand-blue",
    titulo: "Fechamento por competência",
    texto: "Apurações, obrigações e prazos organizados mês a mês.",
  },
  {
    icon: ShieldCheck,
    cor: "bg-brand-purple/12 text-brand-purple",
    titulo: "Acesso controlado",
    texto: "Cada pessoa entra depois da liberação do administrador.",
  },
  {
    icon: Cloud,
    cor: "bg-brand-teal/12 text-brand-teal",
    titulo: "Empresas na nuvem",
    texto: "O cadastro das empresas acompanha você em qualquer dispositivo.",
  },
] as const;

/** Campo com ícone à esquerda (só visual). */
function CampoComIcone({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) {
  return (
    <div className="group relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
      {children}
    </div>
  );
}

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
    toast.success("Conta criada. Aguarde a liberação do seu acesso pelo administrador.");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-aurora">
      {/* Manchas de cor que flutuam devagar ao fundo */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-32 h-96 w-96 rounded-full bg-[hsl(222_92%_60%/0.26)] blur-3xl animate-blob" />
        <div className="absolute -right-28 top-1/3 h-[28rem] w-[28rem] rounded-full bg-[hsl(286_78%_60%/0.20)] blur-3xl animate-blob [animation-delay:-7s]" />
        <div className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-[hsl(195_92%_58%/0.22)] blur-3xl animate-blob [animation-delay:-13s]" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 py-10 lg:grid-cols-2">
        {/* Apresentação */}
        <section className="hidden animate-page-enter lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/70 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Contabilidade interna do grupo
          </div>
          <h2 className="mt-5 text-5xl font-semibold leading-[1.05] tracking-tight">
            Toda a rotina contábil,{" "}
            <span className="text-gradient-brand">num só lugar.</span>
          </h2>
          <p className="mt-4 max-w-md text-base text-muted-foreground">
            Fechamento, apuração, obrigações e demonstrações das empresas e filiais do grupo.
          </p>
          <ul className="stagger mt-8 grid max-w-md gap-3">
            {DESTAQUES.map(({ icon: Icon, cor, titulo, texto }) => (
              <li
                key={titulo}
                className="lift flex items-start gap-3 rounded-2xl border border-border/70 bg-card/70 p-3.5 backdrop-blur"
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${cor}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-medium">{titulo}</span>
                  <span className="block text-xs text-muted-foreground">{texto}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Formulário */}
        <Card className="mx-auto w-full max-w-md animate-pop-in rounded-3xl border-white/70 bg-card/85 shadow-elevated backdrop-blur-xl">
          <CardContent className="space-y-6 p-7">
            <div className="flex items-center gap-3">
              <LogoMark className="h-11 w-11 text-xl" />
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
                  <CampoComIcone icon={Mail}>
                    <Input className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="voce@empresa.com.br" />
                  </CampoComIcone>
                </div>
                <div className="space-y-1.5">
                  <Label>Senha</Label>
                  <CampoComIcone icon={Lock}>
                    <Input className="pl-9" value={senha} onChange={(e) => setSenha(e.target.value)} type="password" placeholder="••••••••" />
                  </CampoComIcone>
                </div>
                <Button onClick={entrar} loading={busy} className="h-11 w-full rounded-xl">
                  {!busy && <LogIn />}
                  {busy ? "Entrando…" : "Entrar"}
                </Button>
              </TabsContent>

              <TabsContent value="criar" className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <CampoComIcone icon={User}>
                    <Input className="pl-9" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
                  </CampoComIcone>
                </div>
                <div className="space-y-1.5">
                  <Label>E-mail</Label>
                  <CampoComIcone icon={Mail}>
                    <Input className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="voce@empresa.com.br" />
                  </CampoComIcone>
                </div>
                <div className="space-y-1.5">
                  <Label>Senha</Label>
                  <CampoComIcone icon={Lock}>
                    <Input className="pl-9" value={senha} onChange={(e) => setSenha(e.target.value)} type="password" placeholder="Mínimo de 6 caracteres" />
                  </CampoComIcone>
                </div>
                <Button onClick={criarConta} loading={busy} className="h-11 w-full rounded-xl">
                  {!busy && <UserPlus />}
                  {busy ? "Criando…" : "Criar conta"}
                </Button>
              </TabsContent>
            </Tabs>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
              <span className="text-xs text-muted-foreground">ou</span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
            </div>

            <Button onClick={google} disabled={busy} variant="outline" className="h-11 w-full rounded-xl">
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
                <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z" />
                <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.8V6.5H1.4a12 12 0 0 0 0 11l4-3.1Z" />
                <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.5l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
              </svg>
              Continuar com Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
