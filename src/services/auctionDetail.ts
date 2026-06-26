import {
  deveUsarBackendLeilaoLocal,
  isErroUuidPostgres,
  normalizeAuctionId,
} from '@/src/lib/auctionIds';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import { getAuctionById } from '@/src/mocks/auctions';
import { MOCK_VENDOR_ID } from '@/src/constants/operations';
import { obterIdUsuarioAtual } from '@/src/lib/sessionUser';

export type BuyerAuctionBid = {
  id: string;
  userName: string;
  amountCents: number;
  timestamp: Date;
};

export type BuyerAuctionDetail = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  imageUrls: string[];
  currentPriceCents: number;
  startingPriceCents: number;
  estimatedMarketCents: number | null;
  endsAtMs: number;
  status: string;
  conservationState: string | null;
  category: string | null;
  recentBids: BuyerAuctionBid[];
  leaderName: string;
  leaderIsUser: boolean;
  sellerId: string | null;
};

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?q=80&w=800&auto=format&fit=crop';

function bidderDisplayName(row: {
  display_name: string | null;
  nome_completo: string | null;
  email: string;
}): string {
  const nome = row.nome_completo?.trim() || row.display_name?.trim();
  if (nome) return nome.split(' ')[0] + (nome.includes(' ') ? ` ${nome.split(' ')[1]?.[0] ?? ''}.` : '');
  const local = row.email?.split('@')[0] ?? 'Participante';
  return local.slice(0, 12);
}

function mockDetail(auctionId: string): BuyerAuctionDetail | null {
  const mock = getAuctionById(auctionId);
  if (!mock) return null;

  return {
    id: mock.id,
    title: mock.title,
    description: '',
    imageUrl: mock.imageUrl,
    imageUrls: [mock.imageUrl],
    currentPriceCents: mock.priceCents,
    startingPriceCents: mock.priceCents,
    estimatedMarketCents: Math.round(mock.priceCents * 1.22),
    endsAtMs: mock.endsAt,
    status: 'live',
    conservationState: null,
    category: mock.category,
    recentBids: [],
    leaderName: '—',
    leaderIsUser: false,
    sellerId: MOCK_VENDOR_ID,
  };
}

export async function loadBuyerAuctionDetail(auctionId: string): Promise<BuyerAuctionDetail | null> {
  const id = normalizeAuctionId(auctionId);
  if (!id) return null;

  if (deveUsarBackendLeilaoLocal(id)) {
    return mockDetail(id);
  }

  if (!isSupabaseConfigured()) {
    return mockDetail(id);
  }

  const supabase = getSupabase();
  if (!supabase) {
    return mockDetail(id);
  }

  const [userId, auctionRes] = await Promise.all([
    obterIdUsuarioAtual(),
    supabase
      .from('auctions')
      .select(
        'id, title, description, image_urls, current_price_cents, starting_price_cents, estimated_market_cents, ends_at, status, conservation_state, listing_category, seller_id',
      )
      .eq('id', id)
      .maybeSingle(),
  ]);

  const { data: auction, error } = auctionRes;

  if (error) {
    if (isErroUuidPostgres(error.message)) return mockDetail(id);
    console.warn('[auctionDetail] fetch error:', error.message);
    return null;
  }

  if (!auction) return null;

  const { data: bidsRaw } = await supabase
    .from('bids')
    .select(
      'id, amount_cents, created_at, bidder_id, bidder:users!bidder_id(display_name, nome_completo, email)',
    )
    .eq('auction_id', id)
    .order('created_at', { ascending: false })
    .limit(8);

  const images = (auction.image_urls as string[] | null) ?? [];
  const capa = images[0] ?? FALLBACK_IMAGE;
  const endsAtMs = auction.ends_at ? new Date(auction.ends_at as string).getTime() : Date.now();

  const recentBids: BuyerAuctionBid[] = (bidsRaw ?? []).map((row) => ({
    id: row.id as string,
    userName: bidderDisplayName(
      row.bidder as { display_name: string | null; nome_completo: string | null; email: string },
    ),
    amountCents: row.amount_cents as number,
    timestamp: new Date(row.created_at as string),
  }));

  const topBid = bidsRaw?.[0];
  const leaderIsUser = Boolean(userId && topBid && topBid.bidder_id === userId);
  const leaderName = topBid
    ? bidderDisplayName(
        topBid.bidder as { display_name: string | null; nome_completo: string | null; email: string },
      )
    : 'Sem lances';

  return {
    id: auction.id as string,
    title: (auction.title as string) ?? 'Leilão',
    description: (auction.description as string) ?? '',
    imageUrl: capa,
    imageUrls: images.length ? images : [capa],
    currentPriceCents: Number(auction.current_price_cents) || 0,
    startingPriceCents: Number(auction.starting_price_cents) || Number(auction.current_price_cents) || 0,
    estimatedMarketCents:
      auction.estimated_market_cents != null ? Number(auction.estimated_market_cents) : null,
    endsAtMs,
    status: (auction.status as string) ?? 'live',
    conservationState: (auction.conservation_state as string | null) ?? null,
    category: (auction.listing_category as string | null) ?? null,
    recentBids,
    leaderName: leaderIsUser ? 'Você' : leaderName,
    leaderIsUser,
    sellerId: (auction.seller_id as string | null) ?? null,
  };
}
