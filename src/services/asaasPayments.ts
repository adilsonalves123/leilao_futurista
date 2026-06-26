import { getSupabase } from '@/src/lib/supabase';
import type {
  AsaasPaymentStatusResult,
  CreateAsaasPaymentResult,
} from '@/src/types/asaasPayments';

const ASAAS_ENABLED = process.env.EXPO_PUBLIC_ASAAS_ENABLED === 'true';

export function isAsaasEnabled(): boolean {
  return ASAAS_ENABLED;
}

export async function criarCobrancaAsaas(input: {
  auctionId: string;
  itemCents: number;
  shippingCents: number;
  paymentMethod: string;
  walletApplyAvailableCents?: number;
  walletApplyHoldCents?: number;
}): Promise<CreateAsaasPaymentResult> {
  if (!isAsaasEnabled()) {
    return { ok: false, error: 'Asaas desabilitado no app.' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, error: 'Supabase não configurado.' };
  }

  const { data, error } = await supabase.functions.invoke<CreateAsaasPaymentResult>(
    'create-asaas-payment',
    {
      body: {
        auctionId: input.auctionId,
        itemCents: input.itemCents,
        shippingCents: input.shippingCents,
        paymentMethod: input.paymentMethod,
        walletApplyAvailableCents: input.walletApplyAvailableCents ?? 0,
        walletApplyHoldCents: input.walletApplyHoldCents ?? 0,
      },
    },
  );

  if (error) {
    const msg = error.message.includes('create-asaas-payment')
      ? 'Deploy a Edge Function create-asaas-payment e configure ASAAS_API_KEY nos Secrets.'
      : error.message;
    return { ok: false, error: msg };
  }

  if (!data?.ok) {
    return { ok: false, error: data?.error ?? 'Falha ao criar cobrança Asaas.' };
  }

  return data;
}

export async function consultarStatusPagamentoAsaas(
  asaasPaymentId: string,
): Promise<AsaasPaymentStatusResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, reason: 'no_supabase' };
  }

  const { data, error } = await supabase.rpc('consultar_status_pagamento_asaas', {
    p_asaas_payment_id: asaasPaymentId,
  });

  if (error) {
    return { ok: false, reason: error.message };
  }

  const row = data as {
    ok?: boolean;
    order_id?: string;
    order_code?: string;
    status?: string;
    paid?: boolean;
    reason?: string;
  } | null;

  if (!row?.ok) {
    return { ok: false, reason: row?.reason ?? 'not_found' };
  }

  return {
    ok: true,
    orderId: row.order_id,
    orderCode: row.order_code,
    status: row.status,
    paid: row.paid === true,
  };
}

export function mapCheckoutMethodToAsaas(method: string): string {
  if (method === 'PIX') return 'pix';
  if (method === 'CARTAO') return 'cartao';
  if (method === 'CRIPTO') return 'cripto';
  return 'pix';
}
