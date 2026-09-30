import { useId, type ReactNode } from "react";
import {
  cn, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea,
} from "@/design-system/mj-design-system-db98fa";
import CampoNumeroBR from "@/components/contabil/CampoNumeroBR";

const SPAN: Record<number, string> = { 1: "sm:col-span-1", 2: "sm:col-span-2", 3: "sm:col-span-3", 4: "sm:col-span-4", 6: "sm:col-span-6" };

export function Campo({ rotulo, ajuda, obrigatorio, span = 2, children, htmlFor }: {
  rotulo: string; ajuda?: string; obrigatorio?: boolean; span?: 1 | 2 | 3 | 4 | 6; children: ReactNode; htmlFor?: string;
}) {
  return (
    <div className={cn("space-y-1.5", SPAN[span])}>
      <Label htmlFor={htmlFor} className="text-xs">
        {rotulo}
        {obrigatorio ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {ajuda ? <p className="text-[11px] leading-snug text-muted-foreground">{ajuda}</p> : null}
    </div>
  );
}

export function CampoTexto({ rotulo, valor, onChange, ajuda, obrigatorio, span, mono, placeholder, maxLength, disabled }: {
  rotulo: string; valor?: string; onChange: (v: string) => void; ajuda?: string; obrigatorio?: boolean;
  span?: 1 | 2 | 3 | 4 | 6; mono?: boolean; placeholder?: string; maxLength?: number; disabled?: boolean;
}) {
  const id = useId();
  return (
    <Campo rotulo={rotulo} ajuda={ajuda} obrigatorio={obrigatorio} span={span} htmlFor={id}>
      <Input
        id={id}
        className={cn("rounded-xl", mono && "font-mono text-xs")}
        value={valor ?? ""}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </Campo>
  );
}

export function CampoAreaTexto({ rotulo, valor, onChange, span = 6, placeholder }: {
  rotulo: string; valor?: string; onChange: (v: string) => void; span?: 1 | 2 | 3 | 4 | 6; placeholder?: string;
}) {
  const id = useId();
  return (
    <Campo rotulo={rotulo} span={span} htmlFor={id}>
      <Textarea id={id} className="rounded-xl" rows={2} value={valor ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Campo>
  );
}

export function CampoNumero({ rotulo, valor, onChange, ajuda, span, sufixo, casasDecimais }: {
  rotulo: string; valor?: number; onChange: (v: number | undefined) => void; ajuda?: string; span?: 1 | 2 | 3 | 4 | 6; sufixo?: string;
  casasDecimais?: number;
}) {
  const id = useId();
  return (
    <Campo rotulo={sufixo ? `${rotulo} (${sufixo})` : rotulo} ajuda={ajuda} span={span} htmlFor={id}>
      <CampoNumeroBR id={id} className="rounded-xl text-right font-mono text-xs" value={valor} onChange={onChange} casasDecimais={casasDecimais} />
    </Campo>
  );
}

export function CampoSelecao<T extends string>({ rotulo, valor, onChange, opcoes, ajuda, obrigatorio, span, placeholder, rotuloOpcao }: {
  rotulo: string; valor?: T; onChange: (v: T) => void; opcoes: readonly T[]; ajuda?: string; obrigatorio?: boolean;
  span?: 1 | 2 | 3 | 4 | 6; placeholder?: string; rotuloOpcao?: (v: T) => string;
}) {
  return (
    <Campo rotulo={rotulo} ajuda={ajuda} obrigatorio={obrigatorio} span={span}>
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
