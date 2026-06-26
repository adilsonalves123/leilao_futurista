-- Etiquetas de vendedor (admin): particular (padrão), empresa verificada, loja oficial.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'seller_badge') THEN
    CREATE TYPE public.seller_badge AS ENUM (
      'particular',
      'empresa_verificada',
      'loja_oficial'
    );
  END IF;
END $$;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS seller_badge public.seller_badge;

COMMENT ON COLUMN public.user_profiles.seller_badge IS
  'Etiqueta comercial definida pelo admin ao aprovar KYC ou na ficha do vendedor.';

CREATE OR REPLACE FUNCTION public._aplicar_etiqueta_vendedor(
  p_user_id UUID,
  p_badge public.seller_badge
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, reputacao_estrelas, seller_badge, updated_at)
  VALUES (p_user_id, 5.0, p_badge, now())
  ON CONFLICT (user_id) DO UPDATE
  SET
    seller_badge = EXCLUDED.seller_badge,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_atualizar_kyc_status(
  p_user_id UUID,
  p_status TEXT,
  p_seller_badge TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_badge public.seller_badge;
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

  IF p_status = 'aprovado' THEN
    IF p_seller_badge IS NOT NULL AND trim(p_seller_badge) <> '' THEN
      IF p_seller_badge NOT IN ('particular', 'empresa_verificada', 'loja_oficial') THEN
        RAISE EXCEPTION 'Etiqueta inválida: %', p_seller_badge;
      END IF;
      v_badge := p_seller_badge::public.seller_badge;
    ELSE
      v_badge := 'particular'::public.seller_badge;
    END IF;

    PERFORM public._aplicar_etiqueta_vendedor(p_user_id, v_badge);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_definir_etiqueta_vendedor(
  p_user_id UUID,
  p_seller_badge TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_badge public.seller_badge;
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

  IF p_seller_badge IS NULL OR trim(p_seller_badge) = '' THEN
    RAISE EXCEPTION 'Informe a etiqueta.';
  END IF;

  IF p_seller_badge NOT IN ('particular', 'empresa_verificada', 'loja_oficial') THEN
    RAISE EXCEPTION 'Etiqueta inválida: %', p_seller_badge;
  END IF;

  v_badge := p_seller_badge::public.seller_badge;
  PERFORM public._aplicar_etiqueta_vendedor(p_user_id, v_badge);

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'seller_badge', v_badge::TEXT
  );
END;
$$;

DROP FUNCTION IF EXISTS public.admin_listar_kyc();

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
  created_at TIMESTAMPTZ,
  seller_badge TEXT
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
    u.email::TEXT,
    u.display_name::TEXT,
    u.nome_completo::TEXT,
    u.cpf::TEXT,
    u.documento_url::TEXT,
    u.selfie_url::TEXT,
    u.status_verificacao::TEXT,
    u.termos_aceitos,
    u.created_at,
    up.seller_badge::TEXT
  FROM public.users u
  LEFT JOIN public.user_profiles up ON up.user_id = u.id
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

REVOKE ALL ON FUNCTION public.admin_atualizar_kyc_status(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_definir_etiqueta_vendedor(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_listar_kyc() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_atualizar_kyc_status(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_definir_etiqueta_vendedor(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_listar_kyc() TO authenticated;
