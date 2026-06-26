-- Corrige seed da Loja Oficial se a migration 077 falhou no role inválido "user".
-- Enum user_role: bidder | vendor | admin

DO $fix$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'loja@levou.app.br';
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(trim(email)) = v_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Conta auth loja@levou.app.br não encontrada — rode a migration 077 corrigida.';
    RETURN;
  END IF;

  INSERT INTO public.users (id, email, display_name, role, status_verificacao, termos_aceitos)
  VALUES (
    v_user_id,
    v_email,
    'Levou Oficial',
    'vendor'::public.user_role,
    'aprovado',
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(NULLIF(public.users.display_name, ''), EXCLUDED.display_name),
    role = 'vendor'::public.user_role,
    status_verificacao = 'aprovado',
    termos_aceitos = COALESCE(public.users.termos_aceitos, now());

  INSERT INTO public.user_profiles (user_id, reputacao_estrelas, seller_badge, updated_at)
  VALUES (v_user_id, 5.0, 'loja_oficial'::public.seller_badge, now())
  ON CONFLICT (user_id) DO UPDATE SET
    seller_badge = 'loja_oficial'::public.seller_badge,
    updated_at = now();
END $fix$;
