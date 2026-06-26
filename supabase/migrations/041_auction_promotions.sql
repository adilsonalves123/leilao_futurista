-- Planos de impulsionamento (Destaque lista + Destaque Plus Home)
ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS featured_plus_until TIMESTAMPTZ;

COMMENT ON COLUMN public.auctions.is_featured IS
  'Destaque na seção "Em destaque" da aba Leilões.';
COMMENT ON COLUMN public.auctions.featured_until IS
  'Validade do destaque na lista; NULL = sem expiração programada.';
COMMENT ON COLUMN public.auctions.featured_plus_until IS
  'Validade do Destaque Plus na Home; NULL = vigente enquanto is_featured_plus.';

CREATE INDEX IF NOT EXISTS auctions_featured_list_idx
  ON public.auctions (ends_at ASC)
  WHERE is_featured = true AND status = 'live';

-- Catálogo de planos (preços editáveis)
CREATE TABLE IF NOT EXISTS public.promotion_plans (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_cents BIGINT NOT NULL CHECK (price_cents >= 0),
  duration_mode TEXT NOT NULL CHECK (duration_mode IN ('until_auction_end', 'fixed_days')),
  duration_days INT CHECK (duration_days IS NULL OR duration_days > 0),
  max_live_slots INT CHECK (max_live_slots IS NULL OR max_live_slots > 0),
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.promotion_plans (slug, name, description, price_cents, duration_mode, duration_days, max_live_slots, sort_order)
VALUES
  (
    'featured',
    'Destaque',
    'Aparece na seção "Em destaque" na aba Leilões.',
    2900,
    'until_auction_end',
    NULL,
    NULL,
    1
  ),
  (
    'featured_plus',
    'Destaque Plus',
    'Hero na Home com cronômetro e lance ao vivo.',
    9900,
    'until_auction_end',
    NULL,
    5,
    2
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_cents = EXCLUDED.price_cents,
  duration_mode = EXCLUDED.duration_mode,
  max_live_slots = EXCLUDED.max_live_slots,
  sort_order = EXCLUDED.sort_order;

-- Histórico de compras de impulsionamento
CREATE TABLE IF NOT EXISTS public.auction_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_slug TEXT NOT NULL REFERENCES public.promotion_plans(slug),
  price_paid_cents BIGINT NOT NULL CHECK (price_paid_cents >= 0),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'expired', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS auction_promotions_auction_id_idx
  ON public.auction_promotions (auction_id);

CREATE INDEX IF NOT EXISTS auction_promotions_seller_id_idx
  ON public.auction_promotions (seller_id);

ALTER TABLE public.promotion_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active promotion plans" ON public.promotion_plans;
CREATE POLICY "Public read active promotion plans"
  ON public.promotion_plans FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Seller read own auction promotions" ON public.auction_promotions;
CREATE POLICY "Seller read own auction promotions"
  ON public.auction_promotions FOR SELECT
  USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Seller insert own auction promotions" ON public.auction_promotions;
CREATE POLICY "Seller insert own auction promotions"
  ON public.auction_promotions FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

/** Conta leilões Plus ativos (live + flag + dentro da validade). */
CREATE OR REPLACE FUNCTION public.count_featured_plus_live()
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INT
  FROM public.auctions a
  WHERE a.is_featured_plus = true
    AND a.status = 'live'
    AND (a.featured_plus_until IS NULL OR a.featured_plus_until > now());
$$;

GRANT EXECUTE ON FUNCTION public.count_featured_plus_live() TO anon, authenticated;
