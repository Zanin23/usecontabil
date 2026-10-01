/**
 * Importação por planilha: plano de contas e balancete de abertura.
 *
 * Cobre a leitura (CSV com ; , e tabulação, campos entre aspas e .xlsx com e sem compressão), as
 * regras do plano de contas e a gravação do balancete como lançamento do tipo "Abertura".
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reiniciarMemoria } from "./supabaseMemoria";

vi.mock("@/integrations/supabase/client", async () => (await import("./supabaseMemoria")).moduloSupabaseMemoria());

import { __reiniciarNuvemParaTestes } from "@/lib/nuvemColecoes";
import { setPraticaAtiva } from "@/lib/praticaStore";
import {
  aberturasExistentes, importarBalanceteAbertura, importarPlanoDeContas, lerBalanceteAbertura, lerPlanoDeContas,
  numeroDaCelula,
} from "@/lib/importacaoContabil";
import { carregarPlanoModelo, contaPorCodigo, listarContas } from "@/lib/planoContasStore";
import { listarLancamentos } from "@/lib/lancamentosStore";
import { colunaDaReferencia, lerCsv, lerPlanilha } from "@/lib/planilha";

const bytes = (texto: string) => new TextEncoder().encode(texto).buffer as ArrayBuffer;

beforeEach(() => {
  localStorage.clear();
  setPraticaAtiva(false);
  reiniciarMemoria();
  __reiniciarNuvemParaTestes();
});

describe("Leitura de CSV", () => {
  it("detecta o separador, respeita aspas e remove o BOM", () => {
    const csv = "\uFEFFCódigo;Descrição;Valor\n1.1.01.001;\"Caixa, matriz\";1.234,56\n";
    const linhas = lerCsv(csv);
    expect(linhas).toEqual([
      ["Código", "Descrição", "Valor"],
      ["1.1.01.001", "Caixa, matriz", "1.234,56"],
    ]);
    expect(numeroDaCelula(linhas[1][2])).toBe(1234.56);
  });

  it("mantém quebra de linha dentro do campo entre aspas", () => {
    const linhas = lerCsv('conta;descricao\n1; "Linha 1\nLinha 2"\n');
    expect(linhas).toHaveLength(2);
    expect(linhas[1][1]).toBe("Linha 1\nLinha 2");
  });

  it("aceita tabulação e vírgula como separador", () => {
    expect(lerCsv("a\tb\tc\n1\t2\t3")[1]).toEqual(["1", "2", "3"]);
    expect(lerCsv("a,b\n1,2")[1]).toEqual(["1", "2"]);
  });

  it("recusa arquivo .xls (Excel antigo) com orientação", async () => {
    await expect(lerPlanilha("plano.xls", bytes("qualquer"))).rejects.toThrow(/salve como .xlsx ou .csv/i);
  });
});

/* ------------------------------------------------------------------ */
/* XLSX montado à mão (ZIP) para o teste                               */
/* ------------------------------------------------------------------ */

/** CRC-32 usado só na montagem do arquivo de teste (o leitor não valida o CRC). */
function crc32(dados: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of dados) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function deflateRaw(dados: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream("deflate-raw");
  const escritor = cs.writable.getWriter();
  void escritor.write(dados);
  void escritor.close();
  const leitor = cs.readable.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { value, done } = await leitor.read();
    if (done) break;
    if (value) {
      partes.push(value as Uint8Array);
      total += (value as Uint8Array).length;
    }
  }
  const saida = new Uint8Array(total);
  let pos = 0;
  for (const p of partes) {
    saida.set(p, pos);
    pos += p.length;
  }
  return saida;
}

/** ZIP mínimo (local header + diretório central + EOCD) com os arquivos informados. */
async function montarZip(arquivos: { nome: string; conteudo: string; comprimir: boolean }[]): Promise<ArrayBuffer> {
  const codificador = new TextEncoder();
  const locais: Uint8Array[] = [];
  const centrais: Uint8Array[] = [];
  let deslocamento = 0;

  for (const arquivo of arquivos) {
    const nome = codificador.encode(arquivo.nome);
    const bruto = codificador.encode(arquivo.conteudo);
    const dados = arquivo.comprimir ? await deflateRaw(bruto) : bruto;
    const metodo = arquivo.comprimir ? 8 : 0;
    const crc = crc32(bruto);

    const local = new Uint8Array(30 + nome.length + dados.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(8, metodo, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, dados.length, true);
    lv.setUint32(22, bruto.length, true);
    lv.setUint16(26, nome.length, true);
    local.set(nome, 30);
    local.set(dados, 30 + nome.length);
    locais.push(local);

    const central = new Uint8Array(46 + nome.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(10, metodo, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, dados.length, true);
    cv.setUint32(24, bruto.length, true);
    cv.setUint16(28, nome.length, true);
    cv.setUint32(42, deslocamento, true);
    central.set(nome, 46);
    centrais.push(central);

    deslocamento += local.length;
  }

  const tamanhoCentral = centrais.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, arquivos.length, true);
  ev.setUint16(10, arquivos.length, true);
  ev.setUint32(12, tamanhoCentral, true);
  ev.setUint32(16, deslocamento, true);

  const total = deslocamento + tamanhoCentral + 22;
  const saida = new Uint8Array(total);
  let pos = 0;
  for (const parte of [...locais, ...centrais, eocd]) {
    saida.set(parte, pos);
    pos += parte.length;
  }
  return saida.buffer;
}

const SHARED = `<?xml version="1.0" encoding="UTF-8"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="6" uniqueCount="6">
<si><t>Código</t></si><si><t>Descrição</t></si><si><t>Tipo</t></si>
<si><t>1.1.01.001</t></si><si><t>Caixa geral</t></si><si><t>Analítica</t></si>
</sst>`;

const SHEET = `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>
<row r="2"><c r="A2" t="s"><v>3</v></c><c r="B2" t="s"><v>4</v></c><c r="C2" t="s"><v>5</v></c></row>
</sheetData></worksheet>`;

const WORKBOOK = `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Plano" sheetId="1" r:id="rId1"/><sheet name="Oculta" sheetId="2" state="hidden" r:id="rId2"/></sheets>
</workbook>`;

const RELS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
</Relationships>`;

const arquivosXlsx = (comprimir: boolean) => [
  { nome: "xl/workbook.xml", conteudo: WORKBOOK, comprimir },
  { nome: "xl/_rels/workbook.xml.rels", conteudo: RELS, comprimir },
  { nome: "xl/sharedStrings.xml", conteudo: SHARED, comprimir },
  { nome: "xl/worksheets/sheet1.xml", conteudo: SHEET, comprimir },
  { nome: "xl/worksheets/sheet2.xml", conteudo: "<worksheet/>", comprimir: false },
];

describe("Leitura de Excel (.xlsx)", () => {
  it("lê a primeira aba visível, com textos compartilhados", async () => {
    const planilha = await lerPlanilha("plano.xlsx", await montarZip(arquivosXlsx(false)));
    expect(planilha.aba).toBe("Plano");
    expect(planilha.linhas[0]).toEqual(["Código", "Descrição", "Tipo"]);
    expect(planilha.linhas[1]).toEqual(["1.1.01.001", "Caixa geral", "Analítica"]);
  });

  it("lê também quando as entradas do ZIP estão comprimidas (deflate)", async () => {
    const planilha = await lerPlanilha("plano.xlsx", await montarZip(arquivosXlsx(true)));
    expect(planilha.linhas[1][1]).toBe("Caixa geral");
  });

  it("converte a referência da célula em número de coluna", () => {
    expect(colunaDaReferencia("A1")).toBe(0);
    expect(colunaDaReferencia("B3")).toBe(1);
    expect(colunaDaReferencia("AA1")).toBe(26);
  });

  it("lê números e células vazias na posição certa", async () => {
    const sheet = `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
<row r="1"><c r="A1" t="inlineStr"><is><t>Conta</t></is></c><c r="C1"><v>1234.56</v></c></row>
</sheetData></worksheet>`;
    const planilha = await lerPlanilha("valores.xlsx", await montarZip([
      { nome: "xl/worksheets/sheet1.xml", conteudo: sheet, comprimir: false },
    ]));
    expect(planilha.linhas[0][0]).toBe("Conta");
    expect(planilha.linhas[0][1]).toBeNull();
    expect(planilha.linhas[0][2]).toBe(1234.56);
    expect(numeroDaCelula(planilha.linhas[0][2])).toBe(1234.56);
  });
});

/* ------------------------------------------------------------------ */
/* Plano de contas                                                     */
/* ------------------------------------------------------------------ */

const CSV_PLANO = [
  "Código;Descrição;Tipo;Natureza;Grupo;Reduzido;Referencial RFB;Exige centro de custo;Situação",
  "1.1.01.001;Caixa geral;;;Ativo;1;1.1.1.01.01;Não;Ativa",
  "1;ATIVO;Sintética;Devedora;Ativo;;;NÃO;Ativa",
  "1.1.01;Disponível;;;;10;;;Ativa",
  "4.2;DESPESAS OPERACIONAIS;;;;;",
  "4.2.01;Pessoal;;;;;",
  "4.2.01.001;Despesa com pessoal;Analítica;Devedora;Despesas;11;;Sim;Ativa",
  "4;DESPESAS;;;;;",
  "1.1;ATIVO CIRCULANTE;;;;;",
].join("\n");

describe("Importação do plano de contas", () => {
  it("reconhece o cabeçalho, infere tipo/grupo/natureza e ordena pelos códigos", () => {
    const leitura = lerPlanoDeContas(lerCsv(CSV_PLANO));
    expect(leitura.erros).toEqual([]);
    expect(leitura.cabecalho).toBe(1);
    expect(leitura.contas.map((c) => c.codigo)).toEqual(["1", "1.1", "1.1.01", "1.1.01.001", "4", "4.2", "4.2.01", "4.2.01.001"]);
    const caixa = leitura.contas.find((c) => c.codigo === "1.1.01.001")!;
    expect(caixa.tipo).toBe("Analítica");
    expect(caixa.grupo).toBe("Ativo");
    expect(caixa.natureza).toBe("Devedora");
    expect(caixa.reduzido).toBe("1");
    expect(caixa.referencial).toBe("1.1.1.01.01");
    const disponivel = leitura.contas.find((c) => c.codigo === "1.1.01")!;
    expect(disponivel.tipo).toBe("Sintética");
    const despesas = leitura.contas.find((c) => c.codigo === "4")!;
    expect(despesas.tipo).toBe("Sintética");
    const pessoal = leitura.contas.find((c) => c.codigo === "4.2.01.001")!;
    expect(pessoal.exigeCentroCusto).toBe(true);
  });

  it("avisa quando o cabeçalho não existe e aponta linhas com problema", () => {
    expect(() => lerPlanoDeContas([["a", "b"], ["1", "2"]])).toThrow(/cabeçalho/i);
    const leitura = lerPlanoDeContas(lerCsv("Código;Descrição\n1.1.01.001;;\n1.1.01.002;Sem pai"));
    expect(leitura.erros).toHaveLength(1);
    expect(leitura.erros[0].linha).toBe(2);
    expect(leitura.erros[0].mensagem).toMatch(/descrição da conta 1.1.01.001/i);
  });

  it("grava as contas na ordem (pai antes da filha) e atualiza as existentes", () => {
    const leitura = lerPlanoDeContas(lerCsv(CSV_PLANO));
    const r = importarPlanoDeContas(leitura.contas);
    expect(r.erros).toEqual([]);
    expect(r.criadas).toBe(8);
    expect(listarContas()).toHaveLength(8);
    expect(contaPorCodigo("1.1.01.001")?.descricao).toBe("Caixa geral");
    expect(contaPorCodigo("1.1.01.001")?.origem).toBe("Importação");

    const atualizado = lerPlanoDeContas(lerCsv("Código;Descrição\n1.1.01.001;Caixa matriz\n"));
    const r2 = importarPlanoDeContas(atualizado.contas);
    expect(r2.criadas).toBe(0);
    expect(r2.atualizadas).toBe(1);
    expect(contaPorCodigo("1.1.01.001")?.descricao).toBe("Caixa matriz");

    const r3 = importarPlanoDeContas(atualizado.contas, { atualizarExistentes: false });
    expect(r3.ignoradas).toBe(1);
    expect(contaPorCodigo("1.1.01.001")?.descricao).toBe("Caixa matriz");
  });

  it("cria como sintéticas as contas superiores que faltam na planilha", () => {
    const leitura = lerPlanoDeContas(lerCsv("Código;Descrição\n2.5.01.001;Conta órfã"));
    const r = importarPlanoDeContas(leitura.contas);
    expect(r.erros).toEqual([]);
    expect(r.criadas).toBe(4);
    expect(r.superiores).toBe(3);
    expect(listarContas().map((c) => [c.codigo, c.tipo])).toEqual([
      ["2", "Sintética"], ["2.5", "Sintética"], ["2.5.01", "Sintética"], ["2.5.01.001", "Analítica"],
    ]);
    expect(contaPorCodigo("2.5")).toMatchObject({ descricao: /Conta superior 2\.5/, grupo: "Passivo", natureza: "Credora" });
  });
});

/* ------------------------------------------------------------------ */
/* Balancete de abertura                                               */
/* ------------------------------------------------------------------ */

const CSV_BALANCETE = [
  "Conta;Descrição;Débito;Crédito",
  "1.1.01.001;Caixa geral;10.000,00;",
  "1.1.02.001;Clientes;15.000,00;",
  "2.1.01.001;Fornecedores;;20.000,00",
  "2.3.01.001;Capital social;;5.000,00",
].join("\n");

describe("Importação do balancete de abertura", () => {
  beforeEach(() => {
    carregarPlanoModelo();
  });

  it("lê valores em débito e crédito e fecha a soma", () => {
    const leitura = lerBalanceteAbertura(lerCsv(CSV_BALANCETE));
    expect(leitura.erros).toEqual([]);
    expect(leitura.linhas).toHaveLength(4);
    expect(leitura.debitos).toBe(25_000);
    expect(leitura.creditos).toBe(25_000);
    expect(leitura.diferenca).toBe(0);
  });

  it("grava um lançamento do tipo Abertura com uma partida por conta", () => {
    const leitura = lerBalanceteAbertura(lerCsv(CSV_BALANCETE));
    const r = importarBalanceteAbertura(leitura, {
      empresaId: "EMP-1",
      data: "2026-07-01",
      historico: "Balancete de abertura — importado",
      documento: "Termo de abertura",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.registro.tipo).toBe("Abertura");
    expect(r.registro.origem).toBe("Importação");
    expect(r.registro.empresaId).toBe("EMP-1");
    expect(r.registro.data).toBe("2026-07-01");
    expect(r.registro.partidas).toHaveLength(4);
    expect(r.registro.partidas.filter((p) => p.tipo === "D")).toHaveLength(2);
    const salvo = listarLancamentos("EMP-1")[0];
    expect(salvo.numero).toBe(1);
    const caixa = contaPorCodigo("1.1.01.001")!;
    expect(salvo.partidas.find((p) => p.contaId === caixa.id)?.valor).toBe(10_000);
    expect(aberturasExistentes(listarLancamentos("EMP-1"))).toHaveLength(1);
  });

  it("recusa planilha desbalanceada, com conta inexistente ou conta repetida", () => {
    const desbalanceada = lerBalanceteAbertura(lerCsv("Conta;Débito;Crédito\n1.1.01.001;10.000,00;\n2.3.01.001;;9.000,00"));
    expect(desbalanceada.diferenca).toBe(1000);
    const r = importarBalanceteAbertura(desbalanceada, { empresaId: "EMP-1", data: "2026-07-01", historico: "X" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.join(" ")).toMatch(/não fecham: diferença de R\$ 1000.00/);

    const inexistente = lerBalanceteAbertura(lerCsv("Conta;Débito\n9.9.99.999;100,00"));
    expect(inexistente.erros[0].mensagem).toMatch(/não encontrada no plano de contas/i);

    const repetida = lerBalanceteAbertura(lerCsv("Conta;Débito\n1.1.01.001;100,00\n1.1.01.001;200,00"));
    expect(repetida.erros[0].mensagem).toMatch(/mais de uma vez/i);

    const doisLados = lerBalanceteAbertura(lerCsv("Conta;Débito;Crédito\n1.1.01.001;100,00;100,00"));
    expect(doisLados.erros[0].mensagem).toMatch(/apenas um lado/i);
  });

  it("aceita a coluna Saldo (positivo = devedor, negativo = credor) e o código reduzido", () => {
    const caixa = contaPorCodigo("1.1.01.001")!;
    const leitura = lerBalanceteAbertura(lerCsv(
      `Conta;Saldo\n${caixa.reduzido};1.500,00\n2.3.01.001;-1.500,00`,
    ));
    expect(leitura.erros).toEqual([]);
    expect(leitura.linhas[0]).toMatchObject({ tipo: "D", valor: 1500 });
    expect(leitura.linhas[1]).toMatchObject({ tipo: "C", valor: 1500 });
    expect(importarBalanceteAbertura(leitura, { empresaId: "EMP-1", data: "2026-07-01", historico: "Abertura" }).ok).toBe(true);
  });

  it("não grava nada quando a competência está encerrada", () => {
    localStorage.setItem("usecontabil.fechamentos.v1", JSON.stringify([{ key: "EMP-1|2026-07" }]));
    const leitura = lerBalanceteAbertura(lerCsv(CSV_BALANCETE));
    const r = importarBalanceteAbertura(leitura, { empresaId: "EMP-1", data: "2026-07-01", historico: "Abertura" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.join(" ")).toMatch(/encerrada/i);
    expect(listarLancamentos("EMP-1")).toHaveLength(0);
  });

  it("ignora linhas de total e contas zeradas (linhas vazias já saem na leitura do CSV)", () => {
    const leitura = lerBalanceteAbertura(lerCsv(
      "Conta;Débito;Crédito\n1.1.01.001;10.000,00;\nTOTAL;10.000,00;\n1.1.02.001;0,00;\n;;\n2.3.01.001;;10.000,00",
    ));
    expect(leitura.erros).toEqual([]);
    expect(leitura.linhas).toHaveLength(2);
    expect(leitura.linhasIgnoradas).toBe(2);
  });

  it("separa o lançamento por empresa", () => {
    const leitura = lerBalanceteAbertura(lerCsv(CSV_BALANCETE));
    const r = importarBalanceteAbertura(leitura, { empresaId: "EMP-B", data: "2026-07-02", historico: "Abertura B" });
    expect(r.ok).toBe(true);
    expect(listarLancamentos("EMP-A")).toHaveLength(0);
    expect(listarLancamentos("EMP-B")).toHaveLength(1);
  });
});
