import type { DimensionsCm } from '@/src/types/operations';

export function validateDimensions(dimensions: DimensionsCm): string[] {
  const errors: string[] = [];
  if (!dimensions.comprimento || dimensions.comprimento <= 0) {
    errors.push('Comprimento (cm) deve ser maior que zero.');
  }
  if (!dimensions.largura || dimensions.largura <= 0) {
    errors.push('Largura (cm) deve ser maior que zero.');
  }
  if (!dimensions.altura || dimensions.altura <= 0) {
    errors.push('Altura (cm) deve ser maior que zero.');
  }
  return errors;
}

export function validateWeight(weightKg: number): string | null {
  if (!weightKg || weightKg <= 0) return 'Peso (kg) deve ser maior que zero.';
  return null;
}
