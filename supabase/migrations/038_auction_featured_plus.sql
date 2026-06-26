-- Destaque Plus: leilões pagos no carrossel principal da Home
ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS is_featured_plus BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.auctions.is_featured_plus IS
  'Quando true, o leilão aparece no carrossel Destaque Plus no topo da Home.';

CREATE INDEX IF NOT EXISTS auctions_featured_plus_home_idx
  ON public.auctions (ends_at ASC)
  WHERE is_featured_plus = true AND status = 'live';
