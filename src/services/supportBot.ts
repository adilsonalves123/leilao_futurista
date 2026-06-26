import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase } from '@/src/lib/supabase';
import { MOCK_BIDS_BY_AUCTION } from '@/src/mocks/data';

/** AI support context from real-time bid logs — see instructions.md */
export async function fetchBidContextForSupport(auctionId: string) {
  if (isMockMode()) {
    const bids = MOCK_BIDS_BY_AUCTION[auctionId] ?? [];
    return { bids, message: null };
  }

  const supabase = getSupabase();
  if (!supabase) {
    const bids = MOCK_BIDS_BY_AUCTION[auctionId] ?? [];
    return { bids, message: null };
  }

  const { data, error } = await supabase
    .from('bids')
    .select('id, amount_cents, created_at, bidder_id')
    .eq('auction_id', auctionId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return { bids: [], message: error.message };
  return { bids: data ?? [], message: null };
}

export function buildSupportPrompt(auctionId: string, bids: { amount_cents: number; created_at: string }[]) {
  const summary = bids
    .map((b) => `R$${(b.amount_cents / 100).toFixed(2)} em ${b.created_at}`)
    .join('\n');
  return `Leilão ${auctionId} — lances recentes:\n${summary || 'Nenhum lance ainda.'}`;
}
