// Regras de validação do cadastro de empresa (usadas pelo formulário e testadas à parte).
import { cnpjValido, soDigitos } from "./documentos";
import { regimeDefinido } from "./regime";

/** Retorna a mensagem do primeiro problema encontrado, ou `null` se o cadastro pode ser salvo. */
export function validarCadastroEmpresa(f: { cnpj: string; razao: string; regime: string }): string | null {
  if (soDigitos(f.cnpj).length !== 14) return "Informe um CNPJ válido (14 dígitos)";
  if (!cnpjValido(f.cnpj)) return "CNPJ inválido — confira os dígitos verificadores";
  if (!f.razao.trim()) return "Informe a razão social";
  if (!regimeDefinido(f.regime)) return "Selecione o regime tributário da empresa";
  return null;
}
