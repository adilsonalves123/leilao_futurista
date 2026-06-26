-- Botão Aprovar KYC no painel: corrige admin_atualizar_kyc_status

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

REVOKE ALL ON FUNCTION public.admin_atualizar_kyc_status(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_atualizar_kyc_status(UUID, TEXT) TO authenticated;
