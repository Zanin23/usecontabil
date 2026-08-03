import { Link } from "react-router-dom";
import { BookOpen, FlaskConical, GraduationCap, Library, CheckCircle2 } from "lucide-react";
import {
  Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Progress,
} from "@/design-system/mj-design-system-db98fa";
import { TRILHAS } from "@/lib/aprendizado/trilhas";
import { GLOSSARIO } from "@/lib/aprendizado/glossario";
import { AVISO_SIMULACAO, LICOES } from "@/lib/aprendizado/conteudo";
import { useProgresso } from "@/lib/aprendizadoStore";

export default function CentralAprendizado() {
  const { progresso, concluidas } = useProgresso();
  const total = LICOES.length;
  const pct = total ? Math.round((concluidas / total) * 100) : 0;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Central de Aprendizado
        </div>
        <h1 className="font-display text-4xl">
          Aprenda o sistema e a <span className="text-brand-orange">contabilidade por trás dele.</span>
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          Cada lição explica duas coisas: como operar a tela e qual conceito contábil ou fiscal ela
          representa. Aberta a todos os perfis — o conteúdo é didático e não expõe dado de empresa.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl shadow-card">
          <CardHeader className="pb-2">
            <CardDescription>Seu progresso</CardDescription>
            <CardTitle className="font-display text-3xl">
              {concluidas}/{total}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={pct} />
            <p className="text-xs text-muted-foreground">{pct}% das lições marcadas como estudadas.</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-card">
          <CardHeader className="pb-2">
            <CardDescription>Glossário técnico</CardDescription>
            <CardTitle className="font-display text-3xl">{GLOSSARIO.length} termos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Pesquisável também pela paleta de comandos (Ctrl/Cmd + K).
            </p>
            <Link to="/aprender/glossario">
              <Button variant="outline" size="sm" className="rounded-full gap-2">
                <Library className="h-4 w-4" />
                Abrir glossário
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-card">
          <CardHeader className="pb-2">
            <CardDescription>Modo prática</CardDescription>
            <CardTitle className="font-display text-3xl">Sandbox</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Rode os motores com dados fictícios, isolados da competência real.
            </p>
            <Link to="/aprender/pratica">
              <Button variant="outline" size="sm" className="rounded-full gap-2">
                <FlaskConical className="h-4 w-4" />
                Abrir laboratórios
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Trilhas por área</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {TRILHAS.map((trilha) => {
            const Icon = trilha.icon;
            const feitas = trilha.licoes.filter((l) => progresso[l.slug] === "concluida").length;
            const pctTrilha = trilha.licoes.length
              ? Math.round((feitas / trilha.licoes.length) * 100)
              : 0;
            return (
              <Card key={trilha.slug} className="rounded-3xl shadow-card">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-border">
                        <Icon className="h-5 w-5 text-brand-orange" />
                      </span>
                      <div className="min-w-0">
                        <CardTitle className="font-display text-xl">{trilha.titulo}</CardTitle>
                        <CardDescription className="truncate">{trilha.licoes.length} lições</CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="rounded-full shrink-0">
                      {feitas}/{trilha.licoes.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{trilha.subtitulo}</p>
                  <Progress value={pctTrilha} />
                  <div className="flex flex-wrap gap-2">
                    {trilha.licoes.slice(0, 3).map((l) => (
                      <Badge key={l.slug} variant="secondary" className="rounded-full">
                        {progresso[l.slug] === "concluida" && (
                          <CheckCircle2 className="mr-1 h-3 w-3 text-brand-orange" />
                        )}
                        {l.titulo}
                      </Badge>
                    ))}
                  </div>
                  <Link to={`/aprender/trilha/${trilha.slug}`}>
                    <Button variant="outline" size="sm" className="rounded-full gap-2">
                      <BookOpen className="h-4 w-4" />
                      Ver trilha
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <p className="flex items-start gap-2 rounded-3xl border border-border bg-muted p-4 text-xs text-muted-foreground">
        <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
        {AVISO_SIMULACAO}
      </p>
    </div>
  );
}
