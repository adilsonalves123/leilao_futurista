/** Espelha calcular_retencao_lance_cents no Supabase (migration 057). */

export const BUYER_BID_HOLD_MIN_CENTS = 5_000;
export const BUYER_BID_HOLD_FIXED_VEHICLE_CENTS = 200_000;

export const BUYER_BID_HOLD_TIERS = [
  { maxBidCents: 200_000, rate: 0.2, minCents: 5_000 },
  { maxBidCents: 2_000_000, rate: 0.1 },
  { maxBidCents: 10_000_000, rate: 0.03, maxCents: 300_000 },
  { maxBidCents: Number.POSITIVE_INFINITY, rate: 0.02, maxCents: 500_000 },
] as const;

export type BidHoldCategory = string | null | undefined;

export function isFixedBidHoldCategory(category: BidHoldCategory): boolean {
  const key = (category ?? '').toLowerCase();
  return key === 'veiculos' || key === 'imoveis';
}

export function descricaoRetencaoLanceLocal(category: BidHoldCategory): string {
  if (isFixedBidHoldCategory(category)) {
    return 'caução fixa R$ 2.000';
  }
  return 'caução por faixa (20% → 10% → 3% → 2%, com teto)';
}

export function calcularRetencaoLanceLocal(
  bidCents: number,
  category?: BidHoldCategory,
): number {
  if (bidCents <= 0) return 0;

  if (isFixedBidHoldCategory(category)) {
    return BUYER_BID_HOLD_FIXED_VEHICLE_CENTS;
  }

  let base = 0;
  for (const tier of BUYER_BID_HOLD_TIERS) {
    if (bidCents <= tier.maxBidCents) {
      base = Math.round(bidCents * tier.rate);
      if ('minCents' in tier && tier.minCents != null) {
        base = Math.max(base, tier.minCents);
      }
      if ('maxCents' in tier && tier.maxCents != null) {
        base = Math.min(base, tier.maxCents);
      }
      break;
    }
  }

  return Math.max(base, BUYER_BID_HOLD_MIN_CENTS);
}

/** Retenção adicional ao aumentar o próprio lance (só o incremento). */
export function calcularRetencaoIncrementoLocal(
  incrementCents: number,
  category?: BidHoldCategory,
): number {
  if (incrementCents <= 0) return 0;
  if (isFixedBidHoldCategory(category)) return 0;
  return calcularRetencaoLanceLocal(incrementCents, category);
}
