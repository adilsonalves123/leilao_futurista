-- Encerramento por inatividade e reinício de chamado de suporte

CREATE OR REPLACE FUNCTION public.suporte_encerrar_por_inatividade(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.support_conversation_status;
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
    RETURN;
  END IF;

  UPDATE public.support_conversations
  SET
    status = 'encerrado',
    ultima_mensagem_preview = 'Chat encerrado por inatividade',
    ultima_atividade_at = now()
  WHERE id = p_conversation_id;

  INSERT INTO public.support_messages (conversation_id, role, body)
  VALUES (
    p_conversation_id,
    'bot',
    'Este chat foi encerrado por inatividade (5 minutos sem resposta sua). Toque em "Novo chamado" para falar com o suporte novamente.'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.suporte_reiniciar_chamado()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_status public.support_conversation_status;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  SELECT id, status INTO v_id, v_status
  FROM public.support_conversations
  WHERE user_id = auth.uid();

  IF v_id IS NULL THEN
    INSERT INTO public.support_conversations (user_id)
    VALUES (auth.uid())
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  IF v_status IS DISTINCT FROM 'encerrado' THEN
    RAISE EXCEPTION 'O chamado atual ainda está ativo.';
  END IF;

  DELETE FROM public.support_messages WHERE conversation_id = v_id;

  UPDATE public.support_conversations
  SET
    status = 'bot_ativo',
    assumido_por = NULL,
    assumido_em = NULL,
    ultima_mensagem_preview = NULL,
    ultima_atividade_at = now()
  WHERE id = v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.suporte_encerrar_por_inatividade(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.suporte_encerrar_por_inatividade(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.suporte_reiniciar_chamado() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.suporte_reiniciar_chamado() TO authenticated;
