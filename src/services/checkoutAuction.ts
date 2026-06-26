import { getAuctionById } from '@/src/mocks/auctions';
import { isUuid } from '@/src/services/orderPersistence';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';

export type CheckoutAuctionInfo = {
  id: string;
  title: string;
  imageUrl: string;
  imageUrls: string[];
  priceCents: number;
  originCep: string;
  category?: string | null;
};

function normalizeGallery(primary: string, extras?: string[]): string[] {
  const merged = [...(extras ?? []), primary].filter(Boolean);
  const unique = Array.from(new Set(merged));
  return unique.length ? unique : [primary || FALLBACK_IMAGE];
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?q=80&w=800&auto=format&fit=crop';

const DEFAULT_ORIGIN_CEP = '01310100';

export async function loadCheckoutAuction(
  auctionId: string,
  fallbackPriceCents: number,
): Promise<CheckoutAuctionInfo> {
  const mock = getAuctionById(auctionId);
  if (mock) {
    return {
      id: mock.id,
      title: mock.title,
      imageUrl: mock.imageUrl,
      imageUrls: normalizeGallery(mock.imageUrl),
      priceCents: fallbackPriceCents > 0 ? fallbackPriceCents : mock.priceCents,
      originCep: DEFAULT_ORIGIN_CEP,
      category: mock.category,
    };
  }

  if (!isSupabaseConfigured() || !isUuid(auctionId)) {
    return {
      id: auctionId,
      title: `Leilão #${auctionId.slice(0, 8)}`,
      imageUrl: FALLBACK_IMAGE,
      imageUrls: [FALLBACK_IMAGE],
      priceCents: fallbackPriceCents > 0 ? fallbackPriceCents : 0,
      originCep: DEFAULT_ORIGIN_CEP,
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return {
      id: auctionId,
      title: `Leilão #${auctionId.slice(0, 8)}`,
      imageUrl: FALLBACK_IMAGE,
      imageUrls: [FALLBACK_IMAGE],
      priceCents: fallbackPriceCents,
      originCep: DEFAULT_ORIGIN_CEP,
    };
  }

  const { data, error } = await supabase
    .from('auctions')
    .select('id, title, image_urls, current_price_cents, origin_cep, listing_category')
    .eq('id', auctionId)
    .maybeSingle();

  if (error || !data) {
    return {
      id: auctionId,
      title: `Leilão #${auctionId.slice(0, 8)}`,
      imageUrl: FALLBACK_IMAGE,
      imageUrls: [FALLBACK_IMAGE],
      priceCents: fallbackPriceCents,
      originCep: DEFAULT_ORIGIN_CEP,
    };
  }

  const images = (data.image_urls as string[] | null) ?? [];
  const capa = images[0] ?? FALLBACK_IMAGE;
  const priceFromDb = Number(data.current_price_cents) || 0;

  return {
    id: data.id,
    title: data.title ?? 'Leilão',
    imageUrl: capa,
    imageUrls: normalizeGallery(capa, images),
    priceCents: fallbackPriceCents > 0 ? fallbackPriceCents : priceFromDb,
    originCep: (data.origin_cep as string | null)?.replace(/\D/g, '') || DEFAULT_ORIGIN_CEP,
    category: data.listing_category as string | null,
  };
}
