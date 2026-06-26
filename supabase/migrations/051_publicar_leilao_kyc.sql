-- Publicar leilão exige o mesmo KYC aprovado exigido para dar lances (auth_kyc_aprovado)



CREATE OR REPLACE FUNCTION public.publicar_leilao(p_payload JSONB)

RETURNS JSONB

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = public

AS $$

DECLARE

  v_uid UUID := auth.uid();

  v_auction_id UUID := gen_random_uuid();

  v_starts TIMESTAMPTZ := now();

  v_ends TIMESTAMPTZ;

  v_category TEXT;

  v_balance BIGINT;

  v_total BIGINT := 0;

  v_want_featured BOOLEAN;

  v_want_plus BOOLEAN;

  v_want_ai BOOLEAN;

  v_plus_slots INT;

  v_plus_live INT;

  v_starting BIGINT;

  v_estimated BIGINT;

  v_conservation TEXT;

  v_serial TEXT;

  v_cep TEXT;

BEGIN

  IF v_uid IS NULL THEN

    RAISE EXCEPTION 'Faça login para publicar um leilão.';

  END IF;



  IF NOT public.auth_kyc_aprovado() THEN

    RAISE EXCEPTION 'Cadastro completo (KYC) aprovado é obrigatório para publicar. Conclua a verificação no app.';

  END IF;



  v_category := NULLIF(trim(p_payload->>'listing_category'), '');

  v_conservation := NULLIF(trim(p_payload->>'conservation_state'), '');

  v_serial := NULLIF(trim(p_payload->>'serial_imei'), '');

  v_cep := regexp_replace(COALESCE(p_payload->>'origin_cep', ''), '\D', '', 'g');

  v_starting := COALESCE((p_payload->>'starting_price_cents')::BIGINT, 0);

  v_estimated := COALESCE((p_payload->>'estimated_market_cents')::BIGINT, 0);

  v_want_featured := COALESCE((p_payload->>'want_featured')::BOOLEAN, false);

  v_want_plus := COALESCE((p_payload->>'want_featured_plus')::BOOLEAN, false);

  v_want_ai := COALESCE((p_payload->>'want_ai_cover')::BOOLEAN, false);



  IF NULLIF(trim(p_payload->>'title'), '') IS NULL THEN

    RAISE EXCEPTION 'Título obrigatório.';

  END IF;

  IF v_conservation IS NULL THEN

    RAISE EXCEPTION 'Estado de conservação obrigatório.';

  END IF;

  IF length(v_cep) <> 8 THEN

    RAISE EXCEPTION 'CEP de origem inválido.';

  END IF;

  IF v_starting <= 0 OR v_estimated <= 0 OR v_starting >= v_estimated THEN

    RAISE EXCEPTION 'Preços inválidos.';

  END IF;

  IF v_category = 'eletronicos' AND (v_serial IS NULL OR length(v_serial) < 5) THEN

    RAISE EXCEPTION 'IMEI ou número de série obrigatório para eletrônicos.';

  END IF;



  v_ends := v_starts + public._listing_duration_interval(p_payload->>'auction_duration');



  IF v_want_plus THEN

    SELECT max_live_slots INTO v_plus_slots FROM public.promotion_plans WHERE slug = 'featured_plus' AND active;

    v_plus_live := public.count_featured_plus_live();

    IF v_plus_live >= COALESCE(v_plus_slots, 5) THEN

      RAISE EXCEPTION 'Sem vagas para Destaque Plus na Home no momento.';

    END IF;

    v_total := v_total + COALESCE(

      (SELECT price_cents FROM public.promotion_plans WHERE slug = 'featured_plus' AND active),

      0

    );

  END IF;



  IF v_want_featured THEN

    v_total := v_total + COALESCE(

      (SELECT price_cents FROM public.promotion_plans WHERE slug = 'featured' AND active),

      0

    );

  END IF;



  IF v_want_ai THEN

    v_total := v_total + COALESCE(

      (SELECT price_cents FROM public.promotion_plans WHERE slug = 'ai_cover_optimize' AND active),

      499

    );

  END IF;



  SELECT escrow_balance_cents INTO v_balance

  FROM public.users

  WHERE id = v_uid

  FOR UPDATE;



  IF NOT FOUND THEN

    RAISE EXCEPTION 'Perfil de usuário não encontrado.';

  END IF;



  IF v_balance < v_total THEN

    RAISE EXCEPTION 'Saldo insuficiente na carteira. Necessário % centavos, disponível %.', v_total, v_balance;

  END IF;



  IF v_total > 0 THEN

    UPDATE public.users

    SET escrow_balance_cents = escrow_balance_cents - v_total

    WHERE id = v_uid;

  END IF;



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

    serial_imei,

    serial_imei_kind,

    origin_cep,

    estimated_market_cents,

    nf_access_key,

    ai_cover_optimized,

    listing_extras,

    ownership_declared_at,

    is_featured,

    is_featured_plus,

    featured_until,

    featured_plus_until

  ) VALUES (

    v_auction_id,

    v_uid,

    trim(p_payload->>'title'),

    NULLIF(trim(p_payload->>'description'), ''),

    '{}'::text[],

    v_starting,

    v_starting,

    'draft',

    v_starts,

    v_ends,

    v_category,

    v_conservation,

    v_serial,

    NULLIF(trim(p_payload->>'serial_imei_kind'), ''),

    v_cep,

    v_estimated,

    NULLIF(trim(p_payload->>'nf_access_key'), ''),

    v_want_ai,

    COALESCE(p_payload->'listing_extras', '{}'::jsonb),

    now(),

    v_want_featured,

    v_want_plus,

    CASE WHEN v_want_featured THEN v_ends ELSE NULL END,

    CASE WHEN v_want_plus THEN v_ends ELSE NULL END

  );



  IF v_want_featured THEN

    INSERT INTO public.auction_promotions (auction_id, seller_id, plan_slug, price_paid_cents, expires_at, status)

    VALUES (

      v_auction_id,

      v_uid,

      'featured',

      (SELECT price_cents FROM public.promotion_plans WHERE slug = 'featured'),

      v_ends,

      'active'

    );

  END IF;



  IF v_want_plus THEN

    INSERT INTO public.auction_promotions (auction_id, seller_id, plan_slug, price_paid_cents, expires_at, status)

    VALUES (

      v_auction_id,

      v_uid,

      'featured_plus',

      (SELECT price_cents FROM public.promotion_plans WHERE slug = 'featured_plus'),

      v_ends,

      'active'

    );

  END IF;



  IF v_want_ai THEN

    INSERT INTO public.auction_promotions (auction_id, seller_id, plan_slug, price_paid_cents, expires_at, status)

    VALUES (

      v_auction_id,

      v_uid,

      'ai_cover_optimize',

      (SELECT price_cents FROM public.promotion_plans WHERE slug = 'ai_cover_optimize'),

      v_ends,

      'active'

    );

  END IF;



  RETURN jsonb_build_object(

    'ok', true,

    'auction_id', v_auction_id,

    'total_charged_cents', v_total,

    'new_balance_cents', v_balance - v_total

  );

END;

$$;


