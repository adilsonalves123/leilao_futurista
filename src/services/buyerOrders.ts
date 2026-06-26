import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';

export type ConfirmReceiptResult =
  | { ok: true; orderId: string }
  | { ok: false; reason: string; message?: string };

export async function compradorConfirmarRecebimento(
  orderId: string,
): Promise<ConfirmReceiptResult> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return { ok: false, reason: 'offline', message: 'Modo demo — use o fluxo local.' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, reason: 'no_client', message: 'Supabase não configurado.' };
  }

  const { data, error } = await supabase.rpc('comprador_confirmar_recebimento', {
    p_order_id: orderId,
  });

  if (error) {
    return { ok: false, reason: 'rpc_error', message: error.message };
  }

  const payload = data as Record<string, unknown> | null;
  if (!payload?.ok) {
    return {
      ok: false,
      reason: String(payload?.reason ?? 'unknown'),
      message: payload?.message ? String(payload.message) : undefined,
    };
  }

  return { ok: true, orderId: String(payload.order_id ?? orderId) };
}
