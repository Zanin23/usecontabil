/**
 * Mecanismo de orientação: contexto, requisitos, fluxo, mapa de telas e
 * navegação por processo.
 *
 * Estes testes protegem a promessa central do sistema: dizer ao usuário o que
 * falta cadastrar, onde cadastrar, o que isso alimenta e qual é o próximo passo.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { coletarContexto, type Contexto } from "@/lib/ux/contexto";
import { REQUISITOS, REQUISITO_POR_ID, avaliar, separarPendencias } from "@/lib/ux/requisitos";
import { FLUXO, avaliarFluxo, progressoFluxo, proximaEtapa } from "@/lib/ux/fluxo";
import { TELAS, TELA_PADRAO, buscarTela, fichaDoMenu } from "@/lib/ux/telas";
import { SECOES, secaoDaRota, todosOsItens, trilhaDaRota } from "@/lib/ux/navModelo";

import { orientar } from "@/lib/ux/useOrientacao";

/** Rotas registradas no App — a mesma fonte usada pelo teste de cobertura de rotas. */
const APP_SOURCE = readFileSync("src/App.tsx", "utf8");

vi.mock("@/integrations/supabase/client", async () =>
  (await import("./supabaseFalso")).moduloSupabaseFalso(),
);

const contextoVazio = (): Contexto => ({
  empresaId: null,
  empresa: undefined,
  totalEmpresas: 0,
  empresaCnpj: false,
  regimeDefinido: false,
  regime: "",
  filiais: 0,
  filiaisAtivas: 0,
  temMatriz: false,
  participantes: 0,
  clientes: 0,
  fornecedores: 0,
  produtos: 0,
  servicos: 0,
  contas: 0,
  contasAnaliticas: 0,
  centros: 0,
  historicos: 0,
  lancamentos: 0,
  lancamentosPeriodo: 0,
  documentos: 0,
  documentosPeriodo: 0,
  escrituracao: 0,
  inscricoes: 0,
  parametrosEmpresa: 0,
  certificados: 0,
  titulosPagar: 0,
  titulosReceber: 0,
  movimentosCaixa: 0,
  guias: 0,
  guiasAbertas: 0,
  obrigacoesPendentes: 0,
  apuracoes: 0,
  motorDoRegime: "pis-cofins",
  contasConciliadas: 0,
  contasBancarias: 0,
  pendenciasCadastro: 0,
  pendenciasCriticasCadastro: 0,
  competenciaEncerrada: false,
});

beforeEach(() => {
  localStorage.clear();
});

describe("contexto do sistema", () => {
  it("lê o retrato real sem gravar nada", () => {
    const antes = JSON.stringify(localStorage);
    const c = coletarContexto(null, "2026-07");
    expect(c.totalEmpresas).toBe(0);
    expect(c.contas).toBe(0);
    expect(JSON.stringify(localStorage)).toBe(antes);
  });

  it("passa a enxergar o que o usuário cadastra nos stores reais", async () => {
    const { saveEmpresa } = await import("@/lib/empresasStore");
    const { saveFilial } = await import("@/lib/filiaisStore");
    const { salvarConta } = await import("@/lib/planoContasStore");
    const { salvarParticipante, participanteVazio } = await import("@/lib/cadastrosStore");

    await saveEmpresa({
      id: "EMP-1",
      cnpj: "11.222.333/0001-81",
      razao: "Confecções Exemplo Ltda",
      regime: "Simples Nacional",
      atividade: "Confecção",
      status: "Ativa",
      createdAt: "2026-01-01T00:00:00Z",
      raw: {},
    });
    saveFilial({
      id: "FL-1", nome: "Matriz", tipo: "Matriz", empresaId: "EMP-1", cnpj: "11.222.333/0001-81",
      inscEstadual: "", cidade: "São Paulo", uf: "SP", endereco: "", responsavel: "", email: "",
      telefone: "", centroCusto: "", status: "Ativa",
    });
    expect(
      salvarConta({
        id: "", codigo: "1", descricao: "Ativo", tipo: "Sintética", natureza: "Devedora",
        grupo: "Ativo", situacao: "Ativa", exigeCentroCusto: false, origem: "Manual",
      }).ok,
    ).toBe(true);
    expect(
      salvarConta({
        id: "", codigo: "1.1", descricao: "Caixa e equivalentes", tipo: "Analítica",
        natureza: "Devedora", grupo: "Ativo", situacao: "Ativa", exigeCentroCusto: false, origem: "Manual",
      }).ok,
    ).toBe(true);
    const cli = { ...participanteVazio(), id: "", nome: "Cliente Teste Ltda", documento: "11.222.333/0001-81", uf: "SP" };
    expect(salvarParticipante(cli).ok).toBe(true);

    const c = coletarContexto("EMP-1", "2026-07");
    expect(c.totalEmpresas).toBe(1);
    expect(c.empresaCnpj).toBe(true);
    expect(c.regimeDefinido).toBe(true);
    expect(c.filiaisAtivas).toBe(1);
    expect(c.contasAnaliticas).toBe(1);
    expect(c.participantes).toBe(1);

    // E o fluxo passa a apontar para a etapa seguinte.
    const etapas = avaliarFluxo(c);
    const prontas = etapas.filter((e) => e.concluida).map((e) => e.id);
    expect(prontas).toContain("empresa");
    expect(prontas).toContain("plano-contas");
    expect(prontas).toContain("participantes");
  });
});

describe("catálogo de requisitos", () => {
  it("tem ids únicos e campos completos", () => {
    const ids = new Set(REQUISITOS.map((r) => r.id));
    expect(ids.size).toBe(REQUISITOS.length);
    for (const r of REQUISITOS) {
      expect(r.titulo.length).toBeGreaterThan(3);
      expect(r.oQue.length).toBeGreaterThan(10);
      expect(r.destino.startsWith("/")).toBe(true);
      expect(r.acao.length).toBeGreaterThan(2);
      expect(r.alimenta.length).toBeGreaterThan(0);
    }
  });

  it("aponta pendências para telas que existem na navegação", () => {
    const rotas = new Set(todosOsItens().map((i) => i.item.rota));
    for (const r of REQUISITOS) {
      // Todo requisito leva a uma tela navegável do sistema.
      const existe = rotas.has(r.destino) || [...rotas].some((rota) => r.destino.startsWith(rota));
      expect(existe, `destino sem tela: ${r.destino}`).toBe(true);
    }
  });

  it("descreve o que falta e o que já está pronto", () => {
    const vazio = contextoVazio();
    const estados = REQUISITOS.map((r) => avaliar(r.id, vazio));
    expect(estados.every((e) => e.texto.length > 0)).toBe(true);

    const cheio = { ...vazio } as Contexto;
    const pronto = { ...cheio, contasAnaliticas: 12 };
    const estado = avaliar("plano-contas", pronto);
    expect(estado.ok).toBe(true);
    expect(estado.texto).toContain("12");
  });

  it("separa pendências críticas das recomendadas", () => {
    const estados = REQUISITOS.map((r) => avaliar(r.id, contextoVazio()));
    const { criticos, recomendados, prontos } = separarPendencias(estados);
    expect(criticos.length).toBeGreaterThan(0);
    expect(recomendados.length).toBeGreaterThan(0);
    expect(criticos.every((e) => e.requisito.nivel === "critico")).toBe(true);
    expect(prontos.every((e) => e.ok)).toBe(true);
  });
});

describe("fluxo de uso", () => {
  it("começa pela empresa e termina no fechamento", () => {
    const ordem = FLUXO.map((e) => e.id);
    expect(ordem[0]).toBe("empresa");
    expect(FLUXO[FLUXO.length - 1].id).toBe("conciliacao");
    // As etapas estão numeradas em sequência.
    expect(FLUXO.map((e) => e.ordem)).toEqual(
      Array.from({ length: FLUXO.length }, (_, i) => i + 1),
    );
  });

  it("cada etapa do fluxo tem um requisito correspondente", () => {
    for (const etapa of FLUXO) {
      expect(REQUISITO_POR_ID[etapa.id], `sem requisito: ${etapa.id}`).toBeDefined();
      expect(etapa.libera.length).toBeGreaterThan(0);
      expect(etapa.rota.startsWith("/")).toBe(true);
    }
  });

  it("com a base vazia, o próximo passo é a empresa", () => {
    const etapas = avaliarFluxo(contextoVazio());
    expect(etapas.every((e) => !e.concluida)).toBe(true);
    expect(proximaEtapa(etapas)?.id).toBe("empresa");
    expect(progressoFluxo(etapas).porcentagem).toBe(0);
  });

  it("conclui as etapas conforme o contexto avança", () => {
    const base = contextoVazio();
    const etapas = avaliarFluxo({
      ...base,
      totalEmpresas: 1,
      empresaCnpj: true,
      regimeDefinido: true,
      filiaisAtivas: 1,
      contasAnaliticas: 30,
    });
    const prontas = etapas.filter((e) => e.concluida).map((e) => e.id);
    expect(prontas).toEqual(["empresa", "regime", "unidade", "plano-contas"]);
    expect(proximaEtapa(etapas)?.id).toBe("participantes");
  });
});

describe("mapa de telas", () => {
  it("toda ficha de tela aponta para rotas navegáveis", () => {
    const rotasNavegaveis = new Set(todosOsItens().map((i) => i.item.rota));
    const conectar = (rota: string) =>
      rotasNavegaveis.has(rota) || [...rotasNavegaveis].some((r) => rota.startsWith(r));
    for (const tela of TELAS) {
      for (const grupo of [tela.vemDe ?? [], tela.alimenta ?? [], tela.proximos ?? []]) {
        for (const link of grupo) {
          expect(conectar(link.rota), `link fora da navegação: ${link.rota}`).toBe(true);
        }
      }
    }
  });

  it("todo item do menu tem ficha própria com o que faz e por que existe", () => {
    for (const { item } of todosOsItens()) {
      const ficha = buscarTela(item.rota);
      expect(ficha, `sem contexto: ${item.rota}`).toBeTruthy();
      expect(ficha!.oQueFaz, `contexto genérico em ${item.rota}`).not.toBe(TELA_PADRAO.oQueFaz);
      expect(ficha!.oQueFaz.length, `"o que faz" curto demais em ${item.rota}`).toBeGreaterThan(20);
      expect(ficha!.porQue.length, `"por que" curto demais em ${item.rota}`).toBeGreaterThan(20);
    }
  });

  it("toda rota estática do app tem contexto (fora login, raiz e redirecionamentos)", () => {
    const ROTAS_FORA = new Set([
      "/auth", // tela de autenticação, fora do casco do sistema
      "/", // redireciona para o dashboard
      "/financeiro/cadastros", // aliases antigos: redirecionam para Preparativos › Cadastros
      "/financeiro/cadastros/servicos",
      "/financeiro/cadastros/produtos",
      "/financeiro/cadastros/clientes-fornecedores",
    ]);
    const rotas = [...APP_SOURCE.matchAll(/<Route\s+path="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((r) => r !== "*" && !r.includes(":") && !ROTAS_FORA.has(r));
    expect(rotas.length).toBeGreaterThan(60);
    for (const rota of rotas) {
      const ficha = buscarTela(rota);
      expect(ficha && ficha.oQueFaz !== TELA_PADRAO.oQueFaz, `sem contexto: ${rota}`).toBe(true);
    }
  });

  it("deriva contexto do menu quando a rota ainda não tem ficha escrita", () => {
    const derivada = fichaDoMenu("/dashboard");
    expect(derivada?.oQueFaz).toBe("Visão geral contábil — Visão geral, pendências e próximos passos");
    expect(derivada?.porQue).toContain("Esta tela é a etapa");
  });

  it("encontra a ficha pelo prefixo mais longo", () => {
    expect(buscarTela("/contabil/escrituracao/lancamentos")?.rota).toBe(
      "/contabil/escrituracao/lancamentos",
    );
    expect(buscarTela("/contabil/escrituracao/lancamentos/novo")?.rota).toBe(
      "/contabil/escrituracao/lancamentos",
    );
    expect(buscarTela("/fiscal/documentos/saidas")?.rota).toBe("/fiscal/documentos/saidas");
    expect(buscarTela("/rota-inexistente")).toBeUndefined();
  });
});

describe("navegação por processo", () => {
  it("tem códigos de seção únicos e em ordem", () => {
    const codigos = SECOES.map((s) => s.codigo);
    expect(new Set(codigos).size).toBe(SECOES.length);
    expect(codigos).toEqual(
      Array.from({ length: SECOES.length }, (_, i) => String(i + 1).padStart(2, "0")),
    );
  });

  it("não repete a mesma tela em duas posições do menu", () => {
    const rotas = todosOsItens().map((i) => i.item.rota);
    const repetidas = rotas.filter((r, i) => rotas.indexOf(r) !== i);
    expect(repetidas).toEqual([]);
  });

  it("descobre a seção e a trilha da rota atual", () => {
    expect(secaoDaRota("/contabil/escrituracao/lancamentos")?.titulo).toBe("Lançamentos");
    expect(secaoDaRota("/fiscal/documentos/entradas")?.titulo).toBe("Lançamentos");
    expect(secaoDaRota("/fiscal/apuracoes/iss")?.titulo).toBe("Apuração e recolhimento");
    expect(secaoDaRota("/contabil/relatorios/balancete")?.titulo).toBe("Relatórios");
    expect(trilhaDaRota("/contabil/relatorios/balancete")?.item.titulo).toBe(
      "Balancete de verificação",
    );
  });

  it("conserva o acesso a todas as áreas antigas (nada foi removido)", () => {
    const rotas = new Set(todosOsItens().map((i) => i.item.rota));
    // Alguns endereços clássicos precisam continuar alcançáveis pelo menu.
    const essenciais = [
      "/preparativos/cadastros/empresas",
      "/preparativos/cadastros/filiais",
      "/preparativos/cadastros/classe-atividades",
      "/simples-mei",
      "/fiscal/documentos/entradas",
      "/fiscal/apuracoes",
      "/fiscal/obrigacoes",
      "/fiscal/guias",
      "/fiscal/auditoria",
      "/administrativo/cadastros",
      "/administrativo/dashboard",
      "/administrativo/pesquisa",
      "/administrativo/auditoria",
      "/contabil/cadastros/plano-contas",
      "/contabil/relatorios/diario",
      "/financeiro/demonstracoes/dre",
      "/aprender",
    ];
    const faltando = essenciais.filter(
      (rota) => !rotas.has(rota) && ![...rotas].some((r) => rota.startsWith(r) || r.startsWith(rota)),
    );
    expect(faltando).toEqual([]);
  });
});

describe("orientação da tela", () => {
  it("bloqueia telas contábeis sem plano de contas e aponta a solução", () => {
    const o = orientar("/contabil/escrituracao/lancamentos", contextoVazio());
    expect(o.bloqueada).toBe(true);
    expect(o.criticos.map((c) => c.id)).toContain("plano-contas");
    const plano = o.criticos.find((c) => c.id === "plano-contas")!;
    expect(plano.requisito.destino).toBe("/contabil/cadastros/plano-contas");
    expect(plano.requisito.acao).toBe("Abrir plano de contas");
    expect(o.proximos.length).toBeGreaterThan(0);
  });

  it("libera a tela quando o contexto atende os requisitos", () => {
    const c = {
      ...contextoVazio(),
      totalEmpresas: 1,
      empresaCnpj: true,
      regimeDefinido: true,
      contasAnaliticas: 40,
      lancamentosPeriodo: 3,
    };
    const o = orientar("/contabil/relatorios/balancete", c);
    expect(o.bloqueada).toBe(false);
    expect(o.estados.every((e) => e.ok)).toBe(true);
  });

  it("explica de onde vêm e para onde vão os dados de cada tela", () => {
    const o = orientar("/fiscal/documentos/entradas", contextoVazio());
    expect(o.vemDe.map((v) => v.titulo)).toContain("Clientes e fornecedores");
    expect(o.alimenta.map((a) => a.titulo)).toContain("Livro de entradas");
  });
});

describe("consulta pública (CNPJ/CEP)", () => {
  it("normaliza os dados do CNPJ e do CEP para o cadastro", async () => {
    const { consultarCnpj, consultarCep } = await import("@/lib/consultaPublica");
    const respostas: Record<string, unknown> = {
      "cnpj/v1/11222333000181": {
        razao_social: "Confecções Exemplo Ltda",
        nome_fantasia: "Exemplo",
        cnae_fiscal: 1412601,
        cnae_fiscal_descricao: "Confecção de peças do vestuário",
        data_inicio_atividade: "2015-03-10",
        descricao_tipo_de_logradouro: "Rua",
        logradouro: "das Flores",
        numero: "120",
        bairro: "Centro",
        municipio: "São Paulo",
        uf: "SP",
        cep: "01001000",
        codigo_municipio_ibge: 3550308,
        ddd_telefone_1: "1133334444",
        email: "contato@exemplo.com.br",
      },
      "cep/v2/01001000": {
        cep: "01001-000",
        street: "Praça da Sé",
        neighborhood: "Sé",
        city: "São Paulo",
        state: "SP",
        ibge: "3550308",
      },
    };
    vi.stubGlobal("fetch", async (url: string) => {
      const chave = Object.keys(respostas).find((k) => String(url).includes(k));
      if (!chave) return { ok: false, status: 404, json: async () => ({}) } as unknown as Response;
      return { ok: true, status: 200, json: async () => respostas[chave] } as unknown as Response;
    });

    const cnpj = await consultarCnpj("11.222.333/0001-81");
    expect(cnpj.razaoSocial).toBe("Confecções Exemplo Ltda");
    expect(cnpj.uf).toBe("SP");
    expect(cnpj.codigoMunicipio).toBe("3550308");
    expect(cnpj.abertura).toBe("2015-03-10");
    expect(cnpj.cnae).toBe("1412601");

    const cep = await consultarCep("01001-000");
    expect(cep.logradouro).toBe("Praça da Sé");
    expect(cep.municipio).toBe("São Paulo");
    expect(cep.codigoMunicipio).toBe("3550308");

    vi.unstubAllGlobals();
  });

  it("explica a falha em vez de travar o cadastro", async () => {
    const { consultarCnpj, consultarCep } = await import("@/lib/consultaPublica");
    await expect(consultarCnpj("123")).rejects.toThrow(/CNPJ inválido/i);
    await expect(consultarCep("123")).rejects.toThrow(/CEP inválido/i);

    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(consultarCnpj("11222333000181")).rejects.toThrow(/conectar ao serviço/i);
    await expect(consultarCep("01001000")).rejects.toThrow(/conectar ao serviço/i);
    vi.unstubAllGlobals();
  });
});
