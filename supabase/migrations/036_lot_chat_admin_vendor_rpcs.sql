-- RPCs por order_id (admin/vendedor) + escalonamento automático do sistema

CREATE OR REPLACE FUNCTION public._lote_chat_conv_id_por_pedido(p_order_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id FROM public.lot_chat_conversations c WHERE c.order_id = p_order_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.admin_lote_chat_obter_ou_criar(p_order_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  PERFORM set_config('row_security', 'off', true);

  IF NOT EXISTS (
    SELECT 1 FROM public.users adm
    WHERE adm.id = auth.uid() AND adm.role = 'admin'::user_role
  ) THEN
    RAISE EXCEPTION 'Acesso negado: role admin necessário.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = p_order_id) THEN
    RAISE EXCEPTION 'Pedido não encontrado.';
  END IF;

  SELECT c.id INTO v_id FROM public.lot_chat_conversations c WHERE c.order_id = p_order_id;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.lot_chat_conversations (order_id)
  VALUES (p_order_id)
  RETURNING id INTO v_id;

  INSERT INTO public.lot_chat_messages (conversation_id, sender_role, body)
  VALUES
    (v_id, 'ia', 'Olá! Sou o assistente do lote arrematado. 🤖'),
    (v_id, 'ia', 'Posso ajudar com pagamento, envio, rastreio ou prazos deste pedido.'),
    (v_id, 'ia', 'Se precisar da equipe da plataforma ou do vendedor, é só pedir.');

  UPDATE public.lot_chat_conversations
  SET ultima_mensagem_preview = 'Chat do lote iniciado'
  WHERE id = v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_lote_chat_assumir_intervencao(p_order_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv UUID;
  v_nivel public.lot_chat_nivel;
BEGIN
  PERFORM set_config('row_security', 'off', true);

  IF NOT EXISTS (
    SELECT 1 FROM public.users adm
    WHERE adm.id = auth.uid() AND adm.role = 'admin'::user_role
  ) THEN
    RAISE EXCEPTION 'Acesso negado: role admin necessário.';
  END IF;

  v_conv := public.admin_lote_chat_obter_ou_criar(p_order_id);

  UPDATE public.lot_chat_conversations
  SET
    nivel = 'admin',
    escalado_admin_em = COALESCE(escalado_admin_em, now()),
    ultima_atividade_at = now()
  WHERE id = v_conv
  RETURNING nivel INTO v_nivel;

  INSERT INTO public.lot_chat_messages (conversation_id, sender_role, sender_user_id, body)
  VALUES (
    v_conv,
    'admin',
    auth.uid(),
    '⚡ Um administrador assumiu este atendimento. O assistente automático foi pausado.'
  );

  RETURN v_nivel::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.lote_chat_escalar_admin_automatico(
  p_conversation_id UUID,
  p_mensagem_sistema TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg TEXT;
BEGIN
  v_msg := btrim(COALESCE(p_mensagem_sistema, ''));
  IF v_msg = '' THEN
    v_msg := 'Conversa transferida para auditoria humana.';
  END IF;

  UPDATE public.lot_chat_conversations
  SET
    nivel = 'admin',
    escalado_admin_em = now(),
    ultima_atividade_at = now()
  WHERE id = p_conversation_id;

  INSERT INTO public.lot_chat_messages (conversation_id, sender_role, body)
  VALUES (p_conversation_id, 'ia', v_msg);

  RETURN 'admin';
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_lote_chat_escalar_vendedor_por_pedido(p_order_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv UUID;
BEGIN
  v_conv := public.admin_lote_chat_obter_ou_criar(p_order_id);
  RETURN public.admin_lote_chat_escalar_vendedor(v_conv);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_lote_chat_enviar_por_pedido(
  p_order_id UUID,
  p_body TEXT,
  p_image_url TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv UUID;
BEGIN
  v_conv := public.admin_lote_chat_obter_ou_criar(p_order_id);
  PERFORM public.admin_lote_chat_enviar(v_conv, p_body, p_image_url);
END;
$$;

CREATE OR REPLACE FUNCTION public.vendor_lote_chat_status_por_pedido(p_order_id UUID)
RETURNS TABLE (
  conversation_id UUID,
  nivel TEXT,
  vendedor_visivel BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = p_order_id AND o.vendor_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Pedido não encontrado para este vendedor.';
  END IF;

  RETURN QUERY
  SELECT c.id, c.nivel::TEXT, c.vendedor_visivel
  FROM public.lot_chat_conversations c
  WHERE c.order_id = p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.lote_chat_enviar_vendedor_por_pedido(
  p_order_id UUID,
  p_body TEXT,
  p_image_url TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv UUID;
BEGIN
  SELECT c.id INTO v_conv
  FROM public.lot_chat_conversations c
  JOIN public.orders o ON o.id = c.order_id
  WHERE c.order_id = p_order_id
    AND o.vendor_id = auth.uid()
    AND c.vendedor_visivel
    AND c.nivel = 'vendedor';

  IF v_conv IS NULL THEN
    RAISE EXCEPTION 'Chat não liberado pelo suporte.';
  END IF;

  PERFORM public.lote_chat_enviar_vendedor(v_conv, p_body, p_image_url);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_lote_chat_obter_ou_criar(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_lote_chat_obter_ou_criar(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_lote_chat_assumir_intervencao(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_lote_chat_assumir_intervencao(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.lote_chat_escalar_admin_automatico(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lote_chat_escalar_admin_automatico(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_lote_chat_escalar_vendedor_por_pedido(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_lote_chat_escalar_vendedor_por_pedido(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_lote_chat_enviar_por_pedido(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_lote_chat_enviar_por_pedido(UUID, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.vendor_lote_chat_status_por_pedido(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vendor_lote_chat_status_por_pedido(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.lote_chat_enviar_vendedor_por_pedido(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lote_chat_enviar_vendedor_por_pedido(UUID, TEXT, TEXT) TO authenticated;
