import { useState } from "react";
import {
  Badge, Button, Card, CardContent, Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, Label, Textarea,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { CheckCircle2, Circle, Lock, LockOpen, ShieldCheck } from "lucide-react";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import {
  brl, concluirEtapa, documentosDaCompetencia, ETAPAS_FECHAMENTO, empresaDB,
  fechamentoAtual, reabrirCompetencia, resumoDocumentos, useTributario, validacoesAutomaticas,
} from "@/lib/tributarioStore";

export default function ConclusaoFiscal() {
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const empresaId = empresa?.id ?? "";
  const [motivo, setMotivo] = useState("");
  const [reabrirOpen, setReabrirOpen] = useState(false);

  const dados = useTributario(
    () => ({
      fechamento: fechamentoAtual(empresaId, competencia),
      docs: documentosDaCompetencia(empresaId, competencia),
      validacoes: validacoesAutomaticas(empresaId, competencia),
      auditoria: empresaDB(empresaId).auditoria.filter((a) => a.competencia === competencia).slice(0, 8),
    }),
    [empresaId, competencia],
  );

  const { fechamento, docs, validacoes, auditoria } = dados;
  const r = resumoDocumentos(docs);
  const concluidas = fechamento.etapasConcluidas;
  const progresso = Math.round((concluidas.length / ETAPAS_FECHAMENTO.length) * 100);

  const podeExecutar = (index: number) => {
    const etapa = ETAPAS_FECHAMENTO[index];
    if (concluidas.includes(etapa.slug)) return false;
    if (index > 0 && !concluidas.includes(ETAPAS_FECHAMENTO[index - 1].slug)) return false;
    const v = validacoes[etapa.slug];
    return v ? v.ok : true;
  };

  const executar = (slug: string, titulo: string) => {
    if (!empresaId) return toast.error("Selecione uma empresa.");
    concluirEtapa(empresaId, competencia, slug);
    toast.success(`${titulo} concluída.`);
  };

  const contexto = {
    tela: "Conclusão fiscal",
    modulo: "Financeiro › Movimentos",
    competencia: formatCompetencia(competencia),
    empresa: empresa ? { razao: empresa.razao, regime: empresa.regime } : null,
    statusFechamento: fechamento.status,
    etapasConcluidas: concluidas,
    validacoes,
    resumoDocumentos: r,
    orientacoes: [
      "O fluxo segue: validar documentos, validar cadastros, auditoria, apuração, guias, obrigações, fechar, bloquear e gerar log.",
      "A reabertura exige motivo e fica registrada na trilha de auditoria.",
    ],
  };

  return (
    <div className="space-y-6 pb-16">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Financeiro › Movimentos</div>
        <h1 className="font-display text-3xl sm:text-4xl">
          Conclusão <span className="text-brand-orange">fiscal</span>
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Fluxo guiado de encerramento da competência com validações automáticas, bloqueio de alterações
          e log completo das operações.
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary" className="rounded-full">{formatCompetencia(competencia)}</Badge>
          <Badge variant="secondary" className="rounded-full">{empresa?.razao ?? "Nenhuma empresa selecionada"}</Badge>
          <Badge variant="secondary" className="rounded-full">{fechamento.status}</Badge>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Progresso", valor: `${progresso}%` },
          { label: "Documentos", valor: String(r.total), hint: `${r.pendentes} pendente(s)` },
          { label: "Faturamento", valor: brl(r.faturado) },
          { label: "Tributos apurados", valor: brl(r.tributos) },
        ].map((k) => (
          <Card key={k.label} className="rounded-3xl shadow-card">
            <CardContent className="p-4">
              <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{k.label}</div>
              <div className="mt-1 font-display text-xl">{k.valor}</div>
              {"hint" in k && k.hint ? <div className="text-[11px] text-muted-foreground">{k.hint}</div> : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-3xl shadow-card">
        <CardContent className="p-5">
          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-brand-orange transition-all" style={{ width: `${progresso}%` }} />
          </div>
          <ol className="space-y-3">
            {ETAPAS_FECHAMENTO.map((etapa, i) => {
              const feita = concluidas.includes(etapa.slug);
              const validacao = validacoes[etapa.slug];
              const liberada = podeExecutar(i);
              return (
                <li key={etapa.slug} className="flex flex-wrap items-start gap-3 rounded-2xl border p-4">
                  {feita ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                    : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{i + 1}. {etapa.titulo}</span>
                      {validacao ? (
                        <Badge variant="secondary" className={`rounded-full ${validacao.ok ? "text-success" : "text-destructive"}`}>
                          {validacao.ok ? "Validação OK" : "Pendências"}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">{etapa.descricao}</p>
                    {validacao && !validacao.ok ? (
                      <p className="mt-1 text-xs text-destructive">{validacao.detalhe}</p>
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    variant={feita ? "outline" : "default"}
                    disabled={!liberada}
                    className={`rounded-full ${feita ? "" : "bg-brand-orange hover:bg-brand-orange/90"}`}
                    onClick={() => executar(etapa.slug, etapa.titulo)}
                  >
                    {feita ? "Concluída" : "Executar"}
                  </Button>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-3xl shadow-card">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {fechamento.status === "Fechada" ? <Lock className="h-3.5 w-3.5 text-brand-orange" /> : <LockOpen className="h-3.5 w-3.5" />}
              Situação da competência
            </div>
            <p className="text-sm text-muted-foreground">
              {fechamento.status === "Fechada"
                ? `Competência fechada em ${new Date(fechamento.fechadoEm ?? "").toLocaleString("pt-BR")} por ${fechamento.fechadoPor}. Novos lançamentos exigem reabertura autorizada.`
                : "Competência aberta — os lançamentos podem ser alterados livremente."}
            </p>
            {fechamento.status === "Fechada" ? (
              <Button variant="outline" className="rounded-full" onClick={() => setReabrirOpen(true)}>
                <LockOpen className="mr-2 h-4 w-4" /> Reabrir competência
              </Button>
            ) : null}
            {fechamento.reaberturas.length ? (
              <div className="space-y-1 pt-2">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Reaberturas</div>
                {fechamento.reaberturas.map((r2, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    {new Date(r2.data).toLocaleString("pt-BR")} · {r2.usuario} — {r2.motivo}
                  </p>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-card">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-orange" /> Log da competência
            </div>
            {auditoria.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma operação registrada nesta competência.</p>
            ) : auditoria.map((a) => (
              <div key={a.id} className="rounded-2xl border p-3">
                <div className="text-sm">{a.acao}</div>
                <div className="text-[11px] text-muted-foreground">
                  {new Date(a.data).toLocaleString("pt-BR")} · {a.usuario} · {a.origem}
                </div>
                {a.detalhe ? <div className="text-xs text-muted-foreground">{a.detalhe}</div> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={reabrirOpen} onOpenChange={setReabrirOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reabrir competência</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Motivo da reabertura *</Label>
            <Textarea className="rounded-xl" value={motivo} onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: inclusão de nota complementar recebida após o fechamento." />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setReabrirOpen(false)}>Cancelar</Button>
            <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90"
              onClick={() => {
                if (!motivo.trim()) return toast.error("Informe o motivo da reabertura.");
                reabrirCompetencia(empresaId, competencia, motivo.trim());
                setMotivo("");
                setReabrirOpen(false);
                toast.success("Competência reaberta e registrada na auditoria.");
              }}>
              Confirmar reabertura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssistenteFechamento contexto={contexto} resumo={`Conclusão fiscal — ${progresso}% concluído`} rotulo="IA ajudante" />
    </div>
  );
}
