import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

type AsaasWebhookPayload = {
  event?: string;
  payment?: {
    id?: string;
    status?: string;
    transactionReceiptUrl?: string;
    value?: number;
  };
};

const CONFIRM_EVENTS = new Set([
  'PAYMENT_RECEIVED',
  'PAYMENT_CONFIRMED',
]);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const webhookToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN')?.trim();
    const incomingToken = req.headers.get('asaas-access-token')?.trim();

    if (webhookToken && incomingToken !== webhookToken) {
      return jsonResponse({ error: 'Token de webhook inválido.' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();

    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ error: 'Supabase não configurado.' }, 500);
    }

    const payload = (await req.json()) as AsaasWebhookPayload;
    const event = payload.event ?? '';
    const paymentId = payload.payment?.id?.trim();

    if (!paymentId) {
      return jsonResponse({ ok: true, ignored: true, reason: 'no_payment_id' });
    }

    if (!CONFIRM_EVENTS.has(event)) {
      return jsonResponse({ ok: true, ignored: true, event });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: orderResult, error: orderError } = await supabase.rpc(
      'confirmar_pagamento_asaas',
      {
        p_asaas_payment_id: paymentId,
        p_receipt_url: payload.payment?.transactionReceiptUrl ?? null,
        p_gateway_fee_cents: null,
      },
    );

    if (orderError) {
      console.error('[asaas-webhook] confirmar_pagamento_asaas:', orderError.message);
      return jsonResponse({ error: orderError.message }, 500);
    }

    const orderPayload = orderResult as { ok?: boolean; reason?: string } | null;
    if (orderPayload?.ok === false && orderPayload.reason === 'order_not_found') {
      const { data: depositResult, error: depositError } = await supabase.rpc(
        'confirmar_recarga_carteira_asaas',
        {
          p_asaas_payment_id: paymentId,
          p_receipt_url: payload.payment?.transactionReceiptUrl ?? null,
          p_gateway_fee_cents: null,
        },
      );

      if (depositError) {
        console.error('[asaas-webhook] confirmar_recarga_carteira_asaas:', depositError.message);
        return jsonResponse({ error: depositError.message }, 500);
      }

      const depositPayload = depositResult as { ok?: boolean; reason?: string } | null;
      if (depositPayload?.ok === false && depositPayload.reason === 'deposit_not_found') {
        return jsonResponse({ ok: true, ignored: true, reason: 'payment_not_linked' });
      }

      return jsonResponse({ ok: true, event, kind: 'wallet_deposit', result: depositResult });
    }

    return jsonResponse({ ok: true, event, kind: 'order', result: orderResult });
  } catch (error) {
    console.error('[asaas-webhook]', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
});
