import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Banknote, Copy, QrCode, Barcode, FileClock, ShieldCheck, ArrowUpRight,
} from "lucide-react";
import {
  Badge, Button, Input, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
  Separator, Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import AvisoSimulacao from "@/components/contabil/AvisoSimulacao";
import {
  brl, dataBR, registrarPagamento, estornarPagamento, conciliarPagamento,
  emitirGuia, reemitirGuia, cancelarGuia, compensarGuia, hojeISO, definirResponsavel,
  type Guia,
} from "@/lib/guiasStore";
import { rotaDaApuracao, tituloDoMotor } from "@/lib/rotasDados";

function Linha({ label, valor, mono }: { label: string; valor: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-right text-sm break-words ${mono ? "font-mono" : ""}`}>{valor}</span>
    </div>
  );
}

export function corStatus(status: string) {
  if (status === "Paga" || status === "Compensada") return "bg-success/15 text-success";
  if (status === "Vencida") return "bg-destructive/15 text-destructive";
  if (status === "Parcial") return "bg-brand-blue/15 text-brand-blue";
  if (status === "Cancelada") return "bg-muted text-muted-foreground";
  return "bg-brand-orange/15 text-brand-orange";
}

export default function GuiaPainel({
  guia,
  aberto,
  onClose,
}: {
  guia: Guia | null;
  aberto: boolean;
  onClose: () => void;
}) {
  const [aba, setAba] = useState("dados");
  const [resp, setResp] = useState("");
  const copiar = (texto: string, o: string) => {
    navigator.clipboard?.writeText(texto);
    toast.success(`${o} copiado`);
  };
  const memoria = useMemo(() => guia?.memoria ?? [], [guia]);
  if (!guia) return null;
  const motoresOrigem = guia.origemMotores?.length
    ? guia.origemMotores
    : guia.origemMotor ? [guia.origemMotor] : [];

  return (
    <Sheet open={aberto} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Badge className={`rounded-full ${corStatus(guia.status)}`}>{guia.status}</Badge>
            <Badge variant="secondary" className="rounded-full">{guia.tipo}</Badge>
          </div>
          <SheetTitle className="font-display text-2xl">{guia.tributo}</SheetTitle>
          <SheetDescription>
            {guia.orgao} · código {guia.codigoReceita} · guia nº {guia.numero}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="min-w-0 rounded-2xl border border-border/70 p-3">
            <div className="text-[10px] uppercase tracking-[0.06em] leading-tight text-muted-foreground">Valor original</div>
            <div className="font-mono text-sm break-words">{brl(guia.valorOriginal)}</div>
          </div>
          <div className="min-w-0 rounded-2xl border border-border/70 p-3">
            <div className="text-[10px] uppercase tracking-[0.06em] leading-tight text-muted-foreground">Multa + juros</div>
            <div className="font-mono text-sm break-words">{brl(guia.multa + guia.juros + guia.atualizacao)}</div>
          </div>
          <div className="min-w-0 rounded-2xl border border-brand-orange/40 bg-brand-orange/5 p-3">
            <div className="text-[10px] uppercase tracking-[0.06em] leading-tight text-muted-foreground">Valor final</div>
            <div className="font-mono text-sm break-words text-brand-orange">{brl(guia.valorFinal)}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            className="rounded-full bg-brand-orange hover:bg-brand-orange/90"
            onClick={() => {
              emitirGuia(guia);
              toast.success("Guia emitida e disponibilizada para pagamento");
            }}
          >
            <Banknote className="mr-1.5 h-3.5 w-3.5" /> {guia.emitida ? "Reemitir" : "Emitir guia"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => {
              reemitirGuia(guia, "Segunda via solicitada");
              toast.success("Segunda via gerada com encargos atualizados");
            }}
          >
            Segunda via
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            disabled={guia.status === "Paga" || guia.status === "Cancelada"}
            onClick={() => {
              registrarPagamento(guia, { data: hojeISO(), valor: guia.saldo, meio: "PIX", banco: "Itaú 341" });
              toast.success("Baixa registrada e conciliada");
            }}
          >
            Registrar baixa
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            disabled={guia.status === "Paga"}
            onClick={() => {
              compensarGuia(guia, "PER/DCOMP vinculada");
              toast.success("Débito compensado com crédito tributário");
            }}
          >
            Compensar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full text-destructive"
            onClick={() => {
              cancelarGuia(guia, "Cancelada pelo usuário");
              toast.success("Guia cancelada");
            }}
          >
            Cancelar
          </Button>
        </div>

        <Tabs value={aba} onValueChange={setAba} className="mt-5">
          <TabsList className="flex w-full flex-wrap h-auto rounded-full">
            {[
              ["dados", "Dados"], ["pagamento", "Pagamento"], ["origem", "Origem"],
              ["baixas", "Baixas"], ["auditoria", "Auditoria"],
            ].map(([v, l]) => (
              <TabsTrigger key={v} value={v} className="rounded-full text-xs">{l}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="dados" className="mt-4">
            <div className="rounded-2xl border border-border/70 p-4">
              <Linha label="Empresa" valor={guia.empresa} />
              <Linha label="Filial" valor={guia.filial} />
              <Linha label="Competência" valor={guia.competencia} mono />
              <Linha label="Tributo" valor={guia.tributo} />
              <Linha label="Código da receita" valor={guia.codigoReceita} mono />
              <Linha label="Órgão arrecadador" valor={guia.orgao} />
              {guia.uf && <Linha label="UF" valor={guia.uf} />}
              <Separator className="my-2" />
              <Linha label="Emissão" valor={dataBR(guia.emissao)} mono />
              <Linha label="Vencimento" valor={dataBR(guia.vencimento)} mono />
              <Linha label="Valor original" valor={brl(guia.valorOriginal)} mono />
              <Linha label="Multa" valor={brl(guia.multa)} mono />
              <Linha label="Juros" valor={brl(guia.juros)} mono />
              <Linha label="Atualização monetária" valor={brl(guia.atualizacao)} mono />
              <Linha label="Valor final" valor={brl(guia.valorFinal)} mono />
              <Separator className="my-2" />
              <Linha label="Situação" valor={guia.status} />
              <Linha label="Responsável" valor={guia.responsavel} />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Input
                  className="h-9 min-w-0 flex-1 rounded-full"
                  placeholder="Alterar responsável pela guia"
                  value={resp}
                  onChange={(e) => setResp(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    if (!resp.trim()) return toast.error("Informe o novo responsável.");
                    definirResponsavel(guia, resp.trim());
                    setResp("");
                    toast.success("Responsável atualizado.");
                  }}
                >
                  Salvar
                </Button>
              </div>
              <Linha label="Origem da apuração" valor={guia.origem} />
              {motoresOrigem.length > 0 && (
                <div className="mt-2 space-y-2 border-t border-border/60 pt-3">
                  <p className="text-xs text-muted-foreground">Abrir a apuração que alimentou esta guia:</p>
                  <div className="flex flex-wrap gap-2">
                    {motoresOrigem.map((motor) => (
                      <Link
                        key={motor}
                        to={rotaDaApuracao(motor, { empresaId: guia.empresaId, competencia: guia.competencia })}
                        className="rounded-full border border-border px-3 py-1.5 text-xs text-brand-orange transition-colors hover:bg-brand-orange/10"
                      >
                        {tituloDoMotor(motor)}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="pagamento" className="mt-4 space-y-3">
            <AvisoSimulacao>
              O código de barras, a linha digitável e o PIX abaixo são ilustrativos: não correspondem a uma guia oficial e
              <b> não devem ser usados para pagamento</b>. Emita a guia no portal do órgão (PGDAS-D/DAS, e-CAC, SEFAZ ou prefeitura).
            </AvisoSimulacao>
            <div className="rounded-2xl border border-border/70 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Barcode className="h-4 w-4" /> Código de barras
              </div>
              <div className="font-mono text-xs break-all">{guia.barras}</div>
              <div className="flex h-12 items-end gap-[2px]">
                {guia.barras.replace(/\s/g, "").split("").map((d, i) => (
                  <span
                    key={i}
                    className="bg-foreground/80"
                    style={{ width: (Number(d) % 3) + 1, height: `${40 + (Number(d) % 6) * 3}%` }}
                  />
                ))}
              </div>
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => copiar(guia.linhaDigitavel, "Linha digitável")}>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar linha digitável (simulada)
              </Button>
              <div className="font-mono text-xs break-all text-muted-foreground">{guia.linhaDigitavel}</div>
            </div>
            <div className="rounded-2xl border border-border/70 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <QrCode className="h-4 w-4" /> PIX copia e cola
              </div>
              <div className="font-mono text-[11px] break-all">{guia.pix}</div>
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => copiar(guia.pix, "PIX")}>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar PIX
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="origem" className="mt-4 space-y-2">
            {memoria.map((m, i) => (
              <div key={i} className="rounded-2xl border border-border/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm">{m.campo}</span>
                  <span className="font-mono text-sm">{m.valor}</span>
                </div>
                <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                  <div>Origem: {m.origem}</div>
                  <div>Documento: {m.documento}</div>
                  <div>Regra: {m.regra}</div>
                  <div className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> {m.legislacao}</div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="baixas" className="mt-4 space-y-2">
            {guia.pagamentos.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma baixa registrada para esta guia.</p>
            )}
            {guia.pagamentos.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm">{dataBR(p.data)} · {p.meio}</span>
                  <span className="font-mono text-sm">{brl(p.valor)}</span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {p.banco} · autenticação {p.autenticacao} · baixa {p.origem.toLowerCase()}
                </div>
                <div className="mt-2 flex gap-2">
                  {!p.conciliado && (
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => conciliarPagamento(guia, p.id)}>
                      Conciliar
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="rounded-full text-destructive" onClick={() => estornarPagamento(guia, p.id)}>
                    Estornar
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="auditoria" className="mt-4 space-y-2">
            {guia.log.length === 0 && <p className="text-sm text-muted-foreground">Sem eventos registrados.</p>}
            {guia.log.map((l) => (
              <div key={l.id} className="rounded-2xl border border-border/70 p-3">
                <div className="flex items-center gap-2 text-xs">
                  <FileClock className="h-3.5 w-3.5 text-brand-orange" />
                  <span className="font-medium">{l.acao}</span>
                  <span className="text-muted-foreground">
                    {new Date(l.em).toLocaleString("pt-BR")} · {l.usuario}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{l.detalhe}</p>
              </div>
            ))}
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <ArrowUpRight className="h-3 w-3" /> Log imutável — eventos não podem ser editados nem removidos.
            </p>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
