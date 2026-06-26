-- Caução do comprador em lances (30% retido) + uso opcional da carteira no checkout

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bid_hold_status') THEN
    CREATE TYPE public.bid_hold_status AS ENUM (
      'active',
      'winning',
      'released',
      'forfeited',
      'applied_checkout'
    );
  END IF;
END $$;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS buyer_bid_held_cents BIGINT NOT NULL DEFAULT 0
    CHECK (buyer_bid_held_cents >= 0);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS wallet_apply_available_cents BIGINT NOT NULL DEFAULT 0
    CHECK (wallet_apply_available_cents >= 0),
  ADD COLUMN IF NOT EXISTS wallet_apply_hold_cents BIGINT NOT NULL DEFAULT 0
    CHECK (wallet_apply_hold_cents >= 0);

CREATE TABLE IF NOT EXISTS public.bid_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bidder_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  bid_amount_cents BIGINT NOT NULL CHECK (bid_amount_cents > 0),
  hold_cents BIGINT NOT NULL CHECK (hold_cents > 0),
  status public.bid_hold_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS bid_holds_active_per_auction_uidx
  ON public.bid_holds (auction_id)
  WHERE status IN ('active', 'winning');

CREATE INDEX IF NOT EXISTS bid_holds_bidder_status_idx
  ON public.bid_holds (bidder_id, status);

-- Saldo disponível = total - garantia vendedor - caução de lances
CREATE OR REPLACE FUNCTION public.saldo_carteira_disponivel_cents(p_user_id UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(
    COALESCE(u.escrow_balance_cents, 0)
      - COALESCE(u.vendor_collateral_held_cents, 0)
      - COALESCE(u.buyer_bid_held_cents, 0),
    0
  )
  FROM public.users u
  WHERE u.id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.calcular_retencao_lance_cents(p_bid_cents BIGINT)
RETURNS BIGINT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_bid_cents IS NULL OR p_bid_cents <= 0 THEN
    RETURN 0;
  END IF;
  RETURN GREATEST(ROUND(p_bid_cents * 0.30), 1000);
END;
$$;

CREATE OR REPLACE FUNCTION public._ajustar_buyer_bid_held_cents(
  p_user_id UUID,
  p_delta BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET buyer_bid_held_cents = GREATEST(COALESCE(buyer_bid_held_cents, 0) + p_delta, 0)
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public._liberar_retencao_lance(p_hold_id UUID, p_status public.bid_hold_status)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold public.bid_holds%ROWTYPE;
BEGIN
  SELECT * INTO v_hold FROM public.bid_holds WHERE id = p_hold_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_hold.status IN ('released', 'forfeited', 'applied_checkout') THEN RETURN; END IF;

  UPDATE public.bid_holds
  SET status = p_status, updated_at = now()
  WHERE id = p_hold_id;

  PERFORM public._ajustar_buyer_bid_held_cents(v_hold.bidder_id, -v_hold.hold_cents);
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

  v_new_hold := public.calcular_retencao_lance_cents(p_amount_cents);

  SELECT * INTO v_self_hold
  FROM public.bid_holds
  WHERE auction_id = p_auction_id
    AND bidder_id = v_uid
    AND status IN ('active', 'winning')
  FOR UPDATE;

  IF FOUND THEN
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
    'hold_rate', 0.30
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.finalizar_retencoes_leilao_encerrado(p_auction_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_winner_id UUID;
  v_hold RECORD;
BEGIN
  SELECT bidder_id INTO v_winner_id
  FROM public.bids
  WHERE auction_id = p_auction_id
  ORDER BY amount_cents DESC, created_at DESC
  LIMIT 1;

  FOR v_hold IN
    SELECT id, bidder_id, status
    FROM public.bid_holds
    WHERE auction_id = p_auction_id
      AND status IN ('active', 'winning')
  LOOP
    IF v_winner_id IS NOT NULL AND v_hold.bidder_id = v_winner_id THEN
      UPDATE public.bid_holds
      SET status = 'winning', updated_at = now()
      WHERE id = v_hold.id;
    ELSE
      PERFORM public._liberar_retencao_lance(v_hold.id, 'released');
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.confiscar_retencao_vencedor(p_auction_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold public.bid_holds%ROWTYPE;
BEGIN
  SELECT * INTO v_hold
  FROM public.bid_holds
  WHERE auction_id = p_auction_id
    AND status = 'winning'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_winning_hold');
  END IF;

  UPDATE public.users
  SET
    escrow_balance_cents = GREATEST(escrow_balance_cents - v_hold.hold_cents, 0),
    buyer_bid_held_cents = GREATEST(buyer_bid_held_cents - v_hold.hold_cents, 0)
  WHERE id = v_hold.bidder_id;

  UPDATE public.bid_holds
  SET status = 'forfeited', updated_at = now()
  WHERE id = v_hold.id;

  RETURN jsonb_build_object(
    'ok', true,
    'forfeited_cents', v_hold.hold_cents,
    'bidder_id', v_hold.bidder_id
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
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Faça login.';
  END IF;

  v_available := public.saldo_carteira_disponivel_cents(v_uid);

  SELECT hold_cents INTO v_hold
  FROM public.bid_holds
  WHERE auction_id = p_auction_id
    AND bidder_id = v_uid
    AND status = 'winning';

  RETURN jsonb_build_object(
    'available_cents', v_available,
    'winning_hold_cents', COALESCE(v_hold, 0),
    'hold_rate', 0.30
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.aplicar_carteira_apos_pagamento(
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_debit BIGINT;
  v_from_hold BIGINT;
  v_from_available BIGINT;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'order_not_found');
  END IF;

  v_from_available := GREATEST(COALESCE(v_order.wallet_apply_available_cents, 0), 0);
  v_from_hold := GREATEST(COALESCE(v_order.wallet_apply_hold_cents, 0), 0);
  v_debit := v_from_available + v_from_hold;

  IF v_debit > 0 THEN
    IF v_debit > COALESCE(
      (SELECT escrow_balance_cents FROM public.users WHERE id = v_order.buyer_id),
      0
    ) THEN
      RAISE EXCEPTION 'Saldo insuficiente para abatimento da carteira.';
    END IF;

    UPDATE public.users
    SET
      escrow_balance_cents = GREATEST(escrow_balance_cents - v_debit, 0),
      buyer_bid_held_cents = GREATEST(buyer_bid_held_cents - v_from_hold, 0)
    WHERE id = v_order.buyer_id;
  END IF;

  PERFORM public.liberar_retencao_vencedor_apos_pagamento(v_order.auction_id);

  RETURN jsonb_build_object(
    'ok', true,
    'applied_cents', v_debit,
    'from_available_cents', v_from_available,
    'from_hold_cents', v_from_hold
  );
END;
$$;

-- Libera caução restante do vencedor se pagou sem usar a retenção
CREATE OR REPLACE FUNCTION public.liberar_retencao_vencedor_apos_pagamento(p_auction_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold_id UUID;
BEGIN
  SELECT id INTO v_hold_id
  FROM public.bid_holds
  WHERE auction_id = p_auction_id
    AND status = 'winning'
  LIMIT 1;

  IF v_hold_id IS NOT NULL THEN
    PERFORM public._liberar_retencao_lance(v_hold_id, 'released');
  END IF;
END;
$$;

-- Atualiza iniciar_checkout para gravar abatimento opcional
CREATE OR REPLACE FUNCTION public.iniciar_checkout_pagamento(
  p_auction_id UUID,
  p_buyer_id UUID,
  p_item_cents BIGINT,
  p_shipping_cents BIGINT,
  p_commission_cents BIGINT,
  p_payment_method public.invoice_payment_method,
  p_asaas_payment_id TEXT,
  p_gateway_fee_cents BIGINT DEFAULT 0,
  p_wallet_apply_available_cents BIGINT DEFAULT 0,
  p_wallet_apply_hold_cents BIGINT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor_id UUID;
  v_total BIGINT;
  v_checkout_id UUID;
  v_order_id UUID;
  v_order_code TEXT;
  v_provider public.payment_provider_slug;
  v_available BIGINT;
  v_winning_hold BIGINT := 0;
  v_wallet_total BIGINT;
BEGIN
  IF p_asaas_payment_id IS NULL OR length(trim(p_asaas_payment_id)) = 0 THEN
    RAISE EXCEPTION 'ID de pagamento Asaas obrigatório.';
  END IF;

  v_total := p_item_cents + p_shipping_cents;
  v_wallet_total := GREATEST(COALESCE(p_wallet_apply_available_cents, 0), 0)
    + GREATEST(COALESCE(p_wallet_apply_hold_cents, 0), 0);

  IF v_wallet_total > v_total THEN
    RAISE EXCEPTION 'Abatimento da carteira não pode exceder o total do pedido.';
  END IF;

  v_available := public.saldo_carteira_disponivel_cents(p_buyer_id);

  IF COALESCE(p_wallet_apply_available_cents, 0) > v_available THEN
    RAISE EXCEPTION 'Saldo disponível insuficiente para abatimento.';
  END IF;

  SELECT hold_cents INTO v_winning_hold
  FROM public.bid_holds
  WHERE auction_id = p_auction_id
    AND bidder_id = p_buyer_id
    AND status = 'winning';

  IF COALESCE(p_wallet_apply_hold_cents, 0) > COALESCE(v_winning_hold, 0) THEN
    RAISE EXCEPTION 'Caução do lance insuficiente para abatimento.';
  END IF;

  v_provider := public.escolher_provedor_pagamento(p_payment_method, v_total);

  SELECT seller_id INTO v_vendor_id FROM public.auctions WHERE id = p_auction_id;
  IF v_vendor_id IS NULL THEN
    RAISE EXCEPTION 'Leilão não encontrado.';
  END IF;

  INSERT INTO public.checkouts (
    auction_id, buyer_id, subtotal_cents, commission_cents,
    shipping_cents, total_cents, escrow_status
  )
  VALUES (
    p_auction_id, p_buyer_id, p_item_cents, p_commission_cents,
    p_shipping_cents, v_total, 'pending'
  )
  ON CONFLICT (auction_id) DO UPDATE SET
    buyer_id = EXCLUDED.buyer_id,
    subtotal_cents = EXCLUDED.subtotal_cents,
    commission_cents = EXCLUDED.commission_cents,
    shipping_cents = EXCLUDED.shipping_cents,
    total_cents = EXCLUDED.total_cents,
    escrow_status = 'pending'
  RETURNING id INTO v_checkout_id;

  SELECT o.id, o.code INTO v_order_id, v_order_code
  FROM public.orders o WHERE o.checkout_id = v_checkout_id;

  IF v_order_id IS NULL THEN
    v_order_code := public.generate_order_code();
    INSERT INTO public.orders (
      code, auction_id, buyer_id, vendor_id, checkout_id,
      item_cents, shipping_cents, commission_cents, total_cents,
      status, payment_method, payment_provider, external_payment_id,
      gateway_fee_cents, fee_reserve_cents,
      wallet_apply_available_cents, wallet_apply_hold_cents
    )
    VALUES (
      v_order_code, p_auction_id, p_buyer_id, v_vendor_id, v_checkout_id,
      p_item_cents, p_shipping_cents, p_commission_cents, v_total,
      'pendente_pagamento', p_payment_method, v_provider, trim(p_asaas_payment_id),
      COALESCE(p_gateway_fee_cents, 0), COALESCE(p_gateway_fee_cents, 0),
      GREATEST(COALESCE(p_wallet_apply_available_cents, 0), 0),
      GREATEST(COALESCE(p_wallet_apply_hold_cents, 0), 0)
    )
    RETURNING id INTO v_order_id;
  ELSE
    UPDATE public.orders
    SET
      status = 'pendente_pagamento',
      payment_method = p_payment_method,
      payment_provider = v_provider,
      external_payment_id = trim(p_asaas_payment_id),
      gateway_fee_cents = COALESCE(p_gateway_fee_cents, 0),
      fee_reserve_cents = COALESCE(p_gateway_fee_cents, 0),
      wallet_apply_available_cents = GREATEST(COALESCE(p_wallet_apply_available_cents, 0), 0),
      wallet_apply_hold_cents = GREATEST(COALESCE(p_wallet_apply_hold_cents, 0), 0),
      updated_at = now()
    WHERE id = v_order_id;
  END IF;

  INSERT INTO public.order_events (order_id, event_type, message)
  VALUES (v_order_id, 'pagamento_pendente', 'Cobrança criada — aguardando pagamento.');

  RETURN jsonb_build_object(
    'ok', true,
    'checkout_id', v_checkout_id,
    'order_id', v_order_id,
    'order_code', v_order_code,
    'wallet_applied_cents', v_wallet_total,
    'charge_cents', v_total - v_wallet_total
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.confirmar_pagamento_asaas(
  p_asaas_payment_id TEXT,
  p_receipt_url TEXT DEFAULT NULL,
  p_gateway_fee_cents BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_now TIMESTAMPTZ := now();
  v_fee BIGINT;
BEGIN
  IF p_asaas_payment_id IS NULL OR length(trim(p_asaas_payment_id)) = 0 THEN
    RAISE EXCEPTION 'ID de pagamento Asaas obrigatório.';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE external_payment_id = trim(p_asaas_payment_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'order_not_found');
  END IF;

  IF v_order.status = 'pago' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_confirmed', true,
      'order_id', v_order.id,
      'order_code', v_order.code
    );
  END IF;

  v_fee := COALESCE(p_gateway_fee_cents, v_order.gateway_fee_cents, 0);

  UPDATE public.orders
  SET
    status = 'pago',
    gateway_fee_cents = v_fee,
    fee_reserve_cents = v_fee,
    updated_at = v_now
  WHERE id = v_order.id;

  UPDATE public.checkouts
  SET escrow_status = 'held'
  WHERE id = v_order.checkout_id;

  PERFORM public.aplicar_carteira_apos_pagamento(v_order.id);

  INSERT INTO public.auction_invoices (
    order_id, payment_method, gateway_transaction_id,
    approved_at, receipt_url, gateway, amount_cents
  )
  VALUES (
    v_order.id,
    COALESCE(v_order.payment_method, 'pix'::public.invoice_payment_method),
    trim(p_asaas_payment_id),
    v_now,
    p_receipt_url,
    'asaas',
    v_order.total_cents
  )
  ON CONFLICT (order_id) DO UPDATE SET
    gateway_transaction_id = EXCLUDED.gateway_transaction_id,
    approved_at = EXCLUDED.approved_at,
    receipt_url = COALESCE(EXCLUDED.receipt_url, auction_invoices.receipt_url),
    gateway = 'asaas',
    amount_cents = EXCLUDED.amount_cents;

  INSERT INTO public.order_events (order_id, event_type, message, metadata)
  VALUES (
    v_order.id,
    'pagamento_aprovado',
    'Pagamento confirmado via Asaas.',
    jsonb_build_object(
      'wallet_apply_available_cents', v_order.wallet_apply_available_cents,
      'wallet_apply_hold_cents', v_order.wallet_apply_hold_cents
    )
  );

  INSERT INTO public.order_events (order_id, event_type, message)
  VALUES (v_order.id, 'envio_pendente', 'Pagamento confirmado — aguardando postagem do vendedor.');

  PERFORM public.agendar_liberacao_garantia_pedido(v_order.id, 30);

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', v_order.id,
    'order_code', v_order.code,
    'buyer_id', v_order.buyer_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_lance(UUID, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_carteira_checkout(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calcular_retencao_lance_cents(BIGINT) TO authenticated;

REVOKE ALL ON FUNCTION public.finalizar_retencoes_leilao_encerrado(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confiscar_retencao_vencedor(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aplicar_carteira_apos_pagamento(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.iniciar_checkout_pagamento(UUID, UUID, BIGINT, BIGINT, BIGINT, public.invoice_payment_method, TEXT, BIGINT, BIGINT, BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirmar_pagamento_asaas(TEXT, TEXT, BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalizar_retencoes_leilao_encerrado(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.confiscar_retencao_vencedor(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.aplicar_carteira_apos_pagamento(UUID) TO service_role;

ALTER TABLE public.bid_holds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bidder read own bid holds" ON public.bid_holds;
CREATE POLICY "Bidder read own bid holds"
  ON public.bid_holds FOR SELECT
  USING (bidder_id = auth.uid());

CREATE OR REPLACE FUNCTION public.trg_auction_ended_bid_holds()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'ended'::auction_status THEN
    PERFORM public.finalizar_retencoes_leilao_encerrado(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auction_ended_bid_holds ON public.auctions;
CREATE TRIGGER auction_ended_bid_holds
  AFTER UPDATE OF status ON public.auctions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_auction_ended_bid_holds();
