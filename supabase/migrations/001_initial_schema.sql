-- Aetherion Auctions — Pillar 3 schema
-- Run via Supabase CLI: supabase db push

CREATE TYPE user_role AS ENUM ('bidder', 'vendor', 'admin');
CREATE TYPE auction_status AS ENUM ('draft', 'live', 'ended', 'frozen', 'cancelled');
CREATE TYPE escrow_status AS ENUM ('pending', 'held', 'released', 'refunded', 'disputed');

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  role user_role NOT NULL DEFAULT 'bidder',
  wallet_address TEXT,
  escrow_balance_cents BIGINT NOT NULL DEFAULT 0 CHECK (escrow_balance_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  starting_price_cents BIGINT NOT NULL CHECK (starting_price_cents >= 0),
  current_price_cents BIGINT NOT NULL CHECK (current_price_cents >= 0),
  status auction_status NOT NULL DEFAULT 'draft',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  anti_snipe_extended_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ends_after_starts CHECK (ends_at > starts_at)
);

CREATE TABLE public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX bids_auction_id_created_at_idx ON public.bids (auction_id, created_at DESC);

CREATE TABLE public.checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subtotal_cents BIGINT NOT NULL CHECK (subtotal_cents >= 0),
  commission_cents BIGINT NOT NULL CHECK (commission_cents >= 0),
  shipping_cents BIGINT NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  total_cents BIGINT NOT NULL CHECK (total_cents >= 0),
  escrow_status escrow_status NOT NULL DEFAULT 'pending',
  shipping_label_url TEXT,
  qr_code_data TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (auction_id)
);

-- Anti-snipe: extend ends_at by 30s when bid in final 30s
CREATE OR REPLACE FUNCTION public.handle_anti_snipe()
RETURNS TRIGGER AS $$
DECLARE
  auction_row public.auctions%ROWTYPE;
  seconds_remaining DOUBLE PRECISION;
BEGIN
  SELECT * INTO auction_row FROM public.auctions WHERE id = NEW.auction_id FOR UPDATE;

  IF auction_row.status <> 'live' THEN
    RAISE EXCEPTION 'Auction is not live';
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

CREATE TRIGGER bids_anti_snipe
  AFTER INSERT ON public.bids
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_anti_snipe();

-- Realtime on bids (enable in Supabase Dashboard → Database → Replication)
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auctions;

-- RLS placeholders (tighten per environment)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read live auctions" ON public.auctions
  FOR SELECT USING (status IN ('live', 'ended'));

CREATE POLICY "Authenticated insert bids" ON public.bids
  FOR INSERT WITH CHECK (auth.uid() = bidder_id);

CREATE POLICY "Public read bids" ON public.bids
  FOR SELECT USING (true);
