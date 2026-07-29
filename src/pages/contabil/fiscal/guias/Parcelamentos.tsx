import { useState } from "react";
import { HandCoins, History, RefreshCw } from "lucide-react";
import {
  Badge, Button, Card, CardContent, Input, Progress,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import {
  brl, dataBR, detalharParcelamento, listarParcelamentos, renegociar,
  resumoParcelamentos, salvarParcelamento, type Parcelamento,
} from "@/lib/guiasStore";

function Indicador({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className={`min-w-0 rounded-2xl border p-3 ${destaque ? "border-destructive/40 bg-destructive/5" : "border-border/70"}`}>
      <div className="text-[10px] uppercase tracking-[0.06em] leading-tight break-words text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-mono text-sm break-words ${destaque ? "text-destructive" : ""}`}>{valor}</div>
    </div>
  );
}

function Bloco({ p }: { p: Parcelamento }) {
  const d = detalharParcelamento(p);
  const [novas, setNovas] = useState(String(p.parcelas));
  return (
    <Card className="rounded-3xl border-border/70">
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-2xl">{p.tipo}</h2>
            <p className="text-xs text-muted-foreground">
              {p.orgao} · processo {p.processo} · {p.tributos} · adesão em {dataBR(p.adesao)}
            </p>
          </div>
          <Badge className={`rounded-full ${p.situacao === "Ativo" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
            {p.situacao}
          </Badge>
        </div>

        <Progress value={(d.pagas / p.parcelas) * 100} />

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-7">
          <Indicador label="Parcelas" valor={`${p.parcelas}`} />
          <Indicador label="Pagas" valor={String(d.pagas)} />
          <Indicador label="Vencidas" valor={String(d.vencidas)} destaque={d.vencidas > 0} />
          <Indicador label="Futuras" valor={String(d.futuras)} />
          <Indicador label="Valor da parcela" valor={brl(p.valorParcela)} />
          <Indicador label="Saldo devedor" valor={brl(d.saldoDevedor)} />
          <Indicador label="Juros acumulados" valor={brl(d.jurosAcum)} destaque={d.jurosAcum > 0} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="number"
            value={novas}
            onChange={(e) => setNovas(e.target.value)}
            className="w-28 rounded-full"
          />
          <Button
            size="sm"
            className="rounded-full bg-brand-orange hover:bg-brand-orange/90"
            onClick={() => {
              renegociar(p, Math.max(1, Number(novas) || p.parcelas));
              toast.success("Parcelamento renegociado e saldo recalculado");
            }}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Renegociar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => {
              salvarParcelamento(
                { ...p, situacao: p.situacao === "Ativo" ? "Encerrado" : "Ativo" },
                p.situacao === "Ativo" ? "Parcelamento encerrado." : "Parcelamento reaberto.",
              );
              toast.success("Situação do parcelamento atualizada");
            }}
          >
            {p.situacao === "Ativo" ? "Encerrar" : "Reabrir"}
          </Button>
          <span className="text-xs text-muted-foreground">Próximo vencimento: {dataBR(d.proximo)}</span>
        </div>

        <div className="rounded-2xl border border-border/70">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parcela</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Pagamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.parcelas.slice(0, 12).map((x) => (
                <TableRow key={x.numero}>
                  <TableCell className="font-mono text-xs">{x.numero}/{p.parcelas}</TableCell>
                  <TableCell className="font-mono text-xs">{dataBR(x.vencimento)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{brl(x.valor)}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={`rounded-full ${x.status === "Paga" ? "bg-success/15 text-success" : x.status === "Vencida" ? "bg-destructive/15 text-destructive" : "bg-brand-orange/15 text-brand-orange"}`}>
                      {x.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{x.pagoEm ? dataBR(x.pagoEm) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {p.historico.length > 0 && (
          <div className="space-y-1">
            {p.historico.map((h) => (
              <div key={h.id} className="flex items-start gap-2 text-xs text-muted-foreground">
                <History className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{new Date(h.em).toLocaleString("pt-BR")} · {h.usuario} — {h.detalhe}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function GuiasParcelamentos() {
  const { empresa } = useEmpresaAtual();
  const lista = listarParcelamentos(empresa?.id);
  const r = resumoParcelamentos(empresa?.id);

  return (
    <div className="space-y-6 pb-16">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fiscal · Guias e recolhimentos</div>
        <h1 className="font-display text-3xl sm:text-4xl flex items-center gap-3">
          <span className="rounded-2xl bg-brand-orange/10 p-2"><HandCoins className="h-6 w-6 text-brand-orange" /></span>
          Parcelamentos
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          REFIS, PERT e acordos estaduais, municipais e previdenciários com acompanhamento de
          parcelas, saldo devedor, juros e renegociação com recálculo automático.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Indicador label="Parcelamentos ativos" valor={String(r.ativos)} />
        <Indicador label="Encerrados" valor={String(r.encerrados)} />
        <Indicador label="Parcelas vencidas" valor={String(r.vencidas)} destaque={r.vencidas > 0} />
        <Indicador label="Parcelas futuras" valor={String(r.futuras)} />
        <Indicador label="Saldo devedor" valor={brl(r.saldo)} />
        <Indicador label="Juros" valor={brl(r.juros)} destaque={r.juros > 0} />
      </div>

      {lista.map((p) => <Bloco key={p.id} p={p} />)}

      <AssistenteFechamento
        rotulo="IA ajudante"
        resumo={`Parcelamentos da empresa — saldo devedor de ${brl(r.saldo)}.`}
        contexto={{
          tela: "Parcelamentos tributários",
          empresa: empresa?.razao,
          resumo: r,
          acordos: lista.map((p) => {
            const d = detalharParcelamento(p);
            return {
              tipo: p.tipo, orgao: p.orgao, processo: p.processo, situacao: p.situacao,
              parcelas: p.parcelas, pagas: d.pagas, vencidas: d.vencidas,
              saldo: d.saldoDevedor, proximo: d.proximo,
            };
          }),
        }}
      />
    </div>
  );
}
