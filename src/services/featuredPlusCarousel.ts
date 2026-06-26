import { getFeaturedAuctions, type MockAuction } from '@/src/mocks/auctions';
import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase } from '@/src/lib/supabase';
import { normalizeFeaturedPlusItem } from '@/src/lib/featuredPlusFormatters';
import { buscarSnippetsVendedores } from '@/src/services/auctionSellerSnippet';
import type { FeaturedPlusCarouselItem } from '@/src/types/featuredPlus';

function mockEngagement(auction: MockAuction): { watchersCount: number; participantsCount: number } {
  const seed = Number.parseInt(auction.id, 10) || 1;
  return {
    watchersCount: 180 + seed * 31,
    participantsCount: 60 + seed * 11,
  };
}

function mockAuctionToFeaturedPlus(auction: MockAuction): FeaturedPlusCarouselItem {
  const engagement = mockEngagement(auction);
  return normalizeFeaturedPlusItem({
    id: auction.id,
    title: auction.title,
    imageUrl: auction.imageUrl,
    currentPriceCents: auction.priceCents,
    endsAtMs: auction.endsAt,
    watchersCount: engagement.watchersCount,
    participantsCount: engagement.participantsCount,
    seller: auction.seller,
  });
}

/** Leilões com Destaque Plus para o carrossel da Home. */
export async function fetchFeaturedPlusCarouselItems(): Promise<FeaturedPlusCarouselItem[]> {
  if (isMockMode()) {
    return getFeaturedAuctions().map(mockAuctionToFeaturedPlus);
  }

  const supabase = getSupabase();
  if (!supabase) {
    return getFeaturedAuctions().map(mockAuctionToFeaturedPlus);
  }

  const { data, error } = await supabase
    .from('auctions')
    .select(
      'id, title, description, image_urls, current_price_cents, ends_at, is_featured_plus, featured_plus_until, status, seller_id',
    )
    .eq('is_featured_plus', true)
    .eq('status', 'live')
    .order('ends_at', { ascending: true });

  const now = Date.now();
  const activeRows =
    data?.filter(
      (row) =>
        !row.featured_plus_until || new Date(row.featured_plus_until).getTime() > now,
    ) ?? [];

  if (error) {
    console.warn('[FeaturedPlus] fetch error', error.message);
    return [];
  }

  if (!activeRows.length) {
    if (__DEV__) {
      console.warn('[FeaturedPlus] nenhum leilão is_featured_plus no Supabase — mocks para validação');
      return getFeaturedAuctions().map(mockAuctionToFeaturedPlus);
    }
    return [];
  }

  const sellerIds = activeRows
    .map((row) => row.seller_id as string | null)
    .filter((id): id is string => Boolean(id));
  const snippets = await buscarSnippetsVendedores(sellerIds);

  return activeRows.map((row) => {
    const sellerId = row.seller_id as string | null;
    return normalizeFeaturedPlusItem({
      id: row.id,
      title: row.title,
      description: row.description,
      imageUrls: row.image_urls,
      currentPriceCents: row.current_price_cents,
      endsAt: row.ends_at,
      watchersCount: 0,
      participantsCount: 0,
      seller: sellerId ? snippets[sellerId] : undefined,
    });
  });
}
