-- Fallback: guarda RG/selfie no Postgres quando o Storage do projeto está quebrado
-- O app usa automaticamente se o upload no bucket falhar com erro de schema

CREATE TABLE IF NOT EXISTS public.kyc_private_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('documento', 'selfie')),
  mime TEXT NOT NULL,
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tipo)
);

ALTER TABLE public.kyc_private_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "KYC files select own" ON public.kyc_private_files;
CREATE POLICY "KYC files select own" ON public.kyc_private_files
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "KYC files insert own" ON public.kyc_private_files;
CREATE POLICY "KYC files insert own" ON public.kyc_private_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "KYC files update own" ON public.kyc_private_files;
CREATE POLICY "KYC files update own" ON public.kyc_private_files
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read kyc files" ON public.kyc_private_files;
CREATE POLICY "Admins read kyc files" ON public.kyc_private_files
  FOR SELECT USING (public.auth_is_admin());

CREATE OR REPLACE FUNCTION public.salvar_arquivo_kyc(
  p_tipo TEXT,
  p_mime TEXT,
  p_conteudo_base64 TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_id UUID;
  v_bytes BYTEA;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF p_tipo NOT IN ('documento', 'selfie') THEN
    RAISE EXCEPTION 'Tipo de arquivo inválido';
  END IF;
  IF length(p_conteudo_base64) < 100 THEN
    RAISE EXCEPTION 'Arquivo vazio';
  END IF;

  v_bytes := decode(p_conteudo_base64, 'base64');

  INSERT INTO public.kyc_private_files (user_id, tipo, mime, data)
  VALUES (v_user, p_tipo, p_mime, v_bytes)
  ON CONFLICT (user_id, tipo) DO UPDATE SET
    mime = EXCLUDED.mime,
    data = EXCLUDED.data,
    created_at = now()
  RETURNING id INTO v_id;

  RETURN 'kyc-db://' || v_id::text;
END;
$$;

REVOKE ALL ON FUNCTION public.salvar_arquivo_kyc(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salvar_arquivo_kyc(TEXT, TEXT, TEXT) TO authenticated;
