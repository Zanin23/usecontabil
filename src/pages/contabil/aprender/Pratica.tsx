import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FlaskConical, RotateCcw, ShieldAlert, Sparkles } from "lucide-react";
import {
  Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch, Tabs, TabsContent,
  TabsList, TabsTrigger,
} from "@/design-system/mj-design-system-db98fa";
import AssistenteCampos from "@/components/contabil/AssistenteCampos";
import {
  FCP_SUGERIDO, LABS, UFS_LAB, simularDifal, simularPisCofins, simularRetencoes, simularSimples,
  type EntradaDifal, type EntradaPisCofins, type EntradaRetencoes, type EntradaSimples, type LabId,
  type Passo,
} from "@/lib/aprendizado/labs";
import { usePratica } from "@/lib/praticaStore";

const PADRAO_SIMPLES: EntradaSimples = {
  rbt12: 1_200_000,
  receitaComercio: 90_000,
  receitaServicos: 30_000,
  folha12: 340_000,
};

const PADRAO_DIFAL: EntradaDifal = {
  origem: "SP",
  destino: "BA",
  valor: 10_000,
  origemProduto: "0",
  fcp: FCP_SUGERIDO,
};

const PADRAO_PIS: EntradaPisCofins = {
  regime: "cumulativo",
  receita: 250_000,
  receitaExportacao: 0,
  receitaST: 20_000,
  comprasComCredito: 90_000,
  energiaAlugueis: 12_000,
};

const PADRAO_RETENCOES: EntradaRetencoes = {
  valorServico: 15_000,
  cessaoMaoObra: false,
  optanteSimples: false,
  issRetido: true,
  aliqIss: 3,
};

const ROTULOS: Record<LabId, string> = {
  simples: "Simples Nacional",
  "icms-difal": "ICMS / DIFAL",
  "pis-cofins": "PIS / COFINS",
  retencoes: "Retenções",
};

function Resultado({ passos, formula }: { passos: Passo[]; formula: string }) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border">
        {passos.map((p, i) => (
          <div
            key={p.label}
            className={`flex items-center justify-between gap-4 px-4 py-2 text-sm ${
              i > 0 ? "border-t border-border" : ""
            } ${p.destaque ? "bg-muted font-medium" : ""}`}
          >
            <span className="text-muted-foreground">{p.label}</span>
            <span className={p.destaque ? "text-brand-orange" : ""}>{p.valor}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Fórmula aplicada: {formula}</p>
    </div>
  );
}

function CampoNumero({
  label, value, onChange, sufixo,
}: { label: string; value: number; onChange: (v: number) => void; sufixo?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {sufixo && <span className="text-xs text-muted-foreground">{sufixo}</span>}
      </div>
    </div>
  );
}

export default function PraticaAprendizado() {
  const [params, setParams] = useSearchParams();
  const { praticaAtiva, setPraticaAtiva } = usePratica();
  const labParam = params.get("lab") as LabId | null;
  const labInicial: LabId = LABS.some((l) => l.id === labParam) ? (labParam as LabId) : "simples";
  const [aba, setAba] = useState(labInicial);
  const [simples, setSimples] = useState(PADRAO_SIMPLES);
  const [difal, setDifal] = useState(PADRAO_DIFAL);
  const [pis, setPis] = useState(PADRAO_PIS);
  const [ret, setRet] = useState(PADRAO_RETENCOES);

  useEffect(() => {
    if (!praticaAtiva) setPraticaAtiva(true);
    // ativa o modo prática ao entrar no laboratório
  }, [praticaAtiva]);

  const resSimples = useMemo(() => simularSimples(simples), [simples]);
  const resDifal = useMemo(() => simularDifal(difal), [difal]);
  const resPis = useMemo(() => simularPisCofins(pis), [pis]);
  const resRet = useMemo(() => simularRetencoes(ret), [ret]);

  const trocarAba = (v: string) => {
    setAba(v as LabId);
    setParams({ lab: v }, { replace: true });
  };

  const rs = (n: number) =>
    "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Link to="/aprender" className="text-xs text-muted-foreground hover:text-foreground">
          ← Central de Aprendizado
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-4xl">
            Modo <span className="text-brand-orange">prática.</span>
          </h1>
          <Badge className="rounded-full bg-brand-orange text-primary-foreground">
            <FlaskConical className="mr-1 h-3 w-3" /> Sandbox
          </Badge>
        </div>
        <p className="max-w-3xl text-muted-foreground">
          Os laboratórios chamam as mesmas tabelas e funções dos motores de apuração do sistema, mas
          com valores fictícios digitados por você. Nada aqui grava na competência nem altera dados
          das empresas.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-brand-orange/40 bg-brand-orange/10 p-4">
        <div className="flex items-start gap-2 text-sm">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
          <span>
            Você está em <strong>modo prática</strong>. Os resultados são simulações internas de
            estudo — sem conexão com Receita Federal, SEFAZ ou prefeituras.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Modo prática</Label>
          <Switch checked={praticaAtiva} onCheckedChange={setPraticaAtiva} />
        </div>
      </div>

      <Tabs value={aba} onValueChange={trocarAba}>
        <TabsList className="rounded-full flex-wrap h-auto">
          {LABS.map((l) => (
            <TabsTrigger key={l.id} value={l.id} className="rounded-full">
              {ROTULOS[l.id]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="simples" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-3xl shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-xl">{LABS[0].titulo}</CardTitle>
                <CardDescription>{LABS[0].descricao}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <CampoNumero
                  label="RBT12 — receita bruta dos 12 meses anteriores"
                  value={simples.rbt12}
                  onChange={(v) => setSimples({ ...simples, rbt12: v })}
                />
                <CampoNumero
                  label="Folha dos 12 meses (com encargos e pró-labore)"
                  value={simples.folha12}
                  onChange={(v) => setSimples({ ...simples, folha12: v })}
                />
                <CampoNumero
                  label="Receita do mês — comércio/indústria (Anexo I)"
                  value={simples.receitaComercio}
                  onChange={(v) => setSimples({ ...simples, receitaComercio: v })}
                />
                <CampoNumero
                  label="Receita do mês — serviços (Anexo III ou V)"
                  value={simples.receitaServicos}
                  onChange={(v) => setSimples({ ...simples, receitaServicos: v })}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-2"
                  onClick={() => setSimples(PADRAO_SIMPLES)}
                >
                  <RotateCcw className="h-4 w-4" /> Restaurar cenário
                </Button>
                <div className="pt-4 border-t border-border/40">
                  <AssistenteCampos
                    titulo="Laboratório Simples Nacional"
                    campos={[
                      { key: "rbt12", label: "RBT12", ajuda: "Receita bruta acumulada nos 12 meses anteriores ao período de apuração. Define a faixa de enquadramento na tabela do Simples." },
                      { key: "folha12", label: "Folha 12 meses", ajuda: "Somatório da folha de pagamento e encargos dos últimos 12 meses. Essencial para o cálculo do Fator R." },
                      { key: "receitaComercio", label: "Receita Comércio", ajuda: "Vendas de mercadorias no mês. Tributadas pelo Anexo I." },
                      { key: "receitaServicos", label: "Receita Serviços", ajuda: "Prestação de serviços no mês. Tributadas pelo Anexo III ou V, dependendo do Fator R." },
                    ]}
                    draft={{
                      rbt12: simples.rbt12.toString(),
                      folha12: simples.folha12.toString(),
                      receitaComercio: simples.receitaComercio.toString(),
                      receitaServicos: simples.receitaServicos.toString()
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-elevated">
              <CardHeader>
                <CardDescription>Memória de cálculo</CardDescription>
                <CardTitle className="font-display text-2xl">{rs(resSimples.total)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Resultado passos={resSimples.passos} formula={resSimples.formula} />
                <div className="rounded-2xl border border-border p-4 text-sm">
                  <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
                    Anexo III × Anexo V sobre a mesma receita de serviços
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Anexo III (Fator R ≥ 28%)</span>
                    <span>{rs(resSimples.comparativo.anexoIII)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-muted-foreground">Anexo V (Fator R &lt; 28%)</span>
                    <span>{rs(resSimples.comparativo.anexoV)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="icms-difal" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-3xl shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-xl">{LABS[1].titulo}</CardTitle>
                <CardDescription>{LABS[1].descricao}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">UF de origem</Label>
                    <Select
                      value={difal.origem}
                      onValueChange={(v) => setDifal({ ...difal, origem: v as EntradaDifal["origem"] })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {UFS_LAB.map((uf) => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">UF de destino</Label>
                    <Select
                      value={difal.destino}
                      onValueChange={(v) => setDifal({ ...difal, destino: v as EntradaDifal["destino"] })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {UFS_LAB.map((uf) => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <CampoNumero
                  label="Valor da operação"
                  value={difal.valor}
                  onChange={(v) => setDifal({ ...difal, valor: v })}
                />
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Origem da mercadoria (CST)</Label>
                  <Select
                    value={difal.origemProduto}
                    onValueChange={(v) => setDifal({ ...difal, origemProduto: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 — Nacional</SelectItem>
                      <SelectItem value="1">1 — Importada direta</SelectItem>
                      <SelectItem value="2">2 — Importada adquirida no mercado interno</SelectItem>
                      <SelectItem value="3">3 — Nacional com conteúdo de importação &gt; 40%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <CampoNumero
                  label="FCP do destino"
                  value={difal.fcp}
                  sufixo="%"
                  onChange={(v) => setDifal({ ...difal, fcp: v })}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-2"
                  onClick={() => setDifal(PADRAO_DIFAL)}
                >
                  <RotateCcw className="h-4 w-4" /> Restaurar cenário
                </Button>
                <div className="pt-4 border-t border-border/40">
                  <AssistenteCampos
                    titulo="Laboratório ICMS / DIFAL"
                    campos={[
                      { key: "origem", label: "UF Origem", ajuda: "Estado de onde a mercadoria está saindo." },
                      { key: "destino", label: "UF Destino", ajuda: "Estado para onde a mercadoria está sendo enviada." },
                      { key: "valor", label: "Valor da operação", ajuda: "Preço total dos produtos na nota fiscal." },
                      { key: "origemProduto", label: "Origem do Produto (CST)", ajuda: "Define se o produto é Nacional ou Importado. Produtos importados têm alíquota interestadual fixa de 4%." },
                      { key: "fcp", label: "FCP", ajuda: "Fundo de Combate à Pobreza. Adicional de ICMS destinado a fundos sociais no estado de destino." },
                    ]}
                    draft={{
                      origem: difal.origem,
                      destino: difal.destino,
                      valor: difal.valor.toString(),
                      fcp: difal.fcp.toString()
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-elevated">
              <CardHeader>
                <CardDescription>Memória de cálculo</CardDescription>
                <CardTitle className="font-display text-2xl">{rs(resDifal.total)}</CardTitle>
              </CardHeader>
              <CardContent>
                <Resultado passos={resDifal.passos} formula={resDifal.formula} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pis-cofins" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-3xl shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-xl">{LABS[2].titulo}</CardTitle>
                <CardDescription>{LABS[2].descricao}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Regime de apuração</Label>
                  <Select
                    value={pis.regime}
                    onValueChange={(v) => setPis({ ...pis, regime: v as EntradaPisCofins["regime"] })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cumulativo">Cumulativo — Lucro Presumido</SelectItem>
                      <SelectItem value="naoCumulativo">Não cumulativo — Lucro Real</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <CampoNumero
                  label="Receita bruta do mês"
                  value={pis.receita}
                  onChange={(v) => setPis({ ...pis, receita: v })}
                />
                <CampoNumero
                  label="Receita de exportação (isenta)"
                  value={pis.receitaExportacao}
                  onChange={(v) => setPis({ ...pis, receitaExportacao: v })}
                />
                <CampoNumero
                  label="Receita monofásica / substituição tributária"
                  value={pis.receitaST}
                  onChange={(v) => setPis({ ...pis, receitaST: v })}
                />
                <CampoNumero
                  label="Compras de insumos com direito a crédito"
                  value={pis.comprasComCredito}
                  onChange={(v) => setPis({ ...pis, comprasComCredito: v })}
                />
                <CampoNumero
                  label="Energia elétrica e aluguéis de PJ"
                  value={pis.energiaAlugueis}
                  onChange={(v) => setPis({ ...pis, energiaAlugueis: v })}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-2"
                  onClick={() => setPis(PADRAO_PIS)}
                >
                  <RotateCcw className="h-4 w-4" /> Restaurar cenário
                </Button>
                <div className="pt-4 border-t border-border/40">
                  <AssistenteCampos
                    titulo="Laboratório PIS/COFINS"
                    campos={[
                      { key: "regime", label: "Regime", ajuda: "Cumulativo (geralmente Lucro Presumido, alíquotas menores sem crédito) ou Não Cumulativo (geralmente Lucro Real, alíquotas maiores com direito a crédito)." },
                      { key: "receita", label: "Receita Bruta", ajuda: "Faturamento total do mês sujeito à contribuição." },
                      { key: "receitaExportacao", label: "Exportação", ajuda: "Receitas de exportação são imunes/isentas de PIS/COFINS." },
                      { key: "receitaST", label: "Monofásico/ST", ajuda: "Produtos onde o imposto já foi recolhido anteriormente na cadeia (bebidas, autopeças, combustíveis, etc)." },
                      { key: "comprasComCredito", label: "Compras com Crédito", ajuda: "No regime não cumulativo, você pode descontar créditos sobre insumos adquiridos." },
                    ]}
                    draft={{
                      regime: pis.regime,
                      receita: pis.receita.toString(),
                      compras: pis.comprasComCredito.toString()
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-elevated">
              <CardHeader>
                <CardDescription>Memória de cálculo</CardDescription>
                <CardTitle className="font-display text-2xl">{rs(resPis.total)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Resultado passos={resPis.passos} formula={resPis.formula} />
                <div className="rounded-2xl border border-border p-4 text-sm">
                  <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
                    Comparativo entre regimes sobre a mesma base
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cumulativo (3,65%)</span>
                    <span>{rs(resPis.comparativo.cumulativo)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-muted-foreground">Não cumulativo (9,25% − créditos)</span>
                    <span>{rs(resPis.comparativo.naoCumulativo)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="retencoes" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-3xl shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-xl">{LABS[3].titulo}</CardTitle>
                <CardDescription>{LABS[3].descricao}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <CampoNumero
                  label="Valor do serviço tomado"
                  value={ret.valorServico}
                  onChange={(v) => setRet({ ...ret, valorServico: v })}
                />
                
                <div className="py-4">
                  <AssistenteCampos
                    titulo="Laboratório de Retenções"
                    campos={[
                      { key: "valorServico", label: "Valor do Serviço", ajuda: "Valor bruto da nota fiscal de serviço." },
                      { key: "optanteSimples", label: "Prestador Simples", ajuda: "Empresas do Simples Nacional não sofrem retenção de IRRF e CSRF na maioria dos serviços." },
                      { key: "cessaoMaoObra", label: "Cessão de Mão de Obra", ajuda: "Caracteriza a retenção de 11% de INSS." },
                      { key: "aliqIss", label: "Alíquota ISS", ajuda: "Percentual do imposto municipal que deve ser retido conforme a legislação da prefeitura do destino." },
                    ]}
                    draft={{
                      valor: ret.valorServico.toString(),
                      simples: ret.optanteSimples ? "Sim" : "Não",
                      maoObra: ret.cessaoMaoObra ? "Sim" : "Não"
                    }}
                  />
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3">
                  <Label className="text-sm">Prestador optante pelo Simples Nacional</Label>
                  <Switch
                    checked={ret.optanteSimples}
                    onCheckedChange={(v) => setRet({ ...ret, optanteSimples: v })}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3">
                  <Label className="text-sm">Cessão de mão de obra (INSS 11%)</Label>
                  <Switch
                    checked={ret.cessaoMaoObra}
                    onCheckedChange={(v) => setRet({ ...ret, cessaoMaoObra: v })}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3">
                  <Label className="text-sm">ISS retido pelo tomador</Label>
                  <Switch
                    checked={ret.issRetido}
                    onCheckedChange={(v) => setRet({ ...ret, issRetido: v })}
                  />
                </div>
                <CampoNumero
                  label="Alíquota de ISS do município"
                  value={ret.aliqIss}
                  sufixo="%"
                  onChange={(v) => setRet({ ...ret, aliqIss: v })}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-2"
                  onClick={() => setRet(PADRAO_RETENCOES)}
                >
                  <RotateCcw className="h-4 w-4" /> Restaurar cenário
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-elevated">
              <CardHeader>
                <CardDescription>Total retido</CardDescription>
                <CardTitle className="font-display text-2xl">{rs(resRet.total)}</CardTitle>
              </CardHeader>
              <CardContent>
                <Resultado passos={resRet.passos} formula={resRet.formula} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
