import type { MotorSlug } from "@/lib/apuracaoStore";

export type ContextoRotaDados = {
  empresaId?: string | null;
  competencia?: string | null;
};

export type GrupoGuiaRota = "darf" | "estaduais";

type ConfigRotaMotor = {
  titulo: string;
  apuracao: string;
  grupoGuias: GrupoGuiaRota;
};

/** Rotas canônicas de origem e destino dos dados de cada motor fiscal. */
export const ROTAS_DADOS: Record<MotorSlug, ConfigRotaMotor> = {
  "pis-cofins": {
    titulo: "PIS / COFINS",
    apuracao: "/fiscal/apuracoes/pis-cofins",
    grupoGuias: "darf",
  },
  iss: {
    titulo: "ISS",
    apuracao: "/fiscal/apuracoes/iss",
    grupoGuias: "estaduais",
  },
  "irpj-csll": {
    titulo: "IRPJ / CSLL",
    apuracao: "/fiscal/apuracoes/irpj-csll",
    grupoGuias: "darf",
  },
  "simples-nacional": {
    titulo: "Simples Nacional",
    apuracao: "/fiscal/apuracoes/simples-nacional",
    grupoGuias: "darf",
  },
  retencoes: {
    titulo: "Retenções na fonte",
    apuracao: "/fiscal/apuracoes/retencoes",
    grupoGuias: "darf",
  },
};

const MOTORS = Object.keys(ROTAS_DADOS) as MotorSlug[];
const COMPETENCIA_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function ehMotorSlug(valor: string | null | undefined): valor is MotorSlug {
  return !!valor && MOTORS.includes(valor as MotorSlug);
}

export function tituloDoMotor(motor: MotorSlug): string {
  return ROTAS_DADOS[motor].titulo;
}

function queryContexto(contexto: ContextoRotaDados): URLSearchParams {
  const params = new URLSearchParams();
  const empresaId = contexto.empresaId?.trim();
  const competencia = contexto.competencia?.trim();
  if (empresaId) params.set("empresaId", empresaId);
  if (competencia && COMPETENCIA_RE.test(competencia)) params.set("competencia", competencia);
  return params;
}

function anexarQuery(rota: string, params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${rota}?${query}` : rota;
}

/** Abre a apuração de origem mantendo empresa e competência na URL. */
export function rotaDaApuracao(motor: MotorSlug, contexto: ContextoRotaDados = {}): string {
  return anexarQuery(ROTAS_DADOS[motor].apuracao, queryContexto(contexto));
}

/**
 * Abre o painel de recolhimentos no grupo correspondente e filtra as guias
 * produzidas pelo motor selecionado. Empresa e competência ficam explícitas
 * para que o destino recupere o mesmo recorte mesmo em uma nova aba.
 */
export function rotaDasGuiasDaApuracao(
  motor: MotorSlug,
  contexto: ContextoRotaDados = {},
): string {
  const params = queryContexto(contexto);
  params.set("motor", motor);
  return anexarQuery(`/fiscal/guias/${ROTAS_DADOS[motor].grupoGuias}`, params);
}

export type ParametrosRotaDados = {
  motor: MotorSlug | null;
  empresaId: string | null;
  competencia: string | null;
};

/** Lê apenas parâmetros reconhecidos; valores inválidos não alteram o contexto atual. */
export function lerParametrosRotaDados(search: string | URLSearchParams): ParametrosRotaDados {
  const params = search instanceof URLSearchParams
    ? search
    : new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const empresaId = params.get("empresaId")?.trim() || null;
  const competencia = params.get("competencia");
  const motor = params.get("motor");

  return {
    motor: ehMotorSlug(motor) ? motor : null,
    empresaId,
    competencia: competencia && COMPETENCIA_RE.test(competencia) ? competencia : null,
  };
}
