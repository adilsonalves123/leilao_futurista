-- Chat privado do lote arrematado (comprador ↔ IA → admin → vendedor)
-- Um chat por pedido (order)

CREATE TYPE public.lot_chat_nivel AS ENUM ('ia', 'admin', 'vendedor');

CREATE TYPE public.lot_chat_sender_role AS ENUM ('comprador', 'ia', 'admin', 'vendedor');

CREATE TABLE public.lot_chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  nivel public.lot_chat_nivel NOT NULL DEFAULT 'ia',
  vendedor_visivel BOOLEAN NOT NULL DEFAULT false,
  ultima_mensagem_preview TEXT,
  ultima_atividade_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  escalado_admin_em TIMESTAMPTZ,
  escalado_vendedor_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lot_chat_conversations_order_unique UNIQUE (order_id)
);

CREATE INDEX lot_chat_conversations_ultima_atividade_idx
  ON public.lot_chat_conversations (ultima_atividade_at DESC);

CREATE TABLE public.lot_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.lot_chat_conversations(id) ON DELETE CASCADE,
  sender_role public.lot_chat_sender_role NOT NULL,
  sender_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lot_chat_messages_body_or_image_check CHECK (
    (image_url IS NOT NULL AND btrim(image_url) <> '')
    OR (body IS NOT NULL AND char_length(btrim(body)) > 0)
  )
);

CREATE INDEX lot_chat_messages_conversation_created_idx
  ON public.lot_chat_messages (conversation_id, created_at ASC);

ALTER TABLE public.lot_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lot_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY lot_chat_conversations_buyer_select ON public.lot_chat_conversations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.buyer_id = auth.uid()
    )
  );

CREATE POLICY lot_chat_conversations_vendor_select ON public.lot_chat_conversations
  FOR SELECT TO authenticated
  USING (
    vendedor_visivel
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.vendor_id = auth.uid()
    )
  );

CREATE POLICY lot_chat_messages_buyer_select ON public.lot_chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lot_chat_conversations c
      JOIN public.orders o ON o.id = c.order_id
      WHERE c.id = conversation_id AND o.buyer_id = auth.uid()
    )
  );

CREATE POLICY lot_chat_messages_vendor_select ON public.lot_chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lot_chat_conversations c
      JOIN public.orders o ON o.id = c.order_id
      WHERE c.id = conversation_id
        AND c.vendedor_visivel
        AND o.vendor_id = auth.uid()
    )
  );

-- Storage fotos do chat do lote
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lot-chat',
  'lot-chat',
  true,
  6291456,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 6291456,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];

DROP POLICY IF EXISTS "Lot chat images public read" ON storage.objects;
CREATE POLICY "Lot chat images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lot-chat');

DROP POLICY IF EXISTS "Lot chat buyer upload" ON storage.objects;
CREATE POLICY "Lot chat buyer upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'lot-chat'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Helper: valida comprador do pedido
CREATE OR REPLACE FUNCTION public._lote_chat_validar_comprador_pedido(p_order_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  SELECT o.buyer_id INTO v_buyer
  FROM public.orders o
  WHERE o.id = p_order_id;

  IF v_buyer IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado.';
  END IF;

  IF v_buyer <> auth.uid() THEN
    RAISE EXCEPTION 'Acesso negado: este pedido não é seu.';
  END IF;

  RETURN v_buyer;
END;
$$;

CREATE OR REPLACE FUNCTION public.lote_chat_obter_ou_criar(p_order_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  PERFORM public._lote_chat_validar_comprador_pedido(p_order_id);

  SELECT c.id INTO v_id
  FROM public.lot_chat_conversations c
  WHERE c.order_id = p_order_id;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.lot_chat_conversations (order_id)
  VALUES (p_order_id)
  RETURNING id INTO v_id;

  INSERT INTO public.lot_chat_messages (conversation_id, sender_role, body)
  VALUES
    (v_id, 'ia', 'Olá! Sou o assistente do seu lote arrematado. 🤖'),
    (v_id, 'ia', 'Posso ajudar com pagamento, envio, rastreio ou prazos deste pedido.'),
    (v_id, 'ia', 'Se precisar da equipe da plataforma ou do vendedor, é só pedir.');

  UPDATE public.lot_chat_conversations
  SET ultima_mensagem_preview = 'Assistente do lote disponível'
  WHERE id = v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.lote_chat_listar_mensagens(p_conversation_id UUID)
RETURNS TABLE (
  id UUID,
  sender_role TEXT,
  sender_user_id UUID,
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
    SELECT 1
    FROM public.lot_chat_conversations c
    JOIN public.orders o ON o.id = c.order_id
    WHERE c.id = p_conversation_id
      AND (
        o.buyer_id = auth.uid()
        OR (c.vendedor_visivel AND o.vendor_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.users adm
          WHERE adm.id = auth.uid() AND adm.role = 'admin'::user_role
        )
      )
  ) THEN
    RAISE EXCEPTION 'Conversa não encontrada.';
  END IF;

  RETURN QUERY
  SELECT m.id, m.sender_role::TEXT, m.sender_user_id, m.body, m.image_url, m.created_at
  FROM public.lot_chat_messages m
  WHERE m.conversation_id = p_conversation_id
  ORDER BY m.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.lote_chat_status_conversa(p_conversation_id UUID)
RETURNS TABLE (
  nivel TEXT,
  vendedor_visivel BOOLEAN,
  order_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.lot_chat_conversations c WHERE c.id = p_conversation_id
  ) THEN
    RAISE EXCEPTION 'Conversa não encontrada.';
  END IF;

  PERFORM public._lote_chat_validar_comprador_pedido(
    (SELECT c.order_id FROM public.lot_chat_conversations c WHERE c.id = p_conversation_id)
  );

  RETURN QUERY
  SELECT c.nivel::TEXT, c.vendedor_visivel, c.order_id
  FROM public.lot_chat_conversations c
  WHERE c.id = p_conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.lote_chat_enviar_comprador(
  p_conversation_id UUID,
  p_body TEXT,
  p_image_url TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nivel public.lot_chat_nivel;
  v_body TEXT;
  v_preview TEXT;
  v_order_id UUID;
BEGIN
  SELECT c.nivel, c.order_id INTO v_nivel, v_order_id
  FROM public.lot_chat_conversations c
  WHERE c.id = p_conversation_id;

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'Conversa não encontrada.';
  END IF;

  PERFORM public._lote_chat_validar_comprador_pedido(v_order_id);

  v_body := btrim(COALESCE(p_body, ''));
  p_image_url := NULLIF(btrim(COALESCE(p_image_url, '')), '');

  IF v_body = '' AND p_image_url IS NULL THEN
    RAISE EXCEPTION 'Mensagem vazia.';
  END IF;

  IF v_body = '' THEN
    v_body := '📷 Foto enviada';
  END IF;

  v_preview := left(v_body, 120);

  INSERT INTO public.lot_chat_messages (conversation_id, sender_role, sender_user_id, body, image_url)
  VALUES (p_conversation_id, 'comprador', auth.uid(), v_body, p_image_url);

  UPDATE public.lot_chat_conversations
  SET
    ultima_mensagem_preview = v_preview,
    ultima_atividade_at = now()
  WHERE id = p_conversation_id;

  RETURN v_nivel::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.lote_chat_registrar_ia(
  p_conversation_id UUID,
  p_corpos TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nivel public.lot_chat_nivel;
  v_corpo TEXT;
  v_preview TEXT;
  v_order_id UUID;
BEGIN
  SELECT c.nivel, c.order_id INTO v_nivel, v_order_id
  FROM public.lot_chat_conversations c
  WHERE c.id = p_conversation_id;

  PERFORM public._lote_chat_validar_comprador_pedido(v_order_id);

  IF v_nivel <> 'ia' THEN
    RETURN;
  END IF;

  FOREACH v_corpo IN ARRAY p_corpos
  LOOP
    v_corpo := btrim(v_corpo);
    IF v_corpo = '' THEN CONTINUE; END IF;
    INSERT INTO public.lot_chat_messages (conversation_id, sender_role, body)
    VALUES (p_conversation_id, 'ia', v_corpo);
    v_preview := left(v_corpo, 120);
  END LOOP;

  IF v_preview IS NOT NULL THEN
    UPDATE public.lot_chat_conversations
    SET ultima_mensagem_preview = v_preview, ultima_atividade_at = now()
    WHERE id = p_conversation_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.lote_chat_escalar_admin(p_conversation_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
BEGIN
  SELECT c.order_id INTO v_order_id
  FROM public.lot_chat_conversations c
  WHERE c.id = p_conversation_id;

  PERFORM public._lote_chat_validar_comprador_pedido(v_order_id);

  UPDATE public.lot_chat_conversations
  SET
    nivel = 'admin',
    escalado_admin_em = now(),
    ultima_atividade_at = now()
  WHERE id = p_conversation_id AND nivel = 'ia';

  INSERT INTO public.lot_chat_messages (conversation_id, sender_role, body)
  VALUES (
    p_conversation_id,
    'ia',
    'Encaminhei sua conversa para um atendente da plataforma. O assistente automático foi pausado.'
  );

  RETURN 'admin';
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_lote_chat_escalar_vendedor(p_conversation_id UUID)
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

  UPDATE public.lot_chat_conversations
  SET
    nivel = 'vendedor',
    vendedor_visivel = true,
    escalado_vendedor_em = now(),
    ultima_atividade_at = now()
  WHERE id = p_conversation_id;

  INSERT INTO public.lot_chat_messages (conversation_id, sender_role, sender_user_id, body)
  VALUES (
    p_conversation_id,
    'admin',
    auth.uid(),
    'O vendedor deste lote foi incluído nesta conversa e pode responder em breve.'
  );

  RETURN 'vendedor';
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_lote_chat_enviar(
  p_conversation_id UUID,
  p_body TEXT,
  p_image_url TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nivel public.lot_chat_nivel;
  v_body TEXT;
  v_preview TEXT;
BEGIN
  PERFORM set_config('row_security', 'off', true);

  IF NOT EXISTS (
    SELECT 1 FROM public.users adm
    WHERE adm.id = auth.uid() AND adm.role = 'admin'::user_role
  ) THEN
    RAISE EXCEPTION 'Acesso negado: role admin necessário.';
  END IF;

  SELECT c.nivel INTO v_nivel FROM public.lot_chat_conversations c WHERE c.id = p_conversation_id;
  IF v_nivel IS NULL OR v_nivel = 'ia' THEN
    RAISE EXCEPTION 'Assuma o atendimento (nível admin) antes de enviar.';
  END IF;

  v_body := btrim(COALESCE(p_body, ''));
  p_image_url := NULLIF(btrim(COALESCE(p_image_url, '')), '');
  IF v_body = '' AND p_image_url IS NULL THEN
    RAISE EXCEPTION 'Mensagem vazia.';
  END IF;
  IF v_body = '' THEN v_body := '📷 Foto enviada'; END IF;

  v_preview := left(v_body, 120);

  INSERT INTO public.lot_chat_messages (conversation_id, sender_role, sender_user_id, body, image_url)
  VALUES (p_conversation_id, 'admin', auth.uid(), v_body, p_image_url);

  UPDATE public.lot_chat_conversations
  SET ultima_mensagem_preview = v_preview, ultima_atividade_at = now()
  WHERE id = p_conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.lote_chat_enviar_vendedor(
  p_conversation_id UUID,
  p_body TEXT,
  p_image_url TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_body TEXT;
  v_preview TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.lot_chat_conversations c
    JOIN public.orders o ON o.id = c.order_id
    WHERE c.id = p_conversation_id
      AND c.vendedor_visivel
      AND c.nivel = 'vendedor'
      AND o.vendor_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Vendedor não autorizado nesta conversa.';
  END IF;

  v_body := btrim(COALESCE(p_body, ''));
  p_image_url := NULLIF(btrim(COALESCE(p_image_url, '')), '');
  IF v_body = '' AND p_image_url IS NULL THEN
    RAISE EXCEPTION 'Mensagem vazia.';
  END IF;
  IF v_body = '' THEN v_body := '📷 Foto enviada'; END IF;

  v_preview := left(v_body, 120);

  INSERT INTO public.lot_chat_messages (conversation_id, sender_role, sender_user_id, body, image_url)
  VALUES (p_conversation_id, 'vendedor', auth.uid(), v_body, p_image_url);

  UPDATE public.lot_chat_conversations
  SET ultima_mensagem_preview = v_preview, ultima_atividade_at = now()
  WHERE id = p_conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_lote_chat_obter_por_pedido(p_order_id UUID)
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

  SELECT c.id INTO v_id FROM public.lot_chat_conversations c WHERE c.order_id = p_order_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.lote_chat_obter_ou_criar(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lote_chat_obter_ou_criar(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.lote_chat_listar_mensagens(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lote_chat_listar_mensagens(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.lote_chat_status_conversa(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lote_chat_status_conversa(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.lote_chat_enviar_comprador(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lote_chat_enviar_comprador(UUID, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.lote_chat_registrar_ia(UUID, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lote_chat_registrar_ia(UUID, TEXT[]) TO authenticated;

REVOKE ALL ON FUNCTION public.lote_chat_escalar_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lote_chat_escalar_admin(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.lote_chat_enviar_vendedor(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lote_chat_enviar_vendedor(UUID, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_lote_chat_escalar_vendedor(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_lote_chat_escalar_vendedor(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_lote_chat_enviar(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_lote_chat_enviar(UUID, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_lote_chat_obter_por_pedido(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_lote_chat_obter_por_pedido(UUID) TO authenticated;
