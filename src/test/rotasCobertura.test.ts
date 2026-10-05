import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { AREAS } from "@/lib/contabilNav";
import { LICOES } from "@/lib/aprendizado/conteudo";
import { loadModelos, type TarefaModelo } from "@/lib/gestaoStore";

const APP_SOURCE = readFileSync("src/App.tsx", "utf8");
const ROTAS_APP = [...APP_SOURCE.matchAll(/<Route\s+path="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((rota) => rota !== "*");

function casaComRota(pattern: string, destino: string) {
  const caminho = destino.split(/[?#]/, 1)[0];
  const padrao = pattern.split("/").filter(Boolean);
  const partes = caminho.split("/").filter(Boolean);
  let indice = 0;

  for (const segmento of padrao) {
    if (segmento === "*") return true;
    if (segmento.startsWith(":") && segmento.endsWith("*")) return true;
    if (indice >= partes.length) return false;
    if (!segmento.startsWith(":") && segmento !== partes[indice]) return false;
    indice += 1;
  }
  return indice === partes.length;
}

function rotaRegistrada(destino: string) {
  return ROTAS_APP.some((pattern) => casaComRota(pattern, destino));
}

beforeEach(() => localStorage.clear());

describe("cobertura das rotas visíveis", () => {
  it("todas as áreas, categorias e módulos do menu têm rota no App", () => {
    for (const area of AREAS) {
      expect(rotaRegistrada(`/${area.slug}`), `área ${area.slug}`).toBe(true);
      for (const categoria of area.categories) {
        expect(rotaRegistrada(`/${area.slug}/${categoria.slug}`), `categoria ${area.slug}/${categoria.slug}`).toBe(true);
        for (const modulo of categoria.modules) {
          const rota = `/${area.slug}/${categoria.slug}/${modulo.slug}`;
          expect(rotaRegistrada(rota), `módulo ${rota}`).toBe(true);
        }
      }
    }
  });

  it("lições e telas simplificadas apontam para caminhos registrados", () => {
    for (const licao of LICOES) {
      for (const rota of [licao.rota, ...(licao.rotasExtras ?? [])]) {
        expect(rotaRegistrada(rota), `lição ${licao.slug}: ${rota}`).toBe(true);
      }
    }
    for (const rota of ["/simples-mei", "/simples-mei/empresas", "/simples-mei/receitas", "/simples-mei/obrigacoes"]) {
      expect(rotaRegistrada(rota), `atalho ${rota}`).toBe(true);
    }
  });

  it("destinos dos checklists têm correspondência com uma tela", () => {
    for (const tarefa of loadModelos()) {
      if (tarefa.destino) expect(rotaRegistrada(tarefa.destino), `${tarefa.id}: ${tarefa.destino}`).toBe(true);
    }
  });

  it("migra o destino antigo da conciliação ao carregar modelos salvos", () => {
    const legado: TarefaModelo = {
      id: "TRF-006",
      titulo: "Conciliação bancária das contas ativas",
      fase: "conciliacao",
      periodicidade: "Mensal",
      responsavel: "Tesouraria",
      diaPrazo: 12,
      obrigatoria: true,
      ativa: true,
      destino: "/financeiro/operacional/conciliacao-bancaria",
    };
    localStorage.setItem("usecontabil.tarefaModelos.v1", JSON.stringify([legado]));

    const migrada = loadModelos().find((tarefa) => tarefa.id === "TRF-006");
    expect(migrada?.destino).toBe("/financeiro/operacional/conciliacao");
    expect(rotaRegistrada(migrada?.destino ?? "")).toBe(true);
  });
});
