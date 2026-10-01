import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, CheckCircle2, FlaskConical } from "lucide-react";
import {
  Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Progress,
} from "@/design-system/mj-design-system-db98fa";
import { TRILHA_MAP } from "@/lib/aprendizado/trilhas";
import { AVISO_SIMULACAO } from "@/lib/aprendizado/conteudo";
import { LABS } from "@/lib/aprendizado/labs";
import { useProgresso } from "@/lib/aprendizadoStore";

export default function TrilhaAprendizado() {
  const { slug } = useParams();
  const trilha = slug ? TRILHA_MAP[slug] : undefined;
  const { progresso } = useProgresso();

  if (!trilha) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl">Trilha não encontrada</h1>
        <Link to="/aprender">
          <Button variant="outline" className="rounded-full gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar à Central
          </Button>
        </Link>
      </div>
    );
  }

  const feitas = trilha.licoes.filter((l) => progresso[l.slug] === "concluida").length;
  const pct = trilha.licoes.length ? Math.round((feitas / trilha.licoes.length) * 100) : 0;
  const Icon = trilha.icon;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <Link to="/aprender" className="text-xs text-muted-foreground hover:text-foreground">
          ← Central de Aprendizado
        </Link>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-border">
            <Icon className="h-5 w-5 text-brand-orange" />
          </span>
          <div>
            <h1 className="font-display text-4xl">
              Trilha <span className="text-brand-orange">{trilha.titulo}</span>
            </h1>
            <p className="text-muted-foreground">{trilha.subtitulo}</p>
          </div>
        </div>
        <div className="max-w-md space-y-1">
          <Progress value={pct} />
          <p className="text-xs text-muted-foreground">
            {feitas} de {trilha.licoes.length} lições estudadas.
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {trilha.licoes.map((licao) => {
          const temLab = !!licao.praticaId && LABS.some((l) => l.id === licao.praticaId);
          const concluida = progresso[licao.slug] === "concluida";
          return (
            <Card key={licao.slug} className="rounded-xl shadow-card">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-widest">
                    {licao.nivel}
                  </Badge>
                  {concluida && (
                    <Badge variant="secondary" className="rounded-full text-[10px]">
                      <CheckCircle2 className="mr-1 h-3 w-3 text-brand-orange" /> Estudada
                    </Badge>
                  )}
                  {temLab && (
                    <Badge variant="secondary" className="rounded-full text-[10px]">
                      <FlaskConical className="mr-1 h-3 w-3 text-brand-orange" /> Prática
                    </Badge>
                  )}
                </div>
                <CardTitle className="font-display text-xl">{licao.titulo}</CardTitle>
                <CardDescription>{licao.resumo}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Link to={`/aprender/licao/${licao.slug}`}>
                  <Button variant="outline" size="sm" className="rounded-full gap-2">
                    <BookOpen className="h-4 w-4" /> Estudar
                  </Button>
                </Link>
                <Link to={licao.rota}>
                  <Button variant="ghost" size="sm" className="rounded-full">
                    Abrir a tela
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="rounded-xl border border-border bg-muted p-4 text-xs text-muted-foreground">
        {AVISO_SIMULACAO}
      </p>
    </div>
  );
}
