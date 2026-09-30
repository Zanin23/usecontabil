// Validação de documentos (CNPJ/CPF) — dígitos verificadores.
// Extraído de adminStore para poder ser usado nos cadastros sem carregar
// os dados simulados do módulo Administrativo.

export const soDigitos = (v: unknown) => String(v ?? "").replace(/\D/g, "");

export function cnpjValido(v: unknown) {
  const c = soDigitos(v);
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const calc = (base: string, pesos: number[]) => {
    const soma = base.split("").reduce((acc, d, i) => acc + Number(d) * pesos[i], 0);
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(c.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(c.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(c[12]) && d2 === Number(c[13]);
}

export function cpfValido(v: unknown) {
  const c = soDigitos(v);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  const calc = (len: number) => {
    let soma = 0;
    for (let i = 0; i < len; i++) soma += Number(c[i]) * (len + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(c[9]) && calc(10) === Number(c[10]);
}

export function documentoValido(v: unknown) {
  const c = soDigitos(v);
  return c.length === 14 ? cnpjValido(c) : c.length === 11 ? cpfValido(c) : false;
}
