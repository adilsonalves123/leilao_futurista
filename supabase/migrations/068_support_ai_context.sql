-- Contexto para IA do chat de suporte + escalonamento para atendimento humano

CREATE OR REPLACE FUNCTION public.suporte_ai_context_bundle()
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
  v_orders JSONB := '[]'::jsonb;
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

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'code', o.code,
        'status', o.status,
        'tracking_code', o.tracking_code,
        'title', COALESCE(a.title, 'Leilão')
      )
      ORDER BY o.created_at DESC
    ),
    '[]'::jsonb
  ) INTO v_orders
  FROM (
    SELECT ord.code, ord.status, ord.tracking_code, ord.auction_id, ord.created_at
    FROM public.orders ord
    WHERE ord.buyer_id = v_uid
    ORDER BY ord.created_at DESC
    LIMIT 8
  ) o
  LEFT JOIN public.auctions a ON a.id = o.auction_id;

  RETURN jsonb_build_object(
    'ok', true,
    'generated_at', now(),
    'user', jsonb_build_object(
      'email', v_user.email,
      'display_name', COALESCE(v_user.display_name, v_user.nome_completo, split_part(v_user.email, '@', 1)),
      'kyc_status', COALESCE(v_user.status_verificacao, 'pendente')
    ),
    'wallet', jsonb_build_object(
      'available_cents', v_available,
      'hold_cents', v_hold
    ),
    'orders', v_orders
  );
END;
$$;

REVOKE ALL ON FUNCTION public.suporte_ai_context_bundle() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.suporte_ai_context_bundle() TO authenticated;

-- Usuário solicita atendimento humano (contestação de fatura, casos complexos)
CREATE OR REPLACE FUNCTION public.suporte_solicitar_atendimento_humano(p_conversation_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.support_conversation_status;
  v_protocol TEXT;
  v_msg TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  SELECT c.status INTO v_status
  FROM public.support_conversations c
  WHERE c.id = p_conversation_id AND c.user_id = auth.uid();

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Conversa não encontrada.';
  END IF;

  IF v_status = 'encerrado' THEN
    RAISE EXCEPTION 'Conversa encerrada. Abra um novo chamado.';
  END IF;

  v_protocol := 'SUP-' || upper(to_hex(extract(epoch from now())::bigint % 16777216));

  IF v_status = 'bot_ativo' THEN
    UPDATE public.support_conversations
    SET
      status = 'atendimento_humano',
      ultima_atividade_at = now()
    WHERE id = p_conversation_id;

    v_msg :=
      'Entendi — encaminhei para atendimento humano.' || E'\n\n' ||
      'Protocolo: ' || v_protocol || E'\n' ||
      'Horário: seg–sex, 9h às 18h (horário de Brasília).' || E'\n\n' ||
      'Um especialista vai analisar seu caso. Guarde o protocolo e aguarde retorno ' ||
      'pelo e-mail cadastrado ou notificações do app.';

    INSERT INTO public.support_messages (conversation_id, role, body)
    VALUES (p_conversation_id, 'bot', v_msg);

    UPDATE public.support_conversations
    SET ultima_mensagem_preview = left(v_msg, 120)
    WHERE id = p_conversation_id;
  END IF;

  RETURN v_protocol;
END;
$$;

REVOKE ALL ON FUNCTION public.suporte_solicitar_atendimento_humano(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.suporte_solicitar_atendimento_humano(UUID) TO authenticated;
