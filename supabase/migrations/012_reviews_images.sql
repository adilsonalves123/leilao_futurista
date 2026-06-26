-- Reviews com fotos reais de compradores + bucket review-images

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL DEFAULT '',
  images TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reviews_order_unique UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS reviews_vendor_id_created_at_idx
  ON public.reviews (vendor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS reviews_auction_id_created_at_idx
  ON public.reviews (auction_id, created_at DESC);

CREATE INDEX IF NOT EXISTS reviews_buyer_id_idx ON public.reviews (buyer_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read reviews" ON public.reviews;
CREATE POLICY "Public read reviews"
  ON public.reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Buyer insert own review" ON public.reviews;
CREATE POLICY "Buyer insert own review"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = buyer_id
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND o.buyer_id = auth.uid()
        AND o.status IN ('finalizado', 'aguardando_confirmacao', 'em_disputa', 'pago', 'em_envio')
    )
  );

DROP POLICY IF EXISTS "Buyer update own review" ON public.reviews;
CREATE POLICY "Buyer update own review"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

-- Storage: review-images (público para leitura, upload só comprador do pedido)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'review-images',
  'review-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];

DROP POLICY IF EXISTS "Review images public read" ON storage.objects;
CREATE POLICY "Review images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'review-images');

DROP POLICY IF EXISTS "Review images buyer upload" ON storage.objects;
CREATE POLICY "Review images buyer upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'review-images'
    AND EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND o.buyer_id = auth.uid()
    )
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Review images buyer update" ON storage.objects;
CREATE POLICY "Review images buyer update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'review-images'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND o.buyer_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'review-images'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Review images buyer delete" ON storage.objects;
CREATE POLICY "Review images buyer delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'review-images'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND o.buyer_id = auth.uid()
    )
  );

-- Seeds demo (se houver pedidos)
DO $$
DECLARE
  r RECORD;
  v_count INT := 0;
BEGIN
  IF (SELECT COUNT(*) FROM public.reviews) > 0 THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT o.id AS order_id, o.auction_id, o.buyer_id, o.vendor_id
    FROM public.orders o
    WHERE o.status IN ('finalizado', 'em_disputa', 'em_envio')
    ORDER BY o.created_at DESC
    LIMIT 4
  LOOP
    INSERT INTO public.reviews (
      order_id, auction_id, buyer_id, vendor_id,
      rating, comment, images
    )
    VALUES (
      r.order_id,
      r.auction_id,
      r.buyer_id,
      r.vendor_id,
      4 + (v_count % 2),
      CASE v_count
        WHEN 0 THEN 'Produto exatamente como descrito. Entrega rápida e bem embalado.'
        WHEN 1 THEN 'Item chegou com pequeno detalhe na embalagem, mas produto impecável.'
        WHEN 2 THEN 'Qualidade top! Recomendo o vendedor.'
        ELSE 'Boa experiência geral, voltaria a comprar.'
      END,
      CASE v_count
        WHEN 0 THEN ARRAY[
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&auto=format&fit=crop'
        ]
        WHEN 1 THEN ARRAY[
          'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop'
        ]
        ELSE ARRAY[
          'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600&auto=format&fit=crop'
        ]
      END
    );
    v_count := v_count + 1;
  END LOOP;
END;
$$;

COMMENT ON COLUMN public.reviews.images IS 'URLs públicas das fotos reais enviadas pelo comprador (Supabase Storage review-images)';
