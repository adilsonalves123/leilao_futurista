-- Perfil público do vendedor (sem e-mail, telefone ou CPF).

CREATE OR REPLACE FUNCTION public.perfil_vendedor_publico(p_vendor_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_vendas INT;
  v_avaliacoes INT;
  v_media NUMERIC;
BEGIN
  SELECT
    u.id,
    u.display_name,
    u.status_verificacao,
    up.seller_badge,
    up.reputacao_estrelas
  INTO v_user
  FROM public.users u
  LEFT JOIN public.user_profiles up ON up.user_id = u.id
  WHERE u.id = p_vendor_id
    AND u.role IS DISTINCT FROM 'admin'::public.user_role;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*)::INT
  INTO v_vendas
  FROM public.orders o
  WHERE o.vendor_id = p_vendor_id
    AND o.status = 'finalizado'::public.order_status;

  SELECT COUNT(*)::INT, COALESCE(AVG(r.rating), 0)
  INTO v_avaliacoes, v_media
  FROM public.reviews r
  WHERE r.vendor_id = p_vendor_id;

  RETURN jsonb_build_object(
    'id', v_user.id,
    'display_name', v_user.display_name,
    'status_verificacao', v_user.status_verificacao::TEXT,
    'seller_badge', v_user.seller_badge::TEXT,
    'reputacao_estrelas', COALESCE(v_user.reputacao_estrelas, 5.0),
    'vendas_concluidas', v_vendas,
    'total_avaliacoes', v_avaliacoes,
    'media_avaliacoes', ROUND(v_media::NUMERIC, 1)
  );
END;
$$;

COMMENT ON FUNCTION public.perfil_vendedor_publico(UUID) IS
  'Dados públicos do vendedor para perfil e leilões (sem PII).';

REVOKE ALL ON FUNCTION public.perfil_vendedor_publico(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.perfil_vendedor_publico(UUID) TO anon, authenticated;
