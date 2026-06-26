export type SerialImeiValidation = {
  valid: boolean;
  kind: 'imei' | 'serial' | null;
  message: string | null;
};

/** Algoritmo de Luhn para IMEI de 15 dígitos. */
function passesImeiLuhn(digits15: string): boolean {
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let digit = parseInt(digits15[i]!, 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

function isValidImei(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 15) return false;
  return passesImeiLuhn(digits);
}

/** Número de série comercial (mín. 5 caracteres; aceita só números ou alfanumérico). */
function isValidSerialNumber(raw: string): boolean {
  const normalized = raw.trim().toUpperCase();
  if (normalized.length < 5 || normalized.length > 32) return false;
  if (!/^[A-Z0-9][A-Z0-9\-./]*[A-Z0-9]$|^\d{5,32}$/.test(normalized)) return false;
  if (/^\d+$/.test(normalized)) return true;
  return /[A-Z]/.test(normalized) && /\d/.test(normalized);
}

export function validateSerialOrImei(raw: string): SerialImeiValidation {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, kind: null, message: 'Informe o IMEI ou número de série.' };
  }

  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length === 15) {
    if (isValidImei(trimmed)) {
      return { valid: true, kind: 'imei', message: null };
    }
    return {
      valid: false,
      kind: null,
      message: 'IMEI inválido. Confira os 15 dígitos (dígito verificador incorreto).',
    };
  }

  if (isValidSerialNumber(trimmed)) {
    return { valid: true, kind: 'serial', message: null };
  }

  return {
    valid: false,
    kind: null,
    message:
      'Use um IMEI com 15 dígitos válidos ou um número de série (mín. 5 caracteres).',
  };
}
