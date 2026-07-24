import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Badge, Button, Card, CardContent, Input, Label, Separator,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Tabs, TabsList, TabsTrigger,
} from "@/design-system/mj-design-system-db98fa";
import {
  ArrowLeft, Building2, ChevronDown, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Search, Plus, FileText, Trash2, Check,
  Landmark, KeyRound, Users2, DollarSign, Calculator, FileSignature,
  Users, MessageSquare, HelpCircle, CircleAlert, ChevronsUpDown,
} from "lucide-react";

type SectionKey = "dados" | "senhas" | "pessoal" | "fiscal" | "societario";

const SECTION_TABS: { key: SectionKey; label: string; icon: any }[] = [
  { key: "dados", label: "Dados empresa", icon: Landmark },
  { key: "senhas", label: "Senhas e Certificados", icon: KeyRound },
  { key: "pessoal", label: "Pessoal", icon: Users2 },
  { key: "fiscal", label: "Fiscal", icon: DollarSign },
  { key: "societario", label: "Societário", icon: FileSignature },
];

const SECTION_TITLES: Record<SectionKey, string> = {
  dados: "Dados empresa",
  senhas: "Senhas e Certificados",
  pessoal: "Pessoal",
  fiscal: "Fiscal",
  societario: "Societário",
};

/* ------------------------------- primitives ------------------------------- */

function Field({
  label, required, children, className = "",
}: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-[11px] font-medium text-muted-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function SectionCard({
  title, children, defaultOpen = true, actions,
}: { title: string; children: React.ReactNode; defaultOpen?: boolean; actions?: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 border-b border-border/70 bg-card/60"
      >
        <span className="text-sm font-medium text-foreground">{title}</span>
        <div className="flex items-center gap-2">
          {actions}
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition ${open ? "" : "-rotate-90"}`} />
        </div>
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

function InlineDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs uppercase tracking-[0.18em] text-brand-blue font-medium">{children}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

/* ---------------------------------- left ---------------------------------- */

function LeftPanel() {
  return (
    <Card className="rounded-2xl border-border/70">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7"><ChevronsLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7"><ChevronLeft className="h-4 w-4" /></Button>
          </div>
          <span className="font-mono">1 de 1 Registro</span>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7"><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7"><ChevronsRight className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="flex items-start justify-between">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link to="/preparativos/cadastros/empresas"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="h-16 w-16 rounded-full bg-muted grid place-items-center border border-border">
            <Building2 className="h-7 w-7 text-muted-foreground" />
          </div>
          <span className="h-2.5 w-2.5 rounded-full bg-success mt-2" />
        </div>

        <div className="text-center space-y-2">
          <div className="font-semibold text-foreground leading-tight">
            41.703.214 Helio Zanin Neto
          </div>
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            Código: <span className="text-brand-blue">694</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Cnpj : <span className="text-brand-blue">41.703.214/0001-01</span>
          </div>
        </div>

        <Separator />

        <dl className="space-y-2.5 text-xs">
          <div>
            <dt className="text-muted-foreground">Telefone</dt>
            <dd className="text-foreground font-medium">(43) 9974-8887</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Cnae - Descrição</dt>
            <dd className="text-foreground font-medium truncate">
              Confecção de peças de vestuário, exce…
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Abertura - Receita Federal</dt>
            <dd className="text-foreground font-medium">21/07/2026</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Início contrato</dt>
            <dd className="text-foreground font-medium">21/07/2026</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Tipo cadastro</dt>
            <dd className="text-success font-medium">Ativa</dd>
          </div>
        </dl>

        <div className="space-y-2 pt-1">
          <Select>
            <SelectTrigger className="rounded-lg h-9 text-xs">
              <SelectValue placeholder="Todos os módulos disponíveis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os módulos disponíveis</SelectItem>
              <SelectItem value="contabil">Contábil</SelectItem>
              <SelectItem value="fiscal">Fiscal</SelectItem>
              <SelectItem value="pessoal">Pessoal</SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="rounded-lg h-9 text-xs">
              <SelectValue placeholder="Todos os campos disponíveis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os campos disponíveis</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

/* --------------------------------- center --------------------------------- */

function DadosSection() {
  return (
    <>
      <SectionCard title="Geral">
        <div className="grid grid-cols-12 gap-3">
          <Field label="CNPJ/CPF/CEI" className="col-span-4">
            <div className="relative">
              <Input defaultValue="41.703.214/0001-01" className="pr-9 rounded-lg" />
              <FileText className="h-4 w-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </Field>
          <Field label="Inscrição Estadual" className="col-span-4">
            <Input className="rounded-lg" />
          </Field>
          <div className="col-span-4 flex items-end gap-2 pb-2">
            <input type="checkbox" id="trava" className="h-4 w-4 rounded border-border" />
            <label htmlFor="trava" className="text-xs text-foreground">Trava Atraso de Honorários</label>
          </div>

          <Field label="Inscrição Municipal" required className="col-span-4">
            <Input className="rounded-lg" />
          </Field>
          <Field label="CNAE Principal" className="col-span-8">
            <div className="relative">
              <Input defaultValue="Confecção de peças de vestuário, exceto de roupas íntimas e ro…" className="pr-9 rounded-lg" />
              <Search className="h-4 w-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </Field>

          <Field label="Razão Social" required className="col-span-12">
            <Input defaultValue="41.703.214 Helio Zanin Neto" className="rounded-lg" />
          </Field>
          <Field label="Nome Fantasia" required className="col-span-12">
            <Input defaultValue="41.703.214 Helio Zanin Neto" className="rounded-lg" />
          </Field>
        </div>

        <InlineDivider>Endereço</InlineDivider>
        <div className="grid grid-cols-12 gap-3">
          <Field label="CEP" required className="col-span-3">
            <div className="relative">
              <Input defaultValue="86800-470" className="pr-9 rounded-lg" />
              <Search className="h-4 w-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </Field>
          <Field label="Endereço" required className="col-span-7">
            <Input defaultValue="Rua Manoel Luiz da Silva" className="rounded-lg" />
          </Field>
          <Field label="Número" required className="col-span-2">
            <Input defaultValue="62" className="rounded-lg" />
          </Field>

          <Field label="Complemento" className="col-span-4"><Input className="rounded-lg" /></Field>
          <Field label="Bairro" className="col-span-4"><Input defaultValue="Vila Sao Carlos" className="rounded-lg" /></Field>
          <Field label="Município" className="col-span-4"><Input defaultValue="Apucarana" className="rounded-lg" /></Field>

          <Field label="Código Federal" className="col-span-4">
            <div className="relative">
              <Input defaultValue="0" className="pr-9 rounded-lg text-right" />
              <Search className="h-4 w-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </Field>
          <Field label="Data de Alteração Endereço" className="col-span-4">
            <Input placeholder="Ex 01/07/2026" className="rounded-lg" />
          </Field>
          <Field label="Gera Aniversário?" className="col-span-4">
            <Select defaultValue="nao">
              <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nao">Não</SelectItem>
                <SelectItem value="sim">Sim</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <InlineDivider>Contatos</InlineDivider>
        <div className="grid grid-cols-12 gap-3">
          <Field label="Nome" className="col-span-5"><Input defaultValue="Helio Zanin Neto" className="rounded-lg" /></Field>
          <Field label="CPF" className="col-span-3"><Input className="rounded-lg" /></Field>
          <Field label="Telefone" className="col-span-4"><Input defaultValue="55 (43) 9974-8887" className="rounded-lg" /></Field>

          <Field label="E-Mail" className="col-span-6"><Input defaultValue="cutterfilms@gmail.com" className="rounded-lg" /></Field>
          <Field label="Celular/WhatsApp" className="col-span-6"><Input defaultValue="55 (43) 9 9748-887_" className="rounded-lg" /></Field>

          <Field label="Página de Internet" className="col-span-12"><Input className="rounded-lg" /></Field>
        </div>

        <InlineDivider>Responsável técnico</InlineDivider>
        <div className="grid grid-cols-12 gap-3">
          <Field label="Responsável Técnico" className="col-span-8"><Input defaultValue="Matheus Antonio Zanin" className="rounded-lg" /></Field>
          <Field label="CPF do Responsável Técnico" className="col-span-4"><Input defaultValue="140.994.729-73" className="rounded-lg" /></Field>
          <Field label="CNPJ do Responsável Técnico" className="col-span-8"><Input defaultValue="14.099.472/973_-__" className="rounded-lg" /></Field>
          <Field label="Tipo" required className="col-span-4">
            <Select defaultValue="cpf">
              <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="cnpj">CNPJ</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </SectionCard>
    </>
  );
}

function SenhasSection() {
  return (
    <>
      <SectionCard title="Geral">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Senha Previdência"><Input type="password" className="rounded-lg" /></Field>
          <Field label="Senha de acesso ao SEFAZ"><Input type="password" className="rounded-lg" /></Field>
          <Field label="Código de Acesso e-Cac" className="col-span-2"><Input type="password" className="rounded-lg" /></Field>
          <Field label="Código de Acesso ao Simples" className="col-span-2"><Input type="password" className="rounded-lg" /></Field>
        </div>
      </SectionCard>

      <SectionCard title="SerPro">
        <div className="text-xs font-medium text-foreground mb-2">SerPro</div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Consumer Key"><Input className="rounded-lg" /></Field>
          <Field label="Consumer Secret"><Input className="rounded-lg" /></Field>
        </div>
        <div className="text-xs font-medium text-foreground mt-4 mb-2">Prefeitura Espião</div>
        <div className="grid grid-cols-1 gap-3">
          <Field label="Usuário Prefeitura ou Hash Validador"><Input className="rounded-lg" /></Field>
          <Field label="Senha Prefeitura"><Input type="password" className="rounded-lg" /></Field>
        </div>
        <div className="text-xs font-medium text-foreground mt-4 mb-2">GOV.BR</div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="CPF"><Input className="rounded-lg" /></Field>
          <Field label="Senha"><Input type="password" className="rounded-lg" /></Field>
        </div>
      </SectionCard>

      <div className="flex justify-center">
        <Button variant="outline" className="rounded-full border-brand-blue/40 text-brand-blue">
          Certificado Digital
        </Button>
      </div>
    </>
  );
}

function PessoalSection() {
  return (
    <>
      <SectionCard title="E-Social">
        <div className="grid grid-cols-12 gap-3">
          <Field label="Classificação Tributária" className="col-span-12">
            <div className="relative">
              <Input defaultValue="4 - MEI - Micro Empreendedor Individual;" className="pr-9 rounded-lg" />
              <Search className="h-4 w-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </Field>
          <Field label="Identificação do tipo de ação do evento S-1000 Inclusão/Alteração" className="col-span-12">
            <Select><SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="i">Inclusão</SelectItem>
                <SelectItem value="a">Alteração</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Data inclusão S-1000" className="col-span-4"><Input placeholder="Ex 01/07/2026" className="rounded-lg" /></Field>
          <Field label="Indicativo de Cooperativa" className="col-span-4">
            <Select defaultValue="0"><SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="0">0 - Não é cooperativa</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Indicativo de Construtora" className="col-span-4">
            <Select defaultValue="0"><SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="0">0 - Não é construtora</SelectItem></SelectContent>
            </Select>
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Geral">
        <div className="grid grid-cols-12 gap-3">
          <Field label="FPAS" required className="col-span-12">
            <div className="relative">
              <Input defaultValue="507 - Cooperativa - INDÚSTRIA - TRANSPORTE FERROVIÁRIO e de CARRIS URBANOS (inclusive cabos aé…" className="pr-9 rounded-lg" />
              <Search className="h-4 w-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </Field>
          <Field label="Sindicalizada?" className="col-span-3">
            <Select defaultValue="nao"><SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nao">Não</SelectItem><SelectItem value="sim">Sim</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Sindicato Profissional" className="col-span-9">
            <div className="relative">
              <Input defaultValue="MINISTERIO DO TRABALHO E EMPREGO - MTE" className="pr-9 rounded-lg" />
              <Search className="h-4 w-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </Field>
          <Field label="Grupo de CIPA" required className="col-span-12">
            <div className="relative">
              <Input defaultValue="C-01 - Indústria de Minerais" className="pr-9 rounded-lg" />
              <Search className="h-4 w-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </Field>
        </div>
        <div className="flex justify-center mt-4">
          <Button variant="outline" className="rounded-full border-brand-blue/40 text-brand-blue">Cartão Ponto</Button>
        </div>
      </SectionCard>

      <SectionCard title="PAT — Programa de Alimentação">
        <Tabs defaultValue="benef">
          <TabsList className="rounded-full bg-muted p-1 mb-4">
            <TabsTrigger value="benef" className="rounded-full data-[state=active]:bg-brand-blue data-[state=active]:text-white">Beneficiária</TabsTrigger>
            <TabsTrigger value="forn" className="rounded-full">Fornecedora</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Participa do PAT">
            <Select defaultValue="nao"><SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nao">Não</SelectItem><SelectItem value="sim">Sim</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Data Participa PAT"><Input placeholder="Ex 01/07/2026" className="rounded-lg" /></Field>
          <Field label="Número do Registro"><Input className="rounded-lg" /></Field>
        </div>
      </SectionCard>
    </>
  );
}

function FiscalSection() {
  return (
    <>
      <SectionCard title="Livro">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Registro de Entradas"><Input className="rounded-lg" /></Field>
          <Field label="Registro de Saídas"><Input className="rounded-lg" /></Field>
          <Field label="Registro Ap. ICMS"><Input className="rounded-lg" /></Field>
          <Field label="Registro Inventário"><Input className="rounded-lg" /></Field>
          <Field label="Reg. Prest. Serviços"><Input className="rounded-lg" /></Field>
          <Field label="Reg. Ciap"><Input className="rounded-lg" /></Field>
          <Field label="Reg. Apuração IPI" className="col-span-2 max-w-[calc(50%-0.375rem)]"><Input className="rounded-lg" /></Field>
        </div>
      </SectionCard>
      <div className="flex justify-center gap-3">
        <Button variant="outline" className="rounded-full border-brand-blue/40 text-brand-blue">Emissor Cupom Fiscal</Button>
        <Button variant="outline" className="rounded-full border-brand-blue/40 text-brand-blue">Complementos Diversos</Button>
      </div>
    </>
  );
}

function SocietarioSection() {
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

      <SectionCard title="Geral">
        <div className="grid grid-cols-12 gap-3">
          <Field label="Núm. do Alvará" className="col-span-4"><Input className="rounded-lg" /></Field>
          <Field label="Metragem Imóvel" className="col-span-4"><Input className="rounded-lg" /></Field>
          <Field label="Código Estado" className="col-span-2"><Input className="rounded-lg" /></Field>
          <Field label="Tipo de Empresa" className="col-span-2">
            <Select defaultValue="5"><SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="5">EMPRESA - 5</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Natureza Jurídica" required className="col-span-12">
            <div className="relative">
              <Input defaultValue="213-5 - Empresário (Individual)" className="pr-9 rounded-lg" />
              <Search className="h-4 w-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Registros">
        <div className="grid grid-cols-12 gap-3">
          <Field label="Descrição do Órgão de Registro" className="col-span-5"><Input className="rounded-lg" /></Field>
          <Field label="Órgão de Registro" className="col-span-3">
            <Select defaultValue="outros"><SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="outros">Outros</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Número de Registro" className="col-span-4"><Input className="rounded-lg" /></Field>

          <Field label="Nº Última Alteração" className="col-span-4"><Input className="rounded-lg" /></Field>
          <Field label="Data Última Alteração" className="col-span-4"><Input defaultValue="21/07/2026" className="rounded-lg" /></Field>
          <Field label="NIRE" className="col-span-4"><Input className="rounded-lg" /></Field>

          <Field label="Enq. Comercial" className="col-span-3">
            <Select defaultValue="me"><SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="me">ME</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Classe de Atividade" className="col-span-9">
            <div className="relative">
              <Input defaultValue="Outros - 63" className="pr-9 rounded-lg" />
              <Search className="h-4 w-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </Field>

          <Field label="Código de Imobilizado" className="col-span-3"><Input className="rounded-lg" /></Field>
          <Field label="Grupo Escritório" className="col-span-3">
            <Select defaultValue="nao"><SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nao">Não</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Documento" required className="col-span-3">
            <Select defaultValue="recibo"><SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="recibo">Recibo</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Classe" className="col-span-3">
            <Select defaultValue="a"><SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="a">A</SelectItem></SelectContent>
            </Select>
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Outros" defaultOpen={false}>
        <div className="text-xs text-muted-foreground">Informações complementares societárias.</div>
      </SectionCard>
    </>
  );
}

/* --------------------------------- right ---------------------------------- */

type TribKind = "federal" | "pessoal" | "municipal" | "estadual";

const TRIB_STYLE: Record<TribKind, { label: string; icon: any; accent: string; row: { data: string; tipo: string; extra: string; extraKey: string } }> = {
  federal: { label: "Federal", icon: Landmark, accent: "text-brand-blue", row: { data: "21/07/2026", tipo: "Simei", extra: "Indústria", extraKey: "Atividade" } },
  pessoal: { label: "Pessoal", icon: CircleAlert, accent: "text-warn", row: { data: "", tipo: "", extra: "", extraKey: "" } },
  municipal: { label: "Municipal", icon: Landmark, accent: "text-brand-blue", row: { data: "21/07/2026", tipo: "Simei", extra: "Com movim…", extraKey: "Tipo Mov…" } },
  estadual: { label: "Estadual", icon: Landmark, accent: "text-brand-purple", row: { data: "21/07/2026", tipo: "Isento", extra: "Sem movim…", extraKey: "Tipo Mov…" } },
};

function TributacaoCard({ kind }: { kind: TribKind }) {
  const s = TRIB_STYLE[kind];
  const Icon = s.icon;
  const isEmpty = kind === "pessoal";
  return (
    <div className="rounded-2xl border border-border bg-card/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/70">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${s.accent}`} />
          <span className="text-sm font-medium text-foreground">{s.label}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7"><FileText className="h-3.5 w-3.5 text-brand-blue" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7"><Calculator className="h-3.5 w-3.5 text-warn" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-brand-blue"><Plus className="h-4 w-4" /></Button>
        </div>
      </div>

      {isEmpty ? (
        <div className="px-4 py-6 text-center text-xs text-muted-foreground">Sem registros</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 px-4 py-2 text-[11px] text-muted-foreground border-b border-border/50">
            <span>Data Inicial</span>
            <span>Tipo de Tributação</span>
            <span>{s.row.extraKey}</span>
          </div>
          <div className="px-4 py-2 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Search className="h-3 w-3" />
            <span>Pesquisar por tipo tributação</span>
          </div>
          <div className="px-4 py-2 border-t border-border/50 grid grid-cols-[auto_auto_1fr_auto_auto] items-center gap-2 text-xs">
            <button className="h-5 w-5 rounded border border-success bg-success/10 grid place-items-center">
              <Check className="h-3 w-3 text-success" />
            </button>
            <button className="h-5 w-5 rounded border border-destructive bg-destructive/10 grid place-items-center">
              <Trash2 className="h-3 w-3 text-destructive" />
            </button>
            <span className="text-success font-mono">{s.row.data}</span>
            <span className="text-foreground">{s.row.tipo}</span>
            <span className="text-muted-foreground">{s.row.extra}</span>
          </div>
          <div className="px-4 py-2 flex items-center justify-center gap-2 text-[11px] text-muted-foreground border-t border-border/50">
            <ChevronLeft className="h-3 w-3" />
            <span className="px-2 py-0.5 rounded border border-border">1</span>
            <span>/ 1</span>
            <ChevronRight className="h-3 w-3" />
            <span className="ml-1">1 Registro</span>
          </div>
        </>
      )}
    </div>
  );
}

function RightPanel() {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card/40 px-4 py-2.5 flex items-center gap-2">
        <FileText className="h-4 w-4 text-brand-blue" />
        <span className="text-sm font-medium">Tributações</span>
      </div>
      <TributacaoCard kind="federal" />
      <TributacaoCard kind="pessoal" />
      <TributacaoCard kind="municipal" />
      <TributacaoCard kind="estadual" />
    </div>
  );
}

/* --------------------------------- page ----------------------------------- */

export default function EmpresaCadastro() {
  const [section, setSection] = useState<SectionKey>("dados");

  return (
    <div className="space-y-4 -mx-2">
      {/* Page title bar */}
      <div className="flex items-center gap-2 pb-1">
        <Building2 className="h-5 w-5 text-brand-blue" />
        <h1 className="text-lg font-semibold text-foreground">Empresas</h1>
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-3">
          <LeftPanel />
        </div>

        <div className="col-span-6">
          <Card className="rounded-2xl border-border/70">
            <CardContent className="p-4 space-y-4">
              <h2 className="text-center text-base font-semibold text-foreground">
                {SECTION_TITLES[section]}
              </h2>

              {section === "dados" && <DadosSection />}
              {section === "senhas" && <SenhasSection />}
              {section === "pessoal" && <PessoalSection />}
              {section === "fiscal" && <FiscalSection />}
              {section === "societario" && <SocietarioSection />}

              <div className="flex items-center justify-between pt-2">
                <Button className="rounded-full bg-brand-blue text-white hover:bg-brand-blue/90 px-6">
                  Salvar
                </Button>
                <div className="flex items-center gap-1">
                  {SECTION_TABS.map((t) => {
                    const Icon = t.icon;
                    const active = section === t.key;
                    return (
                      <button
                        key={t.key}
                        onClick={() => setSection(t.key)}
                        title={t.label}
                        className={`h-9 w-9 grid place-items-center rounded-full transition ${
                          active
                            ? "bg-brand-blue/15 text-brand-blue"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    );
                  })}
                  <button className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent">
                    <Users className="h-4 w-4" />
                  </button>
                  <button className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent">
                    <MessageSquare className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-3">
          <RightPanel />
        </div>
      </div>
    </div>
  );
}
