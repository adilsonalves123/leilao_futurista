-- Se ainda aparece "infinite recursion" em users: execute ESTE arquivo inteiro.
-- 1) Remove TODAS as políticas em public.users (inclusive nomes antigos)
-- 2) Recria só 3 políticas simples
-- 3) Salva KYC via RPC (app não usa mais upsert direto em users)

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "users_select_own" ON public.users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Salvar cadastro KYC (bypass RLS — sem recursão)
CREATE OR REPLACE FUNCTION public.salvar_kyc_cadastro(
  p_nome_completo TEXT,
  p_cpf TEXT,
  p_documento_url TEXT,
  p_selfie_url TEXT,
  p_termos_aceitos TIMESTAMPTZ,
  p_email TEXT DEFAULT NULL,
  p_telefone TEXT DEFAULT NULL,
  p_data_nascimento TEXT DEFAULT NULL,
  p_cep TEXT DEFAULT NULL,
  p_endereco_logradouro TEXT DEFAULT NULL,
  p_endereco_numero TEXT DEFAULT NULL,
  p_endereco_complemento TEXT DEFAULT NULL,
  p_endereco_bairro TEXT DEFAULT NULL,
  p_endereco_cidade TEXT DEFAULT NULL,
  p_endereco_uf TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_row public.users%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  PERFORM set_config('row_security', 'off', true);

  v_email := COALESCE(NULLIF(trim(p_email), ''), (
    SELECT email FROM auth.users WHERE id = v_uid LIMIT 1
  ), '');

  INSERT INTO public.users (
    id,
    email,
    telefone,
    nome_completo,
    cpf,
    documento_url,
    selfie_url,
    status_verificacao,
    termos_aceitos,
    data_nascimento,
    cep,
    endereco_logradouro,
    endereco_numero,
    endereco_complemento,
    endereco_bairro,
    endereco_cidade,
    endereco_uf
  )
  VALUES (
    v_uid,
    v_email,
    NULLIF(trim(p_telefone), ''),
    trim(p_nome_completo),
    trim(p_cpf),
    p_documento_url,
    p_selfie_url,
    'em_analise',
    p_termos_aceitos,
    NULLIF(trim(p_data_nascimento), ''),
    NULLIF(trim(p_cep), ''),
    NULLIF(trim(p_endereco_logradouro), ''),
    NULLIF(trim(p_endereco_numero), ''),
    NULLIF(trim(p_endereco_complemento), ''),
    NULLIF(trim(p_endereco_bairro), ''),
    NULLIF(trim(p_endereco_cidade), ''),
    NULLIF(trim(p_endereco_uf), '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    telefone = COALESCE(EXCLUDED.telefone, public.users.telefone),
    nome_completo = EXCLUDED.nome_completo,
    cpf = EXCLUDED.cpf,
    documento_url = EXCLUDED.documento_url,
    selfie_url = EXCLUDED.selfie_url,
    status_verificacao = 'em_analise',
    termos_aceitos = EXCLUDED.termos_aceitos,
    data_nascimento = COALESCE(EXCLUDED.data_nascimento, public.users.data_nascimento),
    cep = COALESCE(EXCLUDED.cep, public.users.cep),
    endereco_logradouro = COALESCE(EXCLUDED.endereco_logradouro, public.users.endereco_logradouro),
    endereco_numero = COALESCE(EXCLUDED.endereco_numero, public.users.endereco_numero),
    endereco_complemento = COALESCE(EXCLUDED.endereco_complemento, public.users.endereco_complemento),
    endereco_bairro = COALESCE(EXCLUDED.endereco_bairro, public.users.endereco_bairro),
    endereco_cidade = COALESCE(EXCLUDED.endereco_cidade, public.users.endereco_cidade),
    endereco_uf = COALESCE(EXCLUDED.endereco_uf, public.users.endereco_uf)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'email', v_row.email,
    'telefone', v_row.telefone,
    'nome_completo', v_row.nome_completo,
    'cpf', v_row.cpf,
    'documento_url', v_row.documento_url,
    'selfie_url', v_row.selfie_url,
    'status_verificacao', v_row.status_verificacao,
    'termos_aceitos', v_row.termos_aceitos,
    'data_nascimento', v_row.data_nascimento,
    'cep', v_row.cep,
    'endereco_logradouro', v_row.endereco_logradouro,
    'endereco_numero', v_row.endereco_numero,
    'endereco_complemento', v_row.endereco_complemento,
    'endereco_bairro', v_row.endereco_bairro,
    'endereco_cidade', v_row.endereco_cidade,
    'endereco_uf', v_row.endereco_uf
  );
END;
$$;

REVOKE ALL ON FUNCTION public.salvar_kyc_cadastro(
  TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.salvar_kyc_cadastro(
  TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated;
