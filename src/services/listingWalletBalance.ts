import AsyncStorage from '@react-native-async-storage/async-storage';

import { isMockMode } from '@/src/lib/mockMode';
import { obterIdUsuarioAtual } from '@/src/lib/sessionUser';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';

const STORAGE_KEY = '@levou/listing_wallet_balance_cents';

/** Saldo inicial no modo demonstração local (R$ 2.500,00). */
const DEFAULT_BALANCE_CENTS = 250_000;

/** Valores rápidos de recarga na Carteira. */
export const WALLET_TOPUP_OPTIONS_CENTS = [
  10_000, // R$ 100
  50_000, // R$ 500
  100_000, // R$ 1.000
  250_000, // R$ 2.500
] as const;

/** @deprecated use WALLET_TOPUP_OPTIONS_CENTS */
export const WALLET_DEMO_TOPUP_OPTIONS_CENTS = WALLET_TOPUP_OPTIONS_CENTS;

const COLLATERAL_HELD_KEY = '@levou/vendor_collateral_held_cents';
const BID_HELD_KEY = '@levou/buyer_bid_held_cents';

export type WalletBreakdown = {
  totalCents: number;
  collateralHeldCents: number;
  bidHeldCents: number;
  availableCents: number;
};

export async function syncListingWalletFromSupabase(): Promise<number | null> {
  const breakdown = await syncWalletBreakdownFromSupabase();
  return breakdown?.totalCents ?? null;
}

export async function syncWalletBreakdownFromSupabase(): Promise<WalletBreakdown | null> {
  if (isMockMode() || !isSupabaseConfigured()) return null;

  const supabase = getSupabase();
  const userId = await obterIdUsuarioAtual();
  if (!supabase || !userId) return null;

  const { data, error } = await supabase
    .from('users')
    .select('escrow_balance_cents, vendor_collateral_held_cents, buyer_bid_held_cents')
    .eq('id', userId)
    .maybeSingle();

  if (error || data == null) return null;

  const totalCents = Number(data.escrow_balance_cents) || 0;
  const collateralHeldCents = Number(data.vendor_collateral_held_cents) || 0;
  const bidHeldCents = Number(data.buyer_bid_held_cents) || 0;
  const availableCents = Math.max(totalCents - collateralHeldCents - bidHeldCents, 0);

  await AsyncStorage.setItem(STORAGE_KEY, String(totalCents));
  await AsyncStorage.setItem(COLLATERAL_HELD_KEY, String(collateralHeldCents));
  await AsyncStorage.setItem(BID_HELD_KEY, String(bidHeldCents));

  return { totalCents, collateralHeldCents, bidHeldCents, availableCents };
}

export async function getWalletBreakdownCents(): Promise<WalletBreakdown> {
  const synced = await syncWalletBreakdownFromSupabase();
  if (synced) return synced;

  const totalCents = await getListingWalletBalanceCents();
  let collateralHeldCents = 0;
  let bidHeldCents = 0;
  try {
    const raw = await AsyncStorage.getItem(COLLATERAL_HELD_KEY);
    collateralHeldCents = raw != null ? Math.max(parseInt(raw, 10) || 0, 0) : 0;
    const rawBid = await AsyncStorage.getItem(BID_HELD_KEY);
    bidHeldCents = rawBid != null ? Math.max(parseInt(rawBid, 10) || 0, 0) : 0;
  } catch {
    collateralHeldCents = 0;
    bidHeldCents = 0;
  }

  return {
    totalCents,
    collateralHeldCents,
    bidHeldCents,
    availableCents: Math.max(totalCents - collateralHeldCents - bidHeldCents, 0),
  };
}

export async function getListingWalletBalanceCents(): Promise<number> {
  const synced = await syncListingWalletFromSupabase();
  if (synced != null) return synced;

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw == null) {
      await AsyncStorage.setItem(STORAGE_KEY, String(DEFAULT_BALANCE_CENTS));
      return DEFAULT_BALANCE_CENTS;
    }
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_BALANCE_CENTS;
  } catch {
    return DEFAULT_BALANCE_CENTS;
  }
}

export async function debitListingWalletCents(
  amountCents: number,
): Promise<{ ok: boolean; newBalance: number; erro?: string }> {
  if (amountCents <= 0) {
    return { ok: false, newBalance: await getListingWalletBalanceCents(), erro: 'Valor inválido.' };
  }

  if (!isMockMode() && isSupabaseConfigured()) {
    return {
      ok: false,
      newBalance: await getListingWalletBalanceCents(),
      erro: 'O débito é feito automaticamente ao publicar o leilão.',
    };
  }

  const balance = await getListingWalletBalanceCents();
  if (balance < amountCents) {
    return {
      ok: false,
      newBalance: balance,
      erro: 'Saldo insuficiente. Adicione créditos na Carteira para ativar.',
    };
  }

  const newBalance = balance - amountCents;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, String(newBalance));
  } catch {
    return { ok: false, newBalance: balance, erro: 'Não foi possível debitar o saldo.' };
  }

  return { ok: true, newBalance };
}

/** Credita saldo para testes (Destaque / Plus). Supabase: RPC; offline: AsyncStorage. */
export async function recarregarCarteiraDemo(
  amountCents: number,
): Promise<{ ok: boolean; newBalance: number; erro?: string }> {
  if (amountCents <= 0) {
    return { ok: false, newBalance: await getListingWalletBalanceCents(), erro: 'Valor inválido.' };
  }

  if (!isMockMode() && isSupabaseConfigured()) {
    const supabase = getSupabase();
    const userId = await obterIdUsuarioAtual();
    if (!supabase || !userId) {
      return { ok: false, newBalance: 0, erro: 'Faça login para recarregar.' };
    }

    const { data, error } = await supabase.rpc('carteira_recarga_demo', {
      p_amount_cents: amountCents,
    });

    if (error) {
      const msg = error.message.includes('carteira_recarga_demo')
        ? 'Execute supabase/migrations/046_wallet_demo_topup.sql no Supabase.'
        : error.message;
      return { ok: false, newBalance: await getListingWalletBalanceCents(), erro: msg };
    }

    const row = data as { new_balance_cents?: number } | null;
    const newBalance = Number(row?.new_balance_cents) || 0;
    await AsyncStorage.setItem(STORAGE_KEY, String(newBalance));
    return { ok: true, newBalance };
  }

  const balance = await getListingWalletBalanceCents();
  const newBalance = balance + amountCents;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, String(newBalance));
  } catch {
    return { ok: false, newBalance: balance, erro: 'Não foi possível salvar o saldo local.' };
  }
  return { ok: true, newBalance };
}
