import { useState } from "react";
import { BadgeCheck, RefreshCw, Search, Trash2 } from "lucide-react";
import {
  Badge, Button, Card, CardContent, Input, Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow, Textarea,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { confirmarExclusao } from "@/lib/confirmar";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import {
  CATEGORIAS, certidoes as lerCertidoes, consultarCertidao, diasParaVencer,
  removerCertidao, resumoCertidoes, salvarCertidao, useCertidoes, type Certidao,
} from "@/lib/auditoriaStore";

const TOM: Record<Certidao["situacao"], string> = {
  "Válida": "bg-brand-blue/15 text-brand-blue",
  "Vencida": "bg-destructive/15 text-destructive",
  "Positiva com efeito negativo": "bg-brand-purple/15 text-brand-purple",
  "Positiva": "bg-destructive/15 text-destructive",
  "Pendente": "bg-brand-orange/15 text-brand-orange",
};

export default function AuditoriaCertidoes() {
  const { empresa } = useEmpresaAtual();
  const lista = useCertidoes(empresa?.id);
  const meta = CATEGORIAS.find((c) => c.slug === "certidoes")!;
  const [busca, setBusca] = useState("");
  const [nota, setNota] = useState("");

  const r = resumoCertidoes(lista);
  const filtrados = lista.filter(
    (x) => busca.trim() === "" || `${x.orgao} ${x.certidao} ${x.ambito} ${x.protocolo}`.toLowerCase().includes(busca.toLowerCase()),
  );

  function consultarTodas() {
    if (!empresa) return toast.error("Selecione uma empresa.");
    lerCertidoes(empresa.id).forEach((x) => consultarCertidao(empresa.id, x.id));
    toast.success("Consulta simulada concluída para todas as certidões.");
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Auditoria fiscal</div>
          <h1 className="flex items-center gap-2 font-display text-3xl sm:text-4xl">
            <BadgeCheck className="h-7 w-7 text-brand-orange" /> {meta.titulo}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {meta.descricao} As consultas são simuladas internamente, sem conexão com órgãos externos.
          </p>
          <Badge variant="secondary" className="mt-2 rounded-full">
            {empresa?.razao ?? "Nenhuma empresa selecionada"}
          </Badge>
        </div>
        <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={consultarTodas}>
          <RefreshCw className="mr-1.5 h-4 w-4" /> Consultar todas
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Certidões monitoradas", valor: String(r.total) },
          { label: "Válidas", valor: String(r.validas) },
          { label: "Vencidas", valor: String(r.vencidas) },
          { label: "Vencem em 30 dias", valor: String(r.aVencer) },
          { label: "Com pendências", valor: String(r.pendencias) },
        ].map((k) => (
          <Card key={k.label} className="rounded-3xl border-border/70">
            <CardContent className="space-y-1 p-5">
              <div className="text-[10px] uppercase leading-tight tracking-[0.06em] break-words text-muted-foreground">{k.label}</div>
              <div className="font-display text-2xl">{k.valor}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="rounded-full pl-9"
          placeholder="Buscar por órgão, certidão ou protocolo"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <Card className="rounded-3xl border-border/70">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Órgão</TableHead>
                <TableHead>Certidão</TableHead>
                <TableHead className="text-center">Âmbito</TableHead>
                <TableHead className="text-center">Emissão</TableHead>
                <TableHead className="text-center">Validade</TableHead>
                <TableHead className="text-center">Situação</TableHead>
                <TableHead>Pendências</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((x) => {
                const dias = diasParaVencer(x.validade);
                return (
                  <TableRow key={x.id}>
                    <TableCell className="text-sm break-words">{x.orgao}</TableCell>
                    <TableCell className="text-sm break-words">
                      {x.certidao}
                      <div className="font-mono text-[10px] text-muted-foreground">{x.protocolo}</div>
                    </TableCell>
                    <TableCell className="text-center text-xs">{x.ambito}</TableCell>
                    <TableCell className="text-center font-mono text-xs">{x.emissao}</TableCell>
                    <TableCell className="text-center font-mono text-xs">
                      {x.validade}
                      <div className={`text-[10px] ${dias < 0 ? "text-destructive" : dias <= 30 ? "text-brand-orange" : "text-muted-foreground"}`}>
                        {dias < 0 ? `vencida há ${Math.abs(dias)}d` : `${dias}d restantes`}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`rounded-full ${TOM[x.situacao]}`}>{x.situacao}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px] break-words text-xs text-muted-foreground">
                      {x.pendencias || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          onClick={() => {
                            if (!empresa) return;
                            consultarCertidao(empresa.id, x.id);
                            toast.success("Certidão reconsultada.");
                          }}
                        >
                          Consultar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full"
                          aria-label={`Remover certidão ${x.certidao}`}
                          onClick={() => {
                            if (!empresa) return toast.error("Selecione uma empresa.");
                            if (!confirmarExclusao(`a certidão ${x.certidao}`, "Ela deixa de ser monitorada.")) return;
                            removerCertidao(empresa.id, x.id);
                            toast.success("Certidão removida do monitoramento.");
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/70">
        <CardContent className="space-y-3 p-5">
          <h2 className="font-display text-xl">Plano de regularização</h2>
          <Textarea
            placeholder="Registre as tratativas com os órgãos, parcelamentos e prazos assumidos."
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />
          <Button
            className="rounded-full bg-brand-orange hover:bg-brand-orange/90"
            onClick={() => {
              if (!empresa) return toast.error("Selecione uma empresa.");
              const pendente = lista.find((x) => x.pendencias.trim() !== "");
              if (pendente) salvarCertidao(empresa.id, { ...pendente, pendencias: nota || pendente.pendencias });
              toast.success("Plano de regularização registrado na trilha de auditoria.");
            }}
          >
            Registrar plano
          </Button>
        </CardContent>
      </Card>

      <AssistenteFechamento
        rotulo="IA ajudante"
        resumo={`Certidões e regularidade: ${r.validas} válidas de ${r.total}, ${r.vencidas} vencida(s) e ${r.aVencer} a vencer nos próximos 30 dias.`}
        contexto={{
          modulo: "Auditoria fiscal — certidões e regularidade",
          empresa: empresa?.razao,
          resumo: r,
          certidoes: lista.map((x) => ({
            orgao: x.orgao, certidao: x.certidao, situacao: x.situacao,
            validade: x.validade, pendencias: x.pendencias,
          })),
        }}
      />
    </div>
  );
}
