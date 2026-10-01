import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Badge, Button, Card, CardContent, Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { findModule } from "@/lib/contabilNav";
import { EMPRESAS_EVENT, loadEmpresas, removeEmpresa, type EmpresaRecord } from "@/lib/empresasStore";
import ExportarMenu from "@/components/contabil/ExportarMenu";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { regimeDefinido } from "@/lib/regime";
import PageHeader from "@/components/contabil/PageHeader";

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
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const { competencia } = useCompetencia();
  const { empresa } = useEmpresaAtual();

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
    if (!confirm(`Excluir "${rec.razao}"? Esta ação não pode ser desfeita.\n\nOs lançamentos dela (documentos, apurações, guias…) continuam guardados neste navegador, sem vínculo com nenhuma empresa, e ocupam espaço.`)) return;
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

  const todasLinhas: any[] = [...extraRows, ...module.rows];
  const statusKey = module.columns.find((c) =>
    ["status", "situacao", "resultado", "abonada"].includes(c.key),
  )?.key;
  const opcoesStatus = statusKey
    ? Array.from(new Set(todasLinhas.map((r) => String(r[statusKey] ?? "")).filter(Boolean)))
    : [];
  const termo = busca.trim().toLowerCase();
  const visiveis = todasLinhas.filter((r) => {
    const okBusca = !termo || Object.values(r).join(" ").toLowerCase().includes(termo);
    const okStatus = statusFiltro === "todos" || !statusKey || String(r[statusKey]) === statusFiltro;
    return okBusca && okStatus;
  });

  const acoes = (
    <div className="flex items-center gap-2">
      <ExportarMenu
        nome={module.title}
        colunas={module.columns.map((c) => ({ key: c.key, label: c.label }))}
        linhas={visiveis.map((r: any) =>
          Object.fromEntries(module.columns.map((c) => [c.key, String(r[c.key] ?? "")])),
        )}
      />
      {module.primaryAction ? (
        <Button
          asChild
          className="rounded-lg bg-brand-orange text-primary-foreground hover:bg-brand-orange/90"
        >
          <Link to={`/${area.slug}/${category.slug}/${module.slug}/novo`}>
            <Plus className="h-4 w-4 mr-2" />
            {module.primaryAction}
          </Link>
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        trail={[
          { label: area.title, to: `/${area.slug}` },
          { label: category.title, to: `/${area.slug}/${category.slug}` },
        ]}
        icon={Icon}
        iconAccent={area.accent as any}
        eyebrow={`${area.title} · ${category.title}`}
        title={module.title}
        description={module.desc}
        badges={
          <>
            <Badge variant="outline" className="rounded-md">
              Competência {formatCompetencia(competencia)}
            </Badge>
            <Badge variant="outline" className="rounded-md">
              {empresa ? empresa.razao : "Nenhuma empresa selecionada"}
            </Badge>
          </>
        }
        actions={acoes}
      />

      {/* Filters */}
      <Card className="rounded-xl border-border/70">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`Buscar em ${module.title.toLowerCase()}…`}
              className="pl-9 rounded-lg bg-card"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          {opcoesStatus.length > 0 && (
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="w-52 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as situações</SelectItem>
                {opcoesStatus.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {visiveis.length} de {todasLinhas.length} registros
          </span>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="rounded-xl border-border/70 overflow-hidden">
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
            {visiveis.map((row: any, ri) => {
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
                    const regimePendente = isEmpresas && c.key === "regime" && typeof v === "string" && !regimeDefinido(v);
                    return (
                      <TableCell
                        key={c.key}
                        title={regimePendente ? "Regime tributário não definido — abra o cadastro (lápis) para definir" : undefined}
                        className={[
                          regimePendente ? "text-warn font-medium" : "",
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
