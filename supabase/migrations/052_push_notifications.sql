-- Push notifications: tokens, preferências, fila, gatilhos e jobs agendados

CREATE TYPE public.notification_category AS ENUM (
  'auction',
  'order',
  'chat',
  'account',
  'marketing'
);

CREATE TYPE public.notification_outbox_status AS ENUM (
  'pending',
  'sent',
  'failed',
  'skipped'
);

ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS is_deal_highlight BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE public.user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'unknown'
    CHECK (platform IN ('ios', 'android', 'web', 'unknown')),
  device_name TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_push_tokens_user_token_unique UNIQUE (user_id, expo_push_token)
);

CREATE INDEX user_push_tokens_active_idx
  ON public.user_push_tokens (user_id)
  WHERE active = true;

CREATE TABLE public.notification_preferences (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category public.notification_category NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, category)
);

CREATE TABLE public.notification_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notification_inbox_user_created_idx
  ON public.notification_inbox (user_id, created_at DESC);

CREATE TABLE public.notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key TEXT,
  status public.notification_outbox_status NOT NULL DEFAULT 'pending',
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notification_outbox_pending_idx
  ON public.notification_outbox (created_at ASC)
  WHERE status = 'pending';

CREATE INDEX notification_outbox_dedupe_idx
  ON public.notification_outbox (dedupe_key, user_id, created_at DESC)
  WHERE dedupe_key IS NOT NULL;

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_push_tokens_own ON public.user_push_tokens
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY notification_preferences_own ON public.notification_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY notification_inbox_own_select ON public.notification_inbox
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY notification_inbox_own_update ON public.notification_inbox
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Outbox: somente leitura pelo próprio usuário (envio via service role)
CREATE POLICY notification_outbox_own_select ON public.notification_outbox
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

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
    WHEN p_type IN ('kyc_submitted', 'kyc_approved', 'kyc_rejected') THEN 'account'::public.notification_category
    WHEN p_type = 'deal_alert' THEN 'marketing'::public.notification_category
    ELSE 'auction'::public.notification_category
  END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_notification_preferences(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id, category, enabled)
  VALUES
    (p_user_id, 'auction', true),
    (p_user_id, 'order', true),
    (p_user_id, 'chat', true),
    (p_user_id, 'account', true),
    (p_user_id, 'marketing', false)
  ON CONFLICT (user_id, category) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public._notification_pref_enabled(
  p_user_id UUID,
  p_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category public.notification_category;
  v_enabled BOOLEAN;
BEGIN
  v_category := public._notification_type_category(p_type);

  IF v_category IN ('account', 'order') THEN
    RETURN true;
  END IF;

  SELECT np.enabled INTO v_enabled
  FROM public.notification_preferences np
  WHERE np.user_id = p_user_id AND np.category = v_category;

  IF NOT FOUND THEN
    PERFORM public.ensure_notification_preferences(p_user_id);
    RETURN v_category <> 'marketing';
  END IF;

  RETURN v_enabled;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}'::jsonb,
  p_dedupe_key TEXT DEFAULT NULL,
  p_throttle_minutes INT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_outbox_id UUID;
  v_throttle INT := COALESCE(p_throttle_minutes, 0);
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT public._notification_pref_enabled(p_user_id, p_type) THEN
    RETURN NULL;
  END IF;

  IF p_dedupe_key IS NOT NULL AND v_throttle > 0 THEN
    IF EXISTS (
      SELECT 1
      FROM public.notification_outbox o
      WHERE o.user_id = p_user_id
        AND o.dedupe_key = p_dedupe_key
        AND o.created_at > now() - (v_throttle || ' minutes')::interval
        AND o.status IN ('pending', 'sent')
    ) THEN
      RETURN NULL;
    END IF;
  ELSIF p_dedupe_key IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.notification_outbox o
      WHERE o.user_id = p_user_id
        AND o.dedupe_key = p_dedupe_key
        AND o.status IN ('pending', 'sent')
    ) THEN
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO public.notification_inbox (user_id, notification_type, title, body, data)
  VALUES (p_user_id, p_type, p_title, p_body, p_data);

  INSERT INTO public.notification_outbox (
    user_id, notification_type, title, body, data, dedupe_key
  )
  VALUES (p_user_id, p_type, p_title, p_body, p_data, p_dedupe_key)
  RETURNING id INTO v_outbox_id;

  RETURN v_outbox_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPCs do app
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.register_push_token(
  p_expo_push_token TEXT,
  p_platform TEXT DEFAULT 'unknown',
  p_device_name TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_platform TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF p_expo_push_token IS NULL OR btrim(p_expo_push_token) = '' THEN
    RAISE EXCEPTION 'Token push inválido';
  END IF;

  v_platform := CASE lower(COALESCE(p_platform, 'unknown'))
    WHEN 'ios' THEN 'ios'
    WHEN 'android' THEN 'android'
    WHEN 'web' THEN 'web'
    ELSE 'unknown'
  END;

  PERFORM public.ensure_notification_preferences(v_uid);

  INSERT INTO public.user_push_tokens (user_id, expo_push_token, platform, device_name, active, updated_at)
  VALUES (v_uid, btrim(p_expo_push_token), v_platform, NULLIF(btrim(p_device_name), ''), true, now())
  ON CONFLICT (user_id, expo_push_token) DO UPDATE SET
    platform = EXCLUDED.platform,
    device_name = COALESCE(EXCLUDED.device_name, public.user_push_tokens.device_name),
    active = true,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.deactivate_push_token(p_expo_push_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  UPDATE public.user_push_tokens
  SET active = false, updated_at = now()
  WHERE user_id = auth.uid() AND expo_push_token = btrim(p_expo_push_token);
END;
$$;

CREATE OR REPLACE FUNCTION public.listar_notification_preferences()
RETURNS TABLE (category TEXT, enabled BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  PERFORM public.ensure_notification_preferences(v_uid);

  RETURN QUERY
  SELECT np.category::TEXT, np.enabled
  FROM public.notification_preferences np
  WHERE np.user_id = v_uid
  ORDER BY np.category::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_notification_preference(
  p_category TEXT,
  p_enabled BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_cat public.notification_category;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  v_cat := p_category::public.notification_category;

  IF v_cat IN ('account', 'order') AND p_enabled = false THEN
    RAISE EXCEPTION 'Notificações de % não podem ser desativadas.', p_category;
  END IF;

  PERFORM public.ensure_notification_preferences(v_uid);

  UPDATE public.notification_preferences
  SET enabled = p_enabled, updated_at = now()
  WHERE user_id = v_uid AND category = v_cat;
END;
$$;

CREATE OR REPLACE FUNCTION public.marcar_notification_inbox_lida(p_inbox_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  UPDATE public.notification_inbox
  SET read_at = now()
  WHERE id = p_inbox_id AND user_id = auth.uid() AND read_at IS NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- Marketing / oportunidades
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.broadcast_deal_alert(p_auction_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction RECORD;
  v_discount INT;
  v_hour INT;
  v_count INT := 0;
  v_user RECORD;
BEGIN
  SELECT
    a.id,
    a.title,
    a.starting_price_cents,
    a.estimated_market_cents,
    a.status
  INTO v_auction
  FROM public.auctions a
  WHERE a.id = p_auction_id;

  IF NOT FOUND OR v_auction.status <> 'live'::auction_status THEN
    RETURN 0;
  END IF;

  v_hour := EXTRACT(HOUR FROM (now() AT TIME ZONE 'America/Sao_Paulo'));
  IF v_hour < 9 OR v_hour >= 21 THEN
    RETURN 0;
  END IF;

  IF COALESCE(v_auction.estimated_market_cents, 0) > 0 THEN
    v_discount := GREATEST(
      0,
      ROUND(
        (1 - (v_auction.starting_price_cents::NUMERIC / v_auction.estimated_market_cents::NUMERIC)) * 100
      )::INT
    );
  ELSE
    v_discount := 0;
  END IF;

  FOR v_user IN
    SELECT DISTINCT np.user_id
    FROM public.notification_preferences np
    WHERE np.category = 'marketing' AND np.enabled = true
  LOOP
    IF public.enqueue_notification(
      v_user.user_id,
      'deal_alert',
      'Achado Levou',
      format(
        '%s com lance inicial %s%% abaixo do valor de mercado.',
        v_auction.title,
        v_discount
      ),
      jsonb_build_object(
        'url', '/auction/' || v_auction.id::TEXT,
        'auctionId', v_auction.id::TEXT,
        'discountPct', v_discount
      ),
      'deal_alert:' || v_auction.id::TEXT || ':' || v_user.user_id::TEXT,
      1440
    ) IS NOT NULL THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_enviar_push_oportunidade(p_auction_id UUID)
RETURNS INT
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
    SELECT 1 FROM public.users adm
    WHERE adm.id = auth.uid() AND adm.role = 'admin'::user_role
  ) THEN
    RAISE EXCEPTION 'Acesso negado: role admin necessário.';
  END IF;

  UPDATE public.auctions
  SET is_deal_highlight = true
  WHERE id = p_auction_id AND status = 'live'::auction_status;

  RETURN public.broadcast_deal_alert(p_auction_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- Jobs agendados (chamados pela Edge Function send-push)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.finalize_expired_live_auctions()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE public.auctions
  SET status = 'ended'::auction_status
  WHERE status = 'live'::auction_status
    AND ends_at <= now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_auction_ending_soon_notifications()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction RECORD;
  v_bidder UUID;
  v_count INT := 0;
BEGIN
  FOR v_auction IN
    SELECT a.id, a.title
    FROM public.auctions a
    WHERE a.status = 'live'::auction_status
      AND a.ends_at > now()
      AND a.ends_at <= now() + interval '15 minutes'
  LOOP
    FOR v_bidder IN
      SELECT DISTINCT b.bidder_id
      FROM public.bids b
      WHERE b.auction_id = v_auction.id
    LOOP
      IF public.enqueue_notification(
        v_bidder,
        'auction_ending_soon',
        'Leilão termina em breve',
        format('Faltam poucos minutos para encerrar %s. Lance agora!', v_auction.title),
        jsonb_build_object('url', '/auction/' || v_auction.id::TEXT, 'auctionId', v_auction.id::TEXT),
        'auction_ending_soon:' || v_auction.id::TEXT || ':' || v_bidder::TEXT,
        NULL
      ) IS NOT NULL THEN
        v_count := v_count + 1;
      END IF;
    END LOOP;
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
BEGIN
  v_ended := public.finalize_expired_live_auctions();
  v_soon := public.process_auction_ending_soon_notifications();

  RETURN jsonb_build_object(
    'auctions_ended', v_ended,
    'ending_soon_sent', v_soon
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Gatilhos
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_bid_outbid_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_bidder UUID;
  v_prev_amount BIGINT;
  v_title TEXT;
BEGIN
  SELECT b.bidder_id, b.amount_cents
  INTO v_prev_bidder, v_prev_amount
  FROM public.bids b
  WHERE b.auction_id = NEW.auction_id
    AND b.id <> NEW.id
  ORDER BY b.amount_cents DESC, b.created_at DESC
  LIMIT 1;

  IF v_prev_bidder IS NULL OR v_prev_bidder = NEW.bidder_id THEN
    RETURN NEW;
  END IF;

  IF NEW.amount_cents <= v_prev_amount THEN
    RETURN NEW;
  END IF;

  SELECT a.title INTO v_title FROM public.auctions a WHERE a.id = NEW.auction_id;

  PERFORM public.enqueue_notification(
    v_prev_bidder,
    'bid_outbid',
    'Lance superado',
    format(
      'Alguém ofereceu mais em %s. Lance de novo antes do fim.',
      COALESCE(v_title, 'seu leilão')
    ),
    jsonb_build_object('url', '/auction/' || NEW.auction_id::TEXT, 'auctionId', NEW.auction_id::TEXT),
    'bid_outbid:' || NEW.auction_id::TEXT || ':' || v_prev_bidder::TEXT,
    3
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bid_outbid_notify ON public.bids;
CREATE TRIGGER bid_outbid_notify
  AFTER INSERT ON public.bids
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_bid_outbid_notify();

CREATE OR REPLACE FUNCTION public.trg_auction_ended_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_winner UUID;
  v_bidder UUID;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'ended'::auction_status THEN
    SELECT b.bidder_id INTO v_winner
    FROM public.bids b
    WHERE b.auction_id = NEW.id
    ORDER BY b.amount_cents DESC, b.created_at DESC
    LIMIT 1;

    IF v_winner IS NOT NULL THEN
      PERFORM public.enqueue_notification(
        v_winner,
        'auction_won',
        'Você venceu!',
        format('%s — conclua o pagamento em até 48h.', NEW.title),
        jsonb_build_object(
          'url', '/checkout/' || NEW.id::TEXT,
          'auctionId', NEW.id::TEXT
        ),
        'auction_won:' || NEW.id::TEXT || ':' || v_winner::TEXT,
        NULL
      );

      FOR v_bidder IN
        SELECT DISTINCT b.bidder_id
        FROM public.bids b
        WHERE b.auction_id = NEW.id AND b.bidder_id <> v_winner
      LOOP
        PERFORM public.enqueue_notification(
          v_bidder,
          'auction_lost',
          'Leilão encerrado',
          format('%s foi arrematado por outro licitante.', NEW.title),
          jsonb_build_object('url', '/auction/' || NEW.id::TEXT, 'auctionId', NEW.id::TEXT),
          'auction_lost:' || NEW.id::TEXT || ':' || v_bidder::TEXT,
          NULL
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auction_ended_notify ON public.auctions;
CREATE TRIGGER auction_ended_notify
  AFTER UPDATE OF status ON public.auctions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_auction_ended_notify();

CREATE OR REPLACE FUNCTION public.trg_order_event_push_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_tracking TEXT;
BEGIN
  SELECT
    o.id,
    o.code,
    o.buyer_id,
    o.vendor_id,
    o.auction_id,
    o.tracking_code,
    COALESCE(a.title, 'seu pedido') AS auction_title
  INTO v_order
  FROM public.orders o
  LEFT JOIN public.auctions a ON a.id = o.auction_id
  WHERE o.id = NEW.order_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_tracking := COALESCE(NULLIF(btrim(v_order.tracking_code), ''), '—');

  CASE NEW.event_type
    WHEN 'pagamento_aprovado' THEN
      PERFORM public.enqueue_notification(
        v_order.buyer_id,
        'payment_confirmed',
        'Pagamento confirmado',
        format('Pagamento do pedido %s confirmado.', v_order.code),
        jsonb_build_object('url', '/order/' || v_order.id::TEXT, 'orderId', v_order.id::TEXT),
        'payment_confirmed:buyer:' || v_order.id::TEXT,
        NULL
      );
      PERFORM public.enqueue_notification(
        v_order.vendor_id,
        'payment_confirmed',
        'Pagamento recebido',
        format('O comprador pagou o pedido %s. Prepare o envio.', v_order.code),
        jsonb_build_object('url', '/order/' || v_order.id::TEXT, 'orderId', v_order.id::TEXT),
        'payment_confirmed:vendor:' || v_order.id::TEXT,
        NULL
      );
    WHEN 'envio_postado' THEN
      PERFORM public.enqueue_notification(
        v_order.buyer_id,
        'shipment_posted',
        'Pedido a caminho',
        format('Rastreio %s — acompanhe no app.', v_tracking),
        jsonb_build_object('url', '/order/' || v_order.id::TEXT, 'orderId', v_order.id::TEXT),
        'shipment_posted:' || v_order.id::TEXT,
        NULL
      );
    WHEN 'entrega_realizada' THEN
      PERFORM public.enqueue_notification(
        v_order.buyer_id,
        'delivery_confirm',
        'Confirme o recebimento',
        'O vendedor marcou entrega. Você tem 48h para confirmar ou disputar.',
        jsonb_build_object('url', '/order/' || v_order.id::TEXT, 'orderId', v_order.id::TEXT),
        'delivery_confirm:' || v_order.id::TEXT,
        NULL
      );
    WHEN 'pedido_finalizado' THEN
      PERFORM public.enqueue_notification(
        v_order.vendor_id,
        'order_delivered',
        'Comprador recebeu o item',
        format('Pedido %s finalizado com sucesso.', v_order.code),
        jsonb_build_object('url', '/order/' || v_order.id::TEXT, 'orderId', v_order.id::TEXT),
        'order_delivered:' || v_order.id::TEXT,
        NULL
      );
    WHEN 'disputa_aberta' THEN
      PERFORM public.enqueue_notification(
        v_order.buyer_id,
        'order_dispute',
        'Disputa aberta',
        format('Disputa no pedido %s — acompanhe no app.', v_order.code),
        jsonb_build_object('url', '/order/' || v_order.id::TEXT, 'orderId', v_order.id::TEXT),
        'order_dispute:buyer:' || v_order.id::TEXT,
        NULL
      );
      PERFORM public.enqueue_notification(
        v_order.vendor_id,
        'order_dispute',
        'Disputa aberta',
        format('Disputa no pedido %s — pagamento retido.', v_order.code),
        jsonb_build_object('url', '/order/' || v_order.id::TEXT, 'orderId', v_order.id::TEXT),
        'order_dispute:vendor:' || v_order.id::TEXT,
        NULL
      );
    ELSE
      NULL;
  END CASE;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_event_push_notify ON public.order_events;
CREATE TRIGGER order_event_push_notify
  AFTER INSERT ON public.order_events
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_order_event_push_notify();

CREATE OR REPLACE FUNCTION public.trg_lot_chat_message_push_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv RECORD;
  v_preview TEXT;
BEGIN
  SELECT
    c.id,
    c.order_id,
    c.vendedor_visivel,
    o.buyer_id,
    o.vendor_id
  INTO v_conv
  FROM public.lot_chat_conversations c
  JOIN public.orders o ON o.id = c.order_id
  WHERE c.id = NEW.conversation_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_preview := left(COALESCE(NULLIF(btrim(NEW.body), ''), 'Nova mensagem'), 80);

  IF NEW.sender_role = 'admin'::public.lot_chat_sender_role THEN
    PERFORM public.enqueue_notification(
      v_conv.buyer_id,
      'admin_chat_message',
      'Nova mensagem do suporte',
      v_preview,
      jsonb_build_object('url', '/my-bids/chat/' || v_conv.order_id::TEXT, 'orderId', v_conv.order_id::TEXT),
      'admin_chat:buyer:' || v_conv.id::TEXT,
      15
    );

    IF v_conv.vendedor_visivel AND v_conv.vendor_id IS NOT NULL THEN
      PERFORM public.enqueue_notification(
        v_conv.vendor_id,
        'admin_chat_message',
        'Nova mensagem do suporte',
        v_preview,
        jsonb_build_object('url', '/my-sales/chat/' || v_conv.order_id::TEXT, 'orderId', v_conv.order_id::TEXT),
        'admin_chat:vendor:' || v_conv.id::TEXT,
        15
      );
    END IF;
  ELSIF NEW.sender_role = 'vendedor'::public.lot_chat_sender_role THEN
    PERFORM public.enqueue_notification(
      v_conv.buyer_id,
      'vendor_chat_message',
      'Vendedor respondeu',
      v_preview,
      jsonb_build_object('url', '/my-bids/chat/' || v_conv.order_id::TEXT, 'orderId', v_conv.order_id::TEXT),
      'vendor_chat:' || v_conv.id::TEXT,
      15
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lot_chat_message_push_notify ON public.lot_chat_messages;
CREATE TRIGGER lot_chat_message_push_notify
  AFTER INSERT ON public.lot_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_lot_chat_message_push_notify();

CREATE OR REPLACE FUNCTION public.trg_users_kyc_push_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status_verificacao IS DISTINCT FROM OLD.status_verificacao THEN
    IF NEW.status_verificacao = 'aprovado' THEN
      PERFORM public.enqueue_notification(
        NEW.id,
        'kyc_approved',
        'Cadastro aprovado',
        'Agora você pode dar lances e publicar leilões.',
        jsonb_build_object('url', '/(tabs)'),
        'kyc_approved:' || NEW.id::TEXT,
        NULL
      );
    ELSIF NEW.status_verificacao = 'rejeitado' THEN
      PERFORM public.enqueue_notification(
        NEW.id,
        'kyc_rejected',
        'Reenvie seus documentos',
        'Seu cadastro precisa de ajustes. Toque para reenviar.',
        jsonb_build_object('url', '/kyc/cadastro'),
        'kyc_rejected:' || NEW.id::TEXT,
        NULL
      );
    ELSIF NEW.status_verificacao = 'em_analise' THEN
      PERFORM public.enqueue_notification(
        NEW.id,
        'kyc_submitted',
        'Cadastro em análise',
        'Recebemos seus documentos. Avisaremos quando a análise terminar.',
        jsonb_build_object('url', '/kyc/cadastro'),
        'kyc_submitted:' || NEW.id::TEXT,
        NULL
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_kyc_push_notify ON public.users;
CREATE TRIGGER users_kyc_push_notify
  AFTER UPDATE OF status_verificacao ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_users_kyc_push_notify();

-- ---------------------------------------------------------------------------
-- Patches em RPCs admin / moderação
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_aprovar_leilao(p_auction_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_starts TIMESTAMPTZ;
  v_ends TIMESTAMPTZ;
  v_duration INTERVAL;
  v_seller_id UUID;
  v_title TEXT;
  v_starting BIGINT;
  v_market BIGINT;
  v_discount NUMERIC;
BEGIN
  PERFORM set_config('row_security', 'off', true);

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users adm
    WHERE adm.id = auth.uid() AND adm.role = 'admin'::user_role
  ) THEN
    RAISE EXCEPTION 'Acesso negado: role admin necessário.';
  END IF;

  SELECT starts_at, ends_at, seller_id, title, starting_price_cents, estimated_market_cents
  INTO v_starts, v_ends, v_seller_id, v_title, v_starting, v_market
  FROM public.auctions
  WHERE id = p_auction_id AND status = 'draft'::auction_status
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leilão não encontrado ou não está em análise.';
  END IF;

  v_duration := GREATEST(v_ends - v_starts, interval '1 hour');

  UPDATE public.auctions
  SET
    status = 'live'::auction_status,
    starts_at = now(),
    ends_at = now() + v_duration
  WHERE id = p_auction_id;

  PERFORM public.enqueue_notification(
    v_seller_id,
    'listing_approved',
    'Seu leilão está ao vivo',
    format('%s já está recebendo lances.', v_title),
    jsonb_build_object('url', '/auction/' || p_auction_id::TEXT, 'auctionId', p_auction_id::TEXT),
    'listing_approved:' || p_auction_id::TEXT,
    NULL
  );

  IF COALESCE(v_market, 0) > 0 THEN
    v_discount := 1 - (v_starting::NUMERIC / v_market::NUMERIC);
    IF v_discount >= 0.30 THEN
      PERFORM public.broadcast_deal_alert(p_auction_id);
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_rejeitar_leilao(p_auction_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id UUID;
  v_title TEXT;
BEGIN
  PERFORM set_config('row_security', 'off', true);

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users adm
    WHERE adm.id = auth.uid() AND adm.role = 'admin'::user_role
  ) THEN
    RAISE EXCEPTION 'Acesso negado: role admin necessário.';
  END IF;

  SELECT seller_id, title INTO v_seller_id, v_title
  FROM public.auctions
  WHERE id = p_auction_id AND status = 'draft'::auction_status
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leilão não encontrado ou não está em análise.';
  END IF;

  UPDATE public.auctions
  SET status = 'cancelled'::auction_status
  WHERE id = p_auction_id;

  PERFORM public.enqueue_notification(
    v_seller_id,
    'listing_rejected',
    'Anúncio não aprovado',
    format('%s não foi aprovado pela moderação.', v_title),
    jsonb_build_object('url', '/(tabs)/create'),
    'listing_rejected:' || p_auction_id::TEXT,
    NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_atualizar_kyc_status(
  p_user_id UUID,
  p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('row_security', 'off', true);

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado. Faça login em /admin/login.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users adm
    WHERE adm.id = auth.uid() AND adm.role = 'admin'::user_role
  ) THEN
    RAISE EXCEPTION 'Acesso negado: role admin necessário.';
  END IF;

  IF p_status NOT IN ('aprovado', 'rejeitado') THEN
    RAISE EXCEPTION 'Status inválido: %', p_status;
  END IF;

  UPDATE public.users u
  SET status_verificacao = p_status
  WHERE u.id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado (id %).', p_user_id;
  END IF;
END;
$$;

-- KYC submit dispara em_analise via trigger em users (ON CONFLICT UPDATE)

REVOKE ALL ON FUNCTION public.enqueue_notification(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_notification_preferences(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.broadcast_deal_alert(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_expired_live_auctions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_auction_ending_soon_notifications() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.run_scheduled_push_jobs() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.register_push_token(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_push_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_notification_preferences() TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_notification_preference(TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_notification_inbox_lida(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_enviar_push_oportunidade(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_scheduled_push_jobs() TO service_role;
