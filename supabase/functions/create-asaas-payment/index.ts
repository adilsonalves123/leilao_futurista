import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  buildPixUnavailableMessage,
  createAsaasCustomer,
  createAsaasPayment,
  findCustomerByExternalReference,
  formatDueDate,
  getAsaasConfig,
  getAsaasPixQrCodeWithRetry,
  listAsaasPixAddressKeys,
  mapPaymentMethod,
} from '../_shared/asaasClient.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

type CreatePaymentBody = {
  auctionId?: string;
  itemCents?: number;
  shippingCents?: number;
  paymentMethod?: string;
  walletApplyAvailableCents?: number;
  walletApplyHoldCents?: number;
};

type BuyerProfile = {
  id: string;
  email: string;
  nome_completo: string | null;
  display_name: string | null;
  cpf: string | null;
  telefone: string | null;
  asaas_customer_id: string | null;
};

function onlyDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { apiKey, sandbox } = getAsaasConfig();
    if (!apiKey) {
      return jsonResponse({ error: 'ASAAS_API_KEY não configurado nos Secrets do Supabase.' }, 500);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim();
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
    const authHeader = req.headers.get('authorization') ?? '';

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return jsonResponse({ error: 'Supabase não configurado na Edge Function.' }, 500);
    }

    if (!authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Faça login para pagar.' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return jsonResponse({ error: 'Sessão inválida.' }, 401);
    }

    const body = (await req.json()) as CreatePaymentBody;
    const auctionId = body.auctionId?.trim();
    const itemCents = Math.round(Number(body.itemCents) || 0);
    const shippingCents = Math.round(Number(body.shippingCents) || 0);
    const paymentMethod = body.paymentMethod ?? 'pix';

    if (!auctionId || itemCents <= 0) {
      return jsonResponse({ error: 'auctionId e itemCents são obrigatórios.' }, 400);
    }

    const totalCents = itemCents + shippingCents;
    const walletApplyAvailable = Math.max(
      Math.round(Number(body.walletApplyAvailableCents) || 0),
      0,
    );
    const walletApplyHold = Math.max(Math.round(Number(body.walletApplyHoldCents) || 0), 0);
    const walletApplied = walletApplyAvailable + walletApplyHold;
    const chargeCents = Math.max(totalCents - walletApplied, 0);
    const commissionCents = Math.round(itemCents * 0.1);
    const buyerId = authData.user.id;

    if (walletApplied > totalCents) {
      return jsonResponse({ error: 'Abatimento da carteira excede o total.' }, 400);
    }

    const { data: buyer, error: buyerError } = await adminClient
      .from('users')
      .select('id, email, nome_completo, display_name, cpf, telefone, asaas_customer_id')
      .eq('id', buyerId)
      .maybeSingle();

    if (buyerError || !buyer) {
      return jsonResponse({ error: 'Perfil do comprador não encontrado.' }, 400);
    }

    const profile = buyer as BuyerProfile;
    const cpf = onlyDigits(profile.cpf);
    const buyerName = profile.nome_completo?.trim() || profile.display_name?.trim() || 'Comprador Levou';

    if (cpf.length !== 11 && cpf.length !== 14) {
      return jsonResponse({
        error: 'Complete seu CPF/CNPJ no cadastro (KYC) antes de pagar com Asaas.',
      }, 400);
    }

    const { data: auction, error: auctionError } = await adminClient
      .from('auctions')
      .select('id, title, status, seller_id')
      .eq('id', auctionId)
      .maybeSingle();

    if (auctionError || !auction) {
      return jsonResponse({ error: 'Leilão não encontrado.' }, 404);
    }

    if (auction.seller_id === buyerId) {
      return jsonResponse({ error: 'O vendedor não pode pagar o próprio leilão.' }, 400);
    }

    let asaasCustomerId = profile.asaas_customer_id;

    if (!asaasCustomerId) {
      const existing = await findCustomerByExternalReference(buyerId);
      if (existing?.id) {
        asaasCustomerId = existing.id;
      } else {
        const created = await createAsaasCustomer({
          name: buyerName,
          cpfCnpj: cpf,
          email: profile.email,
          mobilePhone: onlyDigits(profile.telefone) || undefined,
          externalReference: buyerId,
        });
        if (!created?.id) {
          return jsonResponse({ error: 'Não foi possível cadastrar o cliente no Asaas.' }, 502);
        }
        asaasCustomerId = created.id;
      }

      await adminClient.rpc('vincular_asaas_customer', {
        p_user_id: buyerId,
        p_asaas_customer_id: asaasCustomerId,
      });
    }

    const billingType = mapPaymentMethod(paymentMethod);
    const invoiceMethod =
      paymentMethod.toLowerCase() === 'cartao' ? 'cartao' : paymentMethod.toLowerCase() === 'boleto' ? 'boleto' : 'pix';

    let paymentId = `wallet-only-${auctionId}-${Date.now()}`;
    let invoiceUrl: string | null = null;
    let bankSlipUrl: string | null = null;

    if (chargeCents > 0) {
      const payment = await createAsaasPayment({
        customer: asaasCustomerId,
        billingType: billingType === 'CREDIT_CARD' ? 'UNDEFINED' : billingType,
        value: Number((chargeCents / 100).toFixed(2)),
        dueDate: formatDueDate(1),
        description: `Leilão Levou — ${auction.title ?? auctionId}`.slice(0, 140),
        externalReference: auctionId,
      });

      if (!payment?.id) {
        return jsonResponse({ error: 'Falha ao criar cobrança no Asaas.' }, 502);
      }
      paymentId = payment.id;
      invoiceUrl = payment.invoiceUrl ?? null;
      bankSlipUrl = payment.bankSlipUrl ?? null;
    }

    const { data: feeRow } = await adminClient.rpc('estimar_taxa_gateway_cents', {
      p_provider: 'asaas',
      p_method: invoiceMethod,
      p_total_cents: chargeCents > 0 ? chargeCents : totalCents,
    });
    const gatewayFeeCents = Number(feeRow) || 0;

    const { data: checkoutRow, error: checkoutError } = await adminClient.rpc(
      'iniciar_checkout_pagamento',
      {
        p_auction_id: auctionId,
        p_buyer_id: buyerId,
        p_item_cents: itemCents,
        p_shipping_cents: shippingCents,
        p_commission_cents: commissionCents,
        p_payment_method: invoiceMethod,
        p_asaas_payment_id: paymentId,
        p_gateway_fee_cents: gatewayFeeCents,
        p_wallet_apply_available_cents: walletApplyAvailable,
        p_wallet_apply_hold_cents: walletApplyHold,
      },
    );

    if (checkoutError) {
      return jsonResponse({ error: checkoutError.message }, 500);
    }

    let pixQrBase64: string | null = null;
    let pixCopyPaste: string | null = null;
    let pixExpiration: string | null = null;

    if (chargeCents > 0 && (billingType === 'PIX' || invoiceMethod === 'pix')) {
      const pixKeyCheck = await listAsaasPixAddressKeys();
      if (pixKeyCheck.ok && pixKeyCheck.keys.length === 0) {
        return jsonResponse({
          error: sandbox
            ? 'Conta Asaas sandbox sem chave Pix. Cadastre em sandbox.asaas.com → Minha Conta → Pix.'
            : 'Conta Asaas sem chave Pix cadastrada. Cadastre em asaas.com → Minha Conta → Pix.',
          code: 'ASAAS_PIX_KEY_MISSING',
          asaasSandbox: sandbox,
        }, 400);
      }

      const pixResult = await getAsaasPixQrCodeWithRetry(paymentId);
      const pix = pixResult.pix;
      if (!pix?.payload?.trim()) {
        return jsonResponse({
          error: buildPixUnavailableMessage({
            sandbox,
            status: pixResult.status,
            asaasError: pixResult.errorMessage,
          }),
          code: 'ASAAS_PIX_QR_UNAVAILABLE',
          asaasPaymentId: paymentId,
          asaasSandbox: sandbox,
        }, 502);
      }
      pixQrBase64 = pix.encodedImage ?? null;
      pixCopyPaste = pix.payload.trim();
      pixExpiration = pix.expirationDate ?? null;
    }

    if (chargeCents === 0 && checkoutRow) {
      const checkout = checkoutRow as { order_id?: string } | null;
      if (checkout?.order_id) {
        await adminClient.rpc('confirmar_pagamento_asaas', {
          p_asaas_payment_id: paymentId,
          p_receipt_url: null,
          p_gateway_fee_cents: 0,
        });
      }
    }

    const checkout = checkoutRow as {
      order_id?: string;
      order_code?: string;
      payment_provider?: string;
      charge_cents?: number;
      wallet_applied_cents?: number;
    } | null;

    return jsonResponse({
      ok: true,
      asaasPaymentId: paymentId,
      orderId: checkout?.order_id ?? null,
      orderCode: checkout?.order_code ?? null,
      paymentProvider: checkout?.payment_provider ?? 'asaas',
      invoiceUrl,
      bankSlipUrl,
      pixQrBase64,
      pixCopyPaste,
      pixExpiration,
      asaasSandbox: sandbox,
      totalCents,
      chargeCents,
      walletAppliedCents: walletApplied,
      paidWithWalletOnly: chargeCents === 0,
      status: chargeCents === 0 ? 'RECEIVED' : 'PENDING',
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
});
