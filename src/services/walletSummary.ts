import type { TranslationKey } from '@/src/i18n/translations';
import {
  getWalletBreakdownCents,
  type WalletBreakdown,
} from '@/src/services/listingWalletBalance';
import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';

export type WithdrawBlockReason = 'pending_operations' | 'no_free_balance' | null;

export type WalletSummary = WalletBreakdown & {
  withdrawableCents: number;
  canWithdraw: boolean;
  pendingOperationsCount: number;
  activeListingGuaranteesCount: number;
  activeBidHoldsCount: number;
  withdrawBlockReason: WithdrawBlockReason;
};

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

function summaryFromBreakdown(breakdown: WalletBreakdown): WalletSummary {  const canWithdraw = breakdown.availableCents > 0;
  return {
    ...breakdown,
    withdrawableCents: canWithdraw ? breakdown.availableCents : 0,
    canWithdraw,
    pendingOperationsCount: 0,
    activeListingGuaranteesCount: breakdown.collateralHeldCents > 0 ? 1 : 0,
    activeBidHoldsCount: breakdown.bidHeldCents > 0 ? 1 : 0,
    withdrawBlockReason: canWithdraw ? null : 'no_free_balance',
  };
}

export async function getWalletSummary(): Promise<WalletSummary> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return summaryFromBreakdown(await getWalletBreakdownCents());
  }

  const supabase = getSupabase();
  if (!supabase) {
    return summaryFromBreakdown(await getWalletBreakdownCents());
  }

  const { data, error } = await supabase.rpc('carteira_resumo');
  if (error || !data || (data as { ok?: boolean }).ok !== true) {
    return summaryFromBreakdown(await getWalletBreakdownCents());
  }

  const row = data as Record<string, unknown>;
  const totalCents = Number(row.total_cents) || 0;
  const collateralHeldCents = Number(row.vendor_collateral_cents) || 0;
  const bidHeldCents = Number(row.bid_held_cents) || 0;
  const availableCents = Number(row.free_cents) || 0;

  return {
    totalCents,
    collateralHeldCents,
    bidHeldCents,
    availableCents,
    withdrawableCents: Number(row.withdrawable_cents) || 0,
    canWithdraw: row.can_withdraw === true,
    pendingOperationsCount: Number(row.pending_operations_count) || 0,
    activeListingGuaranteesCount: Number(row.active_listing_guarantees_count) || 0,
    activeBidHoldsCount: Number(row.active_bid_holds_count) || 0,
    withdrawBlockReason: (row.withdraw_block_reason as WithdrawBlockReason) ?? null,
  };
}

export function formatGuaranteesDetail(summary: WalletSummary, t: TranslateFn): string {
  const parts: string[] = [];
  if (summary.activeListingGuaranteesCount > 0) {
    parts.push(
      t('wallet.guaranteeListings', { count: summary.activeListingGuaranteesCount }),
    );
  }
  if (summary.activeBidHoldsCount > 0) {
    parts.push(t('wallet.guaranteeBids', { count: summary.activeBidHoldsCount }));
  }
  if (parts.length === 0) {
    return t('wallet.noActiveGuarantees');
  }
  return parts.join(' · ');
}

export function withdrawBlockMessage(summary: WalletSummary, t: TranslateFn): string {
  if (summary.canWithdraw) return '';
  if (summary.withdrawBlockReason === 'pending_operations') {
    return t('wallet.withdrawBlockedPending', {
      count: summary.pendingOperationsCount,
    });
  }
  if (summary.collateralHeldCents + summary.bidHeldCents > 0 && summary.availableCents <= 0) {
    return t('wallet.withdrawBlockedGuarantees');
  }
  return t('wallet.withdrawBlockedEmpty');
}

export function totalGuaranteesCents(summary: WalletSummary): number {
  return summary.collateralHeldCents + summary.bidHeldCents;
}
