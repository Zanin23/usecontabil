/** Gerador de NF-e de teste (layout 4.00, nfeProc) — usado pelos testes de importação. */
export const CNPJ_EMPRESA = "11222333000181";
export const CNPJ_FORNECEDOR = "77888999000181";
export const CNPJ_CLIENTE = "33444555000181";

type Parte = { cnpj: string; nome: string; uf?: string; indIEDest?: string };
export type OpcoesNFe = {
  numero?: string; emit?: Parte; dest?: Parte; dh?: string; cStat?: string | null; natOp?: string; indFinal?: string;
  itens?: { desc: string; cfop: string; valor: number; ncm?: string; cst?: string; pIcms?: number }[];
};

export function gerarNFe(o: OpcoesNFe = {}): string {
  const numero = o.numero ?? "5001";
  const emit = o.emit ?? { cnpj: CNPJ_EMPRESA, nome: "CONFECCOES EXEMPLO LTDA", uf: "SP" };
  const dest = o.dest ?? { cnpj: CNPJ_CLIENTE, nome: "LOJA DO CLIENTE ME", uf: "BA", indIEDest: "1" };
  const itens = o.itens ?? [{ desc: "Camiseta", cfop: "5102", valor: 1000 }];
  const total = itens.reduce((s, i) => s + i.valor, 0);
  const icms = itens.reduce((s, i) => s + i.valor * ((i.pIcms ?? 18) / 100), 0);
  const chave = ("3526071122233300018155001000" + numero.padStart(6, "0") + "1000000" + "0").slice(0, 44).padEnd(44, "0");
  const cStat = o.cStat === undefined ? "100" : o.cStat;
  const prot = cStat === null ? "" : `<protNFe versao="4.00"><infProt><chNFe>${chave}</chNFe><cStat>${cStat}</cStat><xMotivo>${cStat === "100" ? "Autorizado o uso da NF-e" : "Cancelamento homologado"}</xMotivo></infProt></protNFe>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><NFe><infNFe Id="NFe${chave}" versao="4.00">
<ide><cUF>35</cUF><natOp>${o.natOp ?? "Venda de mercadoria"}</natOp><mod>55</mod><serie>1</serie><nNF>${numero}</nNF><dhEmi>${o.dh ?? "2026-07-10T10:00:00-03:00"}</dhEmi><indFinal>${o.indFinal ?? "0"}</indFinal></ide>
<emit><CNPJ>${emit.cnpj}</CNPJ><xNome>${emit.nome}</xNome><enderEmit><UF>${emit.uf ?? "SP"}</UF></enderEmit></emit>
<dest><CNPJ>${dest.cnpj}</CNPJ><xNome>${dest.nome}</xNome><enderDest><UF>${dest.uf ?? "SP"}</UF></enderDest><indIEDest>${dest.indIEDest ?? "1"}</indIEDest></dest>
${itens.map((i, k) => `<det nItem="${k + 1}"><prod><cProd>P${k}</cProd><xProd>${i.desc}</xProd><NCM>${i.ncm ?? "61091000"}</NCM><CFOP>${i.cfop}</CFOP><qCom>10.0000</qCom><vUnCom>${(i.valor / 10).toFixed(2)}</vUnCom><vProd>${i.valor.toFixed(2)}</vProd></prod><imposto><ICMS><ICMS00><orig>0</orig><CST>${i.cst ?? "00"}</CST><pICMS>${(i.pIcms ?? 18).toFixed(2)}</pICMS></ICMS00></ICMS></imposto></det>`).join("")}
<total><ICMSTot><vBC>${total.toFixed(2)}</vBC><vICMS>${icms.toFixed(2)}</vICMS><vNF>${total.toFixed(2)}</vNF></ICMSTot></total>
</infNFe></NFe>${prot}</nfeProc>`;
}
