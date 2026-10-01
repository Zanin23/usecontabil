import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Eye, Lock, NotebookPen, Pencil, Plus, Scale, Search, Trash2, Undo2, X } from "lucide-react";
import {
  Badge, Button, Card, CardContent, cn, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow, Textarea,
} from "@/design-system/mj-design-system-db98fa";
import CabecalhoPagina from "@/components/contabil/cadastros/CabecalhoPagina";
import Kpis from "@/components/contabil/cadastros/Kpis";
import ListaErros from "@/components/contabil/cadastros/ListaErros";
import { SeletorCentro, SeletorConta, SeletorParticipante } from "@/components/contabil/cadastros/SeletorBusca";
import { normalizarBusca } from "@/lib/busca";
import CampoNumeroBR from "@/components/contabil/CampoNumeroBR";
import ExportarMenu from "@/components/contabil/ExportarMenu";
import { BotaoImportarBalanceteAbertura } from "@/components/contabil/ImportacaoPlanilha";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { competenciaBR, formatCompetencia, useCompetencia } from "@/lib/competencia";
import { contasAnaliticasAtivas, montarHistorico, useCentros, useContas, useHistoricos, type Conta } from "@/lib/planoContasStore";
import { participantePorId, useParticipantes } from "@/lib/cadastrosStore";
import {
  centavos, competenciaDaData, competenciaEncerrada, dataBR, estornarLancamento, excluirLancamento, fimDaCompetencia,
  impedimentoExclusao, moeda, novoIdLancamento, salvarLancamento, totalDebitos, useLancamentos,
  type Lancamento, type Partida, type TipoLancamento,
} from "@/lib/lancamentosStore";
import { confirmarExclusao } from "@/lib/confirmar";

const hoje = () => new Date().toISOString().slice(0, 10);

function dataPadrao(competencia: string) {
  const h = hoje();
  return h.startsWith(competencia) ? h : `${competencia}-01`;
}

const novaPartida = (tipo: "D" | "C"): Partida => ({ id: novoIdLancamento("pt"), contaId: "", tipo, valor: 0 });

function rascunho(empresaId: string, data: string): Lancamento {
  return {
    id: "", empresaId, numero: 0, data, tipo: "Normal", historico: "", partidas: [novaPartida("D"), novaPartida("C")], origem: "Manual",
  };
}

function resumoLado(l: Lancamento, tipo: "D" | "C", contas: Map<string, Conta>) {
  const lado = l.partidas.filter((p) => p.tipo === tipo);
  if (lado.length !== 1) return lado.length ? `Diversas (${lado.length})` : "—";
  const c = contas.get(lado[0].contaId);
  return c ? `${c.codigo} ${c.descricao}` : "—";
}

function AlternarDC({ valor, onChange, disabled, linha }: { valor: "D" | "C"; onChange: (v: "D" | "C") => void; disabled?: boolean; linha: number }) {
  return (
    <div className="inline-flex justify-self-start rounded-full border border-border p-0.5" role="group" aria-label={`Débito ou crédito da linha ${linha}`}>
      {(["D", "C"] as const).map((t) => (
        <button
          key={t}
          type="button"
          disabled={disabled}
          aria-pressed={valor === t}
          aria-label={`${t === "D" ? "Débito" : "Crédito"} na linha ${linha}`}
          onClick={() => onChange(t)}
          className={cn(
            "h-7 w-8 rounded-full text-xs font-semibold transition-colors",
            valor === t ? (t === "D" ? "bg-primary text-primary-foreground" : "bg-brand-purple text-white") : "text-muted-foreground hover:bg-muted",
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

export default function Lancamentos() {
  const { empresa } = useEmpresaAtual();
  const empresaId = empresa?.id ?? "";
  const { competencia, competenciaFim, competenciasNoPeriodo } = useCompetencia();
  const inicio = `${competenciasNoPeriodo[0]}-01`;
  const fim = fimDaCompetencia(competenciasNoPeriodo[competenciasNoPeriodo.length - 1]);
  const lancamentos = useLancamentos(empresaId, inicio, fim);
  const contas = useContas();
  const centros = useCentros();
  const historicos = useHistoricos();
  const participantes = useParticipantes();
  const analiticas = useMemo(() => contasAnaliticasAtivas(contas), [contas]);
  const porId = useMemo(() => new Map(contas.map((c) => [c.id, c])), [contas]);
  const centrosAtivos = useMemo(() => centros.filter((c) => c.situacao === "Ativo"), [centros]);
  const participantesAtivos = useMemo(() => participantes.filter((p) => p.situacao === "Ativo"), [participantes]);
  const historicosAtivos = useMemo(() => historicos.filter((h) => h.situacao === "Ativo"), [historicos]);

  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [draft, setDraft] = useState<Lancamento>(() => rascunho(empresaId, dataPadrao(competencia)));
  const [erros, setErros] = useState<string[]>([]);
  const [somenteLeitura, setSomenteLeitura] = useState<string | null>(null);
  const [estornando, setEstornando] = useState<Lancamento | null>(null);
  const [estorno, setEstorno] = useState({ data: "", motivo: "" });

  const encerrada = empresaId ? competenciaEncerrada(empresaId, competencia) : false;
  const periodo = competenciaFim ? `${formatCompetencia(competenciasNoPeriodo[0])} a ${formatCompetencia(competenciasNoPeriodo[competenciasNoPeriodo.length - 1])}` : formatCompetencia(competencia);

  const filtrados = useMemo(() => {
    const t = normalizarBusca(busca);
    if (!t) return lancamentos;
    return lancamentos.filter((l) => {
      const contasTexto = l.partidas.map((p) => `${porId.get(p.contaId)?.codigo ?? ""} ${porId.get(p.contaId)?.descricao ?? ""}`).join(" ");
      return normalizarBusca(`${l.numero} ${l.historico} ${l.documento ?? ""} ${contasTexto}`).includes(t);
    });
  }, [lancamentos, busca, porId]);

  const movimento = lancamentos.reduce((s, l) => s + totalDebitos(l), 0);
  const totD = centavos(draft.partidas.filter((p) => p.tipo === "D").reduce((s, p) => s + (p.valor || 0), 0));
  const totC = centavos(draft.partidas.filter((p) => p.tipo === "C").reduce((s, p) => s + (p.valor || 0), 0));
  const diferenca = totD - totC;

  const setPartida = (id: string, patch: Partial<Partida>) =>
    setDraft((d) => ({ ...d, partidas: d.partidas.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));

  const abrirNovo = () => {
    if (!empresaId) return toast.error("Selecione uma empresa no topo da tela.");
    setDraft(rascunho(empresaId, dataPadrao(competencia)));
    setErros([]);
    setSomenteLeitura(null);
    setAberto(true);
  };

  const abrir = (l: Lancamento) => {
    const motivo = competenciaEncerrada(l.empresaId, competenciaDaData(l.data))
      ? "Competência encerrada: somente consulta. Para corrigir, estorne numa competência aberta."
      : l.estornadoPorId
        ? "Lançamento estornado: somente consulta."
        : l.tipo === "Estorno"
          ? "Estorno: somente consulta. Para desfazer, exclua o estorno."
          : null;
    setDraft({ ...l, partidas: l.partidas.map((p) => ({ ...p })) });
    setErros([]);
    setSomenteLeitura(motivo);
    setAberto(true);
  };

  const aplicarHistorico = (historicoId: string) => {
    const h = historicos.find((x) => x.id === historicoId);
    if (!h) return;
    const participante = draft.partidas.map((p) => participantePorId(p.participanteId)).find(Boolean);
    setDraft((d) => ({
      ...d,
      historicoId,
      historico: montarHistorico(h.texto, {
        documento: d.documento,
        participante: participante?.nome,
        competencia: competenciaBR(competenciaDaData(d.data) || competencia),
      }),
    }));
  };

  const equilibrar = () => {
    if (diferenca === 0) return;
    const lado: "D" | "C" = diferenca > 0 ? "C" : "D";
    const falta = Math.abs(diferenca) / 100;
    setDraft((d) => {
      const vazia = [...d.partidas].reverse().find((p) => p.tipo === lado && !(p.valor > 0));
      if (vazia) return { ...d, partidas: d.partidas.map((p) => (p.id === vazia.id ? { ...p, valor: falta } : p)) };
      return { ...d, partidas: [...d.partidas, { ...novaPartida(lado), valor: falta }] };
    });
  };

  const salvar = (continuar = false) => {
    const r = salvarLancamento({ ...draft, empresaId: draft.empresaId || empresaId });
    if (!r.ok) {
      setErros(r.erros);
      toast.error("O lançamento não foi salvo: confira os avisos.");
      return;
    }
    toast.success(`Lançamento nº ${r.registro.numero} salvo.`, { description: `${dataBR(r.registro.data)} · R$ ${moeda(totalDebitos(r.registro))}` });
    if (continuar) {
      setDraft(rascunho(empresaId, r.registro.data));
      setErros([]);
    } else setAberto(false);
  };

  const excluir = (l: Lancamento) => {
    const motivo = impedimentoExclusao(l);
    if (motivo) return toast.error(motivo);
    if (!confirmarExclusao(`o lançamento nº ${l.numero}`, "Fica registrado na trilha de auditoria.")) return;
    const erro = excluirLancamento(l.id);
    if (erro) toast.error(erro);
    else toast.success(`Lançamento nº ${l.numero} excluído.`);
  };

  const abrirEstorno = (l: Lancamento) => {
    // Sugere a própria data do lançamento; se a competência dele estiver encerrada, a competência atual (se aberta).
    const data = !competenciaEncerrada(l.empresaId, competenciaDaData(l.data))
      ? l.data
      : !competenciaEncerrada(l.empresaId, competencia)
        ? dataPadrao(competencia)
        : "";
    setEstorno({ data, motivo: "" });
    setEstornando(l);
  };

  const confirmarEstorno = () => {
    if (!estornando) return;
    const r = estornarLancamento(estornando.id, estorno);
    if (!r.ok) return toast.error(r.erros.join(" "));
    toast.success(`Lançamento nº ${estornando.numero} estornado pelo nº ${r.registro.numero}.`);
    setEstornando(null);
  };

  const linhasExportacao = filtrados.flatMap((l) =>
    l.partidas.map((p) => ({
      numero: l.numero, data: dataBR(l.data), tipo: l.tipo, historico: l.historico, documento: l.documento ?? "",
      conta: porId.get(p.contaId)?.codigo ?? "", descricao: porId.get(p.contaId)?.descricao ?? "",
      debito: p.tipo === "D" ? moeda(p.valor) : "", credito: p.tipo === "C" ? moeda(p.valor) : "",
      centro: centros.find((c) => c.id === p.centroCustoId)?.codigo ?? "", participante: participantePorId(p.participanteId)?.nome ?? "",
    })),
  );

  const leitura = !!somenteLeitura;

  return (
    <div className="space-y-6 pb-16">
      <CabecalhoPagina
        trilha={[{ rotulo: "Contábil", para: "/contabil" }, { rotulo: "Escrituração", para: "/contabil/escrituracao" }]}
        icone={NotebookPen}
        titulo="Lançamentos contábeis"
        descricao="Partidas dobradas: cada lançamento tem débitos e créditos de mesmo valor, em contas analíticas. Correções em competência encerrada são feitas por estorno."
        acoes={
          <>
            <ExportarMenu
              nome={`Lançamentos ${periodo}`}
              colunas={[
                { key: "numero", label: "Nº" }, { key: "data", label: "Data" }, { key: "tipo", label: "Tipo" }, { key: "historico", label: "Histórico" },
                { key: "documento", label: "Documento" }, { key: "conta", label: "Conta" }, { key: "descricao", label: "Descrição da conta" },
                { key: "debito", label: "Débito" }, { key: "credito", label: "Crédito" }, { key: "centro", label: "Centro de custo" },
                { key: "participante", label: "Cliente/fornecedor" },
              ]}
              linhas={linhasExportacao}
            />
            <BotaoImportarBalanceteAbertura />
            <Button className="rounded-full" onClick={abrirNovo} disabled={!empresaId || !analiticas.length}>
              <Plus className="mr-2 h-4 w-4" /> Novo lançamento
            </Button>
          </>
        }
      >
        <Badge variant="secondary" className="rounded-full">{empresa?.razao ?? "Nenhuma empresa selecionada"}</Badge>
        <Badge variant="secondary" className="rounded-full">{periodo}</Badge>
      </CabecalhoPagina>

      {!empresaId ? (
        <Card className="rounded-xl border-warn/40 bg-warn/5"><CardContent className="p-4 text-sm">Selecione uma empresa no topo da tela para ver e fazer lançamentos.</CardContent></Card>
      ) : null}
      {empresaId && !analiticas.length ? (
        <Card className="rounded-xl border-warn/40 bg-warn/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <span>O plano de contas está vazio. Carregue o plano modelo ou cadastre as contas antes de lançar.</span>
            <Button asChild variant="outline" className="rounded-full"><Link to="/contabil/cadastros/plano-contas">Ir para o plano de contas</Link></Button>
          </CardContent>
        </Card>
      ) : null}
      {empresaId && encerrada ? (
        <Card className="rounded-xl border-warn/40 bg-warn/5">
          <CardContent className="flex items-center gap-2 p-4 text-sm">
            <Lock className="h-4 w-4 text-warn" />
            A competência {formatCompetencia(competencia)} está encerrada: os lançamentos dela ficam só para consulta. Reabra em
            <Link to="/preparativos/servicos/encerramentos" className="underline">Encerramentos</Link> ou corrija por estorno numa competência aberta.
          </CardContent>
        </Card>
      ) : null}

      <Kpis
        itens={[
          { rotulo: "Lançamentos no período", valor: String(lancamentos.length) },
          { rotulo: "Movimento (débitos)", valor: `R$ ${moeda(movimento)}` },
          { rotulo: "Estornos", valor: String(lancamentos.filter((l) => l.tipo === "Estorno").length) },
          { rotulo: "Competência", valor: encerrada ? "Encerrada" : "Aberta", dica: formatCompetencia(competencia) },
        ]}
      />

      <Card className="rounded-xl shadow-card">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Buscar lançamento" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por número, histórico, documento ou conta…" className="rounded-full pl-9" />
            </div>
            <Badge variant="secondary" className="rounded-full">{filtrados.length} lançamento(s)</Badge>
          </div>

          {filtrados.length === 0 ? (
            <div className="space-y-3 py-14 text-center">
              <p className="text-sm text-muted-foreground">{lancamentos.length ? "Nenhum lançamento com essa busca." : `Nenhum lançamento em ${periodo}.`}</p>
              {empresaId && analiticas.length && !lancamentos.length ? (
                <Button className="rounded-full" onClick={abrirNovo}><Plus className="mr-2 h-4 w-4" /> Novo lançamento</Button>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Nº</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Histórico</TableHead>
                    <TableHead>Débito</TableHead>
                    <TableHead>Crédito</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((l) => {
                    const fechada = competenciaEncerrada(l.empresaId, competenciaDaData(l.data));
                    const editavel = !fechada && !l.estornadoPorId && l.tipo !== "Estorno";
                    return (
                      <TableRow key={l.id} className={cn(l.estornadoPorId && "opacity-60")}>
                        <TableCell className="font-mono text-xs">{l.numero}</TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs">{dataBR(l.data)}</TableCell>
                        <TableCell className="max-w-[320px]">
                          <div className="truncate">{l.historico}</div>
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {l.documento ? <span className="text-xs text-muted-foreground">Doc. {l.documento}</span> : null}
                            {l.tipo !== "Normal" ? <Badge variant="outline" className="rounded-full text-[10px]">{l.tipo}</Badge> : null}
                            {l.estornadoPorId ? <Badge variant="outline" className="rounded-full text-[10px]">estornado</Badge> : null}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate text-xs">{resumoLado(l, "D", porId)}</TableCell>
                        <TableCell className="max-w-[220px] truncate text-xs">{resumoLado(l, "C", porId)}</TableCell>
                        <TableCell className="whitespace-nowrap text-right font-mono text-xs">{moeda(totalDebitos(l))}</TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <Button variant="ghost" size="icon" className="rounded-full" aria-label={`${editavel ? "Editar" : "Ver"} lançamento ${l.numero}`} onClick={() => abrir(l)}>
                            {editavel ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          {!l.estornadoPorId && l.tipo !== "Estorno" ? (
                            <Button variant="ghost" size="icon" className="rounded-full" aria-label={`Estornar lançamento ${l.numero}`} title="Estornar" onClick={() => abrirEstorno(l)}>
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                          <Button variant="ghost" size="icon" className="rounded-full" aria-label={`Excluir lançamento ${l.numero}`} onClick={() => excluir(l)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor */}
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? `Lançamento nº ${draft.numero}` : "Novo lançamento"}</DialogTitle>
            <DialogDescription>
              {somenteLeitura ?? `${empresa?.razao ?? ""} — os valores de débito e crédito precisam ser iguais.`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-6">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="lanc-data" className="text-xs">Data *</Label>
              <Input id="lanc-data" type="date" className="rounded-xl font-mono text-xs" value={draft.data} disabled={leitura}
                onChange={(e) => setDraft((d) => ({ ...d, data: e.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={draft.tipo} disabled={leitura || draft.tipo === "Estorno"} onValueChange={(v) => setDraft((d) => ({ ...d, tipo: v as TipoLancamento }))}>
                <SelectTrigger aria-label="Tipo do lançamento" className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(draft.tipo === "Estorno" ? ["Estorno"] : ["Normal", "Abertura", "Encerramento"]).map((t) => (
                    <SelectItem key={t} value={t}>{t === "Abertura" ? "Saldo de abertura" : t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="lanc-doc" className="text-xs">Documento</Label>
              <Input id="lanc-doc" className="rounded-xl" placeholder="NF 1234" value={draft.documento ?? ""} disabled={leitura}
                onChange={(e) => setDraft((d) => ({ ...d, documento: e.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label className="text-xs">Histórico padrão</Label>
              <Select value={draft.historicoId ?? ""} disabled={leitura || !historicosAtivos.length} onValueChange={aplicarHistorico}>
                <SelectTrigger aria-label="Histórico padrão" className="rounded-xl">
                  <SelectValue placeholder={historicosAtivos.length ? "Escolha para preencher o histórico" : "Nenhum histórico padrão cadastrado"} />
                </SelectTrigger>
                <SelectContent>
                  {historicosAtivos.map((h) => (
                    <SelectItem key={h.id} value={h.id}>{h.codigo} — {h.texto}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-6">
              <Label htmlFor="lanc-hist" className="text-xs">Histórico *</Label>
              <Textarea id="lanc-hist" rows={2} className="rounded-xl" value={draft.historico} disabled={leitura}
                placeholder="Ex.: Pagamento da conta de energia ref. 07/2026"
                onChange={(e) => setDraft((d) => ({ ...d, historico: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="hidden grid-cols-[76px_minmax(220px,1fr)_130px_170px_190px_32px] gap-2 px-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground lg:grid">
              <span>D/C</span><span>Conta</span><span className="text-right">Valor (R$)</span><span>Centro de custo</span><span>Cliente/fornecedor</span><span />
            </div>
            {draft.partidas.map((p, i) => {
              const conta = porId.get(p.contaId);
              const exigeCC = !!conta?.exigeCentroCusto;
              return (
                <div key={p.id} className="grid grid-cols-1 gap-2 rounded-2xl border border-border/60 p-2 lg:grid-cols-[76px_minmax(220px,1fr)_130px_170px_190px_32px] lg:items-center lg:border-0 lg:p-0">
                  <AlternarDC valor={p.tipo} onChange={(t) => setPartida(p.id, { tipo: t })} disabled={leitura} linha={i + 1} />
                  <SeletorConta
                    contas={leitura && conta ? [conta, ...analiticas.filter((c) => c.id !== conta.id)] : analiticas}
                    valor={p.contaId}
                    onChange={(id) => setPartida(p.id, { contaId: id ?? "" })}
                    ariaLabel={`Conta da linha ${i + 1}`}
                    disabled={leitura}
                  />
                  <CampoNumeroBR
                    aria-label={`Valor da linha ${i + 1}`}
                    casasDecimais={2}
                    className="rounded-xl text-right font-mono text-xs"
                    value={p.valor || undefined}
                    disabled={leitura}
                    onChange={(v) => setPartida(p.id, { valor: v ?? 0 })}
                  />
                  <SeletorCentro
                    centros={centrosAtivos}
                    valor={p.centroCustoId}
                    onChange={(id) => setPartida(p.id, { centroCustoId: id })}
                    ariaLabel={`Centro de custo da linha ${i + 1}`}
                    placeholder={exigeCC ? "Centro de custo (obrigatório)" : "Centro de custo (opcional)"}
                    invalido={exigeCC && !p.centroCustoId}
                    disabled={leitura}
                  />
                  <SeletorParticipante
                    participantes={participantesAtivos}
                    valor={p.participanteId}
                    onChange={(id) => setPartida(p.id, { participanteId: id })}
                    ariaLabel={`Cliente ou fornecedor da linha ${i + 1}`}
                    placeholder="Cliente/fornecedor (opcional)"
                    disabled={leitura}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    aria-label={`Remover linha ${i + 1}`}
                    disabled={leitura || draft.partidas.length <= 2}
                    onClick={() => setDraft((d) => ({ ...d, partidas: d.partidas.filter((x) => x.id !== p.id) }))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            {!leitura ? (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setDraft((d) => ({ ...d, partidas: [...d.partidas, novaPartida("D")] }))}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Débito
                </Button>
                <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setDraft((d) => ({ ...d, partidas: [...d.partidas, novaPartida("C")] }))}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Crédito
                </Button>
                <Button type="button" variant="ghost" size="sm" className="rounded-full" disabled={diferenca === 0} onClick={equilibrar}>
                  <Scale className="mr-1 h-3.5 w-3.5" /> Equilibrar diferença
                </Button>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-4 rounded-2xl bg-muted/50 px-4 py-2 font-mono text-xs" aria-live="polite">
            <span>Débitos: <strong>{moeda(totD / 100)}</strong></span>
            <span>Créditos: <strong>{moeda(totC / 100)}</strong></span>
            <span className={cn(totD === 0 && totC === 0 ? "text-muted-foreground" : diferenca === 0 ? "text-success" : "text-destructive")}>
              {totD === 0 && totC === 0 ? "Informe os valores" : diferenca === 0 ? "Débitos = créditos" : `Diferença: ${moeda(Math.abs(diferenca) / 100)}`}
            </span>
          </div>

          <ListaErros erros={erros} />

          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setAberto(false)}>{leitura ? "Fechar" : "Cancelar"}</Button>
            {!leitura ? (
              <>
                {!draft.id ? <Button variant="outline" className="rounded-full" onClick={() => salvar(true)}>Salvar e novo</Button> : null}
                <Button className="rounded-full" onClick={() => salvar()}>Salvar lançamento</Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Estorno */}
      <Dialog open={!!estornando} onOpenChange={(v) => !v && setEstornando(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Estornar lançamento nº {estornando?.numero}</DialogTitle>
            <DialogDescription>
              Cria um lançamento com débitos e créditos invertidos. O original fica marcado como estornado e não pode mais ser alterado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="estorno-data" className="text-xs">Data do estorno *</Label>
              <Input id="estorno-data" type="date" className="rounded-xl font-mono text-xs" value={estorno.data} onChange={(e) => setEstorno((s) => ({ ...s, data: e.target.value }))} />
              <p className="text-[11px] text-muted-foreground">Precisa estar numa competência aberta.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="estorno-motivo" className="text-xs">Motivo</Label>
              <Input id="estorno-motivo" className="rounded-xl" value={estorno.motivo} placeholder="Ex.: lançado em duplicidade" onChange={(e) => setEstorno((s) => ({ ...s, motivo: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setEstornando(null)}>Cancelar</Button>
            <Button className="rounded-full" onClick={confirmarEstorno}>Estornar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
