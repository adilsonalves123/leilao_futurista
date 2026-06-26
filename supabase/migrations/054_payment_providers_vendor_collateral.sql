-- Provedores de pagamento (roteamento multi-PSP) + garantia percentual do vendedor

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_provider_slug') THEN
    CREATE TYPE public.payment_provider_slug AS ENUM ('asaas', 'mercado_pago', 'luckcode');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendor_collateral_hold_status') THEN
    CREATE TYPE public.vendor_collateral_hold_status AS ENUM (
      'active',
      'released',
      'forfeited',
      'cancelled'
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Provedores de pagamento
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payment_providers (
  slug public.payment_provider_slug PRIMARY KEY,
  display_name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT false,
  supports_pix BOOLEAN NOT NULL DEFAULT false,
  supports_cartao BOOLEAN NOT NULL DEFAULT false,
  supports_boleto BOOLEAN NOT NULL DEFAULT false,
  priority INT NOT NULL DEFAULT 100,
  min_amount_cents BIGINT NOT NULL DEFAULT 0 CHECK (min_amount_cents >= 0),
  max_amount_cents BIGINT CHECK (max_amount_cents IS NULL OR max_amount_cents >= 0),
  fee_pix_bps INT NOT NULL DEFAULT 0 CHECK (fee_pix_bps >= 0),
  fee_cartao_bps INT NOT NULL DEFAULT 0 CHECK (fee_cartao_bps >= 0),
  is_default BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.payment_providers (
  slug, display_name, active, supports_pix, supports_cartao, supports_boleto,
  priority, min_amount_cents, max_amount_cents, fee_pix_bps, fee_cartao_bps, is_default, notes
)
VALUES
  (
    'asaas', 'Asaas', true, true, true, true,
    10, 0, NULL, 99, 399, true,
    'PSP principal — Pix e cartão no checkout.'
  ),
  (
    'mercado_pago', 'Mercado Pago', false, true, true, false,
    20, 0, NULL, 99, 449, false,
    'Fallback opcional — ative quando a conta estiver pronta.'
  ),
  (
    'luckcode', 'LuckCode (demo)', true, true, true, true,
    99, 0, NULL, 0, 0, false,
    'Simulador local / desenvolvimento sem PSP real.'
  )
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  supports_pix = EXCLUDED.supports_pix,
  supports_cartao = EXCLUDED.supports_cartao,
  supports_boleto = EXCLUDED.supports_boleto,
  priority = EXCLUDED.priority,
  fee_pix_bps = EXCLUDED.fee_pix_bps,
  fee_cartao_bps = EXCLUDED.fee_cartao_bps,
  notes = EXCLUDED.notes,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Carteira: garantia retida do vendedor
-- ---------------------------------------------------------------------------

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS vendor_collateral_held_cents BIGINT NOT NULL DEFAULT 0
    CHECK (vendor_collateral_held_cents >= 0);

CREATE TABLE IF NOT EXISTS public.vendor_collateral_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  item_value_cents BIGINT NOT NULL CHECK (item_value_cents > 0),
  hold_cents BIGINT NOT NULL CHECK (hold_cents > 0),
  released_cents BIGINT NOT NULL DEFAULT 0 CHECK (released_cents >= 0),
  status public.vendor_collateral_hold_status NOT NULL DEFAULT 'active',
  release_after TIMESTAMPTZ,
  release_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT vendor_collateral_holds_released_lte_hold
    CHECK (released_cents <= hold_cents)
);

CREATE UNIQUE INDEX IF NOT EXISTS vendor_collateral_holds_auction_active_uidx
  ON public.vendor_collateral_holds (auction_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS vendor_collateral_holds_vendor_status_idx
  ON public.vendor_collateral_holds (vendor_id, status, release_after);

-- ---------------------------------------------------------------------------
-- Pedidos: metadados de PSP e taxas
-- ---------------------------------------------------------------------------

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_provider public.payment_provider_slug,
  ADD COLUMN IF NOT EXISTS external_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS gateway_fee_cents BIGINT NOT NULL DEFAULT 0
    CHECK (gateway_fee_cents >= 0),
  ADD COLUMN IF NOT EXISTS fee_reserve_cents BIGINT NOT NULL DEFAULT 0
    CHECK (fee_reserve_cents >= 0);

-- ---------------------------------------------------------------------------
-- Funções — garantia do vendedor
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.contar_vendas_concluidas_vendedor(p_vendor_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INT
  FROM public.orders o
  WHERE o.vendor_id = p_vendor_id
    AND o.status = 'finalizado';
$$;

CREATE OR REPLACE FUNCTION public.calcular_garantia_vendedor_cents(
  p_item_cents BIGINT,
  p_vendor_id UUID DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base BIGINT;
  v_rate NUMERIC;
  v_sales INT := 0;
  v_multiplier NUMERIC := 1;
BEGIN
  IF p_item_cents IS NULL OR p_item_cents <= 0 THEN
    RAISE EXCEPTION 'Valor do item inválido para cálculo de garantia.';
  END IF;

  IF p_item_cents <= 50000 THEN
    v_rate := 0.05;
    v_base := GREATEST(ROUND(p_item_cents * v_rate), 5000);
  ELSIF p_item_cents <= 500000 THEN
    v_rate := 0.03;
    v_base := ROUND(p_item_cents * v_rate);
  ELSIF p_item_cents <= 2000000 THEN
    v_rate := 0.025;
    v_base := ROUND(p_item_cents * v_rate);
  ELSE
    v_rate := 0.02;
    v_base := LEAST(ROUND(p_item_cents * v_rate), 500000);
  END IF;

  IF p_vendor_id IS NOT NULL THEN
    v_sales := public.contar_vendas_concluidas_vendedor(p_vendor_id);
    IF v_sales < 3 THEN
      v_multiplier := 1.5;
    END IF;
  END IF;

  RETURN GREATEST(ROUND(v_base * v_multiplier), 5000);
END;
$$;

CREATE OR REPLACE FUNCTION public.saldo_carteira_disponivel_cents(p_user_id UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(
    COALESCE(u.escrow_balance_cents, 0) - COALESCE(u.vendor_collateral_held_cents, 0),
    0
  )
  FROM public.users u
  WHERE u.id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.reter_garantia_vendedor(
  p_vendor_id UUID,
  p_auction_id UUID,
  p_item_cents BIGINT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold BIGINT;
  v_available BIGINT;
BEGIN
  v_hold := public.calcular_garantia_vendedor_cents(p_item_cents, p_vendor_id);

  v_available := public.saldo_carteira_disponivel_cents(p_vendor_id);
  IF v_available < v_hold THEN
    RAISE EXCEPTION
      'Saldo disponível insuficiente para garantia de vendedor. Necessário % centavos, disponível %.',
      v_hold, v_available;
  END IF;

  INSERT INTO public.vendor_collateral_holds (
    vendor_id,
    auction_id,
    item_value_cents,
    hold_cents,
    status
  )
  VALUES (
    p_vendor_id,
    p_auction_id,
    p_item_cents,
    v_hold,
    'active'
  );

  UPDATE public.users
  SET vendor_collateral_held_cents = vendor_collateral_held_cents + v_hold
  WHERE id = p_vendor_id;

  RETURN v_hold;
END;
$$;

CREATE OR REPLACE FUNCTION public.liberar_garantia_hold(
  p_hold_id UUID,
  p_reason TEXT DEFAULT 'liberacao_automatica'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold public.vendor_collateral_holds%ROWTYPE;
  v_remaining BIGINT;
BEGIN
  SELECT * INTO v_hold
  FROM public.vendor_collateral_holds
  WHERE id = p_hold_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Retenção de garantia não encontrada.';
  END IF;

  IF v_hold.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'hold_not_active');
  END IF;

  v_remaining := v_hold.hold_cents - v_hold.released_cents;
  IF v_remaining <= 0 THEN
    UPDATE public.vendor_collateral_holds
    SET status = 'released', release_reason = p_reason, updated_at = now()
    WHERE id = p_hold_id;
    RETURN jsonb_build_object('ok', true, 'released_cents', 0);
  END IF;

  UPDATE public.users
  SET vendor_collateral_held_cents = GREATEST(vendor_collateral_held_cents - v_remaining, 0)
  WHERE id = v_hold.vendor_id;

  UPDATE public.vendor_collateral_holds
  SET
    released_cents = hold_cents,
    status = 'released',
    release_reason = p_reason,
    updated_at = now()
  WHERE id = p_hold_id;

  RETURN jsonb_build_object('ok', true, 'released_cents', v_remaining);
END;
$$;

CREATE OR REPLACE FUNCTION public.liberar_garantia_leilao(
  p_auction_id UUID,
  p_reason TEXT DEFAULT 'leilao_sem_venda'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold_id UUID;
BEGIN
  SELECT id INTO v_hold_id
  FROM public.vendor_collateral_holds
  WHERE auction_id = p_auction_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_hold_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_active_hold');
  END IF;

  RETURN public.liberar_garantia_hold(v_hold_id, p_reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.agendar_liberacao_garantia_pedido(
  p_order_id UUID,
  p_days INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado.';
  END IF;

  UPDATE public.vendor_collateral_holds
  SET
    order_id = p_order_id,
    release_after = now() + make_interval(days => GREATEST(p_days, 1)),
    updated_at = now()
  WHERE auction_id = v_order.auction_id
    AND vendor_id = v_order.vendor_id
    AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_active_hold');
  END IF;

  RETURN jsonb_build_object('ok', true, 'order_id', p_order_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.liberar_garantias_vencidas()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold RECORD;
  v_count INT := 0;
BEGIN
  FOR v_hold IN
    SELECT id
    FROM public.vendor_collateral_holds
    WHERE status = 'active'
      AND release_after IS NOT NULL
      AND release_after <= now()
  LOOP
    PERFORM public.liberar_garantia_hold(v_hold.id, 'prazo_pos_entrega');
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.debitar_garantia_disputa(
  p_order_id UUID,
  p_amount_cents BIGINT,
  p_reason TEXT DEFAULT 'disputa'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_hold public.vendor_collateral_holds%ROWTYPE;
  v_debit BIGINT;
  v_from_hold BIGINT;
  v_from_balance BIGINT;
BEGIN
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Valor de débito inválido.';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado.';
  END IF;

  SELECT * INTO v_hold
  FROM public.vendor_collateral_holds
  WHERE auction_id = v_order.auction_id
    AND vendor_id = v_order.vendor_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  v_debit := p_amount_cents;

  IF FOUND THEN
    v_from_hold := LEAST(
      v_debit,
      GREATEST(v_hold.hold_cents - v_hold.released_cents, 0)
    );

    IF v_from_hold > 0 THEN
      UPDATE public.users
      SET
        vendor_collateral_held_cents = GREATEST(vendor_collateral_held_cents - v_from_hold, 0),
        escrow_balance_cents = GREATEST(escrow_balance_cents - v_from_hold, 0)
      WHERE id = v_order.vendor_id;

      UPDATE public.vendor_collateral_holds
      SET
        released_cents = released_cents + v_from_hold,
        status = CASE
          WHEN released_cents + v_from_hold >= hold_cents THEN 'forfeited'
          ELSE status
        END,
        release_reason = p_reason,
        updated_at = now()
      WHERE id = v_hold.id;
    END IF;

    v_debit := v_debit - COALESCE(v_from_hold, 0);
  END IF;

  IF v_debit > 0 THEN
    UPDATE public.users
    SET escrow_balance_cents = GREATEST(escrow_balance_cents - v_debit, 0)
    WHERE id = v_order.vendor_id;
    v_from_balance := v_debit;
  ELSE
    v_from_balance := 0;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'debited_from_hold_cents', COALESCE(v_from_hold, 0),
    'debited_from_balance_cents', v_from_balance
  );
END;
$$;

-- Prévia de garantia (app / painel vendedor)
CREATE OR REPLACE FUNCTION public.preview_garantia_vendedor(p_item_cents BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_hold BIGINT;
  v_available BIGINT;
  v_sales INT := 0;
  v_is_new BOOLEAN := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Faça login para consultar a garantia.';
  END IF;

  v_hold := public.calcular_garantia_vendedor_cents(p_item_cents, v_uid);
  v_available := public.saldo_carteira_disponivel_cents(v_uid);
  v_sales := public.contar_vendas_concluidas_vendedor(v_uid);
  v_is_new := v_sales < 3;

  RETURN jsonb_build_object(
    'hold_cents', v_hold,
    'available_balance_cents', v_available,
    'completed_sales', v_sales,
    'new_vendor_multiplier', CASE WHEN v_is_new THEN 1.5 ELSE 1 END,
    'sufficient', v_available >= v_hold
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Funções — roteamento de pagamento
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.escolher_provedor_pagamento(
  p_method public.invoice_payment_method,
  p_total_cents BIGINT
)
RETURNS public.payment_provider_slug
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug public.payment_provider_slug;
BEGIN
  IF p_total_cents IS NULL OR p_total_cents <= 0 THEN
    RAISE EXCEPTION 'Valor total inválido para roteamento de pagamento.';
  END IF;

  IF p_method = 'cripto' THEN
    RETURN 'luckcode';
  END IF;

  SELECT pp.slug INTO v_slug
  FROM public.payment_providers pp
  WHERE pp.active
    AND p_total_cents >= pp.min_amount_cents
    AND (pp.max_amount_cents IS NULL OR p_total_cents <= pp.max_amount_cents)
    AND (
      (p_method = 'pix' AND pp.supports_pix)
      OR (p_method = 'cartao' AND pp.supports_cartao)
      OR (p_method = 'boleto' AND pp.supports_boleto)
    )
    AND NOT (p_method = 'cartao' AND p_total_cents > 500000 AND pp.slug = 'asaas' AND EXISTS (
      SELECT 1 FROM public.payment_providers mp
      WHERE mp.slug = 'mercado_pago' AND mp.active AND mp.supports_cartao
    ))
  ORDER BY
    CASE
      WHEN p_method = 'cartao' AND p_total_cents > 500000 AND pp.slug = 'mercado_pago' THEN 0
      ELSE pp.priority
    END,
    pp.priority
  LIMIT 1;

  IF v_slug IS NULL THEN
    SELECT slug INTO v_slug
    FROM public.payment_providers
    WHERE slug = 'luckcode' AND active
    LIMIT 1;
  END IF;

  IF v_slug IS NULL THEN
    SELECT slug INTO v_slug
    FROM public.payment_providers
    WHERE is_default AND active
    ORDER BY priority
    LIMIT 1;
  END IF;

  RETURN COALESCE(v_slug, 'luckcode');
END;
$$;

CREATE OR REPLACE FUNCTION public.estimar_taxa_gateway_cents(
  p_provider public.payment_provider_slug,
  p_method public.invoice_payment_method,
  p_total_cents BIGINT
)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bps INT;
BEGIN
  SELECT CASE
    WHEN p_method = 'pix' THEN pp.fee_pix_bps
    WHEN p_method = 'cartao' THEN pp.fee_cartao_bps
    ELSE pp.fee_cartao_bps
  END
  INTO v_bps
  FROM public.payment_providers pp
  WHERE pp.slug = p_provider;

  RETURN COALESCE(ROUND(p_total_cents * COALESCE(v_bps, 0) / 10000.0), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.resolver_rota_pagamento(
  p_method TEXT,
  p_total_cents BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_method public.invoice_payment_method;
  v_provider public.payment_provider_slug;
  v_fee BIGINT;
  v_display TEXT;
BEGIN
  v_method := CASE lower(trim(p_method))
    WHEN 'pix' THEN 'pix'::public.invoice_payment_method
    WHEN 'cartao' THEN 'cartao'::public.invoice_payment_method
    WHEN 'boleto' THEN 'boleto'::public.invoice_payment_method
    WHEN 'cripto' THEN 'cripto'::public.invoice_payment_method
    ELSE NULL
  END;

  IF v_method IS NULL THEN
    RAISE EXCEPTION 'Meio de pagamento inválido: %', p_method;
  END IF;

  v_provider := public.escolher_provedor_pagamento(v_method, p_total_cents);
  v_fee := public.estimar_taxa_gateway_cents(v_provider, v_method, p_total_cents);

  SELECT display_name INTO v_display
  FROM public.payment_providers
  WHERE slug = v_provider;

  RETURN jsonb_build_object(
    'payment_method', v_method::TEXT,
    'payment_provider', v_provider::TEXT,
    'provider_display_name', COALESCE(v_display, v_provider::TEXT),
    'gateway_fee_cents', v_fee,
    'fee_reserve_cents', v_fee,
    'total_cents', p_total_cents
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Publicar leilão: cobra promoções + retém garantia percentual
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.publicar_leilao(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_auction_id UUID := gen_random_uuid();
  v_starts TIMESTAMPTZ := now();
  v_ends TIMESTAMPTZ;
  v_category TEXT;
  v_balance BIGINT;
  v_held BIGINT;
  v_available BIGINT;
  v_total BIGINT := 0;
  v_collateral BIGINT := 0;
  v_want_featured BOOLEAN;
  v_want_plus BOOLEAN;
  v_want_ai BOOLEAN;
  v_plus_slots INT;
  v_plus_live INT;
  v_starting BIGINT;
  v_estimated BIGINT;
  v_conservation TEXT;
  v_serial TEXT;
  v_cep TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Faça login para publicar um leilão.';
  END IF;

  IF NOT public.auth_kyc_aprovado() THEN
    RAISE EXCEPTION 'Cadastro completo (KYC) aprovado é obrigatório para publicar. Conclua a verificação no app.';
  END IF;

  v_category := NULLIF(trim(p_payload->>'listing_category'), '');
  v_conservation := NULLIF(trim(p_payload->>'conservation_state'), '');
  v_serial := NULLIF(trim(p_payload->>'serial_imei'), '');
  v_cep := regexp_replace(COALESCE(p_payload->>'origin_cep', ''), '\D', '', 'g');
  v_starting := COALESCE((p_payload->>'starting_price_cents')::BIGINT, 0);
  v_estimated := COALESCE((p_payload->>'estimated_market_cents')::BIGINT, 0);
  v_want_featured := COALESCE((p_payload->>'want_featured')::BOOLEAN, false);
  v_want_plus := COALESCE((p_payload->>'want_featured_plus')::BOOLEAN, false);
  v_want_ai := COALESCE((p_payload->>'want_ai_cover')::BOOLEAN, false);

  IF NULLIF(trim(p_payload->>'title'), '') IS NULL THEN
    RAISE EXCEPTION 'Título obrigatório.';
  END IF;

  IF v_conservation IS NULL THEN
    RAISE EXCEPTION 'Estado de conservação obrigatório.';
  END IF;

  IF length(v_cep) <> 8 THEN
    RAISE EXCEPTION 'CEP de origem inválido.';
  END IF;

  IF v_starting <= 0 OR v_estimated <= 0 OR v_starting >= v_estimated THEN
    RAISE EXCEPTION 'Preços inválidos.';
  END IF;

  IF v_category = 'eletronicos' AND (v_serial IS NULL OR length(v_serial) < 5) THEN
    RAISE EXCEPTION 'IMEI ou número de série obrigatório para eletrônicos.';
  END IF;

  v_ends := v_starts + public._listing_duration_interval(p_payload->>'auction_duration');

  IF v_want_plus THEN
    SELECT max_live_slots INTO v_plus_slots FROM public.promotion_plans WHERE slug = 'featured_plus' AND active;
    v_plus_live := public.count_featured_plus_live();
    IF v_plus_live >= COALESCE(v_plus_slots, 5) THEN
      RAISE EXCEPTION 'Sem vagas para Destaque Plus na Home no momento.';
    END IF;
    v_total := v_total + COALESCE(
      (SELECT price_cents FROM public.promotion_plans WHERE slug = 'featured_plus' AND active),
      0
    );
  END IF;

  IF v_want_featured THEN
    v_total := v_total + COALESCE(
      (SELECT price_cents FROM public.promotion_plans WHERE slug = 'featured' AND active),
      0
    );
  END IF;

  IF v_want_ai THEN
    v_total := v_total + COALESCE(
      (SELECT price_cents FROM public.promotion_plans WHERE slug = 'ai_cover_optimize' AND active),
      499
    );
  END IF;

  v_collateral := public.calcular_garantia_vendedor_cents(v_estimated, v_uid);

  SELECT escrow_balance_cents, vendor_collateral_held_cents
  INTO v_balance, v_held
  FROM public.users
  WHERE id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil de usuário não encontrado.';
  END IF;

  v_available := GREATEST(v_balance - v_held, 0);

  IF v_available < v_total + v_collateral THEN
    RAISE EXCEPTION
      'Saldo disponível insuficiente. Promoções: % centavos, garantia: % centavos, disponível: % centavos.',
      v_total, v_collateral, v_available;
  END IF;

  IF v_total > 0 THEN
    UPDATE public.users
    SET escrow_balance_cents = escrow_balance_cents - v_total
    WHERE id = v_uid;
  END IF;

  INSERT INTO public.auctions (
    id, seller_id, title, description, image_urls,
    starting_price_cents, current_price_cents, status,
    starts_at, ends_at, listing_category, conservation_state,
    serial_imei, serial_imei_kind, origin_cep, estimated_market_cents,
    nf_access_key, ai_cover_optimized, listing_extras, ownership_declared_at,
    is_featured, is_featured_plus, featured_until, featured_plus_until
  ) VALUES (
    v_auction_id, v_uid, trim(p_payload->>'title'),
    NULLIF(trim(p_payload->>'description'), ''),
    '{}'::text[], v_starting, v_starting, 'draft',
    v_starts, v_ends, v_category, v_conservation,
    v_serial, NULLIF(trim(p_payload->>'serial_imei_kind'), ''),
    v_cep, v_estimated,
    NULLIF(trim(p_payload->>'nf_access_key'), ''),
    v_want_ai, COALESCE(p_payload->'listing_extras', '{}'::jsonb),
    now(), v_want_featured, v_want_plus,
    CASE WHEN v_want_featured THEN v_ends ELSE NULL END,
    CASE WHEN v_want_plus THEN v_ends ELSE NULL END
  );

  PERFORM public.reter_garantia_vendedor(v_uid, v_auction_id, v_estimated);

  IF v_want_featured THEN
    INSERT INTO public.auction_promotions (auction_id, seller_id, plan_slug, price_paid_cents, expires_at, status)
    VALUES (
      v_auction_id, v_uid, 'featured',
      (SELECT price_cents FROM public.promotion_plans WHERE slug = 'featured'),
      v_ends, 'active'
    );
  END IF;

  IF v_want_plus THEN
    INSERT INTO public.auction_promotions (auction_id, seller_id, plan_slug, price_paid_cents, expires_at, status)
    VALUES (
      v_auction_id, v_uid, 'featured_plus',
      (SELECT price_cents FROM public.promotion_plans WHERE slug = 'featured_plus'),
      v_ends, 'active'
    );
  END IF;

  IF v_want_ai THEN
    INSERT INTO public.auction_promotions (auction_id, seller_id, plan_slug, price_paid_cents, expires_at, status)
    VALUES (
      v_auction_id, v_uid, 'ai_cover_optimize',
      (SELECT price_cents FROM public.promotion_plans WHERE slug = 'ai_cover_optimize'),
      v_ends, 'active'
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'auction_id', v_auction_id,
    'total_charged_cents', v_total,
    'collateral_held_cents', v_collateral,
    'new_balance_cents', v_balance - v_total,
    'new_collateral_held_cents', v_held + v_collateral,
    'available_balance_cents', v_available - v_total - v_collateral
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Pagamento: grava PSP escolhido + taxas estimadas
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.process_auction_payment(
  p_auction_id UUID,
  p_buyer_id UUID,
  p_item_cents BIGINT,
  p_shipping_cents BIGINT,
  p_commission_cents BIGINT,
  p_payment_method invoice_payment_method,
  p_gateway_transaction_id TEXT DEFAULT NULL,
  p_receipt_url TEXT DEFAULT NULL,
  p_gateway TEXT DEFAULT NULL
)
RETURNS TABLE (
  checkout_id UUID,
  order_id UUID,
  order_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checkout_id UUID;
  v_order_id UUID;
  v_order_code TEXT;
  v_vendor_id UUID;
  v_total BIGINT;
  v_now TIMESTAMPTZ := now();
  v_provider public.payment_provider_slug;
  v_fee BIGINT;
  v_gateway TEXT;
BEGIN
  v_total := p_item_cents + p_shipping_cents;
  v_provider := public.escolher_provedor_pagamento(p_payment_method, v_total);
  v_fee := public.estimar_taxa_gateway_cents(v_provider, p_payment_method, v_total);
  v_gateway := COALESCE(NULLIF(trim(p_gateway), ''), v_provider::TEXT);

  INSERT INTO public.checkouts (
    auction_id, buyer_id, subtotal_cents, commission_cents,
    shipping_cents, total_cents, escrow_status
  )
  VALUES (
    p_auction_id, p_buyer_id, p_item_cents, p_commission_cents,
    p_shipping_cents, v_total, 'held'
  )
  ON CONFLICT (auction_id) DO UPDATE SET
    buyer_id = EXCLUDED.buyer_id,
    subtotal_cents = EXCLUDED.subtotal_cents,
    commission_cents = EXCLUDED.commission_cents,
    shipping_cents = EXCLUDED.shipping_cents,
    total_cents = EXCLUDED.total_cents,
    escrow_status = 'held'
  RETURNING id INTO v_checkout_id;

  SELECT o.id, o.code INTO v_order_id, v_order_code
  FROM public.orders o
  WHERE o.checkout_id = v_checkout_id;

  IF v_order_id IS NULL THEN
    SELECT seller_id INTO v_vendor_id FROM public.auctions WHERE id = p_auction_id;
    v_order_code := public.generate_order_code();

    INSERT INTO public.orders (
      code, auction_id, buyer_id, vendor_id, checkout_id,
      item_cents, shipping_cents, commission_cents, total_cents, status
    )
    VALUES (
      v_order_code, p_auction_id, p_buyer_id, v_vendor_id, v_checkout_id,
      p_item_cents, p_shipping_cents, p_commission_cents, v_total, 'pendente_pagamento'
    )
    RETURNING id INTO v_order_id;

    INSERT INTO public.order_events (order_id, event_type, message)
    VALUES (v_order_id, 'pedido_criado', 'Pedido ' || v_order_code || ' criado após arremate.');
  END IF;

  UPDATE public.orders
  SET
    status = 'pago',
    payment_provider = v_provider,
    external_payment_id = p_gateway_transaction_id,
    gateway_fee_cents = v_fee,
    fee_reserve_cents = v_fee,
    updated_at = v_now
  WHERE id = v_order_id;

  INSERT INTO public.auction_invoices (
    order_id, payment_method, gateway_transaction_id,
    approved_at, receipt_url, gateway, amount_cents
  )
  VALUES (
    v_order_id, p_payment_method,
    COALESCE(p_gateway_transaction_id, 'TXN-' || upper(substr(md5(random()::text), 1, 8))),
    v_now, p_receipt_url, v_gateway, v_total
  )
  ON CONFLICT (order_id) DO UPDATE SET
    payment_method = EXCLUDED.payment_method,
    gateway_transaction_id = EXCLUDED.gateway_transaction_id,
    approved_at = EXCLUDED.approved_at,
    receipt_url = EXCLUDED.receipt_url,
    gateway = EXCLUDED.gateway,
    amount_cents = EXCLUDED.amount_cents;

  INSERT INTO public.order_events (order_id, event_type, message, metadata)
  VALUES (
    v_order_id,
    'pagamento_aprovado',
    'Pagamento aprovado via ' || v_gateway || ' em ' ||
      to_char(v_now AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') || '.',
    jsonb_build_object(
      'payment_provider', v_provider::TEXT,
      'gateway_fee_cents', v_fee
    )
  );

  INSERT INTO public.order_events (order_id, event_type, message)
  VALUES (
    v_order_id,
    'envio_pendente',
    'Pagamento confirmado — aguardando postagem do vendedor.'
  );

  PERFORM public.agendar_liberacao_garantia_pedido(v_order_id, 30);

  RETURN QUERY SELECT v_checkout_id, v_order_id, v_order_code;
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.payment_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_collateral_holds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read payment_providers" ON public.payment_providers;
CREATE POLICY "Public read payment_providers"
  ON public.payment_providers FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Vendor read own collateral holds" ON public.vendor_collateral_holds;
CREATE POLICY "Vendor read own collateral holds"
  ON public.vendor_collateral_holds FOR SELECT
  USING (vendor_id = auth.uid());

DROP POLICY IF EXISTS "Admin read vendor collateral holds" ON public.vendor_collateral_holds;
CREATE POLICY "Admin read vendor collateral holds"
  ON public.vendor_collateral_holds FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.contar_vendas_concluidas_vendedor(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.calcular_garantia_vendedor_cents(BIGINT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.saldo_carteira_disponivel_cents(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reter_garantia_vendedor(UUID, UUID, BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.liberar_garantia_hold(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.liberar_garantia_leilao(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.agendar_liberacao_garantia_pedido(UUID, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.liberar_garantias_vencidas() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.debitar_garantia_disputa(UUID, BIGINT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.preview_garantia_vendedor(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolver_rota_pagamento(TEXT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolver_rota_pagamento(TEXT, BIGINT) TO anon;
