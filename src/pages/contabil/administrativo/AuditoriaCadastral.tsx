import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ChevronRight, Lock, ShieldCheck } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Badge, Button, Card, CardContent, Input, Progress, ScrollArea, Select, SelectContent,
  SelectItem, SelectTrigger, SelectValue,
} from "@/design-system/mj-design-system-db98fa";
import ExportarMenu from "@/components/contabil/ExportarMenu";
import {
  CORES_CRIT, CRITICIDADES, DOMINIOS, READ_ONLY_MSG, auditarTudo, qualidadeCadastral,
  resumoCriticidade, useRegistrarAcesso, type Criticidade, type Registro,
} from "@/lib/adminStore";

export default function AuditoriaCadastral() {
  useRegistrarAcesso("Administrativo · Auditoria de cadastros");
  const achados = useMemo(() => auditarTudo(), []);
  const [dominio, setDominio] = useState("todos");
  const [crit, setCrit] = useState("todos");
  const [busca, setBusca] = useState("");

  const filtrados = achados.filter((a) =>
    (dominio === "todos" || a.dominio === dominio) &&
    (crit === "todos" || a.criticidade === crit) &&
    (!busca.trim() || `${a.cadastro} ${a.titulo} ${a.campo} ${a.chave}`.toLowerCase().includes(busca.trim().toLowerCase())),
  );

  const totalRegistros = DOMINIOS.reduce((a, d) => a + d.registros.length, 0);
  const qualidade = qualidadeCadastral(achados, totalRegistros);
  const resumo = resumoCriticidade(achados);
  const porDominio = DOMINIOS.map((d) => ({ nome: d.titulo, total: achados.filter((a) => a.dominio === d.slug).length }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Administrativo</div>
          <h1 className="mt-2 font-display text-4xl">
            Auditoria <span className="text-brand-orange">cadastral</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Motor de validação sobre os dados sincronizados. {READ_ONLY_MSG}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="rounded-full border-0 bg-muted text-muted-foreground">
            <Lock className="mr-1 h-3 w-3" /> Somente leitura
          </Badge>
          <ExportarMenu
            nome="Auditoria de cadastros"
            colunas={[
              { key: "dominioTitulo", label: "Cadastro" }, { key: "cadastro", label: "Registro" },
              { key: "chave", label: "Chave" }, { key: "titulo", label: "Inconsistência" },
              { key: "criticidade", label: "Criticidade" }, { key: "campo", label: "Campo" },
              { key: "sugestao", label: "Sugestão de correção" }, { key: "origem", label: "Sistema de origem" },
            ]}
            linhas={filtrados as unknown as Registro[]}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-xl border-border/70 lg:col-span-1">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Qualidade cadastral</span>
              <span className="font-display text-2xl text-brand-orange">{qualidade}%</span>
            </div>
            <Progress value={qualidade} />
            <div className="space-y-2 pt-2">
              {resumo.map((c) => (
                <div key={c.nome} className="flex items-center justify-between text-sm">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: CORES_CRIT[c.nome as Criticidade] }} />
                    {c.nome}
                  </span>
                  <span className="font-mono">{c.total}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/70 lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-4 text-sm font-medium">Inconsistências por cadastro</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porDominio} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="nome" type="category" width={150} tick={{ fontSize: 11 }} />
                  <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="total" radius={[0, 8, 8, 0]} fill="var(--brand-orange)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar inconsistência, cadastro ou campo…"
          className="min-w-[220px] flex-1 rounded-full"
        />
        <Select value={dominio} onValueChange={setDominio}>
          <SelectTrigger className="w-[200px] rounded-full"><SelectValue /></SelectTrigger>
          <SelectContent className="rounded-2xl">
            <SelectItem value="todos">Todos os cadastros</SelectItem>
            {DOMINIOS.map((d) => <SelectItem key={d.slug} value={d.slug}>{d.titulo}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={crit} onValueChange={setCrit}>
          <SelectTrigger className="w-[170px] rounded-full"><SelectValue /></SelectTrigger>
          <SelectContent className="rounded-2xl">
            <SelectItem value="todos">Todas criticidades</SelectItem>
            {CRITICIDADES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        {(busca || dominio !== "todos" || crit !== "todos") && (
          <Button variant="ghost" size="sm" className="rounded-full" onClick={() => { setBusca(""); setDominio("todos"); setCrit("todos"); }}>
            Limpar
          </Button>
        )}
      </div>

      <Card className="rounded-xl border-border/70">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            {filtrados.length ? <AlertTriangle className="h-4 w-4 text-brand-orange" /> : <ShieldCheck className="h-4 w-4 text-brand-blue" />}
            {filtrados.length} inconsistências
          </div>
          <ScrollArea className="max-h-[620px]">
            <div className="space-y-2 pr-2">
              {filtrados.map((a) => (
                <div key={a.id} className="rounded-2xl border border-border/70 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: CORES_CRIT[a.criticidade] }} />
                    <span className="text-sm font-medium">{a.titulo}</span>
                    <Badge className="rounded-full border-0 bg-muted text-muted-foreground">{a.criticidade}</Badge>
                    <Link to={`/administrativo/cadastros/${a.dominio}`} className="text-xs text-brand-orange hover:underline">
                      {a.dominioTitulo} <ChevronRight className="inline h-3 w-3" />
                    </Link>
                  </div>
                  <div className="mt-1 text-sm">{a.cadastro} <span className="text-muted-foreground">· {a.chave} · campo {a.campo}</span></div>
                  <div className="mt-1 text-xs text-muted-foreground">Sugestão: {a.sugestao} · Origem: {a.origem}</div>
                </div>
              ))}
              {!filtrados.length && (
                <div className="py-12 text-center text-sm text-muted-foreground">Nenhuma inconsistência com os filtros aplicados.</div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
