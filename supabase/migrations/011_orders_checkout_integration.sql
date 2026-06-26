-- Código sequencial de pedidos (#LC-45821)
CREATE SEQUENCE IF NOT EXISTS public.order_code_seq START 45800;

CREATE OR REPLACE FUNCTION public.generate_order_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num BIGINT;
BEGIN
  next_num := nextval('public.order_code_seq');
  RETURN '#LC-' || lpad(next_num::text, 5, '0');
END;
$$;

-- Dispara ao criar checkout: gera pedido pendente + evento
CREATE OR REPLACE FUNCTION public.handle_checkout_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor_id UUID;
  v_code TEXT;
  v_order_id UUID;
BEGIN
  SELECT seller_id INTO v_vendor_id FROM public.auctions WHERE id = NEW.auction_id;

  IF v_vendor_id IS NULL THEN
    RAISE EXCEPTION 'Leilão % não encontrado para checkout', NEW.auction_id;
  END IF;

  IF EXISTS (SELECT 1 FROM public.orders WHERE checkout_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_code := public.generate_order_code();

  INSERT INTO public.orders (
    code,
    auction_id,
    buyer_id,
    vendor_id,
    checkout_id,
    item_cents,
    shipping_cents,
    commission_cents,
    total_cents,
    status
  )
  VALUES (
    v_code,
    NEW.auction_id,
    NEW.buyer_id,
    v_vendor_id,
    NEW.id,
    NEW.subtotal_cents,
    NEW.shipping_cents,
    NEW.commission_cents,
    NEW.total_cents,
    'pendente_pagamento'
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_events (order_id, event_type, message)
  VALUES (
    v_order_id,
    'pedido_criado',
    'Pedido ' || v_code || ' criado após arremate do leilão.'
  );

  INSERT INTO public.order_events (order_id, event_type, message)
  VALUES (
    v_order_id,
    'pagamento_pendente',
    'Aguardando confirmação do gateway de pagamento.'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_checkout_created ON public.checkouts;
CREATE TRIGGER on_checkout_created
  AFTER INSERT ON public.checkouts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_checkout_created();

-- Confirma pagamento: atualiza checkout, pedido, fatura e eventos
CREATE OR REPLACE FUNCTION public.process_auction_payment(
  p_auction_id UUID,
  p_buyer_id UUID,
  p_item_cents BIGINT,
  p_shipping_cents BIGINT,
  p_commission_cents BIGINT,
  p_payment_method invoice_payment_method,
  p_gateway_transaction_id TEXT DEFAULT NULL,
  p_receipt_url TEXT DEFAULT NULL,
  p_gateway TEXT DEFAULT 'luckcode'
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
BEGIN
  v_total := p_item_cents + p_shipping_cents;

  INSERT INTO public.checkouts (
    auction_id,
    buyer_id,
    subtotal_cents,
    commission_cents,
    shipping_cents,
    total_cents,
    escrow_status
  )
  VALUES (
    p_auction_id,
    p_buyer_id,
    p_item_cents,
    p_commission_cents,
    p_shipping_cents,
    v_total,
    'held'
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
    PERFORM 1 FROM public.checkouts c WHERE c.id = v_checkout_id;
    SELECT o.id, o.code INTO v_order_id, v_order_code
    FROM public.orders o
    WHERE o.checkout_id = v_checkout_id;
  END IF;

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
    updated_at = v_now
  WHERE id = v_order_id;

  INSERT INTO public.auction_invoices (
    order_id,
    payment_method,
    gateway_transaction_id,
    approved_at,
    receipt_url,
    gateway,
    amount_cents
  )
  VALUES (
    v_order_id,
    p_payment_method,
    COALESCE(p_gateway_transaction_id, 'TXN-' || upper(substr(md5(random()::text), 1, 8))),
    v_now,
    p_receipt_url,
    p_gateway,
    v_total
  )
  ON CONFLICT (order_id) DO UPDATE SET
    payment_method = EXCLUDED.payment_method,
    gateway_transaction_id = EXCLUDED.gateway_transaction_id,
    approved_at = EXCLUDED.approved_at,
    receipt_url = EXCLUDED.receipt_url,
    gateway = EXCLUDED.gateway,
    amount_cents = EXCLUDED.amount_cents;

  INSERT INTO public.order_events (order_id, event_type, message)
  VALUES (
    v_order_id,
    'pagamento_aprovado',
    'Pagamento aprovado em ' || to_char(v_now AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') || '.'
  );

  INSERT INTO public.order_events (order_id, event_type, message)
  VALUES (
    v_order_id,
    'envio_pendente',
    'Pagamento confirmado — aguardando postagem do vendedor.'
  );

  RETURN QUERY SELECT v_checkout_id, v_order_id, v_order_code;
END;
$$;

-- Atualiza status do pedido (envio, entrega, disputa, etc.)
CREATE OR REPLACE FUNCTION public.update_order_status(
  p_order_id UUID,
  p_status order_status,
  p_tracking_code TEXT DEFAULT NULL,
  p_event_type TEXT DEFAULT NULL,
  p_event_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
BEGIN
  UPDATE public.orders
  SET
    status = p_status,
    tracking_code = COALESCE(p_tracking_code, tracking_code),
    shipped_at = CASE
      WHEN p_status = 'em_envio' AND shipped_at IS NULL THEN v_now
      ELSE shipped_at
    END,
    delivered_at = CASE
      WHEN p_status = 'aguardando_confirmacao' AND delivered_at IS NULL THEN v_now
      ELSE delivered_at
    END,
    finalized_at = CASE
      WHEN p_status = 'finalizado' AND finalized_at IS NULL THEN v_now
      ELSE finalized_at
    END,
    updated_at = v_now
  WHERE id = p_order_id;

  IF p_event_type IS NOT NULL AND p_event_message IS NOT NULL THEN
    INSERT INTO public.order_events (order_id, event_type, message)
    VALUES (p_order_id, p_event_type, p_event_message);
  END IF;
END;
$$;

-- Políticas de escrita (app autenticado)
DROP POLICY IF EXISTS "Buyer insert checkout" ON public.checkouts;
CREATE POLICY "Buyer insert checkout"
  ON public.checkouts FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Buyer update own checkout" ON public.checkouts;
CREATE POLICY "Buyer update own checkout"
  ON public.checkouts FOR UPDATE
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Buyer read own checkout" ON public.checkouts;
CREATE POLICY "Buyer read own checkout"
  ON public.checkouts FOR SELECT
  USING (auth.uid() = buyer_id);

-- Seeds demo: usa leilões/usuários existentes
CREATE OR REPLACE FUNCTION public.seed_demo_orders()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
  v_auction RECORD;
  v_buyer_id UUID;
  v_vendor_id UUID;
  v_checkout_id UUID;
  v_order_id UUID;
  v_code TEXT;
BEGIN
  IF (SELECT COUNT(*) FROM public.orders) > 0 THEN
    RETURN 0;
  END IF;

  v_count := 0;

  FOR v_auction IN
    SELECT a.id, a.seller_id, a.title, a.current_price_cents
    FROM public.auctions a
    ORDER BY a.created_at DESC
    LIMIT 6
  LOOP
    SELECT u.id INTO v_buyer_id
    FROM public.users u
    WHERE u.id <> v_auction.seller_id
    ORDER BY u.created_at
    LIMIT 1;

    IF v_buyer_id IS NULL THEN
      EXIT;
    END IF;

    v_vendor_id := v_auction.seller_id;
    v_code := public.generate_order_code();

    INSERT INTO public.checkouts (
      auction_id,
      buyer_id,
      subtotal_cents,
      commission_cents,
      shipping_cents,
      total_cents,
      escrow_status
    )
    VALUES (
      v_auction.id,
      v_buyer_id,
      v_auction.current_price_cents,
      (v_auction.current_price_cents * 10) / 100,
      4500,
      v_auction.current_price_cents + 4500,
      CASE v_count
        WHEN 0 THEN 'held'::escrow_status
        WHEN 1 THEN 'pending'::escrow_status
        ELSE 'held'::escrow_status
      END
    )
    ON CONFLICT (auction_id) DO NOTHING
    RETURNING id INTO v_checkout_id;

    IF v_checkout_id IS NULL THEN
      SELECT id INTO v_checkout_id FROM public.checkouts WHERE auction_id = v_auction.id;
    END IF;

    SELECT id INTO v_order_id FROM public.orders WHERE checkout_id = v_checkout_id;

    IF v_order_id IS NULL THEN
      CONTINUE;
    END IF;

    UPDATE public.orders
    SET status = CASE v_count
      WHEN 0 THEN 'finalizado'::order_status
      WHEN 1 THEN 'pendente_pagamento'::order_status
      WHEN 2 THEN 'em_envio'::order_status
      WHEN 3 THEN 'pago'::order_status
      WHEN 4 THEN 'em_disputa'::order_status
      ELSE 'pendente_pagamento'::order_status
    END,
    tracking_code = CASE WHEN v_count IN (0, 2, 4) THEN 'BR' || lpad((45800 + v_count)::text, 9, '0') || 'BR' ELSE NULL END,
    shipped_at = CASE WHEN v_count IN (0, 2, 4) THEN now() - interval '2 days' ELSE NULL END,
    finalized_at = CASE WHEN v_count = 0 THEN now() - interval '1 day' ELSE NULL END,
    updated_at = now()
    WHERE id = v_order_id;

    IF v_count <> 1 THEN
      INSERT INTO public.auction_invoices (
        order_id,
        payment_method,
        gateway_transaction_id,
        approved_at,
        gateway,
        amount_cents
      )
      VALUES (
        v_order_id,
        (ARRAY['pix', 'boleto', 'cartao', 'pix', 'pix'])[v_count + 1],
        'TXN-DEMO-' || lpad(v_count::text, 4, '0'),
        CASE WHEN v_count = 1 THEN NULL ELSE now() - interval '1 day' END,
        'Mercado Pago',
        v_auction.current_price_cents + 4500
      )
      ON CONFLICT (order_id) DO NOTHING;
    END IF;

    INSERT INTO public.order_events (order_id, event_type, message)
    VALUES
      (v_order_id, 'seed_demo', 'Pedido demo gerado para painel admin — ' || v_auction.title);

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

SELECT public.seed_demo_orders();

GRANT EXECUTE ON FUNCTION public.process_auction_payment TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_order_status TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.search_admin_orders TO authenticated, anon;

COMMENT ON FUNCTION public.process_auction_payment IS 'Checkout + pedido + fatura + eventos em uma transação';
COMMENT ON FUNCTION public.seed_demo_orders IS 'Popula pedidos demo a partir de leilões/usuários existentes';
