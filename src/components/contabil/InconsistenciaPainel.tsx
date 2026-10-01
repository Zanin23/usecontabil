import { useState } from "react";
import {
  AlertTriangle, FileSearch, History, RefreshCw, ScrollText, ShieldCheck,
} from "lucide-react";
import {
  Badge, Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, Textarea,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import {
  CORES, SITUACOES, atualizarSituacao, brlAud, expressaoDe, regras,
  type AchadoResolvido, type Situacao,
} from "@/lib/auditoriaStore";

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 py-1.5 last:border-0">
      <span className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right font-mono text-xs">{valor}</span>
    </div>
  );
}

export default function InconsistenciaPainel({
  achado,
  onFechar,
  onReprocessar,
}: {
  achado: AchadoResolvido | null;
  onFechar: () => void;
  onReprocessar: () => void;
}) {
  const [situacao, setSituacao] = useState<Situacao>("Aberta");
  const [responsavel, setResponsavel] = useState("");
  const [nota, setNota] = useState("");
  const [ultimo, setUltimo] = useState<string>("");

  if (achado && ultimo !== achado.id) {
    setUltimo(achado.id);
    setSituacao(achado.situacao);
    setResponsavel(achado.responsavel);
    setNota(achado.nota);
  }

  const regra = achado ? regras().find((x) => x.id === achado.regraId) : undefined;

  function salvar(novo?: Situacao) {
    if (!achado) return;
    const alvo = novo ?? situacao;
    atualizarSituacao(achado.id, alvo, responsavel || "Equipe fiscal", nota);
    setSituacao(alvo);
    toast.success(`Inconsistência marcada como ${alvo.toLowerCase()}.`);
  }

  return (
    <Sheet open={!!achado} onOpenChange={(o) => !o && onFechar()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {achado && (
          <>
            <SheetHeader className="space-y-2 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={`rounded-full ${CORES[achado.criticidade]}`}>{achado.criticidade}</Badge>
                <Badge variant="secondary" className="rounded-full">{achado.categoria}</Badge>
                <Badge variant="secondary" className="rounded-full font-mono text-[10px]">{achado.regraId}</Badge>
                <Badge variant="secondary" className="rounded-full text-[10px]">{achado.situacao}</Badge>
              </div>
              <SheetTitle className="font-display text-2xl">{achado.regra}</SheetTitle>
              <SheetDescription>{achado.descricao}</SheetDescription>
            </SheetHeader>

            <div className="mt-5 space-y-5">
              <section className="rounded-2xl border border-border/70 p-4">
                <h3 className="mb-2 flex items-center gap-2 font-display text-lg">
                  <FileSearch className="h-4 w-4 text-brand-orange" /> Documentos envolvidos
                </h3>
                <Linha label="Documento" valor={achado.documento} />
                <Linha label="Participante" valor={achado.participante} />
                <Linha label="Competência" valor={achado.competencia} />
                <Linha label="Tributo" valor={achado.tributo} />
                <Linha label="Valor envolvido" valor={brlAud(achado.valor)} />
                <Linha label="Origem do dado" valor={achado.origem} />
              </section>

              <section className="rounded-2xl border border-border/70 p-4">
                <h3 className="mb-2 flex items-center gap-2 font-display text-lg">
                  <AlertTriangle className="h-4 w-4 text-brand-orange" /> Campos divergentes
                </h3>
                <div className="space-y-1.5">
                  {achado.campos.map((c, i) => (
                    <div key={`${c.campo}-${i}`} className="rounded-xl bg-muted/40 p-2.5">
                      <div className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{c.campo}</div>
                      <div className="mt-0.5 flex flex-wrap gap-x-4 font-mono text-xs">
                        <span>esperado: {c.esperado}</span>
                        <span className="text-destructive">encontrado: {c.encontrado}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-border/70 p-4">
                <h3 className="mb-2 flex items-center gap-2 font-display text-lg">
                  <ScrollText className="h-4 w-4 text-brand-orange" /> Memória da auditoria
                </h3>
                {achado.memoria.map((m, i) => <Linha key={`${m.label}-${i}`} {...{ label: m.label, valor: m.valor }} />)}
              </section>

              <section className="rounded-2xl border border-border/70 p-4">
                <h3 className="mb-2 flex items-center gap-2 font-display text-lg">
                  <ShieldCheck className="h-4 w-4 text-brand-orange" /> Regra e legislação
                </h3>
                <Linha label="Expressão lógica" valor={regra ? expressaoDe(regra) : "—"} />
                <Linha label="Legislação" valor={achado.legislacao} />
                <Linha label="Versão da regra" valor={achado.versaoRegra} />
                <Linha label="Ação automática" valor={regra?.acaoAutomatica ?? "—"} />
                <p className="mt-3 rounded-xl bg-brand-orange/10 p-3 text-sm">
                  <strong>Sugestão de correção: </strong>{achado.sugestao}
                </p>
              </section>

              <section className="space-y-3 rounded-2xl border border-border/70 p-4">
                <h3 className="flex items-center gap-2 font-display text-lg">
                  <History className="h-4 w-4 text-brand-orange" /> Tratativa
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Situação</label>
                    <Select value={situacao} onValueChange={(v) => setSituacao(v as Situacao)}>
                      <SelectTrigger className="mt-1 rounded-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SITUACOES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Responsável</label>
                    <Input className="mt-1 rounded-full" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
                  </div>
                </div>
                <Textarea
                  placeholder="Registre a análise, evidências e o que foi corrigido."
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                />
                {achado.atualizado && (
                  <p className="text-xs text-muted-foreground">
                    Última atualização: {new Date(achado.atualizado).toLocaleString("pt-BR")}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button className="rounded-lg bg-brand-orange hover:bg-brand-orange/90" onClick={() => salvar()}>
                    Salvar tratativa
                  </Button>
                  <Button variant="outline" className="rounded-full" onClick={() => salvar("Corrigida")}>
                    Marcar como corrigida
                  </Button>
                  <Button variant="outline" className="rounded-full" onClick={() => salvar("Ignorada")}>
                    Ignorar
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      salvar("Reprocessada");
                      onReprocessar();
                    }}
                  >
                    <RefreshCw className="mr-1.5 h-4 w-4" /> Reprocessar
                  </Button>
                </div>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
