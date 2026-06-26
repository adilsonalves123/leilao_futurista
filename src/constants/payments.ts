/** Percentuais de garantia do vendedor (espelham calcular_garantia_vendedor_cents no Supabase). */
export const VENDOR_COLLATERAL_TIERS = [
  { maxItemCents: 50_000, rate: 0.05, minCents: 5_000 },
  { maxItemCents: 500_000, rate: 0.03 },
  { maxItemCents: 2_000_000, rate: 0.025 },
  { maxItemCents: Number.POSITIVE_INFINITY, rate: 0.02, maxCents: 500_000 },
] as const;

export const VENDOR_COLLATERAL_NEW_VENDOR_MULTIPLIER = 1.5;
export const VENDOR_COLLATERAL_NEW_VENDOR_MAX_SALES = 3;
export const VENDOR_COLLATERAL_ABSOLUTE_MIN_CENTS = 5_000;

/** Cartão acima deste valor pode rotear para PSP secundário (ex. Mercado Pago). */
export const PAYMENT_CARD_SECONDARY_PSP_THRESHOLD_CENTS = 500_000;

export const PAYMENT_PROVIDER_LABELS: Record<string, string> = {
  asaas: 'Asaas',
  mercado_pago: 'Mercado Pago',
  luckcode: 'LuckCode (demo)',
};

export type PaymentProviderSlug = 'asaas' | 'mercado_pago' | 'luckcode';

export type PaymentRouteMethod = 'pix' | 'cartao' | 'boleto' | 'cripto';

export type PaymentRouteResult = {
  paymentMethod: PaymentRouteMethod;
  paymentProvider: PaymentProviderSlug;
  providerDisplayName: string;
  gatewayFeeCents: number;
  feeReserveCents: number;
  totalCents: number;
};

export type VendorCollateralPreview = {
  holdCents: number;
  availableBalanceCents: number;
  completedSales: number;
  newVendorMultiplier: number;
  sufficient: boolean;
};

/** Cálculo local (offline/mock) — produção usa RPC preview_garantia_vendedor. */
export function calcularGarantiaVendedorLocal(
  itemCents: number,
  completedSales = 0,
): number {
  if (itemCents <= 0) return 0;

  let base = 0;
  for (const tier of VENDOR_COLLATERAL_TIERS) {
    if (itemCents <= tier.maxItemCents) {
      base = Math.round(itemCents * tier.rate);
      if ('minCents' in tier && tier.minCents != null) {
        base = Math.max(base, tier.minCents);
      }
      if ('maxCents' in tier && tier.maxCents != null) {
        base = Math.min(base, tier.maxCents);
      }
      break;
    }
  }

  const multiplier =
    completedSales < VENDOR_COLLATERAL_NEW_VENDOR_MAX_SALES
      ? VENDOR_COLLATERAL_NEW_VENDOR_MULTIPLIER
      : 1;

  return Math.max(Math.round(base * multiplier), VENDOR_COLLATERAL_ABSOLUTE_MIN_CENTS);
}
