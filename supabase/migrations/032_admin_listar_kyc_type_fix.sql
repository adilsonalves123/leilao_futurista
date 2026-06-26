-- Corrige: "A estrutura da consulta não corresponde ao tipo de resultado da função"
-- Causa comum: VARCHAR(14) em cpf vs TEXT no RETURNS TABLE. Lista todos os não-admin.

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
      WHEN 'aprovado' THEN 2
      WHEN 'rejeitado' THEN 3
      ELSE 4
    END,
    u.created_at DESC NULLS LAST;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_listar_usuarios()
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT,
  nome_completo TEXT,
  role TEXT,
  escrow_balance_cents BIGINT,
  status_verificacao TEXT,
  status_conta TEXT,
  telefone TEXT,
  cpf TEXT,
  documento_url TEXT,
  selfie_url TEXT,
  data_nascimento TEXT,
  cep TEXT,
  endereco_logradouro TEXT,
  endereco_numero TEXT,
  endereco_complemento TEXT,
  endereco_bairro TEXT,
  endereco_cidade TEXT,
  endereco_uf TEXT,
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
    u.email::TEXT,
    u.display_name::TEXT,
    u.nome_completo::TEXT,
    u.role::TEXT,
    u.escrow_balance_cents,
    u.status_verificacao::TEXT,
    u.status_conta::TEXT,
    u.telefone::TEXT,
    u.cpf::TEXT,
    u.documento_url::TEXT,
    u.selfie_url::TEXT,
    u.data_nascimento::TEXT,
    u.cep::TEXT,
    u.endereco_logradouro::TEXT,
    u.endereco_numero::TEXT,
    u.endereco_complemento::TEXT,
    u.endereco_bairro::TEXT,
    u.endereco_cidade::TEXT,
    u.endereco_uf::TEXT,
    u.termos_aceitos,
    u.created_at
  FROM public.users u
  WHERE u.role IS DISTINCT FROM 'admin'::user_role
  ORDER BY u.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_listar_kyc() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_listar_usuarios() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_listar_kyc() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_listar_usuarios() TO authenticated;
