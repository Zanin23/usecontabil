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

/** GTIN/EAN (8, 12, 13 ou 14 dígitos) com dígito verificador correto. */
export function gtinValido(v: unknown) {
  const c = soDigitos(v);
  if (![8, 12, 13, 14].includes(c.length)) return false;
  const rev = c.split("").reverse().map(Number);
  const soma = rev.slice(1).reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (soma % 10)) % 10 === rev[0];
}

export function formatarCnpj(v: unknown) {
  const d = soDigitos(v).slice(0, 14);
  if (d.length !== 14) return d;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function formatarCpf(v: unknown) {
  const d = soDigitos(v).slice(0, 11);
  if (d.length !== 11) return d;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** CNPJ ou CPF formatado conforme a quantidade de dígitos (outros valores ficam como estão). */
export function formatarDocumento(v: unknown) {
  const d = soDigitos(v);
  if (d.length === 14) return formatarCnpj(d);
  if (d.length === 11) return formatarCpf(d);
  return String(v ?? "").trim();
}

export function formatarCep(v: unknown) {
  const d = soDigitos(v);
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : String(v ?? "").trim();
}

export const emailValido = (v: unknown) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(v ?? "").trim());
