import { useMemo } from "react";
import {
  Badge, Button, Card, CardContent, Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import { Link } from "react-router-dom";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import {
  brl, documentosDaCompetencia, useTributario, type DocumentoFiscal, type LinhaMemoria,
} from "@/lib/tributarioStore";

export type MotorConfig = {
  titulo: string;
  destaque: string;
  descricao: string;
  icone: LucideIcon;
  tributos: string[];
  parametros: { label: string; valor: string; hint?: string }[];
  dicas: string[];
};

/**
 * Visão genérica de um motor de tributação: consolida a memória de cálculo
 * dos documentos da competência filtrando pelos tributos do motor.
 */
export default function MotorTributacaoView({ config }: { config: MotorConfig }) {
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const empresaId = empresa?.id ?? "";
  const docs = useTributario(() => documentosDaCompetencia(empresaId, competencia), [empresaId, competencia]);

  const linhas = useMemo(() => {
    const out: { doc: DocumentoFiscal; linha: LinhaMemoria }[] = [];
    docs.forEach((d) =>
      d.memoria
        .filter((m) => config.tributos.includes(m.tributo))
        .forEach((linha) => out.push({ doc: d, linha })),
    );
    return out;
  }, [docs, config.tributos]);

  const total = linhas.reduce((s, l) => s + l.linha.valor, 0);
  const baseTotal = linhas.reduce((s, l) => s + l.linha.base, 0);
  const docsAfetados = new Set(linhas.map((l) => l.doc.id)).size;

  const porUf = useMemo(() => {
    const map = new Map<string, number>();
    linhas.forEach((l) => map.set(l.doc.ufDestino, (map.get(l.doc.ufDestino) ?? 0) + l.linha.valor));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [linhas]);

  const Icone = config.icone;

  const contexto = {
    tela: config.titulo,
    modulo: "Financeiro › Tributação",
    competencia: formatCompetencia(competencia),
    empresa: empresa ? { razao: empresa.razao, regime: empresa.regime } : null,
    tributos: config.tributos,
    totalApurado: total,
    documentosAfetados: docsAfetados,
    porUf,
    orientacoes: config.dicas,
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-orange/15">
            <Icone className="h-5 w-5 text-brand-orange" />
          </div>
          <div>
            <h1 className="font-display text-2xl leading-tight">
              {config.titulo} <span className="text-brand-orange">{config.destaque}</span>
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">{config.descricao}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary" className="rounded-full">{formatCompetencia(competencia)}</Badge>
              <Badge variant="secondary" className="rounded-full">{empresa?.razao ?? "Nenhuma empresa selecionada"}</Badge>
            </div>
          </div>
        </div>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/financeiro/movimentos/faturamento">Ir para faturamento <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Valor apurado", valor: brl(total) },
          { label: "Base de cálculo", valor: brl(baseTotal) },
          { label: "Documentos afetados", valor: String(docsAfetados) },
          { label: "Lançamentos", valor: String(linhas.length) },
        ].map((k) => (
          <Card key={k.label} className="rounded-3xl shadow-card">
            <CardContent className="p-4">
              <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{k.label}</div>
              <div className="mt-1 font-display text-xl">{k.valor}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-3xl shadow-card lg:col-span-1">
          <CardContent className="space-y-3 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Parâmetros do motor</div>
            {config.parametros.map((p) => (
              <div key={p.label} className="rounded-2xl border p-3">
                <div className="text-xs text-muted-foreground">{p.label}</div>
                <div className="font-mono text-sm">{p.valor}</div>
                {p.hint ? <div className="text-[11px] text-muted-foreground">{p.hint}</div> : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-card lg:col-span-2">
          <CardContent className="space-y-3 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Distribuição por UF de destino</div>
            {porUf.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum lançamento deste motor na competência. Emita documentos em Movimentos para alimentar o cálculo.
              </p>
            ) : porUf.map(([uf, valor]) => (
              <div key={uf} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono">{uf}</span>
                  <span className="font-mono">{brl(valor)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-brand-orange" style={{ width: `${total ? (valor / total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl shadow-card">
        <CardContent className="space-y-4 p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Memória de cálculo consolidada</div>
          {linhas.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Sem memória de cálculo para exibir.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Tributo</TableHead>
                    <TableHead>Detalhe</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">Alíquota</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Fundamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhas.map(({ doc, linha }, i) => (
                    <TableRow key={`${doc.id}-${i}`}>
                      <TableCell className="font-mono text-xs">{doc.tipo} {doc.numero}</TableCell>
                      <TableCell><Badge variant="secondary" className="rounded-full">{linha.tributo}</Badge></TableCell>
                      <TableCell className="max-w-[260px] truncate text-xs">{linha.descricao}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{brl(linha.base)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{linha.aliquota !== undefined ? `${linha.aliquota}%` : "—"}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{brl(linha.valor)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{linha.fundamento ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl shadow-card">
        <CardContent className="p-5">
          <div className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Regras aplicadas por este motor</div>
          <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
            {config.dicas.map((d) => <li key={d}>{d}</li>)}
          </ul>
        </CardContent>
      </Card>

      <AssistenteFechamento contexto={contexto} resumo={`${config.titulo} — ${brl(total)} apurados`} rotulo="IA ajudante" />
    </div>
  );
}
