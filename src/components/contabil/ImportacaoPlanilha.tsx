/**
 * Importação por planilha (CSV ou Excel .xlsx) dos dados de abertura da contabilidade.
 *
 * - Plano de contas: botão "Importar planilha" na tela do plano de contas.
 * - Balancete de abertura: botão "Importar abertura" na tela dos lançamentos — o resultado é um
 *   lançamento do tipo "Abertura" (uma partida por conta).
 *
 * A leitura e as regras ficam em `src/lib/importacaoContabil.ts`; aqui fica só a conferência na tela
 * (prévia, totais e problemas linha a linha), sempre antes de gravar.
 */
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import {
  Badge, Button, Checkbox, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  Input, Label, Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import { exportar } from "@/lib/adminStore";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import { moeda, useLancamentos } from "@/lib/lancamentosStore";
import { listarContas } from "@/lib/planoContasStore";
import { lerConteudoDoArquivo, lerPlanilha, type Planilha } from "@/lib/planilha";
import {
  aberturasExistentes, importarBalanceteAbertura, importarPlanoDeContas, lerBalanceteAbertura, lerPlanoDeContas,
  type LeituraBalancete, type LeituraPlanoContas, type ProblemaImportacao,
} from "@/lib/importacaoContabil";

const LIMITE_PREVIA = 8;

function baixarModelo(nome: string, colunas: { key: string; label: string }[], linhas: Record<string, string>[]) {
  exportar("csv", nome, colunas, linhas);
  toast.success("Modelo CSV gerado", { description: "Abra no Excel, preencha e salve como .xlsx ou .csv." });
}

function ListaProblemas({ problemas }: { problemas: ProblemaImportacao[] }) {
  if (!problemas.length) return null;
  return (
    <div className="max-h-40 space-y-1 overflow-y-auto rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-xs">
      <div className="font-medium text-destructive">{problemas.length} problema(s) encontrado(s):</div>
      {problemas.map((p, i) => (
        <div key={`${p.linha}-${i}`} className="text-destructive/90">
          Linha {p.linha}: {p.mensagem}
        </div>
      ))}
    </div>
  );
}

function EscolhaArquivo({
  id, arquivo, aoEscolher,
}: {
  id: string;
  arquivo: string | null;
  aoEscolher: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs">Planilha (.csv, .txt ou .xlsx) *</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Input ref={ref} id={id} type="file" accept=".csv,.txt,.tsv,.xlsx,.xlsm" onChange={aoEscolher} className="max-w-sm" />
        {arquivo ? <Badge variant="secondary" className="rounded-full">{arquivo}</Badge> : null}
      </div>
      <p className="text-xs text-muted-foreground">
        No Excel antigo (.xls) use "Salvar como" → .xlsx ou .csv. A leitura é feita no seu navegador: nenhum arquivo é enviado para fora.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Plano de contas                                                     */
/* ------------------------------------------------------------------ */

const COLUNAS_MODELO_PLANO = [
  { key: "codigo", label: "Código" },
  { key: "descricao", label: "Descrição" },
  { key: "tipo", label: "Tipo" },
  { key: "natureza", label: "Natureza" },
  { key: "grupo", label: "Grupo" },
  { key: "reduzido", label: "Reduzido" },
  { key: "referencial", label: "Referencial RFB" },
  { key: "exigeCentroCusto", label: "Exige centro de custo" },
  { key: "situacao", label: "Situação" },
];

// A planilha modelo traz a hierarquia completa (sintéticas antes das analíticas). Faltando alguma
// superior, a importação cria a conta como sintética e avisa quantas foram criadas.
const MODELO_PLANO = [
  { codigo: "1", descricao: "ATIVO", tipo: "Sintética", natureza: "Devedora", grupo: "Ativo", reduzido: "", referencial: "1", exigeCentroCusto: "", situacao: "Ativa" },
  { codigo: "1.1", descricao: "ATIVO CIRCULANTE", tipo: "Sintética", natureza: "Devedora", grupo: "Ativo", reduzido: "", referencial: "1.01", exigeCentroCusto: "", situacao: "Ativa" },
  { codigo: "1.1.01", descricao: "Disponível", tipo: "Sintética", natureza: "Devedora", grupo: "Ativo", reduzido: "", referencial: "1.01.01", exigeCentroCusto: "", situacao: "Ativa" },
  { codigo: "1.1.01.001", descricao: "Caixa", tipo: "Analítica", natureza: "Devedora", grupo: "Ativo", reduzido: "1", referencial: "1.01.01.01", exigeCentroCusto: "Não", situacao: "Ativa" },
  { codigo: "3", descricao: "RECEITAS", tipo: "Sintética", natureza: "Credora", grupo: "Receitas", reduzido: "", referencial: "3", exigeCentroCusto: "", situacao: "Ativa" },
  { codigo: "3.1", descricao: "RECEITAS OPERACIONAIS", tipo: "Sintética", natureza: "Credora", grupo: "Receitas", reduzido: "", referencial: "3.1", exigeCentroCusto: "", situacao: "Ativa" },
  { codigo: "3.1.01", descricao: "VENDAS DE MERCADORIAS", tipo: "Sintética", natureza: "Credora", grupo: "Receitas", reduzido: "", referencial: "3.1.01", exigeCentroCusto: "", situacao: "Ativa" },
  { codigo: "3.1.01.001", descricao: "Receita de vendas", tipo: "Analítica", natureza: "Credora", grupo: "Receitas", reduzido: "2", referencial: "3.1.01.01", exigeCentroCusto: "Não", situacao: "Ativa" },
];

export function BotaoImportarPlanoContas() {
  const [aberto, setAberto] = useState(false);
  const [planilha, setPlanilha] = useState<Planilha | null>(null);
  const [leitura, setLeitura] = useState<LeituraPlanoContas | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizar, setAtualizar] = useState(true);
  const [resultado, setResultado] = useState<{
    criadas: number; atualizadas: number; ignoradas: number; superiores: number; erros: ProblemaImportacao[];
  } | null>(null);

  // Lido a cada render: a lista muda quando a importação grava (o diálogo continua aberto).
  const codigosAtuais = new Set(listarContas().map((c) => c.codigo));

  const limpar = () => {
    setPlanilha(null);
    setLeitura(null);
    setErro(null);
    setResultado(null);
  };

  const selecionar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    limpar();
    try {
      const lida = await lerPlanilha(file.name, await lerConteudoDoArquivo(file));
      setPlanilha(lida);
      setLeitura(lerPlanoDeContas(lida.linhas));
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    }
  };

  const importar = () => {
    if (!leitura) return;
    const r = importarPlanoDeContas(leitura.contas, { atualizarExistentes: atualizar });
    setResultado(r);
    if (r.criadas + r.atualizadas > 0) {
      toast.success(`${r.criadas} conta(s) criada(s) e ${r.atualizadas} atualizada(s).`, {
        description: r.erros.length ? `${r.erros.length} linha(s) não foram gravadas — veja os problemas na tela.` : "Confira o plano na lista.",
      });
    } else {
      toast.error("Nenhuma conta foi gravada — veja os problemas na tela.");
    }
  };

  const novas = leitura ? leitura.contas.filter((c) => !codigosAtuais.has(c.codigo)).length : 0;
  const existentes = leitura ? leitura.contas.length - novas : 0;

  return (
    <>
      <Button variant="outline" className="rounded-full" onClick={() => { limpar(); setAberto(true); }}>
        <Upload className="mr-2 h-4 w-4" /> Importar planilha
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar plano de contas</DialogTitle>
            <DialogDescription>
              Planilha com uma conta por linha. Colunas reconhecidas: Código, Descrição (obrigatórias), Tipo, Natureza, Grupo, Reduzido,
              Referencial RFB, Exige centro de custo e Situação. As contas entram pela ordem do código — inclua uma linha para cada conta
              superior sintética (ex.: 1.1.01 antes de 1.1.01.001), senão a subconta é recusada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => baixarModelo("modelo-plano-de-contas", COLUNAS_MODELO_PLANO, MODELO_PLANO)}>
                <Download className="mr-1.5 h-4 w-4" /> Baixar modelo CSV
              </Button>
              <span className="text-xs text-muted-foreground">A planilha pode estar em Excel (.xlsx) ou CSV, com ; ou , como separador.</span>
            </div>

            <EscolhaArquivo id="arquivo-plano-contas" arquivo={planilha?.arquivo ?? null} aoEscolher={selecionar} />

            {erro ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{erro}</div>
            ) : null}

            {leitura ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="secondary" className="rounded-full"><FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> {planilha?.aba}</Badge>
                  <Badge variant="secondary" className="rounded-full">{leitura.contas.length} conta(s) na planilha</Badge>
                  <Badge variant="secondary" className="rounded-full">{novas} nova(s)</Badge>
                  {existentes ? <Badge variant="secondary" className="rounded-full">{existentes} já cadastrada(s)</Badge> : null}
                  {leitura.linhasIgnoradas ? <Badge variant="secondary" className="rounded-full">{leitura.linhasIgnoradas} linha(s) sem valores</Badge> : null}
                  <Badge variant="secondary" className="rounded-full">Cabeçalho na linha {leitura.cabecalho}</Badge>
                </div>

                <ListaProblemas problemas={leitura.erros} />

                {leitura.contas.length ? (
                  <div className="overflow-x-auto rounded-2xl border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Natureza</TableHead>
                          <TableHead>Grupo</TableHead>
                          <TableHead>Referencial</TableHead>
                          <TableHead>Situação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leitura.contas.slice(0, LIMITE_PREVIA).map((c) => (
                          <TableRow key={`${c.linha}-${c.codigo}`}>
                            <TableCell className="font-mono text-xs">{c.codigo}</TableCell>
                            <TableCell className="text-sm">{c.descricao}</TableCell>
                            <TableCell className="text-xs">{c.tipo}</TableCell>
                            <TableCell className="text-xs">{c.natureza}</TableCell>
                            <TableCell className="text-xs">{c.grupo}</TableCell>
                            <TableCell className="text-xs">{c.referencial ?? "—"}</TableCell>
                            <TableCell className="text-xs">{c.situacao}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {leitura.contas.length > LIMITE_PREVIA ? (
                      <p className="border-t border-border p-2 text-center text-xs text-muted-foreground">
                        Prévia das {LIMITE_PREVIA} primeiras linhas — a importação considera as {leitura.contas.length} contas.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <label className="flex items-start gap-2 text-sm">
                  <Checkbox checked={atualizar} onCheckedChange={(v) => setAtualizar(v === true)} className="mt-0.5" />
                  <span>
                    Atualizar as contas que já existem (pelo código). Desmarcado, elas são mantidas como estão.
                    <span className="block text-xs text-muted-foreground">Contas com lançamentos não são apagadas nem têm o tipo alterado: a validação impede.</span>
                  </span>
                </label>

                {resultado ? (
                  <div className="space-y-2 rounded-2xl border border-border p-3 text-sm">
                    <div className="font-medium">Resultado: {resultado.criadas} criada(s), {resultado.atualizadas} atualizada(s), {resultado.ignoradas} mantida(s).</div>
                    {resultado.superiores ? (
                      <p className="text-xs text-muted-foreground">
                        {resultado.superiores} conta(s) superior(es) criada(s) como sintética(s) para manter a hierarquia — renomeie conforme o seu plano.
                      </p>
                    ) : null}
                    <ListaProblemas problemas={resultado.erros} />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setAberto(false)}>Fechar</Button>
            <Button className="rounded-full" disabled={!leitura || !leitura.contas.length} onClick={importar}>
              <Upload className="mr-2 h-4 w-4" /> Importar {leitura?.contas.length ?? 0} conta(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Balancete de abertura                                               */
/* ------------------------------------------------------------------ */

const COLUNAS_MODELO_BALANCETE = [
  { key: "conta", label: "Conta" },
  { key: "descricao", label: "Descrição" },
  { key: "debito", label: "Débito" },
  { key: "credito", label: "Crédito" },
];

const MODELO_BALANCETE = [
  { conta: "1.1.01.001", descricao: "Caixa", debito: "10.000,00", credito: "" },
  { conta: "1.2.3.01.001", descricao: "Máquinas e equipamentos", debito: "90.000,00", credito: "" },
  { conta: "2.1.01.001", descricao: "Fornecedores", debito: "", credito: "40.000,00" },
  { conta: "2.3.01.001", descricao: "Capital social", debito: "", credito: "60.000,00" },
];

export function BotaoImportarBalanceteAbertura() {
  const { empresa } = useEmpresaAtual();
  const empresaId = empresa?.id ?? "";
  const { competencia } = useCompetencia();
  const [aberto, setAberto] = useState(false);
  const [planilha, setPlanilha] = useState<Planilha | null>(null);
  const [leitura, setLeitura] = useState<LeituraBalancete | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [data, setData] = useState(`${competencia}-01`);
  const [historico, setHistorico] = useState("");
  const [documento, setDocumento] = useState("");
  const [ciente, setCiente] = useState(false);
  const [gravado, setGravado] = useState<{ numero: number; partidas: number } | null>(null);

  const lancamentos = useLancamentos(empresaId);
  const aberturas = useMemo(() => aberturasExistentes(lancamentos), [lancamentos]);

  const limpar = () => {
    setPlanilha(null);
    setLeitura(null);
    setErro(null);
    setGravado(null);
    setCiente(false);
  };

  const abrir = () => {
    limpar();
    setData(`${competencia}-01`);
    setHistorico(`Balancete de abertura — ${formatCompetencia(competencia)}`);
    setDocumento("");
    setAberto(true);
  };

  const selecionar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPlanilha(null);
    setLeitura(null);
    setErro(null);
    setGravado(null);
    try {
      const lida = await lerPlanilha(file.name, await lerConteudoDoArquivo(file));
      setPlanilha(lida);
      setLeitura(lerBalanceteAbertura(lida.linhas));
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    }
  };

  const fechado = leitura ? Math.round(leitura.diferenca * 100) === 0 : false;
  const bloqueadoPorAbertura = aberturas.length > 0 && !ciente;

  const importar = () => {
    if (!leitura || !empresaId) return;
    const r = importarBalanceteAbertura(leitura, {
      empresaId,
      data,
      historico: historico || `Balancete de abertura — ${formatCompetencia(competencia)}`,
      documento,
    });
    if (!r.ok) {
      setErro(r.erros.join(" "));
      toast.error("O lançamento de abertura não foi gravado.");
      return;
    }
    setErro(null);
    setGravado({ numero: r.registro.numero, partidas: r.registro.partidas.length });
    toast.success(`Lançamento de abertura nº ${r.registro.numero} gravado`, {
      description: `${r.registro.partidas.length} partidas · R$ ${moeda(leitura.debitos)} em débitos`,
    });
  };

  return (
    <>
      <Button variant="outline" className="rounded-full" onClick={abrir} disabled={!empresaId}>
        <Upload className="mr-2 h-4 w-4" /> Importar abertura
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar balancete de abertura</DialogTitle>
            <DialogDescription>
              Planilha com uma conta por linha: Conta (código ou reduzido) e o valor em Débito ou Crédito — ou uma coluna Saldo (positivo = devedor,
              negativo = credor). O resultado é um lançamento do tipo <strong>Abertura</strong>, com uma partida por conta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => baixarModelo("modelo-balancete-abertura", COLUNAS_MODELO_BALANCETE, MODELO_BALANCETE)}>
                <Download className="mr-1.5 h-4 w-4" /> Baixar modelo CSV
              </Button>
              <span className="text-xs text-muted-foreground">
                As contas precisam existir no plano de contas e ser analíticas e ativas. Importe o plano antes, se necessário.
              </span>
            </div>

            <EscolhaArquivo id="arquivo-balancete-abertura" arquivo={planilha?.arquivo ?? null} aoEscolher={selecionar} />

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="abertura-data" className="text-xs">Data do lançamento *</Label>
                <Input id="abertura-data" type="date" value={data} onChange={(e) => setData(e.target.value)} className="rounded-full" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="abertura-historico" className="text-xs">Histórico</Label>
                <Input id="abertura-historico" value={historico} onChange={(e) => setHistorico(e.target.value)} className="rounded-full" />
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <Label htmlFor="abertura-documento" className="text-xs">Documento (opcional)</Label>
                <Input id="abertura-documento" value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="Ex.: Termo de abertura / balanço de abertura" className="rounded-full" />
              </div>
            </div>

            {erro ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{erro}</div>
            ) : null}

            {leitura ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="secondary" className="rounded-full"><FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> {planilha?.aba}</Badge>
                  <Badge variant="secondary" className="rounded-full">{leitura.linhas.length} conta(s)</Badge>
                  <Badge variant="secondary" className="rounded-full">Débitos R$ {moeda(leitura.debitos)}</Badge>
                  <Badge variant="secondary" className="rounded-full">Créditos R$ {moeda(leitura.creditos)}</Badge>
                  <Badge
                    variant="secondary"
                    className={`rounded-full ${fechado ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}
                  >
                    {fechado ? "Débitos = créditos" : `Diferença R$ ${moeda(Math.abs(leitura.diferenca))}`}
                  </Badge>
                  {leitura.linhasIgnoradas ? <Badge variant="secondary" className="rounded-full">{leitura.linhasIgnoradas} linha(s) sem valor</Badge> : null}
                </div>

                <ListaProblemas problemas={leitura.erros} />

                {leitura.linhas.length ? (
                  <div className="overflow-x-auto rounded-2xl border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Conta</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>D/C</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leitura.linhas.slice(0, LIMITE_PREVIA).map((l) => (
                          <TableRow key={`${l.linha}-${l.contaId}`}>
                            <TableCell className="font-mono text-xs">{l.codigo}</TableCell>
                            <TableCell className="text-sm">{l.descricao}</TableCell>
                            <TableCell className="text-xs">{l.tipo === "D" ? "Débito" : "Crédito"}</TableCell>
                            <TableCell className="text-right font-mono text-xs">R$ {moeda(l.valor)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {leitura.linhas.length > LIMITE_PREVIA ? (
                      <p className="border-t border-border p-2 text-center text-xs text-muted-foreground">
                        Prévia das {LIMITE_PREVIA} primeiras linhas — a importação considera as {leitura.linhas.length} contas.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {aberturas.length ? (
                  <label className="flex items-start gap-2 rounded-2xl border border-warn/40 bg-warn/5 p-3 text-sm">
                    <Checkbox checked={ciente} onCheckedChange={(v) => setCiente(v === true)} className="mt-0.5" />
                    <span>
                      Já existe lançamento de abertura nesta empresa (nº {aberturas.map((a) => a.numero).join(", ")}). Importar de novo cria um segundo
                      lançamento de abertura.
                    </span>
                  </label>
                ) : null}

                {gravado ? (
                  <div className="rounded-2xl border border-success/30 bg-success/5 p-3 text-sm">
                    Lançamento de abertura <strong>nº {gravado.numero}</strong> gravado com {gravado.partidas} partidas.
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setAberto(false)}>Fechar</Button>
            <Button
              className="rounded-full"
              disabled={!leitura || !leitura.linhas.length || !fechado || Boolean(leitura.erros.length) || bloqueadoPorAbertura || Boolean(gravado)}
              onClick={importar}
            >
              <Upload className="mr-2 h-4 w-4" /> Importar lançamento de abertura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
