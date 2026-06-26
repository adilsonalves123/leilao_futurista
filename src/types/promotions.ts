export type PromotionPlanSlug = 'featured' | 'featured_plus';

export type PromotionDurationMode = 'until_auction_end' | 'fixed_days';

export type PromotionPlan = {
  slug: PromotionPlanSlug;
  name: string;
  description: string;
  priceCents: number;
  durationMode: PromotionDurationMode;
  durationDays: number | null;
  maxLiveSlots: number | null;
  sortOrder: number;
};

export type ListingPromotionSelection = {
  featured: boolean;
  featuredPlus: boolean;
};

export type PromotionCheckoutLine = {
  slug: PromotionPlanSlug;
  label: string;
  priceCents: number;
};

export type PromotionCheckoutSummary = {
  lines: PromotionCheckoutLine[];
  totalCents: number;
};
