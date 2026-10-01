import { beforeEach, describe, expect, it, vi } from "vitest";
import { gravarRemoto, memoria, reiniciarMemoria } from "./supabaseMemoria";

vi.mock("@/integrations/supabase/client", async () => (await import("./supabaseMemoria")).moduloSupabaseMemoria());

import {
  __reiniciarNuvemParaTestes, apagarRegistrosDaNuvem, criarColecao, estadoDaNuvem, sincronizarNuvem, type RegistroBase,
} from "@/lib/nuvemColecoes";
import { setPraticaAtiva } from "@/lib/praticaStore";

type Nota = RegistroBase & { texto: string; empresaId?: string };
const notas = criarColecao<Nota>("notas_teste");

const chaveLocal = "usecontabil.col.notas_teste.v1";
const estadoLocal = () => JSON.parse(localStorage.getItem(chaveLocal) ?? "{}");

beforeEach(() => {
  localStorage.clear();
  setPraticaAtiva(false);
  reiniciarMemoria();
  __reiniciarNuvemParaTestes();
});

describe("Coleções: gravação local", () => {
  it("salva, lista, altera e remove de forma síncrona, marcando o que falta subir", () => {
    const a = notas.salvar({ id: "n1", texto: "primeira" });
    expect(a.criadoEm).toBeTruthy();
    expect(a.atualizadoEm).toBeTruthy();
    expect(notas.listar()).toHaveLength(1);
    expect(estadoLocal().pendentes).toHaveProperty("n1");

    const b = notas.salvar({ ...a, texto: "alterada" });
    expect(b.criadoEm).toBe(a.criadoEm);
    expect(notas.obter("n1")?.texto).toBe("alterada");

    notas.remover("n1");
    expect(notas.listar()).toHaveLength(0);
    expect(estadoLocal().pendentes).not.toHaveProperty("n1");
    expect(estadoLocal().exclusoes).toHaveProperty("n1");
  });

  it("modo prática grava em outra chave e não mistura com a base real", () => {
    notas.salvar({ id: "real", texto: "real" });
    setPraticaAtiva(true);
    expect(notas.listar()).toHaveLength(0);
    notas.salvar({ id: "treino", texto: "treino" });
    expect(localStorage.getItem(chaveLocal + ".pratica")).toContain("treino");
    setPraticaAtiva(false);
    expect(notas.listar().map((n) => n.id)).toEqual(["real"]);
  });

  it("se o navegador estiver sem espaço, o erro chega a quem gravou e nada muda na memória", () => {
    notas.salvar({ id: "n1", texto: "ok" });
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new DOMException("cheio", "QuotaExceededError"); };
    try {
      expect(() => notas.salvar({ id: "n2", texto: "não cabe" })).toThrow();
    } finally {
      Storage.prototype.setItem = original;
    }
    expect(notas.listar().map((n) => n.id)).toEqual(["n1"]);
  });
});

describe("Coleções: sincronização com a nuvem", () => {
  it("envia o que foi gravado localmente e limpa as pendências", async () => {
    notas.salvar({ id: "n1", texto: "vai para a nuvem", empresaId: "EMP-1" });
    expect(estadoDaNuvem().pendencias).toBe(1);
    await expect(sincronizarNuvem()).resolves.toBe("sincronizado");
    const linha = memoria.linhas.find((l) => l.id === "n1");
    expect(linha).toMatchObject({ user_id: "user-1", colecao: "notas_teste", empresa_id: "EMP-1", excluido: false });
    expect(linha?.dados).toMatchObject({ texto: "vai para a nuvem" });
    expect(estadoDaNuvem().pendencias).toBe(0);
  });

  it("baixa o que foi gravado em outro navegador, inclusive exclusões", async () => {
    gravarRemoto("notas_teste", "r1", { id: "r1", texto: "de outro navegador" });
    gravarRemoto("notas_teste", "r2", { id: "r2", texto: "será excluída" });
    await sincronizarNuvem();
    expect(notas.listar().map((n) => n.id).sort()).toEqual(["r1", "r2"]);

    gravarRemoto("notas_teste", "r2", {}, true);
    gravarRemoto("notas_teste", "r1", { id: "r1", texto: "editada lá" });
    await sincronizarNuvem();
    expect(notas.listar().map((n) => n.id)).toEqual(["r1"]);
    expect(notas.obter("r1")?.texto).toBe("editada lá");
  });

  it("exclusão local vira marca na nuvem (chega aos outros navegadores)", async () => {
    notas.salvar({ id: "n1", texto: "x" });
    await sincronizarNuvem();
    notas.remover("n1");
    await sincronizarNuvem();
    expect(memoria.linhas.find((l) => l.id === "n1")).toMatchObject({ excluido: true });
    expect(estadoLocal().exclusoes).not.toHaveProperty("n1");
  });

  it("alteração local ainda não enviada vence a versão da nuvem", async () => {
    notas.salvar({ id: "n1", texto: "v1" });
    await sincronizarNuvem();
    // Outro navegador altera, mas este alterou depois e ainda não enviou.
    gravarRemoto("notas_teste", "n1", { id: "n1", texto: "remota" });
    notas.salvar({ ...notas.obter("n1")!, texto: "local mais nova" });
    await sincronizarNuvem();
    expect(notas.obter("n1")?.texto).toBe("local mais nova");
    expect(memoria.linhas.find((l) => l.id === "n1")?.dados).toMatchObject({ texto: "local mais nova" });
  });

  it("edição feita durante o envio continua pendente para a próxima rodada", async () => {
    notas.salvar({ id: "n1", texto: "v1" });
    memoria.duranteEnvio = () => {
      notas.salvar({ ...notas.obter("n1")!, texto: "v2 durante o envio" });
    };
    await sincronizarNuvem();
    expect(estadoLocal().pendentes).toHaveProperty("n1");
    expect(notas.obter("n1")?.texto).toBe("v2 durante o envio");
    await sincronizarNuvem();
    expect(memoria.linhas.find((l) => l.id === "n1")?.dados).toMatchObject({ texto: "v2 durante o envio" });
    expect(estadoLocal().pendentes).not.toHaveProperty("n1");
  });

  it("sem a tabela (migração não aplicada) tudo segue local e fica pendente, sem perder nada", async () => {
    memoria.tabelaExiste = false;
    notas.salvar({ id: "n1", texto: "guardada no navegador" });
    await expect(sincronizarNuvem()).resolves.toBe("indisponivel");
    expect(estadoDaNuvem().erro).toMatch(/migração pendente/);
    expect(notas.listar()).toHaveLength(1);
    expect(estadoDaNuvem().pendencias).toBe(1);

    // A migração foi aplicada: o que estava só no navegador sobe.
    memoria.tabelaExiste = true;
    await expect(sincronizarNuvem()).resolves.toBe("sincronizado");
    expect(memoria.linhas.map((l) => l.id)).toContain("n1");
  });

  it("falha de rede vira estado de erro e mantém as pendências", async () => {
    memoria.falha = { message: "TypeError: Failed to fetch" };
    notas.salvar({ id: "n1", texto: "x" });
    await expect(sincronizarNuvem()).resolves.toBe("erro");
    expect(estadoDaNuvem().pendencias).toBe(1);
  });

  it("sem sessão ou no modo prática nada vai para a nuvem", async () => {
    memoria.usuario = null;
    notas.salvar({ id: "n1", texto: "x" });
    await expect(sincronizarNuvem()).resolves.toBe("local");
    expect(memoria.chamadas).toHaveLength(0);

    memoria.usuario = { id: "user-1" };
    setPraticaAtiva(true);
    notas.salvar({ id: "t1", texto: "treino" });
    await expect(sincronizarNuvem()).resolves.toBe("pratica");
    expect(memoria.chamadas).toHaveLength(0);
  });

  it("baixa mais de uma página (mais de 1.000 registros)", async () => {
    for (let i = 0; i < 1203; i++) gravarRemoto("notas_teste", `r${i}`, { id: `r${i}`, texto: String(i) });
    await sincronizarNuvem();
    expect(notas.listar()).toHaveLength(1203);
  });

  it("não enxerga registros de outro usuário (RLS)", async () => {
    gravarRemoto("notas_teste", "alheio", { id: "alheio", texto: "de outra pessoa" }, false, "user-2");
    await sincronizarNuvem();
    expect(notas.listar()).toHaveLength(0);
  });

  it("separa o cache local por usuário da sessão e não envia dados de outra conta", async () => {
    localStorage.setItem("sb-teste-auth-token", JSON.stringify({ user: { id: "user-1" } }));
    __reiniciarNuvemParaTestes();
    notas.salvar({ id: "u1", texto: "da conta 1" });
    expect(localStorage.getItem(`${chaveLocal}.u.user-1`)).toContain("da conta 1");

    // Outra pessoa entra com a conta dela no mesmo navegador.
    localStorage.setItem("sb-teste-auth-token", JSON.stringify({ user: { id: "user-2" } }));
    memoria.usuario = { id: "user-2" };
    __reiniciarNuvemParaTestes();
    expect(notas.listar()).toHaveLength(0);
    await sincronizarNuvem();
    expect(memoria.linhas).toHaveLength(0); // nada da conta 1 subiu em nome da conta 2
  });

  it("se a sessão em memória não é a guardada no navegador, não sincroniza", async () => {
    localStorage.setItem("sb-teste-auth-token", JSON.stringify({ user: { id: "user-2" } }));
    __reiniciarNuvemParaTestes();
    memoria.usuario = { id: "user-1" };
    notas.salvar({ id: "x", texto: "x" });
    await expect(sincronizarNuvem()).resolves.toBe("erro");
    expect(memoria.chamadas).toHaveLength(0);
  });

  it("apagarRegistrosDaNuvem remove só os registros do usuário", async () => {
    notas.salvar({ id: "n1", texto: "x" });
    await sincronizarNuvem();
    gravarRemoto("notas_teste", "alheio", { id: "alheio" }, false, "user-2");
    await apagarRegistrosDaNuvem("user-1");
    expect(memoria.linhas.map((l) => l.id)).toEqual(["alheio"]);
  });
});
