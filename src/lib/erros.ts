/**
 * Extrai uma mensagem legível de um erro capturado.
 *
 * `catch (e)` entrega `unknown`: acessar `e.message` direto obrigava a tipar o
 * parâmetro como `any` em toda a base. Aqui a checagem é feita uma única vez.
 */
export function mensagemDeErro(e: unknown, padrao = "Não foi possível concluir a operação."): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string" && e.trim()) return e;
  return padrao;
}
