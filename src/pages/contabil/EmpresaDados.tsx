import { Link } from "react-router-dom";
import { useMemo } from "react";
import {
  Badge, Button, Card, CardContent, Progress,
} from "@/design-system/mj-design-system-db98fa";
import {
  Award, Banknote, Building2, CheckCircle2, Cog, CircleAlert, Pencil, ScrollText,
} from "lucide-react";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { getEmpresa } from "@/lib/empresasStore";
import { regimeDefinido } from "@/lib/regime";
import { useRegistros } from "@/lib/empresaDadosStore";
import AssistenteFechamento from "@/components/contabil/AssistenteFechamento";

export default function EmpresaDados() {
  const { empresa } = useEmpresaAtual();
  const registro = empresa ? getEmpresa(empresa.id) : undefined;
  const raw = (registro?.raw ?? {}) as Record<string, string>;

  const inscricoes = useRegistros("inscricoes", empresa?.id ?? null);
  const pagamentos = useRegistros("pagamentos", empresa?.id ?? null);
  const parametros = useRegistros("parametros", empresa?.id ?? null);
  const certificados = useRegistros("certificados", empresa?.id ?? null);

  const ficha = [
    { label: "Razão social", valor: registro?.razao },
    { label: "Nome fantasia", valor: raw.fantasia },
    { label: "CNPJ", valor: registro?.cnpj },
    { label: "Regime tributário", valor: regimeDefinido(registro?.regime) ? registro?.regime : "Não definido" },
    { label: "CNAE principal", valor: raw.cnae ? `${raw.cnae} — ${raw.cnaeDesc ?? ""}` : "" },
    { label: "Endereço", valor: [raw.endereco, raw.numero, raw.bairro].filter(Boolean).join(", ") },
    { label: "Município / UF", valor: [raw.municipio, raw.uf].filter(Boolean).join(" / ") },
    { label: "CEP", valor: raw.cep },
    { label: "E-mail", valor: raw.email },
    { label: "Telefone", valor: raw.contatoTel || raw.whatsapp },
    { label: "Responsável legal", valor: raw.respNome },
    { label: "Início do contrato", valor: raw.inicioContrato },
  ];

  const checklist = useMemo(
    () => [
      { ok: !!registro?.cnpj, label: "CNPJ informado", onde: "Cadastro da empresa" },
      { ok: regimeDefinido(registro?.regime), label: "Regime tributário definido", onde: "Cadastro da empresa" },
      { ok: !!raw.cnae, label: "CNAE principal informado", onde: "Cadastro da empresa" },
      { ok: !!raw.municipio, label: "Endereço completo", onde: "Cadastro da empresa" },
      { ok: inscricoes.length > 0, label: "Inscrições cadastradas", onde: "Empresa › Inscrições" },
      { ok: pagamentos.length > 0, label: "Conta de pagamento ativa", onde: "Empresa › Pagamentos" },
      { ok: parametros.length > 0, label: "Parâmetros definidos", onde: "Empresa › Parâmetros" },
      { ok: certificados.length > 0, label: "Certificado digital vinculado", onde: "Empresa › Certificados" },
    ],
    [registro, raw, inscricoes, pagamentos, parametros, certificados],
  );

  const completos = checklist.filter((c) => c.ok).length;
  const pct = Math.round((completos / checklist.length) * 100);

  const atalhos = [
    { to: "/preparativos/empresa/inscricoes", icon: ScrollText, titulo: "Inscrições", total: inscricoes.length },
    { to: "/preparativos/empresa/pagamentos", icon: Banknote, titulo: "Pagamentos", total: pagamentos.length },
    { to: "/preparativos/empresa/parametros", icon: Cog, titulo: "Parâmetros", total: parametros.length },
    { to: "/preparativos/empresa/certificados", icon: Award, titulo: "Certificados", total: certificados.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-brand-orange/12 grid place-items-center shrink-0">
            <Building2 className="h-5 w-5 text-brand-orange" />
          </div>
          <div>
            <h1 className="text-2xl font-display leading-tight">Dados da empresa</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Ficha cadastral, endereço, contatos e responsáveis da empresa selecionada.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Empresa: <span className="text-brand-orange">{empresa?.razao ?? "nenhuma selecionada"}</span>
            </p>
          </div>
        </div>
        {empresa ? (
          <Button className="rounded-lg bg-brand-orange hover:bg-brand-orange/90" asChild>
            <Link to={`/preparativos/cadastros/empresas/${empresa.id}`}>
              <Pencil className="h-4 w-4 mr-2" /> Editar cadastro
            </Link>
          </Button>
        ) : (
          <Button className="rounded-lg bg-brand-orange hover:bg-brand-orange/90" asChild>
            <Link to="/preparativos/cadastros/empresas/novo">Cadastrar empresa</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {atalhos.map((a) => (
          <Link key={a.to} to={a.to}>
            <Card className="rounded-xl shadow-card h-full hover:border-brand-orange/60 transition-colors">
              <CardContent className="p-5 space-y-2">
                <div className="h-9 w-9 rounded-lg bg-brand-orange/15 grid place-items-center">
                  <a.icon className="h-4 w-4 text-brand-orange" />
                </div>
                <div className="text-sm font-medium">{a.titulo}</div>
                <div className="text-2xl font-display">{a.total}</div>
                <p className="text-xs text-muted-foreground">registro(s) cadastrado(s)</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-xl shadow-card lg:col-span-2">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Ficha cadastral</div>
            {registro ? (
              <dl className="grid gap-4 sm:grid-cols-2">
                {ficha.map((f) => (
                  <div key={f.label}>
                    <dt className="text-xs text-muted-foreground">{f.label}</dt>
                    <dd className="text-sm text-foreground font-medium break-words">{f.valor || "—"}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma empresa selecionada. Cadastre uma empresa do grupo para visualizar a ficha.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-card">
          <CardContent className="p-5 space-y-4">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Completude do cadastro</div>
            <div className="flex items-center gap-3">
              <Progress value={pct} className="flex-1" />
              <Badge variant="secondary" className="rounded-full">{pct}%</Badge>
            </div>
            <ul className="space-y-2">
              {checklist.map((c) => (
                <li key={c.label} className="flex items-start gap-2 text-sm">
                  {c.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  ) : (
                    <CircleAlert className="h-4 w-4 text-warn mt-0.5 shrink-0" />
                  )}
                  <span className={c.ok ? "text-muted-foreground" : "text-foreground"}>
                    {c.label}
                    {!c.ok && <span className="block text-xs text-muted-foreground">{c.onde}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <AssistenteFechamento
        contexto={{
          tela: "Dados da empresa",
          modulo: "Preparativos › Empresa",
          empresa: registro
            ? { razao: registro.razao, cnpj: registro.cnpj, regime: registro.regime, dados: raw }
            : null,
          completudePercentual: pct,
          pendencias: checklist.filter((c) => !c.ok).map((c) => `${c.label} (${c.onde})`),
          totais: {
            inscricoes: inscricoes.length,
            pagamentos: pagamentos.length,
            parametros: parametros.length,
            certificados: certificados.length,
          },
        }}
        resumo={`Dados da empresa · ${empresa?.razao ?? "sem empresa"}`}
        rotulo="IA ajudante"
      />
    </div>
  );
}
