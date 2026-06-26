-- Chat ao vivo do leilão (mensagens públicas por auction_id)

CREATE TABLE public.live_auction_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL CHECK (char_length(trim(message)) > 0),
  is_system_message BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_live_chat_auction ON public.live_auction_messages (auction_id, created_at DESC);

ALTER TABLE public.live_auction_messages ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer autenticado pode ver chat de leilões ao vivo ou encerrados
CREATE POLICY live_auction_messages_select ON public.live_auction_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.auctions a
      WHERE a.id = auction_id
        AND a.status IN ('live'::auction_status, 'ended'::auction_status, 'paused'::auction_status)
    )
  );

-- Lista de termos proibidos (PT-BR) — normaliza acentos e espaços
CREATE OR REPLACE FUNCTION public._live_chat_normalizar_texto(p_texto TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    translate(
      btrim(COALESCE(p_texto, '')),
      'àáâãäåèéêëìíîïòóôõöùúûüçñ',
      'aaaaaaeeeeiiiioooooouuuucn'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public._live_chat_contem_palavra_proibida(p_texto TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_norm TEXT;
  v_termo TEXT;
  v_termos TEXT[] := ARRAY[
    'porra', 'caralho', 'merda', 'bosta', 'puta', 'puto', 'fdp', 'filho da puta',
    'viado', 'viada', 'buceta', 'cu', 'cuzao', 'babaca', 'idiota', 'imbecil',
    'retardado', 'otario', 'otaria', 'desgraca', 'desgracado', 'vagabundo',
    'arrombado', 'piranha', 'vadia', 'escroto', 'escrota', 'lixo humano',
    'vai se foder', 'vai tomar no cu', 'tomar no cu', 'foda-se', 'foda se',
    'se foder', 'foder', 'fodase', 'cacete', 'pau no cu', 'corno', 'corna'
  ];
BEGIN
  v_norm := public._live_chat_normalizar_texto(p_texto);
  IF v_norm = '' THEN
    RETURN false;
  END IF;

  FOREACH v_termo IN ARRAY v_termos LOOP
    IF v_norm ~ ('(^|[^a-z0-9])' || regexp_replace(v_termo, ' ', '[^a-z0-9]*', 'g') || '([^a-z0-9]|$)') THEN
      RETURN true;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public._live_chat_username(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(btrim(u.display_name), ''),
    NULLIF(btrim(u.nome_completo), ''),
    split_part(u.email, '@', 1),
    'Participante'
  )
  FROM public.users u
  WHERE u.id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public._live_chat_assert_auction_live(p_auction_id UUID)
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.auctions a
    WHERE a.id = p_auction_id AND a.status = 'live'::auction_status
  ) THEN
    RAISE EXCEPTION 'Chat disponível apenas enquanto o leilão estiver ao vivo.';
  END IF;
END;
$$;

-- Histórico recente (últimas 80 mensagens, ordem cronológica)
CREATE OR REPLACE FUNCTION public.live_chat_listar_mensagens(
  p_auction_id UUID,
  p_limit INT DEFAULT 80
)
RETURNS TABLE (
  id UUID,
  auction_id UUID,
  user_id UUID,
  username TEXT,
  message TEXT,
  is_system_message BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.auctions a
    WHERE a.id = p_auction_id AND a.status = 'live'::auction_status
  ) THEN
    RAISE EXCEPTION 'Chat disponível apenas enquanto o leilão estiver ao vivo.';
  END IF;

  RETURN QUERY
  SELECT m.id, m.auction_id, m.user_id, m.username, m.message, m.is_system_message, m.created_at
  FROM public.live_auction_messages m
  WHERE m.auction_id = p_auction_id
  ORDER BY m.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 80), 1), 200);
END;
$$;

-- Enviar mensagem de usuário (moderação no backend)
CREATE OR REPLACE FUNCTION public.live_chat_enviar_mensagem(
  p_auction_id UUID,
  p_message TEXT
)
RETURNS TABLE (
  id UUID,
  auction_id UUID,
  user_id UUID,
  username TEXT,
  message TEXT,
  is_system_message BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg TEXT;
  v_username TEXT;
  v_row public.live_auction_messages%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  PERFORM public._live_chat_assert_auction_live(p_auction_id);

  v_msg := btrim(COALESCE(p_message, ''));
  IF v_msg = '' THEN
    RAISE EXCEPTION 'Mensagem vazia.';
  END IF;

  IF char_length(v_msg) > 500 THEN
    RAISE EXCEPTION 'Mensagem muito longa (máx. 500 caracteres).';
  END IF;

  IF public._live_chat_contem_palavra_proibida(v_msg) THEN
    RAISE EXCEPTION 'Mensagem bloqueada: linguagem ofensiva não é permitida no chat ao vivo.';
  END IF;

  v_username := public._live_chat_username(auth.uid());

  INSERT INTO public.live_auction_messages (auction_id, user_id, username, message, is_system_message)
  VALUES (p_auction_id, auth.uid(), v_username, v_msg, false)
  RETURNING * INTO v_row;

  RETURN QUERY
  SELECT v_row.id, v_row.auction_id, v_row.user_id, v_row.username, v_row.message, v_row.is_system_message, v_row.created_at;
END;
$$;

-- Mensagem de sistema (narrativa de lance)
CREATE OR REPLACE FUNCTION public.live_chat_registrar_lance_sistema(
  p_auction_id UUID,
  p_amount_cents BIGINT
)
RETURNS TABLE (
  id UUID,
  auction_id UUID,
  user_id UUID,
  username TEXT,
  message TEXT,
  is_system_message BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_msg TEXT;
  v_row public.live_auction_messages%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  PERFORM public._live_chat_assert_auction_live(p_auction_id);

  v_username := public._live_chat_username(auth.uid());
  v_msg := format(
    '🔥 %s deu um lance de R$ %s',
    v_username,
    to_char(p_amount_cents / 100.0, 'FM999G999G990D00')
  );

  INSERT INTO public.live_auction_messages (auction_id, user_id, username, message, is_system_message)
  VALUES (p_auction_id, auth.uid(), 'Sistema', v_msg, true)
  RETURNING * INTO v_row;

  RETURN QUERY
  SELECT v_row.id, v_row.auction_id, v_row.user_id, v_row.username, v_row.message, v_row.is_system_message, v_row.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.live_chat_listar_mensagens(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.live_chat_listar_mensagens(UUID, INT) TO authenticated, anon;

REVOKE ALL ON FUNCTION public.live_chat_enviar_mensagem(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.live_chat_enviar_mensagem(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.live_chat_registrar_lance_sistema(UUID, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.live_chat_registrar_lance_sistema(UUID, BIGINT) TO authenticated;
