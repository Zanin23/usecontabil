import { useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Separator,
} from "@/design-system/mj-design-system-db98fa";
import { Bell, AlertTriangle, Clock, Info, CheckCheck, BellOff } from "lucide-react";
import { useEmpresaAtual } from "@/lib/empresaAtual";
import { useCompetencia } from "@/lib/competencia";
import { useNotificacoes, type NotifNivel } from "@/lib/notificacoesStore";

const NIVEL = {
  critico: { icone: AlertTriangle, cor: "text-destructive", rotulo: "Crítico" },
  atencao: { icone: Clock, cor: "text-brand-orange", rotulo: "Atenção" },
  info: { icone: Info, cor: "text-muted-foreground", rotulo: "Informativo" },
} satisfies Record<NotifNivel, { icone: typeof Info; cor: string; rotulo: string }>;

export default function NotificacoesPainel() {
  const { empresaId } = useEmpresaAtual();
  const { competencia } = useCompetencia();
  const { itens, naoLidas, marcarLida, marcarTodasLidas } = useNotificacoes(empresaId, competencia);
  const navigate = useNavigate();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-md h-9 relative"
          aria-label={`Notificações${naoLidas ? ` — ${naoLidas} não lidas` : ""}`}
          title="Notificações"
        >
          <Bell className="h-4 w-4" />
          {naoLidas > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] leading-4 font-medium">
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            <div className="font-display text-base leading-none">Notificações</div>
            <div className="text-xs text-muted-foreground mt-1">
              {naoLidas > 0 ? `${naoLidas} não lida(s)` : "Tudo em dia"}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={marcarTodasLidas}
            disabled={naoLidas === 0}
          >
            <CheckCheck className="h-4 w-4" />
            Marcar lidas
          </Button>
        </div>
        <Separator />

        {itens.length === 0 ? (
          <div className="px-4 py-10 text-center space-y-2">
            <BellOff className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhuma notificação para a competência selecionada.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <ul className="divide-y divide-border">
              {itens.map((n) => {
                const { icone: Icone, cor, rotulo } = NIVEL[n.nivel];
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        marcarLida(n.id);
                        navigate(n.destino);
                      }}
                      className="w-full text-left px-4 py-3 flex gap-3 hover:bg-accent transition"
                    >
                      <Icone className={`h-4 w-4 mt-0.5 shrink-0 ${cor}`} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span
                            className={`text-sm truncate ${n.lida ? "text-muted-foreground" : "text-foreground font-medium"}`}
                          >
                            {n.titulo}
                          </span>
                          {!n.lida && (
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-orange shrink-0" />
                          )}
                        </span>
                        <span className="block text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {n.detalhe}
                        </span>
                        <Badge variant="outline" className="mt-2 rounded-full h-5 text-[10px]">
                          {rotulo}
                        </Badge>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
