-- Contexto Jarvis comprador: KYC operacional + pedidos recentes

CREATE OR REPLACE FUNCTION public.buyer_jarvis_context_bundle(p_route TEXT DEFAULT '/')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_user public.users%ROWTYPE;
  v_available BIGINT := 0;
  v_hold BIGINT := 0;
  v_pix_pending INT := 0;
  v_pix_old INT := 0;
  v_winning INT := 0;
  v_pending_payment INT := 0;
  v_in_transit INT := 0;
  v_alertas JSONB := '[]'::jsonb;
  v_route TEXT := COALESCE(NULLIF(btrim(p_route), ''), '/');
  v_kyc TEXT;
  v_pode_lance BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_user FROM public.users u WHERE u.id = v_uid;
  v_kyc := COALESCE(v_user.status_verificacao, 'pendente');
  v_pode_lance := v_kyc = 'aprovado';

  IF to_regprocedure('public.saldo_carteira_disponivel_cents(uuid)') IS NOT NULL THEN
    v_available := COALESCE(public.saldo_carteira_disponivel_cents(v_uid), 0);
  ELSE
    v_available := COALESCE(v_user.escrow_balance_cents, 0);
  END IF;

  SELECT COALESCE(SUM(bh.hold_cents), 0)::BIGINT INTO v_hold
  FROM public.bid_holds bh
  WHERE bh.bidder_id = v_uid AND bh.status = 'active';

  SELECT COUNT(*)::INT INTO v_pix_pending
  FROM public.wallet_deposits wd
  WHERE wd.user_id = v_uid AND wd.status = 'pendente';

  SELECT COUNT(*)::INT INTO v_pix_old
  FROM public.wallet_deposits wd
  WHERE wd.user_id = v_uid
    AND wd.status = 'pendente'
    AND wd.created_at < now() - interval '24 hours';

  SELECT COUNT(*)::INT INTO v_winning
  FROM public.auctions a
  WHERE a.status = 'live'
    AND (
      SELECT b.bidder_id
      FROM public.bids b
      WHERE b.auction_id = a.id
      ORDER BY b.amount_cents DESC, b.created_at DESC
      LIMIT 1
    ) = v_uid;

  IF to_regclass('public.orders') IS NOT NULL THEN
    SELECT COUNT(*)::INT INTO v_pending_payment
    FROM public.orders o
    WHERE o.buyer_id = v_uid
      AND o.status = 'pendente_pagamento'::public.order_status;

    SELECT COUNT(*)::INT INTO v_in_transit
    FROM public.orders o
    WHERE o.buyer_id = v_uid
      AND o.status IN (
        'pago'::public.order_status,
        'em_envio'::public.order_status,
        'aguardando_confirmacao'::public.order_status
      );
  END IF;

  IF v_pix_old > 0 THEN
    v_alertas := v_alertas || jsonb_build_array(jsonb_build_object(
      'kind', 'pix_pending',
      'severity', 'warning',
      'title', 'Pix pendente há mais de 24h',
      'detail', format('%s depósito(s) aguardando confirmação.', v_pix_old),
      'action_url', '/(tabs)/wallet'
    ));
  ELSIF v_pix_pending > 0 THEN
    v_alertas := v_alertas || jsonb_build_array(jsonb_build_object(
      'kind', 'pix_pending',
      'severity', 'info',
      'title', 'Depósito Pix em processamento',
      'detail', format('%s recarga(s) aguardando confirmação.', v_pix_pending),
      'action_url', '/(tabs)/wallet'
    ));
  END IF;

  IF NOT v_pode_lance THEN
    v_alertas := v_alertas || jsonb_build_array(jsonb_build_object(
      'kind', 'kyc',
      'severity', CASE WHEN v_kyc = 'rejeitado' THEN 'critical' ELSE 'warning' END,
      'title', 'KYC incompleto — lances bloqueados',
      'detail', format('Status: %s. Complete documento + selfie em Perfil.', v_kyc),
      'action_url', '/(tabs)/profile'
    ));
  END IF;

  IF v_winning > 0 THEN
    v_alertas := v_alertas || jsonb_build_array(jsonb_build_object(
      'kind', 'winning_bid',
      'severity', 'info',
      'title', format('Você lidera %s leilão(ões)', v_winning),
      'detail', 'Monitore o cronômetro — lances nos últimos 15s estendem +15s.',
      'action_url', '/(tabs)/leiloes'
    ));
  END IF;

  IF v_pending_payment > 0 THEN
    v_alertas := v_alertas || jsonb_build_array(jsonb_build_object(
      'kind', 'payment_due',
      'severity', 'warning',
      'title', format('%s fatura(s) aguardando pagamento', v_pending_payment),
      'detail', 'Prazo de 24h após arremate. Multa de 30% se não pagar.',
      'action_url', '/my-bids'
    ));
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'generated_at', now(),
    'route', v_route,
    'user', jsonb_build_object(
      'display_name', COALESCE(v_user.display_name, v_user.nome_completo, split_part(v_user.email, '@', 1)),
      'kyc_status', v_kyc
    ),
    'kyc', jsonb_build_object(
      'status', v_kyc,
      'pode_dar_lance', v_pode_lance
    ),
    'wallet', jsonb_build_object(
      'available_cents', v_available,
      'hold_cents', v_hold,
      'pix_pending_count', v_pix_pending
    ),
    'bids', jsonb_build_object('winning_live_count', v_winning),
    'pedidos', jsonb_build_object(
      'pending_payment_count', v_pending_payment,
      'in_transit_count', v_in_transit
    ),
    'alertas', v_alertas
  );
END;
$$;
