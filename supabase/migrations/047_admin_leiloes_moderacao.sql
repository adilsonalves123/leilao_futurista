-- Painel admin: listar leilões e aprovar/rejeitar rascunhos (status draft)

CREATE OR REPLACE FUNCTION public.admin_listar_leiloes()
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
  ends_at TIMESTAMPTZ
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
    a.ends_at
  FROM public.auctions a
  JOIN public.users u ON u.id = a.seller_id
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

CREATE OR REPLACE FUNCTION public.admin_aprovar_leilao(p_auction_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_starts TIMESTAMPTZ;
  v_ends TIMESTAMPTZ;
  v_duration INTERVAL;
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

  SELECT starts_at, ends_at INTO v_starts, v_ends
  FROM public.auctions
  WHERE id = p_auction_id AND status = 'draft'::auction_status
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leilão não encontrado ou não está em análise.';
  END IF;

  v_duration := GREATEST(v_ends - v_starts, interval '1 hour');

  UPDATE public.auctions
  SET
    status = 'live'::auction_status,
    starts_at = now(),
    ends_at = now() + v_duration
  WHERE id = p_auction_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_rejeitar_leilao(p_auction_id UUID)
RETURNS VOID
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

  UPDATE public.auctions
  SET status = 'cancelled'::auction_status
  WHERE id = p_auction_id AND status = 'draft'::auction_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leilão não encontrado ou não está em análise.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_listar_leiloes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_aprovar_leilao(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_rejeitar_leilao(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_listar_leiloes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_aprovar_leilao(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_rejeitar_leilao(UUID) TO authenticated;
