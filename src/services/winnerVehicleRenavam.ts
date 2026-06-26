import {
  extractRenavamFromListingExtras,
  maskRenavam,
} from '@/src/constants/vehicleTechSheet';
import { isMockMode } from '@/src/lib/mockMode';
import { obterIdUsuarioAtual } from '@/src/lib/sessionUser';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';

/** RENAVAM de demonstração para leilões mock de veículos (auctionId → dígitos). */
const MOCK_WINNER_RENAVAM: Record<string, string> = {
  '2': '00123456789',
  '5': '00987654321',
};

export type WinnerRenavamLookup = {
  auctionId: string;
  orderId?: string;
};

export async function getMaskedRenavamForWinner(
  input: WinnerRenavamLookup,
): Promise<string | null> {
  if (isMockMode() || !isSupabaseConfigured()) {
    const mock = MOCK_WINNER_RENAVAM[input.auctionId];
    return mock ? maskRenavam(mock) : null;
  }

  const buyerId = await obterIdUsuarioAtual();
  if (!buyerId) return null;

  const supabase = getSupabase();
  if (!supabase) return null;

  if (input.orderId) {
    const { data: order } = await supabase
      .from('orders')
      .select('buyer_id, auction_id')
      .eq('id', input.orderId)
      .maybeSingle();

    if (!order || order.buyer_id !== buyerId || order.auction_id !== input.auctionId) {
      return null;
    }
  }

  const { data: auction } = await supabase
    .from('auctions')
    .select('listing_category, listing_extras')
    .eq('id', input.auctionId)
    .maybeSingle();

  if (!auction || auction.listing_category !== 'veiculos') return null;

  const renavam = extractRenavamFromListingExtras(
    auction.listing_extras as Record<string, unknown>,
  );
  return renavam ? maskRenavam(renavam) : null;
}
