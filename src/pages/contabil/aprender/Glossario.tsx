import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, BookOpen, Search } from "lucide-react";
import {
  Badge, Button, Card, CardContent, Input,
} from "@/design-system/mj-design-system-db98fa";
import { GLOSSARIO, type AreaAprendizado } from "@/lib/aprendizado/glossario";
import { AVISO_SIMULACAO } from "@/lib/aprendizado/conteudo";

const AREAS: { id: AreaAprendizado | "todas"; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "geral", label: "Geral" },
  { id: "preparativos", label: "Preparativos" },
  { id: "fiscal", label: "Fiscal" },
  { id: "financeiro", label: "Financeiro" },
  { id: "administrativo", label: "Administrativo" },
];

export default function GlossarioAprendizado() {
  const [params] = useSearchParams();
  const destaque = params.get("termo") ?? "";
  const [busca, setBusca] = useState("");
  const [area, setArea] = useState<AreaAprendizado | "todas">("todas");

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return GLOSSARIO.filter((t) => area === "todas" || t.area === area).filter(
      (t) =>
        !q ||
        t.termo.toLowerCase().includes(q) ||
        t.resumo.toLowerCase().includes(q) ||
        (t.siglaDe ?? "").toLowerCase().includes(q),
    );
  }, [busca, area]);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Link to="/aprender" className="text-xs text-muted-foreground hover:text-foreground">
          ← Central de Aprendizado
        </Link>
        <h1 className="font-display text-4xl">
          Glossário <span className="text-brand-orange">técnico.</span>
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          {GLOSSARIO.length} termos de contabilidade e legislação fiscal explicados em linguagem
          direta, com a tela do sistema em que cada um aparece.
        </p>
      </header>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar termo, sigla ou definição"
            className="pl-9 rounded-full"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {AREAS.map((a) => (
            <Button
              key={a.id}
              size="sm"
              variant={area === a.id ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setArea(a.id)}
            >
              {a.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {lista.map((t) => (
          <Card
            key={t.slug}
            id={t.slug}
            className={`rounded-xl shadow-card ${destaque === t.slug ? "shadow-elevated" : ""}`}
          >
            <CardContent className="space-y-3 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-xl">{t.termo}</span>
                <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-widest">
                  {t.area}
                </Badge>
              </div>
              {t.siglaDe && <p className="text-xs text-muted-foreground">{t.siglaDe}</p>}
              <p className="text-sm">{t.resumo}</p>
              <p className="text-sm text-muted-foreground">{t.detalhe}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {t.licaoSlug && (
                  <Link to={`/aprender/licao/${t.licaoSlug}`}>
                    <Button variant="outline" size="sm" className="rounded-full gap-2">
                      <BookOpen className="h-4 w-4" /> Lição
                    </Button>
                  </Link>
                )}
                {t.rotas[0] && (
                  <Link to={t.rotas[0]}>
                    <Button variant="ghost" size="sm" className="rounded-full gap-2">
                      <ArrowUpRight className="h-4 w-4" /> Tela relacionada
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {lista.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum termo encontrado para essa busca.</p>
        )}
      </div>

      <p className="rounded-xl border border-border bg-muted p-4 text-xs text-muted-foreground">
        {AVISO_SIMULACAO}
      </p>
    </div>
  );
}
