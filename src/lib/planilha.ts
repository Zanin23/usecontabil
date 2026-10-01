/**
 * Leitura de planilhas (CSV e Excel .xlsx) para as importações contábeis.
 *
 * - CSV/TXT: aceita vírgula, ponto e vírgula, tabulação ou barra vertical como separador, campos
 *   entre aspas, quebra de linha dentro do campo e BOM. Se o arquivo não estiver em UTF-8 (caso
 *   comum das planilhas exportadas pelo Excel em português), cai para Windows-1252.
 * - XLSX: lê o ZIP do próprio arquivo (métodos "sem compressão" e "deflate"), a primeira aba
 *   visível do livro e a tabela de textos compartilhados. Não depende de nenhuma biblioteca.
 * - .xls (Excel antigo, binário) não é suportado: a mensagem orienta a salvar como .xlsx ou .csv.
 *
 * As células voltam como texto ou número (número só no .xlsx, onde o tipo vem do arquivo); quem
 * importa decide como converter ("1.234,56" → parseNumeroBR, por exemplo).
 */

export type CelulaPlanilha = string | number | null;

export type Planilha = {
  /** Nome do arquivo informado por quem chamou. */
  arquivo: string;
  formato: "csv" | "xlsx";
  /** Nome da aba lida (no CSV, "CSV"). */
  aba: string;
  linhas: CelulaPlanilha[][];
};

/** Texto de uma célula, já sem espaços nas pontas (número vira texto). */
export function textoDaCelula(c: CelulaPlanilha | undefined): string {
  if (c === null || c === undefined) return "";
  return String(c).trim();
}

/** Linha só com células vazias? */
export function linhaVazia(linha: CelulaPlanilha[] | undefined): boolean {
  return !linha || linha.every((c) => textoDaCelula(c) === "");
}

/* ------------------------------------------------------------------ */
/* Entrada                                                             */
/* ------------------------------------------------------------------ */

const EXTENSOES_CSV = [".csv", ".txt", ".tsv"];
const EXTENSAO_XLS = ".xls";

/**
 * Conteúdo de um arquivo escolhido no `<input type="file">`. Usa `Blob.arrayBuffer()` quando o
 * navegador oferece e cai para o `FileReader` (também cobre ambientes de teste e navegadores antigos).
 */
export function lerConteudoDoArquivo(arquivo: Blob): Promise<ArrayBuffer> {
  if (typeof arquivo.arrayBuffer === "function") return arquivo.arrayBuffer();
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result as ArrayBuffer);
    leitor.onerror = () => reject(leitor.error ?? new Error("Não foi possível ler o arquivo."));
    leitor.readAsArrayBuffer(arquivo);
  });
}

/** Lê o arquivo escolhido (extensão decide o formato). Lança erro com mensagem em português. */
export async function lerPlanilha(nomeArquivo: string, conteudo: ArrayBuffer): Promise<Planilha> {
  const nome = nomeArquivo.toLowerCase();
  if (nome.endsWith(".xlsx") || nome.endsWith(".xlsm")) {
    const { aba, linhas } = await lerXlsx(conteudo);
    return { arquivo: nomeArquivo, formato: "xlsx", aba, linhas };
  }
  if (nome.endsWith(EXTENSAO_XLS)) {
    throw new Error(
      "Arquivo .xls (Excel antigo) não é suportado. Abra a planilha e salve como .xlsx ou .csv.",
    );
  }
  if (!EXTENSOES_CSV.some((e) => nome.endsWith(e))) {
    throw new Error("Formato não reconhecido. Envie um arquivo .csv, .txt ou .xlsx.");
  }
  const linhas = lerCsv(decodificarTexto(conteudo));
  return { arquivo: nomeArquivo, formato: "csv", aba: "CSV", linhas };
}

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

/** UTF-8 com fallback para Windows-1252 (Excel em português costuma exportar em ANSI). */
export function decodificarTexto(conteudo: ArrayBuffer): string {
  const bytes = new Uint8Array(conteudo);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    try {
      return new TextDecoder("windows-1252").decode(bytes);
    } catch {
      return new TextDecoder("utf-8").decode(bytes);
    }
  }
}

const SEPARADORES = [";", ",", "\t", "|"] as const;

/** Descobre o separador contando os candidatos fora das aspas nas primeiras linhas. */
export function detectarSeparador(texto: string): string {
  const amostra = texto.split(/\r?\n/).slice(0, 10).join("\n");
  let melhor = ";";
  let melhorContagem = 0;
  for (const s of SEPARADORES) {
    let contagem = 0;
    let dentroDeAspas = false;
    for (let i = 0; i < amostra.length; i++) {
      const ch = amostra[i];
      if (ch === '"') dentroDeAspas = !dentroDeAspas;
      else if (ch === s && !dentroDeAspas) contagem++;
    }
    if (contagem > melhorContagem) {
      melhor = s;
      melhorContagem = contagem;
    }
  }
  return melhor;
}

/** Converte o texto do CSV em linhas de células (aspas duplicadas viram uma aspa). */
export function lerCsv(texto: string, separador = detectarSeparador(texto)): CelulaPlanilha[][] {
  const limpo = texto.replace(/^\uFEFF/, "");
  const linhas: CelulaPlanilha[][] = [];
  let linha: CelulaPlanilha[] = [];
  let campo = "";
  let dentroDeAspas = false;
  let i = 0;

  const fecharCampo = () => {
    const valor = campo.trim();
    linha.push(valor === "" ? null : valor);
    campo = "";
  };
  const fecharLinha = () => {
    fecharCampo();
    linhas.push(linha);
    linha = [];
  };

  while (i < limpo.length) {
    const ch = limpo[i];
    if (dentroDeAspas) {
      if (ch === '"') {
        if (limpo[i + 1] === '"') {
          campo += '"';
          i += 2;
          continue;
        }
        dentroDeAspas = false;
        i++;
        continue;
      }
      campo += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      dentroDeAspas = true;
      i++;
      continue;
    }
    if (ch === separador) {
      fecharCampo();
      i++;
      continue;
    }
    if (ch === "\r") {
      i += limpo[i + 1] === "\n" ? 2 : 1;
      fecharLinha();
      continue;
    }
    if (ch === "\n") {
      i++;
      fecharLinha();
      continue;
    }
    campo += ch;
    i++;
  }
  if (campo !== "" || linha.length) fecharLinha();
  return linhas.filter((l) => !linhaVazia(l));
}

/* ------------------------------------------------------------------ */
/* XLSX (ZIP + XML)                                                    */
/* ------------------------------------------------------------------ */

type EntradaZip = { nome: string; metodo: number; comprimido: number; inicio: number };

async function inflar(dados: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("Este navegador não consegue ler .xlsx. Salve a planilha como .csv e tente novamente.");
  }
  const fluxo = new DecompressionStream("deflate-raw");
  const escritor = fluxo.writable.getWriter();
  void escritor.write(dados);
  void escritor.close();
  const leitor = fluxo.readable.getReader();
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
  for (const parte of partes) {
    saida.set(parte, pos);
    pos += parte.length;
  }
  return saida;
}

/** Lê o diretório central do ZIP e devolve as entradas descomprimidas que interessam. */
async function abrirZip(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const assinaturaEocd = 0x06054b50;
  let eocd = -1;
  const inicioBusca = Math.max(0, bytes.length - 22 - 65_536);
  for (let i = bytes.length - 22; i >= inicioBusca; i--) {
    if (view.getUint32(i, true) === assinaturaEocd) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("O arquivo .xlsx não parece ser um arquivo ZIP válido.");

  const total = view.getUint16(eocd + 10, true);
  let ptr = view.getUint32(eocd + 16, true);
  const entradas: EntradaZip[] = [];
  for (let i = 0; i < total; i++) {
    if (ptr + 46 > bytes.length || view.getUint32(ptr, true) !== 0x02014b50) break;
    const metodo = view.getUint16(ptr + 10, true);
    const comprimido = view.getUint32(ptr + 20, true);
    const nomeLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const comentarioLen = view.getUint16(ptr + 32, true);
    const desloc = view.getUint32(ptr + 42, true);
    const nome = new TextDecoder().decode(bytes.subarray(ptr + 46, ptr + 46 + nomeLen));
    ptr += 46 + nomeLen + extraLen + comentarioLen;
    if (desloc + 30 > bytes.length || view.getUint32(desloc, true) !== 0x04034b50) continue;
    const nomeLocalLen = view.getUint16(desloc + 26, true);
    const extraLocalLen = view.getUint16(desloc + 28, true);
    const inicio = desloc + 30 + nomeLocalLen + extraLocalLen;
    if (inicio + comprimido > bytes.length) continue;
    entradas.push({ nome, metodo, comprimido, inicio });
  }

  const arquivos = new Map<string, Uint8Array>();
  const relevantes = entradas.filter(
    (e) =>
      e.nome === "xl/sharedStrings.xml" ||
      e.nome === "xl/workbook.xml" ||
      e.nome === "xl/_rels/workbook.xml.rels" ||
      /^xl\/worksheets\/sheet\d+\.xml$/.test(e.nome),
  );
  for (const e of relevantes) {
    const dados = bytes.subarray(e.inicio, e.inicio + e.comprimido);
    if (e.metodo === 0) arquivos.set(e.nome, dados);
    else if (e.metodo === 8) arquivos.set(e.nome, await inflar(dados));
    // outros métodos (raro em xlsx) são ignorados
  }
  return arquivos;
}

function decodificarXml(texto: string): string {
  return texto
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function textosDoSharedStrings(xml: string | undefined): string[] {
  if (!xml) return [];
  const textos: string[] = [];
  const blocos = xml.match(/<si\b[^>]*>[\s\S]*?<\/si>|<si\b[^>]*\/>/g) ?? [];
  for (const bloco of blocos) {
    const partes = [...bloco.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decodificarXml(m[1]));
    textos.push(partes.join(""));
  }
  return textos;
}

/** Nome da aba visível que deve ser lida (primeira do livro). */
function escolherAba(arquivos: Map<string, Uint8Array>): { nome: string; caminho?: string } {
  const workbookXml = arquivos.get("xl/workbook.xml");
  const relsXml = arquivos.get("xl/_rels/workbook.xml.rels");
  const dec = (u?: Uint8Array) => (u ? new TextDecoder().decode(u) : "");
  if (workbookXml) {
    const abas = [...dec(workbookXml).matchAll(/<sheet\b([^>]*)\/?>/g)].map((m) => m[1]);
    const rels = new Map<string, string>();
    for (const rel of dec(relsXml).matchAll(/<Relationship\b([^>]*)\/?>/g)) {
      const id = /Id="([^"]+)"/.exec(rel[1])?.[1];
      const alvo = /Target="([^"]+)"/.exec(rel[1])?.[1];
      if (id && alvo) rels.set(id, alvo.replace(/^\//, "").replace(/^xl\//, ""));
    }
    for (const atributos of abas) {
      if (/state="hidden"/.test(atributos)) continue;
      const nome = /name="([^"]*)"/.exec(atributos)?.[1];
      const rid = /r:id="([^"]+)"/.exec(atributos)?.[1];
      const alvo = rid ? rels.get(rid) : undefined;
      const caminho = alvo ? `xl/${alvo}` : undefined;
      if (caminho && arquivos.has(caminho)) return { nome: decodificarXml(nome ?? "Planilha 1"), caminho };
    }
  }
  const caminhos = [...arquivos.keys()].filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort();
  return { nome: "Planilha 1", caminho: caminhos[0] };
}

const COLUNA_RE = /^([A-Z]+)(\d+)$/;

/** Número da coluna (A=0, B=1, …, AA=26) a partir da referência da célula. */
export function colunaDaReferencia(ref: string): number {
  const letras = /^([A-Z]+)/.exec(ref.toUpperCase())?.[1] ?? "";
  let n = 0;
  for (const ch of letras) n = n * 26 + (ch.charCodeAt(0) - 64);
  return Math.max(0, n - 1);
}

function valorDaCelula(atributos: string, conteudo: string, shared: string[]): CelulaPlanilha {
  const tipo = /\bt="([^"]+)"/.exec(atributos)?.[1] ?? "n";
  const pegar = (tag: string) => new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`).exec(conteudo)?.[1];
  const texto = pegar("t");
  if (tipo === "inlineStr") {
    const inline = pegar("is") ?? conteudo;
    return decodificarXml([...inline.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join("")) || null;
  }
  const bruto = pegar("v");
  if (bruto === undefined || bruto === "") return null;
  if (tipo === "s") return shared[Number(bruto)] ?? null;
  if (tipo === "str") return decodificarXml(bruto);
  if (tipo === "b") return bruto === "1" ? "VERDADEIRO" : "FALSO";
  if (tipo === "e") return decodificarXml(bruto);
  const n = Number(bruto);
  return Number.isFinite(n) ? n : decodificarXml(texto ?? bruto);
}

function linhasDaAba(xml: string, shared: string[]): CelulaPlanilha[][] {
  const linhas: CelulaPlanilha[][] = [];
  for (const m of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const corpo = m[2] ?? "";
    const celulas: CelulaPlanilha[] = [];
    const re = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let achou: RegExpExecArray | null;
    let posicao = 0;
    while ((achou = re.exec(corpo))) {
      const ref = /\br="([A-Z]+\d+)"/.exec(achou[1])?.[1];
      const indice = ref && COLUNA_RE.test(ref) ? colunaDaReferencia(ref) : posicao;
      celulas[indice] = valorDaCelula(achou[1], achou[2] ?? "", shared);
      posicao = indice + 1;
    }
    for (let i = 0; i < celulas.length; i++) if (celulas[i] === undefined) celulas[i] = null;
    if (!linhaVazia(celulas)) linhas.push(celulas);
  }
  return linhas;
}

/** Lê a primeira aba visível do .xlsx. */
export async function lerXlsx(buffer: ArrayBuffer): Promise<{ aba: string; linhas: CelulaPlanilha[][] }> {
  const arquivos = await abrirZip(buffer);
  const dec = (u?: Uint8Array) => (u ? new TextDecoder().decode(u) : "");
  const shared = textosDoSharedStrings(dec(arquivos.get("xl/sharedStrings.xml")));
  const { nome, caminho } = escolherAba(arquivos);
  const xml = caminho ? dec(arquivos.get(caminho)) : "";
  if (!xml) throw new Error("Não encontrei nenhuma aba com dados no arquivo .xlsx.");
  return { aba: nome, linhas: linhasDaAba(xml, shared) };
}
