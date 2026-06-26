import { PLATFORM_COMMISSION_RATE } from '@/src/theme/tokens';

/** Auto-calculated bidding increments per instructions.md */
export function getBidIncrement(currentPriceCents: number): number {
  const price = currentPriceCents / 100;
  if (price < 100) return 500; // R$5 in centavos
  if (price < 1000) return 5000; // R$50
  return 20000; // R$200
}

export function getNextMinimumBid(currentPriceCents: number): number {
  return currentPriceCents + getBidIncrement(currentPriceCents);
}

export function calculateCommission(amountCents: number): number {
  return Math.round(amountCents * PLATFORM_COMMISSION_RATE);
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
