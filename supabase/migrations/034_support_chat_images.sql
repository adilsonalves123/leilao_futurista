-- Fotos no chat de suporte (usuário → admin)

ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.support_messages
  DROP CONSTRAINT IF EXISTS support_messages_body_check;

ALTER TABLE public.support_messages
  ADD CONSTRAINT support_messages_body_or_image_check CHECK (
    (image_url IS NOT NULL AND btrim(image_url) <> '')
    OR (body IS NOT NULL AND char_length(btrim(body)) > 0)
  );

-- Bucket storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-chat',
  'support-chat',
  true,
  6291456,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 6291456,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];

DROP POLICY IF EXISTS "Support chat images public read" ON storage.objects;
CREATE POLICY "Support chat images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'support-chat');

DROP POLICY IF EXISTS "Support chat user upload" ON storage.objects;
CREATE POLICY "Support chat user upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'support-chat'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Support chat user update own" ON storage.objects;
CREATE POLICY "Support chat user update own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'support-chat'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'support-chat'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Support chat admin read all" ON storage.objects;
CREATE POLICY "Support chat admin read all"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'support-chat'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'::user_role
    )
  );

-- PostgreSQL não permite alterar RETURNS TABLE / assinatura só com CREATE OR REPLACE
DROP FUNCTION IF EXISTS public.suporte_listar_mensagens(UUID);
DROP FUNCTION IF EXISTS public.admin_listar_mensagens_suporte(UUID);
DROP FUNCTION IF EXISTS public.suporte_enviar_mensagem_usuario(UUID, TEXT);
DROP FUNCTION IF EXISTS public.suporte_enviar_mensagem_usuario(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.suporte_enviar_mensagem_usuario(
  p_conversation_id UUID,
  p_body TEXT,
  p_image_url TEXT DEFAULT NULL
)
RETURNS public.support_conversation_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.support_conversation_status;
  v_preview TEXT;
  v_body TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  v_body := btrim(COALESCE(p_body, ''));
  p_image_url := NULLIF(btrim(COALESCE(p_image_url, '')), '');

  IF v_body = '' AND p_image_url IS NULL THEN
    RAISE EXCEPTION 'Mensagem vazia.';
  END IF;

  IF v_body = '' THEN
    v_body := '📷 Foto enviada';
  END IF;

  SELECT c.status INTO v_status
  FROM public.support_conversations c
  WHERE c.id = p_conversation_id AND c.user_id = auth.uid();

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Conversa não encontrada.';
  END IF;

  v_preview := left(v_body, 120);

  INSERT INTO public.support_messages (conversation_id, role, body, image_url)
  VALUES (p_conversation_id, 'user', v_body, p_image_url);

  UPDATE public.support_conversations
  SET
    ultima_mensagem_preview = v_preview,
    ultima_atividade_at = now()
  WHERE id = p_conversation_id;

  RETURN v_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.suporte_listar_mensagens(p_conversation_id UUID)
RETURNS TABLE (
  id UUID,
  role TEXT,
  body TEXT,
  image_url TEXT,
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
  SELECT m.id, m.role::TEXT, m.body, m.image_url, m.created_at
  FROM public.support_messages m
  WHERE m.conversation_id = p_conversation_id
  ORDER BY m.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_listar_mensagens_suporte(p_conversation_id UUID)
RETURNS TABLE (
  id UUID,
  role TEXT,
  body TEXT,
  image_url TEXT,
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
  SELECT m.id, m.role::TEXT, m.body, m.image_url, m.created_at
  FROM public.support_messages m
  WHERE m.conversation_id = p_conversation_id
  ORDER BY m.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.suporte_enviar_mensagem_usuario(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.suporte_enviar_mensagem_usuario(UUID, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.suporte_listar_mensagens(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.suporte_listar_mensagens(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_listar_mensagens_suporte(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_listar_mensagens_suporte(UUID) TO authenticated;
