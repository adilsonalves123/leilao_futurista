import { isAsaasEnabled } from '@/src/services/asaasPayments';
import { getSupabase } from '@/src/lib/supabase';
import type {
  AsaasWalletDepositStatusResult,
  CreateAsaasWalletDepositResult,
} from '@/src/types/asaasPayments';

export async function criarRecargaCarteiraAsaas(
  amountCents: number,
): Promise<CreateAsaasWalletDepositResult> {
  if (!isAsaasEnabled()) {
    return { ok: false, error: 'Asaas desabilitado no app.' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, error: 'Supabase não configurado.' };
  }

  const { data, error } = await supabase.functions.invoke<CreateAsaasWalletDepositResult>(
    'create-asaas-wallet-deposit',
    { body: { amountCents } },
  );

  if (error) {
    const msg = error.message.includes('create-asaas-wallet-deposit')
      ? 'Deploy a Edge Function create-asaas-wallet-deposit e configure ASAAS_API_KEY nos Secrets.'
      : error.message;
    return { ok: false, error: msg };
  }

  if (!data?.ok) {
    return { ok: false, error: data?.error ?? 'Falha ao criar recarga Pix.' };
  }

  return data;
}

export async function consultarStatusRecargaCarteiraAsaas(
  asaasPaymentId: string,
): Promise<AsaasWalletDepositStatusResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, reason: 'no_supabase' };
  }

  const { data, error } = await supabase.rpc('consultar_status_recarga_carteira_asaas', {
    p_asaas_payment_id: asaasPaymentId,
  });

  if (error) {
    return { ok: false, reason: error.message };
  }

  const row = data as {
    ok?: boolean;
    deposit_id?: string;
    status?: string;
    received?: boolean;
    amount_cents?: number;
    new_balance_cents?: number;
    reason?: string;
  } | null;

  if (!row?.ok) {
    return { ok: false, reason: row?.reason ?? 'not_found' };
  }

  return {
    ok: true,
    depositId: row.deposit_id,
    status: row.status,
    received: row.received === true,
    amountCents: row.amount_cents,
    newBalanceCents: row.new_balance_cents,
  };
}
