export type PromotionEarningsByPlan = {
  planSlug: string;
  planName: string;
  quantidade: number;
  receitaCents: number;
};

export type PromotionEarningsSummary = {
  periodoDias: number;
  totalHojeCents: number;
  totalMesCents: number;
  totalPeriodoCents: number;
  totalConfirmadoPeriodoCents: number;
  totalPendenteCents: number;
  vendasPeriodo: number;
  porPlano: PromotionEarningsByPlan[];
  plusAtivos: number;
  fonte: 'supabase' | 'mock';
  atualizadoEm: string;
};

export type PromotionSaleRow = {
  id: string;
  purchasedAt: string;
  planSlug: string;
  planName: string;
  pricePaidCents: number;
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  auctionId: string;
  auctionTitle: string;
  sellerEmail: string;
};

export type AdminPromotionPlanRow = {
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  maxLiveSlots: number | null;
  active: boolean;
};
