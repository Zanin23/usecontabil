import { useState } from "react";
import {
  Badge, Button, Card, CardContent, Input, Label, Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { FileSpreadsheet, RefreshCw } from "lucide-react";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import {
  brl, documentosDaCompetencia, empresaDB, registrarAuditoria, resumoDocumentos, useTributario,
} from "@/lib/tributarioStore";

type Ficha = {
  socios: string;
  empregadosInicio: string;
  empregadosFim: string;
  lucroContabil: string;
  distribuicaoLucros: string;
  ganhoCapital: string;
  exportacoes: string;
  estoqueInicial: string;
  estoqueFinal: string;
  saldoBancario: string;
};

const CAMPOS: { key: keyof Ficha; label: string; ajuda: string }[] = [
  { key: "socios", label: "Quantidade de sócios", ajuda: "Sócios com participação no ano-calendário." },
  { key: "empregadosInicio", label: "Empregados no início", ajuda: "Vínculos em 1º de janeiro." },
  { key: "empregadosFim", label: "Empregados no fim", ajuda: "Vínculos em 31 de dezembro." },
  { key: "lucroContabil", label: "Lucro contábil", ajuda: "Resultado apurado na escrituração contábil." },
  { key: "distribuicaoLucros", label: "Distribuição de lucros", ajuda: "Valores distribuídos aos sócios no ano." },
  { key: "ganhoCapital", label: "Ganho de capital", ajuda: "Ganhos na alienação de bens do ativo." },
  { key: "exportacoes", label: "Receitas de exportação", ajuda: "Receitas com imunidade de PIS/COFINS e ICMS." },
  { key: "estoqueInicial", label: "Estoque inicial", ajuda: "Valor do estoque em 1º de janeiro." },
  { key: "estoqueFinal", label: "Estoque final", ajuda: "Valor do estoque em 31 de dezembro." },
  { key: "saldoBancario", label: "Saldo em caixa e bancos", ajuda: "Saldo consolidado em 31 de dezembro." },
];

const KEY = "usecontabil.defis.v1";

export default function Defis() {
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const empresaId = empresa?.id ?? "";
  const ano = competencia.slice(0, 4);

  const docs = useTributario(() => documentosDaCompetencia(empresaId, competencia), [empresaId, competencia]);
  const r = resumoDocumentos(docs);

  const [ficha, setFicha] = useState<Ficha>(() => {
    try {
      const raw = localStorage.getItem(`${KEY}.${empresaId}.${ano}`);
      if (raw) return JSON.parse(raw) as Ficha;
    } catch { /* ignore */ }
    return {
      socios: "", empregadosInicio: "", empregadosFim: "", lucroContabil: "",
      distribuicaoLucros: "", ganhoCapital: "", exportacoes: "", estoqueInicial: "",
      estoqueFinal: "", saldoBancario: "",
    };
  });

  const historico = useTributario(
    () => empresaDB(empresaId).auditoria.filter((a) => a.origem === "Tributação › DEFIS").slice(0, 6),
    [empresaId],
  );

  const gerar = () => {
    if (!empresaId) return toast.error("Selecione uma empresa.");
    localStorage.setItem(`${KEY}.${empresaId}.${ano}`, JSON.stringify(ficha));
    registrarAuditoria(empresaId, {
      competencia, origem: "Tributação › DEFIS", acao: `DEFIS ${ano} gerada`,
      detalhe: `Receita declarada ${brl(r.faturado)} · ${ficha.socios || 0} sócio(s)`,
    });
    toast.success(`DEFIS ${ano} gerada com os dados da competência.`);
  };

  const contexto = {
    tela: "DEFIS",
    modulo: "Financeiro › Tributação",
    anoCalendario: ano,
    competencia: formatCompetencia(competencia),
    empresa: empresa ? { razao: empresa.razao, regime: empresa.regime } : null,
    receitaApurada: r.faturado,
    ficha,
    orientacoes: [
      "A DEFIS é anual e obrigatória para optantes do Simples Nacional, entregue até 31 de março.",
      "As receitas são preenchidas automaticamente a partir dos documentos autorizados.",
    ],
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-orange/15">
            <FileSpreadsheet className="h-5 w-5 text-brand-orange" />
          </div>
          <div>
            <h1 className="font-display text-2xl leading-tight">DEFIS <span className="text-brand-orange">{ano}</span></h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Declaração de Informações Socioeconômicas e Fiscais do Simples Nacional, montada
              automaticamente a partir das receitas, sócios, empregados e lucros do ano-calendário.
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary" className="rounded-full">{formatCompetencia(competencia)}</Badge>
              <Badge variant="secondary" className="rounded-full">{empresa?.razao ?? "Nenhuma empresa selecionada"}</Badge>
            </div>
          </div>
        </div>
        <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={gerar}>
          <RefreshCw className="mr-2 h-4 w-4" /> Gerar DEFIS
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Receita bruta apurada", valor: brl(r.faturado) },
          { label: "Documentos autorizados", valor: String(r.autorizados) },
          { label: "Tributos do período", valor: brl(r.tributos) },
          { label: "Receitas de exportação", valor: brl(Number(ficha.exportacoes.replace(",", ".")) || 0) },
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
        <CardContent className="space-y-4 p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ficha socioeconômica</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CAMPOS.map((c) => (
              <div key={c.key} className="space-y-1.5">
                <Label className="text-xs">{c.label}</Label>
                <Input className="rounded-xl font-mono text-xs" value={ficha[c.key]}
                  onChange={(e) => setFicha({ ...ficha, [c.key]: e.target.value })} />
                <p className="text-[11px] text-muted-foreground">{c.ajuda}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl shadow-card">
        <CardContent className="space-y-3 p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Eventos da declaração</div>
          {historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma geração registrada para esta empresa.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Detalhe</TableHead>
                  <TableHead>Usuário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-mono text-xs">{new Date(h.data).toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{h.acao}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{h.detalhe ?? "—"}</TableCell>
                    <TableCell className="text-xs">{h.usuario}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AssistenteFechamento contexto={contexto} resumo={`DEFIS ${ano} — receita ${brl(r.faturado)}`} rotulo="IA ajudante" />
    </div>
  );
}
