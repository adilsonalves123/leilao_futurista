-- Painel admin: listar e aprovar KYC (SECURITY DEFINER + checagem auth_is_admin)

CREATE OR REPLACE FUNCTION public.admin_listar_kyc()
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT,
  nome_completo TEXT,
  cpf TEXT,
  documento_url TEXT,
  selfie_url TEXT,
  status_verificacao TEXT,
  termos_aceitos TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('row_security', 'off', true);

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado. Faça login em /admin/login.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users adm
    WHERE adm.id = auth.uid() AND adm.role = 'admin'::user_role
  ) THEN
    RAISE EXCEPTION 'Acesso negado: role admin necessário.';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.display_name,
    u.nome_completo,
    u.cpf,
    u.documento_url,
    u.selfie_url,
    u.status_verificacao,
    u.termos_aceitos,
    u.created_at
  FROM public.users u
  WHERE u.role IS DISTINCT FROM 'admin'::user_role
    AND (
      u.status_verificacao IN ('em_analise', 'pendente')
      OR (
        NULLIF(trim(COALESCE(u.documento_url, '')), '') IS NOT NULL
        AND NULLIF(trim(COALESCE(u.selfie_url, '')), '') IS NOT NULL
      )
      OR NULLIF(trim(COALESCE(u.cpf, '')), '') <> ''
    )
  ORDER BY
    CASE u.status_verificacao
      WHEN 'em_analise' THEN 0
      WHEN 'pendente' THEN 1
      ELSE 2
    END,
    u.created_at DESC NULLS LAST;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_atualizar_kyc_status(
  p_user_id UUID,
  p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('row_security', 'off', true);

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users adm
    WHERE adm.id = auth.uid() AND adm.role = 'admin'::user_role
  ) THEN
    RAISE EXCEPTION 'Acesso negado: role admin necessário.';
  END IF;

  IF p_status NOT IN ('aprovado', 'rejeitado') THEN
    RAISE EXCEPTION 'Status inválido: %', p_status;
  END IF;

  UPDATE public.users u
  SET status_verificacao = p_status
  WHERE u.id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado (id %).', p_user_id;
  END IF;
END;
$$;

-- URL exibível para arquivos salvos no fallback kyc-db://uuid
CREATE OR REPLACE FUNCTION public.admin_kyc_arquivo_data_url(p_file_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mime TEXT;
  v_data BYTEA;
BEGIN
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT mime, data INTO v_mime, v_data
  FROM public.kyc_private_files f
  WHERE f.id = p_file_id;

  IF v_data IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN 'data:' || COALESCE(v_mime, 'image/jpeg') || ';base64,' || encode(v_data, 'base64');
END;
$$;

REVOKE ALL ON FUNCTION public.admin_listar_kyc() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_atualizar_kyc_status(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_kyc_arquivo_data_url(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_listar_kyc() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_atualizar_kyc_status(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_kyc_arquivo_data_url(UUID) TO authenticated;
