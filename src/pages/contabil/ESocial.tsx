import { useState } from "react";
import { Badge, Button, Card, CardContent } from "@/design-system/mj-design-system-db98fa";
import { ChevronRight, Send, Download, RefreshCw, FileWarning, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { EVENTOS_ESOCIAL, type EventoESocial } from "@/lib/contabilMock";

const TIPOS = [
  { code: "S-1000", label: "Informações do empregador" },
  { code: "S-1010", label: "Tabela de rubricas" },
  { code: "S-1200", label: "Remuneração do trabalhador", count: 3 },
  { code: "S-1210", label: "Pagamentos de rendimentos", count: 1 },
  { code: "S-2200", label: "Admissão de trabalhador", count: 1 },
  { code: "S-2299", label: "Desligamento", count: 1 },
  { code: "S-1299", label: "Fechamento eventos periódicos", count: 1 },
];

const statusBadge: Record<EventoESocial["status"], { cls: string; Icon: typeof CheckCircle2; label: string }> = {
  ACEITO: { cls: "text-success border-success/30 bg-success/10", Icon: CheckCircle2, label: "Aceito" },
  ENVIADO: { cls: "text-brand-blue border-brand-blue/30 bg-brand-blue/10", Icon: Send, label: "Enviado" },
  PROCESSANDO: { cls: "text-warn border-warn/30 bg-warn/10", Icon: Loader2, label: "Processando" },
  PENDENTE: { cls: "text-muted-foreground border-border bg-muted/40", Icon: Clock, label: "Pendente" },
  REJEITADO: { cls: "text-destructive border-destructive/30 bg-destructive/10", Icon: XCircle, label: "Rejeitado" },
};

const XML_EXEMPLO = `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtRemun/v_S_01_02_00">
  <evtRemun Id="ID1123456780000002024103100000000000001">
    <ideEvento>
      <indRetif>1</indRetif>
      <perApur>2024-10</perApur>
      <indApuracao>1</indApuracao>
      <procEmi>1</procEmi>
      <verProc>UseContabil-2.4</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>12345678</nrInsc>
    </ideEmpregador>
    <ideTrabalhador>
      <cpfTrab>***.***.***-**</cpfTrab>
    </ideTrabalhador>
    <dmDev>
      <ideDmDev>001</ideDmDev>
      <codCateg>101</codCateg>
      <infoPerApur>...</infoPerApur>
    </dmDev>
  </evtRemun>
</eSocial>`;

export default function ESocial() {
  const [selectedId, setSelectedId] = useState<string>("ev3");
  const selected = EVENTOS_ESOCIAL.find((e) => e.id === selectedId)!;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Módulo 04</div>
          <h1 className="font-display text-4xl mt-2">Central <span className="text-brand-orange">eSocial</span></h1>
          <p className="text-sm text-muted-foreground mt-1.5">Ambiente HOMOLOGAÇÃO · fila de transmissão · sem envio real ao governo</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-md h-9">
            <RefreshCw className="h-4 w-4 mr-1.5" /> Consultar lote
          </Button>
          <Button size="sm" className="rounded-md h-9 bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground">
            <Send className="h-4 w-4 mr-1.5" /> Transmitir selecionados
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Coluna 1 — árvore de tipos */}
        <Card className="col-span-3 rounded-xl border border-border bg-card shadow-card">
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground px-2 pb-3">Tipos de evento</div>
            <nav className="space-y-0.5">
              {TIPOS.map((t) => (
                <button
                  key={t.code}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent/50 text-left"
                >
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-brand-orange">{t.code}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.label}</div>
                  </div>
                  {t.count ? <Badge variant="outline" className="rounded-md text-[10px] h-5 px-1.5">{t.count}</Badge> : null}
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        {/* Coluna 2 — fila */}
        <Card className="col-span-5 rounded-xl border border-border bg-card shadow-card">
          <CardContent className="p-0">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <div className="text-sm font-medium">Fila de transmissão</div>
              <Badge variant="outline" className="rounded-md">{EVENTOS_ESOCIAL.length}</Badge>
            </div>
            <div className="max-h-[560px] overflow-auto divide-y divide-border">
              {EVENTOS_ESOCIAL.map((ev) => {
                const s = statusBadge[ev.status];
                const active = ev.id === selectedId;
                return (
                  <button
                    key={ev.id}
                    onClick={() => setSelectedId(ev.id)}
                    className={`w-full text-left px-5 py-3 hover:bg-accent/40 transition ${active ? "bg-brand-orange/10 border-l-2 border-brand-orange" : "border-l-2 border-transparent"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-brand-orange">{ev.tipo}</span>
                      <span className="text-xs text-muted-foreground">· {ev.competencia}</span>
                      <div className="flex-1" />
                      <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded border ${s.cls}`}>
                        <s.Icon className={`h-3 w-3 ${ev.status === "PROCESSANDO" ? "animate-spin" : ""}`} /> {s.label}
                      </span>
                    </div>
                    <div className="text-sm truncate">{ev.descricao}</div>
                    {ev.colaborador && <div className="text-xs text-muted-foreground mt-0.5">{ev.colaborador}</div>}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Coluna 3 — detalhes/XML */}
        <Card className="col-span-4 rounded-xl border border-border bg-card shadow-card">
          <CardContent className="p-5 space-y-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Evento selecionado</div>
              <div className="font-mono text-sm text-brand-orange mt-1">{selected.tipo}</div>
              <div className="font-display text-xl mt-1">{selected.descricao}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-md border border-border bg-background/60 p-3">
                <div className="text-muted-foreground">Competência</div>
                <div className="font-mono mt-1">{selected.competencia}</div>
              </div>
              <div className="rounded-md border border-border bg-background/60 p-3">
                <div className="text-muted-foreground">Recibo/Protocolo</div>
                <div className="font-mono mt-1 truncate">{selected.recibo ?? "—"}</div>
              </div>
            </div>

            {selected.status === "REJEITADO" && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 flex gap-2 text-xs">
                <FileWarning className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-destructive">Erro de validação da RET</div>
                  <div className="text-muted-foreground mt-1">{selected.erro}</div>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Payload XML</div>
                <button className="text-xs text-brand-orange inline-flex items-center gap-1">
                  <Download className="h-3 w-3" /> baixar
                </button>
              </div>
              <pre className="rounded-md border border-border bg-background/60 p-3 text-[11px] font-mono leading-relaxed overflow-auto max-h-72">
                <code className="text-muted-foreground">{XML_EXEMPLO}</code>
              </pre>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-md h-8 flex-1">Retificar</Button>
              <Button size="sm" className="rounded-md h-8 flex-1 bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground">Reenviar</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
