-- Corrige buyer_jarvis_context_bundle: bid_holds usa hold_cents, não amount_cents.

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
  v_alertas JSONB := '[]'::jsonb;
  v_route TEXT := COALESCE(NULLIF(btrim(p_route), ''), '/');
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_user FROM public.users u WHERE u.id = v_uid;

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

  IF COALESCE(v_user.status_verificacao, 'pendente') <> 'aprovado' THEN
    v_alertas := v_alertas || jsonb_build_array(jsonb_build_object(
      'kind', 'kyc',
      'severity', CASE WHEN v_user.status_verificacao = 'rejeitado' THEN 'critical' ELSE 'warning' END,
      'title', 'KYC incompleto',
      'detail', format('Status atual: %s. Complete para desbloquear lances.', COALESCE(v_user.status_verificacao, 'pendente')),
      'action_url', '/(tabs)/profile'
    ));
  END IF;

  IF v_winning > 0 THEN
    v_alertas := v_alertas || jsonb_build_array(jsonb_build_object(
      'kind', 'winning_bid',
      'severity', 'info',
      'title', format('Você lidera %s leilão(ões)', v_winning),
      'detail', 'Monitore o cronômetro — lances podem ser superados.',
      'action_url', '/(tabs)/leiloes'
    ));
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'generated_at', now(),
    'route', v_route,
    'user', jsonb_build_object(
      'display_name', COALESCE(v_user.display_name, v_user.nome_completo, split_part(v_user.email, '@', 1)),
      'kyc_status', COALESCE(v_user.status_verificacao, 'pendente')
    ),
    'wallet', jsonb_build_object(
      'available_cents', v_available,
      'hold_cents', v_hold,
      'pix_pending_count', v_pix_pending
    ),
    'bids', jsonb_build_object('winning_live_count', v_winning),
    'alertas', v_alertas
  );
END;
$$;
