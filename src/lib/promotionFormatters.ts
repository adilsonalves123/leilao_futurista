import type {
  ListingPromotionSelection,
  PromotionCheckoutSummary,
  PromotionPlan,
  PromotionPlanSlug,
} from '@/src/types/promotions';

export function formatPromotionPrice(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function promotionDurationLabel(plan: PromotionPlan): string {
  if (plan.durationMode === 'until_auction_end') {
    return 'até o fim do leilão';
  }
  if (plan.durationDays != null) {
    return `${plan.durationDays} dia(s)`;
  }
  return '';
}

export function buildPromotionCheckout(
  plans: PromotionPlan[],
  selection: ListingPromotionSelection,
): PromotionCheckoutSummary {
  const lines: PromotionCheckoutSummary['lines'] = [];

  if (selection.featured) {
    const plan = plans.find((p) => p.slug === 'featured');
    if (plan) {
      lines.push({ slug: 'featured', label: plan.name, priceCents: plan.priceCents });
    }
  }
  if (selection.featuredPlus) {
    const plan = plans.find((p) => p.slug === 'featured_plus');
    if (plan) {
      lines.push({ slug: 'featured_plus', label: plan.name, priceCents: plan.priceCents });
    }
  }

  const totalCents = lines.reduce((sum, line) => sum + line.priceCents, 0);
  return { lines, totalCents };
}

export function selectedPlanSlugs(selection: ListingPromotionSelection): PromotionPlanSlug[] {
  const slugs: PromotionPlanSlug[] = [];
  if (selection.featured) slugs.push('featured');
  if (selection.featuredPlus) slugs.push('featured_plus');
  return slugs;
}
