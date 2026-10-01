import { Cloud, CloudOff, CloudUpload, GraduationCap, HardDrive, RefreshCw, type LucideIcon } from "lucide-react";
import { Button, cn } from "@/design-system/mj-design-system-db98fa";
import { sincronizarNuvem, useEstadoNuvem, type StatusNuvem as Status } from "@/lib/nuvemColecoes";

const INFO: Record<Status, { icone: LucideIcon; texto: string; detalhe: string; classe: string }> = {
  sincronizado: {
    icone: Cloud,
    texto: "Salvo na nuvem",
    detalhe: "Os cadastros e lançamentos estão salvos na nuvem e aparecem em qualquer navegador em que você entrar.",
    classe: "border-success/30 bg-success/10 text-success",
  },
  sincronizando: {
    icone: RefreshCw,
    texto: "Sincronizando…",
    detalhe: "Enviando e recebendo alterações da nuvem.",
    classe: "border-primary/30 bg-primary/10 text-primary",
  },
  pendente: {
    icone: CloudUpload,
    texto: "Alterações a enviar",
    detalhe: "Há alterações salvas neste navegador que ainda não subiram para a nuvem.",
    classe: "border-warn/40 bg-warn/10 text-warn",
  },
  indisponivel: {
    icone: HardDrive,
    texto: "Salvo só neste navegador",
    detalhe:
      "A tabela da nuvem (contabil_registros) ainda não foi criada — falta aplicar a migração do banco no Lovable. " +
      "Até lá tudo fica salvo neste navegador e sobe sozinho quando a tabela existir.",
    classe: "border-warn/40 bg-warn/10 text-warn",
  },
  erro: {
    icone: CloudOff,
    texto: "Sem conexão com a nuvem",
    detalhe: "Os dados estão salvos neste navegador e serão enviados na próxima tentativa.",
    classe: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  local: {
    icone: HardDrive,
    texto: "Salvo neste navegador",
    detalhe: "Entre com a sua conta para salvar também na nuvem.",
    classe: "border-border bg-muted text-muted-foreground",
  },
  pratica: {
    icone: GraduationCap,
    texto: "Modo prática",
    detalhe: "Dados de treino, guardados só neste navegador. Nada vai para a nuvem.",
    classe: "border-warn/40 bg-warn/10 text-warn",
  },
};

/** Selo com o estado da gravação na nuvem dos cadastros e lançamentos contábeis. */
export default function StatusNuvem({ className }: { className?: string }) {
  const { status, pendencias, erro, ultimaSincronizacao } = useEstadoNuvem();
  const info = INFO[status];
  const Icone = info.icone;
  const quando = ultimaSincronizacao ? ` Última sincronização: ${new Date(ultimaSincronizacao).toLocaleString("pt-BR")}.` : "";
  const detalhe = `${info.detalhe}${pendencias && status !== "pratica" ? ` Pendências: ${pendencias}.` : ""}${erro && status === "erro" ? ` (${erro})` : ""}${quando}`;
  const podeTentar = status === "erro" || status === "pendente" || status === "indisponivel";

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span
        role="status"
        title={detalhe}
        aria-label={`${info.texto}. ${detalhe}`}
        className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", info.classe)}
      >
        <Icone className={cn("h-3.5 w-3.5", status === "sincronizando" && "animate-spin")} />
        {info.texto}
        {pendencias > 0 && status !== "pratica" && status !== "sincronizado" ? <span className="font-mono">· {pendencias}</span> : null}
      </span>
      {podeTentar ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full"
          aria-label="Sincronizar agora"
          title="Sincronizar agora"
          onClick={() => void sincronizarNuvem()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </span>
  );
}
