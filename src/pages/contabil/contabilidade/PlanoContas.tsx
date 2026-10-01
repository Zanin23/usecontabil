import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, ListTree, Pencil, Plus, Search, Sparkles, Trash2,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, Checkbox, cn, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import CabecalhoPagina from "@/components/contabil/cadastros/CabecalhoPagina";
import Kpis from "@/components/contabil/cadastros/Kpis";
import ListaErros from "@/components/contabil/cadastros/ListaErros";
import { Campo, CampoAreaTexto, CampoSelecao, CampoTexto } from "@/components/contabil/cadastros/Campos";
import { normalizarBusca } from "@/lib/busca";
import ExportarMenu from "@/components/contabil/ExportarMenu";
import { BotaoImportarPlanoContas } from "@/components/contabil/ImportacaoPlanilha";
import {
  carregarPlanoModelo, codigoPai, contasDoModelo, excluirConta, GRUPOS_CONTA, impedimentoExclusaoConta, naturezaEcd,
  naturezaPadrao, nivelDaConta, salvarConta, sugestaoSubconta, useContas, type Conta,
} from "@/lib/planoContasStore";
import { lancamentosDaConta } from "@/lib/lancamentosStore";
import { confirmarExclusao } from "@/lib/confirmar";

const contaVazia = (): Conta => ({
  id: "", codigo: "", descricao: "", tipo: "Analítica", natureza: "Devedora", grupo: "Ativo", exigeCentroCusto: false,
  situacao: "Ativa", origem: "Manual",
});

const COLUNAS_EXPORTACAO = [
  { key: "codigo", label: "Código" }, { key: "descricao", label: "Descrição" }, { key: "tipo", label: "Tipo" },
  { key: "nivel", label: "Nível" }, { key: "natureza", label: "Natureza" }, { key: "grupo", label: "Grupo" },
  { key: "codNat", label: "Natureza ECD" }, { key: "reduzido", label: "Reduzido" }, { key: "referencial", label: "Referencial RFB" },
  { key: "situacao", label: "Situação" },
];

export default function PlanoContas() {
  const contas = useContas();
  const [busca, setBusca] = useState("");
  const [expandidos, setExpandidos] = useState<Set<string> | null>(null);
  const [aberto, setAberto] = useState(false);
  const [draft, setDraft] = useState<Conta>(contaVazia);
  const [erros, setErros] = useState<string[]>([]);

  const codigos = useMemo(() => new Set(contas.map((c) => c.codigo)), [contas]);
  const temFilhas = useMemo(() => new Set(contas.map((c) => codigoPai(c.codigo)).filter(Boolean) as string[]), [contas]);
  // Por padrão mostra até o 3º nível (grupos e subgrupos abertos).
  const abertos = useMemo(
    () => expandidos ?? new Set(contas.filter((c) => nivelDaConta(c.codigo) <= 2).map((c) => c.codigo)),
    [expandidos, contas],
  );

  const visiveis = useMemo(() => {
    const termo = normalizarBusca(busca);
    if (termo) {
      const achadas = contas.filter((c) => c.codigo.startsWith(termo) || c.reduzido === termo || normalizarBusca(c.descricao).includes(termo));
      const incluir = new Set<string>();
      for (const c of achadas) {
        let cod: string | undefined = c.codigo;
        while (cod) {
          incluir.add(cod);
          cod = codigoPai(cod);
        }
      }
      return contas.filter((c) => incluir.has(c.codigo));
    }
    return contas.filter((c) => {
      let pai = codigoPai(c.codigo);
      while (pai) {
        if (codigos.has(pai) && !abertos.has(pai)) return false;
        pai = codigoPai(pai);
      }
      return true;
    });
  }, [contas, busca, abertos, codigos]);

  const analiticas = contas.filter((c) => c.tipo === "Analítica");
  const semReferencial = analiticas.filter((c) => c.situacao === "Ativa" && !c.referencial).length;

  const alternar = (codigo: string) => {
    const s = new Set(abertos);
    if (s.has(codigo)) s.delete(codigo);
    else s.add(codigo);
    setExpandidos(s);
  };

  const carregarModelo = () => {
    if (contas.length) {
      const faltam = contasDoModelo().filter((c) => !codigos.has(c.codigo)).length;
      if (!faltam) {
        toast.info("Todas as contas do modelo já estão no plano.");
        return;
      }
      if (!window.confirm(`Acrescentar ${faltam} conta(s) do plano modelo que ainda não existem? Nada do que já está cadastrado será alterado.`)) return;
    }
    const n = carregarPlanoModelo();
    toast.success(`${n} conta(s) do plano modelo incluída(s).`, { description: "Revise, renomeie ou inative o que não se aplica às empresas do grupo." });
  };

  const abrirNova = (pai?: Conta) => {
    const s = sugestaoSubconta(pai, contas);
    setDraft({ ...contaVazia(), ...s });
    setErros([]);
    setAberto(true);
  };
  const editar = (c: Conta) => {
    setDraft({ ...c });
    setErros([]);
    setAberto(true);
  };
  const salvar = () => {
    const r = salvarConta(draft);
    if (!r.ok) {
      setErros(r.erros);
      toast.error("A conta não foi salva: confira os avisos no formulário.");
      return;
    }
    toast.success(`Conta ${r.registro.codigo} ${draft.id ? "atualizada" : "criada"}.`);
    const pai = codigoPai(r.registro.codigo);
    if (pai && !abertos.has(pai)) setExpandidos(new Set([...abertos, pai]));
    setAberto(false);
  };
  const excluir = (c: Conta) => {
    const motivo = impedimentoExclusaoConta(c, contas);
    if (motivo) {
      toast.error(motivo);
      return;
    }
    if (!confirmarExclusao(`a conta ${c.codigo} — ${c.descricao}`)) return;
    const erro = excluirConta(c.id);
    if (erro) toast.error(erro);
    else toast.success("Conta excluída.");
  };

  const linhasExportacao = contas.map((c) => ({
    ...c, nivel: nivelDaConta(c.codigo), codNat: naturezaEcd(c.grupo),
  })) as unknown as Record<string, string>[];

  return (
    <div className="space-y-6 pb-16">
      <CabecalhoPagina
        trilha={[{ rotulo: "Contábil", para: "/contabil" }, { rotulo: "Cadastros", para: "/contabil/cadastros" }]}
        icone={ListTree}
        titulo="Plano de contas"
        descricao="Plano único do grupo: todas as empresas lançam nas mesmas contas. Só contas analíticas recebem lançamentos."
        acoes={
          <>
            <Button variant="outline" className="rounded-full" onClick={carregarModelo}>
              <Sparkles className="mr-2 h-4 w-4" /> {contas.length ? "Completar com o modelo" : "Carregar plano modelo"}
            </Button>
            <BotaoImportarPlanoContas />
            <ExportarMenu nome="Plano de contas" colunas={COLUNAS_EXPORTACAO} linhas={linhasExportacao} />
            <Button className="rounded-full" onClick={() => abrirNova()}>
              <Plus className="mr-2 h-4 w-4" /> Nova conta
            </Button>
          </>
        }
      />

      <Kpis
        itens={[
          { rotulo: "Contas", valor: String(contas.length) },
          { rotulo: "Analíticas", valor: String(analiticas.length), dica: "Recebem lançamentos" },
          { rotulo: "Sintéticas", valor: String(contas.length - analiticas.length), dica: "Somam as subcontas" },
          { rotulo: "Sem referencial RFB", valor: String(semReferencial), dica: semReferencial ? "Informe antes de gerar a ECD" : "Pronto para a ECD" },
        ]}
      />

      {contas.length === 0 ? (
        <Card className="rounded-xl shadow-card">
          <CardContent className="space-y-4 p-8 text-center">
            <ListTree className="mx-auto h-10 w-10 text-brand-orange" />
            <div>
              <h2 className="font-display text-2xl">O plano de contas está vazio</h2>
              <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
                Comece pelo plano modelo (Lei 6.404/76, com ativo, passivo, patrimônio líquido, receitas, custos, despesas e apuração
                do resultado — já com contas de IBS e CBS) e ajuste ao grupo. Ou crie as contas do zero.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button className="rounded-full" onClick={carregarModelo}>
                <Sparkles className="mr-2 h-4 w-4" /> Carregar plano modelo ({contasDoModelo().length} contas)
              </Button>
              <Button variant="outline" className="rounded-full" onClick={() => abrirNova()}>Criar do zero</Button>
              <BotaoImportarPlanoContas />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-xl shadow-card">
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input aria-label="Buscar conta" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por código, reduzido ou nome…" className="rounded-full pl-9" />
              </div>
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setExpandidos(new Set(temFilhas))}>
                <ChevronsUpDown className="mr-1.5 h-4 w-4" /> Expandir tudo
              </Button>
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setExpandidos(new Set())}>
                <ChevronsDownUp className="mr-1.5 h-4 w-4" /> Recolher
              </Button>
              <Badge variant="secondary" className="rounded-full">{visiveis.length} de {contas.length}</Badge>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Conta</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Natureza</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead className="text-right">Reduzido</TableHead>
                    <TableHead>Referencial</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visiveis.map((c) => {
                    const nivel = nivelDaConta(c.codigo);
                    const sintetica = c.tipo === "Sintética";
                    const expansivel = temFilhas.has(c.codigo);
                    const aberta = abertos.has(c.codigo) || !!busca.trim();
                    return (
                      <TableRow key={c.id} className={cn(c.situacao === "Inativa" && "opacity-60")}>
                        <TableCell className="min-w-[340px]">
                          <div className="flex items-center gap-1.5" style={{ paddingLeft: `${(nivel - 1) * 18}px` }}>
                            {expansivel ? (
                              <button
                                type="button"
                                aria-label={`${aberta ? "Recolher" : "Expandir"} ${c.codigo}`}
                                aria-expanded={aberta}
                                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                onClick={() => alternar(c.codigo)}
                              >
                                {aberta ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              </button>
                            ) : (
                              <span className="w-[18px]" />
                            )}
                            <span className="font-mono text-xs text-muted-foreground">{c.codigo}</span>
                            <span className={cn("truncate", sintetica ? "font-semibold" : "")}>{c.descricao}</span>
                            {c.situacao === "Inativa" ? <Badge variant="outline" className="rounded-full text-[10px]">inativa</Badge> : null}
                            {c.exigeCentroCusto ? <Badge variant="outline" className="rounded-full text-[10px]">exige C.C.</Badge> : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{c.tipo}</TableCell>
                        <TableCell className="text-xs">{c.natureza}</TableCell>
                        <TableCell className="text-xs">{c.grupo}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{c.reduzido ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{c.referencial ?? (sintetica ? "" : "—")}</TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          {sintetica ? (
                            <Button variant="ghost" size="icon" className="rounded-full" aria-label={`Nova subconta de ${c.codigo}`} title="Nova subconta" onClick={() => abrirNova(c)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          ) : null}
                          <Button variant="ghost" size="icon" className="rounded-full" aria-label={`Editar conta ${c.codigo}`} onClick={() => editar(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="rounded-full" aria-label={`Excluir conta ${c.codigo}`} onClick={() => excluir(c)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? `Editar conta ${draft.codigo}` : "Nova conta"}</DialogTitle>
            <DialogDescription>
              O código define a posição no plano: a conta superior ({codigoPai(draft.codigo.trim()) ?? "nenhuma — conta de 1º nível"}) precisa existir e ser sintética.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-6">
            <CampoTexto rotulo="Código" valor={draft.codigo} onChange={(v) => setDraft((d) => ({ ...d, codigo: v }))} obrigatorio mono placeholder="1.1.01.001" />
            <CampoTexto rotulo="Descrição" valor={draft.descricao} onChange={(v) => setDraft((d) => ({ ...d, descricao: v }))} obrigatorio span={4} />
            <CampoSelecao
              rotulo="Tipo"
              valor={draft.tipo}
              opcoes={["Sintética", "Analítica"] as const}
              onChange={(v) => setDraft((d) => ({ ...d, tipo: v }))}
              ajuda="Analítica recebe lançamentos; sintética só soma as subcontas."
            />
            <CampoSelecao
              rotulo="Grupo"
              valor={draft.grupo}
              opcoes={GRUPOS_CONTA}
              onChange={(v) => setDraft((d) => ({ ...d, grupo: v, natureza: d.id ? d.natureza : naturezaPadrao(v) }))}
            />
            <CampoSelecao
              rotulo="Natureza"
              valor={draft.natureza}
              opcoes={["Devedora", "Credora"] as const}
              onChange={(v) => setDraft((d) => ({ ...d, natureza: v }))}
              ajuda="Contas redutoras, marcadas com (-), têm natureza oposta ao grupo."
            />
            {draft.tipo === "Analítica" ? (
              <CampoTexto rotulo="Código reduzido" valor={draft.reduzido} onChange={(v) => setDraft((d) => ({ ...d, reduzido: v }))} mono ajuda="Em branco: o próximo número livre." />
            ) : null}
            <CampoTexto
              rotulo="Conta referencial (RFB)"
              valor={draft.referencial}
              onChange={(v) => setDraft((d) => ({ ...d, referencial: v }))}
              mono
              span={draft.tipo === "Analítica" ? 2 : 4}
              ajuda="Plano referencial da ECD (registro I051), conforme a forma de tributação."
            />
            <CampoSelecao rotulo="Situação" valor={draft.situacao} opcoes={["Ativa", "Inativa"] as const} onChange={(v) => setDraft((d) => ({ ...d, situacao: v }))} />
            {draft.tipo === "Analítica" ? (
              <Campo rotulo="Controles" span={6}>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    aria-label="Exige centro de custo"
                    checked={draft.exigeCentroCusto}
                    onCheckedChange={(v) => setDraft((d) => ({ ...d, exigeCentroCusto: v === true }))}
                  />
                  Exige centro de custo nos lançamentos
                </label>
              </Campo>
            ) : null}
            <CampoAreaTexto rotulo="Observação" valor={draft.observacao} onChange={(v) => setDraft((d) => ({ ...d, observacao: v }))} />
            {draft.id ? (
              <p className="text-xs text-muted-foreground sm:col-span-6">
                Lançamentos nesta conta: {lancamentosDaConta(draft.id)}. Origem: {draft.origem}.
              </p>
            ) : null}
          </div>
          <ListaErros erros={erros} />
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button className="rounded-full" onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
