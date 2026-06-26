-- Categoria do anúncio + mídia de leilões + política de update pelo vendedor

ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS listing_category TEXT;

COMMENT ON COLUMN public.auctions.listing_category IS
  'Categoria do anúncio (produtos_gerais, veiculos, imoveis, eletronicos, colecionaveis, outros)';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'auction-images',
  'auction-images',
  true,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 8388608,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];

DROP POLICY IF EXISTS "Auction images public read" ON storage.objects;
CREATE POLICY "Auction images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'auction-images');

DROP POLICY IF EXISTS "Auction images seller upload" ON storage.objects;
CREATE POLICY "Auction images seller upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'auction-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.auctions a
      WHERE a.id::text = (storage.foldername(name))[2]
        AND a.seller_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Auction images seller update" ON storage.objects;
CREATE POLICY "Auction images seller update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'auction-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (bucket_id = 'auction-images');

DROP POLICY IF EXISTS "Auction images seller delete" ON storage.objects;
CREATE POLICY "Auction images seller delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'auction-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Seller read own auctions" ON public.auctions;
CREATE POLICY "Seller read own auctions"
  ON public.auctions FOR SELECT
  USING (seller_id = auth.uid() OR status IN ('live', 'ended'));

DROP POLICY IF EXISTS "Seller update own live auctions" ON public.auctions;
CREATE POLICY "Seller update own live auctions"
  ON public.auctions FOR UPDATE
  USING (seller_id = auth.uid() AND status = 'live')
  WITH CHECK (seller_id = auth.uid() AND status = 'live');
