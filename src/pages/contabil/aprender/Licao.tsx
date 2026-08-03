import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowUpRight, BookOpen, CheckCircle2, FlaskConical, Info, Scale } from "lucide-react";
import {
  Badge, Button, Card, CardContent, CardHeader, CardTitle,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { AVISO_SIMULACAO, LICAO_MAP } from "@/lib/aprendizado/conteudo";
import { TERMO_MAP } from "@/lib/aprendizado/glossario";
import { trilhaDaLicao } from "@/lib/aprendizado/trilhas";
import { LABS } from "@/lib/aprendizado/labs";
import { marcarLicao, useProgresso } from "@/lib/aprendizadoStore";

export default function LicaoAprendizado() {
  const { slug } = useParams();
  const licao = slug ? LICAO_MAP[slug] : undefined;
  const { progresso } = useProgresso();

  useEffect(() => {
    if (licao) void marcarLicao(licao.slug, "vista");
  }, [licao]);

  if (!licao) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl">Lição não encontrada</h1>
        <Link to="/aprender">
          <Button variant="outline" className="rounded-full">Voltar à Central</Button>
        </Link>
      </div>
    );
  }

  const trilha = trilhaDaLicao(licao.slug);
  const temLab = !!licao.praticaId && LABS.some((l) => l.id === licao.praticaId);
  const concluida = progresso[licao.slug] === "concluida";

  return (
    <div className="space-y-8 max-w-4xl">
      <header className="space-y-3">
        <Link
          to={trilha ? `/aprender/trilha/${trilha.slug}` : "/aprender"}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← {trilha ? `Trilha ${trilha.titulo}` : "Central de Aprendizado"}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-widest">
            {licao.nivel}
          </Badge>
          {concluida && (
            <Badge variant="secondary" className="rounded-full text-[10px]">
              <CheckCircle2 className="mr-1 h-3 w-3 text-brand-orange" /> Estudada
            </Badge>
          )}
        </div>
        <h1 className="font-display text-4xl">{licao.titulo}</h1>
        <p className="text-muted-foreground">{licao.resumo}</p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Link to={licao.rota}>
            <Button variant="outline" size="sm" className="rounded-full gap-2">
              <ArrowUpRight className="h-4 w-4" /> Abrir a tela
            </Button>
          </Link>
          {temLab && (
            <Link to={`/aprender/pratica?lab=${licao.praticaId}`}>
              <Button variant="outline" size="sm" className="rounded-full gap-2">
                <FlaskConical className="h-4 w-4" /> Praticar
              </Button>
            </Link>
          )}
          <Button
            size="sm"
            className="rounded-full gap-2 bg-brand-orange hover:bg-brand-orange/90"
            onClick={() => {
              void marcarLicao(licao.slug, "concluida");
              toast.success("Lição marcada como estudada.");
            }}
          >
            <CheckCircle2 className="h-4 w-4" /> Marcar como estudada
          </Button>
        </div>
      </header>

      <Card className="rounded-3xl shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-xl">
            <Info className="h-4 w-4 text-brand-orange" /> Como usar esta tela
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 list-decimal pl-5 text-sm text-muted-foreground">
            {licao.comoUsar.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card className="rounded-3xl shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-xl">
            <BookOpen className="h-4 w-4 text-brand-orange" /> O conceito contábil/fiscal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 list-disc pl-5 text-sm text-muted-foreground">
            {licao.conceito.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          {licao.baseLegal?.length ? (
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-orange" />
              Base legal de referência: {licao.baseLegal.join(" · ")}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {licao.termos.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Termos relacionados</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {licao.termos.map((s) => {
              const termo = TERMO_MAP[s];
              if (!termo) return null;
              return (
                <Link key={s} to={`/aprender/glossario?termo=${s}`}>
                  <Card className="rounded-2xl shadow-card h-full">
                    <CardContent className="p-4">
                      <div className="font-display text-lg">{termo.termo}</div>
                      <p className="text-sm text-muted-foreground">{termo.resumo}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <p className="rounded-3xl border border-border bg-muted p-4 text-xs text-muted-foreground">
        {AVISO_SIMULACAO}
      </p>
    </div>
  );
}
