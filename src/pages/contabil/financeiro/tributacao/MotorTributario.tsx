import { useMemo, useState } from "react";
import {
  Badge, Button, Card, CardContent, Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import AssistenteCampos, { type CampoAjuda } from "@/components/contabil/AssistenteCampos";
import {
  CAMPOS_REGRA, CATEGORIAS_REGRA, hojeISO, novoId, regrasVigentes, removerRegra,
  salvarRegra, UFS, useTributario, type OperadorRegra, type Regra,
} from "@/lib/tributarioStore";

const OPERADORES: { v: OperadorRegra; l: string }[] = [
  { v: "igual", l: "é igual a" },
  { v: "diferente", l: "é diferente de" },
  { v: "maior", l: "é maior que" },
  { v: "menor", l: "é menor que" },
  { v: "contem", l: "contém" },
  { v: "vazio", l: "está vazio" },
];

const RESULTADOS: { v: Regra["resultado"]; l: string }[] = [
  { v: "bloquear", l: "Bloquear emissão" },
  { v: "alertar", l: "Alertar o operador" },
  { v: "informar", l: "Registrar informação" },
  { v: "aplicar-aliquota", l: "Aplicar alíquota" },
  { v: "reduzir-base", l: "Reduzir base de cálculo" },
];

const AJUDA: CampoAjuda[] = [
  { key: "nome", label: "Nome", required: true, ajuda: "Identificação da regra nos alertas e na trilha de auditoria." },
  { key: "categoria", label: "Categoria", ajuda: "Agrupa a regra por domínio tributário (ICMS, PIS/COFINS, Cadastro...)." },
  { key: "prioridade", label: "Prioridade", ajuda: "Ordem de execução. Menor número executa antes." },
  { key: "legislacao", label: "Legislação", ajuda: "Fundamento legal que sustenta a regra (lei, convênio, ajuste SINIEF)." },
  { key: "vigencia", label: "Vigência", ajuda: "Período em que a regra é aplicada. Fora da vigência ela não é avaliada." },
  { key: "versao", label: "Versão", ajuda: "Controle de versionamento. Ao alterar uma regra vigente, crie uma nova versão." },
  { key: "uf", label: "UF", ajuda: "Restringe a regra a um estado. Use TODAS para aplicação nacional." },
  { key: "condicao", label: "Condição", required: true, ajuda: "Campo + operador + valor avaliados em cada documento fiscal." },
  { key: "resultado", label: "Resultado", ajuda: "O que acontece quando a condição é verdadeira." },
  { key: "mensagem", label: "Mensagem", required: true, ajuda: "Texto exibido ao operador quando a regra dispara." },
  { key: "correcao", label: "Correção sugerida", ajuda: "Orientação prática de como resolver a inconsistência." },
];

const vazia = (): Regra => ({
  id: novoId("rg"), nome: "", categoria: CATEGORIAS_REGRA[0], prioridade: 50,
  legislacao: "", vigenciaInicio: hojeISO(), versao: "1.0", uf: "TODAS",
  campo: CAMPOS_REGRA[0].key, operador: "igual", valor: "", resultado: "alertar",
  mensagem: "", correcao: "", ativa: true,
});

export default function MotorTributario() {
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const empresaId = empresa?.id ?? "";
  const [query, setQuery] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [edit, setEdit] = useState<Regra | null>(null);

  const regras = useTributario(() => regrasVigentes(empresaId), [empresaId]);

  const filtradas = useMemo(
    () => regras.filter((r) =>
      (categoria === "todas" || r.categoria === categoria) &&
      `${r.nome} ${r.legislacao} ${r.mensagem}`.toLowerCase().includes(query.toLowerCase()),
    ),
    [regras, query, categoria],
  );

  const salvar = () => {
    if (!edit) return;
    if (!empresaId) return toast.error("Selecione uma empresa.");
    if (!edit.nome.trim()) return toast.error("Informe o nome da regra.");
    if (!edit.mensagem.trim()) return toast.error("Informe a mensagem exibida ao operador.");
    salvarRegra(empresaId, edit);
    toast.success("Regra salva e versionada.");
    setEdit(null);
  };

  const contexto = {
    tela: "Motor tributário",
    modulo: "Financeiro › Tributação",
    competencia: formatCompetencia(competencia),
    empresa: empresa ? { razao: empresa.razao, regime: empresa.regime } : null,
    totalRegras: regras.length,
    ativas: regras.filter((r) => r.ativa).length,
    bloqueios: regras.filter((r) => r.resultado === "bloquear").length,
    categorias: CATEGORIAS_REGRA,
    orientacoes: [
      "As regras são avaliadas em cada emissão, na ordem de prioridade.",
      "Regras nativas acompanham a legislação e podem ser desativadas, mas não excluídas.",
    ],
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Financeiro › Tributação</div>
          <h1 className="font-display text-3xl sm:text-4xl">
            Motor <span className="text-brand-orange">tributário</span>
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Rule engine parametrizável: cada regra tem condição, resultado, vigência, UF e versão —
            mudanças legais são absorvidas sem alterar o código do sistema.
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary" className="rounded-full">{formatCompetencia(competencia)}</Badge>
            <Badge variant="secondary" className="rounded-full">{empresa?.razao ?? "Nenhuma empresa selecionada"}</Badge>
          </div>
        </div>
        <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={() => setEdit(vazia())}>
          <Plus className="mr-2 h-4 w-4" /> Nova regra
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Regras cadastradas", valor: String(regras.length) },
          { label: "Ativas", valor: String(regras.filter((r) => r.ativa).length) },
          { label: "Bloqueantes", valor: String(regras.filter((r) => r.resultado === "bloquear").length) },
          { label: "Categorias", valor: String(new Set(regras.map((r) => r.categoria)).size) },
        ].map((k) => (
          <Card key={k.label} className="rounded-3xl shadow-card">
            <CardContent className="p-4">
              <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{k.label}</div>
              <div className="mt-1 font-display text-xl">{k.valor}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-3xl shadow-card">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} className="rounded-full pl-9"
                placeholder="Buscar por nome, legislação ou mensagem…" />
            </div>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="w-[210px] rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {CATEGORIAS_REGRA.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Prior.</TableHead>
                  <TableHead>Regra</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Condição</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Vigência</TableHead>
                  <TableHead>UF</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhuma regra encontrada com os filtros atuais.
                  </TableCell></TableRow>
                ) : filtradas.map((r) => (
                  <TableRow key={r.id} className={r.ativa ? "" : "opacity-50"}>
                    <TableCell className="font-mono text-xs">{r.prioridade}</TableCell>
                    <TableCell>
                      <div className="font-medium">{r.nome}</div>
                      <div className="text-[11px] text-muted-foreground">{r.legislacao} · v{r.versao}</div>
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="rounded-full">{r.categoria}</Badge></TableCell>
                    <TableCell className="font-mono text-[11px]">
                      {CAMPOS_REGRA.find((c) => c.key === r.campo)?.label ?? r.campo}{" "}
                      {OPERADORES.find((o) => o.v === r.operador)?.l} {r.valor}
                    </TableCell>
                    <TableCell>
                      <Badge className="rounded-full" variant={r.resultado === "bloquear" ? "destructive" : "secondary"}>
                        {RESULTADOS.find((x) => x.v === r.resultado)?.l}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-[11px]">
                      {r.vigenciaInicio}{r.vigenciaFim ? ` → ${r.vigenciaFim}` : ""}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.uf}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" className="rounded-full" onClick={() => setEdit({ ...r })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!r.nativa && (
                        <Button size="icon" variant="ghost" className="rounded-full" onClick={() => {
                          removerRegra(empresaId, r.id);
                          toast.success("Regra removida.");
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {edit?.nativa ? "Regra nativa" : edit && regras.some((r) => r.id === edit.id) ? "Editar regra" : "Nova regra"}
            </DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12 space-y-1.5 sm:col-span-6">
                <Label className="text-xs">Nome</Label>
                <Input className="rounded-xl" value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} />
              </div>
              <div className="col-span-6 space-y-1.5 sm:col-span-3">
                <Label className="text-xs">Categoria</Label>
                <Select value={edit.categoria} onValueChange={(v) => setEdit({ ...edit, categoria: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIAS_REGRA.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-6 space-y-1.5 sm:col-span-3">
                <Label className="text-xs">Prioridade</Label>
                <Input type="number" className="rounded-xl" value={edit.prioridade}
                  onChange={(e) => setEdit({ ...edit, prioridade: Number(e.target.value) })} />
              </div>

              <div className="col-span-12 space-y-1.5 sm:col-span-6">
                <Label className="text-xs">Legislação</Label>
                <Input className="rounded-xl" value={edit.legislacao} onChange={(e) => setEdit({ ...edit, legislacao: e.target.value })} />
              </div>
              <div className="col-span-4 space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Versão</Label>
                <Input className="rounded-xl" value={edit.versao} onChange={(e) => setEdit({ ...edit, versao: e.target.value })} />
              </div>
              <div className="col-span-4 space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Vigência início</Label>
                <Input type="date" className="rounded-xl" value={edit.vigenciaInicio}
                  onChange={(e) => setEdit({ ...edit, vigenciaInicio: e.target.value })} />
              </div>
              <div className="col-span-4 space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Vigência fim</Label>
                <Input type="date" className="rounded-xl" value={edit.vigenciaFim ?? ""}
                  onChange={(e) => setEdit({ ...edit, vigenciaFim: e.target.value || undefined })} />
              </div>

              <div className="col-span-12 space-y-1.5 sm:col-span-4">
                <Label className="text-xs">Campo avaliado</Label>
                <Select value={edit.campo} onValueChange={(v) => setEdit({ ...edit, campo: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{CAMPOS_REGRA.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-6 space-y-1.5 sm:col-span-4">
                <Label className="text-xs">Operador</Label>
                <Select value={edit.operador} onValueChange={(v) => setEdit({ ...edit, operador: v as OperadorRegra })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{OPERADORES.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-6 space-y-1.5 sm:col-span-4">
                <Label className="text-xs">Valor</Label>
                <Input className="rounded-xl" value={edit.valor} onChange={(e) => setEdit({ ...edit, valor: e.target.value })} />
              </div>

              <div className="col-span-12 space-y-1.5 sm:col-span-5">
                <Label className="text-xs">Resultado</Label>
                <Select value={edit.resultado} onValueChange={(v) => setEdit({ ...edit, resultado: v as Regra["resultado"] })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{RESULTADOS.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-6 space-y-1.5 sm:col-span-4">
                <Label className="text-xs">Percentual do resultado</Label>
                <Input type="number" className="rounded-xl" value={edit.resultadoValor ?? ""}
                  onChange={(e) => setEdit({ ...edit, resultadoValor: e.target.value === "" ? undefined : Number(e.target.value) })} />
              </div>
              <div className="col-span-6 space-y-1.5 sm:col-span-3">
                <Label className="text-xs">UF</Label>
                <Select value={edit.uf} onValueChange={(v) => setEdit({ ...edit, uf: v as Regra["uf"] })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODAS">TODAS</SelectItem>
                    {UFS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-12 space-y-1.5">
                <Label className="text-xs">Mensagem ao operador</Label>
                <Textarea className="rounded-xl" rows={2} value={edit.mensagem}
                  onChange={(e) => setEdit({ ...edit, mensagem: e.target.value })} />
              </div>
              <div className="col-span-12 space-y-1.5">
                <Label className="text-xs">Correção sugerida</Label>
                <Textarea className="rounded-xl" rows={2} value={edit.correcao ?? ""}
                  onChange={(e) => setEdit({ ...edit, correcao: e.target.value })} />
              </div>

              <div className="col-span-12 flex items-center gap-3 rounded-2xl border p-3">
                <Switch checked={edit.ativa} onCheckedChange={(v) => setEdit({ ...edit, ativa: v })} />
                <div>
                  <div className="text-sm">Regra ativa</div>
                  <div className="text-[11px] text-muted-foreground">Regras inativas não são avaliadas na emissão.</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <AssistenteCampos
              titulo="IA ajudante — motor tributário"
              campos={AJUDA}
              draft={edit ? { Nome: edit.nome, Categoria: edit.categoria, Condição: `${edit.campo} ${edit.operador} ${edit.valor}` } : {}}
            />
            <Button variant="outline" className="rounded-full" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={salvar}>Salvar regra</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssistenteFechamento contexto={contexto} resumo={`Motor tributário — ${regras.length} regras`} rotulo="IA ajudante" />
    </div>
  );
}
