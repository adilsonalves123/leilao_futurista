-- Painel admin: listar leilões com pedido, vencedor e lances (fluxo operacional)
-- PostgreSQL não permite CREATE OR REPLACE quando muda o RETURNS TABLE; é preciso DROP antes.

DROP FUNCTION IF EXISTS public.admin_listar_leiloes();

CREATE FUNCTION public.admin_listar_leiloes()
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  image_urls TEXT[],
  current_price_cents BIGINT,
  status TEXT,
  seller_email TEXT,
  seller_name TEXT,
  is_featured BOOLEAN,
  is_featured_plus BOOLEAN,
  created_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  order_id UUID,
  order_code TEXT,
  order_status TEXT,
  tracking_code TEXT,
  order_shipped_at TIMESTAMPTZ,
  order_delivered_at TIMESTAMPTZ,
  order_finalized_at TIMESTAMPTZ,
  winner_name TEXT,
  winner_bid_cents BIGINT,
  bid_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('row_security', 'off', true);

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado. Faça login em /admin/login.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users adm
    WHERE adm.id = auth.uid() AND adm.role = 'admin'::user_role
  ) THEN
    RAISE EXCEPTION 'Acesso negado: role admin necessário.';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.title,
    COALESCE(a.description, ''),
    a.image_urls,
    a.current_price_cents,
    a.status::TEXT,
    u.email,
    COALESCE(NULLIF(trim(u.nome_completo), ''), NULLIF(trim(u.display_name), ''), split_part(u.email, '@', 1)),
    COALESCE(a.is_featured, false),
    COALESCE(a.is_featured_plus, false),
    a.created_at,
    a.ends_at,
    ord.id,
    ord.code,
    ord.status::TEXT,
    ord.tracking_code,
    ord.shipped_at,
    ord.delivered_at,
    ord.finalized_at,
    COALESCE(
      NULLIF(trim(wb.nome_completo), ''),
      NULLIF(trim(wb.display_name), ''),
      split_part(wb.email, '@', 1)
    ),
    top_bid.amount_cents,
    COALESCE(bc.cnt, 0)::INT
  FROM public.auctions a
  JOIN public.users u ON u.id = a.seller_id
  LEFT JOIN LATERAL (
    SELECT o.id, o.code, o.status, o.tracking_code, o.shipped_at, o.delivered_at, o.finalized_at
    FROM public.orders o
    WHERE o.auction_id = a.id
    ORDER BY o.created_at DESC
    LIMIT 1
  ) ord ON true
  LEFT JOIN LATERAL (
    SELECT b.amount_cents, b.bidder_id
    FROM public.bids b
    WHERE b.auction_id = a.id
    ORDER BY b.amount_cents DESC, b.created_at DESC
    LIMIT 1
  ) top_bid ON true
  LEFT JOIN public.users wb ON wb.id = top_bid.bidder_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INT AS cnt FROM public.bids b WHERE b.auction_id = a.id
  ) bc ON true
  WHERE a.status <> 'cancelled'::auction_status
  ORDER BY
    CASE a.status
      WHEN 'draft' THEN 0
      WHEN 'live' THEN 1
      WHEN 'paused' THEN 2
      WHEN 'ended' THEN 3
      ELSE 4
    END,
    a.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_listar_leiloes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_listar_leiloes() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_obter_eventos_pedido_leilao(p_auction_id UUID)
RETURNS TABLE (
  event_id UUID,
  event_type TEXT,
  message TEXT,
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
  SELECT e.id, e.event_type, e.message, e.created_at
  FROM public.order_events e
  JOIN public.orders o ON o.id = e.order_id
  WHERE o.auction_id = p_auction_id
  ORDER BY e.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_obter_eventos_pedido_leilao(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_obter_eventos_pedido_leilao(UUID) TO authenticated;
