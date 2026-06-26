-- Painel admin: resumo de ganhos, vendas e edição de planos de destaque

CREATE OR REPLACE FUNCTION public.admin_resumo_promotion_earnings(p_days INT DEFAULT 30)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hoje TIMESTAMPTZ := date_trunc('day', now());
  v_mes TIMESTAMPTZ := date_trunc('month', now());
  v_periodo TIMESTAMPTZ := now() - make_interval(days => GREATEST(p_days, 1));
BEGIN
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN json_build_object(
    'periodo_dias', GREATEST(p_days, 1),
    'total_hoje_cents',
      COALESCE((
        SELECT SUM(price_paid_cents)
        FROM public.auction_promotions
        WHERE status IN ('active', 'pending')
          AND purchased_at >= v_hoje
      ), 0),
    'total_mes_cents',
      COALESCE((
        SELECT SUM(price_paid_cents)
        FROM public.auction_promotions
        WHERE status IN ('active', 'pending')
          AND purchased_at >= v_mes
      ), 0),
    'total_periodo_cents',
      COALESCE((
        SELECT SUM(price_paid_cents)
        FROM public.auction_promotions
        WHERE status IN ('active', 'pending')
          AND purchased_at >= v_periodo
      ), 0),
    'total_confirmado_periodo_cents',
      COALESCE((
        SELECT SUM(price_paid_cents)
        FROM public.auction_promotions
        WHERE status = 'active'
          AND purchased_at >= v_periodo
      ), 0),
    'total_pendente_cents',
      COALESCE((
        SELECT SUM(price_paid_cents)
        FROM public.auction_promotions
        WHERE status = 'pending'
      ), 0),
    'vendas_periodo',
      COALESCE((
        SELECT COUNT(*)::INT
        FROM public.auction_promotions
        WHERE status IN ('active', 'pending')
          AND purchased_at >= v_periodo
      ), 0),
    'por_plano',
      COALESCE((
        SELECT json_agg(
          json_build_object(
            'plan_slug', ap.plan_slug,
            'plan_name', pp.name,
            'quantidade', COUNT(*)::INT,
            'receita_cents', COALESCE(SUM(ap.price_paid_cents), 0)::BIGINT
          )
          ORDER BY SUM(ap.price_paid_cents) DESC
        )
        FROM public.auction_promotions ap
        JOIN public.promotion_plans pp ON pp.slug = ap.plan_slug
        WHERE ap.status IN ('active', 'pending')
          AND ap.purchased_at >= v_periodo
        GROUP BY ap.plan_slug, pp.name
      ), '[]'::JSON),
    'plus_ativos', public.count_featured_plus_live()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_listar_promotion_vendas(
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  purchased_at TIMESTAMPTZ,
  plan_slug TEXT,
  plan_name TEXT,
  price_paid_cents BIGINT,
  status TEXT,
  auction_id UUID,
  auction_title TEXT,
  seller_email TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    ap.id,
    ap.purchased_at,
    ap.plan_slug,
    pp.name AS plan_name,
    ap.price_paid_cents,
    ap.status,
    ap.auction_id,
    COALESCE(a.title, '—') AS auction_title,
    COALESCE(u.email, '—') AS seller_email
  FROM public.auction_promotions ap
  JOIN public.promotion_plans pp ON pp.slug = ap.plan_slug
  LEFT JOIN public.auctions a ON a.id = ap.auction_id
  LEFT JOIN public.users u ON u.id = ap.seller_id
  ORDER BY ap.purchased_at DESC
  LIMIT GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_listar_promotion_plans()
RETURNS SETOF public.promotion_plans
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.promotion_plans
  ORDER BY sort_order ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_atualizar_promotion_plan(
  p_slug TEXT,
  p_price_cents BIGINT,
  p_max_live_slots INT DEFAULT NULL,
  p_active BOOLEAN DEFAULT NULL
)
RETURNS public.promotion_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.promotion_plans;
BEGIN
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF p_price_cents < 0 THEN
    RAISE EXCEPTION 'Preço inválido';
  END IF;

  UPDATE public.promotion_plans
  SET
    price_cents = p_price_cents,
    max_live_slots = COALESCE(p_max_live_slots, max_live_slots),
    active = COALESCE(p_active, active)
  WHERE slug = p_slug
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plano não encontrado: %', p_slug;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resumo_promotion_earnings(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_listar_promotion_vendas(INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_listar_promotion_plans() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_atualizar_promotion_plan(TEXT, BIGINT, INT, BOOLEAN) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_resumo_promotion_earnings(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_listar_promotion_vendas(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_listar_promotion_plans() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_atualizar_promotion_plan(TEXT, BIGINT, INT, BOOLEAN) TO authenticated;
