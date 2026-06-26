-- Permite aprovação admin: draft → live (admin_aprovar_leilao)
-- O trigger enforce_auction_seller_update bloqueava essa transição.

CREATE OR REPLACE FUNCTION public.enforce_auction_seller_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  bid_count INT;
BEGIN
  SELECT COUNT(*)::INT INTO bid_count
  FROM public.bids
  WHERE auction_id = OLD.id;

  IF bid_count > 0 AND NEW.starting_price_cents IS DISTINCT FROM OLD.starting_price_cents THEN
    RAISE EXCEPTION 'Não é possível alterar o valor inicial após o primeiro lance';
  END IF;

  IF bid_count > 0 AND NEW.ends_at IS DISTINCT FROM OLD.ends_at THEN
    RAISE EXCEPTION 'Não é possível alterar a data de término após o primeiro lance';
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
    ELSE
      RAISE EXCEPTION 'Transição de status do leilão não permitida';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
