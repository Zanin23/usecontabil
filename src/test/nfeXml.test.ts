import { describe, expect, it } from "vitest";
import { cfopDeEntrada, cfopPrincipal, conferirParticipacao, lerNFe, papelEsperado, situacaoPorCStat } from "@/lib/nfeXml";
import { CNPJ_CLIENTE, CNPJ_EMPRESA, CNPJ_FORNECEDOR, gerarNFe } from "./nfeXml";

describe("lerNFe", () => {
  it("lê cabeçalho, participantes, UFs, totais e itens", () => {
    const nfe = lerNFe(
      gerarNFe({
        numero: "5004", indFinal: "1",
        itens: [{ desc: "Camiseta", cfop: "5102", valor: 1000, cst: "00" }, { desc: "Produto ST", cfop: "5405", valor: 3000, ncm: "62034200", cst: "60", pIcms: 0 }],
      }),
    );
    expect(nfe.numero).toBe("5004");
    expect(nfe.serie).toBe("1");
    expect(nfe.dataBR).toBe("10/07/2026");
    expect(nfe.chave).toHaveLength(44);
    expect(nfe.emitente).toMatchObject({ cnpj: CNPJ_EMPRESA, uf: "SP" });
    expect(nfe.destinatario).toMatchObject({ cnpj: CNPJ_CLIENTE, uf: "BA", contribuinteIcms: true });
    expect(nfe.consumidorFinal).toBe(true);
    expect(nfe.valorNF).toBe(4000);
    expect(nfe.itens).toHaveLength(2);
    expect(nfe.itens[1]).toMatchObject({ cfop: "5405", ncm: "62034200", cst: "60", valor: 3000, quantidade: 10 });
    expect(nfe.situacao).toBe("autorizada");
  });

  it("funciona com XML sem protocolo e com prefixo de namespace", () => {
    const sem = lerNFe(gerarNFe({ cStat: null }));
    expect(sem.situacao).toBe("sem-protocolo");
    expect(sem.chave).toHaveLength(44); // vem do atributo Id de <infNFe>
    const prefixado = gerarNFe().replace(/<(\/?)(\w+)/g, "<$1n:$2").replace('xmlns="', 'xmlns:n="');
    expect(lerNFe(prefixado).numero).toBe("5001");
  });

  it.each([
    ["100", "autorizada"], ["150", "autorizada"], ["101", "cancelada"], ["135", "cancelada"],
    ["110", "denegada"], ["301", "denegada"], ["204", "rejeitada"], ["", "sem-protocolo"],
  ])("cStat %s → %s", (cStat, esperado) => {
    expect(situacaoPorCStat(cStat)).toBe(esperado);
    if (cStat) expect(lerNFe(gerarNFe({ cStat })).situacao).toBe(esperado);
  });

  it("recusa arquivos que não são NF-e, com mensagem clara", () => {
    expect(() => lerNFe("<nfeProc><NFe><infNFe>texto sem fechar")).toThrow(/formato inválido/);
    expect(() => lerNFe("isto não é um XML")).toThrow(/formato inválido/);
    expect(() => lerNFe('<CompNfse xmlns="http://www.abrasf.org.br/nfse.xsd"><Nfse><InfNfse/></Nfse></CompNfse>')).toThrow(/NFS-e.*apenas NF-e modelo 55/);
    expect(() => lerNFe('<qualquer><coisa/></qualquer>')).toThrow(/falta tag <infNFe>/);
    expect(() => lerNFe('<procEventoNFe><evento><infEvento><tpEvento>110111</tpEvento></infEvento></evento></procEventoNFe>')).toThrow(/evento/i);
  });
});

describe("conferirParticipacao", () => {
  const venda = lerNFe(gerarNFe()); // emitente = empresa, destinatário = cliente
  const compra = lerNFe(gerarNFe({ emit: { cnpj: CNPJ_FORNECEDOR, nome: "FORNECEDOR" }, dest: { cnpj: CNPJ_EMPRESA, nome: "EMPRESA" } }));
  const terceiros = lerNFe(gerarNFe({ emit: { cnpj: "55666777000181", nome: "A" }, dest: { cnpj: "99000111000165", nome: "B" } }));

  it("saída: a empresa precisa ser a emitente", () => {
    expect(papelEsperado("saidas")).toBe("emitente");
    expect(conferirParticipacao("saidas", "11.222.333/0001-81", venda).ok).toBe(true);
    expect(conferirParticipacao("saidas", "11.222.333/0001-81", compra).ok).toBe(false);
  });
  it("entrada e manifestação: a empresa precisa ser a destinatária", () => {
    expect(conferirParticipacao("entradas", CNPJ_EMPRESA, compra).ok).toBe(true);
    expect(conferirParticipacao("manifestacao", CNPJ_EMPRESA, compra).ok).toBe(true);
    const r = conferirParticipacao("entradas", CNPJ_EMPRESA, venda);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toMatch(/destinatário/);
  });
  it("nota de terceiros é recusada em qualquer tela", () => {
    for (const slug of ["saidas", "entradas", "servicos-tomados", "cupons"]) {
      expect(conferirParticipacao(slug, CNPJ_EMPRESA, terceiros).ok).toBe(false);
    }
  });
  it("filial (mesma raiz de CNPJ) é aceita", () => {
    const filial = lerNFe(gerarNFe({ emit: { cnpj: "11222333000262", nome: "FILIAL" } }));
    expect(conferirParticipacao("saidas", CNPJ_EMPRESA, filial).ok).toBe(true);
  });
  it("empresa sem CNPJ válido: nada a conferir", () => {
    expect(conferirParticipacao("saidas", "", terceiros).ok).toBe(true);
  });
});

describe("CFOP", () => {
  it.each([["5102", "1102"], ["6102", "2102"], ["7101", "3101"], ["1102", "1102"], ["", ""]])("entrada: %s → %s", (saida, entrada) => {
    expect(cfopDeEntrada(saida)).toBe(entrada);
  });
  it("cfopPrincipal escolhe o de maior valor e lista todos", () => {
    const nfe = lerNFe(gerarNFe({ itens: [{ desc: "a", cfop: "5102", valor: 1000 }, { desc: "b", cfop: "5405", valor: 3000 }, { desc: "c", cfop: "5102", valor: 500 }] }));
    const r = cfopPrincipal(nfe.itens);
    expect(r.cfop).toBe("5405");
    expect(r.distintos).toEqual([{ cfop: "5405", valor: 3000 }, { cfop: "5102", valor: 1500 }]);
  });
});
