-- KYC / cadastro completo — colunas em public.users (perfil do licitante)
-- Execute no SQL Editor ou: supabase db push

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS nome_completo TEXT,
  ADD COLUMN IF NOT EXISTS cpf VARCHAR(14),
  ADD COLUMN IF NOT EXISTS documento_url TEXT,
  ADD COLUMN IF NOT EXISTS selfie_url TEXT,
  ADD COLUMN IF NOT EXISTS status_verificacao TEXT NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS termos_aceitos TIMESTAMPTZ;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_status_verificacao_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_status_verificacao_check
  CHECK (status_verificacao IN ('pendente', 'em_analise', 'aprovado', 'rejeitado'));

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_cpf_key;

ALTER TABLE public.users
  ADD CONSTRAINT users_cpf_key UNIQUE (cpf);

COMMENT ON COLUMN public.users.nome_completo IS 'Nome civil completo (KYC)';
COMMENT ON COLUMN public.users.cpf IS 'CPF formatado ou só dígitos, único';
COMMENT ON COLUMN public.users.documento_url IS 'URL RG/CNH no Storage';
COMMENT ON COLUMN public.users.selfie_url IS 'URL selfie de verificação';
COMMENT ON COLUMN public.users.status_verificacao IS 'pendente | em_analise | aprovado | rejeitado';
COMMENT ON COLUMN public.users.termos_aceitos IS 'Timestamp do aceite dos termos de arremate';

-- Perfil criado automaticamente no cadastro Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- RLS: leitura/atualização do próprio perfil
DROP POLICY IF EXISTS "Users select own profile" ON public.users;
CREATE POLICY "Users select own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users insert own profile" ON public.users;
CREATE POLICY "Users insert own profile" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.users;
CREATE POLICY "Users update own profile" ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Checagem KYC sem subquery recursiva no RLS de users
CREATE OR REPLACE FUNCTION public.auth_kyc_aprovado()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('row_security', 'off', true);
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND status_verificacao = 'aprovado'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.auth_kyc_aprovado() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_kyc_aprovado() TO authenticated;

-- Lance só para licitante com KYC aprovado
DROP POLICY IF EXISTS "Authenticated insert bids" ON public.bids;
DROP POLICY IF EXISTS "Verified bidders insert bids" ON public.bids;

CREATE POLICY "Verified bidders insert bids" ON public.bids
  FOR INSERT
  WITH CHECK (
    auth.uid() = bidder_id
    AND public.auth_kyc_aprovado()
  );

-- Storage: documentos KYC (privado por pasta user id)
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
  file_size_limit = 10485760;

DROP POLICY IF EXISTS "KYC upload own folder" ON storage.objects;
CREATE POLICY "KYC upload own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "KYC read own folder" ON storage.objects;
CREATE POLICY "KYC read own folder"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kyc-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "KYC update own folder" ON storage.objects;
CREATE POLICY "KYC update own folder"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'kyc-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
