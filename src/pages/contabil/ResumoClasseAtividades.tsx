import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Badge, Button, Card, CardContent,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import { ChevronRight, ListTree } from "lucide-react";
import { useAtividades } from "@/lib/atividadesStore";
import { classeAtividadeIdDe, loadEmpresas } from "@/lib/empresasStore";

export default function ResumoClasseAtividades() {
  const { atividades } = useAtividades();
  const empresas = loadEmpresas();

  const linhas = useMemo(() => {
    const grupos = new Map<string, { classes: number; empresas: number; cnaes: string[] }>();
    atividades.forEach((a) => {
      const g = a.grupo || a.tipo;
      const cur = grupos.get(g) ?? { classes: 0, empresas: 0, cnaes: [] };
      cur.classes += 1;
      cur.cnaes.push(a.cnae);
      cur.empresas += empresas.filter(
        (e) => classeAtividadeIdDe(e.raw) === a.id,
      ).length;
      grupos.set(g, cur);
    });
    return [...grupos.entries()]
      .map(([grupo, v]) => ({ grupo, ...v }))
      .sort((a, b) => b.empresas - a.empresas || a.grupo.localeCompare(b.grupo));
  }, [atividades, empresas]);

  const semClasse = empresas.filter((e) => !classeAtividadeIdDe(e.raw)).length;

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/dashboard" className="hover:text-foreground">Início</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/preparativos" className="hover:text-foreground">Preparativos</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/preparativos/cadastros" className="hover:text-foreground">Cadastros</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Resumo classe de atividades</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-card border border-border grid place-items-center shadow-card">
            <ListTree className="h-6 w-6 text-brand-orange" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Preparativos · Cadastros
            </div>
            <h1 className="font-display text-4xl mt-1.5">Resumo por classe de atividades</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Consolidado das empresas do grupo por grupo CNAE, calculado a partir das classes cadastradas.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/preparativos/cadastros/classe-atividades">Gerenciar classes</Link>
        </Button>
      </div>

      <Card className="rounded-2xl border-border/70">
        <CardContent className="p-4 flex flex-wrap items-center gap-3 text-xs">
          <Badge variant="outline" className="rounded-full">{atividades.length} classes</Badge>
          <Badge variant="outline" className="rounded-full">{empresas.length} empresas</Badge>
          <Badge variant="outline" className="rounded-full">
            {semClasse} empresa(s) sem classe vinculada
          </Badge>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/70 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Grupo CNAE</TableHead>
              <TableHead>CNAEs</TableHead>
              <TableHead className="text-right">Classes</TableHead>
              <TableHead className="text-right">Empresas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-10">
                  Cadastre classes de atividade para ver o resumo.
                </TableCell>
              </TableRow>
            )}
            {linhas.map((l) => (
              <TableRow key={l.grupo}>
                <TableCell>{l.grupo}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {l.cnaes.join(", ")}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">{l.classes}</TableCell>
                <TableCell className="text-right font-mono text-xs">{l.empresas}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
