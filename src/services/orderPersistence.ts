import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PaymentMethod } from '@/src/types/operations';
import type { InvoicePaymentMethod } from '@/src/types/database';
import { calculateCommission } from '@/src/lib/bids';
import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';

export type PersistPaymentInput = {
  auctionId: string;
  buyerId: string;
  itemCents: number;
  shippingCents: number;
  paymentMethod: PaymentMethod;
  gatewayTransactionId?: string;
  receiptUrl?: string;
};

export type PersistPaymentResult = {
  checkoutId: string;
  orderId: string;
  orderCode: string;
};

const ORDER_MAP_KEY = '@aetherion/supabase_order_map';

export async function linkLocalOrderToSupabase(
  localOrderId: string,
  supabaseOrderId: string,
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(ORDER_MAP_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    map[localOrderId] = supabaseOrderId;
    await AsyncStorage.setItem(ORDER_MAP_KEY, JSON.stringify(map));
  } catch {
    /* ignore storage errors */
  }
}

export async function getSupabaseOrderIdForLocal(localOrderId: string): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(ORDER_MAP_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, string>;
    return map[localOrderId] ?? null;
  } catch {
    return null;
  }
}

export async function syncLocalOrderStatus(
  localOrderId: string,
  transactionStatus: string,
  extras?: { trackingCode?: string; eventMessage?: string },
): Promise<void> {
  const supabaseOrderId = await getSupabaseOrderIdForLocal(localOrderId);
  if (!supabaseOrderId) return;
  await syncOrderStatusByLocalId(supabaseOrderId, transactionStatus, extras);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function mapPaymentMethod(method: PaymentMethod): InvoicePaymentMethod {
  if (method === 'PIX') return 'pix';
  if (method === 'CARTAO') return 'cartao';
  if (method === 'CRIPTO') return 'cripto';
  return 'pix';
}

export function mapTransactionStatusToOrderStatus(
  status: string,
):
  | 'pago'
  | 'em_envio'
  | 'aguardando_confirmacao'
  | 'finalizado'
  | 'em_disputa'
  | 'estornado'
  | 'pendente_pagamento' {
  switch (status) {
    case 'RETIDO_EM_CUSTODIA':
      return 'pago';
    case 'EM_TRANSITO':
      return 'em_envio';
    case 'AGUARDANDO_CONFIRMACAO':
      return 'aguardando_confirmacao';
    case 'LIQUIDADO':
      return 'finalizado';
    case 'EM_DISPUTA':
      return 'em_disputa';
    case 'ESTORNADO':
    case 'EXPIRADO':
      return 'estornado';
    default:
      return 'pendente_pagamento';
  }
}

export async function persistAuctionPayment(
  input: PersistPaymentInput,
): Promise<PersistPaymentResult | null> {
  if (isMockMode() || !isSupabaseConfigured()) return null;
  if (!isUuid(input.auctionId) || !isUuid(input.buyerId)) return null;

  const supabase = getSupabase();
  if (!supabase) return null;

  const commissionCents = calculateCommission(input.itemCents);

  const { data, error } = await supabase.rpc('process_auction_payment', {
    p_auction_id: input.auctionId,
    p_buyer_id: input.buyerId,
    p_item_cents: input.itemCents,
    p_shipping_cents: input.shippingCents,
    p_commission_cents: commissionCents,
    p_payment_method: mapPaymentMethod(input.paymentMethod),
    p_gateway_transaction_id: input.gatewayTransactionId ?? null,
    p_receipt_url: input.receiptUrl ?? null,
    p_gateway: 'luckcode',
  });

  if (error) {
    console.warn('[orderPersistence] process_auction_payment:', error.message);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    checkoutId: row.checkout_id,
    orderId: row.order_id,
    orderCode: row.order_code,
  };
}

export async function syncOrderStatusByLocalId(
  supabaseOrderId: string,
  transactionStatus: string,
  extras?: { trackingCode?: string; eventMessage?: string },
): Promise<void> {
  if (!isUuid(supabaseOrderId)) return;

  const supabase = getSupabase();
  if (!supabase) return;

  const status = mapTransactionStatusToOrderStatus(transactionStatus);

  let eventType: string | null = null;
  let eventMessage: string | null = extras?.eventMessage ?? null;

  if (transactionStatus === 'EM_TRANSITO') {
    eventType = 'envio_postado';
    eventMessage ??= 'Etiqueta gerada e item postado.';
  } else if (transactionStatus === 'AGUARDANDO_CONFIRMACAO') {
    eventType = 'entrega_realizada';
    eventMessage ??= 'Entrega registrada — aguardando confirmação do comprador.';
  } else if (transactionStatus === 'LIQUIDADO') {
    eventType = 'pedido_finalizado';
    eventMessage ??= 'Entrega confirmada e pedido encerrado.';
  } else if (transactionStatus === 'EM_DISPUTA') {
    eventType = 'disputa_aberta';
    eventMessage ??= 'Disputa aberta — pagamento retido em custódia.';
  } else if (transactionStatus === 'ESTORNADO' || transactionStatus === 'EXPIRADO') {
    eventType = 'pedido_estornado';
    eventMessage ??= 'Pedido estornado ou expirado.';
  }

  const { error } = await supabase.rpc('update_order_status', {
    p_order_id: supabaseOrderId,
    p_status: status,
    p_tracking_code: extras?.trackingCode ?? null,
    p_event_type: eventType,
    p_event_message: eventMessage,
  });

  if (error) {
    console.warn('[orderPersistence] update_order_status:', error.message);
  }
}
