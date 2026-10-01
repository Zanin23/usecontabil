import {
  apurar,
  getEstado,
  MOTORES,
  regimeDaEmpresa,
  rs,
  type Apuracao,
  type Guia as GuiaApurada,
  type MotorSlug,
} from "@/lib/apuracaoStore";
import { ROTAS_DADOS } from "@/lib/rotasDados";
import type { GrupoSlug } from "@/lib/guiasStore";

export type MemoriaGuia = {
  label: string;
  valor: string;
  campo: string;
  origem: string;
  documento: string;
  regra: string;
  legislacao: string;
};

/** Linha fiscal transformada em uma guia exibível no painel de recolhimentos. */
export type MotorBase = {
  id: string;
  chaveCanonica?: string;
  motor: MotorSlug;
  motoresOrigem: MotorSlug[];
  grupo: GrupoSlug;
  tipo: string;
  tributo: string;
  codigo: string;
  orgao: string;
  uf?: string;
  valor: number;
  vencimento: string;
  dia: number;
  origem: string;
  memoria: MemoriaGuia[];
};

function slug(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function dataISO(valor: string): string | null {
  const v = (valor ?? "").trim();
  let ano: number;
  let mes: number;
  let dia: number;
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (iso) {
    ano = Number(iso[1]);
    mes = Number(iso[2]);
    dia = Number(iso[3]);
  } else if (br) {
    dia = Number(br[1]);
    mes = Number(br[2]);
    ano = Number(br[3]);
  } else {
    return null;
  }
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) return null;
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function tipoDeGuia(motor: MotorSlug, guia: GuiaApurada): string {
  if (/\bDAS\b/i.test(`${guia.nome} ${guia.codigo}`)) return "DAS";
  if (motor === "iss" || (motor === "retencoes" && /ISS/i.test(guia.nome))) return "ISS";
  if (/GPS/i.test(guia.nome)) return "GPS/DARF";
  return "DARF";
}

function tributoDeGuia(motor: MotorSlug, guia: GuiaApurada): string {
  const fonte = `${guia.nome} ${guia.codigo}`;
  if (/PIS/i.test(fonte)) return "PIS";
  if (/COFINS/i.test(fonte)) return "COFINS";
  if (/IRPJ/i.test(fonte)) return "IRPJ";
  if (/CSLL/i.test(fonte)) return "CSLL";
  if (/IRRF/i.test(fonte)) return "IRRF";
  if (/CSRF/i.test(fonte)) return "CSRF";
  if (/INSS/i.test(fonte)) return "INSS";
  if (/ISS/i.test(fonte)) return "ISS";
  if (motor === "simples-nacional") return "Simples Nacional";
  return guia.nome;
}

function grupoDeGuia(motor: MotorSlug, guia: GuiaApurada): "darf" | "estaduais" {
  return motor === "iss" || (motor === "retencoes" && /ISS/i.test(guia.nome))
    ? "estaduais"
    : "darf";
}

function chaveCanonica(motor: MotorSlug, guia: GuiaApurada): string | undefined {
  // O motor ISS e o motor de retenções exibem a mesma obrigação de ISS retido.
  // Ela é uma guia só, com as duas apurações listadas como origem.
  if ((motor === "iss" || motor === "retencoes") && /ISS/i.test(guia.nome) && /retido/i.test(guia.nome)) {
    return "iss-retido";
  }
  return undefined;
}

function calculoCorrespondente(apuracao: Apuracao, guia: GuiaApurada) {
  const nome = guia.nome.toLowerCase();
  switch (apuracao.motor) {
    case "pis-cofins":
      return apuracao.calculos.find((c) => c.id === (nome.includes("pis") ? "pis-pagar" : "cofins-pagar"));
    case "iss": {
      if (/retido/i.test(guia.nome)) return apuracao.calculos.find((c) => c.id === "iss-tomado");
      const municipio = guia.nome.split("—").at(-1)?.trim();
      return apuracao.calculos.find((c) => c.id === `mun-${municipio}`);
    }
    case "irpj-csll":
      return apuracao.calculos.find((c) => c.id === (nome.includes("irpj") ? "irpj-pagar" : "csll-pagar"));
    case "simples-nacional":
      return apuracao.calculos.find((c) => c.id === "das-total");
    case "retencoes": {
      if (/IRRF/i.test(guia.nome)) return apuracao.calculos.find((c) => c.id === "IRRF");
      if (/CSRF/i.test(guia.nome)) return apuracao.calculos.find((c) => c.id.startsWith("CSRF"));
      if (/INSS/i.test(guia.nome)) return apuracao.calculos.find((c) => c.id === "INSS");
      return apuracao.calculos.find((c) => c.id === "ISS retido");
    }
  }
}

function memoriaDaGuia(apuracao: Apuracao, guia: GuiaApurada): MemoriaGuia[] {
  const titulo = ROTAS_DADOS[apuracao.motor].titulo;
  const calculo = calculoCorrespondente(apuracao, guia);
  const regra = calculo?.memoria.formula ?? "Valor calculado pelo motor da apuração fiscal.";
  const legislacao = calculo?.memoria.legislacao ?? "Memória disponível na apuração de origem.";
  const origem = `Apuração de ${titulo}`;
  const documento = `${guia.nome} · competência da apuração`;
  const passos = calculo?.memoria.passos ?? [];
  return [
    {
      label: "Valor gerado na apuração",
      valor: rs(guia.valor),
      campo: calculo?.descricao ?? guia.nome,
      origem,
      documento: `${documento} · código ${guia.codigo}`,
      regra,
      legislacao,
    },
    ...passos.map((passo) => ({
      label: passo.label,
      valor: passo.valor,
      campo: passo.label,
      origem,
      documento,
      regra,
      legislacao,
    })),
  ];
}

/** Converte as guias de uma apuração na forma usada pelo painel financeiro. */
export function mapearGuiasDaApuracao(apuracao: Apuracao): MotorBase[] {
  return apuracao.guias.flatMap((guia) => {
    if (!Number.isFinite(guia.valor) || guia.valor <= 0.009) return [];
    const vencimento = dataISO(guia.vencimento);
    if (!vencimento) return [];

    const canonica = chaveCanonica(apuracao.motor, guia);
    const tipo = tipoDeGuia(apuracao.motor, guia);
    const municipio = guia.nome.split("—").at(-1)?.trim();
    const municipal = tipo === "ISS";
    const codigo = (guia.codigo ?? "").trim();
    const nome = (guia.nome ?? "").trim();
    const baseId = `${apuracao.motor}::${slug(codigo || "sem-codigo")}::${slug(nome || "guia")}`;

    return [{
      id: canonica ?? baseId,
      chaveCanonica: canonica,
      motor: apuracao.motor,
      motoresOrigem: [apuracao.motor],
      grupo: grupoDeGuia(apuracao.motor, guia),
      tipo,
      tributo: tributoDeGuia(apuracao.motor, guia),
      codigo: codigo || "—",
      orgao: municipal
        ? municipio && !/retido/i.test(nome) ? `Prefeitura de ${municipio}` : "Prefeitura"
        : tipo === "DAS" ? "PGDAS-D / Simples Nacional" : "Receita Federal",
      valor: guia.valor,
      vencimento,
      dia: Number(vencimento.slice(8, 10)),
      origem: `${ROTAS_DADOS[apuracao.motor].titulo} · ${nome}`,
      memoria: memoriaDaGuia(apuracao, guia),
    }];
  });
}

/** Guias calculadas agora pelos cinco motores, no recorte da empresa e período. */
export function guiasDaApuracao(empresaId: string, competencia: string): MotorBase[] {
  const porChave = new Map<string, MotorBase>();
  const regime = regimeDaEmpresa(empresaId);
  for (const motor of MOTORES) {
    // Evita recolher duas vezes tributos que o Simples reúne no DAS, e não
    // cria um DAS presumido para empresas que não são optantes do regime.
    if (motor.slug === "simples-nacional" && regime !== "Simples Nacional") continue;
    if (
      (regime === "Simples Nacional" || regime === "MEI") &&
      (motor.slug === "pis-cofins" || motor.slug === "irpj-csll")
    ) continue;
    const apuracao = apurar(motor.slug, empresaId, competencia, getEstado(motor.slug, empresaId, competencia));
    for (const guia of mapearGuiasDaApuracao(apuracao)) {
      const chave = guia.chaveCanonica ?? guia.id;
      const existente = porChave.get(chave);
      if (existente) {
        existente.motoresOrigem = [...new Set([...existente.motoresOrigem, ...guia.motoresOrigem])];
        continue;
      }
      porChave.set(chave, guia);
    }
  }
  return [...porChave.values()];
}

export function motorFederal(empresaId: string, competencia: string): MotorBase[] {
  return guiasDaApuracao(empresaId, competencia).filter((guia) => guia.grupo === "darf");
}

export function motorEstadualMunicipal(empresaId: string, competencia: string): MotorBase[] {
  return guiasDaApuracao(empresaId, competencia).filter((guia) => guia.grupo === "estaduais");
}
