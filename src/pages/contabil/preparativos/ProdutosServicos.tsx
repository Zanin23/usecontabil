import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  Badge, Button, Card, CardContent, Checkbox, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow, Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/design-system/mj-design-system-db98fa";
import CabecalhoPagina from "@/components/contabil/cadastros/CabecalhoPagina";
import Kpis from "@/components/contabil/cadastros/Kpis";
import ListaErros from "@/components/contabil/cadastros/ListaErros";
import ImportarCadastrosAntigos from "@/components/contabil/cadastros/ImportarCadastrosAntigos";
import { Campo, CampoAreaTexto, CampoNumero, CampoSelecao, CampoTexto } from "@/components/contabil/cadastros/Campos";
import { SeletorConta } from "@/components/contabil/cadastros/SeletorBusca";
import { normalizarBusca } from "@/lib/busca";
import ExportarMenu from "@/components/contabil/ExportarMenu";
import {
  excluirProduto, ORIGENS_MERCADORIA, produtoVazio, rotuloTipoItem, salvarProduto, TIPOS_ITEM, UNIDADES, useProdutos,
  validarProduto, type Produto, type TipoProduto,
} from "@/lib/cadastrosStore";
import { contaPorId, contasAnaliticasAtivas, rotuloConta, useContas } from "@/lib/planoContasStore";
import { confirmarExclusao } from "@/lib/confirmar";

type FiltroTipo = "todos" | "Produto" | "Serviço";
type FiltroSituacao = "Ativo" | "Inativo" | "todas";

/** Aba do formulário onde está o campo do erro (para levar a pessoa direto até ele). */
function abaDoErro(erro = "") {
  if (/CFOP|ICMS|IPI|PIS|COFINS/.test(erro) && !/ISS/.test(erro)) return "tributacao";
  if (/IBS|cClassTrib/.test(erro)) return "reforma";
  return "identificacao";
}

const brl = (v?: number) => (v === undefined ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));

const COLUNAS_EXPORTACAO = [
  { key: "codigo", label: "Código" }, { key: "descricao", label: "Descrição" }, { key: "tipo", label: "Tipo" },
  { key: "tipoItem", label: "Tipo do item (EFD)" }, { key: "unidade", label: "Unidade" }, { key: "ncm", label: "NCM" },
  { key: "cest", label: "CEST" }, { key: "gtin", label: "GTIN" }, { key: "itemLc116", label: "Item LC 116" },
  { key: "cfopSaida", label: "CFOP saída" }, { key: "cfopEntrada", label: "CFOP entrada" }, { key: "cstIcms", label: "CST/CSOSN" },
  { key: "cstIbsCbs", label: "CST IBS/CBS" }, { key: "cClassTrib", label: "cClassTrib" }, { key: "contaReceita", label: "Conta de receita" },
  { key: "precoPadrao", label: "Preço padrão" }, { key: "situacao", label: "Situação" }, { key: "origem", label: "Origem" },
];

export default function ProdutosServicos() {
  const produtos = useProdutos();
  const contas = useContas();
  const analiticas = useMemo(() => contasAnaliticasAtivas(contas), [contas]);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<FiltroTipo>("todos");
  const [situacao, setSituacao] = useState<FiltroSituacao>("Ativo");
  const [soPendencias, setSoPendencias] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [draft, setDraft] = useState<Produto>(() => produtoVazio("Produto", []));
  const [erros, setErros] = useState<string[]>([]);
  const [aba, setAba] = useState("identificacao");

  const pendencias = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const p of produtos) {
      const e = validarProduto(p, produtos);
      if (e.length) m.set(p.id, e);
    }
    return m;
  }, [produtos]);

  const filtrados = useMemo(() => {
    const termo = normalizarBusca(busca);
    return produtos.filter((p) => {
      if (situacao !== "todas" && p.situacao !== situacao) return false;
      if (tipo !== "todos" && p.tipo !== tipo) return false;
      if (soPendencias && !pendencias.has(p.id)) return false;
      return !termo || normalizarBusca(`${p.codigo} ${p.descricao} ${p.ncm ?? ""} ${p.itemLc116 ?? ""} ${p.gtin ?? ""}`).includes(termo);
    });
  }, [produtos, busca, tipo, situacao, soPendencias, pendencias]);

  const ativos = produtos.filter((p) => p.situacao === "Ativo");
  const servico = draft.tipo === "Serviço";
  const set = <K extends keyof Produto>(k: K, v: Produto[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const novo = (t: TipoProduto = "Produto") => {
    setDraft(produtoVazio(t, produtos));
    setErros([]);
    setAba("identificacao");
    setAberto(true);
  };
  const editar = (p: Produto) => {
    setDraft({ ...p });
    setErros([]);
    setAba("identificacao");
    setAberto(true);
  };
  const trocarTipo = (t: TipoProduto) =>
    setDraft((d) => ({
      ...d,
      tipo: t,
      tipoItem: t === "Serviço" ? "09" : d.tipoItem === "09" ? "00" : d.tipoItem,
      unidade: t === "Serviço" && d.unidade === "UN" ? "SV" : t === "Produto" && d.unidade === "SV" ? "UN" : d.unidade,
    }));
  const salvar = () => {
    const r = salvarProduto(draft);
    if (!r.ok) {
      setErros(r.erros);
      setAba(abaDoErro(r.erros[0]));
      toast.error("O item não foi salvo: confira os avisos no formulário.");
      return;
    }
    toast.success(`${r.registro.descricao} ${draft.id ? "atualizado" : "cadastrado"}.`);
    setAberto(false);
  };
  const excluir = (p: Produto) => {
    if (!confirmarExclusao(`o item ${p.codigo} — ${p.descricao}`)) return;
    excluirProduto(p.id);
    toast.success("Item excluído.");
  };

  const linhasExportacao = filtrados.map((p) => ({
    ...p, contaReceita: p.contaReceitaId ? rotuloConta(contaPorId(p.contaReceitaId)) : "",
  })) as unknown as Record<string, string>[];

  return (
    <div className="space-y-6 pb-16">
      <CabecalhoPagina
        trilha={[{ rotulo: "Preparativos", para: "/preparativos" }, { rotulo: "Cadastros", para: "/preparativos/cadastros" }]}
        icone={Package}
        titulo="Produtos e serviços"
        descricao="Itens com classificação fiscal (NCM, CEST, CFOP, CST, LC 116), campos da reforma tributária (IBS/CBS) e contas contábeis padrão."
        acoes={
          <>
            <ImportarCadastrosAntigos />
            <ExportarMenu nome="Produtos e serviços" colunas={COLUNAS_EXPORTACAO} linhas={linhasExportacao} />
            <Button variant="outline" className="rounded-full" onClick={() => novo("Serviço")}>
              <Plus className="mr-2 h-4 w-4" /> Novo serviço
            </Button>
            <Button className="rounded-full" onClick={() => novo("Produto")}>
              <Plus className="mr-2 h-4 w-4" /> Novo produto
            </Button>
          </>
        }
      />

      <Kpis
        itens={[
          { rotulo: "Itens ativos", valor: String(ativos.length) },
          { rotulo: "Produtos", valor: String(ativos.filter((p) => p.tipo === "Produto").length) },
          { rotulo: "Serviços", valor: String(ativos.filter((p) => p.tipo === "Serviço").length) },
          { rotulo: "Com pendência", valor: String(pendencias.size), dica: pendencias.size ? "Ex.: sem NCM ou CFOP inválido" : "Tudo em ordem" },
        ]}
      />

      <Card className="rounded-3xl border-dashed shadow-none">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Os itens das NF-e <strong className="text-foreground">emitidas</strong> pela empresa entram aqui automaticamente na importação do XML
          (pelo código do item). Itens de notas de fornecedores não são cadastrados, porque o código é do fornecedor.
        </CardContent>
      </Card>

      <Card className="rounded-3xl shadow-card">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Buscar item" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por código, descrição, NCM ou GTIN…" className="rounded-full pl-9" />
            </div>
            <Select value={tipo} onValueChange={(v) => setTipo(v as FiltroTipo)}>
              <SelectTrigger aria-label="Filtrar por tipo" className="w-[150px] rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Produto">Produtos</SelectItem>
                <SelectItem value="Serviço">Serviços</SelectItem>
              </SelectContent>
            </Select>
            <Select value={situacao} onValueChange={(v) => setSituacao(v as FiltroSituacao)}>
              <SelectTrigger aria-label="Filtrar por situação" className="w-[140px] rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativo">Ativos</SelectItem>
                <SelectItem value="Inativo">Inativos</SelectItem>
                <SelectItem value="todas">Todos</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox checked={soPendencias} onCheckedChange={(v) => setSoPendencias(v === true)} aria-label="Só com pendência" />
              Só com pendência
            </label>
            <Badge variant="secondary" className="rounded-full">{filtrados.length} de {produtos.length}</Badge>
          </div>

          {filtrados.length === 0 ? (
            <div className="space-y-3 py-14 text-center">
              <p className="text-sm text-muted-foreground">{produtos.length ? "Nenhum item com esses filtros." : "Nenhum produto ou serviço cadastrado ainda."}</p>
              {!produtos.length ? (
                <Button className="rounded-full" onClick={() => novo("Produto")}><Plus className="mr-2 h-4 w-4" /> Novo produto</Button>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo do item</TableHead>
                    <TableHead>NCM / LC 116</TableHead>
                    <TableHead>Un.</TableHead>
                    <TableHead>CFOP saída</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((p) => {
                    const pend = pendencias.get(p.id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.codigo}</TableCell>
                        <TableCell className="max-w-[300px]">
                          <div className="flex items-center gap-1.5">
                            {pend ? (
                              <span title={pend.join(" ")} aria-label={`Pendência: ${pend.join(" ")}`} className="shrink-0">
                                <AlertTriangle className="h-3.5 w-3.5 text-warn" />
                              </span>
                            ) : null}
                            <span className="truncate font-medium">{p.descricao}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{p.tipo}</div>
                        </TableCell>
                        <TableCell className="text-xs">{rotuloTipoItem(p.tipoItem)}</TableCell>
                        <TableCell className="font-mono text-xs">{p.tipo === "Serviço" ? p.itemLc116 || "—" : p.ncm || "—"}</TableCell>
                        <TableCell className="text-xs">{p.unidade}</TableCell>
                        <TableCell className="font-mono text-xs">{p.cfopSaida || "—"}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{brl(p.precoPadrao)}</TableCell>
                        <TableCell>
                          <Badge variant={p.situacao === "Ativo" ? "secondary" : "outline"} className="rounded-full">{p.situacao}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <Button variant="ghost" size="icon" className="rounded-full" aria-label={`Editar ${p.descricao}`} onClick={() => editar(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="rounded-full" aria-label={`Excluir ${p.descricao}`} onClick={() => excluir(p)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? `Editar ${draft.descricao || "item"}` : servico ? "Novo serviço" : "Novo produto"}</DialogTitle>
            <DialogDescription>Origem: {draft.origem}. Campos com * são obrigatórios.</DialogDescription>
          </DialogHeader>

          <Tabs value={aba} onValueChange={setAba}>
            <TabsList className="flex-wrap">
              <TabsTrigger value="identificacao">Identificação</TabsTrigger>
              <TabsTrigger value="tributacao">Tributação</TabsTrigger>
              <TabsTrigger value="reforma">IBS/CBS</TabsTrigger>
              <TabsTrigger value="contabil">Contábil</TabsTrigger>
            </TabsList>

            <TabsContent value="identificacao" className="mt-4">
              <div className="grid gap-3 sm:grid-cols-6">
                <CampoSelecao rotulo="Tipo" valor={draft.tipo} opcoes={["Produto", "Serviço"] as const} onChange={trocarTipo} obrigatorio />
                <CampoTexto rotulo="Código" valor={draft.codigo} onChange={(v) => set("codigo", v)} obrigatorio mono />
                <CampoSelecao rotulo="Situação" valor={draft.situacao} opcoes={["Ativo", "Inativo"] as const} onChange={(v) => set("situacao", v)} />
                <CampoTexto rotulo="Descrição" valor={draft.descricao} onChange={(v) => set("descricao", v)} obrigatorio span={6} />
                <CampoSelecao
                  rotulo="Tipo do item (EFD 0200)"
                  valor={draft.tipoItem}
                  opcoes={(servico ? ["09"] : TIPOS_ITEM.filter((t) => t.codigo !== "09").map((t) => t.codigo)) as readonly string[]}
                  rotuloOpcao={rotuloTipoItem}
                  onChange={(v) => set("tipoItem", v)}
                  obrigatorio
                  span={3}
                  ajuda="Define o tratamento no SPED e na contabilização (revenda, insumo, uso e consumo, imobilizado)."
                />
                <CampoSelecao rotulo="Unidade" valor={draft.unidade} opcoes={UNIDADES as readonly string[]} onChange={(v) => set("unidade", v)} obrigatorio span={1} />
                <CampoNumero rotulo="Preço padrão" sufixo="R$" valor={draft.precoPadrao} onChange={(v) => set("precoPadrao", v)} span={2} casasDecimais={2} />
                {servico ? (
                  <>
                    <CampoTexto rotulo="Item da LC 116" valor={draft.itemLc116} onChange={(v) => set("itemLc116", v)} mono placeholder="17.01" ajuda="Lista de serviços da LC 116/2003." />
                    <CampoTexto rotulo="Código NBS" valor={draft.nbs} onChange={(v) => set("nbs", v)} mono placeholder="9 dígitos" />
                    <CampoNumero rotulo="Alíquota de ISS" sufixo="%" valor={draft.aliqIss} onChange={(v) => set("aliqIss", v)} />
                  </>
                ) : (
                  <>
                    <CampoTexto rotulo="NCM" valor={draft.ncm} onChange={(v) => set("ncm", v)} obrigatorio mono placeholder="8 dígitos" />
                    <CampoTexto rotulo="CEST" valor={draft.cest} onChange={(v) => set("cest", v)} mono placeholder="7 dígitos" ajuda="Obrigatório para itens sujeitos a ST." />
                    <CampoTexto rotulo="GTIN / EAN" valor={draft.gtin} onChange={(v) => set("gtin", v)} mono />
                    <CampoSelecao
                      rotulo="Origem da mercadoria"
                      valor={draft.origemMercadoria}
                      opcoes={ORIGENS_MERCADORIA.map((o) => o.codigo)}
                      rotuloOpcao={(c) => `${c} · ${ORIGENS_MERCADORIA.find((o) => o.codigo === c)?.descricao ?? ""}`}
                      onChange={(v) => set("origemMercadoria", v)}
                      span={6}
                    />
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="tributacao" className="mt-4">
              <div className="grid gap-3 sm:grid-cols-6">
                <CampoTexto rotulo="CFOP de saída padrão" valor={draft.cfopSaida} onChange={(v) => set("cfopSaida", v)} mono placeholder="5102" />
                <CampoTexto rotulo="CFOP de entrada padrão" valor={draft.cfopEntrada} onChange={(v) => set("cfopEntrada", v)} mono placeholder="1102" />
                <CampoTexto rotulo="CST ICMS / CSOSN" valor={draft.cstIcms} onChange={(v) => set("cstIcms", v)} mono />
                <CampoNumero rotulo="Alíquota ICMS" sufixo="%" valor={draft.aliqIcms} onChange={(v) => set("aliqIcms", v)} />
                <CampoTexto rotulo="CST IPI" valor={draft.cstIpi} onChange={(v) => set("cstIpi", v)} mono />
                <CampoNumero rotulo="Alíquota IPI" sufixo="%" valor={draft.aliqIpi} onChange={(v) => set("aliqIpi", v)} />
                <CampoTexto rotulo="CST PIS" valor={draft.cstPis} onChange={(v) => set("cstPis", v)} mono />
                <CampoNumero rotulo="Alíquota PIS" sufixo="%" valor={draft.aliqPis} onChange={(v) => set("aliqPis", v)} />
                <CampoTexto rotulo="CST COFINS" valor={draft.cstCofins} onChange={(v) => set("cstCofins", v)} mono />
                <CampoNumero rotulo="Alíquota COFINS" sufixo="%" valor={draft.aliqCofins} onChange={(v) => set("aliqCofins", v)} />
              </div>
            </TabsContent>

            <TabsContent value="reforma" className="mt-4">
              <div className="grid gap-3 sm:grid-cols-6">
                <CampoTexto rotulo="CST do IBS/CBS" valor={draft.cstIbsCbs} onChange={(v) => set("cstIbsCbs", v)} mono placeholder="3 dígitos" span={3} />
                <CampoTexto rotulo="Classificação tributária (cClassTrib)" valor={draft.cClassTrib} onChange={(v) => set("cClassTrib", v)} mono placeholder="6 dígitos" span={3} />
                <p className="text-xs text-muted-foreground sm:col-span-6">
                  Desde 03/08/2026 as NF-e e NFC-e de empresas do regime regular precisam dos campos de IBS e CBS por item (NT 2025.002).
                  Em 2026 as alíquotas são de teste (CBS 0,9% e IBS 0,1%).
                </p>
              </div>
            </TabsContent>

            <TabsContent value="contabil" className="mt-4">
              <div className="grid gap-3 sm:grid-cols-6">
                <Campo rotulo="Conta de receita" span={3} ajuda="Ex.: 3.1.01.001 Venda de mercadorias.">
                  <SeletorConta contas={analiticas} valor={draft.contaReceitaId} onChange={(id) => set("contaReceitaId", id)} ariaLabel="Conta de receita" />
                </Campo>
                <Campo rotulo={servico ? "Conta de custo (CSP)" : "Conta de custo (CMV/CPV)"} span={3}>
                  <SeletorConta contas={analiticas} valor={draft.contaCustoId} onChange={(id) => set("contaCustoId", id)} ariaLabel="Conta de custo" />
                </Campo>
                {!servico ? (
                  <Campo rotulo="Conta de estoque" span={3} ajuda="Ex.: 1.1.04.001 Mercadorias para revenda.">
                    <SeletorConta contas={analiticas} valor={draft.contaEstoqueId} onChange={(id) => set("contaEstoqueId", id)} ariaLabel="Conta de estoque" />
                  </Campo>
                ) : null}
                <Campo rotulo="Conta de despesa (uso e consumo)" span={3}>
                  <SeletorConta contas={analiticas} valor={draft.contaDespesaId} onChange={(id) => set("contaDespesaId", id)} ariaLabel="Conta de despesa" />
                </Campo>
                <CampoAreaTexto rotulo="Observações" valor={draft.observacoes} onChange={(v) => set("observacoes", v)} />
              </div>
            </TabsContent>
          </Tabs>

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
