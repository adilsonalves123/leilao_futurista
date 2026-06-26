-- Garantia do vendedor: libera na confirmação do comprador ou fim da disputa (sem espera de 30 dias).

CREATE OR REPLACE FUNCTION public.vincular_garantia_pedido(p_order_id UUID)
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
    release_after = NULL,
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

CREATE OR REPLACE FUNCTION public.liberar_garantia_pedido(
  p_order_id UUID,
  p_reason TEXT DEFAULT 'pedido_concluido'
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
    RETURN jsonb_build_object('ok', false, 'reason', 'order_not_found');
  END IF;

  RETURN public.liberar_garantia_leilao(v_order.auction_id, p_reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.comprador_confirmar_recebimento(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_release JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'order_not_found');
  END IF;

  IF v_order.buyer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Somente o comprador pode confirmar o recebimento.';
  END IF;

  IF v_order.status <> 'aguardando_confirmacao'::public.order_status THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'invalid_status',
      'message', 'Confirmação disponível apenas após a entrega do item.'
    );
  END IF;

  PERFORM public.update_order_status(
    p_order_id,
    'finalizado'::public.order_status,
    NULL,
    'comprador_confirmou',
    'Comprador confirmou recebimento do item.'
  );

  v_release := public.liberar_garantia_pedido(p_order_id, 'comprador_confirmou_recebimento');

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', p_order_id,
    'collateral', v_release
  );
END;
$$;

-- Ao pagar: só vincula pedido à garantia (sem agendar 30 dias).
CREATE OR REPLACE FUNCTION public.agendar_liberacao_garantia_pedido(
  p_order_id UUID,
  p_days INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.vincular_garantia_pedido(p_order_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_resolver_disputa(
  p_dispute_id UUID,
  p_favor TEXT,
  p_notes TEXT DEFAULT NULL,
  p_debitar_garantia_cents BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispute public.order_disputes%ROWTYPE;
  v_new_status public.dispute_status;
  v_order_status public.order_status;
  v_event_type TEXT;
  v_event_msg TEXT;
  v_debit JSONB;
  v_release JSONB;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  PERFORM public.assert_admin_dispute();

  SELECT * INTO v_dispute FROM public.order_disputes WHERE id = p_dispute_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Disputa não encontrada.';
  END IF;

  IF p_favor = 'comprador' THEN
    v_new_status := 'resolvida_comprador'::public.dispute_status;
    v_order_status := 'estornado'::public.order_status;
    v_event_type := 'disputa_resolvida_comprador';
    v_event_msg := COALESCE(p_notes, 'Mediação: valor devolvido ao comprador.');
  ELSIF p_favor = 'vendedor' THEN
    v_new_status := 'resolvida_vendedor'::public.dispute_status;
    v_order_status := 'finalizado'::public.order_status;
    v_event_type := 'disputa_resolvida_vendedor';
    v_event_msg := COALESCE(p_notes, 'Mediação: pedido liberado ao vendedor.');
  ELSE
    RAISE EXCEPTION 'Favor inválido. Use comprador ou vendedor.';
  END IF;

  PERFORM public.update_order_status(
    v_dispute.order_id,
    v_order_status,
    NULL,
    v_event_type,
    v_event_msg
  );

  IF p_favor = 'comprador' AND COALESCE(p_debitar_garantia_cents, 0) > 0 THEN
    v_debit := public.debitar_garantia_disputa(
      v_dispute.order_id,
      p_debitar_garantia_cents,
      'disputa_resolvida_comprador'
    );
  END IF;

  UPDATE public.order_disputes
  SET
    status = v_new_status,
    resolution_notes = COALESCE(p_notes, resolution_notes),
    resolved_by = auth.uid(),
    resolved_at = now(),
    updated_at = now()
  WHERE id = p_dispute_id;

  IF p_favor = 'vendedor' THEN
    v_release := public.liberar_garantia_pedido(v_dispute.order_id, 'disputa_favor_vendedor');
  ELSE
    v_release := public.liberar_garantia_pedido(v_dispute.order_id, 'disputa_favor_comprador');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'disputeId', p_dispute_id,
    'favor', p_favor,
    'debit', v_debit,
    'collateral', v_release
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.comprador_confirmar_recebimento(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vincular_garantia_pedido(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.liberar_garantia_pedido(UUID, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.comprador_confirmar_recebimento(UUID) FROM PUBLIC;
