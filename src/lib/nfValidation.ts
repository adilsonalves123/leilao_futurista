const NF_KEY_LENGTH = 44;

export function isValidNfAccessKey(key: string): boolean {
  const digits = key.replace(/\D/g, '');
  return digits.length === NF_KEY_LENGTH && /^\d+$/.test(digits);
}

export function normalizeNfAccessKey(key: string): string {
  return key.replace(/\D/g, '');
}

export function validateNfAccessKey(key: string | undefined): string | null {
  if (!key?.trim()) return 'Informe a Chave de Acesso da NF-e (44 dígitos).';
  if (!isValidNfAccessKey(key)) return 'A Chave de Acesso deve conter exatamente 44 dígitos numéricos.';
  return null;
}
