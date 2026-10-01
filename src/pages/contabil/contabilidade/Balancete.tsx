import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, CircleAlert, Scale } from "lucide-react";
import {
  Badge, Card, CardContent, Checkbox, cn, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody,
  TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import CabecalhoPagina from "@/components/contabil/cadastros/CabecalhoPagina";
import ExportarMenu from "@/components/contabil/ExportarMenu";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import { useContas } from "@/lib/planoContasStore";
import { centavos, fimDaCompetencia, gerarBalancete, moeda, saldoDC, useLancamentos } from "@/lib/lancamentosStore";

export default function Balancete() {
  const { empresa } = useEmpresaAtual();
  const empresaId = empresa?.id ?? "";
  const { competenciasNoPeriodo } = useCompetencia();
  const primeira = competenciasNoPeriodo[0];
  const ultima = competenciasNoPeriodo[competenciasNoPeriodo.length - 1];
  const inicio = `${primeira}-01`;
  const fim = fimDaCompetencia(ultima);
  const periodo = primeira === ultima ? formatCompetencia(primeira) : `${formatCompetencia(primeira)} a ${formatCompetencia(ultima)}`;
  const [nivel, setNivel] = useState("0");
  const [ocultarZeradas, setOcultarZeradas] = useState(true);
  // Recalcula quando lançamentos ou contas mudam.
  const lancamentos = useLancamentos(empresaId);
  const contas = useContas();

  const bal = useMemo(
    () => gerarBalancete(empresaId, inicio, fim, { ocultarZeradas, nivelMaximo: Number(nivel) || undefined }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [empresaId, inicio, fim, ocultarZeradas, nivel, lancamentos, contas],
  );
  const fechaMovimento = centavos(bal.totais.debitos) === centavos(bal.totais.creditos);
  const fechaSaldo = centavos(bal.totais.devedor) === centavos(bal.totais.credor);
  const niveis = Math.max(1, ...contas.map((c) => c.codigo.split(".").length));

  const linhasExportacao = bal.linhas.map((l) => ({
    codigo: l.conta.codigo, descricao: l.conta.descricao, tipo: l.conta.tipo, anterior: saldoDC(l.saldoAnterior),
    debitos: moeda(l.debitos), creditos: moeda(l.creditos), atual: saldoDC(l.saldoAtual),
  }));

  return (
    <div className="space-y-6 pb-16">
      <CabecalhoPagina
        trilha={[{ rotulo: "Contábil", para: "/contabil" }, { rotulo: "Relatórios", para: "/contabil/relatorios" }]}
        icone={Scale}
        titulo="Balancete de verificação"
        descricao="Saldo anterior, débitos, créditos e saldo atual de cada conta no período. As contas sintéticas somam as analíticas."
        acoes={
          <ExportarMenu
            nome={`Balancete ${periodo}`}
            colunas={[
              { key: "codigo", label: "Conta" }, { key: "descricao", label: "Descrição" }, { key: "tipo", label: "Tipo" },
              { key: "anterior", label: "Saldo anterior" }, { key: "debitos", label: "Débitos" }, { key: "creditos", label: "Créditos" },
              { key: "atual", label: "Saldo atual" },
            ]}
            linhas={linhasExportacao}
          />
        }
      >
        <Badge variant="secondary" className="rounded-full">{empresa?.razao ?? "Nenhuma empresa selecionada"}</Badge>
        <Badge variant="secondary" className="rounded-full">{periodo}</Badge>
      </CabecalhoPagina>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className={cn("rounded-xl", fechaMovimento ? "border-success/30" : "border-destructive/40")}>
          <CardContent className="flex items-center gap-3 p-4 text-sm">
            {fechaMovimento ? <CheckCircle2 className="h-5 w-5 text-success" /> : <CircleAlert className="h-5 w-5 text-destructive" />}
            <div>
              <div className="font-medium">{fechaMovimento ? "Débitos = créditos no período" : "Débitos e créditos não fecham"}</div>
              <div className="font-mono text-xs text-muted-foreground">D {moeda(bal.totais.debitos)} · C {moeda(bal.totais.creditos)}</div>
            </div>
          </CardContent>
        </Card>
        <Card className={cn("rounded-xl", fechaSaldo ? "border-success/30" : "border-destructive/40")}>
          <CardContent className="flex items-center gap-3 p-4 text-sm">
            {fechaSaldo ? <CheckCircle2 className="h-5 w-5 text-success" /> : <CircleAlert className="h-5 w-5 text-destructive" />}
            <div>
              <div className="font-medium">{fechaSaldo ? "Saldos devedores = credores" : "Saldos devedores e credores não fecham"}</div>
              <div className="font-mono text-xs text-muted-foreground">D {moeda(bal.totais.devedor)} · C {moeda(bal.totais.credor)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl shadow-card">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={nivel} onValueChange={setNivel}>
              <SelectTrigger aria-label="Nível das contas" className="w-[180px] rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Todos os níveis</SelectItem>
                {Array.from({ length: niveis }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>Até o nível {i + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox checked={ocultarZeradas} onCheckedChange={(v) => setOcultarZeradas(v === true)} aria-label="Ocultar contas sem saldo nem movimento" />
              Ocultar contas sem saldo nem movimento
            </label>
            <Badge variant="secondary" className="rounded-full">{bal.linhas.length} conta(s)</Badge>
          </div>

          {!empresaId ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Selecione uma empresa no topo da tela.</p>
          ) : bal.linhas.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Sem saldos nem movimento em {periodo}. <Link className="underline" to="/contabil/escrituracao/lancamentos">Fazer lançamentos</Link>
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Conta</TableHead>
                    <TableHead className="text-right">Saldo anterior</TableHead>
                    <TableHead className="text-right">Débitos</TableHead>
                    <TableHead className="text-right">Créditos</TableHead>
                    <TableHead className="text-right">Saldo atual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bal.linhas.map((l) => {
                    const sintetica = l.conta.tipo === "Sintética";
                    return (
                      <TableRow key={l.conta.id} className={cn(sintetica && "bg-muted/30")}>
                        <TableCell className="min-w-[320px]">
                          <div className="flex items-center gap-2" style={{ paddingLeft: `${(l.nivel - 1) * 16}px` }}>
                            <span className="font-mono text-xs text-muted-foreground">{l.conta.codigo}</span>
                            {sintetica ? (
                              <span className="font-semibold">{l.conta.descricao}</span>
                            ) : (
                              <Link className="hover:underline" to={`/contabil/relatorios/razao?conta=${l.conta.id}`} title="Abrir o razão da conta">
                                {l.conta.descricao}
                              </Link>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right font-mono text-xs">{saldoDC(l.saldoAnterior)}</TableCell>
                        <TableCell className="whitespace-nowrap text-right font-mono text-xs">{moeda(l.debitos)}</TableCell>
                        <TableCell className="whitespace-nowrap text-right font-mono text-xs">{moeda(l.creditos)}</TableCell>
                        <TableCell className={cn("whitespace-nowrap text-right font-mono text-xs", sintetica && "font-semibold")}>{saldoDC(l.saldoAtual)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-medium">Totais (contas analíticas)</TableCell>
                    <TableCell />
                    <TableCell className="whitespace-nowrap text-right font-mono text-xs font-semibold">{moeda(bal.totais.debitos)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right font-mono text-xs font-semibold">{moeda(bal.totais.creditos)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right font-mono text-xs">
                      D {moeda(bal.totais.devedor)} · C {moeda(bal.totais.credor)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
          {bal.semConta ? (
            <p className="text-xs text-destructive">Há R$ {moeda(bal.semConta)} em lançamentos de contas que não existem mais no plano.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
