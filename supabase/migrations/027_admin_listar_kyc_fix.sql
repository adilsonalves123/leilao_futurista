-- Painel admin vazio: corrige listagem KYC (critérios + checagem admin com RLS desligado)

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

REVOKE ALL ON FUNCTION public.admin_listar_kyc() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_listar_kyc() TO authenticated;

-- Contagem rápida para diagnóstico no SQL Editor (rode como admin logado no app ou veja direto):
-- SELECT status_verificacao, count(*) FROM public.users GROUP BY 1;
