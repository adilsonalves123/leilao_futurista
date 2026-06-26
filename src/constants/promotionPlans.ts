import type { PromotionPlan } from '@/src/types/promotions';

/** Fallback quando Supabase não está disponível. */
export const DEFAULT_PROMOTION_PLANS: PromotionPlan[] = [
  {
    slug: 'featured',
    name: 'Destaque',
    description: 'Aparece na seção "Em destaque" na aba Leilões.',
    priceCents: 2900,
    durationMode: 'until_auction_end',
    durationDays: null,
    maxLiveSlots: null,
    sortOrder: 1,
  },
  {
    slug: 'featured_plus',
    name: 'Destaque Plus',
    description: 'Hero na Home com cronômetro e lance ao vivo.',
    priceCents: 9900,
    durationMode: 'until_auction_end',
    durationDays: null,
    maxLiveSlots: 5,
    sortOrder: 2,
  },
];
