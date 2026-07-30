import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle, ChevronRight, Cog, Download, History, KeyRound, Lock, Power, Scale, Search,
  ShieldCheck, Split, Trash2, Users2, Pencil, Plus, Calculator,

} from "lucide-react";
import {
  Badge, Button, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle,
  Input, Label, Progress, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea,
} from "@/design-system/mj-design-system-db98fa";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import AssistenteCampos, { type CampoAjuda } from "@/components/contabil/AssistenteCampos";
import {
  ACOES, AREAS, CONTROLES_EVENT, CRITERIOS_RATEIO, PERFIS, PERMISSOES_PADRAO,
  alternarCentro, alternarPolitica, alternarUsuario, areasLiberadas, atualizarUsuario, avaliarAlcada, brl,
  conflitosSegregacao, convidarUsuario, dataBR, dataHoraBR, equalizarRateio, excecoesDoPerfil, excluirCentro,
  excluirParametro, excluirPolitica, excluirUsuario, faixaLabel, inconsistenciasAlcadas,
  listarCentros, listarLog, listarParametros, listarPoliticas, listarUsuarios, redefinirSenhaUsuario,
  resumoLog, resumoUsuarios, salvarCentro, salvarParametro, salvarPolitica, simularRateio, sincronizarUsuarios,

  totalRateio, usuariosCarregados,
  type AcaoPermissao, type Area, type CentroCusto, type Parametro, type Perfil, type Politica,
  type Usuario,
} from "@/lib/controlesStore";

/* ============================== apoio visual ============================= */

const TELAS: Record<string, { titulo: string; desc: string; icon: typeof Users2 }> = {
  usuarios: {
    titulo: "Usuários e permissões",
    desc: "Perfis de acesso por área, exceções ao padrão do perfil e checagem de segregação de funções.",
    icon: Users2,
  },
  "auditoria-log": {
    titulo: "Log de auditoria",
    desc: "Trilha somente leitura de alterações, acessos e decisões registradas no sistema.",
    icon: History,
  },
  "centros-custo": {
    titulo: "Centros de custo e rateio",
    desc: "Estrutura de centros, critérios de rateio com fechamento em 100% e simulação de apropriação.",
    icon: Split,
  },
  parametros: {
    titulo: "Parâmetros do sistema",
    desc: "Configurações gerais e de área, com justificativa obrigatória nos parâmetros sensíveis.",
    icon: Cog,
  },
  politicas: {
    titulo: "Políticas e alçadas",
    desc: "Faixas de aprovação por valor e área, com simulador de alçada e checagem de lacunas.",
    icon: Lock,
  },
};

const CHART_TOOLTIP = {
  contentStyle: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    fontSize: 12,
    color: "var(--foreground)",
  },
} as const;

function Kpi({ label, valor, hint, tom }: { label: string; valor: string; hint?: string; tom?: "alerta" | "ok" | "destaque" }) {
  const borda = tom === "alerta" ? "border-destructive/40 bg-destructive/5"
    : tom === "ok" ? "border-emerald-500/40 bg-emerald-500/5"
      : tom === "destaque" ? "border-brand-orange/40 bg-brand-orange/5"
        : "border-border/70";
  const cor = tom === "alerta" ? "text-destructive"
    : tom === "ok" ? "text-emerald-600 dark:text-emerald-400"
      : tom === "destaque" ? "text-brand-orange" : "";
  return (
    <div className={`min-w-0 rounded-2xl border p-4 ${borda}`}>
      <div className="text-[10px] uppercase leading-tight tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className={`mt-1 break-words font-mono text-lg ${cor}`}>{valor}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function useRefresh() {
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    window.addEventListener(CONTROLES_EVENT, refresh);
    return () => window.removeEventListener(CONTROLES_EVENT, refresh);
  }, [refresh]);
  return tick;
}

function exportarCSV(nome: string, linhas: Record<string, string | number>[]) {
  if (!linhas.length) { toast.error("Nada para exportar nesta visão."); return; }
  const cabecalho = Object.keys(linhas[0]);
  const csv = [cabecalho.join(";"), ...linhas.map((l) => cabecalho.map((c) => String(l[c] ?? "").replace(/;/g, ",")).join(";"))].join("\n");
  const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = `${nome}.csv`; a.click();
  URL.revokeObjectURL(url);
  toast.success("Relatório exportado em CSV.");
}

const numero = (v: string) => Number(String(v).replace(/\./g, "").replace(",", ".")) || 0;

function acao(fn: () => void, msg: string) {
  try { fn(); toast.success(msg); }
  catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível concluir."); }
}

async function acaoAsync(fn: () => Promise<unknown>, msg: string) {
  try { await fn(); toast.success(msg); }
  catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível concluir."); }
}


/* ========================= usuários e permissões ========================= */

const CAMPOS_USR: CampoAjuda[] = [
  { key: "nome", label: "Nome", required: true, ajuda: "Nome completo do colaborador, igual ao cadastro de pessoal do grupo." },
  { key: "email", label: "E-mail corporativo", required: true, ajuda: "Identificador de login. Use o domínio corporativo — contas pessoais não são aceitas em controle interno." },
  { key: "perfil", label: "Perfil", ajuda: "Conjunto padrão de permissões. Ajustes ponto a ponto viram exceção e ficam sinalizados na lista." },
  { key: "permissoes", label: "Permissões por área", ajuda: "Marque somente o necessário (menor privilégio). Aprovar junto com incluir/editar na mesma área gera conflito de segregação." },
  { key: "duploFator", label: "Duplo fator", ajuda: "Segundo fator de autenticação. Obrigatório para perfis com poder de aprovação ou encerramento." },
  { key: "ativo", label: "Situação", ajuda: "Usuário inativo perde acesso, mas permanece na trilha de auditoria para rastreabilidade." },
];

function DialogUsuario({ usuario, onClose, onSenha }: {
  usuario: Usuario | "novo";
  onClose: () => void;
  onSenha: (nome: string, email: string, senha: string) => void;
}) {

  const base = usuario === "novo" ? null : usuario;
  const [nome, setNome] = useState(base?.nome || "");
  const [email, setEmail] = useState(base?.email || "");
  const [cargo, setCargo] = useState(base?.cargo || "");
  const [perfil, setPerfil] = useState<Perfil>(base?.perfil || "Consulta");
  const [duploFator, setDuploFator] = useState(base?.duploFator ?? false);
  const [ativo, setAtivo] = useState(base?.ativo ?? true);
  const [observacao, setObservacao] = useState(base?.observacao || "");
  const [permissoes, setPermissoes] = useState<Record<Area, AcaoPermissao[]>>(() => {
    const mapa = Object.fromEntries(AREAS.map((a) => [a, [] as AcaoPermissao[]])) as Record<Area, AcaoPermissao[]>;
    (base?.permissoes || []).forEach((p) => { mapa[p.area] = [...p.acoes]; });
    return mapa;
  });

  const aplicarPadrao = (p: Perfil) => {
    const mapa = Object.fromEntries(AREAS.map((a) => [a, [] as AcaoPermissao[]])) as Record<Area, AcaoPermissao[]>;
    (PERMISSOES_PADRAO[p] || []).forEach((x) => { mapa[x.area] = [...x.acoes]; });
    setPermissoes(mapa);
  };

  const toggle = (area: Area, ac: AcaoPermissao) =>
    setPermissoes((prev) => {
      const atual = prev[area];
      const tem = atual.includes(ac);
      let novo = tem ? atual.filter((x) => x !== ac) : [...atual, ac];
      if (!tem && ac !== "visualizar" && !novo.includes("visualizar")) novo = ["visualizar", ...novo];
      if (tem && ac === "visualizar") novo = [];
      return { ...prev, [area]: novo };
    });

  const conflitos = AREAS.filter((a) =>
    permissoes[a].includes("aprovar") && permissoes[a].some((x) => x === "incluir" || x === "editar" || x === "excluir"));

  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    const permissoesLista = AREAS.filter((a) => permissoes[a].length).map((a) => ({ area: a, acoes: permissoes[a] }));
    setSalvando(true);
    try {
      if (base) {
        await atualizarUsuario(base.id, {
          nome: nome.trim(), cargo: cargo.trim(), perfil, duploFator, ativo,
          observacao: observacao.trim() || undefined, permissoes: permissoesLista,
        });
        toast.success("Usuário atualizado.");
      } else {
        const senha = await convidarUsuario({
          nome: nome.trim(), email: email.trim(), cargo: cargo.trim(), perfil, duploFator, ativo,
          observacao: observacao.trim() || undefined, permissoes: permissoesLista,
        });
        onSenha(nome.trim(), email.trim(), senha);
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  };


  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{base ? "Editar usuário" : "Novo usuário"}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <AssistenteCampos titulo="Usuários e permissões" campos={CAMPOS_USR} draft={{ nome, email, perfil }} />
        </div>
        <div className="grid gap-4 md:grid-cols-12">
          <div className="md:col-span-6">
            <Label>Nome</Label>
            <Input className="mt-1.5" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
          </div>
          <div className="md:col-span-6">
            <Label>E-mail corporativo</Label>
            <Input
              className="mt-1.5"
              value={email}
              disabled={!!base}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@grupo.com.br"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {base ? "E-mail de login não pode ser alterado." : "Será criada uma conta de acesso real com este e-mail."}
            </p>
          </div>

          <div className="md:col-span-6">
            <Label>Cargo</Label>
            <Input className="mt-1.5" value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Analista fiscal" />
          </div>
          <div className="md:col-span-6">
            <Label>Perfil</Label>
            <Select value={perfil} onValueChange={(v) => { setPerfil(v as Perfil); aplicarPadrao(v as Perfil); }}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{PERFIS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-2 rounded-2xl border border-border/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Permissões por área</div>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => aplicarPadrao(perfil)}>
              Aplicar padrão do perfil
            </Button>
          </div>
          <div className="mt-3 space-y-3">
            {AREAS.map((area) => (
              <div key={area} className="flex flex-wrap items-center gap-2 border-b border-border/50 pb-3 last:border-0">
                <div className="w-36 text-sm">{area}</div>
                {ACOES.map((ac) => {
                  const on = permissoes[area].includes(ac);
                  return (
                    <button
                      key={ac}
                      type="button"
                      onClick={() => toggle(area, ac)}
                      className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${on ? "border-brand-orange bg-brand-orange/15 text-brand-orange" : "border-border text-muted-foreground hover:bg-muted"}`}
                    >
                      {ac}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          {conflitos.length > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Conflito de segregação de funções em: {conflitos.join(", ")}. O mesmo usuário executa e aprova na área.</span>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-12">
          <div className="flex items-center gap-3 md:col-span-4">
            <Switch checked={duploFator} onCheckedChange={setDuploFator} />
            <Label className="cursor-pointer">Exigir duplo fator</Label>
          </div>
          <div className="flex items-center gap-3 md:col-span-4">
            <Switch checked={ativo} onCheckedChange={setAtivo} />
            <Label className="cursor-pointer">Acesso ativo</Label>
          </div>
          <div className="md:col-span-12">
            <Label>Observação</Label>
            <Textarea className="mt-1.5" rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Registro interno sobre o acesso concedido." />
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" className="rounded-full" onClick={onClose}>Cancelar</Button>
          <Button disabled={salvando} className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={salvar}>
            {salvando ? "Salvando…" : base ? "Salvar usuário" : "Criar acesso"}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}

function DialogSenha({ dados, onClose }: {
  dados: { nome: string; email: string; senha: string };
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Acesso criado</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          A conta de <strong className="text-foreground">{dados.nome}</strong> já existe de verdade e pode entrar no sistema.
          Repasse a senha provisória abaixo — ela só aparece uma vez e deve ser trocada no primeiro acesso.
        </p>
        <div className="space-y-2 rounded-2xl border border-border/70 p-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">E-mail de login</div>
            <div className="font-mono text-sm">{dados.email}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Senha provisória</div>
            <div className="font-mono text-lg text-brand-orange">{dados.senha}</div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => { navigator.clipboard?.writeText(`${dados.email} · ${dados.senha}`); toast.success("Credenciais copiadas."); }}
          >
            Copiar
          </Button>
          <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={onClose}>Concluir</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Usuarios() {
  const tick = useRefresh();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [edicao, setEdicao] = useState<Usuario | "novo" | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(!usuariosCarregados());
  const [erro, setErro] = useState("");
  const [credencial, setCredencial] = useState<{ nome: string; email: string; senha: string } | null>(null);

  useEffect(() => {
    let vivo = true;
    sincronizarUsuarios()
      .catch((e) => { if (vivo) setErro(e instanceof Error ? e.message : "Falha ao carregar usuários."); })
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, []);

  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return listarUsuarios().filter((u) => {

      if (filtro === "ativos" && !u.ativo) return false;
      if (filtro === "inativos" && u.ativo) return false;
      if (filtro === "conflito" && !conflitosSegregacao(u).length) return false;
      if (filtro === "sem2fa" && u.duploFator) return false;
      if (!t) return true;
      return [u.nome, u.email, u.perfil, u.cargo].join(" ").toLowerCase().includes(t);
    });
  }, [busca, filtro]);

  const r = resumoUsuarios();
  const porPerfil = PERFIS.map((p) => ({ perfil: p, qtd: listarUsuarios().filter((u) => u.perfil === p && u.ativo).length })).filter((x) => x.qtd);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Kpi label="Usuários" valor={String(r.total)} hint={`${r.ativos} ativos`} />
        <Kpi label="Inativos" valor={String(r.inativos)} hint="mantidos na trilha" />
        <Kpi label="Com poder de aprovar" valor={String(r.aprovadores)} tom="destaque" />
        <Kpi label="Sem duplo fator" valor={String(r.semDuploFator)} tom={r.semDuploFator ? "alerta" : "ok"} hint="entre os ativos" />
        <Kpi label="Conflito de segregação" valor={String(r.conflitos)} tom={r.conflitos ? "alerta" : "ok"} hint="executa e aprova" />
        <Kpi label="Perfis em uso" valor={String(porPerfil.length)} />
      </div>

      <Card className="rounded-3xl shadow-card">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por nome, e-mail ou perfil" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <Select value={filtro} onValueChange={setFiltro}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativos">Somente ativos</SelectItem>
                <SelectItem value="inativos">Somente inativos</SelectItem>
                <SelectItem value="conflito">Com conflito de segregação</SelectItem>
                <SelectItem value="sem2fa">Sem duplo fator</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="rounded-full" onClick={() => exportarCSV("usuarios-permissoes", lista.map((u) => ({
              Usuario: u.nome, Email: u.email, Perfil: u.perfil, Cargo: u.cargo,
              Areas: areasLiberadas(u).join(" / "), DuploFator: u.duploFator ? "Sim" : "Não",
              Situacao: u.ativo ? "Ativo" : "Inativo", UltimoAcesso: dataHoraBR(u.ultimoAcesso),
            })))}>
              <Download className="mr-1 h-4 w-4" />Exportar
            </Button>
            <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={() => setEdicao("novo")}>
              <Plus className="mr-1 h-4 w-4" />Novo usuário
            </Button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Áreas liberadas</TableHead>
                  <TableHead>Último acesso</TableHead>
                  <TableHead className="text-center">Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((u) => {
                  const conflito = conflitosSegregacao(u);
                  const excecoes = excecoesDoPerfil(u);
                  return (
                    <Fragment key={u.id}>
                      <TableRow className="cursor-pointer" onClick={() => setAberto(aberto === u.id ? null : u.id)}>
                        <TableCell>
                          <div className="font-medium">{u.nome}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </TableCell>
                        <TableCell>
                          <div>{u.perfil}</div>
                          {excecoes.length > 0 && <div className="text-[11px] text-brand-orange">exceção em {excecoes.join(", ")}</div>}
                        </TableCell>
                        <TableCell className="text-sm">{areasLiberadas(u).join(", ") || "—"}</TableCell>
                        <TableCell className="font-mono text-sm">{dataHoraBR(u.ultimoAcesso)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Badge className={`rounded-full ${u.ativo ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                              {u.ativo ? "Ativo" : "Inativo"}
                            </Badge>
                            {conflito.length > 0 && <Badge className="rounded-full bg-destructive/15 text-destructive">Segregação</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" title={u.ativo ? "Bloquear acesso" : "Reativar acesso"} onClick={() => acaoAsync(() => alternarUsuario(u.id), u.ativo ? "Acesso bloqueado." : "Acesso reativado.")}>
                              <Power className={`h-4 w-4 ${u.ativo ? "text-brand-orange" : "text-muted-foreground"}`} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Gerar nova senha provisória"
                              onClick={async () => {
                                try {
                                  const senha = await redefinirSenhaUsuario(u.id);
                                  setCredencial({ nome: u.nome, email: u.email, senha });
                                } catch (e) {
                                  toast.error(e instanceof Error ? e.message : "Não foi possível redefinir a senha.");
                                }
                              }}
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Editar" onClick={() => setEdicao(u)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" title="Excluir conta" onClick={() => acaoAsync(() => excluirUsuario(u.id), "Usuário excluído.")}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>

                          </div>
                        </TableCell>
                      </TableRow>
                      {aberto === u.id && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/30">
                            <div className="grid gap-4 p-2 md:grid-cols-3">
                              <div className="md:col-span-2">
                                <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Matriz de permissões</div>
                                <div className="mt-2 space-y-1 text-sm">
                                  {u.permissoes.map((p) => (
                                    <div key={p.area} className="flex flex-wrap items-center gap-2 border-b border-border/50 pb-1">
                                      <span className="w-36">{p.area}</span>
                                      {p.acoes.map((a) => (
                                        <Badge key={a} className="rounded-full bg-muted capitalize text-muted-foreground">{a}</Badge>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                                {conflito.length > 0 && (
                                  <div className="mt-3 flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>Segregação de funções comprometida em {conflito.join(", ")}: quem lança não deveria aprovar.</span>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2 text-sm">
                                <div><span className="text-muted-foreground">Cargo</span><div>{u.cargo || "—"}</div></div>
                                <div><span className="text-muted-foreground">Duplo fator</span><div>{u.duploFator ? "Ativo" : "Não exigido"}</div></div>
                                <div><span className="text-muted-foreground">Cadastrado em</span><div className="font-mono">{dataBR(u.criadoEm)}</div></div>
                                {u.observacao && <div><span className="text-muted-foreground">Observação</span><div>{u.observacao}</div></div>}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
                {!lista.length && (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Nenhum usuário nesta visão.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {edicao && (
        <DialogUsuario
          usuario={edicao}
          onClose={() => setEdicao(null)}
          onSenha={(nome, email, senha) => setCredencial({ nome, email, senha })}
        />
      )}
      {credencial && <DialogSenha dados={credencial} onClose={() => setCredencial(null)} />}

    </div>
  );
}

/* ============================ log de auditoria =========================== */

function LogAuditoria() {
  useRefresh();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [criticidade, setCriticidade] = useState("todas");

  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return listarLog().filter((l) => {
      if (categoria !== "todas" && l.categoria !== categoria) return false;
      if (criticidade !== "todas" && l.criticidade !== criticidade) return false;
      if (!t) return true;
      return [l.usuario, l.acao, l.registro, l.detalhe || ""].join(" ").toLowerCase().includes(t);
    });
  }, [busca, categoria, criticidade]);

  const r = resumoLog();
  const porCategoria = ["Usuários", "Centros de custo", "Parâmetros", "Políticas", "Acesso"]
    .map((c) => ({ categoria: c, qtd: listarLog().filter((l) => l.categoria === c).length }))
    .filter((x) => x.qtd);

  const tom = (c: string) =>
    c === "Crítico" ? "bg-destructive/15 text-destructive"
      : c === "Relevante" ? "bg-brand-orange/15 text-brand-orange"
        : "bg-muted text-muted-foreground";

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Registros na trilha" valor={String(r.total)} />
        <Kpi label="Eventos críticos" valor={String(r.criticos)} tom={r.criticos ? "alerta" : "ok"} />
        <Kpi label="Registrados hoje" valor={String(r.hoje)} tom="destaque" />
        <Kpi label="Usuários com atividade" valor={String(r.usuarios)} hint={r.ultima ? `último em ${dataHoraBR(r.ultima)}` : undefined} />
      </div>

      {porCategoria.length > 0 && (
        <Card className="rounded-3xl shadow-card">
          <CardContent className="p-5">
            <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Eventos por categoria</div>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porCategoria} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="categoria" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip {...CHART_TOOLTIP} />
                  <Bar dataKey="qtd" name="Eventos" fill="var(--brand-orange)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-3xl shadow-card">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por usuário, ação ou registro" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {["Usuários", "Centros de custo", "Parâmetros", "Políticas", "Acesso"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={criticidade} onValueChange={setCriticidade}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Toda criticidade</SelectItem>
                {["Crítico", "Relevante", "Informativo"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" className="rounded-full" onClick={() => exportarCSV("log-auditoria", lista.map((l) => ({
              DataHora: dataHoraBR(l.data), Usuario: l.usuario, Categoria: l.categoria, Acao: l.acao,
              Registro: l.registro, Criticidade: l.criticidade, Detalhe: l.detalhe || "",
            })))}>
              <Download className="mr-1 h-4 w-4" />Exportar
            </Button>
          </div>

          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Trilha somente leitura: os registros são gravados automaticamente pelas telas de controle interno.
          </div>

          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead className="text-center">Criticidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap font-mono text-sm">{dataHoraBR(l.data)}</TableCell>
                    <TableCell>{l.usuario}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.categoria}</TableCell>
                    <TableCell>
                      <div>{l.acao}</div>
                      {l.detalhe && <div className="text-xs text-muted-foreground">{l.detalhe}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{l.registro}</TableCell>
                    <TableCell className="text-center"><Badge className={`rounded-full ${tom(l.criticidade)}`}>{l.criticidade}</Badge></TableCell>
                  </TableRow>
                ))}
                {!lista.length && (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Nenhum evento nesta visão.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ========================== centros de custo ============================= */

const CAMPOS_CC: CampoAjuda[] = [
  { key: "codigo", label: "Código", required: true, ajuda: "Identificador do centro (CC-01). Usado nos lançamentos, requisições e relatórios gerenciais." },
  { key: "nome", label: "Nome", required: true, ajuda: "Denominação usada nos relatórios. Prefira o nome da área e não o do responsável." },
  { key: "responsavel", label: "Responsável", ajuda: "Gestor que responde pelo orçamento do centro e aprova o consumo." },
  { key: "criterio", label: "Critério de rateio", ajuda: "Base de distribuição dos custos indiretos: horas máquina, receita, headcount, área ocupada." },
  { key: "percentual", label: "Percentual", ajuda: "Participação no rateio. A soma dos centros ativos precisa fechar em 100%." },
  { key: "natureza", label: "Natureza", ajuda: "Produtivo, apoio, comercial ou administrativo — separa custo de produção de despesa operacional." },
];

function DialogCentro({ centro, onClose }: { centro: CentroCusto | "novo"; onClose: () => void }) {
  const base = centro === "novo" ? null : centro;
  const [codigo, setCodigo] = useState(base?.codigo || "");
  const [nome, setNome] = useState(base?.nome || "");
  const [responsavel, setResponsavel] = useState(base?.responsavel || "");
  const [criterio, setCriterio] = useState(base?.criterio || CRITERIOS_RATEIO[0]);
  const [percentual, setPercentual] = useState(String(base?.percentual ?? 0).replace(".", ","));
  const [natureza, setNatureza] = useState<CentroCusto["natureza"]>(base?.natureza || "Apoio");
  const [ativo, setAtivo] = useState(base?.ativo ?? true);

  const salvar = () => {
    try {
      salvarCentro({ id: base?.id, codigo: codigo.trim(), nome: nome.trim(), responsavel: responsavel.trim(), criterio, percentual: numero(percentual), natureza, ativo });
      toast.success(base ? "Centro de custo atualizado." : "Centro de custo cadastrado.");
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível salvar."); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-2xl">{base ? "Editar centro de custo" : "Novo centro de custo"}</DialogTitle></DialogHeader>
        <div className="flex justify-end">
          <AssistenteCampos titulo="Centros de custo e rateio" campos={CAMPOS_CC} draft={{ codigo, nome, criterio }} />
        </div>
        <div className="grid gap-4 md:grid-cols-12">
          <div className="md:col-span-3">
            <Label>Código</Label>
            <Input className="mt-1.5 font-mono" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="CC-06" />
          </div>
          <div className="md:col-span-9">
            <Label>Nome</Label>
            <Input className="mt-1.5" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Qualidade" />
          </div>
          <div className="md:col-span-6">
            <Label>Responsável</Label>
            <Input className="mt-1.5" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Gerência da área" />
          </div>
          <div className="md:col-span-6">
            <Label>Critério de rateio</Label>
            <Select value={criterio} onValueChange={setCriterio}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{CRITERIOS_RATEIO.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-4">
            <Label>Percentual de rateio</Label>
            <Input className="mt-1.5 text-right font-mono" value={percentual} onChange={(e) => setPercentual(e.target.value)} placeholder="0,00" />
          </div>
          <div className="md:col-span-4">
            <Label>Natureza</Label>
            <Select value={natureza} onValueChange={(v) => setNatureza(v as CentroCusto["natureza"])}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{["Produtivo", "Apoio", "Comercial", "Administrativo"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 md:col-span-4">
            <Switch checked={ativo} onCheckedChange={setAtivo} />
            <Label className="cursor-pointer">Centro ativo</Label>
          </div>
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" className="rounded-full" onClick={onClose}>Cancelar</Button>
          <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={salvar}>Salvar centro</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CentrosCusto() {
  useRefresh();
  const [edicao, setEdicao] = useState<CentroCusto | "novo" | null>(null);
  const [valorSimulado, setValorSimulado] = useState("120.000,00");

  const lista = listarCentros();
  const total = totalRateio(lista);
  const diferenca = Math.round((100 - total) * 100) / 100;
  const simulacao = simularRateio(numero(valorSimulado));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Centros cadastrados" valor={String(lista.length)} hint={`${lista.filter((c) => c.ativo).length} ativos`} />
        <Kpi label="Rateio distribuído" valor={`${total.toLocaleString("pt-BR")}%`} tom={diferenca === 0 ? "ok" : "alerta"} />
        <Kpi label="Diferença para 100%" valor={`${diferenca.toLocaleString("pt-BR")}%`} tom={diferenca === 0 ? "ok" : "alerta"} hint={diferenca === 0 ? "rateio fechado" : "ajuste necessário"} />
        <Kpi label="Centros produtivos" valor={String(lista.filter((c) => c.natureza === "Produtivo" && c.ativo).length)} tom="destaque" />
      </div>

      <Card className="rounded-3xl shadow-card">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Distribuição do rateio</div>
              <Progress value={Math.min(total, 100)} className="mt-2 h-2 w-64" />
              <div className={`mt-1 text-xs ${diferenca === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                {diferenca === 0 ? "Soma dos centros ativos fechada em 100%." : `Faltam ${diferenca.toLocaleString("pt-BR")} pontos percentuais para fechar o rateio.`}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => acao(() => equalizarRateio(), "Rateio equalizado em 100%.")}>
                <Calculator className="mr-1 h-4 w-4" />Equalizar em 100%
              </Button>
              <Button variant="outline" className="rounded-full" onClick={() => exportarCSV("centros-custo", lista.map((c) => ({
                Codigo: c.codigo, Centro: c.nome, Responsavel: c.responsavel, Criterio: c.criterio,
                Percentual: `${c.percentual}%`, Natureza: c.natureza, Situacao: c.ativo ? "Ativo" : "Inativo",
              })))}>
                <Download className="mr-1 h-4 w-4" />Exportar
              </Button>
              <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={() => setEdicao("novo")}>
                <Plus className="mr-1 h-4 w-4" />Novo centro
              </Button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Centro de custo</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Critério</TableHead>
                  <TableHead className="text-right">% rateio</TableHead>
                  <TableHead className="text-center">Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono">{c.codigo}</TableCell>
                    <TableCell>
                      <div className="font-medium">{c.nome}</div>
                      <div className="text-xs text-muted-foreground">{c.natureza}</div>
                    </TableCell>
                    <TableCell className="text-sm">{c.responsavel || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.criterio}</TableCell>
                    <TableCell className="text-right font-mono">{c.percentual.toLocaleString("pt-BR")}%</TableCell>
                    <TableCell className="text-center">
                      <Badge className={`rounded-full ${c.ativo ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                        {c.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => acao(() => alternarCentro(c.id), c.ativo ? "Centro inativado." : "Centro reativado.")}>
                          <Power className={`h-4 w-4 ${c.ativo ? "text-brand-orange" : "text-muted-foreground"}`} />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setEdicao(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => acao(() => excluirCentro(c.id), "Centro excluído.")}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!lista.length && (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Nenhum centro de custo cadastrado.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl shadow-card">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Simulador de apropriação</div>
              <Label className="mt-2 block text-xs text-muted-foreground">Valor a ratear</Label>
              <Input className="mt-1.5 w-48 text-right font-mono" value={valorSimulado} onChange={(e) => setValorSimulado(e.target.value)} />
            </div>
            <div className="text-xs text-muted-foreground">
              Distribuição proporcional aos percentuais dos centros ativos, no critério cadastrado.
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {simulacao.map((s) => (
              <div key={s.centro} className="rounded-2xl border border-border/70 p-4">
                <div className="text-sm">{s.centro}</div>
                <div className="mt-1 font-mono text-lg text-brand-orange">{brl(s.valor)}</div>
                <div className="text-[11px] text-muted-foreground">{s.percentual.toLocaleString("pt-BR")}% do valor</div>
              </div>
            ))}
            {!simulacao.length && <div className="text-sm text-muted-foreground">Nenhum centro ativo para simular.</div>}
          </div>
        </CardContent>
      </Card>

      {edicao && <DialogCentro centro={edicao} onClose={() => setEdicao(null)} />}
    </div>
  );
}

/* ============================== parâmetros =============================== */

const CAMPOS_PAR: CampoAjuda[] = [
  { key: "nome", label: "Parâmetro", required: true, ajuda: "O que a configuração controla. Use uma frase clara — o nome aparece na trilha de auditoria." },
  { key: "valor", label: "Valor atual", required: true, ajuda: "Conteúdo aplicado hoje: ativo/inativo, um limite em reais, um horário ou um prazo." },
  { key: "escopo", label: "Escopo", ajuda: "Global vale para todo o sistema; por área afeta apenas os módulos daquela área." },
  { key: "sensivel", label: "Parâmetro sensível", ajuda: "Marca configurações de controle interno (bloqueio de competência, alçadas, retenção). Exige justificativa e gera evento crítico." },
  { key: "justificativa", label: "Justificativa", ajuda: "Motivo da alteração. Fica anexado ao registro de auditoria para revisão posterior." },
];

function DialogParametro({ parametro, onClose }: { parametro: Parametro | "novo"; onClose: () => void }) {
  const base = parametro === "novo" ? null : parametro;
  const [nome, setNome] = useState(base?.nome || "");
  const [valor, setValor] = useState(base?.valor || "");
  const [escopo, setEscopo] = useState<Parametro["escopo"]>(base?.escopo || "Global");
  const [sensivel, setSensivel] = useState(base?.sensivel ?? false);
  const [descricao, setDescricao] = useState(base?.descricao || "");
  const [justificativa, setJustificativa] = useState("");

  const salvar = () => {
    try {
      salvarParametro({ id: base?.id, nome: nome.trim(), valor: valor.trim(), escopo, sensivel, descricao: descricao.trim(), justificativa });
      toast.success(base ? "Parâmetro atualizado." : "Parâmetro criado.");
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível salvar."); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-2xl">{base ? "Editar parâmetro" : "Novo parâmetro"}</DialogTitle></DialogHeader>
        <div className="flex justify-end">
          <AssistenteCampos titulo="Parâmetros do sistema" campos={CAMPOS_PAR} draft={{ nome, valor, escopo }} />
        </div>
        <div className="grid gap-4 md:grid-cols-12">
          <div className="md:col-span-12">
            <Label>Parâmetro</Label>
            <Input className="mt-1.5" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Bloqueio de competência encerrada" />
          </div>
          <div className="md:col-span-7">
            <Label>Valor atual</Label>
            <Input className="mt-1.5" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ativo" />
          </div>
          <div className="md:col-span-5">
            <Label>Escopo</Label>
            <Select value={escopo} onValueChange={(v) => setEscopo(v as Parametro["escopo"])}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Global">Global</SelectItem>
                {AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-12">
            <Label>Descrição</Label>
            <Textarea className="mt-1.5" rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="O que a configuração controla no dia a dia." />
          </div>
          <div className="flex items-center gap-3 md:col-span-12">
            <Switch checked={sensivel} onCheckedChange={setSensivel} />
            <Label className="cursor-pointer">Parâmetro sensível (controle interno)</Label>
          </div>
          {sensivel && (
            <div className="md:col-span-12">
              <Label>Justificativa da alteração</Label>
              <Textarea className="mt-1.5" rows={2} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Motivo aprovado pela controladoria." />
            </div>
          )}
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" className="rounded-full" onClick={onClose}>Cancelar</Button>
          <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={salvar}>Salvar parâmetro</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Parametros() {
  useRefresh();
  const [busca, setBusca] = useState("");
  const [escopo, setEscopo] = useState("todos");
  const [edicao, setEdicao] = useState<Parametro | "novo" | null>(null);

  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return listarParametros().filter((p) => {
      if (escopo !== "todos" && p.escopo !== escopo) return false;
      if (!t) return true;
      return [p.nome, p.valor, p.descricao].join(" ").toLowerCase().includes(t);
    });
  }, [busca, escopo]);

  const todos = listarParametros();

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Parâmetros" valor={String(todos.length)} />
        <Kpi label="Sensíveis" valor={String(todos.filter((p) => p.sensivel).length)} tom="destaque" hint="exigem justificativa" />
        <Kpi label="Escopo global" valor={String(todos.filter((p) => p.escopo === "Global").length)} />
        <Kpi label="Alterados em 2026" valor={String(todos.filter((p) => p.atualizadoEm.startsWith("2026")).length)} />
      </div>

      <Card className="rounded-3xl shadow-card">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar parâmetro" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <Select value={escopo} onValueChange={setEscopo}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os escopos</SelectItem>
                <SelectItem value="Global">Global</SelectItem>
                {AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" className="rounded-full" onClick={() => exportarCSV("parametros-sistema", lista.map((p) => ({
              Parametro: p.nome, Valor: p.valor, Escopo: p.escopo, Sensivel: p.sensivel ? "Sim" : "Não",
              AtualizadoEm: dataBR(p.atualizadoEm), AtualizadoPor: p.atualizadoPor,
            })))}>
              <Download className="mr-1 h-4 w-4" />Exportar
            </Button>
            <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={() => setEdicao("novo")}>
              <Plus className="mr-1 h-4 w-4" />Novo parâmetro
            </Button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parâmetro</TableHead>
                  <TableHead>Valor atual</TableHead>
                  <TableHead>Escopo</TableHead>
                  <TableHead>Atualização</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p.nome}</span>
                        {p.sensivel && <Badge className="rounded-full bg-brand-orange/15 text-brand-orange">Sensível</Badge>}
                      </div>
                      <div className="max-w-xl text-xs text-muted-foreground">{p.descricao}</div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{p.valor}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.escopo}</TableCell>
                    <TableCell className="text-sm">
                      <div className="font-mono">{dataBR(p.atualizadoEm)}</div>
                      <div className="text-xs text-muted-foreground">{p.atualizadoPor}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEdicao(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => acao(() => excluirParametro(p.id), "Parâmetro excluído.")}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!lista.length && (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Nenhum parâmetro nesta visão.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {edicao && <DialogParametro parametro={edicao} onClose={() => setEdicao(null)} />}
    </div>
  );
}

/* ========================== políticas e alçadas ========================== */

const CAMPOS_POL: CampoAjuda[] = [
  { key: "nome", label: "Política", required: true, ajuda: "Operação controlada: pagamento a fornecedor, baixa de bem, ajuste de apuração, compra de materiais." },
  { key: "area", label: "Área", ajuda: "Módulo em que a alçada é exigida. A mesma política pode ter faixas diferentes por área." },
  { key: "de", label: "Valor inicial", ajuda: "Piso da faixa. Use 0 para a primeira faixa da política." },
  { key: "ate", label: "Valor final", ajuda: "Teto da faixa. Deixe em branco para a faixa mais alta (sem limite superior)." },
  { key: "aprovador", label: "Aprovador", required: true, ajuda: "Cargo ou instância que libera a operação — não use nome de pessoa, para não travar em férias e desligamentos." },
  { key: "duplaAprovacao", label: "Dupla aprovação", ajuda: "Exige duas instâncias distintas. Recomendado nas faixas mais altas e em operações com caixa." },
];

function DialogPolitica({ politica, onClose }: { politica: Politica | "novo"; onClose: () => void }) {
  const base = politica === "novo" ? null : politica;
  const [nome, setNome] = useState(base?.nome || "");
  const [area, setArea] = useState<Area>(base?.area || "Administrativo");
  const [de, setDe] = useState(String(base?.de ?? 0).replace(".", ","));
  const [ate, setAte] = useState(base?.ate === null || base?.ate === undefined ? "" : String(base.ate).replace(".", ","));
  const [aprovador, setAprovador] = useState(base?.aprovador || "");
  const [dupla, setDupla] = useState(base?.duplaAprovacao ?? false);
  const [ativa, setAtiva] = useState(base?.ativa ?? true);

  const salvar = () => {
    try {
      salvarPolitica({ id: base?.id, nome: nome.trim(), area, de: numero(de), ate: ate.trim() ? numero(ate) : null, aprovador: aprovador.trim(), duplaAprovacao: dupla, ativa });
      toast.success(base ? "Alçada atualizada." : "Alçada criada.");
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível salvar."); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-2xl">{base ? "Editar alçada" : "Nova alçada"}</DialogTitle></DialogHeader>
        <div className="flex justify-end">
          <AssistenteCampos titulo="Políticas e alçadas" campos={CAMPOS_POL} draft={{ nome, area, aprovador }} />
        </div>
        <div className="grid gap-4 md:grid-cols-12">
          <div className="md:col-span-7">
            <Label>Política</Label>
            <Input className="mt-1.5" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Pagamento a fornecedor" />
          </div>
          <div className="md:col-span-5">
            <Label>Área</Label>
            <Select value={area} onValueChange={(v) => setArea(v as Area)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-4">
            <Label>Valor inicial</Label>
            <Input className="mt-1.5 text-right font-mono" value={de} onChange={(e) => setDe(e.target.value)} placeholder="0,00" />
          </div>
          <div className="md:col-span-4">
            <Label>Valor final</Label>
            <Input className="mt-1.5 text-right font-mono" value={ate} onChange={(e) => setAte(e.target.value)} placeholder="sem limite" />
          </div>
          <div className="md:col-span-4">
            <Label>Aprovador</Label>
            <Input className="mt-1.5" value={aprovador} onChange={(e) => setAprovador(e.target.value)} placeholder="Diretoria" />
          </div>
          <div className="flex items-center gap-3 md:col-span-6">
            <Switch checked={dupla} onCheckedChange={setDupla} />
            <Label className="cursor-pointer">Exigir dupla aprovação</Label>
          </div>
          <div className="flex items-center gap-3 md:col-span-6">
            <Switch checked={ativa} onCheckedChange={setAtiva} />
            <Label className="cursor-pointer">Alçada ativa</Label>
          </div>
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" className="rounded-full" onClick={onClose}>Cancelar</Button>
          <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={salvar}>Salvar alçada</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Politicas() {
  useRefresh();
  const [edicao, setEdicao] = useState<Politica | "novo" | null>(null);
  const lista = listarPoliticas();
  const nomes = Array.from(new Set(lista.map((p) => p.nome)));
  const [simNome, setSimNome] = useState(nomes[0] || "");
  const [simArea, setSimArea] = useState<Area>(lista[0]?.area || "Administrativo");
  const [simValor, setSimValor] = useState("25.000,00");

  const achados = inconsistenciasAlcadas();
  const resultado = simNome ? avaliarAlcada(simNome, simArea, numero(simValor)) : null;

  const ordenada = lista.slice().sort((a, b) => a.nome.localeCompare(b.nome) || a.de - b.de);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Alçadas cadastradas" valor={String(lista.length)} hint={`${lista.filter((p) => p.ativa).length} ativas`} />
        <Kpi label="Políticas distintas" valor={String(nomes.length)} />
        <Kpi label="Com dupla aprovação" valor={String(lista.filter((p) => p.duplaAprovacao && p.ativa).length)} tom="destaque" />
        <Kpi label="Inconsistências" valor={String(achados.length)} tom={achados.length ? "alerta" : "ok"} hint="lacunas e sobreposições" />
      </div>

      {achados.length > 0 && (
        <Card className="rounded-3xl border-destructive/40 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />Faixas com problema de cobertura
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {achados.map((a, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 border-b border-border/50 pb-2 last:border-0">
                  <Badge className="rounded-full bg-destructive/15 text-destructive">{a.tipo}</Badge>
                  <span className="font-medium">{a.politica}</span>
                  <span className="text-muted-foreground">· {a.area}</span>
                  <span className="text-muted-foreground">— {a.detalhe}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-3xl shadow-card">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Política</Label>
                <Select value={simNome} onValueChange={setSimNome}>
                  <SelectTrigger className="mt-1.5 w-60"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{nomes.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Área</Label>
                <Select value={simArea} onValueChange={(v) => setSimArea(v as Area)}>
                  <SelectTrigger className="mt-1.5 w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>{AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Valor da operação</Label>
                <Input className="mt-1.5 w-44 text-right font-mono" value={simValor} onChange={(e) => setSimValor(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => exportarCSV("politicas-alcadas", ordenada.map((p) => ({
                Politica: p.nome, Area: p.area, Faixa: faixaLabel(p), Aprovador: p.aprovador,
                DuplaAprovacao: p.duplaAprovacao ? "Sim" : "Não", Situacao: p.ativa ? "Ativa" : "Suspensa",
              })))}>
                <Download className="mr-1 h-4 w-4" />Exportar
              </Button>
              <Button className="rounded-full bg-brand-orange hover:bg-brand-orange/90" onClick={() => setEdicao("novo")}>
                <Plus className="mr-1 h-4 w-4" />Nova alçada
              </Button>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border/70 p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              <Scale className="h-3.5 w-3.5" />Simulador de alçada
            </div>
            {resultado?.encontrada ? (
              <div className="mt-2 text-sm">
                <span className="text-muted-foreground">Operação de </span>
                <span className="font-mono">{brl(numero(simValor))}</span>
                <span className="text-muted-foreground"> na faixa </span>
                <span className="font-mono">{resultado.faixa}</span>
                <span className="text-muted-foreground"> → aprovação por </span>
                <span className="font-medium text-brand-orange">{resultado.aprovador}</span>
                {resultado.dupla && <Badge className="ml-2 rounded-full bg-brand-orange/15 text-brand-orange">Dupla aprovação</Badge>}
              </div>
            ) : (
              <div className="mt-2 text-sm text-destructive">
                Nenhuma alçada ativa cobre este valor nesta política e área — a operação ficaria sem aprovador definido.
              </div>
            )}
          </div>

          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Política</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Faixa de valor</TableHead>
                  <TableHead>Aprovador</TableHead>
                  <TableHead className="text-center">Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordenada.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.area}</TableCell>
                    <TableCell className="font-mono text-sm">{faixaLabel(p)}</TableCell>
                    <TableCell>
                      <div>{p.aprovador}</div>
                      {p.duplaAprovacao && <div className="text-[11px] text-brand-orange">dupla aprovação</div>}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`rounded-full ${p.ativa ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                        {p.ativa ? "Ativa" : "Suspensa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => acao(() => alternarPolitica(p.id), p.ativa ? "Alçada suspensa." : "Alçada reativada.")}>
                          <Power className={`h-4 w-4 ${p.ativa ? "text-brand-orange" : "text-muted-foreground"}`} />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setEdicao(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => acao(() => excluirPolitica(p.id), "Alçada excluída.")}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!ordenada.length && (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Nenhuma alçada cadastrada.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {edicao && <DialogPolitica politica={edicao} onClose={() => setEdicao(null)} />}
    </div>
  );
}

/* ================================= página ================================ */

const AJUDA_TELA: Record<string, CampoAjuda[]> = {
  usuarios: CAMPOS_USR,
  "auditoria-log": [
    { key: "trilha", label: "Trilha de auditoria", ajuda: "Registro imutável de quem fez o quê e quando. Base para revisões internas e auditoria externa." },
    { key: "criticidade", label: "Criticidade", ajuda: "Crítico: encerramento, alçada, parâmetro sensível. Relevante: cadastro e permissão. Informativo: operação rotineira." },
    { key: "retencao", label: "Retenção", ajuda: "O prazo de guarda dos eventos é definido em Parâmetros do sistema." },
  ],
  "centros-custo": CAMPOS_CC,
  parametros: CAMPOS_PAR,
  politicas: CAMPOS_POL,
};

export default function ControlesInternos() {
  const { modulo } = useParams();
  const tela = TELAS[modulo || ""];
  if (!tela) return <div className="py-24 text-center text-muted-foreground">Tela de controles internos não encontrada.</div>;
  const Icon = tela.icon;

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/dashboard" className="hover:text-foreground">Início</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/administrativo" className="hover:text-foreground">Administrativo</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/administrativo/controles" className="hover:text-foreground">Controles internos</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{tela.titulo}</span>
      </nav>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-card shadow-card">
            <Icon className="h-6 w-6 text-brand-orange" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Administrativo · Controles internos</div>
            <h1 className="mt-1.5 font-display text-4xl">{tela.titulo}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{tela.desc}</p>
          </div>
        </div>
        <AssistenteCampos
          titulo={tela.titulo}
          campos={AJUDA_TELA[modulo || ""] || []}
          contextoExtra={{ modulo: tela.titulo, area: "Administrativo · Controles internos" }}
        />
      </div>

      {modulo === "usuarios" && <Usuarios />}
      {modulo === "auditoria-log" && <LogAuditoria />}
      {modulo === "centros-custo" && <CentrosCusto />}
      {modulo === "parametros" && <Parametros />}
      {modulo === "politicas" && <Politicas />}
    </div>
  );
}
