import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BookOpenText } from "lucide-react";
import {
  Badge, Card, CardContent, Label, Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import CabecalhoPagina from "@/components/contabil/cadastros/CabecalhoPagina";
import { SeletorConta } from "@/components/contabil/cadastros/SeletorBusca";
import ExportarMenu from "@/components/contabil/ExportarMenu";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import { rotuloConta, useContas } from "@/lib/planoContasStore";
import { dataBR, fimDaCompetencia, gerarRazao, moeda, saldoDC, useLancamentos } from "@/lib/lancamentosStore";
import BlocoOrientacao from "@/components/ux/BlocoOrientacao";

export default function Razao() {
  const { empresa } = useEmpresaAtual();
  const empresaId = empresa?.id ?? "";
  const { competenciasNoPeriodo } = useCompetencia();
  const primeira = competenciasNoPeriodo[0];
  const ultima = competenciasNoPeriodo[competenciasNoPeriodo.length - 1];
  const inicio = `${primeira}-01`;
  const fim = fimDaCompetencia(ultima);
  const periodo = primeira === ultima ? formatCompetencia(primeira) : `${formatCompetencia(primeira)} a ${formatCompetencia(ultima)}`;
  const [params, setParams] = useSearchParams();
  const contaId = params.get("conta") ?? "";
  const contas = useContas();
  const analiticas = useMemo(() => contas.filter((c) => c.tipo === "Analítica"), [contas]);
  const lancamentos = useLancamentos(empresaId);

  const razao = useMemo(
    () => (contaId && empresaId ? gerarRazao(empresaId, contaId, inicio, fim) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [empresaId, contaId, inicio, fim, lancamentos, contas],
  );

  const linhasExportacao = razao
    ? [
        { data: "", numero: "", historico: "Saldo anterior", contrapartida: "", debito: "", credito: "", saldo: saldoDC(razao.saldoAnterior) },
        ...razao.linhas.map((l) => ({
          data: dataBR(l.lancamento.data), numero: String(l.lancamento.numero), historico: l.lancamento.historico,
          contrapartida: l.contrapartida, debito: l.debito ? moeda(l.debito) : "", credito: l.credito ? moeda(l.credito) : "", saldo: saldoDC(l.saldo),
        })),
      ]
    : [];

  return (
    <div className="space-y-6 pb-16">
      <CabecalhoPagina
        trilha={[{ rotulo: "Contábil", para: "/contabil" }, { rotulo: "Relatórios", para: "/contabil/relatorios" }]}
        icone={BookOpenText}
        titulo="Razão"
        descricao="Movimento de uma conta no período, com saldo anterior, contrapartida e saldo linha a linha."
        acoes={
          razao ? (
            <ExportarMenu
              nome={`Razão ${razao.conta?.codigo ?? ""} ${periodo}`}
              colunas={[
                { key: "data", label: "Data" }, { key: "numero", label: "Nº" }, { key: "historico", label: "Histórico" },
                { key: "contrapartida", label: "Contrapartida" }, { key: "debito", label: "Débito" }, { key: "credito", label: "Crédito" },
                { key: "saldo", label: "Saldo" },
              ]}
              linhas={linhasExportacao}
            />
          ) : null
        }
      >
        <Badge variant="secondary" className="rounded-full">{empresa?.razao ?? "Nenhuma empresa selecionada"}</Badge>
        <Badge variant="secondary" className="rounded-full">{periodo}</Badge>
      </CabecalhoPagina>
      <BlocoOrientacao />

      <Card className="rounded-xl shadow-card">
        <CardContent className="space-y-4 p-4">
          <div className="max-w-xl space-y-1.5">
            <Label className="text-xs">Conta analítica</Label>
            <SeletorConta
              contas={analiticas}
              valor={contaId || undefined}
              onChange={(id) => setParams(id ? { conta: id } : {}, { replace: true })}
              ariaLabel="Conta do razão"
            />
          </div>

          {!empresaId ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Selecione uma empresa no topo da tela.</p>
          ) : !razao ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Escolha uma conta. Dica: no <Link className="underline" to="/contabil/relatorios/balancete">balancete</Link>, clique numa conta para abrir o razão dela.
            </p>
          ) : (
            <>
              <div className="text-sm font-medium">{rotuloConta(razao.conta)}</div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Nº</TableHead>
                      <TableHead>Histórico</TableHead>
                      <TableHead>Contrapartida</TableHead>
                      <TableHead className="text-right">Débito</TableHead>
                      <TableHead className="text-right">Crédito</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={6} className="text-xs font-medium">Saldo anterior a {dataBR(inicio)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono text-xs">{saldoDC(razao.saldoAnterior)}</TableCell>
                    </TableRow>
                    {razao.linhas.map((l) => (
                      <TableRow key={`${l.lancamento.id}-${l.partida.id}`}>
                        <TableCell className="whitespace-nowrap font-mono text-xs">{dataBR(l.lancamento.data)}</TableCell>
                        <TableCell className="font-mono text-xs">{l.lancamento.numero}</TableCell>
                        <TableCell className="max-w-[320px]">
                          <div className="truncate text-sm">{l.lancamento.historico}</div>
                          {l.partida.complemento ? <div className="truncate text-xs text-muted-foreground">{l.partida.complemento}</div> : null}
                        </TableCell>
                        <TableCell className="max-w-[240px] truncate text-xs">{l.contrapartida}</TableCell>
                        <TableCell className="whitespace-nowrap text-right font-mono text-xs">{l.debito ? moeda(l.debito) : ""}</TableCell>
                        <TableCell className="whitespace-nowrap text-right font-mono text-xs">{l.credito ? moeda(l.credito) : ""}</TableCell>
                        <TableCell className="whitespace-nowrap text-right font-mono text-xs">{saldoDC(l.saldo)}</TableCell>
                      </TableRow>
                    ))}
                    {!razao.linhas.length ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">Sem movimento no período.</TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={4} className="font-medium">Totais do período</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono text-xs font-semibold">{moeda(razao.debitos)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono text-xs font-semibold">{moeda(razao.creditos)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono text-xs font-semibold">{saldoDC(razao.saldoFinal)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
