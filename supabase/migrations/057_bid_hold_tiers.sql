-- Caução de lance por faixa de valor + regra fixa para veículos/imóveis + retenção no incremento

DROP FUNCTION IF EXISTS public.calcular_retencao_lance_cents(BIGINT);

CREATE OR REPLACE FUNCTION public.calcular_retencao_lance_cents(
  p_bid_cents BIGINT,
  p_listing_category TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_category TEXT := lower(trim(COALESCE(p_listing_category, '')));
  v_base BIGINT;
BEGIN
  IF p_bid_cents IS NULL OR p_bid_cents <= 0 THEN
    RETURN 0;
  END IF;

  -- Veículos e imóveis: caução fixa de entrada (não escala com o lance)
  IF v_category IN ('veiculos', 'imoveis') THEN
    RETURN 200000;
  END IF;

  IF p_bid_cents <= 200000 THEN
    v_base := GREATEST(ROUND(p_bid_cents * 0.20), 5000);
  ELSIF p_bid_cents <= 2000000 THEN
    v_base := ROUND(p_bid_cents * 0.10);
  ELSIF p_bid_cents <= 10000000 THEN
    v_base := LEAST(ROUND(p_bid_cents * 0.03), 300000);
  ELSE
    v_base := LEAST(ROUND(p_bid_cents * 0.02), 500000);
  END IF;

  RETURN GREATEST(v_base, 5000);
END;
$$;

CREATE OR REPLACE FUNCTION public.descricao_retencao_lance(
  p_listing_category TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_category TEXT := lower(trim(COALESCE(p_listing_category, '')));
BEGIN
  IF v_category IN ('veiculos', 'imoveis') THEN
    RETURN 'caução fixa R$ 2.000';
  END IF;
  RETURN 'caução por faixa (20% → 10% → 3% → 2%, com teto)';
END;
$$;

CREATE OR REPLACE FUNCTION public.preview_retencao_lance(
  p_bid_cents BIGINT,
  p_auction_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category TEXT;
  v_hold BIGINT;
BEGIN
  IF p_auction_id IS NOT NULL THEN
    SELECT listing_category INTO v_category
    FROM public.auctions
    WHERE id = p_auction_id;
  END IF;

  v_hold := public.calcular_retencao_lance_cents(p_bid_cents, v_category);

  RETURN jsonb_build_object(
    'hold_cents', v_hold,
    'listing_category', v_category,
    'hold_description', public.descricao_retencao_lance(v_category)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_lance(
  p_auction_id UUID,
  p_amount_cents BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_auction public.auctions%ROWTYPE;
  v_prev_bid public.bids%ROWTYPE;
  v_prev_hold public.bid_holds%ROWTYPE;
  v_self_hold public.bid_holds%ROWTYPE;
  v_new_hold BIGINT;
  v_delta BIGINT;
  v_available BIGINT;
  v_min_bid BIGINT;
  v_bid_id UUID;
  v_category TEXT;
  v_increment BIGINT;
  v_is_fixed_category BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Faça login para dar lance.';
  END IF;

  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Valor do lance inválido.';
  END IF;

  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leilão não encontrado.';
  END IF;

  v_category := v_auction.listing_category;
  v_is_fixed_category := lower(trim(COALESCE(v_category, ''))) IN ('veiculos', 'imoveis');

  IF v_auction.status <> 'live' THEN
    RAISE EXCEPTION 'Este leilão não está ativo para lances.';
  END IF;

  IF v_auction.seller_id = v_uid THEN
    RAISE EXCEPTION 'O vendedor não pode dar lance no próprio leilão.';
  END IF;

  IF v_auction.ends_at <= now() THEN
    RAISE EXCEPTION 'Leilão encerrado.';
  END IF;

  v_min_bid := v_auction.current_price_cents;
  IF v_min_bid < 50000 THEN
    v_min_bid := v_min_bid + 500;
  ELSIF v_min_bid < 100000 THEN
    v_min_bid := v_min_bid + 5000;
  ELSE
    v_min_bid := v_min_bid + 20000;
  END IF;

  IF p_amount_cents < v_min_bid THEN
    RAISE EXCEPTION 'Lance abaixo do mínimo permitido (% centavos).', v_min_bid;
  END IF;

  SELECT * INTO v_prev_bid
  FROM public.bids
  WHERE auction_id = p_auction_id
  ORDER BY amount_cents DESC, created_at DESC
  LIMIT 1;

  SELECT * INTO v_self_hold
  FROM public.bid_holds
  WHERE auction_id = p_auction_id
    AND bidder_id = v_uid
    AND status IN ('active', 'winning')
  FOR UPDATE;

  IF v_is_fixed_category THEN
    v_new_hold := public.calcular_retencao_lance_cents(p_amount_cents, v_category);
  ELSIF v_prev_bid.bidder_id = v_uid AND v_prev_bid.amount_cents < p_amount_cents THEN
    v_increment := p_amount_cents - v_prev_bid.amount_cents;
    v_new_hold := COALESCE(v_self_hold.hold_cents, 0)
      + public.calcular_retencao_lance_cents(v_increment, v_category);
  ELSE
    v_new_hold := public.calcular_retencao_lance_cents(p_amount_cents, v_category);
  END IF;

  IF v_self_hold.id IS NOT NULL THEN
    v_delta := v_new_hold - v_self_hold.hold_cents;
  ELSE
    v_delta := v_new_hold;
  END IF;

  v_available := public.saldo_carteira_disponivel_cents(v_uid);
  IF v_available < v_delta THEN
    RAISE EXCEPTION
      'Saldo disponível insuficiente para caução do lance. Necessário % centavos adicionais, disponível %.',
      v_delta, v_available;
  END IF;

  INSERT INTO public.bids (auction_id, bidder_id, amount_cents)
  VALUES (p_auction_id, v_uid, p_amount_cents)
  RETURNING id INTO v_bid_id;

  SELECT * INTO v_prev_hold
  FROM public.bid_holds
  WHERE auction_id = p_auction_id
    AND status IN ('active', 'winning')
    AND bidder_id <> v_uid
  FOR UPDATE;

  IF v_prev_hold.id IS NOT NULL THEN
    PERFORM public._liberar_retencao_lance(v_prev_hold.id, 'released');
  END IF;

  IF v_self_hold.id IS NOT NULL THEN
    UPDATE public.bid_holds
    SET
      bid_amount_cents = p_amount_cents,
      hold_cents = v_new_hold,
      status = 'active',
      updated_at = now()
    WHERE id = v_self_hold.id;

    IF v_delta <> 0 THEN
      PERFORM public._ajustar_buyer_bid_held_cents(v_uid, v_delta);
    END IF;
  ELSE
    INSERT INTO public.bid_holds (
      bidder_id, auction_id, bid_amount_cents, hold_cents, status
    )
    VALUES (v_uid, p_auction_id, p_amount_cents, v_new_hold, 'active');

    PERFORM public._ajustar_buyer_bid_held_cents(v_uid, v_new_hold);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'bid_id', v_bid_id,
    'hold_cents', v_new_hold,
    'hold_delta_cents', v_delta,
    'hold_description', public.descricao_retencao_lance(v_category),
    'listing_category', v_category
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.preview_carteira_checkout(p_auction_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_available BIGINT;
  v_hold BIGINT := 0;
  v_category TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Faça login para consultar o pagamento.';
  END IF;

  SELECT listing_category INTO v_category
  FROM public.auctions
  WHERE id = p_auction_id;

  v_available := public.saldo_carteira_disponivel_cents(v_uid);

  SELECT hold_cents INTO v_hold
  FROM public.bid_holds
  WHERE auction_id = p_auction_id
    AND bidder_id = v_uid
    AND status = 'winning';

  RETURN jsonb_build_object(
    'available_cents', v_available,
    'winning_hold_cents', COALESCE(v_hold, 0),
    'hold_description', public.descricao_retencao_lance(v_category),
    'listing_category', v_category
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.calcular_retencao_lance_cents(BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_retencao_lance(BIGINT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.descricao_retencao_lance(TEXT) TO authenticated;
