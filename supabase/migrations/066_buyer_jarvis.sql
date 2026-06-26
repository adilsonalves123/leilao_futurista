-- Jarvis comprador: sessões globais, contexto, alertas proativos

CREATE TABLE IF NOT EXISTS public.buyer_jarvis_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Jarvis · Levou',
  last_route TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS buyer_jarvis_sessions_user_updated_idx
  ON public.buyer_jarvis_sessions (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.buyer_jarvis_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.buyer_jarvis_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS buyer_jarvis_messages_session_created_idx
  ON public.buyer_jarvis_messages (session_id, created_at ASC);

CREATE OR REPLACE FUNCTION public.buyer_jarvis_touch_session_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.buyer_jarvis_sessions
  SET updated_at = now()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS buyer_jarvis_messages_touch_session ON public.buyer_jarvis_messages;
CREATE TRIGGER buyer_jarvis_messages_touch_session
  AFTER INSERT ON public.buyer_jarvis_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.buyer_jarvis_touch_session_updated_at();

ALTER TABLE public.buyer_jarvis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_jarvis_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS buyer_jarvis_sessions_select_own ON public.buyer_jarvis_sessions;
CREATE POLICY buyer_jarvis_sessions_select_own ON public.buyer_jarvis_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS buyer_jarvis_messages_select_own ON public.buyer_jarvis_messages;
CREATE POLICY buyer_jarvis_messages_select_own ON public.buyer_jarvis_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.buyer_jarvis_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.buyer_jarvis_obter_ou_criar_sessao(p_route TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  PERFORM set_config('row_security', 'off', true);

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  SELECT s.id INTO v_id
  FROM public.buyer_jarvis_sessions s
  WHERE s.user_id = auth.uid()
  ORDER BY s.updated_at DESC
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    IF p_route IS NOT NULL AND btrim(p_route) <> '' THEN
      UPDATE public.buyer_jarvis_sessions
      SET last_route = left(btrim(p_route), 240)
      WHERE id = v_id;
    END IF;
    RETURN v_id;
  END IF;

  INSERT INTO public.buyer_jarvis_sessions (user_id, last_route)
  VALUES (auth.uid(), NULLIF(left(btrim(COALESCE(p_route, '')), 240), ''))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.buyer_jarvis_listar_mensagens(p_session_id UUID)
RETURNS TABLE (
  id UUID,
  role TEXT,
  body TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('row_security', 'off', true);

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.buyer_jarvis_sessions s
    WHERE s.id = p_session_id AND s.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sessão não encontrada.';
  END IF;

  RETURN QUERY
  SELECT m.id, m.role, m.body, m.metadata, m.created_at
  FROM public.buyer_jarvis_messages m
  WHERE m.session_id = p_session_id
  ORDER BY m.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.buyer_jarvis_persistir_mensagens(
  p_session_id UUID,
  p_user_id UUID,
  p_user_body TEXT DEFAULT NULL,
  p_assistant_body TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_msg_id UUID;
  v_assistant_msg_id UUID;
BEGIN
  PERFORM set_config('row_security', 'off', true);

  IF NOT EXISTS (
    SELECT 1 FROM public.buyer_jarvis_sessions s
    WHERE s.id = p_session_id AND s.user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'session_not_found');
  END IF;

  IF p_user_body IS NOT NULL AND btrim(p_user_body) <> '' THEN
    INSERT INTO public.buyer_jarvis_messages (session_id, role, body)
    VALUES (p_session_id, 'user', btrim(p_user_body))
    RETURNING id INTO v_user_msg_id;
  END IF;

  IF p_assistant_body IS NOT NULL AND btrim(p_assistant_body) <> '' THEN
    INSERT INTO public.buyer_jarvis_messages (session_id, role, body, metadata)
    VALUES (p_session_id, 'assistant', btrim(p_assistant_body), COALESCE(p_metadata, '{}'::jsonb))
    RETURNING id INTO v_assistant_msg_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'user_message_id', v_user_msg_id,
    'assistant_message_id', v_assistant_msg_id
  );
END;
$$;

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

CREATE OR REPLACE FUNCTION public.process_jarvis_proactive_notifications()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT wd.user_id, COUNT(*)::INT AS qtd
    FROM public.wallet_deposits wd
    WHERE wd.status = 'pendente'
      AND wd.created_at < now() - interval '24 hours'
    GROUP BY wd.user_id
  LOOP
    IF public.enqueue_notification(
      r.user_id,
      'jarvis_pix_pending',
      'Jarvis · Pix pendente',
      format('Você tem %s depósito(s) Pix aguardando há mais de 24h. Toque para revisar.', r.qtd),
      jsonb_build_object('url', '/(tabs)/wallet', 'openJarvis', true),
      'jarvis:pix24h:' || r.user_id::TEXT,
      1440
    ) IS NOT NULL THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  FOR r IN
    SELECT u.id AS user_id, u.status_verificacao
    FROM public.users u
    WHERE COALESCE(u.status_verificacao, 'pendente') <> 'aprovado'
      AND EXISTS (
        SELECT 1 FROM public.bids b
        WHERE b.bidder_id = u.id AND b.created_at > now() - interval '7 days'
      )
  LOOP
    IF public.enqueue_notification(
      r.user_id,
      'jarvis_kyc',
      'Jarvis · KYC necessário',
      'Seu cadastro ainda não está aprovado. Complete o KYC para continuar dando lances.',
      jsonb_build_object('url', '/(tabs)/profile', 'openJarvis', true),
      'jarvis:kyc:' || r.user_id::TEXT,
      2880
    ) IS NOT NULL THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.run_scheduled_push_jobs()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ended INT;
  v_soon INT;
  v_jarvis INT := 0;
BEGIN
  v_ended := public.finalize_expired_live_auctions();
  v_soon := public.process_auction_ending_soon_notifications();

  IF to_regprocedure('public.process_jarvis_proactive_notifications()') IS NOT NULL THEN
    v_jarvis := public.process_jarvis_proactive_notifications();
  END IF;

  RETURN jsonb_build_object(
    'auctions_ended', v_ended,
    'ending_soon_sent', v_soon,
    'jarvis_proactive_sent', v_jarvis
  );
END;
$$;

REVOKE ALL ON FUNCTION public.buyer_jarvis_obter_ou_criar_sessao(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.buyer_jarvis_listar_mensagens(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.buyer_jarvis_persistir_mensagens(UUID, UUID, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.buyer_jarvis_context_bundle(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_jarvis_proactive_notifications() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.buyer_jarvis_obter_ou_criar_sessao(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buyer_jarvis_listar_mensagens(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buyer_jarvis_context_bundle(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buyer_jarvis_persistir_mensagens(UUID, UUID, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_jarvis_proactive_notifications() TO service_role;

-- Jarvis push → categorias corretas de preferência
CREATE OR REPLACE FUNCTION public._notification_type_category(p_type TEXT)
RETURNS public.notification_category
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_type IN (
      'bid_outbid', 'auction_won', 'auction_lost', 'auction_ending_soon',
      'listing_approved', 'listing_rejected'
    ) THEN 'auction'::public.notification_category
    WHEN p_type IN (
      'payment_confirmed', 'shipment_posted', 'delivery_confirm',
      'order_delivered', 'order_dispute', 'payment_pending'
    ) THEN 'order'::public.notification_category
    WHEN p_type IN ('admin_chat_message', 'vendor_chat_message') THEN 'chat'::public.notification_category
    WHEN p_type IN (
      'kyc_submitted', 'kyc_approved', 'kyc_rejected', 'jarvis_kyc', 'jarvis_pix_pending'
    ) THEN 'account'::public.notification_category
    WHEN p_type = 'deal_alert' THEN 'marketing'::public.notification_category
    ELSE 'auction'::public.notification_category
  END;
$$;
