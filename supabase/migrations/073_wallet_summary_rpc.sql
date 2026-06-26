-- Resumo da carteira: saldo total, garantias, livre para operar e elegibilidade de saque.

CREATE OR REPLACE FUNCTION public.carteira_resumo()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_total BIGINT := 0;
  v_vendor_collateral BIGINT := 0;
  v_bid_held BIGINT := 0;
  v_guarantees BIGINT := 0;
  v_free BIGINT := 0;
  v_pending INT := 0;
  v_listing_guarantees INT := 0;
  v_bid_holds INT := 0;
  v_can_withdraw BOOLEAN := false;
  v_withdrawable BIGINT := 0;
  v_block_reason TEXT := NULL;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT
    COALESCE(u.escrow_balance_cents, 0),
    COALESCE(u.vendor_collateral_held_cents, 0),
    COALESCE(u.buyer_bid_held_cents, 0)
  INTO v_total, v_vendor_collateral, v_bid_held
  FROM public.users u
  WHERE u.id = v_uid;

  v_guarantees := v_vendor_collateral + v_bid_held;
  v_free := public.saldo_carteira_disponivel_cents(v_uid);

  SELECT COUNT(*)::INT INTO v_pending
  FROM public.orders o
  WHERE (o.buyer_id = v_uid OR o.vendor_id = v_uid)
    AND o.status IN (
      'pago'::public.order_status,
      'em_envio'::public.order_status,
      'aguardando_confirmacao'::public.order_status,
      'em_disputa'::public.order_status
    );

  SELECT COUNT(*)::INT INTO v_listing_guarantees
  FROM public.vendor_collateral_holds vh
  WHERE vh.vendor_id = v_uid
    AND vh.status = 'active';

  SELECT COUNT(*)::INT INTO v_bid_holds
  FROM public.bid_holds bh
  WHERE bh.bidder_id = v_uid
    AND bh.status IN ('active', 'winning');

  IF v_pending > 0 THEN
    v_block_reason := 'pending_operations';
    v_can_withdraw := false;
    v_withdrawable := 0;
  ELSIF v_free <= 0 THEN
    v_block_reason := 'no_free_balance';
    v_can_withdraw := false;
    v_withdrawable := 0;
  ELSE
    v_block_reason := NULL;
    v_can_withdraw := true;
    v_withdrawable := v_free;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'total_cents', v_total,
    'guarantees_cents', v_guarantees,
    'vendor_collateral_cents', v_vendor_collateral,
    'bid_held_cents', v_bid_held,
    'free_cents', v_free,
    'withdrawable_cents', v_withdrawable,
    'can_withdraw', v_can_withdraw,
    'pending_operations_count', v_pending,
    'active_listing_guarantees_count', v_listing_guarantees,
    'active_bid_holds_count', v_bid_holds,
    'withdraw_block_reason', v_block_reason
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.carteira_resumo() TO authenticated;
REVOKE ALL ON FUNCTION public.carteira_resumo() FROM PUBLIC;
