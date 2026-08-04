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
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Badge,
} from "@/design-system/mj-design-system-db98fa";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
  },
  {
    id: "fiscal",
    title: "Módulo",
    highlight: "Fiscal & Tributário",
    subtitle: "Conformidade absoluta e automação",
    icon: Table,
    description: "Escrituração automática, apuração de impostos federais, estaduais e municipais com motor de regras inteligente.",
    points: [
      "Escrituração automática de NF-e e CT-e",
      "Apuração ICMS, IPI, PIS/COFINS e ISS",
      "Gestão de Obrigações Acessórias (SPED)",
      "Calendário fiscal dinâmico por empresa"
    ],
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
  },
  {
    id: "admin",
    title: "Módulo",
    highlight: "Administrativo",
    subtitle: "Controle operacional e financeiro",
    icon: Building2,
    description: "Gestão completa de contratos, patrimônio, suprimentos e controles internos integrados à contabilidade.",
    points: [
      "Controle de contratos e vigências",
      "Gestão de bens e depreciação automática",
      "Ciclo de compras e suprimentos",
      "Gestão de alçadas e permissões"
    ],
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
              className="relative aspect-square lg:aspect-auto lg:h-[500px] flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-gradient-brand opacity-10 blur-[100px] rounded-full" />
              <Card className="relative z-10 w-full h-full max-h-[440px] rounded-3xl border-border/40 shadow-elevated bg-card/80 backdrop-blur-md overflow-hidden flex flex-col items-center justify-center p-12 text-center group border-2 border-brand-orange/20">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-brand" />
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
