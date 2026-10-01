import { Fragment, useMemo } from "react";
import { BookText, Printer } from "lucide-react";
import {
  Badge, Button, Card, CardContent, Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import CabecalhoPagina from "@/components/contabil/cadastros/CabecalhoPagina";
import ExportarMenu from "@/components/contabil/ExportarMenu";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import { useCentros, useContas } from "@/lib/planoContasStore";
import { participantePorId } from "@/lib/cadastrosStore";
import { dataBR, fimDaCompetencia, moeda, totalCreditos, totalDebitos, useLancamentos } from "@/lib/lancamentosStore";

export default function Diario() {
  const { empresa } = useEmpresaAtual();
  const empresaId = empresa?.id ?? "";
  const { competenciasNoPeriodo } = useCompetencia();
  const primeira = competenciasNoPeriodo[0];
  const ultima = competenciasNoPeriodo[competenciasNoPeriodo.length - 1];
  const inicio = `${primeira}-01`;
  const fim = fimDaCompetencia(ultima);
  const periodo = primeira === ultima ? formatCompetencia(primeira) : `${formatCompetencia(primeira)} a ${formatCompetencia(ultima)}`;
  const lancamentos = useLancamentos(empresaId, inicio, fim);
  const contas = useContas();
  const centros = useCentros();
  const porId = useMemo(() => new Map(contas.map((c) => [c.id, c])), [contas]);
  const totalD = lancamentos.reduce((s, l) => s + totalDebitos(l), 0);
  const totalC = lancamentos.reduce((s, l) => s + totalCreditos(l), 0);

  const linhasExportacao = lancamentos.flatMap((l) =>
    l.partidas.map((p, i) => ({
      data: i === 0 ? dataBR(l.data) : "", numero: i === 0 ? String(l.numero) : "", historico: i === 0 ? l.historico : "",
      conta: `${porId.get(p.contaId)?.codigo ?? ""} ${porId.get(p.contaId)?.descricao ?? ""}`.trim(),
      debito: p.tipo === "D" ? moeda(p.valor) : "", credito: p.tipo === "C" ? moeda(p.valor) : "",
    })),
  );

  return (
    <div className="space-y-6 pb-16">
      <CabecalhoPagina
        trilha={[{ rotulo: "Contábil", para: "/contabil" }, { rotulo: "Relatórios", para: "/contabil/relatorios" }]}
        icone={BookText}
        titulo="Diário"
        descricao="Lançamentos em ordem cronológica, com todas as partidas. Visualização do livro — os termos de abertura e encerramento e a autenticação ficam para a geração da ECD."
        acoes={
          <>
            <ExportarMenu
              nome={`Diário ${periodo}`}
              colunas={[
                { key: "data", label: "Data" }, { key: "numero", label: "Nº" }, { key: "historico", label: "Histórico" },
                { key: "conta", label: "Conta" }, { key: "debito", label: "Débito" }, { key: "credito", label: "Crédito" },
              ]}
              linhas={linhasExportacao}
            />
            <Button variant="outline" className="rounded-full" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir
            </Button>
          </>
        }
      >
        <Badge variant="secondary" className="rounded-full">{empresa?.razao ?? "Nenhuma empresa selecionada"}</Badge>
        <Badge variant="secondary" className="rounded-full">{periodo}</Badge>
      </CabecalhoPagina>

      <Card className="rounded-xl shadow-card">
        <CardContent className="p-4">
          {!empresaId ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Selecione uma empresa no topo da tela.</p>
          ) : lancamentos.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Nenhum lançamento em {periodo}.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Nº</TableHead>
                    <TableHead>Conta / histórico</TableHead>
                    <TableHead className="text-right">Débito</TableHead>
                    <TableHead className="text-right">Crédito</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lancamentos.map((l) => (
                    <Fragment key={l.id}>
                      {l.partidas.map((p, i) => {
                        const conta = porId.get(p.contaId);
                        const extras = [
                          centros.find((c) => c.id === p.centroCustoId)?.codigo ? `C.C. ${centros.find((c) => c.id === p.centroCustoId)?.codigo}` : "",
                          participantePorId(p.participanteId)?.nome ?? "",
                        ].filter(Boolean).join(" · ");
                        return (
                          <TableRow key={`${l.id}-${p.id}`} className={i === 0 ? "border-t-2 border-border" : "border-0"}>
                            <TableCell className="whitespace-nowrap font-mono text-xs">{i === 0 ? dataBR(l.data) : ""}</TableCell>
                            <TableCell className="font-mono text-xs">{i === 0 ? l.numero : ""}</TableCell>
                            <TableCell className="text-sm">
                              <span className={p.tipo === "C" ? "pl-6" : ""}>
                                <span className="font-mono text-xs text-muted-foreground">{conta?.codigo ?? "?"}</span> {conta?.descricao ?? "Conta excluída"}
                              </span>
                              {extras ? <span className="ml-2 text-xs text-muted-foreground">({extras})</span> : null}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right font-mono text-xs">{p.tipo === "D" ? moeda(p.valor) : ""}</TableCell>
                            <TableCell className="whitespace-nowrap text-right font-mono text-xs">{p.tipo === "C" ? moeda(p.valor) : ""}</TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="border-0">
                        <TableCell />
                        <TableCell />
                        <TableCell colSpan={3} className="pb-3 pt-0 text-xs italic text-muted-foreground">
                          {l.historico}{l.documento ? ` — Doc. ${l.documento}` : ""}{l.tipo !== "Normal" ? ` [${l.tipo}]` : ""}
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="font-medium">Totais do período ({lancamentos.length} lançamento(s))</TableCell>
                    <TableCell className="whitespace-nowrap text-right font-mono text-xs font-semibold">{moeda(totalD)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right font-mono text-xs font-semibold">{moeda(totalC)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
