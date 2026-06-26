-- Admin remove vendedor da conversa tripartite (volta ao modo admin)

CREATE OR REPLACE FUNCTION public.admin_lote_chat_remover_vendedor(p_conversation_id UUID)
RETURNS TEXT
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

  IF NOT EXISTS (
    SELECT 1 FROM public.lot_chat_conversations c
    WHERE c.id = p_conversation_id AND c.vendedor_visivel AND c.nivel = 'vendedor'
  ) THEN
    RAISE EXCEPTION 'Vendedor não está ativo nesta conversa.';
  END IF;

  UPDATE public.lot_chat_conversations
  SET
    nivel = 'admin',
    vendedor_visivel = false,
    ultima_atividade_at = now()
  WHERE id = p_conversation_id;

  INSERT INTO public.lot_chat_messages (conversation_id, sender_role, sender_user_id, body)
  VALUES (
    p_conversation_id,
    'admin',
    auth.uid(),
    'O vendedor foi removido desta conversa. O atendimento continua apenas com a plataforma.'
  );

  RETURN 'admin';
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_lote_chat_remover_vendedor_por_pedido(p_order_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv UUID;
BEGIN
  v_conv := public.admin_lote_chat_obter_ou_criar(p_order_id);
  RETURN public.admin_lote_chat_remover_vendedor(v_conv);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_lote_chat_remover_vendedor(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_lote_chat_remover_vendedor(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_lote_chat_remover_vendedor_por_pedido(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_lote_chat_remover_vendedor_por_pedido(UUID) TO authenticated;
