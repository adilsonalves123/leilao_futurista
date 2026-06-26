-- Cadastro de leilão: campos fiscais/segurança + RPC de publicação com cobrança na carteira

ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS conservation_state TEXT
    CHECK (conservation_state IS NULL OR conservation_state IN (
      'novo', 'excelente', 'bom', 'marcas_uso'
    )),
  ADD COLUMN IF NOT EXISTS serial_imei TEXT,
  ADD COLUMN IF NOT EXISTS serial_imei_kind TEXT
    CHECK (serial_imei_kind IS NULL OR serial_imei_kind IN ('imei', 'serial')),
  ADD COLUMN IF NOT EXISTS origin_cep TEXT,
  ADD COLUMN IF NOT EXISTS estimated_market_cents BIGINT
    CHECK (estimated_market_cents IS NULL OR estimated_market_cents >= 0),
  ADD COLUMN IF NOT EXISTS nf_access_key TEXT,
  ADD COLUMN IF NOT EXISTS ai_cover_optimized BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS listing_extras JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ownership_declared_at TIMESTAMPTZ;

COMMENT ON COLUMN public.auctions.conservation_state IS 'Estado de conservação informado no cadastro.';
COMMENT ON COLUMN public.auctions.serial_imei IS 'IMEI ou número de série (obrigatório em eletrônicos).';
COMMENT ON COLUMN public.auctions.listing_extras IS 'Metadados: frete, veículo, imóvel, NF PDF flag, etc.';

INSERT INTO public.promotion_plans (slug, name, description, price_cents, duration_mode, max_live_slots, sort_order)
VALUES (
  'ai_cover_optimize',
  'Otimização IA — Capa',
  'Assistente escolhe e prepara a foto de capa do anúncio.',
  499,
  'until_auction_end',
  NULL,
  3
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  description = EXCLUDED.description;

CREATE OR REPLACE FUNCTION public._listing_duration_interval(p_label TEXT)
RETURNS INTERVAL
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_label
    WHEN '1 hora' THEN interval '1 hour'
    WHEN '6 horas' THEN interval '6 hours'
    WHEN '24 horas' THEN interval '24 hours'
    WHEN '3 dias' THEN interval '3 days'
    WHEN '7 dias' THEN interval '7 days'
    ELSE interval '24 hours'
  END;
$$;

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

CREATE OR REPLACE FUNCTION public.atualizar_imagens_leilao_rascunho(
  p_auction_id UUID,
  p_image_urls TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF p_image_urls IS NULL OR array_length(p_image_urls, 1) IS NULL THEN
    RAISE EXCEPTION 'Envie pelo menos uma foto.';
  END IF;

  UPDATE public.auctions
  SET image_urls = p_image_urls
  WHERE id = p_auction_id
    AND seller_id = auth.uid()
    AND status = 'draft';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leilão não encontrado ou não está em rascunho.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.publicar_leilao(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.atualizar_imagens_leilao_rascunho(UUID, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publicar_leilao(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_imagens_leilao_rascunho(UUID, TEXT[]) TO authenticated;

-- Rascunhos com Plus também ocupam vaga (evita superlotação ao aprovar)
CREATE OR REPLACE FUNCTION public.count_featured_plus_live()
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INT
  FROM public.auctions a
  WHERE a.is_featured_plus = true
    AND a.status IN ('live', 'draft')
    AND (a.featured_plus_until IS NULL OR a.featured_plus_until > now());
$$;
