-- Imagens dos slides (upload do painel admin → app mobile)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'banner-slides',
  'banner-slides',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Leitura pública banner-slides"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'banner-slides');

CREATE POLICY "Upload banner-slides"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'banner-slides');

CREATE POLICY "Atualizar banner-slides"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'banner-slides')
  WITH CHECK (bucket_id = 'banner-slides');
