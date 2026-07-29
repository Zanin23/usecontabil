import { useState } from "react";
import {
  Badge, Button, Card, CardContent, Input, Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/design-system/mj-design-system-db98fa";
import { Link } from "react-router-dom";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { formatCompetencia, useCompetencia } from "@/lib/competencia";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";
import { brl, documentosDaCompetencia, resumoDocumentos, useTributario } from "@/lib/tributarioStore";

type Motor = {
  nome: string;
  tributo: string;
  base: string;
  efeito: string;
  legislacao: string;
  quando: string;
};

const MOTORES: Motor[] = [
  { nome: "Monofásico", tributo: "PIS/COFINS", base: "Receita de revenda", efeito: "Alíquota zero na revenda, concentração no fabricante/importador", legislacao: "Lei 10.147/2000 e 10.485/2002", quando: "Combustíveis, medicamentos, autopeças, bebidas frias" },
  { nome: "ICMS-ST", tributo: "ICMS", base: "(valor + IPI + frete) × (1 + MVA)", efeito: "Antecipação do imposto das etapas seguintes", legislacao: "Convênio ICMS 142/2018", quando: "Mercadorias com CEST e protocolo entre as UFs" },
  { nome: "DIFAL", tributo: "ICMS", base: "Base dupla no destino", efeito: "Partilha integral ao estado de destino", legislacao: "EC 87/2015 e LC 190/2022", quando: "Venda interestadual a consumidor final não contribuinte" },
  { nome: "IPI", tributo: "IPI", base: "Valor da operação", efeito: "Alíquota por NCM conforme TIPI", legislacao: "Decreto 11.158/2022", quando: "Industrialização e importação" },
  { nome: "ISS", tributo: "ISS", base: "Preço do serviço", efeito: "2% a 5% conforme município e item da lista", legislacao: "LC 116/2003", quando: "Prestação de serviços" },
  { nome: "FCP", tributo: "ICMS", base: "Base do ICMS ou da ST", efeito: "Adicional de 1% a 2% ao estado de destino", legislacao: "Leis estaduais", quando: "UFs que instituíram o fundo de combate à pobreza" },
  { nome: "Drawback", tributo: "II/IPI/PIS/COFINS/ICMS", base: "Insumo importado", efeito: "Suspensão dos tributos vinculada à exportação", legislacao: "Portaria SECEX 23/2011", quando: "Insumos aplicados em produto exportado" },
  { nome: "Zona Franca de Manaus", tributo: "ICMS/IPI/PIS/COFINS", base: "Remessa para a ZFM", efeito: "Isenção com comprovação de internamento (SUFRAMA)", legislacao: "DL 288/1967", quando: "Destinatário com inscrição SUFRAMA" },
  { nome: "REIDI", tributo: "PIS/COFINS", base: "Aquisição de bens e serviços", efeito: "Suspensão para obras de infraestrutura", legislacao: "Lei 11.488/2007", quando: "Empresa habilitada em projeto aprovado" },
  { nome: "Suspensão", tributo: "IPI/PIS/COFINS", base: "Operação específica", efeito: "Adia a incidência para etapa posterior", legislacao: "Diversos regimes especiais", quando: "Remessas para industrialização, exportação" },
  { nome: "Diferimento", tributo: "ICMS", base: "Operação interna", efeito: "Transfere o recolhimento para etapa seguinte", legislacao: "RICMS estaduais", quando: "Insumos agropecuários, sucata, industrialização" },
  { nome: "Redução de base", tributo: "ICMS", base: "Percentual da base", efeito: "Carga efetiva menor que a alíquota nominal", legislacao: "Convênios ICMS", quando: "Cesta básica, máquinas e implementos" },
  { nome: "Isenção", tributo: "ICMS/IPI", base: "Operação isenta", efeito: "Dispensa do pagamento com estorno de crédito", legislacao: "Convênios e leis específicas", quando: "Produtos e operações listadas" },
  { nome: "Imunidade", tributo: "Todos", base: "Operação imune", efeito: "Vedação constitucional à cobrança", legislacao: "CF/88, art. 150, VI", quando: "Livros, jornais, exportações, entidades imunes" },
  { nome: "Incentivos fiscais", tributo: "IRPJ/ICMS", base: "Investimento aprovado", efeito: "Crédito presumido ou dedução do imposto", legislacao: "Programas federais e estaduais", quando: "Projetos habilitados (Lei do Bem, Rouanet, Fomentar)" },
];

export default function TributacaoAvancada() {
  const { empresa } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const empresaId = empresa?.id ?? "";
  const [query, setQuery] = useState("");

  const docs = useTributario(() => documentosDaCompetencia(empresaId, competencia), [empresaId, competencia]);
  const r = resumoDocumentos(docs);

  const filtrados = MOTORES.filter((m) =>
    `${m.nome} ${m.tributo} ${m.quando} ${m.legislacao}`.toLowerCase().includes(query.toLowerCase()),
  );

  const contexto = {
    tela: "Tributação avançada",
    modulo: "Financeiro › Tributação",
    competencia: formatCompetencia(competencia),
    empresa: empresa ? { razao: empresa.razao, regime: empresa.regime } : null,
    motores: MOTORES,
    resumo: r,
    orientacoes: ["Cada motor é parametrizável por vigência e UF no motor tributário."],
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Financeiro › Tributação</div>
          <h1 className="font-display text-3xl sm:text-4xl">
            Tributação <span className="text-brand-orange">avançada</span>
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Catálogo dos motores especiais aplicados pelo sistema: regimes concentrados, benefícios,
            suspensões, diferimentos e incentivos — todos versionados por vigência e UF.
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary" className="rounded-full">{formatCompetencia(competencia)}</Badge>
            <Badge variant="secondary" className="rounded-full">{empresa?.razao ?? "Nenhuma empresa selecionada"}</Badge>
          </div>
        </div>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/financeiro/tributacao/motor-tributario">Motor de regras <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Motores disponíveis", valor: String(MOTORES.length) },
          { label: "Documentos na competência", valor: String(r.total) },
          { label: "Tributos calculados", valor: brl(r.tributos) },
          { label: "Carga efetiva", valor: `${r.cargaEfetiva.toFixed(2)}%` },
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
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} className="rounded-full pl-9"
              placeholder="Buscar motor, tributo ou legislação…" />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Motor</TableHead>
                  <TableHead>Tributo</TableHead>
                  <TableHead>Base</TableHead>
                  <TableHead>Efeito</TableHead>
                  <TableHead>Quando se aplica</TableHead>
                  <TableHead>Legislação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((m) => (
                  <TableRow key={m.nome}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-brand-orange" /> {m.nome}
                      </span>
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="rounded-full">{m.tributo}</Badge></TableCell>
                    <TableCell className="text-xs">{m.base}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.efeito}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.quando}</TableCell>
                    <TableCell className="text-xs text-brand-orange">{m.legislacao}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AssistenteFechamento contexto={contexto} resumo="Tributação avançada — catálogo de motores especiais" rotulo="IA ajudante" />
    </div>
  );
}
