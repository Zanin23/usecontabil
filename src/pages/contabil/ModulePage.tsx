import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Badge, Button, Card, CardContent, Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { ChevronRight, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { findModule } from "@/lib/contabilNav";
import { EMPRESAS_EVENT, loadEmpresas, removeEmpresa, type EmpresaRecord } from "@/lib/empresasStore";
import ExportarMenu from "@/components/contabil/ExportarMenu";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import { useEmpresaAtual } from "@/lib/empresaAtual";

const accentText: Record<string, string> = {
  orange: "text-brand-orange",
  blue: "text-brand-blue",
  purple: "text-brand-purple",
  pink: "text-brand-pink",
};

const statusClass = (v: string) => {
  const s = v.toLowerCase();
  if (/(rejeit|erro|atrasad|diverg|pendente|falh)/.test(s)) return "text-destructive";
  if (/(aten|alert|aguard|em anda|processand|em aberto|suspens)/.test(s)) return "text-warn";
  if (/(ok|ativ|conclu|aceit|gerad|assinad|import|transmit|pago|emit|retif)/.test(s)) return "text-success";
  return "text-muted-foreground";
};

export default function ModulePage() {
  const { area: areaSlug, categoria, modulo } = useParams();
  const navigate = useNavigate();
  const { area, category, module } = findModule(areaSlug, categoria, modulo);
  const [savedEmpresas, setSavedEmpresas] = useState<EmpresaRecord[]>([]);

  const isEmpresas = module?.slug === "empresas" && category?.slug === "cadastros";

  const refreshEmpresas = () => {
    if (isEmpresas) setSavedEmpresas(loadEmpresas());
    else setSavedEmpresas([]);
  };

  useEffect(() => {
    refreshEmpresas();
    const onChange = () => refreshEmpresas();
    window.addEventListener(EMPRESAS_EVENT, onChange);
    window.addEventListener("storage", onChange);
    window.addEventListener("focus", onChange);
    return () => {
      window.removeEventListener(EMPRESAS_EVENT, onChange);
      window.removeEventListener("storage", onChange);
      window.removeEventListener("focus", onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module?.slug, category?.slug]);


  const handleDeleteEmpresa = async (rec: EmpresaRecord) => {
    if (!confirm(`Excluir "${rec.razao}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await removeEmpresa(rec.id);
      toast.success(`Empresa "${rec.razao}" removida`);
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível excluir na nuvem");
    }
    refreshEmpresas();
  };


  const extraRows = savedEmpresas.map((e) => ({
    __empresaId: e.id,
    cnpj: e.cnpj,
    razao: e.razao,
    regime: e.regime,
    atividade: e.atividade,
    status: e.status,
  }));

  if (!area || !category || !module) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center space-y-4">
        <h1 className="font-display text-3xl">Módulo não encontrado</h1>
        <p className="text-sm text-muted-foreground">
          Verifique a navegação na barra lateral.
        </p>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/dashboard">Voltar ao painel</Link>
        </Button>
      </div>
    );
  }

  const Icon = module.icon;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/dashboard" className="hover:text-foreground">Início</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to={`/${area.slug}`} className="hover:text-foreground">{area.title}</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to={`/${area.slug}/${category.slug}`} className="hover:text-foreground">{category.title}</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{module.title}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-card border border-border grid place-items-center shadow-card">
            <Icon className={`h-6 w-6 ${accentText[area.accent]}`} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {area.title} · {category.title}
            </div>
            <h1 className="font-display text-4xl mt-1.5">{module.title}</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{module.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => toast.success("Exportação simulada iniciada")}
          >
            <Download className="h-4 w-4 mr-2" /> Exportar
          </Button>
          {module.slug === "empresas" || module.slug === "dados-empresa" ? (
            <Button
              asChild
              className="rounded-full bg-brand-orange text-primary-foreground hover:bg-brand-orange/90"
            >
              <Link to={`/${area.slug}/${category.slug}/${module.slug}/novo`}>
                <Plus className="h-4 w-4 mr-2" />
                {module.primaryAction ?? "Novo registro"}
              </Link>
            </Button>
          ) : (
            <Button
              className="rounded-full bg-brand-orange text-primary-foreground hover:bg-brand-orange/90"
              onClick={() => toast.success(`${module.primaryAction ?? "Novo registro"} — protótipo visual`)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {module.primaryAction ?? "Novo registro"}
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="rounded-2xl border-border/70">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`Buscar em ${module.title.toLowerCase()}…`}
              className="pl-9 rounded-full bg-card"
            />
          </div>
          <Button variant="outline" className="rounded-full">
            <Filter className="h-4 w-4 mr-2" /> Filtros
          </Button>
          <Badge variant="outline" className="rounded-full">Competência 10/2024</Badge>
          <Badge variant="outline" className="rounded-full">Metalúrgica Andrade S.A.</Badge>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="rounded-2xl border-border/70 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>{module.rows.length + extraRows.length} registros exibidos</span>
          <span className="font-mono uppercase tracking-widest">Ambiente HOMOLOGAÇÃO</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              {module.columns.map((c) => (
                <TableHead
                  key={c.key}
                  className={c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""}
                >
                  {c.label}
                </TableHead>
              ))}
              {isEmpresas && <TableHead className="text-right w-[120px]">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...extraRows, ...module.rows].map((row: any, ri) => {
              const empresaId = row.__empresaId as string | undefined;
              return (
                <TableRow
                  key={ri}
                  className={empresaId ? "cursor-pointer hover:bg-muted/40" : ""}
                  onClick={() => empresaId && navigate(`/preparativos/cadastros/empresas/${empresaId}`)}
                >
                  {module.columns.map((c) => {
                    const v = row[c.key];
                    const isStatus = c.key === "status" || c.key === "situacao" || c.key === "abonada" || c.key === "resultado";
                    return (
                      <TableCell
                        key={c.key}
                        className={[
                          c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "",
                          c.mono ? "font-mono text-xs" : "",
                          isStatus && typeof v === "string" ? statusClass(v) : "",
                        ].join(" ")}
                      >
                        {v as any}
                      </TableCell>
                    );
                  })}
                  {isEmpresas && (
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {empresaId ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 rounded-full"
                            onClick={() => navigate(`/preparativos/cadastros/empresas/${empresaId}`)}
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 rounded-full text-destructive hover:text-destructive"
                            onClick={() => handleDeleteEmpresa(savedEmpresas.find((s) => s.id === empresaId)!)}
                            aria-label="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">exemplo</span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
