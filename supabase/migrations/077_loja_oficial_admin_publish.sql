-- Loja Oficial Levou: conta de sistema + publicação direta pelo admin.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- UUID fixo da conta oficial (sincronizado com o app).
-- Senha inicial após seed: LevouLojaSetup! — redefina no Supabase Auth.
DO $seed$
DECLARE
  v_user_id UUID := 'b0000000-0000-4000-8000-000000000001';
  v_email TEXT := 'loja@levou.app.br';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = v_user_id OR lower(trim(email)) = v_email
  ) THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt('LevouLojaSetup!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"Levou Oficial"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  END IF;

  SELECT COALESCE(
    (SELECT id FROM auth.users WHERE id = v_user_id LIMIT 1),
    (SELECT id FROM auth.users WHERE lower(trim(email)) = v_email LIMIT 1)
  )
  INTO v_user_id;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      v_user_id::text,
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      'email',
      now(),
      now(),
      now()
    )
    ON CONFLICT DO NOTHING;

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
  END IF;
END $seed$;

CREATE OR REPLACE FUNCTION public.levou_oficial_vendor_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id
  FROM public.users u
  WHERE lower(trim(u.email)) IN ('loja@levou.app.br', 'oficial@levou.app.br')
  ORDER BY
    CASE lower(trim(u.email))
      WHEN 'loja@levou.app.br' THEN 0
      ELSE 1
    END,
    u.created_at ASC NULLS LAST
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.admin_loja_oficial_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_vendor UUID;
  v_user RECORD;
  v_live INT;
  v_draft INT;
BEGIN
  PERFORM set_config('row_security', 'off', true);

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users adm
    WHERE adm.id = auth.uid() AND adm.role = 'admin'::public.user_role
  ) THEN
    RAISE EXCEPTION 'Acesso negado: role admin necessário.';
  END IF;

  v_vendor := public.levou_oficial_vendor_id();

  IF v_vendor IS NULL THEN
    RETURN jsonb_build_object(
      'ready', false,
      'message', 'Conta loja@levou.app.br ainda não existe. Execute a migration 077 ou crie o usuário no Auth.'
    );
  END IF;

  SELECT id, email, display_name, status_verificacao
  INTO v_user
  FROM public.users
  WHERE id = v_vendor;

  SELECT COUNT(*)::INT INTO v_live
  FROM public.auctions
  WHERE seller_id = v_vendor AND status = 'live'::public.auction_status;

  SELECT COUNT(*)::INT INTO v_draft
  FROM public.auctions
  WHERE seller_id = v_vendor AND status = 'draft'::public.auction_status;

  RETURN jsonb_build_object(
    'ready', true,
    'vendor_id', v_vendor,
    'email', v_user.email,
    'display_name', v_user.display_name,
    'status_kyc', v_user.status_verificacao,
    'seller_badge', 'loja_oficial',
    'leiloes_ao_vivo', v_live,
    'leiloes_em_analise', v_draft
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_publicar_leilao_loja_oficial(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor UUID;
  v_auction_id UUID := gen_random_uuid();
  v_starts TIMESTAMPTZ := now();
  v_ends TIMESTAMPTZ;
  v_category TEXT;
  v_starting BIGINT;
  v_estimated BIGINT;
  v_conservation TEXT;
  v_cep TEXT;
  v_want_featured BOOLEAN;
  v_want_plus BOOLEAN;
  v_go_live BOOLEAN;
  v_status public.auction_status;
  v_plus_slots INT;
  v_plus_live INT;
BEGIN
  PERFORM set_config('row_security', 'off', true);

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users adm
    WHERE adm.id = auth.uid() AND adm.role = 'admin'::public.user_role
  ) THEN
    RAISE EXCEPTION 'Acesso negado: role admin necessário.';
  END IF;

  v_vendor := public.levou_oficial_vendor_id();
  IF v_vendor IS NULL THEN
    RAISE EXCEPTION 'Conta Loja Oficial não configurada. Verifique loja@levou.app.br no Auth.';
  END IF;

  v_category := NULLIF(trim(p_payload->>'listing_category'), '');
  v_conservation := NULLIF(trim(p_payload->>'conservation_state'), '');
  v_cep := regexp_replace(COALESCE(p_payload->>'origin_cep', ''), '\D', '', 'g');
  v_starting := COALESCE((p_payload->>'starting_price_cents')::BIGINT, 0);
  v_estimated := COALESCE((p_payload->>'estimated_market_cents')::BIGINT, 0);
  v_want_featured := COALESCE((p_payload->>'want_featured')::BOOLEAN, false);
  v_want_plus := COALESCE((p_payload->>'want_featured_plus')::BOOLEAN, false);
  v_go_live := COALESCE((p_payload->>'publicar_ao_vivo')::BOOLEAN, true);

  IF NULLIF(trim(p_payload->>'title'), '') IS NULL THEN
    RAISE EXCEPTION 'Título obrigatório.';
  END IF;

  IF v_conservation IS NULL THEN
    RAISE EXCEPTION 'Estado de conservação obrigatório.';
  END IF;

  IF length(v_cep) <> 8 THEN
    RAISE EXCEPTION 'CEP de origem inválido (8 dígitos).';
  END IF;

  IF v_starting <= 0 OR v_estimated <= 0 OR v_starting >= v_estimated THEN
    RAISE EXCEPTION 'Preços inválidos: lance inicial deve ser menor que o valor de mercado.';
  END IF;

  v_ends := v_starts + public._listing_duration_interval(
    COALESCE(NULLIF(trim(p_payload->>'auction_duration'), ''), '24 horas')
  );

  IF v_want_plus THEN
    SELECT max_live_slots INTO v_plus_slots
    FROM public.promotion_plans
    WHERE slug = 'featured_plus' AND active;
    v_plus_live := public.count_featured_plus_live();
    IF v_plus_live >= COALESCE(v_plus_slots, 5) THEN
      RAISE EXCEPTION 'Sem vagas para Destaque Plus na Home no momento.';
    END IF;
  END IF;

  v_status := CASE
    WHEN v_go_live THEN 'live'::public.auction_status
    ELSE 'draft'::public.auction_status
  END;

  INSERT INTO public.auctions (
    id,
    seller_id,
    title,
    description,
    image_urls,
    starting_price_cents,
    current_price_cents,
    status,
    starts_at,
    ends_at,
    listing_category,
    conservation_state,
    origin_cep,
    estimated_market_cents,
    ownership_declared_at,
    is_featured,
    is_featured_plus,
    featured_until,
    featured_plus_until,
    listing_extras
  ) VALUES (
    v_auction_id,
    v_vendor,
    trim(p_payload->>'title'),
    NULLIF(trim(p_payload->>'description'), ''),
    '{}'::text[],
    v_starting,
    v_starting,
    v_status,
    v_starts,
    v_ends,
    COALESCE(v_category, 'produtos_gerais'),
    v_conservation,
    v_cep,
    v_estimated,
    now(),
    v_want_featured,
    v_want_plus,
    CASE WHEN v_want_featured THEN v_ends ELSE NULL END,
    CASE WHEN v_want_plus THEN v_ends ELSE NULL END,
    jsonb_build_object(
      'published_by', 'admin_loja_oficial',
      'admin_user_id', auth.uid(),
      'official_store', true
    )
  );

  IF v_want_featured THEN
    INSERT INTO public.auction_promotions (auction_id, seller_id, plan_slug, price_paid_cents, expires_at, status)
    VALUES (
      v_auction_id,
      v_vendor,
      'featured',
      0,
      v_ends,
      'active'
    );
  END IF;

  IF v_want_plus THEN
    INSERT INTO public.auction_promotions (auction_id, seller_id, plan_slug, price_paid_cents, expires_at, status)
    VALUES (
      v_auction_id,
      v_vendor,
      'featured_plus',
      0,
      v_ends,
      'active'
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'auction_id', v_auction_id,
    'vendor_id', v_vendor,
    'status', v_status::TEXT,
    'ends_at', v_ends
  );
END;
$$;

COMMENT ON FUNCTION public.admin_publicar_leilao_loja_oficial(JSONB) IS
  'Admin publica leilão em nome da Loja Oficial Levou — sem garantia de vendedor e sem cobrança de destaque.';

REVOKE ALL ON FUNCTION public.levou_oficial_vendor_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_loja_oficial_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_publicar_leilao_loja_oficial(JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.levou_oficial_vendor_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_loja_oficial_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_publicar_leilao_loja_oficial(JSONB) TO authenticated;
