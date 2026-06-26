-- Chat de suporte in-app: conversas, mensagens e painel admin

CREATE TYPE public.support_conversation_status AS ENUM (
  'bot_ativo',
  'atendimento_humano',
  'encerrado'
);

CREATE TYPE public.support_message_role AS ENUM ('user', 'bot', 'admin');

CREATE TABLE public.support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status public.support_conversation_status NOT NULL DEFAULT 'bot_ativo',
  ultima_mensagem_preview TEXT,
  ultima_atividade_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assumido_por UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assumido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT support_conversations_user_unique UNIQUE (user_id)
);

CREATE INDEX support_conversations_ultima_atividade_idx
  ON public.support_conversations (ultima_atividade_at DESC);

CREATE TABLE public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  role public.support_message_role NOT NULL,
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX support_messages_conversation_created_idx
  ON public.support_messages (conversation_id, created_at ASC);

ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_conversations_select_own ON public.support_conversations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY support_messages_select_own ON public.support_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

-- Usuário: obter ou criar conversa
CREATE OR REPLACE FUNCTION public.suporte_obter_ou_criar_conversa()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  SELECT id INTO v_id
  FROM public.support_conversations
  WHERE user_id = auth.uid();

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.support_conversations (user_id)
  VALUES (auth.uid())
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Usuário: listar mensagens da própria conversa
CREATE OR REPLACE FUNCTION public.suporte_listar_mensagens(p_conversation_id UUID)
RETURNS TABLE (
  id UUID,
  role TEXT,
  body TEXT,
  created_at TIMESTAMPTZ
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
    SELECT 1 FROM public.support_conversations c
    WHERE c.id = p_conversation_id AND c.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Conversa não encontrada.';
  END IF;

  RETURN QUERY
  SELECT m.id, m.role::TEXT, m.body, m.created_at
  FROM public.support_messages m
  WHERE m.conversation_id = p_conversation_id
  ORDER BY m.created_at ASC;
END;
$$;

-- Usuário: enviar mensagem (não altera status)
CREATE OR REPLACE FUNCTION public.suporte_enviar_mensagem_usuario(
  p_conversation_id UUID,
  p_body TEXT
)
RETURNS public.support_conversation_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.support_conversation_status;
  v_preview TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  p_body := trim(p_body);
  IF p_body IS NULL OR p_body = '' THEN
    RAISE EXCEPTION 'Mensagem vazia.';
  END IF;

  SELECT c.status INTO v_status
  FROM public.support_conversations c
  WHERE c.id = p_conversation_id AND c.user_id = auth.uid();

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Conversa não encontrada.';
  END IF;

  v_preview := left(p_body, 120);

  INSERT INTO public.support_messages (conversation_id, role, body)
  VALUES (p_conversation_id, 'user', p_body);

  UPDATE public.support_conversations
  SET
    ultima_mensagem_preview = v_preview,
    ultima_atividade_at = now()
  WHERE id = p_conversation_id;

  RETURN v_status;
END;
$$;

-- Usuário: registrar resposta do bot
CREATE OR REPLACE FUNCTION public.suporte_registrar_mensagens_bot(
  p_conversation_id UUID,
  p_corpos TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.support_conversation_status;
  v_corpo TEXT;
  v_preview TEXT;
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

  IF v_status <> 'bot_ativo' THEN
    RETURN;
  END IF;

  FOREACH v_corpo IN ARRAY p_corpos
  LOOP
    v_corpo := trim(v_corpo);
    IF v_corpo IS NULL OR v_corpo = '' THEN
      CONTINUE;
    END IF;
    INSERT INTO public.support_messages (conversation_id, role, body)
    VALUES (p_conversation_id, 'bot', v_corpo);
    v_preview := left(v_corpo, 120);
  END LOOP;

  IF v_preview IS NOT NULL THEN
    UPDATE public.support_conversations
    SET
      ultima_mensagem_preview = v_preview,
      ultima_atividade_at = now()
    WHERE id = p_conversation_id;
  END IF;
END;
$$;

-- Usuário: status da conversa
CREATE OR REPLACE FUNCTION public.suporte_status_conversa(p_conversation_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.support_conversation_status;
BEGIN
  SELECT c.status INTO v_status
  FROM public.support_conversations c
  WHERE c.id = p_conversation_id AND c.user_id = auth.uid();

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Conversa não encontrada.';
  END IF;

  RETURN v_status::TEXT;
END;
$$;

-- Admin: listar conversas ativas
CREATE OR REPLACE FUNCTION public.admin_listar_conversas_suporte()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email TEXT,
  display_name TEXT,
  status TEXT,
  ultima_mensagem_preview TEXT,
  ultima_atividade_at TIMESTAMPTZ,
  assumido_por UUID,
  assumido_em TIMESTAMPTZ
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
    SELECT 1 FROM public.users adm
    WHERE adm.id = auth.uid() AND adm.role = 'admin'::user_role
  ) THEN
    RAISE EXCEPTION 'Acesso negado: role admin necessário.';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.user_id,
    u.email,
    u.display_name,
    c.status::TEXT,
    c.ultima_mensagem_preview,
    c.ultima_atividade_at,
    c.assumido_por,
    c.assumido_em
  FROM public.support_conversations c
  JOIN public.users u ON u.id = c.user_id
  WHERE c.status IS DISTINCT FROM 'encerrado'::public.support_conversation_status
  ORDER BY c.ultima_atividade_at DESC;
END;
$$;

-- Admin: mensagens de uma conversa
CREATE OR REPLACE FUNCTION public.admin_listar_mensagens_suporte(p_conversation_id UUID)
RETURNS TABLE (
  id UUID,
  role TEXT,
  body TEXT,
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
    SELECT 1 FROM public.users adm
    WHERE adm.id = auth.uid() AND adm.role = 'admin'::user_role
  ) THEN
    RAISE EXCEPTION 'Acesso negado: role admin necessário.';
  END IF;

  RETURN QUERY
  SELECT m.id, m.role::TEXT, m.body, m.created_at
  FROM public.support_messages m
  WHERE m.conversation_id = p_conversation_id
  ORDER BY m.created_at ASC;
END;
$$;

-- Admin: assumir atendimento humano
CREATE OR REPLACE FUNCTION public.admin_assumir_atendimento_suporte(p_conversation_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.support_conversation_status;
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

  UPDATE public.support_conversations
  SET
    status = 'atendimento_humano',
    assumido_por = auth.uid(),
    assumido_em = now(),
    ultima_atividade_at = now()
  WHERE id = p_conversation_id
  RETURNING status INTO v_status;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Conversa não encontrada.';
  END IF;

  INSERT INTO public.support_messages (conversation_id, role, body)
  VALUES (
    p_conversation_id,
    'bot',
    'Um atendente humano assumiu esta conversa. As respostas automáticas foram pausadas.'
  );

  RETURN v_status::TEXT;
END;
$$;

-- Admin: enviar mensagem
CREATE OR REPLACE FUNCTION public.admin_enviar_mensagem_suporte(
  p_conversation_id UUID,
  p_body TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.support_conversation_status;
  v_preview TEXT;
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

  p_body := trim(p_body);
  IF p_body IS NULL OR p_body = '' THEN
    RAISE EXCEPTION 'Mensagem vazia.';
  END IF;

  SELECT c.status INTO v_status
  FROM public.support_conversations c
  WHERE c.id = p_conversation_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Conversa não encontrada.';
  END IF;

  IF v_status <> 'atendimento_humano' THEN
    RAISE EXCEPTION 'Assuma o atendimento humano antes de enviar mensagens.';
  END IF;

  v_preview := left(p_body, 120);

  INSERT INTO public.support_messages (conversation_id, role, body)
  VALUES (p_conversation_id, 'admin', p_body);

  UPDATE public.support_conversations
  SET
    ultima_mensagem_preview = v_preview,
    ultima_atividade_at = now()
  WHERE id = p_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.suporte_obter_ou_criar_conversa() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.suporte_obter_ou_criar_conversa() TO authenticated;

REVOKE ALL ON FUNCTION public.suporte_listar_mensagens(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.suporte_listar_mensagens(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.suporte_enviar_mensagem_usuario(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.suporte_enviar_mensagem_usuario(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.suporte_registrar_mensagens_bot(UUID, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.suporte_registrar_mensagens_bot(UUID, TEXT[]) TO authenticated;

REVOKE ALL ON FUNCTION public.suporte_status_conversa(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.suporte_status_conversa(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_listar_conversas_suporte() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_listar_conversas_suporte() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_listar_mensagens_suporte(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_listar_mensagens_suporte(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_assumir_atendimento_suporte(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_assumir_atendimento_suporte(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_enviar_mensagem_suporte(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_enviar_mensagem_suporte(UUID, TEXT) TO authenticated;
