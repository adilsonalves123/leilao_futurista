-- Regras de segurança (preço com lances, pausar, excluir).
-- Pré-requisito: ALTER TYPE auction_status ADD VALUE 'paused'; (rodar manualmente uma vez)
-- Script idempotente sem ENUM: 016_auction_pause_triggers_only.sql

-- Buscas públicas: apenas leilões ativos ou encerrados (não paused/cancelled/draft)
DROP POLICY IF EXISTS "Public read live auctions" ON public.auctions;
DROP POLICY IF EXISTS "Public read discoverable auctions" ON public.auctions;
CREATE POLICY "Public read discoverable auctions"
  ON public.auctions FOR SELECT
  USING (status IN ('live', 'ended'));

DROP POLICY IF EXISTS "Seller read own auctions" ON public.auctions;
CREATE POLICY "Seller read own auctions"
  ON public.auctions FOR SELECT
  USING (
    seller_id = auth.uid()
    OR status IN ('live', 'ended')
  );

DROP POLICY IF EXISTS "Seller update own live auctions" ON public.auctions;
DROP POLICY IF EXISTS "Seller update own manageable auctions" ON public.auctions;
CREATE POLICY "Seller update own manageable auctions"
  ON public.auctions FOR UPDATE
  USING (
    seller_id = auth.uid()
    AND status IN ('live', 'paused')
  )
  WITH CHECK (seller_id = auth.uid());

-- Impede alteração de preço/prazo com lances e transições de status inválidas
CREATE OR REPLACE FUNCTION public.enforce_auction_seller_update()
RETURNS TRIGGER AS $$
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
    ELSIF OLD.status IN ('live', 'paused', 'draft') AND NEW.status = 'cancelled' THEN
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Transição de status do leilão não permitida';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auctions_seller_update_guard ON public.auctions;
CREATE TRIGGER auctions_seller_update_guard
  BEFORE UPDATE ON public.auctions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_auction_seller_update();

-- Bloqueia novos lances em leilão pausado ou cancelado
CREATE OR REPLACE FUNCTION public.handle_anti_snipe()
RETURNS TRIGGER AS $$
DECLARE
  auction_row public.auctions%ROWTYPE;
  seconds_remaining DOUBLE PRECISION;
BEGIN
  SELECT * INTO auction_row FROM public.auctions WHERE id = NEW.auction_id FOR UPDATE;

  IF auction_row.status <> 'live' THEN
    RAISE EXCEPTION 'Leilão indisponível para lances (status: %)', auction_row.status;
  END IF;

  seconds_remaining := EXTRACT(EPOCH FROM (auction_row.ends_at - now()));

  IF seconds_remaining <= 30 THEN
    UPDATE public.auctions
    SET
      ends_at = now() + interval '30 seconds',
      anti_snipe_extended_count = anti_snipe_extended_count + 1,
      current_price_cents = NEW.amount_cents
    WHERE id = NEW.auction_id;
  ELSE
    UPDATE public.auctions
    SET current_price_cents = NEW.amount_cents
    WHERE id = NEW.auction_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
