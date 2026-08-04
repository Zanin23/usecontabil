import React, { useState, useEffect } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Monitor,
  GraduationCap,
  Sparkles,
  LayoutDashboard,
  ShieldCheck,
  Zap,
  Building2,
  Table,
  ArrowRight,
  TrendingUp,
  Receipt,
  FileText,
  Landmark,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Badge,
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/mj-design-system-db98fa";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import dashboardImg from "@/assets/image-21.png.asset.json";

const brl = (v: number) =>
  "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });


interface Slide {
  id: string;
  title: string;
  subtitle: string;
  highlight: string;
  icon: any;
  description: string;
  points: string[];
  image?: string;
  area?: string;
  previewType?: "chart" | "table" | "kpis" | "icon" | "image";
  previewData?: any;
}


const SLIDES: Slide[] = [
  {
    id: "welcome",
    title: "Bem-vindo ao",
    highlight: "Use Contábil",
    subtitle: "A Central Inteligente de Gestão Fiscal e Administrativa",
    icon: Sparkles,
    description: "Uma plataforma integrada para grandes grupos econômicos gerenciarem contabilidade, fiscal e administrativo de forma unificada e automatizada.",
    points: [
      "Integração nativa com Receita e SEFAZ",
      "Motor de apuração desacoplado",
      "Auditoria fiscal preventiva 24/7",
      "Camada de aprendizado integrada"
    ],
    previewType: "icon",
  },
  {
    id: "dashboard",
    title: "Dashboard",
    highlight: "Executivo",
    subtitle: "Visão estratégica em tempo real",
    icon: LayoutDashboard,
    description: "Indicadores de performance, saúde tributária e fluxo de caixa consolidados em um único painel interativo com drill-down completo.",
    points: [
      "KPIs de Receita, Despesa e Lucro",
      "Monitoramento de tributos a recolher",
      "Alertas de bloqueio de fechamento",
      "Gráficos acessíveis e interativos"
    ],
    previewType: "image",
    image: dashboardImg.url,
    previewData: [
      { mes: "Jan", receita: 450000, despesa: 320000 },
      { mes: "Fev", receita: 520000, despesa: 340000 },
      { mes: "Mar", receita: 480000, despesa: 310000 },
      { mes: "Abr", receita: 610000, despesa: 380000 },
      { mes: "Mai", receita: 590000, despesa: 360000 },
      { mes: "Jun", receita: 720000, despesa: 410000 },
    ]
  },
  {
    id: "docs_fiscais",
    title: "Documentos",
    highlight: "Fiscais",
    subtitle: "Gestão de Entradas e Saídas",
    icon: Receipt,
    description: "Visualização completa de notas fiscais de entrada, saída e serviços com integração direta aos órgãos reguladores.",
    points: [
      "Importação automática de XML",
      "Gestão de NF-e, NFS-e e CT-e",
      "Filtros por participante e status",
      "Validação de chaves de acesso"
    ],
    previewType: "table",
    previewData: [
      { documento: "NF-e 10240", data: "28/07/2026", participante: "Metalúrgica Andrade S.A.", tipo: "Compra", valor: 1400, status: "Escriturado" },
      { documento: "NF-e 10247", data: "27/07/2026", participante: "Panificadora Real Ltda.", tipo: "Devolução", valor: 2637.4, status: "Escriturado" },
      { documento: "NF-e 10254", data: "26/07/2026", participante: "TechCore Sistemas ME", tipo: "Venda", valor: 3874.8, status: "Pendente" },
    ]
  },
  {
    id: "fiscal_apuracao",
    title: "Apurações",
    highlight: "Fiscais",
    subtitle: "Conformidade absoluta e automação",
    icon: Table,
    description: "Motor de cálculo inteligente para apuração de impostos federais, estaduais e municipais em tempo real.",
    points: [
      "Apuração ICMS, IPI, PIS/COFINS",
      "Diferencial de Alíquota (DIFAL)",
      "Substituição Tributária (ST)",
      "Simulações de regime tributário"
    ],
    previewType: "table",
    previewData: [
      { tributo: "ICMS Próprio", base: 461750, debito: 74178, credito: 44713, apagar: 29465, status: "Apurado" },
      { tributo: "PIS/COFINS", base: 461750, debito: 42711, credito: 24027, apagar: 18684, status: "Apurado" },
      { tributo: "ISS Municipal", base: 128500, debito: 6425, credito: 0, apagar: 6425, status: "Conferência" },
    ]
  },
  {
    id: "audit",
    title: "Tax",
    highlight: "Intelligence",
    subtitle: "Auditoria preventiva e compliance",
    icon: ShieldCheck,
    description: "Sistema de auditoria que identifica divergências entre XML e escrituração antes mesmo do envio das obrigações.",
    points: [
      "Cruzamento XML x Escrituração",
      "Validação de NCM, CST e Alíquotas",
      "Identificação de créditos extemporâneos",
      "Gestão de certidões e prazos críticos"
    ],
    previewType: "table",
    previewData: [
      { ref: "NF-e 10267", erro: "XML sem escrituração", impacto: "Crédito perdido", nivel: "Crítico" },
      { ref: "NF-e 10281", erro: "Valor divergente", impacto: "ICMS a maior", nivel: "Alerta" },
      { ref: "CT-e 3308", erro: "CFOP incompatível", impacto: "Reclassificação", nivel: "Informativo" },
    ]
  },
  {
    id: "admin_patrimonio",
    title: "Gestão de",
    highlight: "Patrimônio",
    subtitle: "Controle de Ativos Imobilizados",
    icon: Building2,
    description: "Controle completo de bens, calculando depreciação automaticamente e gerindo movimentações e inventário.",
    points: [
      "Depreciação linear automática",
      "Controle por centro de custo",
      "Histórico de movimentações",
      "Inventário com etiquetas/QR Code"
    ],
    previewType: "table",
    previewData: [
      { bem: "Torno CNC Romi", aquisicao: "12/03/2025", valor: 145000, depreciacao: 2416.67, status: "Ativo" },
      { bem: "Servidor Dell PowerEdge", aquisicao: "05/01/2026", valor: 32000, depreciacao: 533.33, status: "Ativo" },
      { bem: "Frota - Veículo Logística", aquisicao: "20/02/2026", valor: 89000, depreciacao: 1483.33, status: "Em manutenção" },
    ]
  },
  {
    id: "admin_financeiro",
    title: "Módulo",
    highlight: "Financeiro",
    subtitle: "Controle operacional e financeiro",
    icon: Landmark,
    description: "Gestão completa de contratos, suprimentos e fluxos de caixa integrados à contabilidade.",
    points: [
      "Contas a Pagar e Receber",
      "Fluxo de Caixa Realizado vs Orçado",
      "Gestão de Contratos e Vigências",
      "Conciliação Bancária Automatizada"
    ],
    previewType: "kpis",
    previewData: [
      { label: "Saldo em Contas", valor: brl(842500.25), sub: "+2.4% este mês" },
      { label: "Contratos Ativos", valor: "142", sub: "5 vencendo em 30 dias" },
      { label: "Pedidos de Compra", valor: "28", sub: "12 aguardando aprovação" },
    ]
  },
  {
    id: "learning",
    title: "Camada de",
    highlight: "Aprendizado",
    subtitle: "Capacitação técnica em tempo real",
    icon: GraduationCap,
    description: "Diferencial exclusivo: aprenda contabilidade e legislação fiscal praticando dentro do próprio sistema.",
    points: [
      "Tutor de IA pedagógico em cada tela",
      "Laboratórios de prática (Sandbox)",
      "Trilhas de conhecimento por área",
      "Glossário técnico integrado ao Ctrl+K"
    ],
    previewType: "icon",
  },
  {
    id: "tech",
    title: "Tecnologia",
    highlight: "AI-Native",
    subtitle: "Assistência inteligente em cada campo",
    icon: Zap,
    description: "O Use Contábil utiliza modelos avançados de IA para auxiliar o preenchimento e explicar regras complexas.",
    points: [
      "Assistente de campos contextual",
      "Preenchimento automático via BrasilAPI",
      "Busca inteligente de funcionalidades",
      "Geração de documentação automática"
    ],
    previewType: "icon",
  }
];


export default function ApresentacaoSistema({ onFinish }: { onFinish?: () => void }) {
  const [current, setCurrent] = useState(0);
  const slide = SLIDES[current];

  const next = () => {
    if (current < SLIDES.length - 1) setCurrent(current + 1);
    else if (onFinish) onFinish();
  };

  const prev = () => {
    if (current > 0) setCurrent(current - 1);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape" && onFinish) onFinish();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [current]);

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-aurora opacity-50 pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-10 px-8 h-20 flex items-center justify-between border-b border-border/40 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-brand-orange grid place-items-center shadow-glow">
            <span className="text-primary-foreground font-display text-xl">U</span>
          </div>
          <div className="font-display text-xl">
            Use <span className="text-brand-orange">Contábil</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/50 border border-border text-[11px] uppercase tracking-widest text-muted-foreground">
            Slide {current + 1} de {SLIDES.length}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="rounded-full h-10 w-10 p-0 hover:bg-destructive/10 hover:text-destructive"
            onClick={onFinish}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Slide Content */}
      <main className="flex-1 relative flex items-center justify-center p-6 md:p-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center"
          >
            {/* Text Side */}
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge variant="outline" className="rounded-full px-4 py-1 text-xs border-brand-orange/30 text-brand-orange uppercase tracking-[0.2em] bg-brand-orange/5">
                  {slide.subtitle}
                </Badge>
                <h2 className="font-display text-5xl md:text-7xl leading-[1.1]">
                  {slide.title} <br />
                  <span className="text-brand-orange">{slide.highlight}</span>
                </h2>
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">
                  {slide.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {slide.points.map((point, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/60 shadow-card"
                  >
                    <div className="h-2 w-2 rounded-full bg-brand-orange shadow-glow" />
                    <span className="text-sm font-medium">{point}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Visual Side */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="relative w-full aspect-[4/3] lg:aspect-auto lg:h-[520px] flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-gradient-brand opacity-10 blur-[100px] rounded-full" />
              <Card className="relative z-10 w-full h-full rounded-3xl border-border/40 shadow-elevated bg-card/90 backdrop-blur-md overflow-hidden flex flex-col border-2 border-brand-orange/20">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-brand" />
                
                {slide.previewType === "image" && (
                  <div className="flex-1 relative overflow-hidden flex items-center justify-center p-0">
                    <img 
                      src={slide.image} 
                      alt={slide.title}
                      className="w-full h-full object-cover object-top"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                  </div>
                )}

                {slide.previewType === "chart" && (
                  <div className="flex-1 p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                      <div className="text-sm font-semibold flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4 text-brand-orange" />
                        Visão de Performance
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase">Mensal</Badge>
                    </div>
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={slide.previewData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                          <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                          <YAxis hide />
                          <Tooltip 
                            cursor={{ fill: "var(--brand-orange)", opacity: 0.05 }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="receita" fill="var(--brand-orange)" radius={[4, 4, 0, 0]} barSize={20} />
                          <Bar dataKey="despesa" fill="var(--brand-blue)" radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {slide.previewType === "table" && (
                  <div className="flex-1 flex flex-col">
                    <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Listagem de Amostra</div>
                      <div className="flex gap-1">
                        <div className="h-2 w-2 rounded-full bg-destructive/40" />
                        <div className="h-2 w-2 rounded-full bg-warn/40" />
                        <div className="h-2 w-2 rounded-full bg-success/40" />
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                      <UITable>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-border">
                            {Object.keys(slide.previewData[0]).map(key => (
                              <TableHead key={key} className="text-[10px] uppercase h-8">{key}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {slide.previewData.map((row: any, i: number) => (
                            <TableRow key={i} className="border-border/50">
                              {Object.entries(row).map(([key, val]: any, j) => (
                                <TableCell key={j} className={cn(
                                  "text-[11px] py-2",
                                  key === 'apagar' || key === 'base' ? "font-mono" : ""
                                )}>
                                  {key === 'apagar' || key === 'base' ? brl(val) : String(val)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </UITable>
                    </div>
                  </div>
                )}

                {slide.previewType === "kpis" && (
                  <div className="flex-1 p-8 grid grid-cols-1 gap-6 content-center">
                    {slide.previewData.map((kpi: any, i: number) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.1 }}
                        className="p-4 rounded-2xl bg-muted/40 border border-border flex flex-col"
                      >
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{kpi.label}</span>
                        <span className="text-2xl font-display text-brand-orange mt-1">{kpi.valor}</span>
                        <span className="text-[10px] text-success font-medium mt-1">{kpi.sub}</span>
                      </motion.div>
                    ))}
                  </div>
                )}

                {slide.previewType === "icon" && (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center group">
                    <slide.icon className="h-24 w-24 text-brand-orange mb-8 group-hover:scale-110 transition-transform duration-500" />
                    <h3 className="font-display text-3xl mb-4">{slide.highlight}</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                      Clique no botão de pré-visualização para ver este módulo em funcionamento real dentro do sistema.
                    </p>
                    <div className="mt-8 flex gap-3">
                      <div className="h-1.5 w-12 rounded-full bg-brand-orange/20" />
                      <div className="h-1.5 w-12 rounded-full bg-brand-orange/20" />
                      <div className="h-1.5 w-12 rounded-full bg-brand-orange/20" />
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>

          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Controls */}
      <footer className="relative z-10 px-8 h-24 flex items-center justify-between border-t border-border/40 backdrop-blur-sm">
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={cn(
                "h-1.5 transition-all duration-300 rounded-full",
                current === i ? "w-8 bg-brand-orange" : "w-2 bg-border hover:bg-border-strong"
              )}
            />
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full px-6 h-11"
            onClick={prev}
            disabled={current === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" /> Anterior
          </Button>
          <Button
            size="sm"
            className="rounded-full px-8 h-11 bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground shadow-glow group"
            onClick={next}
          >
            {current === SLIDES.length - 1 ? "Concluir" : "Próximo"}
            <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
