import { useState } from "react";
import { Plus, ScrollText, Search, Trash2 } from "lucide-react";
import {
  Badge, Button, Card, CardContent, Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Switch, Textarea,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import {
  CAMPOS_REGRA, CATEGORIAS_AUD, CORES, CRITICIDADES, OPERADORES, alternarRegra,
  config, expressaoDe, novoAudId, removerRegra, salvarConfig, salvarRegra, useRegras,
  type CatSlug, type Condicao, type Criticidade, type Regra,
} from "@/lib/auditoriaStore";
import { confirmarExclusao } from "@/lib/confirmar";

const GRUPOS: { slug: CatSlug; titulo: string }[] = [
  { slug: "xml-escrituracao", titulo: "XML × Escrituração" },
  { slug: "classificacao", titulo: "NCM / CST / CFOP" },
  { slug: "creditos", titulo: "Créditos" },
  { slug: "certidoes", titulo: "Certidões" },
];

function novaRegra(): Regra {
  return {
    id: novoAudId("AUD-CUS"),
    nome: "",
    categoria: "Tributária",
    grupo: "classificacao",
    descricao: "",
    legislacao: "",
    criticidade: "Média",
    condicoes: [{ campo: "cfop", operador: "igual", valor: "" }],
    juncao: "E",
    mensagem: "",
    sugestao: "",
    acaoAutomatica: "Sinalizar para revisão manual",
    prioridade: 50,
    versao: "1.0",
    vigencia: "01/01/2026",
    ativa: true,
    customizada: true,
  };
}

export default function AuditoriaRegras() {
  const lista = useRegras();
  const cfg = config();
  const [busca, setBusca] = useState("");
  const [grupo, setGrupo] = useState("todos");
  const [edicao, setEdicao] = useState<Regra | null>(null);

  const filtradas = lista.filter(
    (x) =>
      (grupo === "todos" || x.grupo === grupo) &&
      (busca.trim() === "" || `${x.id} ${x.nome} ${x.descricao} ${x.legislacao}`.toLowerCase().includes(busca.toLowerCase())),
  );

  function setCond(i: number, patch: Partial<Condicao>) {
    if (!edicao) return;
    const condicoes = edicao.condicoes.map((c, k) => (k === i ? { ...c, ...patch } : c));
    setEdicao({ ...edicao, condicoes });
  }

  function salvar() {
    if (!edicao) return;
    if (!edicao.nome.trim()) return toast.error("Informe o nome da regra.");
    salvarRegra(edicao);
    setEdicao(null);
    toast.success("Regra salva e aplicada nas próximas auditorias.");
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Auditoria fiscal</div>
          <h1 className="flex items-center gap-2 font-display text-3xl sm:text-4xl">
            <ScrollText className="h-7 w-7 text-brand-orange" /> Regras de <span className="text-brand-orange">auditoria</span>
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Motor de regras da auditoria fiscal: catálogo de regras aplicadas no cruzamento dos módulos. Ative, ajuste a criticidade
            ou crie regras próprias com condições parametrizáveis.
          </p>
        </div>
        <Button
          className="rounded-lg bg-brand-orange hover:bg-brand-orange/90"
          onClick={() => setEdicao(novaRegra())}
        >
          <Plus className="mr-1.5 h-4 w-4" /> Nova regra
        </Button>
      </div>

      <Card className="rounded-xl border-border/70">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <Label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Tolerância de divergência (R$)</Label>
            <Input
              type="number"
              className="mt-1 rounded-full"
              defaultValue={cfg.tolerancia}
              onBlur={(e) => salvarConfig({ tolerancia: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Responsável padrão</Label>
            <Input
              className="mt-1 rounded-full"
              defaultValue={cfg.responsavelPadrao}
              onBlur={(e) => salvarConfig({ responsavelPadrao: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 p-3">
            <span className="text-sm">Auditar ao importar documentos</span>
            <Switch
              defaultChecked={cfg.auditarAoImportar}
              onCheckedChange={(v) => salvarConfig({ auditarAoImportar: v })}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 p-3">
            <span className="text-sm">Auditar antes do SPED</span>
            <Switch
              defaultChecked={cfg.auditarAntesSped}
              onCheckedChange={(v) => salvarConfig({ auditarAntesSped: v })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="rounded-full pl-9"
            placeholder="Buscar regra, código ou legislação"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={grupo} onValueChange={setGrupo}>
          <SelectTrigger className="w-[220px] rounded-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os grupos</SelectItem>
            {GRUPOS.map((g) => <SelectItem key={g.slug} value={g.slug}>{g.titulo}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtradas.map((x) => (
          <Card key={x.id} className="rounded-xl border-border/70">
            <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground">{x.id}</span>
                  <span className="font-medium break-words">{x.nome}</span>
                  <Badge className={`rounded-full ${CORES[x.criticidade]}`}>{x.criticidade}</Badge>
                  <Badge variant="secondary" className="rounded-full text-[10px]">{x.categoria}</Badge>
                  {x.customizada && <Badge variant="secondary" className="rounded-full text-[10px]">customizada</Badge>}
                </div>
                <p className="text-xs text-muted-foreground break-words">{x.descricao}</p>
                <p className="mt-1 font-mono text-[10px] break-words text-muted-foreground">SE {expressaoDe(x)}</p>
                <p className="text-[10px] text-muted-foreground break-words">
                  {x.legislacao} · v{x.versao} · vigência {x.vigencia} · {x.acaoAutomatica}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Switch checked={x.ativa} onCheckedChange={(v) => alternarRegra(x.id, v)} />
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => setEdicao(x)}>
                  Editar
                </Button>
                {x.customizada && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      if (!confirmarExclusao("esta regra")) return;
                      removerRegra(x.id);
                      toast.success("Regra removida.");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!edicao} onOpenChange={(o) => !o && setEdicao(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {edicao?.customizada ? "Regra customizada" : "Parametrizar regra"}
            </DialogTitle>
          </DialogHeader>
          {edicao && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Nome</Label>
                  <Input className="mt-1 rounded-full" value={edicao.nome} onChange={(e) => setEdicao({ ...edicao, nome: e.target.value })} />
                </div>
                <div>
                  <Label>Grupo</Label>
                  <Select value={edicao.grupo} onValueChange={(v) => setEdicao({ ...edicao, grupo: v as CatSlug })}>
                    <SelectTrigger className="mt-1 rounded-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GRUPOS.map((g) => <SelectItem key={g.slug} value={g.slug}>{g.titulo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={edicao.categoria} onValueChange={(v) => setEdicao({ ...edicao, categoria: v as Regra["categoria"] })}>
                    <SelectTrigger className="mt-1 rounded-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS_AUD.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Criticidade</Label>
                  <Select value={edicao.criticidade} onValueChange={(v) => setEdicao({ ...edicao, criticidade: v as Criticidade })}>
                    <SelectTrigger className="mt-1 rounded-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CRITICIDADES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Legislação</Label>
                  <Input className="mt-1 rounded-full" value={edicao.legislacao} onChange={(e) => setEdicao({ ...edicao, legislacao: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Descrição</Label>
                  <Textarea className="mt-1" value={edicao.descricao} onChange={(e) => setEdicao({ ...edicao, descricao: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2 rounded-2xl border border-border/70 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">Condições</span>
                  <div className="flex items-center gap-2">
                    <Select value={edicao.juncao} onValueChange={(v) => setEdicao({ ...edicao, juncao: v as "E" | "OU" })}>
                      <SelectTrigger className="w-[90px] rounded-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="E">E</SelectItem>
                        <SelectItem value="OU">OU</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => setEdicao({ ...edicao, condicoes: [...edicao.condicoes, { campo: "cfop", operador: "igual", valor: "" }] })}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {edicao.condicoes.map((c, i) => (
                  <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                    <Select value={c.campo} onValueChange={(v) => setCond(i, { campo: v })}>
                      <SelectTrigger className="rounded-full"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        {CAMPOS_REGRA.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={c.operador} onValueChange={(v) => setCond(i, { operador: v as Condicao["operador"] })}>
                      <SelectTrigger className="rounded-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {OPERADORES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input className="rounded-full" placeholder="valor" value={c.valor} onChange={(e) => setCond(i, { valor: e.target.value })} />
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => setEdicao({ ...edicao, condicoes: edicao.condicoes.filter((_, k) => k !== i) })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <p className="font-mono text-[10px] break-words text-muted-foreground">SE {expressaoDe(edicao)}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Mensagem exibida</Label>
                  <Input className="mt-1 rounded-full" value={edicao.mensagem} onChange={(e) => setEdicao({ ...edicao, mensagem: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Sugestão de correção</Label>
                  <Textarea className="mt-1" value={edicao.sugestao} onChange={(e) => setEdicao({ ...edicao, sugestao: e.target.value })} />
                </div>
                <div>
                  <Label>Ação automática</Label>
                  <Input className="mt-1 rounded-full" value={edicao.acaoAutomatica} onChange={(e) => setEdicao({ ...edicao, acaoAutomatica: e.target.value })} />
                </div>
                <div>
                  <Label>Vigência</Label>
                  <Input className="mt-1 rounded-full" value={edicao.vigencia} onChange={(e) => setEdicao({ ...edicao, vigencia: e.target.value })} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setEdicao(null)}>Cancelar</Button>
            <Button className="rounded-lg bg-brand-orange hover:bg-brand-orange/90" onClick={salvar}>Salvar regra</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssistenteFechamento
        rotulo="IA ajudante"
        resumo={`Motor de regras da auditoria fiscal: ${lista.length} regras cadastradas, ${lista.filter((x) => x.ativa).length} ativas.`}
        contexto={{
          modulo: "Auditoria fiscal — motor de regras",
          config: cfg,
          regras: lista.map((x) => ({
            id: x.id, nome: x.nome, grupo: x.grupo, criticidade: x.criticidade,
            ativa: x.ativa, expressao: expressaoDe(x), legislacao: x.legislacao,
          })),
        }}
      />
    </div>
  );
}
