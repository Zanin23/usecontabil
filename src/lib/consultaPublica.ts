// ============================================================================
// Consulta pública (BrasilAPI) de CNPJ e CEP, compartilhada pelas telas.
//
// O objetivo é evitar que o usuário digite duas vezes a mesma informação:
// quem informou o CNPJ recebe razão social, nome fantasia e endereço; quem
// informou o CEP recebe logradouro, bairro, município, UF e código IBGE.
//
// Toda consulta é opcional (disparada por botão) e tolerante a falha: sem
// internet ou com o serviço fora do ar, o usuário continua preenchendo à mão.
// ============================================================================

export type DadosCnpj = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  /** CNAE principal (código) e sua descrição. */
  cnae?: string;
  cnaeDescricao?: string;
  /** Data de início de atividade (AAAA-MM-DD). */
  abertura?: string;
  /** Tipo de logradouro ("Rua", "Avenida"…) quando informado pela Receita. */
  tipoLogradouro?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  codigoMunicipio?: string;
  email?: string;
  telefone?: string;
};

export type DadosCep = {
  cep: string;
  logradouro?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  codigoMunicipio?: string;
};

const digits = (v: string) => (v ?? "").replace(/\D/g, "");

const formatarCep = (v: string) => {
  const d = digits(v);
  return d.replace(/^(\d{5})(\d)/, "$1-$2");
};

const AVISO_REDE = (servico: string) =>
  `Não foi possível conectar ao serviço de busca (${servico}). Preencha manualmente ou verifique sua conexão.`;

/** Busca os dados públicos de um CNPJ (14 dígitos). */
export async function consultarCnpj(cnpj: string): Promise<DadosCnpj> {
  const d = digits(cnpj);
  if (d.length !== 14) throw new Error("CNPJ inválido.");
  let r: Response;
  try {
    r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${d}`, { mode: "cors" });
  } catch {
    throw new Error(AVISO_REDE("BrasilAPI"));
  }
  if (r.status === 404) throw new Error("CNPJ não encontrado na base pública.");
  if (!r.ok) throw new Error(`Erro na consulta do CNPJ (status ${r.status}).`);
  const j = (await r.json()) as Record<string, unknown>;
  const txt = (k: string) => {
    const v = j[k];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  const codigoMunicipio = j.codigo_municipio_ibge ?? j.codigo_municipio;
  return {
    cnpj: d,
    razaoSocial: txt("razao_social") ?? txt("nome") ?? "",
    nomeFantasia: txt("nome_fantasia"),
    cnae: j.cnae_fiscal != null ? String(j.cnae_fiscal) : undefined,
    cnaeDescricao: txt("cnae_fiscal_descricao"),
    abertura: txt("data_inicio_atividade"),
    tipoLogradouro: txt("descricao_tipo_de_logradouro"),
    cep: txt("cep"),
    logradouro: txt("logradouro"),
    numero: txt("numero"),
    complemento: txt("complemento"),
    bairro: txt("bairro"),
    municipio: txt("municipio"),
    uf: txt("uf"),
    codigoMunicipio:
      codigoMunicipio != null && String(codigoMunicipio).trim()
        ? String(codigoMunicipio).trim()
        : undefined,
    email: txt("email"),
    telefone: txt("ddd_telefone_1") ?? txt("telefone"),
  };
}

/** Busca o endereço de um CEP (8 dígitos). */
export async function consultarCep(cep: string): Promise<DadosCep> {
  const d = digits(cep);
  if (d.length !== 8) throw new Error("CEP inválido.");
  let r: Response;
  try {
    r = await fetch(`https://brasilapi.com.br/api/cep/v2/${d}`, { mode: "cors" });
  } catch {
    throw new Error(AVISO_REDE("BrasilAPI"));
  }
  if (r.status === 404) throw new Error("CEP não encontrado.");
  if (!r.ok) throw new Error(`Erro na consulta do CEP (status ${r.status}).`);
  const j = (await r.json()) as Record<string, unknown>;
  const txt = (k: string) => {
    const v = j[k];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  const ibge = j.ibge ?? j.codigo_municipio_ibge;
  return {
    cep: formatarCep(d),
    logradouro: txt("street") ?? txt("logradouro"),
    bairro: txt("neighborhood") ?? txt("bairro"),
    municipio: txt("city") ?? txt("municipio"),
    uf: txt("state") ?? txt("uf"),
    codigoMunicipio: ibge != null && String(ibge).trim() ? String(ibge).trim() : undefined,
  };
}
