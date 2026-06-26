import { DEFAULT_PROMOTION_PLANS } from '@/src/constants/promotionPlans';
import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase } from '@/src/lib/supabase';
import type {
  AdminPromotionPlanRow,
  PromotionEarningsSummary,
  PromotionSaleRow,
} from '@/src/types/adminPromotions';

const MOCK_SUMMARY: Omit<PromotionEarningsSummary, 'atualizadoEm' | 'fonte'> = {
  periodoDias: 30,
  totalHojeCents: 12_800,
  totalMesCents: 156_700,
  totalPeriodoCents: 156_700,
  totalConfirmadoPeriodoCents: 142_500,
  totalPendenteCents: 14_200,
  vendasPeriodo: 18,
  plusAtivos: 2,
  porPlano: [
    { planSlug: 'featured_plus', planName: 'Destaque Plus', quantidade: 9, receitaCents: 89_100 },
    { planSlug: 'featured', planName: 'Destaque', quantidade: 9, receitaCents: 67_600 },
  ],
};

const MOCK_VENDAS: PromotionSaleRow[] = [
  {
    id: 'mock-p1',
    purchasedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    planSlug: 'featured_plus',
    planName: 'Destaque Plus',
    pricePaidCents: 9900,
    status: 'active',
    auctionId: '1',
    auctionTitle: 'iPhone 16 Pro Max',
    sellerEmail: 'vendedor@exemplo.com',
  },
  {
    id: 'mock-p2',
    purchasedAt: new Date(Date.now() - 26 * 3600_000).toISOString(),
    planSlug: 'featured',
    planName: 'Destaque',
    pricePaidCents: 2900,
    status: 'active',
    auctionId: '2',
    auctionTitle: 'MacBook Pro M3 Max',
    sellerEmail: 'tech@exemplo.com',
  },
  {
    id: 'mock-p3',
    purchasedAt: new Date(Date.now() - 3 * 86400_000).toISOString(),
    planSlug: 'featured_plus',
    planName: 'Destaque Plus',
    pricePaidCents: 9900,
    status: 'pending',
    auctionId: '4',
    auctionTitle: 'Rolex Submariner',
    sellerEmail: 'luxo@exemplo.com',
  },
];

type ResumoJson = {
  periodo_dias: number;
  total_hoje_cents: number;
  total_mes_cents: number;
  total_periodo_cents: number;
  total_confirmado_periodo_cents: number;
  total_pendente_cents: number;
  vendas_periodo: number;
  por_plano: { plan_slug: string; plan_name: string; quantidade: number; receita_cents: number }[] | null;
  plus_ativos: number;
};

function mapResumo(data: ResumoJson): PromotionEarningsSummary {
  return {
    periodoDias: data.periodo_dias,
    totalHojeCents: data.total_hoje_cents,
    totalMesCents: data.total_mes_cents,
    totalPeriodoCents: data.total_periodo_cents,
    totalConfirmadoPeriodoCents: data.total_confirmado_periodo_cents,
    totalPendenteCents: data.total_pendente_cents,
    vendasPeriodo: data.vendas_periodo,
    plusAtivos: data.plus_ativos,
    porPlano: (data.por_plano ?? []).map((p) => ({
      planSlug: p.plan_slug,
      planName: p.plan_name,
      quantidade: p.quantidade,
      receitaCents: p.receita_cents,
    })),
    fonte: 'supabase',
    atualizadoEm: new Date().toISOString(),
  };
}

export async function obterResumoGanhosDestaques(
  periodoDias = 30,
): Promise<PromotionEarningsSummary> {
  if (isMockMode()) {
    return {
      ...MOCK_SUMMARY,
      periodoDias,
      fonte: 'mock',
      atualizadoEm: new Date().toISOString(),
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return {
      ...MOCK_SUMMARY,
      periodoDias,
      fonte: 'mock',
      atualizadoEm: new Date().toISOString(),
    };
  }

  const { data, error } = await supabase.rpc('admin_resumo_promotion_earnings', {
    p_days: periodoDias,
  });

  if (error || !data) {
    console.warn('[AdminPromotions] resumo', error?.message);
    return {
      ...MOCK_SUMMARY,
      periodoDias,
      fonte: 'mock',
      atualizadoEm: new Date().toISOString(),
    };
  }

  return mapResumo(data as ResumoJson);
}

export async function listarVendasDestaques(limit = 50): Promise<PromotionSaleRow[]> {
  if (isMockMode()) {
    return [...MOCK_VENDAS];
  }

  const supabase = getSupabase();
  if (!supabase) return [...MOCK_VENDAS];

  const { data, error } = await supabase.rpc('admin_listar_promotion_vendas', {
    p_limit: limit,
    p_offset: 0,
  });

  if (error || !data) {
    console.warn('[AdminPromotions] vendas', error?.message);
    return [...MOCK_VENDAS];
  }

  return (data as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    purchasedAt: String(row.purchased_at),
    planSlug: String(row.plan_slug),
    planName: String(row.plan_name),
    pricePaidCents: Number(row.price_paid_cents),
    status: row.status as PromotionSaleRow['status'],
    auctionId: String(row.auction_id),
    auctionTitle: String(row.auction_title),
    sellerEmail: String(row.seller_email),
  }));
}

export async function listarPlanosDestaqueAdmin(): Promise<AdminPromotionPlanRow[]> {
  if (isMockMode()) {
    return DEFAULT_PROMOTION_PLANS.map((p) => ({
      slug: p.slug,
      name: p.name,
      description: p.description,
      priceCents: p.priceCents,
      maxLiveSlots: p.maxLiveSlots,
      active: true,
    }));
  }

  const supabase = getSupabase();
  if (!supabase) {
    return DEFAULT_PROMOTION_PLANS.map((p) => ({
      slug: p.slug,
      name: p.name,
      description: p.description,
      priceCents: p.priceCents,
      maxLiveSlots: p.maxLiveSlots,
      active: true,
    }));
  }

  const { data, error } = await supabase.rpc('admin_listar_promotion_plans');

  if (error || !data) {
    console.warn('[AdminPromotions] planos', error?.message);
    return [];
  }

  return (data as Record<string, unknown>[]).map((row) => ({
    slug: String(row.slug),
    name: String(row.name),
    description: String(row.description),
    priceCents: Number(row.price_cents),
    maxLiveSlots: row.max_live_slots != null ? Number(row.max_live_slots) : null,
    active: Boolean(row.active),
  }));
}

export async function atualizarPlanoDestaque(input: {
  slug: string;
  priceCents: number;
  maxLiveSlots?: number | null;
  active?: boolean;
}): Promise<{ ok: boolean; erro?: string }> {
  if (isMockMode()) {
    return { ok: true };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, erro: 'Supabase não configurado.' };
  }

  const { error } = await supabase.rpc('admin_atualizar_promotion_plan', {
    p_slug: input.slug,
    p_price_cents: input.priceCents,
    p_max_live_slots: input.maxLiveSlots ?? null,
    p_active: input.active ?? null,
  });

  if (error) {
    return { ok: false, erro: error.message };
  }

  return { ok: true };
}
