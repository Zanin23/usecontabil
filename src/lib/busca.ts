/** Normaliza texto para busca: sem acentos, minúsculo e sem espaços nas pontas. */
export const normalizarBusca = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
