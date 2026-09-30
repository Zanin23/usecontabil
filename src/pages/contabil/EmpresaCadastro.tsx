import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { saveEmpresa, getEmpresa, loadEmpresas, findEmpresaPorCnpj, sincronizarEmpresas, type EmpresaRecord } from "@/lib/empresasStore";
import { validarCadastroEmpresa } from "@/lib/empresaValidacao";
import { REGIMES_TRIBUTARIOS, regimeDefinido } from "@/lib/regime";
import { formatAtividade, loadAtividades, useAtividades } from "@/lib/atividadesStore";

import {
  Button, Card, CardContent, Input, Label, Separator,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Tabs, TabsList, TabsTrigger, Badge, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/design-system/mj-design-system-db98fa";
import {
  ArrowLeft, Building2, ChevronDown, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Search, Plus, FileText, Trash2, Check,
  Landmark, KeyRound, Users2, DollarSign, FileSignature,
  Users, MessageSquare, HelpCircle, CircleAlert, Sparkles, Loader2,
  Lightbulb, ExternalLink, Wand2, X, GripVertical, Info, History, MapPin, Phone, Mail,
} from "lucide-react";

type SectionKey = "dados" | "senhas" | "fiscal" | "societario";

const SECTION_TABS: { key: SectionKey; label: string; icon: any }[] = [
  { key: "dados", label: "Dados empresa", icon: Landmark },
  { key: "senhas", label: "Senhas e Certificados", icon: KeyRound },
  { key: "fiscal", label: "Fiscal", icon: DollarSign },
  { key: "societario", label: "Societário", icon: FileSignature },
];

const SECTION_TITLES: Record<SectionKey, string> = {
  dados: "Dados empresa",
  senhas: "Senhas e Certificados",
  fiscal: "Fiscal",
  societario: "Societário",
};

/* ------------------------------ form state ------------------------------ */

type FormState = {
  cnpj: string; ie: string; im: string; cnae: string; cnaeDesc: string;
  razao: string; fantasia: string;
  cep: string; endereco: string; numero: string; complemento: string;
  bairro: string; municipio: string; uf: string; codFederal: string;
  dataAlteracao: string; geraAniv: string;
  contatoNome: string; contatoCpf: string; contatoTel: string;
  email: string; whatsapp: string; site: string;
  respNome: string; respCpf: string; respCnpj: string; respTipo: string;
  aberturaRF: string; inicioContrato: string;
  classeAtividadeId: string;
  regime: string;
};

const EMPTY_FORM: FormState = {
  cnpj: "", ie: "", im: "", cnae: "", cnaeDesc: "",
  razao: "", fantasia: "",
  cep: "", endereco: "", numero: "", complemento: "",
  bairro: "", municipio: "", uf: "", codFederal: "",
  dataAlteracao: "", geraAniv: "nao",
  contatoNome: "", contatoCpf: "", contatoTel: "",
  email: "", whatsapp: "", site: "",
  respNome: "", respCpf: "", respCnpj: "", respTipo: "cpf",
  aberturaRF: "", inicioContrato: "",
  classeAtividadeId: "",
  regime: "",
};

/* --------------------------- assistant tips ---------------------------- */

type Tip = { title: string; steps: string[]; link?: { label: string; url: string } };

const TIPS: Record<string, Tip> = {
  cnpj: {
    title: "CNPJ / CPF / CEI",
    steps: [
      "Digite apenas os números do CNPJ (14 dígitos).",
      "Use o botão 'Buscar CNPJ' — puxamos razão social, endereço, CNAE, telefone e abertura direto da base pública.",
      "Se for CEI ou obra, informe manualmente.",
    ],
    link: { label: "Consultar cartão CNPJ", url: "https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp" },
  },
  ie: {
    title: "Inscrição Estadual",
    steps: [
      "Encontre no cartão da SEFAZ do estado.",
      "Se a empresa for isenta, deixe em branco e marque 'Isento' na aba Tributações → Estadual.",
    ],
    link: { label: "SINTEGRA (todos os estados)", url: "http://www.sintegra.gov.br/" },
  },
  im: {
    title: "Inscrição Municipal",
    steps: [
      "Obtida na prefeitura no ato do alvará de funcionamento.",
      "Necessária para emissão de NFS-e.",
    ],
  },
  cnae: {
    title: "CNAE Principal",
    steps: [
      "Preenchido automaticamente ao buscar o CNPJ.",
      "Para revisar, consulte o cartão CNPJ ou a CNAE do IBGE.",
    ],
    link: { label: "Consulta CNAE (IBGE)", url: "https://cnae.ibge.gov.br/" },
  },
  razao: { title: "Razão Social", steps: ["Nome oficial da empresa no cartão CNPJ.", "Preenchido pelo 'Buscar CNPJ'."] },
  fantasia: { title: "Nome Fantasia", steps: ["Nome comercial. Se não houver, repita a razão social."] },
  cep: {
    title: "CEP",
    steps: [
      "8 dígitos. Use 'Buscar CEP' — preenchemos endereço, bairro, município e UF via ViaCEP/BrasilAPI.",
    ],
    link: { label: "Buscar CEP nos Correios", url: "https://buscacepinter.correios.com.br/" },
  },
  endereco: { title: "Endereço", steps: ["Preenchido pelo CEP. Confirme com o comprovante do cartão CNPJ."] },
  numero: { title: "Número", steps: ["Número do imóvel. Se não houver, informe S/N."] },
  contatoNome: { title: "Contato principal", steps: ["Responsável interno pelo relacionamento contábil/fiscal desta unidade."] },
  email: { title: "E-Mail", steps: ["Usado para envio de guias, relatórios e comunicados oficiais."] },
  whatsapp: { title: "Celular / WhatsApp", steps: ["Preferencial para notificações urgentes de vencimento e obrigações."] },
  respNome: { title: "Responsável Técnico", steps: ["Contador interno responsável perante o CRC pelas escriturações desta empresa."] },
  respCpf: { title: "CPF do Responsável", steps: ["CPF do contador interno registrado no CRC."] },
  respCnpj: { title: "CNPJ da unidade responsável", steps: ["CNPJ da matriz ou unidade do grupo que responde tecnicamente por esta empresa."] },
  senhas: {
    title: "Senhas de acesso",
    steps: [
      "Salve senhas da Previdência, SEFAZ e e-Cac aqui.",
      "As senhas são criptografadas e visíveis apenas para usuários autorizados.",
    ],
  },
  esocial: {
    title: "Classificação Tributária (eSocial)",
    steps: [
      "Consulte o Anexo I da tabela do eSocial para escolher a classificação correta.",
      "MEI = 4, Simples com folha = 1, Simples sem folha = 3, Lucro Presumido/Real = 22.",
    ],
    link: { label: "Tabela 8 do eSocial", url: "https://www.gov.br/esocial/pt-br/documentacao-tecnica/leiautes-esocial-v-s-1-3/index.html" },
  },
  fpas: {
    title: "FPAS",
    steps: [
      "Código do Fundo de Previdência e Assistência Social vinculado à atividade.",
      "Indústria em geral = 507. Comércio = 515. Serviços = 566.",
    ],
  },
  natureza: {
    title: "Natureza Jurídica",
    steps: [
      "Preenchida pela Receita. Códigos comuns: 213-5 Empresário Individual, 206-2 LTDA, 230-5 EIRELI.",
    ],
  },
};

const GENERAL_TIP: Tip = {
  title: "Antes de começar",
  steps: [
    "Tenha em mãos: cartão CNPJ, contrato social e cartão SEFAZ.",
    "Comece digitando o CNPJ e clique em 'Buscar CNPJ' — preenchemos a maior parte automaticamente.",
    "Depois preencha o CEP e clique em 'Buscar CEP' para o endereço completo.",
    "Campos com * são obrigatórios para salvar.",
  ],
};

/* ------------------------- BrasilAPI integrations ------------------------ */

const digits = (s: string) => s.replace(/\D+/g, "");
const fmtCnpj = (v: string) => {
  const d = digits(v).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};
const fmtCep = (v: string) => {
  const d = digits(v).slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, "$1-$2");
};

async function fetchCnpj(cnpj: string) {
  const d = digits(cnpj);
  if (d.length !== 14) throw new Error("CNPJ inválido");
  
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${d}`, { mode: 'cors' });
    
    if (r.status === 404) throw new Error("CNPJ não encontrado na base pública.");
    if (!r.ok) throw new Error(`Erro na consulta (Status: ${r.status})`);
    
    return await r.json();
  } catch (e: any) {
    console.error("Erro na busca de CNPJ:", e);
    
    // Identifica erros de rede/CORS (Failed to fetch)
    if (e instanceof TypeError || e.message?.includes('fetch')) {
      throw new Error("Não foi possível conectar ao serviço de busca (BrasilAPI). Tente preencher manualmente ou verifique se sua rede bloqueia o acesso.");
    }
    
    throw e;
  }
}

async function fetchCep(cep: string) {
  const d = digits(cep);
  if (d.length !== 8) throw new Error("CEP inválido");
  
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${d}`, { mode: 'cors' });
    if (r.status === 404) throw new Error("CEP não encontrado.");
    if (!r.ok) throw new Error(`Erro na consulta (Status: ${r.status})`);
    return await r.json();
  } catch (e: any) {
    console.error("Erro na busca de CEP:", e);
    if (e instanceof TypeError || e.message?.includes('fetch')) {
      throw new Error("Falha na conexão de CEP. Verifique sua internet ou preencha o endereço manualmente.");
    }
    throw e;
  }
}

/* ------------------------------ primitives ------------------------------ */

/* ------------------------------ shared UI ------------------------------ */

// Uniform sizing/appearance for every input, select-trigger and textarea in this form.
const INPUT_CLASS =
  "h-10 rounded-lg bg-background border-border/60 text-sm text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-1 focus-visible:ring-brand-blue/60 focus-visible:border-brand-blue/60 transition-all hover:border-brand-blue/40";

function Field({
  label, required, children, className = "", tipKey, onFocusTip, hint,
}: {
  label: string; required?: boolean; children: React.ReactNode;
  className?: string; tipKey?: string; onFocusTip?: (k: string) => void;
  hint?: string;
}) {
  return (
    <div
      className={`space-y-1.5 ${className}`}
      onFocus={() => tipKey && onFocusTip?.(tipKey)}
    >
      <div className="flex items-center justify-between">
        <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 leading-none">
          {label}
          {required && <span className="text-destructive font-bold">*</span>}
        </Label>
        {tipKey && TIPS[tipKey] && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 text-brand-blue/50 cursor-help hover:text-brand-blue transition-colors" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px] text-[10px]">{TIPS[tipKey].title}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="relative group">
        {children}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity">
          <div className="h-1.5 w-1.5 rounded-full bg-brand-blue" />
        </div>
      </div>
      {hint && <p className="text-[10px] text-muted-foreground/80 leading-tight italic px-1">{hint}</p>}
    </div>
  );
}

/** Aviso nas abas cujos campos ainda não estão ligados ao cadastro (não gravam). */
function AvisoAbaIlustrativa({ children }: { children: React.ReactNode }) {
  return (
    <div role="note" className="rounded-xl border border-warn/20 bg-warn/10 p-3 text-xs text-foreground/80 flex items-start gap-2">
      <CircleAlert className="h-4 w-4 text-warn shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function SectionCard({
  title, children, defaultOpen = true,
}: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${open ? "bg-muted/30 border-b border-border/50" : "hover:bg-muted/20"}`}
      >
        <div className="flex items-center gap-2">
          <div className={`h-1.5 w-1.5 rounded-full ${open ? "bg-brand-blue" : "bg-muted-foreground/30"}`} />
          <span className="text-xs font-bold text-foreground uppercase tracking-widest">{title}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && <div className="p-5 bg-card/50">{children}</div>}
    </div>
  );
}

function InlineDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 mt-8 mb-6">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-border/70" />
      <span className="text-[10px] uppercase tracking-[0.3em] text-brand-blue font-bold opacity-80">{children}</span>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent to-border/70" />
    </div>
  );
}


/* -------------------------------- panels -------------------------------- */

function LeftPanel({
  form,
  posicao,
  total,
  irPara,
}: {
  form: FormState;
  posicao: number;
  total: number;
  irPara: (indice: number) => void;
}) {
  const displayName = form.razao || form.fantasia || "— nova empresa —";
  const cnpjMasked = form.cnpj || "—";
  const semLista = total === 0;
  return (
    <Card className="rounded-2xl border-border/70 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="bg-brand-blue/5 border-b border-border/70 p-4">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <History className="h-3 w-3" />
            Navegação
          </div>
          <Badge variant="outline" className="h-5 px-1.5 font-mono text-[10px] border-border/60">
            {posicao >= 0 ? `${posicao + 1} / ${total}` : "NOVO"}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg bg-background"
                    disabled={semLista || posicao <= 0} onClick={() => irPara(0)}><ChevronsLeft className="h-4 w-4" /></Button>
                </TooltipTrigger>
                <TooltipContent>Primeiro</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg bg-background"
                    disabled={semLista || posicao <= 0} onClick={() => irPara(posicao - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                </TooltipTrigger>
                <TooltipContent>Anterior</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg bg-background"
                    disabled={semLista || posicao >= total - 1} onClick={() => irPara(posicao + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </TooltipTrigger>
                <TooltipContent>Próximo</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg bg-background"
                    disabled={semLista || posicao >= total - 1} onClick={() => irPara(total - 1)}><ChevronsRight className="h-4 w-4" /></Button>
                </TooltipTrigger>
                <TooltipContent>Último</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      <CardContent className="p-4 space-y-5">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative">
            <div className="h-20 w-20 rounded-2xl bg-brand-blue/10 border-2 border-brand-blue/20 grid place-items-center">
              <Building2 className="h-10 w-10 text-brand-blue/70" />
            </div>
            {posicao === -1 && (
              <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-brand-blue border-2 border-card grid place-items-center">
                <Plus className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
          
          <div className="space-y-1 w-full">
            <div className="font-display text-lg font-semibold text-foreground leading-tight line-clamp-2" title={displayName}>
              {displayName}
            </div>
            <div className="flex items-center justify-center gap-2">
              <Badge variant="secondary" className="font-mono text-[10px] tracking-tighter py-0">
                {cnpjMasked}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-3">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <div className="h-px flex-1 bg-border/50" />
              Resumo Operacional
              <div className="h-px flex-1 bg-border/50" />
            </div>
            
            <div className="grid gap-3">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 h-6 w-6 rounded bg-muted/50 grid place-items-center shrink-0">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-muted-foreground leading-none mb-0.5">Telefone</div>
                  <div className="text-xs font-medium truncate">{form.contatoTel || "—"}</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 h-6 w-6 rounded bg-muted/50 grid place-items-center shrink-0">
                  <FileText className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-muted-foreground leading-none mb-0.5">Atividade Principal</div>
                  <div className="text-xs font-medium line-clamp-2 leading-snug" title={form.cnaeDesc}>
                    {form.cnaeDesc || "—"}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 h-6 w-6 rounded bg-muted/50 grid place-items-center shrink-0">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-muted-foreground leading-none mb-0.5">Localização</div>
                  <div className="text-xs font-medium truncate">
                    {form.municipio ? `${form.municipio} - ${form.uf}` : "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <div className={`rounded-xl p-3 text-xs flex items-center justify-between ${posicao === -1 ? 'bg-warn/10 text-warn border border-warn/20' : 'bg-success/10 text-success border border-success/20'}`}>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${posicao === -1 ? 'bg-warn animate-pulse' : 'bg-success'}`} />
                <span className="font-semibold">{posicao === -1 ? 'Rascunho' : 'Cadastrado'}</span>
              </div>
              <span className="text-[10px] opacity-70">
                {form.aberturaRF ? `Início: ${form.aberturaRF}` : ""}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AssistantPanel({
  tipKey, onClose,
}: { tipKey: string | null; onClose?: () => void }) {
  const tip = (tipKey && TIPS[tipKey]) || GENERAL_TIP;

  // Floating position + size (persisted per-session in memory)
  const [pos, setPos] = useState<{ x: number; y: number }>(() => ({
    x: Math.max(16, window.innerWidth - 360),
    y: Math.max(16, window.innerHeight - 460),
  }));
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 340, h: 420 });
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  const onDragStart = (e: React.PointerEvent) => {
    // Don't start drag when interacting with buttons/links inside the header
    if ((e.target as HTMLElement).closest("button, a")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const nx = Math.min(Math.max(0, e.clientX - dragRef.current.dx), window.innerWidth - 80);
    const ny = Math.min(Math.max(0, e.clientY - dragRef.current.dy), window.innerHeight - 40);
    setPos({ x: nx, y: ny });
  };
  const onDragEnd = () => { dragRef.current = null; };

  return (
    <div
      className="fixed z-50 shadow-elevated rounded-2xl border border-brand-blue/40 bg-card overflow-hidden flex flex-col"
      style={{
        left: pos.x, top: pos.y,
        width: size.w, height: size.h,
        resize: "both", minWidth: 260, minHeight: 220,
        maxWidth: "90vw", maxHeight: "90vh",
      }}
      onMouseUp={(e) => {
        // sync size after native resize handle drag
        const el = e.currentTarget as HTMLDivElement;
        const w = el.offsetWidth; const h = el.offsetHeight;
        if (w !== size.w || h !== size.h) setSize({ w, h });
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-border bg-brand-blue/10 cursor-move select-none"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      >
        <div className="flex items-center gap-2 min-w-0">
          <GripVertical className="h-4 w-4 text-brand-blue/70 shrink-0" />
          <div className="h-7 w-7 rounded-full bg-brand-blue/20 grid place-items-center shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-brand-blue" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.16em] text-brand-blue font-medium leading-none">IA ajudante</div>
            <div className="text-sm font-semibold text-foreground truncate leading-tight mt-0.5">{tip.title}</div>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3 bg-card">
        <ul className="space-y-2 text-xs text-foreground/90">
          {tip.steps.map((s, i) => (
            <li key={i} className="flex gap-2">
              <Lightbulb className="h-3.5 w-3.5 text-warn shrink-0 mt-0.5" />
              <span>{s}</span>
            </li>
          ))}
        </ul>

        {tip.link && (
          <a
            href={tip.link.url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-brand-blue hover:underline"
          >
            {tip.link.label} <ExternalLink className="h-3 w-3" />
          </a>
        )}

        <Separator />

        <div className="text-[11px] text-muted-foreground leading-relaxed">
          Toque em qualquer campo do formulário para receber orientação específica sobre o que informar e onde encontrar a informação. Arraste pelo topo para reposicionar, e use o canto inferior direito para redimensionar.
        </div>
      </div>
    </div>
  );
}

/* -------------------------- Tributações (right) ------------------------- */

type TribKind = "federal" | "municipal" | "estadual";
const TRIB: Record<TribKind, { label: string; icon: any; accent: string }> = {
  federal: { label: "Federal", icon: Landmark, accent: "text-brand-blue" },
  municipal: { label: "Municipal", icon: Landmark, accent: "text-brand-blue" },
  estadual: { label: "Estadual", icon: Landmark, accent: "text-brand-purple" },
};

function TributacaoCard({ kind }: { kind: TribKind }) {
  const s = TRIB[kind];
  const Icon = s.icon;
  return (
    <div className="rounded-2xl border border-border bg-card/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/70">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${s.accent}`} />
          <span className="text-sm font-medium text-foreground">{s.label}</span>
        </div>
        
      </div>
      <div className="px-4 py-6 text-center text-xs text-muted-foreground">
        Nenhum registro. Adicione após salvar o cadastro base.
      </div>
    </div>
  );
}

/* --------------------------------- page --------------------------------- */

export default function EmpresaCadastro() {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const [section, setSection] = useState<SectionKey>("dados");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [saving, setSaving] = useState(false);

  const listaEmpresas = loadEmpresas();
  const posicao = recordId ? listaEmpresas.findIndex((e) => e.id === recordId) : -1;
  const irPara = (indice: number) => {
    const alvo = listaEmpresas[indice];
    if (alvo) navigate(`/preparativos/cadastros/empresas/${alvo.id}`);
  };

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));


  useEffect(() => {
    let cancelado = false;
    if (!routeId) {
      setRecordId(null);
      setCreatedAt(null);
      setForm(EMPTY_FORM);
      return;
    }
    const aplicar = (rec: EmpresaRecord) => {
      if (cancelado) return;
      setRecordId(rec.id);
      setCreatedAt(rec.createdAt);
      setForm({ ...EMPTY_FORM, ...(rec.raw as Partial<FormState>), regime: regimeDefinido(rec.regime) ? rec.regime : "" });
    };
    const rec = getEmpresa(routeId);
    if (rec) {
      aplicar(rec);
    } else {
      // Cache ainda não carregado: busca na nuvem antes de desistir.
      sincronizarEmpresas()
        .then(() => {
          if (cancelado) return;
          const atual = getEmpresa(routeId);
          if (atual) return aplicar(atual);
          toast.error("Empresa não encontrada");
          navigate("/preparativos/cadastros/empresas", { replace: true });
        })
        .catch(() => {
          if (cancelado) return;
          toast.error("Não foi possível carregar o cadastro");
        });
    }
    return () => {
      cancelado = true;
    };
  }, [routeId, navigate]);


  const handleSalvar = async () => {
    const problema = validarCadastroEmpresa(form);
    if (problema) {
      toast.error(problema);
      setSection("dados");
      return;
    }
    // Um cadastro novo com CNPJ já existente sobrescrevia a empresa ("atualizada") sem avisar.
    const duplicada = recordId ? null : findEmpresaPorCnpj(form.cnpj);
    if (duplicada && !window.confirm(`Já existe uma empresa com este CNPJ: «${duplicada.razao}».\nAtualizar o cadastro existente com os dados informados?`)) return;
    setSaving(true);
    try {
      const existente = recordId ? null : findEmpresaPorCnpj(form.cnpj);
      const rec: EmpresaRecord = {
        id: recordId ?? existente?.id ?? `EMP-${Date.now()}`,
        cnpj: form.cnpj,
        razao: form.razao,
        regime: form.regime,
        atividade:
          (form.classeAtividadeId
            ? loadAtividades().find((a) => a.id === form.classeAtividadeId)?.descricao
            : "") || form.cnaeDesc || "—",
        status: "Ativa",
        createdAt: createdAt ?? existente?.createdAt ?? new Date().toISOString(),
        raw: { ...form },
      };
      const salvo = await saveEmpresa(rec);
      setRecordId(salvo.id);
      setCreatedAt(salvo.createdAt);
      toast.success(
        `Empresa "${salvo.razao}" ${recordId || existente ? "atualizada" : "cadastrada"}`,
      );
      navigate("/preparativos/cadastros/empresas");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao salvar");
    } finally {
      setSaving(false);
    }

  };

  const handleBuscarCnpj = async () => {
    if (!form.cnpj.trim()) { toast.error("Informe o CNPJ"); return; }
    setLoadingCnpj(true);
    try {
      const d = await fetchCnpj(form.cnpj);
      const abertura = d.data_inicio_atividade
        ? d.data_inicio_atividade.split("-").reverse().join("/")
        : "";
      set({
        cnpj: fmtCnpj(d.cnpj || form.cnpj),
        razao: d.razao_social || "",
        fantasia: d.nome_fantasia || d.razao_social || "",
        cnae: String(d.cnae_fiscal || ""),
        cnaeDesc: d.cnae_fiscal_descricao || "",
        cep: d.cep ? fmtCep(String(d.cep)) : "",
        endereco: [d.descricao_tipo_de_logradouro, d.logradouro].filter(Boolean).join(" "),
        numero: d.numero || "",
        complemento: d.complemento || "",
        bairro: d.bairro || "",
        municipio: d.municipio || "",
        uf: d.uf || "",
        contatoTel: d.ddd_telefone_1 ? `(${String(d.ddd_telefone_1).slice(0,2)}) ${String(d.ddd_telefone_1).slice(2)}` : "",
        email: d.email || "",
        aberturaRF: abertura,
      });
      toast.success("Dados da Receita Federal preenchidos");
    } catch (e: any) {
      toast.error(e.message || "Falha ao consultar CNPJ");
    } finally { setLoadingCnpj(false); }
  };

  const handleBuscarCep = async () => {
    if (!form.cep.trim()) { toast.error("Informe o CEP"); return; }
    setLoadingCep(true);
    try {
      const d = await fetchCep(form.cep);
      set({
        endereco: d.street || form.endereco,
        bairro: d.neighborhood || form.bairro,
        municipio: d.city || form.municipio,
        uf: d.state || form.uf,
      });
      toast.success("Endereço preenchido via CEP");
    } catch (e: any) {
      toast.error(e.message || "Falha ao consultar CEP");
    } finally { setLoadingCep(false); }
  };

  const tipFocus = (k: string) => setActiveTip(k);

  return (
    <div className="space-y-4 -mx-2">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/50">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-brand-blue/10 border border-brand-blue/20 grid place-items-center shrink-0">
            <Building2 className="h-5 w-5 text-brand-blue" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-display font-bold text-foreground truncate">
              {recordId ? "Editar Empresa" : "Novo Cadastro de Empresa"}
            </h1>
            <p className="text-xs text-muted-foreground">Cadastre os dados básicos, fiscais e societários da unidade</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!assistantOpen && (
            <Button
              variant="outline" size="sm"
              className="rounded-full border-brand-blue/40 text-brand-blue hover:bg-brand-blue/5 h-9"
              onClick={() => setAssistantOpen(true)}
            >
              <Sparkles className="h-3.5 w-3.5 mr-2 animate-pulse" /> Assistente de IA
            </Button>
          )}
          <Button
            variant="ghost" size="sm"
            className="rounded-full h-9 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link to="/preparativos/cadastros/empresas">
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5 pt-2">
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <LeftPanel form={form} posicao={posicao} total={listaEmpresas.length} irPara={irPara} />
        </div>

        <div className="col-span-12 lg:col-span-6">
          <Card className="rounded-2xl border-border/70 shadow-sm overflow-hidden">
            <div className="bg-muted/30 border-b border-border/70 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {SECTION_TABS.find(t => t.key === section)?.icon && (
                  (() => {
                    const Icon = SECTION_TABS.find(t => t.key === section)?.icon;
                    return <Icon className="h-4 w-4 text-brand-blue" />;
                  })()
                )}
                <h2 className="text-sm font-bold text-foreground">
                  {SECTION_TITLES[section]}
                </h2>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">STEP {SECTION_TABS.findIndex(t => t.key === section) + 1}/4</Badge>
            </div>
            <CardContent className="p-6 space-y-6">

              {section === "dados" && (
                <DadosSection
                  form={form} set={set} onTip={tipFocus}
                  onBuscarCnpj={handleBuscarCnpj} loadingCnpj={loadingCnpj}
                  onBuscarCep={handleBuscarCep} loadingCep={loadingCep}
                />
              )}
              {section === "senhas" && <SenhasSection onTip={tipFocus} />}
              
              {section === "fiscal" && <FiscalSection />}
              {section === "societario" && (
                <SocietarioSection onTip={tipFocus} form={form} set={set} />
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/70">
                <div className="flex items-center gap-2">
                  <Button
                    className="rounded-full bg-brand-blue text-white hover:bg-brand-blue/90 px-8 h-10 font-bold shadow-glow"
                    onClick={handleSalvar}
                    disabled={saving}
                  >
                    {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando…</> : "Salvar Cadastro"}
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="rounded-full h-10 w-10 text-muted-foreground border-border/70"
                          onClick={() => { setForm(EMPTY_FORM); toast("Formulário limpo"); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Limpar formulário</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="flex items-center p-1 bg-muted/50 rounded-full border border-border/50">
                  {SECTION_TABS.map((t) => {
                    const Icon = t.icon;
                    const active = section === t.key;
                    return (
                      <TooltipProvider key={t.key}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setSection(t.key)}
                              className={`h-8 px-3 flex items-center gap-2 rounded-full transition-all ${
                                active ? "bg-card text-brand-blue shadow-sm border border-border/40"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {active && <span className="text-[10px] font-bold uppercase tracking-wider">{t.label.split(' ')[0]}</span>}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{t.label}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-3">
          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-card/40 px-4 py-2.5 flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-blue" />
              <span className="text-sm font-medium">Tributações</span>
            </div>
            <TributacaoCard kind="federal" />
            
            <TributacaoCard kind="municipal" />
            <TributacaoCard kind="estadual" />
          </div>
        </div>
      </div>

      {assistantOpen && (
        <AssistantPanel tipKey={activeTip} onClose={() => setAssistantOpen(false)} />
      )}
    </div>
  );
}

/* -------------------------------- sections ------------------------------ */

function DadosSection({
  form, set, onTip, onBuscarCnpj, loadingCnpj, onBuscarCep, loadingCep,
}: {
  form: FormState;
  set: (p: Partial<FormState>) => void;
  onTip: (k: string) => void;
  onBuscarCnpj: () => void; loadingCnpj: boolean;
  onBuscarCep: () => void; loadingCep: boolean;
}) {
  const inp = INPUT_CLASS;
  const btn = "h-10 rounded-lg shrink-0 border-brand-blue/40 text-brand-blue hover:bg-brand-blue/10";
  return (
    <>
      <div className="rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-4 flex items-start gap-4 shadow-sm">
        <div className="h-8 w-8 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0">
          <Wand2 className="h-4 w-4 text-brand-blue" />
        </div>
        <div className="text-xs text-foreground/80 leading-relaxed">
          <span className="font-bold text-brand-blue uppercase tracking-tighter mr-1.5">Dica de Produtividade:</span>
          Informe apenas o CNPJ e clique em <b>Buscar CNPJ</b>. O sistema preencherá automaticamente razão social, endereço, CNAE e dados de abertura via API da Receita Federal.
        </div>
      </div>

      <SectionCard title="Identificação">
        <div className="grid grid-cols-12 gap-x-4 gap-y-4">
          <Field label="CNPJ / CPF / CEI" required className="col-span-6" tipKey="cnpj" onFocusTip={onTip}>
            <div className="flex gap-2">
              <Input
                value={form.cnpj}
                onChange={(e) => set({ cnpj: fmtCnpj(e.target.value) })}
                placeholder="00.000.000/0000-00"
                className={`${inp} font-mono tracking-tight`}
              />
              <Button
                type="button" variant="outline"
                className={btn}
                onClick={onBuscarCnpj} disabled={loadingCnpj}
              >
                {loadingCnpj ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4 mr-1.5" />Buscar</>}
              </Button>
            </div>
          </Field>
          <Field label="Inscrição Estadual" className="col-span-3" tipKey="ie" onFocusTip={onTip}>
            <Input value={form.ie} onChange={(e) => set({ ie: e.target.value })} className={inp} />
          </Field>
          <Field label="Inscrição Municipal" required className="col-span-3" tipKey="im" onFocusTip={onTip}>
            <Input value={form.im} onChange={(e) => set({ im: e.target.value })} className={inp} />
          </Field>

          <Field label="Razão Social" required className="col-span-8" tipKey="razao" onFocusTip={onTip}>
            <Input value={form.razao} onChange={(e) => set({ razao: e.target.value })} className={inp} />
          </Field>
          <Field label="CNAE Principal" className="col-span-4" tipKey="cnae" onFocusTip={onTip}>
            <Input
              value={form.cnaeDesc}
              onChange={(e) => set({ cnaeDesc: e.target.value })}
              placeholder="Preenchido pela busca de CNPJ"
              className={inp}
            />
          </Field>

          <Field label="Nome Fantasia" required className="col-span-8" tipKey="fantasia" onFocusTip={onTip}>
            <Input value={form.fantasia} onChange={(e) => set({ fantasia: e.target.value })} className={inp} />
          </Field>
          <div className="col-span-4 flex items-end pb-2.5">
            <label className="flex items-center gap-2 text-xs text-foreground/80 cursor-pointer select-none">
              <input type="checkbox" id="trava" className="h-4 w-4 rounded border-border accent-brand-blue" />
              Bloquear lançamentos em atraso
            </label>
          </div>

          <Field
            label="Regime Tributário" required className="col-span-6"
            hint="Define as tabelas de apuração (DAS, IRPJ/CSLL, PIS/COFINS) e o checklist de fechamento da empresa."
          >
            <Select value={form.regime} onValueChange={(v) => set({ regime: v })}>
              <SelectTrigger className={inp} aria-label="Regime tributário">
                <SelectValue placeholder="Selecione o regime…" />
              </SelectTrigger>
              <SelectContent>
                {REGIMES_TRIBUTARIOS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <InlineDivider>Endereço</InlineDivider>
        <div className="grid grid-cols-12 gap-x-4 gap-y-4">
          <Field label="CEP" required className="col-span-3" tipKey="cep" onFocusTip={onTip}>
            <div className="flex gap-2">
              <Input
                value={form.cep}
                onChange={(e) => set({ cep: fmtCep(e.target.value) })}
                placeholder="00000-000"
                className={`${inp} font-mono tracking-tight`}
              />
              <Button
                type="button" variant="outline"
                className={btn}
                onClick={onBuscarCep} disabled={loadingCep}
              >
                {loadingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </Field>
          <Field label="Logradouro" required className="col-span-7" tipKey="endereco" onFocusTip={onTip}>
            <Input value={form.endereco} onChange={(e) => set({ endereco: e.target.value })} className={inp} />
          </Field>
          <Field label="Número" required className="col-span-2" tipKey="numero" onFocusTip={onTip}>
            <Input value={form.numero} onChange={(e) => set({ numero: e.target.value })} className={inp} />
          </Field>

          <Field label="Complemento" className="col-span-3">
            <Input value={form.complemento} onChange={(e) => set({ complemento: e.target.value })} className={inp} />
          </Field>
          <Field label="Bairro" className="col-span-3">
            <Input value={form.bairro} onChange={(e) => set({ bairro: e.target.value })} className={inp} />
          </Field>
          <Field label="Município" className="col-span-4">
            <Input value={form.municipio} onChange={(e) => set({ municipio: e.target.value })} className={inp} />
          </Field>
          <Field label="UF" className="col-span-2">
            <Input
              value={form.uf}
              onChange={(e) => set({ uf: e.target.value.toUpperCase().slice(0,2) })}
              maxLength={2}
              className={`${inp} uppercase tracking-widest text-center font-mono`}
            />
          </Field>
        </div>

        <InlineDivider>Contatos</InlineDivider>
        <div className="grid grid-cols-12 gap-x-4 gap-y-4">
          <Field label="Nome do contato" className="col-span-6" tipKey="contatoNome" onFocusTip={onTip}>
            <Input value={form.contatoNome} onChange={(e) => set({ contatoNome: e.target.value })} className={inp} />
          </Field>
          <Field label="CPF" className="col-span-3">
            <Input value={form.contatoCpf} onChange={(e) => set({ contatoCpf: e.target.value })} className={`${inp} font-mono`} />
          </Field>
          <Field label="Telefone" className="col-span-3">
            <Input value={form.contatoTel} onChange={(e) => set({ contatoTel: e.target.value })} className={`${inp} font-mono`} />
          </Field>

          <Field label="E-mail" className="col-span-6" tipKey="email" onFocusTip={onTip}>
            <Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} className={inp} />
          </Field>
          <Field label="Celular / WhatsApp" className="col-span-3" tipKey="whatsapp" onFocusTip={onTip}>
            <Input value={form.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} className={`${inp} font-mono`} />
          </Field>
          <Field label="Site" className="col-span-3">
            <Input value={form.site} onChange={(e) => set({ site: e.target.value })} placeholder="https://" className={inp} />
          </Field>
        </div>

        <InlineDivider>Responsável técnico</InlineDivider>
        <div className="grid grid-cols-12 gap-x-4 gap-y-4">
          <Field label="Nome do responsável" className="col-span-8" tipKey="respNome" onFocusTip={onTip}>
            <Input value={form.respNome} onChange={(e) => set({ respNome: e.target.value })} className={inp} />
          </Field>
          <Field label="Tipo de documento" required className="col-span-4">
            <Select value={form.respTipo} onValueChange={(v) => set({ respTipo: v })}>
              <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="cnpj">CNPJ</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="CPF do responsável" className="col-span-6" tipKey="respCpf" onFocusTip={onTip}>
            <Input value={form.respCpf} onChange={(e) => set({ respCpf: e.target.value })} className={`${inp} font-mono`} />
          </Field>
          <Field label="CNPJ do responsável" className="col-span-6" tipKey="respCnpj" onFocusTip={onTip}>
            <Input value={form.respCnpj} onChange={(e) => set({ respCnpj: e.target.value })} className={`${inp} font-mono`} />
          </Field>
        </div>
      </SectionCard>
    </>
  );
}

function SenhasSection({ onTip }: { onTip: (k: string) => void }) {
  return (
    <>
      <AvisoAbaIlustrativa>
        Os campos desta aba são <b>ilustrativos</b>: nenhuma senha ou código digitado aqui é gravado pelo sistema.
      </AvisoAbaIlustrativa>
      <SectionCard title="Geral">
        <div className="grid grid-cols-2 gap-3" onFocus={() => onTip("senhas")}>
          <Field label="Senha Previdência"><Input type="password" className={INPUT_CLASS} /></Field>
          <Field label="Senha de acesso ao SEFAZ"><Input type="password" className={INPUT_CLASS} /></Field>
          <Field label="Código de Acesso e-Cac" className="col-span-2"><Input type="password" className={INPUT_CLASS} /></Field>
          <Field label="Código de Acesso ao Simples" className="col-span-2"><Input type="password" className={INPUT_CLASS} /></Field>
        </div>
      </SectionCard>

      <SectionCard title="SerPro">
        <div className="text-xs font-medium text-foreground mb-2">SerPro</div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Consumer Key"><Input className={INPUT_CLASS} /></Field>
          <Field label="Consumer Secret"><Input className={INPUT_CLASS} /></Field>
        </div>
        <div className="text-xs font-medium text-foreground mt-4 mb-2">Prefeitura Espião</div>
        <div className="grid grid-cols-1 gap-3">
          <Field label="Usuário Prefeitura ou Hash Validador"><Input className={INPUT_CLASS} /></Field>
          <Field label="Senha Prefeitura"><Input type="password" className={INPUT_CLASS} /></Field>
        </div>
        <div className="text-xs font-medium text-foreground mt-4 mb-2">GOV.BR</div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="CPF"><Input className={INPUT_CLASS} /></Field>
          <Field label="Senha"><Input type="password" className={INPUT_CLASS} /></Field>
        </div>
      </SectionCard>

      <div className="flex justify-center">
        <Button asChild variant="outline" className="rounded-full border-brand-blue/40 text-brand-blue">
          <Link to="/preparativos/empresa/certificados">Certificado Digital</Link>
        </Button>
      </div>
    </>
  );
}


function FiscalSection() {
  return (
    <>
      <AvisoAbaIlustrativa>
        Os campos desta aba são <b>ilustrativos</b> e ainda não são gravados no cadastro da empresa.
      </AvisoAbaIlustrativa>
      <SectionCard title="Livro">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Registro de Entradas"><Input className={INPUT_CLASS} /></Field>
          <Field label="Registro de Saídas"><Input className={INPUT_CLASS} /></Field>
          <Field label="Registro Ap. ICMS"><Input className={INPUT_CLASS} /></Field>
          <Field label="Registro Inventário"><Input className={INPUT_CLASS} /></Field>
          <Field label="Reg. Prest. Serviços"><Input className={INPUT_CLASS} /></Field>
          <Field label="Reg. Ciap"><Input className={INPUT_CLASS} /></Field>
          <Field label="Reg. Apuração IPI"><Input className={INPUT_CLASS} /></Field>
        </div>
      </SectionCard>
      <div className="flex justify-center gap-3">
        <Button asChild variant="outline" className="rounded-full border-brand-blue/40 text-brand-blue">
          <Link to="/fiscal/documentos/cupons">Emissor Cupom Fiscal</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full border-brand-blue/40 text-brand-blue">
          <Link to="/preparativos/empresa/parametros">Complementos Diversos</Link>
        </Button>
      </div>
    </>
  );
}

function SocietarioSection({
  onTip, form, set,
}: {
  onTip: (k: string) => void;
  form: FormState;
  set: (patch: Partial<FormState>) => void;
}) {
  const { atividades } = useAtividades();
  return (
    <>
      <div className="flex justify-center gap-2">
        {["Capital Social", "Registro Comercial", "Sócios"].map((t, i) => (
          <Button
            key={t}
            variant={i === 1 ? "default" : "outline"}
            className={`rounded-full ${i === 1 ? "bg-brand-blue text-white hover:bg-brand-blue/90" : "border-brand-blue/40 text-brand-blue"}`}
          >
            {t}
          </Button>
        ))}
      </div>

      <AvisoAbaIlustrativa>
        Nesta aba só a <b>Classe de atividade</b> é gravada; os demais campos são <b>ilustrativos</b> e ainda não são salvos.
      </AvisoAbaIlustrativa>
      <SectionCard title="Geral">
        <div className="grid grid-cols-12 gap-3">
          <Field label="Núm. do Alvará" className="col-span-4"><Input className={INPUT_CLASS} /></Field>
          <Field label="Metragem Imóvel" className="col-span-4"><Input className={INPUT_CLASS} /></Field>
          <Field label="Código Estado" className="col-span-2"><Input className={INPUT_CLASS} /></Field>
          <Field label="Tipo de Empresa" className="col-span-2">
            <Select><SelectTrigger className={INPUT_CLASS}><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent><SelectItem value="5">EMPRESA - 5</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Natureza Jurídica" className="col-span-12" tipKey="natureza" onFocusTip={onTip}>
            <Input placeholder="Ex.: 213-5 - Empresário (Individual)" className={INPUT_CLASS} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Registros">
        <div className="grid grid-cols-12 gap-3">
          <Field label="Descrição do Órgão de Registro" className="col-span-5"><Input className={INPUT_CLASS} /></Field>
          <Field label="Órgão de Registro" className="col-span-3">
            <Select><SelectTrigger className={INPUT_CLASS}><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent><SelectItem value="outros">Outros</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Número de Registro" className="col-span-4"><Input className={INPUT_CLASS} /></Field>

          <Field label="Nº Última Alteração" className="col-span-4"><Input className={INPUT_CLASS} /></Field>
          <Field label="Data Última Alteração" className="col-span-4"><Input placeholder="dd/mm/aaaa" className={INPUT_CLASS} /></Field>
          <Field label="NIRE" className="col-span-4"><Input className={INPUT_CLASS} /></Field>

          <Field label="Enq. Comercial" className="col-span-3">
            <Select><SelectTrigger className={INPUT_CLASS}><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent><SelectItem value="me">ME</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Classe de Atividade" className="col-span-9">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Select
                  value={form.classeAtividadeId}
                  onValueChange={(v) => set({ classeAtividadeId: v })}
                >
                  <SelectTrigger className={INPUT_CLASS}>
                    <SelectValue placeholder="Selecione a classe cadastrada…" />
                  </SelectTrigger>
                  <SelectContent>
                    {atividades
                      .filter((a) => a.status === "Ativa")
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>{formatAtividade(a)}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button asChild variant="outline" size="sm" className="rounded-full shrink-0 border-brand-blue/30 text-brand-blue hover:bg-brand-blue/5">
                  <Link to="/preparativos/cadastros/classe-atividades">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Novo
                  </Link>
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground/70 italic ml-1">Vincule esta empresa a uma classe de atividade para automação fiscal</p>
            </div>
          </Field>

          <Field label="Código de Imobilizado" className="col-span-3"><Input className={INPUT_CLASS} /></Field>
          <Field label="Grupo econômico" className="col-span-3">
            <Select><SelectTrigger className={INPUT_CLASS}><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent><SelectItem value="nao">Não</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Documento" className="col-span-3">
            <Select><SelectTrigger className={INPUT_CLASS}><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent><SelectItem value="recibo">Recibo</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Classe" className="col-span-3">
            <Select><SelectTrigger className={INPUT_CLASS}><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent><SelectItem value="a">A</SelectItem></SelectContent>
            </Select>
          </Field>
        </div>
      </SectionCard>
    </>
  );
}
