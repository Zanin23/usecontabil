// Armazenamento local (localStorage): guarda contra estouro de cota e medição de uso.
//
// Todos os dados de negócio do sistema (documentos, apurações, guias…) ficam no localStorage do
// navegador (~5 milhões de caracteres). Ao encher, o setItem lança QuotaExceededError e o usuário
// via "Failed to execute 'setItem' on 'Storage'…" (inglês técnico) — ou nada, nos stores sem try/catch.
import { toast } from "sonner";

export const MSG_ARMAZENAMENTO_CHEIO =
  "Armazenamento do navegador cheio — este dado NÃO foi salvo. Exclua dados antigos (ex.: Limpar competência) ou libere espaço e tente novamente.";

/** Capacidade típica do localStorage (caracteres). Medida em Chromium: 5.234.688. */
export const LIMITE_ESTIMADO_CARACTERES = 5_000_000;

export function ehErroDeCota(e: unknown): boolean {
  return e instanceof DOMException && (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED" || e.code === 22);
}

const GUARDA = Symbol.for("usecontabil.guardaCota");

/**
 * Envolve Storage.prototype.setItem: se a cota estourar, avisa (uma vez a cada 10 s) e relança um
 * erro QuotaExceededError com mensagem em português, para que quem chamou mostre algo compreensível.
 * Retorna uma função que desfaz a instalação (usada nos testes).
 */
export function instalarGuardaDeCota(): () => void {
  const proto = Storage.prototype as Storage & { [GUARDA]?: () => void };
  if (proto[GUARDA]) return proto[GUARDA]!;
  const original = proto.setItem;
  let ultimoAviso = 0;
  proto.setItem = function (chave: string, valor: string) {
    try {
      return original.call(this, chave, valor);
    } catch (e) {
      if (ehErroDeCota(e)) {
        if (Date.now() - ultimoAviso > 10_000) {
          ultimoAviso = Date.now();
          toast.error(MSG_ARMAZENAMENTO_CHEIO, { id: "armazenamento-cheio", duration: 12_000 });
        }
        throw new DOMException(MSG_ARMAZENAMENTO_CHEIO, "QuotaExceededError");
      }
      throw e;
    }
  };
  const desfazer = () => {
    proto.setItem = original;
    delete proto[GUARDA];
  };
  proto[GUARDA] = desfazer;
  return desfazer;
}

export type UsoArmazenamento = {
  caracteres: number;
  percentual: number;
  maiores: { chave: string; caracteres: number }[];
};

/** Quanto do localStorage está ocupado e quais chaves pesam mais. */
export function usoArmazenamento(storage: Storage = localStorage, limite = LIMITE_ESTIMADO_CARACTERES): UsoArmazenamento {
  const itens: { chave: string; caracteres: number }[] = [];
  for (let i = 0; i < storage.length; i++) {
    const chave = storage.key(i);
    if (chave == null) continue;
    itens.push({ chave, caracteres: chave.length + (storage.getItem(chave)?.length ?? 0) });
  }
  const caracteres = itens.reduce((t, x) => t + x.caracteres, 0);
  return {
    caracteres,
    percentual: Math.min(100, Math.round((caracteres / limite) * 100)),
    maiores: itens.sort((a, b) => b.caracteres - a.caracteres).slice(0, 4),
  };
}
