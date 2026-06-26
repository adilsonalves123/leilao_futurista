export function formatarCep(valor: string): string {
  const digits = valor.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function cepValido(valor: string): boolean {
  return valor.replace(/\D/g, '').length === 8;
}
