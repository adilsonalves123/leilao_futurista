/** Remove máscara e mantém 11 dígitos. */
export function normalizarCpf(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 11);
}

/** Máscara 000.000.000-00 */
export function formatarCpf(valor: string): string {
  const d = normalizarCpf(valor);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

/** Validação de CPF (dígitos verificadores). */
export function cpfValido(cpf: string): boolean {
  const n = normalizarCpf(cpf);
  if (n.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(n)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(n[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== Number(n[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(n[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === Number(n[10]);
}
