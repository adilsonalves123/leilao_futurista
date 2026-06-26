-- Painel admin: resumo, fila de push e reenvio

CREATE OR REPLACE FUNCTION public.admin_resumo_push(p_days INT DEFAULT 7)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days INT := GREATEST(1, LEAST(COALESCE(p_days, 7), 90));
  v_since TIMESTAMPTZ := now() - (v_days || ' days')::interval;
  v_pending BIGINT;
  v_sent BIGINT;
  v_failed BIGINT;
  v_skipped BIGINT;
  v_tokens BIGINT;
  v_marketing BIGINT;
  v_inbox_unread BIGINT;
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

  SELECT COUNT(*) INTO v_pending
  FROM public.notification_outbox o
  WHERE o.status = 'pending'::public.notification_outbox_status;

  SELECT COUNT(*) INTO v_sent
  FROM public.notification_outbox o
  WHERE o.status = 'sent'::public.notification_outbox_status
    AND o.created_at >= v_since;

  SELECT COUNT(*) INTO v_failed
  FROM public.notification_outbox o
  WHERE o.status = 'failed'::public.notification_outbox_status
    AND o.created_at >= v_since;

  SELECT COUNT(*) INTO v_skipped
  FROM public.notification_outbox o
  WHERE o.status = 'skipped'::public.notification_outbox_status
    AND o.created_at >= v_since;

  SELECT COUNT(DISTINCT t.user_id) INTO v_tokens
  FROM public.user_push_tokens t
  WHERE t.active = true;

  SELECT COUNT(*) INTO v_marketing
  FROM public.notification_preferences np
  WHERE np.category = 'marketing'::public.notification_category
    AND np.enabled = true;

  SELECT COUNT(*) INTO v_inbox_unread
  FROM public.notification_inbox i
  WHERE i.read_at IS NULL
    AND i.created_at >= v_since;

  RETURN jsonb_build_object(
    'days', v_days,
    'pending', v_pending,
    'sent', v_sent,
    'failed', v_failed,
    'skipped', v_skipped,
    'active_tokens', v_tokens,
    'marketing_opt_in', v_marketing,
    'inbox_unread', v_inbox_unread
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_listar_notification_outbox(
  p_status TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_email TEXT,
  notification_type TEXT,
  title TEXT,
  body TEXT,
  status TEXT,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INT := GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
  v_offset INT := GREATEST(0, COALESCE(p_offset, 0));
  v_status public.notification_outbox_status;
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

  IF p_status IS NOT NULL AND btrim(p_status) <> '' THEN
    v_status := p_status::public.notification_outbox_status;
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.user_id,
    u.email,
    o.notification_type,
    o.title,
    o.body,
    o.status::TEXT,
    o.last_error,
    o.sent_at,
    o.created_at
  FROM public.notification_outbox o
  JOIN public.users u ON u.id = o.user_id
  WHERE (v_status IS NULL OR o.status = v_status)
    AND (
      p_type IS NULL
      OR btrim(p_type) = ''
      OR o.notification_type = btrim(p_type)
    )
  ORDER BY o.created_at DESC
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_requeue_notification_outbox(p_outbox_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.notification_outbox%ROWTYPE;
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

  SELECT * INTO v_row
  FROM public.notification_outbox o
  WHERE o.id = p_outbox_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notificação não encontrada.';
  END IF;

  IF v_row.status NOT IN ('failed'::public.notification_outbox_status, 'skipped'::public.notification_outbox_status) THEN
    RAISE EXCEPTION 'Só é possível reenviar itens com status failed ou skipped.';
  END IF;

  UPDATE public.notification_outbox
  SET
    status = 'pending'::public.notification_outbox_status,
    last_error = NULL,
    sent_at = NULL
  WHERE id = p_outbox_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resumo_push(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_listar_notification_outbox(TEXT, TEXT, INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_requeue_notification_outbox(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_resumo_push(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_listar_notification_outbox(TEXT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_requeue_notification_outbox(UUID) TO authenticated;
