import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Label,
  Slider,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/design-system/mj-design-system-db98fa";
import { Check, FileDown, Monitor, Moon, Palette, ShieldCheck, Sun, Volume2, VolumeX, Trash2, AlertTriangle, FlaskConical, Users2 } from "lucide-react";
import { toast } from "sonner";
import { useTema } from "@/lib/tema";
import {
  assinarSom,
  definirSom,
  definirSomDigitacao,
  definirVolumeSom,
  somAtivo,
  somDigitacaoAtivo,
  volumeSom,
} from "@/lib/uiSound";
import { ACENTOS, AMBIENTES, usePreferencias, type Acento } from "@/lib/preferencias";
import { supabase } from "@/integrations/supabase/client";
import { gerarDocumentacaoPdf } from "@/lib/documentacaoSistema";
import UsoArmazenamento from "@/components/contabil/UsoArmazenamento";
import ListaAcessos from "@/components/contabil/ListaAcessos";
import { deletarTudoGeral } from "@/lib/migrationPratica";
import { usePratica } from "@/lib/praticaStore";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/design-system/mj-design-system-db98fa";

type Props = { open: boolean; onOpenChange: (v: boolean) => void; usuario: string; perfil: string };

const SWATCH: Record<Acento, string> = {
  orange: "bg-brand-orange",
  blue: "bg-brand-blue",
  purple: "bg-brand-purple",
  pink: "bg-brand-pink",
  red: "bg-brand-red",
};

/** Central de configurações da conta: sons, cores, tema, notificações e ambiente. */
export default function ConfiguracoesConta({ open, onOpenChange, usuario, perfil }: Props) {
  const { tema, setTema } = useTema();
  const { prefs, definir, redefinir } = usePreferencias();
  const { praticaAtiva, setPraticaAtiva } = usePratica();
  const [som, setSom] = useState(somAtivo);
  const [digitacao, setDigitacao] = useState(somDigitacaoAtivo);
  const [volume, setVolume] = useState(volumeSom);
  const [admin, setAdmin] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [limpando, setLimpando] = useState(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const id = data.user?.id;
      if (!id) return;
      const { data: papeis } = await supabase.from("user_roles").select("role").eq("user_id", id);
      if (ativo) setAdmin(!!papeis?.some((p) => p.role === "admin"));
    })();
    return () => {
      ativo = false;
    };
  }, [open]);

  useEffect(() => assinarSom(setSom) as unknown as () => void, []);

  const linha = "flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            Configurações da <span className="text-brand-orange">conta</span>
          </DialogTitle>
          <DialogDescription>
            {usuario} · {perfil} — preferências salvas neste navegador.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="aparencia">
          <TabsList className="rounded-full">
            <TabsTrigger value="aparencia" className="rounded-full">Aparência</TabsTrigger>
            <TabsTrigger value="sons" className="rounded-full">Sons</TabsTrigger>
            <TabsTrigger value="notificacoes" className="rounded-full">Notificações</TabsTrigger>
            <TabsTrigger value="ambiente" className="rounded-full">Ambiente</TabsTrigger>
            {admin && (
              <TabsTrigger value="usuarios" className="rounded-full">Usuários</TabsTrigger>
            )}
            {admin && (
              <TabsTrigger value="documentacao" className="rounded-full">Documentação</TabsTrigger>
            )}
          </TabsList>

          {/* Aparência */}
          <TabsContent value="aparencia" className="space-y-3 pt-4">
            <div className="rounded-2xl border border-border bg-card px-4 py-3 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Palette className="h-4 w-4 text-brand-orange" /> Cor de destaque
              </div>
              <div className="flex flex-wrap gap-2">
                {ACENTOS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => definir({ acento: a.id })}
                    className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${
                      prefs.acento === a.id ? "border-brand-orange ring-2 ring-brand-orange/40" : "border-border"
                    }`}
                  >
                    <span className={`h-4 w-4 rounded-full ${SWATCH[a.id]}`} />
                    {a.nome}
                    {prefs.acento === a.id && <Check className="h-3.5 w-3.5 text-brand-orange" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card px-4 py-3 space-y-3">
              <div className="text-sm font-medium">Tema</div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={tema === "light" ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
                  onClick={() => setTema("light")}
                >
                  <Sun className="h-4 w-4 mr-1.5" /> Claro
                </Button>
                <Button
                  variant={tema === "dark" ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
                  onClick={() => setTema("dark")}
                >
                  <Moon className="h-4 w-4 mr-1.5" /> Escuro
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() =>
                    setTema(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
                  }
                >
                  <Monitor className="h-4 w-4 mr-1.5" /> Seguir o sistema
                </Button>
              </div>
            </div>

            <div className={linha}>
              <div>
                <div className="text-sm font-medium">Densidade compacta</div>
                <div className="text-xs text-muted-foreground">Reduz os espaçamentos das telas e tabelas.</div>
              </div>
              <Switch
                checked={prefs.densidade === "compacta"}
                onCheckedChange={(v) => definir({ densidade: v ? "compacta" : "confortavel" })}
              />
            </div>
          </TabsContent>

          {/* Sons */}
          <TabsContent value="sons" className="space-y-3 pt-4">
            <div className={linha}>
              <div>
                <div className="text-sm font-medium flex items-center gap-2">
                  {som ? <Volume2 className="h-4 w-4 text-brand-orange" /> : <VolumeX className="h-4 w-4" />}
                  Sons da interface
                </div>
                <div className="text-xs text-muted-foreground">Retorno sonoro sutil em cliques e digitação.</div>
              </div>
              <Switch checked={som} onCheckedChange={definirSom} />
            </div>

            <div className={linha}>
              <div>
                <div className="text-sm font-medium">Som ao digitar</div>
                <div className="text-xs text-muted-foreground">Desligue para manter apenas o clique.</div>
              </div>
              <Switch
                checked={digitacao}
                disabled={!som}
                onCheckedChange={(v) => {
                  definirSomDigitacao(v);
                  setDigitacao(v);
                }}
              />
            </div>

            <div className="rounded-2xl border border-border bg-card px-4 py-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Volume</Label>
                <span className="text-xs text-muted-foreground">{Math.round(volume * 100)}%</span>
              </div>
              <Slider
                value={[volume]}
                min={0}
                max={2}
                step={0.1}
                disabled={!som}
                onValueChange={([v]) => {
                  setVolume(v);
                  definirVolumeSom(v);
                }}
              />
            </div>
          </TabsContent>

          {/* Notificações */}
          <TabsContent value="notificacoes" className="space-y-3 pt-4">
            {[
              { k: "notifVencimentos" as const, t: "Vencimentos de guias e obrigações", d: "Avisos em D-7, D-3 e no dia." },
              { k: "notifFechamento" as const, t: "Etapas do fechamento", d: "Pendências das fases e processos da competência." },
              { k: "notifInconsistencias" as const, t: "Inconsistências da auditoria fiscal", d: "Alertas quando novas divergências forem detectadas." },
              { k: "notifResumoDiario" as const, t: "Resumo diário", d: "Um panorama consolidado no início do expediente." },
            ].map((n) => (
              <div key={n.k} className={linha}>
                <div>
                  <div className="text-sm font-medium">{n.t}</div>
                  <div className="text-xs text-muted-foreground">{n.d}</div>
                </div>
                <Switch checked={prefs[n.k]} onCheckedChange={(v) => definir({ [n.k]: v })} />
              </div>
            ))}
          </TabsContent>

          {/* Ambiente */}
          <TabsContent value="ambiente" className="space-y-4 pt-4">
            <div className="p-4 rounded-xl border border-border bg-card/50 space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 shrink-0 rounded-full bg-brand-orange/10 flex items-center justify-center">
                  <FlaskConical className="h-5 w-5 text-brand-orange" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Ambiente de Treinamento (Modo Prática)</h4>
                    <Button
                      variant={praticaAtiva ? "default" : "outline"}
                      size="sm"
                      className={praticaAtiva ? "bg-brand-orange hover:bg-brand-orange/90 rounded-full" : "rounded-full"}
                      onClick={() => setPraticaAtiva(!praticaAtiva)}
                    >
                      {praticaAtiva ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Um ambiente seguro para testes e aprendizado. Os dados cadastrados aqui são 
                    <span className="text-brand-orange font-semibold"> totalmente isolados</span> da sua conta real.
                  </p>
                </div>
              </div>

              {praticaAtiva && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-brand-orange/10 text-brand-orange text-xs border border-brand-orange/20">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <p>
                    Você está operando na <strong>Base de Prática</strong>. Nenhuma alteração feita aqui 
                    afetará seus dados oficiais de produção.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {AMBIENTES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => definir({ ambiente: a.id })}
                  className={`w-full text-left rounded-2xl border px-4 py-3 transition ${
                    prefs.ambiente === a.id ? "border-brand-orange ring-2 ring-brand-orange/40 bg-card" : "border-border bg-card/60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{a.nome}</span>
                    {prefs.ambiente === a.id && (
                      <Badge variant="outline" className="rounded-full h-5 text-[10px] border-brand-orange/40 text-brand-orange">
                        ATIVO
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{a.descricao}</div>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              O ambiente é apenas visual e interno — nenhuma transmissão é feita a órgãos oficiais.
            </p>
            <UsoArmazenamento />
          </TabsContent>
          {/* Gestão de Usuários — exclusivo do administrador */}
          {admin && (
            <TabsContent value="usuarios" className="space-y-4 pt-4">
              <div className="rounded-2xl border border-border bg-card px-4 py-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users2 className="h-4 w-4 text-brand-orange" /> Controle de Acesso
                </div>
                <p className="text-xs text-muted-foreground">
                  Libere ou remova o acesso de usuários ao sistema. Usuários sem papel atribuído não conseguem acessar as funcionalidades.
                </p>
              </div>

              <ListaAcessos />
            </TabsContent>
          )}

          {/* Documentação — exclusivo do administrador */}
          {admin && (
            <TabsContent value="documentacao" className="space-y-3 pt-4">
              <div className="rounded-2xl border border-border bg-card px-4 py-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="h-4 w-4 text-brand-orange" /> Acesso restrito ao administrador
                </div>
                <p className="text-xs text-muted-foreground">
                  Gera um PDF com o caminho completo do sistema: propósito, arquitetura, mapa de todas as
                  áreas, categorias e módulos, telas dedicadas por rota, regras de cada motor fiscal,
                  análises disponíveis, roteiro de uso ponta a ponta, segurança e limitações assumidas.
                </p>
              </div>
              <div className={linha}>
                <div>
                  <div className="text-sm font-medium">Documentação completa do sistema</div>
                  <div className="text-xs text-muted-foreground">
                    Arquivo PDF gerado neste navegador, com data e conta de emissão.
                  </div>
                </div>
                <Button
                  size="sm"
                  className="rounded-full bg-brand-orange hover:bg-brand-orange/90"
                  disabled={gerando}
                  onClick={() => {
                    setGerando(true);
                    try {
                      const nome = gerarDocumentacaoPdf(usuario);
                      toast.success(`PDF gerado: ${nome}`);
                    } catch {
                      toast.error("Não foi possível gerar a documentação.");
                    } finally {
                      setGerando(false);
                    }
                  }}
                >
                  <FileDown className="h-4 w-4 mr-1.5" /> {gerando ? "Gerando…" : "Exportar PDF"}
                </Button>
              </div>

              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <AlertTriangle className="h-4 w-4" /> Zona de Perigo
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Reset total da base</div>
                    <div className="text-xs text-muted-foreground">
                      Apaga permanentemente TODOS os dados (Real e Prática), empresas e configurações.
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-full gap-2"
                        disabled={limpando}
                      >
                        <Trash2 className="h-4 w-4" /> {limpando ? "Limpando..." : "Deletar tudo"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-3xl border-destructive">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-display text-2xl text-destructive">Confirmar destruição de dados?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação é <strong>irreversível</strong>. Todos os cadastros, notas fiscais, lançamentos financeiros e configurações de preferência serão removidos permanentemente tanto deste navegador quanto da nuvem vinculada à sua conta.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                          onClick={async () => {
                            setLimpando(true);
                            const ok = await deletarTudoGeral();
                            if (ok) {
                              toast.success("Limpeza total concluída.");
                              setTimeout(() => window.location.reload(), 1500);
                            } else {
                              toast.error("Erro ao realizar a limpeza total.");
                              setLimpando(false);
                            }
                          }}
                        >
                          Sim, deletar permanentemente
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => {
              redefinir();
              toast.success("Preferências restauradas ao padrão");
            }}
          >
            Restaurar padrão
          </Button>
          <Button size="sm" className="rounded-full" onClick={() => onOpenChange(false)}>
            Concluir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

