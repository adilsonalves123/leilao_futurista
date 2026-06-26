-- Corrige bucket e políticas do Storage para KYC (upload pelo app)
-- Rode no SQL Editor se o envio de foto falhar com "schema invalid or incompatible"

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];

DROP POLICY IF EXISTS "KYC upload own folder" ON storage.objects;
DROP POLICY IF EXISTS "KYC read own folder" ON storage.objects;
DROP POLICY IF EXISTS "KYC update own folder" ON storage.objects;

-- split_part evita falhas de avaliação com storage.foldername() em alguns projetos
CREATE POLICY "KYC upload own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "KYC read own folder"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR public.auth_is_admin()
    )
  );

CREATE POLICY "KYC update own folder"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
