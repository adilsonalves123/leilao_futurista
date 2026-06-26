-- Corrige "column reference id is ambiguous" em RPCs com RETURNS TABLE (id UUID, ...)
-- Em PL/pgSQL, nomes da tabela de retorno têm precedência sobre colunas de tabelas reais.

CREATE OR REPLACE FUNCTION public.admin_listar_usuarios()
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT,
  nome_completo TEXT,
  role TEXT,
  escrow_balance_cents BIGINT,
  status_verificacao TEXT,
  created_at TIMESTAMPTZ
)
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

  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.display_name,
    u.nome_completo,
    u.role::TEXT,
    u.escrow_balance_cents,
    u.status_verificacao,
    u.created_at
  FROM public.users u
  WHERE u.role IS DISTINCT FROM 'admin'::user_role
  ORDER BY u.created_at DESC;
END;
$$;

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
    RAISE EXCEPTION 'Acesso negado: sua conta precisa de role = admin em public.users (id %).', auth.uid();
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::TEXT,
    u.display_name::TEXT,
    u.nome_completo::TEXT,
    u.cpf::TEXT,
    u.documento_url::TEXT,
    u.selfie_url::TEXT,
    u.status_verificacao::TEXT,
    u.termos_aceitos,
    u.created_at
  FROM public.users u
  WHERE u.role IS DISTINCT FROM 'admin'::user_role
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
    RAISE EXCEPTION 'Não autenticado. Faça login em /admin/login.';
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

REVOKE ALL ON FUNCTION public.admin_listar_usuarios() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_listar_kyc() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_atualizar_kyc_status(UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_listar_usuarios() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_listar_kyc() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_atualizar_kyc_status(UUID, TEXT) TO authenticated;
