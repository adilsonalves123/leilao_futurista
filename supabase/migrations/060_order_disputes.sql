-- Disputas estruturadas + evidências (foto/vídeo) + mediação admin

DO $enum$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dispute_status') THEN
    CREATE TYPE public.dispute_status AS ENUM (
      'aberta',
      'em_analise',
      'aguardando_resposta',
      'resolvida_comprador',
      'resolvida_vendedor',
      'cancelada'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dispute_category') THEN
    CREATE TYPE public.dispute_category AS ENUM (
      'produto_diferente',
      'produto_danificado',
      'nao_recebido',
      'incompleto',
      'outro'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dispute_party') THEN
    CREATE TYPE public.dispute_party AS ENUM ('comprador', 'vendedor', 'admin');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dispute_evidence_kind') THEN
    CREATE TYPE public.dispute_evidence_kind AS ENUM ('foto', 'video', 'documento', 'nota_admin');
  END IF;
END;
$enum$;

CREATE TABLE IF NOT EXISTS public.order_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES public.users(id),
  category public.dispute_category NOT NULL DEFAULT 'outro'::public.dispute_category,
  reason TEXT NOT NULL DEFAULT 'Disputa aberta pelo comprador.',
  status public.dispute_status NOT NULL DEFAULT 'aberta'::public.dispute_status,
  admin_notes TEXT,
  resolution_notes TEXT,
  resolved_by UUID REFERENCES public.users(id),
  resolved_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_disputes_status ON public.order_disputes(status);
CREATE INDEX IF NOT EXISTS idx_order_disputes_opened_at ON public.order_disputes(opened_at DESC);

CREATE TABLE IF NOT EXISTS public.order_dispute_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES public.order_disputes(id) ON DELETE CASCADE,
  party public.dispute_party NOT NULL,
  kind public.dispute_evidence_kind NOT NULL DEFAULT 'foto'::public.dispute_evidence_kind,
  media_url TEXT NOT NULL,
  caption TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_dispute_evidence_dispute
  ON public.order_dispute_evidence(dispute_id, created_at DESC);

ALTER TABLE public.order_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_dispute_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read order_disputes" ON public.order_disputes;
CREATE POLICY "Admin read order_disputes"
  ON public.order_disputes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'::user_role
    )
  );

DROP POLICY IF EXISTS "Parties read own order_disputes" ON public.order_disputes;
CREATE POLICY "Parties read own order_disputes"
  ON public.order_disputes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND (o.buyer_id = auth.uid() OR o.vendor_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admin read dispute evidence" ON public.order_dispute_evidence;
CREATE POLICY "Admin read dispute evidence"
  ON public.order_dispute_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'::user_role
    )
  );

DROP POLICY IF EXISTS "Parties read dispute evidence" ON public.order_dispute_evidence;
CREATE POLICY "Parties read dispute evidence"
  ON public.order_dispute_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.order_disputes d
      JOIN public.orders o ON o.id = d.order_id
      WHERE d.id = dispute_id
        AND (o.buyer_id = auth.uid() OR o.vendor_id = auth.uid())
    )
  );

-- Bucket de evidências (foto + vídeo)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dispute-evidence',
  'dispute-evidence',
  true,
  52428800,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]::text[];

DROP POLICY IF EXISTS "Dispute evidence public read" ON storage.objects;
CREATE POLICY "Dispute evidence public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dispute-evidence');

DROP POLICY IF EXISTS "Dispute evidence party upload" ON storage.objects;
CREATE POLICY "Dispute evidence party upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'dispute-evidence'
    AND auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.role = 'admin'::user_role
      )
      OR EXISTS (
        SELECT 1
        FROM public.order_disputes d
        JOIN public.orders o ON o.id = d.order_id
        WHERE d.id::text = (storage.foldername(name))[1]
          AND (o.buyer_id = auth.uid() OR o.vendor_id = auth.uid())
      )
    )
  );

CREATE OR REPLACE FUNCTION public.assert_admin_dispute()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'admin'::user_role
  ) THEN
    RAISE EXCEPTION 'Acesso negado: role admin necessário.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_listar_disputas(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  dispute_id UUID,
  order_id UUID,
  order_code TEXT,
  auction_title TEXT,
  auction_image TEXT,
  buyer_nome TEXT,
  vendor_nome TEXT,
  total_cents BIGINT,
  category TEXT,
  reason TEXT,
  status TEXT,
  evidence_count BIGINT,
  opened_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INT := GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
  v_offset INT := GREATEST(0, COALESCE(p_offset, 0));
  v_status public.dispute_status;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  PERFORM public.assert_admin_dispute();

  IF p_status IS NOT NULL AND btrim(p_status) <> '' THEN
    v_status := p_status::public.dispute_status;
  END IF;

  RETURN QUERY
  SELECT
    d.id,
    o.id,
    o.code,
    a.title,
    COALESCE(a.image_urls[1], ''),
    COALESCE(bu.nome_completo, bu.display_name, bu.email),
    COALESCE(vu.nome_completo, vu.display_name, vu.email),
    o.total_cents,
    d.category::TEXT,
    d.reason,
    d.status::TEXT,
    (
      SELECT COUNT(*) FROM public.order_dispute_evidence e WHERE e.dispute_id = d.id
    ),
    d.opened_at,
    d.updated_at
  FROM public.order_disputes d
  JOIN public.orders o ON o.id = d.order_id
  JOIN public.auctions a ON a.id = o.auction_id
  JOIN public.users bu ON bu.id = o.buyer_id
  JOIN public.users vu ON vu.id = o.vendor_id
  WHERE (v_status IS NULL OR d.status = v_status)
  ORDER BY d.opened_at DESC
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_obter_disputa(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispute public.order_disputes%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_auction public.auctions%ROWTYPE;
  v_buyer public.users%ROWTYPE;
  v_vendor public.users%ROWTYPE;
  v_evidence JSONB;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  PERFORM public.assert_admin_dispute();

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'order_not_found');
  END IF;

  SELECT * INTO v_dispute FROM public.order_disputes WHERE order_id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'dispute_not_found');
  END IF;

  SELECT * INTO v_auction FROM public.auctions WHERE id = v_order.auction_id;
  SELECT * INTO v_buyer FROM public.users WHERE id = v_order.buyer_id;
  SELECT * INTO v_vendor FROM public.users WHERE id = v_order.vendor_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', e.id,
      'party', e.party::TEXT,
      'kind', e.kind::TEXT,
      'mediaUrl', e.media_url,
      'caption', e.caption,
      'createdAt', e.created_at
    )
    ORDER BY e.created_at ASC
  ), '[]'::jsonb)
  INTO v_evidence
  FROM public.order_dispute_evidence e
  WHERE e.dispute_id = v_dispute.id;

  RETURN jsonb_build_object(
    'ok', true,
    'dispute', jsonb_build_object(
      'id', v_dispute.id,
      'orderId', v_dispute.order_id,
      'category', v_dispute.category::TEXT,
      'reason', v_dispute.reason,
      'status', v_dispute.status::TEXT,
      'adminNotes', v_dispute.admin_notes,
      'resolutionNotes', v_dispute.resolution_notes,
      'openedAt', v_dispute.opened_at,
      'updatedAt', v_dispute.updated_at,
      'resolvedAt', v_dispute.resolved_at
    ),
    'order', jsonb_build_object(
      'id', v_order.id,
      'code', v_order.code,
      'status', v_order.status::TEXT,
      'totalCents', v_order.total_cents,
      'itemCents', v_order.item_cents,
      'shippingCents', v_order.shipping_cents,
      'trackingCode', v_order.tracking_code
    ),
    'auction', jsonb_build_object(
      'id', v_auction.id,
      'title', v_auction.title,
      'imageUrl', COALESCE(v_auction.image_urls[1], '')
    ),
    'buyer', jsonb_build_object(
      'id', v_buyer.id,
      'nome', COALESCE(v_buyer.nome_completo, v_buyer.display_name, v_buyer.email),
      'email', v_buyer.email
    ),
    'vendor', jsonb_build_object(
      'id', v_vendor.id,
      'nome', COALESCE(v_vendor.nome_completo, v_vendor.display_name, v_vendor.email),
      'email', v_vendor.email
    ),
    'evidence', v_evidence
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_atualizar_disputa(
  p_dispute_id UUID,
  p_status TEXT DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('row_security', 'off', true);
  PERFORM public.assert_admin_dispute();

  UPDATE public.order_disputes
  SET
    status = COALESCE(p_status::public.dispute_status, status),
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    updated_at = now()
  WHERE id = p_dispute_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Disputa não encontrada.';
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_adicionar_evidencia_disputa(
  p_dispute_id UUID,
  p_party TEXT,
  p_kind TEXT,
  p_media_url TEXT,
  p_caption TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  PERFORM public.assert_admin_dispute();

  INSERT INTO public.order_dispute_evidence (
    dispute_id, party, kind, media_url, caption, created_by
  )
  VALUES (
    p_dispute_id,
    p_party::public.dispute_party,
    p_kind::public.dispute_evidence_kind,
    p_media_url,
    NULLIF(btrim(COALESCE(p_caption, '')), ''),
    auth.uid()
  )
  RETURNING id INTO v_id;

  UPDATE public.order_disputes SET updated_at = now() WHERE id = p_dispute_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_resolver_disputa(
  p_dispute_id UUID,
  p_favor TEXT,
  p_notes TEXT DEFAULT NULL,
  p_debitar_garantia_cents BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispute public.order_disputes%ROWTYPE;
  v_new_status public.dispute_status;
  v_order_status public.order_status;
  v_event_type TEXT;
  v_event_msg TEXT;
  v_debit JSONB;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  PERFORM public.assert_admin_dispute();

  SELECT * INTO v_dispute FROM public.order_disputes WHERE id = p_dispute_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Disputa não encontrada.';
  END IF;

  IF p_favor = 'comprador' THEN
    v_new_status := 'resolvida_comprador'::public.dispute_status;
    v_order_status := 'estornado'::public.order_status;
    v_event_type := 'disputa_resolvida_comprador';
    v_event_msg := COALESCE(p_notes, 'Mediação: valor devolvido ao comprador.');
  ELSIF p_favor = 'vendedor' THEN
    v_new_status := 'resolvida_vendedor'::public.dispute_status;
    v_order_status := 'finalizado'::public.order_status;
    v_event_type := 'disputa_resolvida_vendedor';
    v_event_msg := COALESCE(p_notes, 'Mediação: pedido liberado ao vendedor.');
  ELSE
    RAISE EXCEPTION 'Favor inválido. Use comprador ou vendedor.';
  END IF;

  PERFORM public.update_order_status(
    v_dispute.order_id,
    v_order_status,
    NULL,
    v_event_type,
    v_event_msg
  );

  IF p_favor = 'comprador' AND COALESCE(p_debitar_garantia_cents, 0) > 0 THEN
    v_debit := public.debitar_garantia_disputa(
      v_dispute.order_id,
      p_debitar_garantia_cents,
      'disputa_resolvida_comprador'
    );
  END IF;

  UPDATE public.order_disputes
  SET
    status = v_new_status,
    resolution_notes = COALESCE(p_notes, resolution_notes),
    resolved_by = auth.uid(),
    resolved_at = now(),
    updated_at = now()
  WHERE id = p_dispute_id;

  RETURN jsonb_build_object(
    'ok', true,
    'disputeId', p_dispute_id,
    'favor', p_favor,
    'debit', v_debit
  );
END;
$$;

-- Sincroniza pedidos já em disputa (legado) para a nova tabela
INSERT INTO public.order_disputes (order_id, opened_by, reason, status, opened_at, updated_at)
SELECT
  o.id,
  o.buyer_id,
  COALESCE(
    (
      SELECT e.message
      FROM public.order_events e
      WHERE e.order_id = o.id AND e.event_type = 'disputa_aberta'
      ORDER BY e.created_at DESC
      LIMIT 1
    ),
    'Disputa aberta — aguardando mediação.'
  ),
  'aberta'::public.dispute_status,
  COALESCE(
    (
      SELECT e.created_at
      FROM public.order_events e
      WHERE e.order_id = o.id AND e.event_type = 'disputa_aberta'
      ORDER BY e.created_at DESC
      LIMIT 1
    ),
    o.updated_at
  ),
  o.updated_at
FROM public.orders o
WHERE o.status = 'em_disputa'::public.order_status
ON CONFLICT (order_id) DO NOTHING;

REVOKE ALL ON FUNCTION public.assert_admin_dispute() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_listar_disputas(TEXT, INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_obter_disputa(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_atualizar_disputa(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_adicionar_evidencia_disputa(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_resolver_disputa(UUID, TEXT, TEXT, BIGINT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_listar_disputas(TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_obter_disputa(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_atualizar_disputa(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adicionar_evidencia_disputa(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolver_disputa(UUID, TEXT, TEXT, BIGINT) TO authenticated;
