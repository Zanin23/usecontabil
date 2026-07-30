import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeftRight, CheckCircle2, Download, Landmark, Link2, Lock, RefreshCw,
  Unlink, Upload, AlertTriangle, Wand2,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, Input, Progress,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import AssistenteCampos from "@/components/contabil/AssistenteCampos";
import {
  CONCILIACAO_EVENT, brl, conciliarAutomatico, conciliarManual, contas, dataBR,
  desfazer, divergencias, fechar, limparConta, reabrir, resultado, vinculosDa,
  type Movimento, type ResultadoConta,
} from "@/lib/conciliacaoStore";

const CAMPOS_AJUDA = [
  { key: "extrato", label: "Extrato bancário", ajuda: "Movimentação enviada pelo banco (OFX/CNAB 240). É a fonte externa da conciliação." },
  { key: "razao", label: "Razão contábil", ajuda: "Lançamentos da conta contábil do banco (1.1.1.02.x) no período." },
  { key: "match", label: "Vínculo (match)", ajuda: "Amarração entre um ou mais itens do extrato e da contabilidade. Pode ser 1:1, 1:N ou N:N." },
  { key: "diferenca", label: "Diferença de saldo", ajuda: "Saldo do extrato menos saldo contábil. Deve ser zero para fechar a conta." },
  { key: "somente-banco", label: "Somente no banco", ajuda: "Tarifas, IOF e rendimentos que ainda não foram contabilizados." },
  { key: "somente-contabil", label: "Somente na contabilidade", ajuda: "Cheques/pagamentos provisionados que ainda não circularam no banco." },
  { key: "fechamento", label: "Fechamento da conta", ajuda: "Bloqueia a competência da conta após 100% conciliado e diferença zerada." },
];

function Indicador({ label, valor, tom }: { label: string; valor: string; tom?: "alerta" | "ok" }) {
  return (
    <div className={`min-w-0 rounded-2xl border p-3 ${tom === "alerta" ? "border-destructive/40 bg-destructive/5" : tom === "ok" ? "border-brand-orange/40 bg-brand-orange/5" : "border-border/70"}`}>
      <div className="text-[10px] uppercase leading-tight tracking-[0.06em] text-muted-foreground">{label}</div>
      <div className={`mt-0.5 break-words font-mono text-sm ${tom === "alerta" ? "text-destructive" : tom === "ok" ? "text-brand-orange" : ""}`}>{valor}</div>
    </div>
  );
}

function corStatus(status: ResultadoConta["status"]) {
  if (status === "Fechada") return "bg-brand-orange/15 text-brand-orange";
  if (status === "Conciliada") return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  if (status === "Divergente") return "bg-destructive/15 text-destructive";
  if (status === "Em andamento") return "bg-muted text-foreground";
  return "bg-muted text-muted-foreground";
}

function LinhaMov({
  m, marcado, onToggle,
}: { m: Movimento; marcado: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`w-full rounded-2xl border p-3 text-left transition-colors ${marcado ? "border-brand-orange bg-brand-orange/5" : "border-border/70 hover:bg-muted/50"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm">{m.historico}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-mono">{dataBR(m.data)}</span>
            <span className="font-mono">doc {m.documento}</span>
            <Badge variant="secondary" className="rounded-full text-[10px]">{m.categoria}</Badge>
          </div>
        </div>
        <div className={`shrink-0 font-mono text-sm ${m.tipo === "Crédito" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
          {m.tipo === "Crédito" ? "+" : "−"}{brl(m.valor)}
        </div>
      </div>
    </button>
  );
}

export default function ConciliacaoBancaria() {
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const lista = useMemo(() => contas(), []);
  const [contaId, setContaId] = useState(lista[0].id);
  const [tick, setTick] = useState(0);
  const [busca, setBusca] = useState("");
  const [selExt, setSelExt] = useState<string[]>([]);
  const [selCtb, setSelCtb] = useState<string[]>([]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    window.addEventListener(CONCILIACAO_EVENT, refresh);
    return () => window.removeEventListener(CONCILIACAO_EVENT, refresh);
  }, [refresh]);

  const resultados = useMemo(
    () => lista.map((c) => resultado(c, empresa?.id, competencia)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lista, empresa, competencia, tick],
  );
  const res = resultados.find((r) => r.conta.id === contaId)!;
  const divs = useMemo(() => divergencias(res), [res]);
  const vinculos = useMemo(() => vinculosDa(contaId, competencia), [contaId, competencia, tick]);

  const filtro = (m: Movimento) =>
    !busca ||
    m.historico.toLowerCase().includes(busca.toLowerCase()) ||
    m.documento.includes(busca) ||
    String(m.valor).includes(busca);

  const totalDiferenca = resultados.reduce((a, r) => a + Math.abs(r.diferenca), 0);
  const pendentes = resultados.reduce((a, r) => a + r.pendentesExtrato.length + r.pendentesContabil.length, 0);
  const conciliadasOk = resultados.filter((r) => r.percentual === 100).length;

  const toggle = (arr: string[], set: (v: string[]) => void, id: string) =>
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  const somaSel = (ids: string[], fonte: Movimento[]) =>
    fonte.filter((m) => ids.includes(m.id)).reduce((a, m) => a + (m.tipo === "Crédito" ? m.valor : -m.valor), 0);

  const difSelecao = Math.round((somaSel(selExt, res.extrato) - somaSel(selCtb, res.contabil)) * 100) / 100;

  const rodarAuto = () => {
    const n = conciliarAutomatico(contaId, competencia, res.extrato, res.contabil);
    toast.success(n ? `${n} movimento(s) conciliados automaticamente.` : "Nenhum novo par encontrado pelo motor.");
  };

  const vincular = () => {
    if (!selExt.length || !selCtb.length) return toast.error("Selecione itens dos dois lados.");
    conciliarManual(contaId, competencia, selExt, selCtb, difSelecao !== 0 ? `Diferença aceita de ${brl(Math.abs(difSelecao))}` : undefined);
    setSelExt([]); setSelCtb([]);
    toast.success("Vínculo manual registrado.");
  };

  return (
    <div className="space-y-6 pb-16">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Financeiro · Operacional</div>
        <h1 className="flex items-center gap-3 font-display text-3xl sm:text-4xl">
          <span className="rounded-2xl bg-brand-orange/10 p-2"><Landmark className="h-6 w-6 text-brand-orange" /></span>
          Conciliação bancária
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Extrato bancário x razão contábil por conta e competência, com motor de match automático,
          tratamento de divergências e fechamento bloqueado da conta.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary" className="rounded-full">{formatCompetencia(competencia)}</Badge>
          <Badge variant="secondary" className="rounded-full">{empresa?.razao ?? "Nenhuma empresa selecionada"}</Badge>
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link to="/financeiro/operacional">Voltar</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Indicador label="Contas monitoradas" valor={String(lista.length)} />
        <Indicador label="Contas 100% conciliadas" valor={`${conciliadasOk}/${lista.length}`} tom={conciliadasOk === lista.length ? "ok" : undefined} />
        <Indicador label="Itens pendentes" valor={String(pendentes)} tom={pendentes > 0 ? "alerta" : undefined} />
        <Indicador label="Diferença acumulada" valor={brl(totalDiferenca)} tom={totalDiferenca > 0.009 ? "alerta" : "ok"} />
        <Indicador label="Divergências da conta" valor={String(divs.length)} tom={divs.length > 0 ? "alerta" : undefined} />
      </div>

      <Tabs defaultValue="contas">
        <div className="-mx-4 px-4 overflow-x-auto lg:mx-0 lg:px-0">
          <TabsList className="rounded-full">
            <TabsTrigger value="contas" className="rounded-full">Contas</TabsTrigger>
            <TabsTrigger value="workspace" className="rounded-full">Conciliar</TabsTrigger>
            <TabsTrigger value="divergencias" className="rounded-full">Divergências</TabsTrigger>
            <TabsTrigger value="importacao" className="rounded-full">Importação</TabsTrigger>
            <TabsTrigger value="historico" className="rounded-full">Histórico</TabsTrigger>
          </TabsList>
        </div>


        {/* ---------------------------------------------------------- contas */}
        <TabsContent value="contas" className="mt-6">
          <Card className="rounded-3xl border-border/70">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Conta</TableHead>
                    <TableHead>Conta contábil</TableHead>
                    <TableHead className="text-right">Saldo banco</TableHead>
                    <TableHead className="text-right">Saldo contábil</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultados.map((r) => (
                    <TableRow key={r.conta.id} className={r.conta.id === contaId ? "bg-brand-orange/5" : ""}>
                      <TableCell>
                        <div className="text-sm">{r.conta.banco}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {r.conta.codigo} · ag {r.conta.agencia} · cc {r.conta.conta}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.conta.contaContabil}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{brl(r.saldoBanco)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{brl(r.saldoContabil)}</TableCell>
                      <TableCell className={`text-right font-mono text-xs ${Math.abs(r.diferenca) > 0.009 ? "text-destructive" : ""}`}>{brl(r.diferenca)}</TableCell>
                      <TableCell className="w-40">
                        <Progress value={r.percentual} className="h-2" />
                        <div className="mt-1 text-[10px] text-muted-foreground">{r.percentual}% conciliado</div>
                      </TableCell>
                      <TableCell><Badge className={`rounded-full ${corStatus(r.status)}`}>{r.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="rounded-full" onClick={() => setContaId(r.conta.id)}>
                          Abrir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------- workspace */}
        <TabsContent value="workspace" className="mt-6 space-y-4">
          <Card className="rounded-3xl border-border/70">
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="text-sm">{res.conta.banco} · ag {res.conta.agencia} · cc {res.conta.conta}</div>
                <div className="text-xs text-muted-foreground">
                  Diferença de saldo: <span className={Math.abs(res.diferenca) > 0.009 ? "text-destructive" : ""}>{brl(res.diferenca)}</span> · {res.percentual}% conciliado
                </div>
              </div>
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar histórico, documento ou valor"
                className="h-9 w-full rounded-full sm:w-72"
              />
              <Button size="sm" className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={rodarAuto}>
                <Wand2 className="mr-2 h-4 w-4" /> Conciliar automático
              </Button>
              <Button size="sm" variant="outline" className="rounded-full" onClick={vincular}>
                <Link2 className="mr-2 h-4 w-4" /> Vincular seleção
              </Button>
              <Button
                size="sm" variant="outline" className="rounded-full"
                onClick={() => { limparConta(contaId, competencia); toast.success("Conciliações da conta desfeitas."); }}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Reprocessar
              </Button>
              {res.fechada ? (
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => reabrir(contaId, competencia)}>
                  Reabrir conta
                </Button>
              ) : (
                <Button
                  size="sm" variant="outline" className="rounded-full"
                  onClick={() => {
                    if (res.percentual < 100 || Math.abs(res.diferenca) > 0.009)
                      return toast.error("Conclua 100% da conciliação e zere a diferença para fechar.");
                    fechar(contaId, competencia);
                    toast.success("Conta fechada na competência.");
                  }}
                >
                  <Lock className="mr-2 h-4 w-4" /> Fechar conta
                </Button>
              )}
            </CardContent>
          </Card>

          {(selExt.length > 0 || selCtb.length > 0) && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-orange/40 bg-brand-orange/5 p-3 text-xs">
              <ArrowLeftRight className="h-4 w-4 text-brand-orange" />
              <span>{selExt.length} do extrato · {selCtb.length} da contabilidade</span>
              <span className={`font-mono ${Math.abs(difSelecao) > 0.009 ? "text-destructive" : "text-brand-orange"}`}>
                diferença da seleção {brl(difSelecao)}
              </span>
              <Button size="sm" variant="ghost" className="rounded-full" onClick={() => { setSelExt([]); setSelCtb([]); }}>
                Limpar seleção
              </Button>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-3xl border-border/70">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Extrato bancário</div>
                  <Badge variant="secondary" className="rounded-full text-[10px]">{res.pendentesExtrato.length} pendentes</Badge>
                </div>
                {res.pendentesExtrato.filter(filtro).map((m) => (
                  <LinhaMov key={m.id} m={m} marcado={selExt.includes(m.id)} onToggle={() => toggle(selExt, setSelExt, m.id)} />
                ))}
                {res.pendentesExtrato.length === 0 && (
                  <div className="flex items-center gap-2 rounded-2xl border border-border/70 p-4 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-brand-orange" /> Todo o extrato está conciliado.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border/70">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Razão contábil · {res.conta.contaContabil}</div>
                  <Badge variant="secondary" className="rounded-full text-[10px]">{res.pendentesContabil.length} pendentes</Badge>
                </div>
                {res.pendentesContabil.filter(filtro).map((m) => (
                  <LinhaMov key={m.id} m={m} marcado={selCtb.includes(m.id)} onToggle={() => toggle(selCtb, setSelCtb, m.id)} />
                ))}
                {res.pendentesContabil.length === 0 && (
                  <div className="flex items-center gap-2 rounded-2xl border border-border/70 p-4 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-brand-orange" /> Nenhum lançamento contábil em aberto.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ----------------------------------------------------- divergências */}
        <TabsContent value="divergencias" className="mt-6">
          <Card className="rounded-3xl border-border/70">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Histórico</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Criticidade</TableHead>
                    <TableHead>Tratativa sugerida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {divs.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-xs">{d.tipo}</TableCell>
                      <TableCell className="font-mono text-xs">{dataBR(d.data)}</TableCell>
                      <TableCell className="max-w-56 truncate text-xs">{d.historico}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{brl(d.valor)}</TableCell>
                      <TableCell>
                        <Badge className={`rounded-full ${d.criticidade === "Alta" ? "bg-destructive/15 text-destructive" : "bg-brand-orange/15 text-brand-orange"}`}>
                          {d.criticidade}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-80 text-xs text-muted-foreground">{d.sugestao}</TableCell>
                    </TableRow>
                  ))}
                  {divs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                        Nenhuma divergência aberta nesta conta.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------ importação */}
        <TabsContent value="importacao" className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card className="rounded-3xl border-border/70">
            <CardContent className="space-y-3 p-5">
              <div className="text-sm font-medium">Importar extrato</div>
              <p className="text-xs text-muted-foreground">
                Layouts aceitos: OFX (Money/Quicken), CNAB 240 e CSV padrão do banco. A importação é
                simulada — o extrato exibido é gerado a partir da integração bancária configurada.
              </p>
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Arraste o arquivo OFX/CNAB aqui ou selecione abaixo
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={() => toast.success("Extrato reimportado da integração bancária.")}>
                  <Upload className="mr-2 h-4 w-4" /> Importar extrato
                </Button>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => toast.success("Relatório de conciliação exportado.")}>
                  <Download className="mr-2 h-4 w-4" /> Exportar conciliação
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/70">
            <CardContent className="space-y-3 p-5">
              <div className="text-sm font-medium">Regras do motor automático</div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>1. Documento + valor + natureza idênticos — confiança 100%.</li>
                <li>2. Valor + data + natureza idênticos — confiança 96%.</li>
                <li>3. Valor idêntico com janela de até 3 dias — confiança 88%.</li>
                <li>4. Demais itens seguem para tratamento manual em Divergências.</li>
              </ul>
              <div className="flex items-start gap-2 rounded-2xl border border-brand-orange/40 bg-brand-orange/5 p-3 text-xs">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
                Contas fechadas ficam bloqueadas para novos vínculos até a reabertura da competência.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------------------------------------------------------- histórico */}
        <TabsContent value="historico" className="mt-6">
          <Card className="rounded-3xl border-border/70">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Método</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Confiança</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Registro</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vinculos.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="text-xs">{v.metodo}</TableCell>
                      <TableCell className="font-mono text-xs">{v.extratoIds.length} ↔ {v.contabilIds.length}</TableCell>
                      <TableCell className="font-mono text-xs">{v.confianca}%</TableCell>
                      <TableCell className="text-xs">{v.usuario}</TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {new Date(v.criadoEm).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" className="rounded-full" onClick={() => desfazer(v.id)}>
                          <Unlink className="mr-2 h-4 w-4" /> Desfazer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {vinculos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                        Nenhuma conciliação registrada nesta conta e competência.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AssistenteCampos
        titulo="Conciliação bancária"
        campos={CAMPOS_AJUDA}
        contextoExtra={{ conta: res.conta, competencia, diferenca: res.diferenca, pendentes: res.pendentesExtrato.length + res.pendentesContabil.length }}
      />
    </div>
  );
}
