import type { AuctionSellerSnippet } from '@/src/services/auctionSellerSnippet';

/** Item normalizado para o carrossel Destaque Plus (casca visual + dados do leilão). */
export type FeaturedPlusCarouselItem = {
  id: string;
  title: string;
  subtitle: string | null;
  /** URL da foto limpa enviada pelo anunciante */
  imageUrl: string;
  currentPriceCents: number;
  /** Timestamp (ms) de encerramento do leilão */
  endsAtMs: number;
  watchersCount: number;
  participantsCount: number;
  seller?: AuctionSellerSnippet;
};

export type FeaturedPlusCarouselItemInput = {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  currentPriceCents?: number | null;
  endsAt?: string | null;
  endsAtMs?: number | null;
  watchersCount?: number | null;
  participantsCount?: number | null;
  seller?: AuctionSellerSnippet;
};
