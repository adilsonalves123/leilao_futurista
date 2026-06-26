-- Fase 5: Assistente admin (Adilson) — sessões e histórico

CREATE TABLE IF NOT EXISTS public.admin_ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Assistente Adilson',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_ai_sessions_admin_updated_idx
  ON public.admin_ai_sessions (admin_user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.admin_ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.admin_ai_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_ai_messages_session_created_idx
  ON public.admin_ai_messages (session_id, created_at ASC);

CREATE OR REPLACE FUNCTION public.admin_ai_touch_session_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.admin_ai_sessions
  SET updated_at = now()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_ai_messages_touch_session ON public.admin_ai_messages;
CREATE TRIGGER admin_ai_messages_touch_session
  AFTER INSERT ON public.admin_ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.admin_ai_touch_session_updated_at();

ALTER TABLE public.admin_ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_ai_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_ai_sessions_select_own ON public.admin_ai_sessions;
CREATE POLICY admin_ai_sessions_select_own ON public.admin_ai_sessions
  FOR SELECT TO authenticated
  USING (admin_user_id = auth.uid() AND public.auth_is_admin());

DROP POLICY IF EXISTS admin_ai_messages_select_own ON public.admin_ai_messages;
CREATE POLICY admin_ai_messages_select_own ON public.admin_ai_messages
  FOR SELECT TO authenticated
  USING (
    public.auth_is_admin()
    AND EXISTS (
      SELECT 1 FROM public.admin_ai_sessions s
      WHERE s.id = session_id AND s.admin_user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.admin_ai_obter_ou_criar_sessao()
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

  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: role admin necessário.';
  END IF;

  SELECT s.id INTO v_id
  FROM public.admin_ai_sessions s
  WHERE s.admin_user_id = auth.uid()
  ORDER BY s.updated_at DESC
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.admin_ai_sessions (admin_user_id)
  VALUES (auth.uid())
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_ai_listar_mensagens(p_session_id UUID)
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

  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: role admin necessário.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.admin_ai_sessions s
    WHERE s.id = p_session_id AND s.admin_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sessão não encontrada.';
  END IF;

  RETURN QUERY
  SELECT m.id, m.role, m.body, m.metadata, m.created_at
  FROM public.admin_ai_messages m
  WHERE m.session_id = p_session_id
  ORDER BY m.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_ai_persistir_mensagens(
  p_session_id UUID,
  p_admin_user_id UUID,
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
    SELECT 1 FROM public.admin_ai_sessions s
    WHERE s.id = p_session_id AND s.admin_user_id = p_admin_user_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'session_not_found');
  END IF;

  IF p_user_body IS NOT NULL AND btrim(p_user_body) <> '' THEN
    INSERT INTO public.admin_ai_messages (session_id, role, body)
    VALUES (p_session_id, 'user', btrim(p_user_body))
    RETURNING id INTO v_user_msg_id;
  END IF;

  IF p_assistant_body IS NOT NULL AND btrim(p_assistant_body) <> '' THEN
    INSERT INTO public.admin_ai_messages (session_id, role, body, metadata)
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

REVOKE ALL ON FUNCTION public.admin_ai_obter_ou_criar_sessao() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_ai_listar_mensagens(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_ai_persistir_mensagens(UUID, UUID, TEXT, TEXT, JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_ai_obter_ou_criar_sessao() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ai_listar_mensagens(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ai_persistir_mensagens(UUID, UUID, TEXT, TEXT, JSONB) TO service_role;
