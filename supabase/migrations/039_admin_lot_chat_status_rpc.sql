-- Status do chat do lote para o painel admin (RLS não expõe conversas ao admin via SELECT direto)

CREATE OR REPLACE FUNCTION public.admin_lote_chat_status_por_pedido(p_order_id UUID)
RETURNS TABLE (
  conversation_id UUID,
  nivel TEXT,
  vendedor_visivel BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv UUID;
BEGIN
  PERFORM set_config('row_security', 'off', true);

  IF NOT EXISTS (
    SELECT 1 FROM public.users adm
    WHERE adm.id = auth.uid() AND adm.role = 'admin'::user_role
  ) THEN
    RAISE EXCEPTION 'Acesso negado: role admin necessário.';
  END IF;

  v_conv := public.admin_lote_chat_obter_ou_criar(p_order_id);

  RETURN QUERY
  SELECT c.id, c.nivel::TEXT, c.vendedor_visivel
  FROM public.lot_chat_conversations c
  WHERE c.id = v_conv;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_lote_chat_status_por_pedido(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_lote_chat_status_por_pedido(UUID) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.lot_chat_messages;
