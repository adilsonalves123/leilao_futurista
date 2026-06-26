import {
  PAYMENT_PROVIDER_LABELS,
  type PaymentProviderSlug,
  type PaymentRouteMethod,
  type PaymentRouteResult,
} from '@/src/constants/payments';
import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';

function mapCheckoutMethod(method: string): PaymentRouteMethod | null {
  const key = method.toLowerCase();
  if (key === 'pix') return 'pix';
  if (key === 'cartao' || key === 'card' || key === 'cartão') return 'cartao';
  if (key === 'boleto') return 'boleto';
  if (key === 'cripto' || key === 'crypto') return 'cripto';
  return null;
}

function mockRoute(method: PaymentRouteMethod, totalCents: number): PaymentRouteResult {
  const provider: PaymentProviderSlug =
    method === 'cripto' ? 'luckcode' : method === 'cartao' && totalCents > 500_000 ? 'mercado_pago' : 'asaas';

  const feeBps = method === 'pix' ? 99 : method === 'cartao' ? 399 : 0;
  const gatewayFeeCents = Math.round((totalCents * feeBps) / 10_000);

  return {
    paymentMethod: method,
    paymentProvider: provider,
    providerDisplayName: PAYMENT_PROVIDER_LABELS[provider] ?? provider,
    gatewayFeeCents,
    feeReserveCents: gatewayFeeCents,
    totalCents,
  };
}

export async function resolverRotaPagamento(
  method: string,
  totalCents: number,
): Promise<PaymentRouteResult | null> {
  const mapped = mapCheckoutMethod(method);
  if (!mapped || totalCents <= 0) return null;

  if (isMockMode() || !isSupabaseConfigured()) {
    return mockRoute(mapped, totalCents);
  }

  const supabase = getSupabase();
  if (!supabase) return mockRoute(mapped, totalCents);

  const { data, error } = await supabase.rpc('resolver_rota_pagamento', {
    p_method: mapped,
    p_total_cents: totalCents,
  });

  if (error || !data) {
    return mockRoute(mapped, totalCents);
  }

  const row = data as {
    payment_method?: string;
    payment_provider?: string;
    provider_display_name?: string;
    gateway_fee_cents?: number;
    fee_reserve_cents?: number;
    total_cents?: number;
  };

  return {
    paymentMethod: (row.payment_method as PaymentRouteMethod) ?? mapped,
    paymentProvider: (row.payment_provider as PaymentProviderSlug) ?? 'luckcode',
    providerDisplayName: row.provider_display_name ?? row.payment_provider ?? 'PSP',
    gatewayFeeCents: Number(row.gateway_fee_cents) || 0,
    feeReserveCents: Number(row.fee_reserve_cents) || 0,
    totalCents: Number(row.total_cents) || totalCents,
  };
}
