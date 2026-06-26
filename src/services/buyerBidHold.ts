import {
  calcularRetencaoLanceLocal,
  descricaoRetencaoLanceLocal,
  type BidHoldCategory,
} from '@/src/constants/buyerBidHold';
import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';

export type CheckoutWalletPreview = {
  availableCents: number;
  winningHoldCents: number;
  holdDescription: string;
  listingCategory: string | null;
};

export type BidHoldPreview = {
  holdCents: number;
  holdDescription: string;
  listingCategory: string | null;
};

export async function previewRetencaoLance(
  bidCents: number,
  auctionId?: string,
): Promise<BidHoldPreview> {
  if (bidCents <= 0) {
    return { holdCents: 0, holdDescription: '', listingCategory: null };
  }

  if (!isMockMode() && isSupabaseConfigured() && auctionId) {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.rpc('preview_retencao_lance', {
        p_bid_cents: bidCents,
        p_auction_id: auctionId,
      });
      if (!error && data) {
        const row = data as {
          hold_cents?: number;
          hold_description?: string;
          listing_category?: string | null;
        };
        return {
          holdCents: Number(row.hold_cents) || 0,
          holdDescription: row.hold_description ?? '',
          listingCategory: row.listing_category ?? null,
        };
      }
    }
  }

  let category: BidHoldCategory = null;
  if (!isMockMode() && isSupabaseConfigured() && auctionId) {
    const supabase = getSupabase();
    if (supabase) {
      const { data } = await supabase
        .from('auctions')
        .select('listing_category')
        .eq('id', auctionId)
        .maybeSingle();
      category = (data as { listing_category?: string | null } | null)?.listing_category;
    }
  }

  return {
    holdCents: calcularRetencaoLanceLocal(bidCents, category),
    holdDescription: descricaoRetencaoLanceLocal(category),
    listingCategory: category ?? null,
  };
}

export async function previewCarteiraCheckout(
  auctionId: string,
): Promise<CheckoutWalletPreview | null> {
  if (isMockMode() || !isSupabaseConfigured()) return null;

  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('preview_carteira_checkout', {
    p_auction_id: auctionId,
  });

  if (error || !data) return null;

  const row = data as {
    available_cents?: number;
    winning_hold_cents?: number;
    hold_description?: string;
    listing_category?: string | null;
  };

  return {
    availableCents: Number(row.available_cents) || 0,
    winningHoldCents: Number(row.winning_hold_cents) || 0,
    holdDescription: row.hold_description ?? descricaoRetencaoLanceLocal(row.listing_category),
    listingCategory: row.listing_category ?? null,
  };
}
