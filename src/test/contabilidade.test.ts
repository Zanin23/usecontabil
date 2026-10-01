import { beforeEach, describe, expect, it, vi } from "vitest";
import { reiniciarMemoria } from "./supabaseMemoria";

vi.mock("@/integrations/supabase/client", async () => (await import("./supabaseMemoria")).moduloSupabaseMemoria());

import { __reiniciarNuvemParaTestes } from "@/lib/nuvemColecoes";
import { setPraticaAtiva } from "@/lib/praticaStore";
import {
  candidatosDeCadastrosAntigos, importarCadastrosAntigos, listarParticipantes, listarProdutos, participanteVazio,
  produtoVazio, registrarParticipanteDaNFe, registrarProdutosDaNFe, salvarParticipante, salvarProduto,
  type Participante,
} from "@/lib/cadastrosStore";
import {
  carregarPlanoModelo, contaPorCodigo, excluirConta, impedimentoExclusaoConta, listarContas, salvarCentro,
  salvarConta, montarHistorico, type Conta,
} from "@/lib/planoContasStore";
import {
  estornarLancamento, excluirLancamento, gerarBalancete, gerarRazao, listarLancamentos, salvarLancamento,
  type Lancamento, type Partida,
} from "@/lib/lancamentosStore";

const CNPJ_A = "11222333000181";
const CNPJ_B = "77888999000181";
const CPF = "52998224725";
const EMP = "EMP-1";

beforeEach(() => {
  localStorage.clear();
  setPraticaAtiva(false);
  reiniciarMemoria();
  __reiniciarNuvemParaTestes();
});

const participante = (dados: Partial<Participante>): Participante => ({ ...participanteVazio(), ...dados }) as Participante;

describe("Clientes e fornecedores", () => {
  it("valida CNPJ/CPF, UF, inscrição estadual e duplicidade; grava formatado", () => {
    const invalido = salvarParticipante(participante({ nome: "Empresa X", documento: "11.222.333/0001-80", uf: "SP" }));
    expect(invalido.ok).toBe(false);
    if (!invalido.ok) expect(invalido.erros.join(" ")).toMatch(/CNPJ inválido/);

    const semUf = salvarParticipante(participante({ nome: "Empresa X", documento: CNPJ_A }));
    expect(semUf.ok).toBe(false);
    if (!semUf.ok) expect(semUf.erros).toContain("Informe a UF.");

    const semIe = salvarParticipante(participante({ nome: "Empresa X", documento: CNPJ_A, uf: "SP", indicadorIe: "Contribuinte" }));
    expect(semIe.ok).toBe(false);
    if (!semIe.ok) expect(semIe.erros.join(" ")).toMatch(/inscrição estadual/);

    const ok = salvarParticipante(participante({ nome: " Empresa X ", documento: CNPJ_A, uf: "SP", indicadorIe: "Contribuinte", ie: "110.042.490.114" }));
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.registro.documento).toBe("11.222.333/0001-81");
      expect(ok.registro.nome).toBe("Empresa X");
      expect(ok.registro.codigo).toBe("000001");
    }

    const duplicado = salvarParticipante(participante({ nome: "Outra", documento: "11.222.333/0001-81", uf: "RJ" }));
    expect(duplicado.ok).toBe(false);
    if (!duplicado.ok) expect(duplicado.erros.join(" ")).toMatch(/Já existe o cadastro 000001/);

    const pf = salvarParticipante(participante({ nome: "Maria Souza", pessoa: "Física", documento: CPF, uf: "MG", tipo: "Fornecedor" }));
    expect(pf.ok).toBe(true);
    if (pf.ok) expect(pf.registro.documento).toBe("529.982.247-25");
  });

  it("XML da NF-e cria o cadastro e, se o mesmo CNPJ aparecer com outro papel, vira cliente e fornecedor", () => {
    const r1 = registrarParticipanteDaNFe({ cnpj: CNPJ_B, nome: "LOJA DO CLIENTE", uf: "BA", ie: "123456789", municipio: "Salvador" }, "Cliente");
    expect(r1?.criado).toBe(true);
    expect(r1?.participante).toMatchObject({ tipo: "Cliente", indicadorIe: "Contribuinte", origem: "XML de NF-e", municipio: "Salvador" });

    // Mesmo CNPJ numa nota de entrada: completa sem sobrescrever o que já existe.
    const r2 = registrarParticipanteDaNFe({ cnpj: CNPJ_B, nome: "NOME DIFERENTE", uf: "BA", cep: "40000000" }, "Fornecedor");
    expect(r2?.criado).toBe(false);
    expect(r2?.participante.tipo).toBe("Cliente e fornecedor");
    expect(r2?.participante.nome).toBe("LOJA DO CLIENTE");
    expect(r2?.participante.cep).toBe("40000-000");
    expect(listarParticipantes()).toHaveLength(1);

    expect(registrarParticipanteDaNFe({ cnpj: "123", nome: "?", uf: "SP" }, "Cliente")).toBeNull();
  });
});

describe("Produtos e serviços", () => {
  it("exige NCM de 8 dígitos em produto e confere GTIN e CFOP", () => {
    const semNcm = salvarProduto({ ...produtoVazio("Produto"), descricao: "Camiseta" });
    expect(semNcm.ok).toBe(false);
    if (!semNcm.ok) expect(semNcm.erros).toContain("NCM deve ter 8 dígitos.");

    const gtinRuim = salvarProduto({ ...produtoVazio("Produto"), descricao: "Camiseta", ncm: "6109.10.00", gtin: "7891234567890", cfopSaida: "1102" });
    expect(gtinRuim.ok).toBe(false);
    if (!gtinRuim.ok) {
      expect(gtinRuim.erros.join(" ")).toMatch(/GTIN/);
      expect(gtinRuim.erros.join(" ")).toMatch(/CFOP de saída/);
    }

    const ok = salvarProduto({ ...produtoVazio("Produto"), descricao: "Camiseta", ncm: "6109.10.00", gtin: "7891234567895", cfopSaida: "5102", cClassTrib: "000001", cstIbsCbs: "000" });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.registro.ncm).toBe("61091000");

    const servico = salvarProduto({ ...produtoVazio("Serviço"), descricao: "Suporte técnico", itemLc116: "1.07", aliqIss: 2 });
    expect(servico.ok).toBe(true);
    if (servico.ok) expect(servico.registro).toMatchObject({ tipoItem: "09", unidade: "SV" });
  });

  it("itens de nota emitida entram no cadastro pelo código, sem duplicar", () => {
    const itens = [
      { codigo: "CAM-01", descricao: "Camiseta básica", ncm: "61091000", cfop: "5102", cst: "00", quantidade: 1, unitario: 30, valor: 30, unidade: "un" },
      { codigo: "CAM-01", descricao: "Camiseta básica", ncm: "61091000", cfop: "5102", cst: "00", quantidade: 2, unitario: 30, valor: 60 },
      { descricao: "Bermuda", ncm: "62034200", cfop: "5405", cst: "60", quantidade: 1, unitario: 80, valor: 80 },
    ];
    expect(registrarProdutosDaNFe(itens)).toBe(2);
    expect(registrarProdutosDaNFe(itens)).toBe(0);
    const [camiseta] = listarProdutos().filter((p) => p.codigo === "CAM-01");
    expect(camiseta).toMatchObject({ unidade: "UN", cfopSaida: "5102", origem: "XML de NF-e" });
  });

  it("traz os cadastros antigos (Financeiro › Cadastros e documentos) sem duplicar", () => {
    localStorage.setItem("usecontabil.tributario.v1", JSON.stringify({
      [EMP]: {
        parceiros: [
          { tipo: "Ambos", nome: "Parceiro válido", documento: "12.345.678/0001-95", uf: "SP", contribuinte: true, ie: "ISENTO", ativo: true, retencoes: "ISS, IRRF" },
          { tipo: "Cliente", nome: "CNPJ ruim", documento: "12.345.678/0001-90", uf: "SP", ativo: true },
        ],
        produtos: [{ codigo: "P-1", descricao: "Chapa de aço", ncm: "72085100", cfopPadrao: "5102", unidade: "KG", ativo: true }],
        documentos: [
          { tipo: "NF-e", grupo: "faturamento", participante: "Cliente do XML", participanteDoc: "98.765.432/0001-98", ufDestino: "BA", itens: [{ descricao: "Perfil U", tipo: "produto", ncm: "73063090", cfop: "6102" }] },
        ],
      },
    }));
    localStorage.setItem("usecontabil.financeiro.v1", JSON.stringify({ servicos: [{ codigo: "SVC-1", servico: "Rateio administrativo", unidade: "MES", itemLc: "17.19", iss: "5,00", valor: "4.200,00", situacao: "Ativo" }] }));

    const c = candidatosDeCadastrosAntigos();
    expect(c.participantes.map((p) => p.nome).sort()).toEqual(["Cliente do XML", "Parceiro válido"]);
    expect(c.documentosInvalidos).toBe(1);
    expect(c.produtos.map((p) => p.descricao).sort()).toEqual(["Chapa de aço", "Perfil U", "Rateio administrativo"]);
    const valido = c.participantes.find((p) => p.nome === "Parceiro válido")!;
    expect(valido).toMatchObject({ tipo: "Cliente e fornecedor", indicadorIe: "Contribuinte isento", retencoes: ["ISS", "IRRF"] });
    const servico = c.produtos.find((p) => p.tipo === "Serviço")!;
    expect(servico).toMatchObject({ aliqIss: 5, precoPadrao: 4200, itemLc116: "17.19" });

    expect(importarCadastrosAntigos(c)).toEqual({ participantes: 2, produtos: 3 });
    expect(candidatosDeCadastrosAntigos().participantes).toHaveLength(0);
    expect(candidatosDeCadastrosAntigos().produtos).toHaveLength(0);
  });
});

describe("Plano de contas", () => {
  it("carrega o modelo uma vez só, com hierarquia íntegra, reduzidos únicos e redutoras invertidas", () => {
    const criadas = carregarPlanoModelo();
    expect(criadas).toBeGreaterThan(150);
    expect(carregarPlanoModelo()).toBe(0);
    const contas = listarContas();
    const codigos = new Set(contas.map((c) => c.codigo));
    for (const c of contas) {
      const pai = c.codigo.includes(".") ? c.codigo.slice(0, c.codigo.lastIndexOf(".")) : null;
      if (pai) expect(codigos.has(pai), `${c.codigo} sem conta superior`).toBe(true);
    }
    const reduzidos = contas.filter((c) => c.tipo === "Analítica").map((c) => c.reduzido);
    expect(new Set(reduzidos).size).toBe(reduzidos.length);
    expect(contaPorCodigo("1.2.03.090")).toMatchObject({ natureza: "Credora", grupo: "Ativo", tipo: "Analítica" });
    expect(contaPorCodigo("3.2.01.001")).toMatchObject({ natureza: "Devedora", grupo: "Receitas" });
    expect(contaPorCodigo("2.3.01.001")).toMatchObject({ natureza: "Credora", grupo: "Patrimônio líquido" });
    expect(contaPorCodigo("4.1.01.001")).toMatchObject({ grupo: "Custos", natureza: "Devedora" });
    expect(contaPorCodigo("1.1")).toMatchObject({ tipo: "Sintética" });
  });

  it("não aceita conta sem superior, abaixo de analítica, código repetido nem analítica com subcontas", () => {
    carregarPlanoModelo();
    const base = { id: "", descricao: "Nova", tipo: "Analítica", natureza: "Devedora", grupo: "Ativo", exigeCentroCusto: false, situacao: "Ativa", origem: "Manual" } as Conta;
    const semPai = salvarConta({ ...base, codigo: "1.9.01.001" });
    expect(semPai.ok).toBe(false);
    const abaixoDeAnalitica = salvarConta({ ...base, codigo: "1.1.01.001.01" });
    expect(abaixoDeAnalitica.ok).toBe(false);
    if (!abaixoDeAnalitica.ok) expect(abaixoDeAnalitica.erros.join(" ")).toMatch(/é analítica/);
    const repetido = salvarConta({ ...base, codigo: "1.1.01.001" });
    expect(repetido.ok).toBe(false);
    const sintetica = contaPorCodigo("1.1.01")!;
    const virarAnalitica = salvarConta({ ...sintetica, tipo: "Analítica" });
    expect(virarAnalitica.ok).toBe(false);
    const nova = salvarConta({ ...base, codigo: "1.1.01.011", descricao: "Banco Itaú c/c 12345-6" });
    expect(nova.ok).toBe(true);
    if (nova.ok) expect(Number(nova.registro.reduzido)).toBeGreaterThan(0);
  });

  it("montarHistorico troca os marcadores", () => {
    expect(montarHistorico("Venda conforme NF {documento} - {participante}", { documento: "123", participante: "Loja X", complemento: "(parcela 1)" }))
      .toBe("Venda conforme NF 123 - Loja X (parcela 1)");
  });
});

describe("Lançamentos contábeis", () => {
  const id = (codigo: string) => contaPorCodigo(codigo)!.id;
  const partida = (codigo: string, tipo: "D" | "C", valor: number, extra: Partial<Partida> = {}): Partida => ({ id: "", contaId: id(codigo), tipo, valor, ...extra });
  const lanc = (data: string, partidas: Partida[], extra: Partial<Lancamento> = {}): Lancamento => ({
    id: "", empresaId: EMP, numero: 0, data, tipo: "Normal", historico: "Teste", partidas, origem: "Manual", ...extra,
  });
  const fecharCompetencia = (competencia: string) =>
    localStorage.setItem("usecontabil.fechamentos.v1", JSON.stringify([{ key: `${EMP}|${competencia}`, empresaId: EMP, competencia }]));

  beforeEach(() => {
    carregarPlanoModelo();
  });

  it("grava com numeração sequencial por empresa e valida partidas dobradas", () => {
    const a = salvarLancamento(lanc("2026-07-10", [partida("1.1.01.010", "D", 1000), partida("2.3.01.001", "C", 1000)]));
    expect(a.ok).toBe(true);
    const b = salvarLancamento(lanc("2026-07-11", [partida("1.1.01.001", "D", 50.1), partida("1.1.01.010", "C", 50.1)]));
    expect(b.ok && b.registro.numero).toBe(2);
    const outraEmpresa = salvarLancamento(lanc("2026-07-11", [partida("1.1.01.001", "D", 5), partida("1.1.01.010", "C", 5)], { empresaId: "EMP-2" }));
    expect(outraEmpresa.ok && outraEmpresa.registro.numero).toBe(1);

    const desbalanceado = salvarLancamento(lanc("2026-07-12", [partida("1.1.01.001", "D", 100), partida("1.1.01.010", "C", 99.99)]));
    expect(desbalanceado.ok).toBe(false);
    if (!desbalanceado.ok) expect(desbalanceado.erros.join(" ")).toMatch(/diferença de 0,01/);

    const sintetica = salvarLancamento(lanc("2026-07-12", [partida("1.1.01", "D", 10), partida("1.1.01.010", "C", 10)]));
    expect(sintetica.ok).toBe(false);
    if (!sintetica.ok) expect(sintetica.erros.join(" ")).toMatch(/sintética/);

    const umLado = salvarLancamento(lanc("2026-07-12", [partida("1.1.01.001", "D", 10), partida("1.1.01.010", "D", 10)]));
    expect(umLado.ok).toBe(false);
  });

  it("respeita conta inativa e conta que exige centro de custo", () => {
    const despesa = contaPorCodigo("4.2.02.001")!;
    salvarConta({ ...despesa, exigeCentroCusto: true });
    const semCentro = salvarLancamento(lanc("2026-07-10", [partida("4.2.02.001", "D", 300), partida("1.1.01.010", "C", 300)]));
    expect(semCentro.ok).toBe(false);
    if (!semCentro.ok) expect(semCentro.erros.join(" ")).toMatch(/exige centro de custo/);
    const cc = salvarCentro({ id: "", codigo: "01", descricao: "Administração", tipo: "Administrativo", situacao: "Ativo" });
    const comCentro = salvarLancamento(lanc("2026-07-10", [partida("4.2.02.001", "D", 300, { centroCustoId: cc.ok ? cc.registro.id : "" }), partida("1.1.01.010", "C", 300)]));
    expect(comCentro.ok).toBe(true);

    const caixa = contaPorCodigo("1.1.01.002")!;
    salvarConta({ ...caixa, situacao: "Inativa" });
    const inativa = salvarLancamento(lanc("2026-07-10", [partida("1.1.01.002", "D", 1), partida("1.1.01.010", "C", 1)]));
    expect(inativa.ok).toBe(false);
  });

  it("competência encerrada bloqueia lançar, alterar e excluir; a correção é por estorno", () => {
    const r = salvarLancamento(lanc("2026-06-15", [partida("4.2.02.002", "D", 800), partida("2.1.05.004", "C", 800)]));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    fecharCompetencia("2026-06");

    const novo = salvarLancamento(lanc("2026-06-20", [partida("4.2.02.002", "D", 1), partida("2.1.05.004", "C", 1)]));
    expect(novo.ok).toBe(false);
    if (!novo.ok) expect(novo.erros.join(" ")).toMatch(/06\/2026 está encerrada/);
    expect(salvarLancamento({ ...r.registro, historico: "alterado" }).ok).toBe(false);
    expect(excluirLancamento(r.registro.id)).toMatch(/encerrada/);

    const estornoNaFechada = estornarLancamento(r.registro.id, { data: "2026-06-30" });
    expect(estornoNaFechada.ok).toBe(false);
    const estorno = estornarLancamento(r.registro.id, { data: "2026-07-01", motivo: "lançado em duplicidade" });
    expect(estorno.ok).toBe(true);
    if (!estorno.ok) return;
    expect(estorno.registro.tipo).toBe("Estorno");
    expect(estorno.registro.partidas.map((p) => p.tipo)).toEqual(["C", "D"]);
    expect(estorno.registro.historico).toMatch(/Estorno do lançamento nº 1 de 15\/06\/2026 — lançado em duplicidade/);
    expect(estornarLancamento(r.registro.id, { data: "2026-07-02" }).ok).toBe(false);

    // Saldo zerado depois do estorno.
    const bal = gerarBalancete(EMP, "2026-07-01", "2026-07-31");
    expect(bal.linhas.find((l) => l.conta.codigo === "4.2.02.002")?.saldoAtual).toBe(0);
  });

  it("lançamento estornado só pode ser excluído depois do estorno (em competência aberta)", () => {
    const r = salvarLancamento(lanc("2026-07-05", [partida("1.1.01.001", "D", 20), partida("1.1.01.010", "C", 20)]));
    if (!r.ok) throw new Error("falhou");
    const e = estornarLancamento(r.registro.id, { data: "2026-07-06" });
    if (!e.ok) throw new Error("falhou");
    expect(excluirLancamento(r.registro.id)).toMatch(/Exclua o estorno antes/);
    expect(excluirLancamento(e.registro.id)).toBeNull();
    expect(excluirLancamento(r.registro.id)).toBeNull();
    expect(listarLancamentos(EMP)).toHaveLength(0);
  });

  it("conta com lançamento não pode ser excluída", () => {
    salvarLancamento(lanc("2026-07-05", [partida("1.1.01.001", "D", 20), partida("1.1.01.010", "C", 20)]));
    const caixa = contaPorCodigo("1.1.01.001")!;
    expect(impedimentoExclusaoConta(caixa)).toMatch(/lançamento/);
    expect(excluirConta(caixa.id)).toMatch(/Inative/);
    expect(excluirConta(contaPorCodigo("1.1")!.id)).toMatch(/subcontas/);
  });

  it("balancete soma nas sintéticas, traz saldo anterior e fecha débitos = créditos", () => {
    salvarLancamento(lanc("2026-06-30", [partida("1.1.01.010", "D", 10000), partida("2.3.01.001", "C", 10000)], { tipo: "Abertura", historico: "Saldo de abertura" }));
    salvarLancamento(lanc("2026-07-10", [partida("1.1.02.001", "D", 5000), partida("3.1.01.001", "C", 5000)]));
    salvarLancamento(lanc("2026-07-12", [partida("3.2.02.001", "D", 900), partida("2.1.03.001", "C", 900)]));
    salvarLancamento(lanc("2026-07-20", [partida("1.1.01.010", "D", 5000), partida("1.1.02.001", "C", 5000)]));
    salvarLancamento(lanc("2026-08-01", [partida("1.1.01.001", "D", 1), partida("1.1.01.010", "C", 1)]));

    const bal = gerarBalancete(EMP, "2026-07-01", "2026-07-31", { ocultarZeradas: true });
    const linha = (codigo: string) => bal.linhas.find((l) => l.conta.codigo === codigo)!;
    expect(linha("1.1.01.010")).toMatchObject({ saldoAnterior: 10000, debitos: 5000, creditos: 0, saldoAtual: 15000 });
    expect(linha("1.1.02.001")).toMatchObject({ saldoAnterior: 0, debitos: 5000, creditos: 5000, saldoAtual: 0 });
    expect(linha("1")).toMatchObject({ saldoAnterior: 10000, saldoAtual: 15000 });
    expect(linha("3")).toMatchObject({ debitos: 900, creditos: 5000, saldoAtual: -4100 });
    expect(bal.totais.debitos).toBe(bal.totais.creditos);
    expect(bal.totais.devedor).toBe(bal.totais.credor);
    expect(bal.linhas.some((l) => l.conta.codigo === "1.1.01.001")).toBe(false); // movimento só em agosto
    expect(bal.linhas.every((l) => l.saldoAnterior !== 0 || l.debitos !== 0 || l.creditos !== 0)).toBe(true);
  });

  it("razão mostra saldo anterior, saldo linha a linha e a contrapartida", () => {
    salvarLancamento(lanc("2026-06-30", [partida("1.1.01.010", "D", 1000), partida("2.3.01.001", "C", 1000)]));
    salvarLancamento(lanc("2026-07-03", [partida("4.2.02.002", "D", 250), partida("1.1.01.010", "C", 250)], { historico: "Conta de luz" }));
    salvarLancamento(lanc("2026-07-09", [partida("1.1.01.010", "D", 600), partida("3.1.01.003", "C", 500), partida("3.3.01.004", "C", 100)]));
    const r = gerarRazao(EMP, id("1.1.01.010"), "2026-07-01", "2026-07-31");
    expect(r.saldoAnterior).toBe(1000);
    expect(r.linhas.map((l) => l.saldo)).toEqual([750, 1350]);
    expect(r.linhas[0].contrapartida).toBe("4.2.02.002 Energia elétrica");
    expect(r.linhas[1].contrapartida).toBe("Diversas");
    expect(r).toMatchObject({ debitos: 600, creditos: 250, saldoFinal: 1350 });
  });
});
