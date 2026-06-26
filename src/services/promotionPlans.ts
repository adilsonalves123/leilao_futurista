import { DEFAULT_PROMOTION_PLANS } from '@/src/constants/promotionPlans';
import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase } from '@/src/lib/supabase';
import type { PromotionPlan, PromotionPlanSlug } from '@/src/types/promotions';

type PlanRow = {
  slug: string;
  name: string;
  description: string;
  price_cents: number;
  duration_mode: string;
  duration_days: number | null;
  max_live_slots: number | null;
  sort_order: number;
};

function rowToPlan(row: PlanRow): PromotionPlan | null {
  if (row.slug !== 'featured' && row.slug !== 'featured_plus') return null;
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    durationMode: row.duration_mode === 'fixed_days' ? 'fixed_days' : 'until_auction_end',
    durationDays: row.duration_days,
    maxLiveSlots: row.max_live_slots,
    sortOrder: row.sort_order,
  };
}

/** Planos ativos para exibir no cadastro de leilão. */
export async function fetchPromotionPlans(): Promise<PromotionPlan[]> {
  if (isMockMode()) {
    return [...DEFAULT_PROMOTION_PLANS];
  }

  const supabase = getSupabase();
  if (!supabase) {
    return [...DEFAULT_PROMOTION_PLANS];
  }

  const { data, error } = await supabase
    .from('promotion_plans')
    .select(
      'slug, name, description, price_cents, duration_mode, duration_days, max_live_slots, sort_order',
    )
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error || !data?.length) {
    console.warn('[PromotionPlans] fetch error, using defaults', error?.message);
    return [...DEFAULT_PROMOTION_PLANS];
  }

  const plans = data
    .map((row) => rowToPlan(row as PlanRow))
    .filter((p): p is PromotionPlan => p != null);

  return plans.length > 0 ? plans : [...DEFAULT_PROMOTION_PLANS];
}

export function getPromotionPlan(
  plans: PromotionPlan[],
  slug: PromotionPlanSlug,
): PromotionPlan | undefined {
  return plans.find((p) => p.slug === slug);
}

/** Vagas restantes na Home para Destaque Plus. */
export async function fetchFeaturedPlusSlotsRemaining(
  plans: PromotionPlan[],
): Promise<{ maxSlots: number; used: number; remaining: number }> {
  const plusPlan = getPromotionPlan(plans, 'featured_plus');
  const maxSlots = plusPlan?.maxLiveSlots ?? 5;

  if (isMockMode()) {
    return { maxSlots, used: 0, remaining: maxSlots };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { maxSlots, used: 0, remaining: maxSlots };
  }

  const { data, error } = await supabase.rpc('count_featured_plus_live');

  if (error) {
    console.warn('[PromotionPlans] count_featured_plus_live', error.message);
    return { maxSlots, used: 0, remaining: maxSlots };
  }

  const used = typeof data === 'number' ? data : 0;
  return { maxSlots, used, remaining: Math.max(0, maxSlots - used) };
}
