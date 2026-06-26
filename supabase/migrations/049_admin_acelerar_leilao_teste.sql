-- Admin: encurtar cronômetro do leilão para testes (1 min ou encerrar agora)
-- Permite alterar ends_at mesmo com lances quando app.admin_override = true.

CREATE OR REPLACE FUNCTION public.enforce_auction_seller_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  bid_count INT;
  admin_override BOOLEAN := current_setting('app.admin_override', true) = 'true';
BEGIN
  SELECT COUNT(*)::INT INTO bid_count
  FROM public.bids
  WHERE auction_id = OLD.id;

  IF bid_count > 0 AND NEW.starting_price_cents IS DISTINCT FROM OLD.starting_price_cents THEN
    IF NOT admin_override THEN
      RAISE EXCEPTION 'Não é possível alterar o valor inicial após o primeiro lance';
    END IF;
  END IF;

  IF bid_count > 0 AND NEW.ends_at IS DISTINCT FROM OLD.ends_at THEN
    IF NOT admin_override THEN
      RAISE EXCEPTION 'Não é possível alterar a data de término após o primeiro lance';
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'live' AND NEW.status = 'paused' THEN
      RETURN NEW;
    ELSIF OLD.status = 'paused' AND NEW.status = 'live' THEN
      RETURN NEW;
    ELSIF OLD.status = 'draft' AND NEW.status = 'live' THEN
      RETURN NEW;
    ELSIF OLD.status IN ('live', 'paused', 'draft') AND NEW.status = 'cancelled' THEN
      RETURN NEW;
    ELSIF admin_override AND OLD.status IN ('live', 'paused') AND NEW.status = 'ended' THEN
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Transição de status do leilão não permitida';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_acelerar_leilao_teste(
  p_auction_id UUID,
  p_minutos INT DEFAULT 1
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ends TIMESTAMPTZ;
  v_st INT;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  PERFORM set_config('app.admin_override', 'true', true);

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users adm
    WHERE adm.id = auth.uid() AND adm.role = 'admin'::user_role
  ) THEN
    RAISE EXCEPTION 'Acesso negado: role admin necessário.';
  END IF;

  v_st := GREATEST(COALESCE(p_minutos, 1), 0);

  IF v_st = 0 THEN
    v_ends := now() - interval '5 seconds';
    UPDATE public.auctions
    SET
      ends_at = v_ends,
      status = 'ended'::auction_status
    WHERE id = p_auction_id
      AND status IN ('live'::auction_status, 'paused'::auction_status);
  ELSE
    v_ends := now() + (v_st * interval '1 minute');
    UPDATE public.auctions
    SET
      starts_at = now() - interval '30 seconds',
      ends_at = v_ends,
      status = 'live'::auction_status
    WHERE id = p_auction_id
      AND status IN ('live'::auction_status, 'paused'::auction_status, 'ended'::auction_status);
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leilão não encontrado ou não está ao vivo/pausado.';
  END IF;

  RETURN v_ends;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_acelerar_leilao_teste(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_acelerar_leilao_teste(UUID, INT) TO authenticated;
