import { useId, type ReactNode } from "react";
import { Info, Sparkles } from "lucide-react";
import {
  cn, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea,
} from "@/design-system/mj-design-system-db98fa";
import CampoNumeroBR from "@/components/contabil/CampoNumeroBR";

const SPAN: Record<number, string> = { 1: "sm:col-span-1", 2: "sm:col-span-2", 3: "sm:col-span-3", 4: "sm:col-span-4", 6: "sm:col-span-6" };

/**
 * Rótulo do campo com a marcação de obrigatoriedade.
 *
 * Padrão visual do sistema: obrigatório recebe asterisco vermelho; opcional
 * recebe a etiqueta "opcional" em cinza. Assim o usuário distingue à primeira
 * vista o que precisa preencher do que pode deixar em branco.
 */
export function RotuloCampo({
  rotulo,
  obrigatorio,
  opcional,
  htmlFor,
}: {
  rotulo: string;
  obrigatorio?: boolean;
  opcional?: boolean;
  htmlFor?: string;
}) {
  return (
    <Label htmlFor={htmlFor} className="flex flex-wrap items-baseline gap-1.5 text-xs">
      <span>{rotulo}</span>
      {obrigatorio ? (
        <span className="text-destructive" title="Campo obrigatório">
          *
        </span>
      ) : opcional ? (
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
          opcional
        </span>
      ) : null}
    </Label>
  );
}

export function Campo({
  rotulo,
  ajuda,
  obrigatorio,
  opcional,
  /** De onde o valor veio (ex.: "preenchido pelo XML da NF-e"). */
  origem,
  span = 2,
  children,
  htmlFor,
}: {
  rotulo: string;
  ajuda?: string;
  obrigatorio?: boolean;
  opcional?: boolean;
  origem?: string;
  span?: 1 | 2 | 3 | 4 | 6;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className={cn("space-y-1.5", SPAN[span])}>
      <RotuloCampo
        rotulo={rotulo}
        obrigatorio={obrigatorio}
        opcional={opcional ?? !obrigatorio}
        htmlFor={htmlFor}
      />
      {children}
      {ajuda ? <AjudaCampo>{ajuda}</AjudaCampo> : null}
      {origem ? <OrigemCampo>{origem}</OrigemCampo> : null}
    </div>
  );
}

/** Texto de apoio do campo (o "por que" e o "onde isso é usado"). */
export function AjudaCampo({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-1 text-[11px] leading-snug text-muted-foreground">
      <Info className="mt-0.5 h-3 w-3 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** Indica que o valor foi trazido de outro cadastro — evita redigitação. */
export function OrigemCampo({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-1 text-[11px] leading-snug text-brand-blue">
      <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/**
 * Rodapé opcional de formulário: diz quantos campos são obrigatórios e
 * quantos já estão preenchidos, reduzindo a sensação de "formulário infinito".
 */
export function ResumoObrigatorios({
  obrigatoriosPendentes,
  totalObrigatorios,
}: {
  obrigatoriosPendentes: number;
  totalObrigatorios: number;
}) {
  if (!totalObrigatorios) return null;
  const completo = obrigatoriosPendentes === 0;
  return (
    <p
      className={cn(
        "flex items-center gap-1.5 text-[11px]",
        completo ? "text-success" : "text-muted-foreground",
      )}
    >
      <Info className="h-3 w-3 shrink-0" />
      {completo
        ? "Todos os campos obrigatórios estão preenchidos."
        : `${obrigatoriosPendentes} de ${totalObrigatorios} campo(s) obrigatório(s) pendente(s).`}
    </p>
  );
}

export function CampoTexto({
  rotulo, valor, onChange, ajuda, obrigatorio, opcional, origem, span, mono, placeholder, maxLength, disabled, acao,
}: {
  rotulo: string; valor?: string; onChange: (v: string) => void; ajuda?: string; obrigatorio?: boolean;
  opcional?: boolean; origem?: string;
  span?: 1 | 2 | 3 | 4 | 6; mono?: boolean; placeholder?: string; maxLength?: number; disabled?: boolean;
  /** Ação ao lado do campo (ex.: “Buscar dados” a partir do CNPJ ou do CEP). */
  acao?: ReactNode;
}) {
  const id = useId();
  const campo = (
    <Input
      id={id}
      className={cn("rounded-xl", mono && "font-mono text-xs")}
      value={valor ?? ""}
      placeholder={placeholder}
      maxLength={maxLength}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  );
  return (
    <Campo rotulo={rotulo} ajuda={ajuda} obrigatorio={obrigatorio} opcional={opcional} origem={origem} span={span} htmlFor={id}>
      {acao ? (
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">{campo}</div>
          <div className="shrink-0">{acao}</div>
        </div>
      ) : (
        campo
      )}
    </Campo>
  );
}

export function CampoAreaTexto({ rotulo, valor, onChange, span = 6, placeholder, ajuda, opcional }: {
  rotulo: string; valor?: string; onChange: (v: string) => void; span?: 1 | 2 | 3 | 4 | 6; placeholder?: string;
  ajuda?: string; opcional?: boolean;
}) {
  const id = useId();
  return (
    <Campo rotulo={rotulo} ajuda={ajuda} opcional={opcional} span={span} htmlFor={id}>
      <Textarea id={id} className="rounded-xl" rows={2} value={valor ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Campo>
  );
}

export function CampoNumero({ rotulo, valor, onChange, ajuda, obrigatorio, opcional, span, sufixo, casasDecimais }: {
  rotulo: string; valor?: number; onChange: (v: number | undefined) => void; ajuda?: string; obrigatorio?: boolean;
  opcional?: boolean; span?: 1 | 2 | 3 | 4 | 6; sufixo?: string; casasDecimais?: number;
}) {
  const id = useId();
  return (
    <Campo rotulo={sufixo ? `${rotulo} (${sufixo})` : rotulo} ajuda={ajuda} obrigatorio={obrigatorio} opcional={opcional} span={span} htmlFor={id}>
      <CampoNumeroBR id={id} className="rounded-xl text-right font-mono text-xs" value={valor} onChange={onChange} casasDecimais={casasDecimais} />
    </Campo>
  );
}

export function CampoSelecao<T extends string>({ rotulo, valor, onChange, opcoes, ajuda, obrigatorio, opcional, span, placeholder, rotuloOpcao }: {
  rotulo: string; valor?: T; onChange: (v: T) => void; opcoes: readonly T[]; ajuda?: string; obrigatorio?: boolean;
  opcional?: boolean; span?: 1 | 2 | 3 | 4 | 6; placeholder?: string; rotuloOpcao?: (v: T) => string;
}) {
  return (
    <Campo rotulo={rotulo} ajuda={ajuda} obrigatorio={obrigatorio} opcional={opcional} span={span}>
      <Select value={valor ?? ""} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger aria-label={rotulo} className="rounded-xl">
          <SelectValue placeholder={placeholder ?? "Selecione"} />
        </SelectTrigger>
        <SelectContent>
          {opcoes.map((o) => (
            <SelectItem key={o} value={o}>
              {rotuloOpcao ? rotuloOpcao(o) : o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Campo>
  );
}
