-- Integração Asaas: checkout pendente + confirmação via webhook

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method public.invoice_payment_method;

CREATE OR REPLACE FUNCTION public.vincular_asaas_customer(
  p_user_id UUID,
  p_asaas_customer_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_asaas_customer_id IS NULL OR length(trim(p_asaas_customer_id)) = 0 THEN
    RAISE EXCEPTION 'asaas_customer_id inválido.';
  END IF;

  UPDATE public.users
  SET asaas_customer_id = trim(p_asaas_customer_id)
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.iniciar_checkout_pagamento(
  p_auction_id UUID,
  p_buyer_id UUID,
  p_item_cents BIGINT,
  p_shipping_cents BIGINT,
  p_commission_cents BIGINT,
  p_payment_method public.invoice_payment_method,
  p_asaas_payment_id TEXT,
  p_gateway_fee_cents BIGINT DEFAULT 0
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
BEGIN
  IF p_asaas_payment_id IS NULL OR length(trim(p_asaas_payment_id)) = 0 THEN
    RAISE EXCEPTION 'ID de pagamento Asaas obrigatório.';
  END IF;

  v_total := p_item_cents + p_shipping_cents;
  v_provider := public.escolher_provedor_pagamento(p_payment_method, v_total);

  SELECT seller_id INTO v_vendor_id
  FROM public.auctions
  WHERE id = p_auction_id;

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
  FROM public.orders o
  WHERE o.checkout_id = v_checkout_id;

  IF v_order_id IS NULL THEN
    v_order_code := public.generate_order_code();
    INSERT INTO public.orders (
      code, auction_id, buyer_id, vendor_id, checkout_id,
      item_cents, shipping_cents, commission_cents, total_cents,
      status, payment_method, payment_provider, external_payment_id,
      gateway_fee_cents, fee_reserve_cents
    )
    VALUES (
      v_order_code, p_auction_id, p_buyer_id, v_vendor_id, v_checkout_id,
      p_item_cents, p_shipping_cents, p_commission_cents, v_total,
      'pendente_pagamento', p_payment_method, v_provider, trim(p_asaas_payment_id),
      COALESCE(p_gateway_fee_cents, 0), COALESCE(p_gateway_fee_cents, 0)
    )
    RETURNING id INTO v_order_id;

    INSERT INTO public.order_events (order_id, event_type, message)
    VALUES (v_order_id, 'pedido_criado', 'Pedido ' || v_order_code || ' aguardando pagamento Asaas.');
  ELSE
    UPDATE public.orders
    SET
      status = 'pendente_pagamento',
      payment_method = p_payment_method,
      payment_provider = v_provider,
      external_payment_id = trim(p_asaas_payment_id),
      gateway_fee_cents = COALESCE(p_gateway_fee_cents, 0),
      fee_reserve_cents = COALESCE(p_gateway_fee_cents, 0),
      updated_at = now()
    WHERE id = v_order_id;
  END IF;

  INSERT INTO public.order_events (order_id, event_type, message)
  VALUES (
    v_order_id,
    'pagamento_pendente',
    'Cobrança Asaas criada — aguardando confirmação do pagador.'
  );

  RETURN jsonb_build_object(
    'ok', true,
    'checkout_id', v_checkout_id,
    'order_id', v_order_id,
    'order_code', v_order_code,
    'payment_provider', v_provider::TEXT
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
  v_checkout_id UUID;
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

  INSERT INTO public.auction_invoices (
    order_id, payment_method, gateway_transaction_id,
    approved_at, receipt_url, gateway, amount_cents
  )
  SELECT
    v_order.id,
    COALESCE(v_order.payment_method, 'pix'::public.invoice_payment_method),
    trim(p_asaas_payment_id),
    v_now,
    p_receipt_url,
    'asaas',
    v_order.total_cents
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
    'Pagamento confirmado via Asaas em ' ||
      to_char(v_now AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') || '.',
    jsonb_build_object('payment_provider', 'asaas', 'asaas_payment_id', trim(p_asaas_payment_id))
  );

  INSERT INTO public.order_events (order_id, event_type, message)
  VALUES (
    v_order.id,
    'envio_pendente',
    'Pagamento confirmado — aguardando postagem do vendedor.'
  );

  PERFORM public.agendar_liberacao_garantia_pedido(v_order.id, 30);

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', v_order.id,
    'order_code', v_order.code,
    'buyer_id', v_order.buyer_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.consultar_status_pagamento_asaas(p_asaas_payment_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_order public.orders%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Faça login para consultar o pagamento.';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE external_payment_id = trim(p_asaas_payment_id)
    AND buyer_id = v_uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', v_order.id,
    'order_code', v_order.code,
    'status', v_order.status::TEXT,
    'paid', v_order.status = 'pago'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.vincular_asaas_customer(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.iniciar_checkout_pagamento(UUID, UUID, BIGINT, BIGINT, BIGINT, public.invoice_payment_method, TEXT, BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirmar_pagamento_asaas(TEXT, TEXT, BIGINT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.vincular_asaas_customer(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.iniciar_checkout_pagamento(UUID, UUID, BIGINT, BIGINT, BIGINT, public.invoice_payment_method, TEXT, BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirmar_pagamento_asaas(TEXT, TEXT, BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.consultar_status_pagamento_asaas(TEXT) TO authenticated;
