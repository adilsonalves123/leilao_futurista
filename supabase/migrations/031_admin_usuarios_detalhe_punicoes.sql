-- Admin → Usuários: dados completos + status_conta (suspenso, bloqueado, banido)

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS status_conta TEXT NOT NULL DEFAULT 'ativo';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_status_conta_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_status_conta_check
  CHECK (status_conta IN ('ativo', 'suspenso', 'bloqueado', 'banido'));

COMMENT ON COLUMN public.users.status_conta IS 'Moderação: ativo | suspenso | bloqueado | banido';

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
    u.email,
    u.display_name,
    u.nome_completo,
    u.role::TEXT,
    u.escrow_balance_cents,
    u.status_verificacao,
    u.status_conta,
    u.telefone,
    u.cpf,
    u.documento_url,
    u.selfie_url,
    u.data_nascimento,
    u.cep,
    u.endereco_logradouro,
    u.endereco_numero,
    u.endereco_complemento,
    u.endereco_bairro,
    u.endereco_cidade,
    u.endereco_uf,
    u.termos_aceitos,
    u.created_at
  FROM public.users u
  WHERE u.role IS DISTINCT FROM 'admin'::user_role
  ORDER BY u.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_atualizar_status_conta(
  p_user_id UUID,
  p_status_conta TEXT
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

  IF p_status_conta NOT IN ('ativo', 'suspenso', 'bloqueado', 'banido') THEN
    RAISE EXCEPTION 'Status de conta inválido: %', p_status_conta;
  END IF;

  UPDATE public.users alvo
  SET status_conta = p_status_conta
  WHERE alvo.id = p_user_id
    AND alvo.role IS DISTINCT FROM 'admin'::user_role;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado (id %).', p_user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_listar_usuarios() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_atualizar_status_conta(UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_listar_usuarios() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_atualizar_status_conta(UUID, TEXT) TO authenticated;
