export const MARKET_DEAL_GOOD_MIN_DISCOUNT_PCT = 20;
export const MARKET_DEAL_FAIR_MIN_DISCOUNT_PCT = 5;

export type MarketDealVerdict = 'good' | 'fair' | 'bad' | 'unknown';

export type MarketDealResult = {
  verdict: MarketDealVerdict;
  bidCents: number;
  marketCents: number;
  discountPct: number | null;
  savingsCents: number | null;
};

export function calculateDisplayDiscountPct(bidCents: number, marketCents: number): number {
  if (marketCents <= 0) return 0;
  const raw = ((marketCents - bidCents) / marketCents) * 100;
  return Math.round(raw);
}

export function computeMarketDealVerdict(bidCents: number, marketCents: number): MarketDealResult {
  if (!marketCents || marketCents <= 0) {
    return {
      verdict: 'unknown',
      bidCents,
      marketCents: 0,
      discountPct: null,
      savingsCents: null,
    };
  }

  const discountPct = calculateDisplayDiscountPct(bidCents, marketCents);
  const savingsCents = Math.max(0, marketCents - bidCents);

  let verdict: MarketDealVerdict = 'bad';
  if (discountPct >= MARKET_DEAL_GOOD_MIN_DISCOUNT_PCT) {
    verdict = 'good';
  } else if (discountPct >= MARKET_DEAL_FAIR_MIN_DISCOUNT_PCT) {
    verdict = 'fair';
  }

  return {
    verdict,
    bidCents,
    marketCents,
    discountPct,
    savingsCents,
  };
}
