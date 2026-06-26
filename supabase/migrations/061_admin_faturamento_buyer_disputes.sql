-- Relatório mensal admin (faturamento real) + RPCs do comprador para disputas

CREATE OR REPLACE FUNCTION public.admin_obter_faturamento_mensal(
  p_days INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days INT := GREATEST(7, LEAST(COALESCE(p_days, 30), 90));
  v_inicio_mes TIMESTAMPTZ := date_trunc('month', now());
  v_inicio_mes_ant TIMESTAMPTZ := date_trunc('month', now() - interval '1 month');
  v_fim_mes_ant TIMESTAMPTZ := v_inicio_mes;
  v_desde TIMESTAMPTZ := date_trunc('day', now()) - ((v_days - 1) * interval '1 day');

  v_comissao_mes BIGINT := 0;
  v_comissao_mes_ant BIGINT := 0;
  v_receita_mes BIGINT := 0;
  v_receita_mes_ant BIGINT := 0;
  v_pedidos_liquidados BIGINT := 0;
  v_transacoes_totais BIGINT := 0;

  v_comissao_var NUMERIC := 0;
  v_receita_var NUMERIC := 0;

  v_fluxo JSONB;
  v_spark_comissao JSONB;
  v_spark_receita JSONB;
  v_recentes JSONB;
BEGIN
  PERFORM set_config('row_security', 'off', true);

  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: role admin necessário.';
  END IF;

  SELECT COALESCE(SUM(o.commission_cents), 0)
  INTO v_comissao_mes
  FROM public.orders o
  WHERE o.status = 'finalizado'::public.order_status
    AND o.finalized_at >= v_inicio_mes;

  SELECT COALESCE(SUM(o.commission_cents), 0)
  INTO v_comissao_mes_ant
  FROM public.orders o
  WHERE o.status = 'finalizado'::public.order_status
    AND o.finalized_at >= v_inicio_mes_ant
    AND o.finalized_at < v_fim_mes_ant;

  SELECT COALESCE(SUM(o.total_cents), 0)
  INTO v_receita_mes
  FROM public.orders o
  WHERE o.status = 'finalizado'::public.order_status
    AND o.finalized_at >= v_inicio_mes;

  SELECT COALESCE(SUM(o.total_cents), 0)
  INTO v_receita_mes_ant
  FROM public.orders o
  WHERE o.status = 'finalizado'::public.order_status
    AND o.finalized_at >= v_inicio_mes_ant
    AND o.finalized_at < v_fim_mes_ant;

  SELECT COUNT(*)
  INTO v_pedidos_liquidados
  FROM public.orders o
  WHERE o.status = 'finalizado'::public.order_status
    AND o.finalized_at >= v_inicio_mes;

  SELECT COUNT(*)
  INTO v_transacoes_totais
  FROM public.orders o
  WHERE o.created_at >= v_inicio_mes;

  IF v_comissao_mes_ant > 0 THEN
    v_comissao_var := ROUND(((v_comissao_mes - v_comissao_mes_ant)::NUMERIC / v_comissao_mes_ant) * 100, 2);
  ELSIF v_comissao_mes > 0 THEN
    v_comissao_var := 100;
  END IF;

  IF v_receita_mes_ant > 0 THEN
    v_receita_var := ROUND(((v_receita_mes - v_receita_mes_ant)::NUMERIC / v_receita_mes_ant) * 100, 2);
  ELSIF v_receita_mes > 0 THEN
    v_receita_var := 100;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'dia', to_char(d.dia, 'YYYY-MM-DD'),
      'label', to_char(d.dia, 'DD/MM'),
      'comissaoCents', COALESCE(f.comissao_cents, 0),
      'receitaCents', COALESCE(f.receita_cents, 0)
    )
    ORDER BY d.dia ASC
  ), '[]'::jsonb)
  INTO v_fluxo
  FROM (
    SELECT generate_series(v_desde, date_trunc('day', now()), interval '1 day')::date AS dia
  ) d
  LEFT JOIN (
    SELECT
      date_trunc('day', o.finalized_at)::date AS dia,
      SUM(o.commission_cents) AS comissao_cents,
      SUM(o.total_cents) AS receita_cents
    FROM public.orders o
    WHERE o.status = 'finalizado'::public.order_status
      AND o.finalized_at >= v_desde
    GROUP BY 1
  ) f ON f.dia = d.dia;

  SELECT COALESCE(jsonb_agg(x.comissao ORDER BY x.ord), '[]'::jsonb)
  INTO v_spark_comissao
  FROM (
    SELECT
      ROW_NUMBER() OVER (ORDER BY d.dia) AS ord,
      COALESCE(f.comissao_cents, 0) AS comissao
    FROM (
      SELECT generate_series(
        date_trunc('day', now()) - interval '9 day',
        date_trunc('day', now()),
        interval '1 day'
      )::date AS dia
    ) d
    LEFT JOIN (
      SELECT
        date_trunc('day', o.finalized_at)::date AS dia,
        SUM(o.commission_cents) AS comissao_cents
      FROM public.orders o
      WHERE o.status = 'finalizado'::public.order_status
        AND o.finalized_at >= date_trunc('day', now()) - interval '9 day'
      GROUP BY 1
    ) f ON f.dia = d.dia
  ) x;

  SELECT COALESCE(jsonb_agg(x.receita ORDER BY x.ord), '[]'::jsonb)
  INTO v_spark_receita
  FROM (
    SELECT
      ROW_NUMBER() OVER (ORDER BY d.dia) AS ord,
      COALESCE(f.receita_cents, 0) AS receita
    FROM (
      SELECT generate_series(
        date_trunc('day', now()) - interval '9 day',
        date_trunc('day', now()),
        interval '1 day'
      )::date AS dia
    ) d
    LEFT JOIN (
      SELECT
        date_trunc('day', o.finalized_at)::date AS dia,
        SUM(o.total_cents) AS receita_cents
      FROM public.orders o
      WHERE o.status = 'finalizado'::public.order_status
        AND o.finalized_at >= date_trunc('day', now()) - interval '9 day'
      GROUP BY 1
    ) f ON f.dia = d.dia
  ) x;

  SELECT COALESCE(jsonb_agg(row_data ORDER BY row_created DESC), '[]'::jsonb)
  INTO v_recentes
  FROM (
    SELECT
      o.created_at AS row_created,
      jsonb_build_object(
        'id', o.code,
        'orderId', o.id,
        'leilaoId', o.auction_id,
        'auctionTitle', a.title,
        'auctionImage', COALESCE(a.image_urls[1], ''),
        'buyerId', o.buyer_id,
        'buyerNome', COALESCE(bu.nome_completo, bu.display_name, bu.email),
        'buyerEmail', bu.email,
        'buyerTelefone', bu.telefone,
        'buyerCpf', bu.cpf,
        'valorCents', o.total_cents,
        'createdAt', o.created_at,
        'status', CASE
          WHEN o.status = 'finalizado'::public.order_status THEN 'concluido'
          WHEN o.status = 'pendente_pagamento'::public.order_status THEN 'pendente'
          ELSE 'concluido'
        END,
        'paymentMethod', COALESCE(inv.payment_method::TEXT, 'pix'),
        'transacaoId', COALESCE(inv.gateway_transaction_id, o.code),
        'aprovadoEm', inv.approved_at,
        'comprovanteUrl', inv.receipt_url,
        'gateway', COALESCE(inv.gateway, 'luckcode')
      ) AS row_data
    FROM public.orders o
    JOIN public.auctions a ON a.id = o.auction_id
    JOIN public.users bu ON bu.id = o.buyer_id
    LEFT JOIN public.auction_invoices inv ON inv.order_id = o.id
    ORDER BY o.created_at DESC
    LIMIT 10
  ) recentes;

  RETURN jsonb_build_object(
    'ok', true,
    'comissaoCents', v_comissao_mes,
    'comissaoVariacaoPct', v_comissao_var,
    'receitaCents', v_receita_mes,
    'receitaVariacaoPct', v_receita_var,
    'pedidosLiquidados', v_pedidos_liquidados,
    'transacoesTotais', v_transacoes_totais,
    'fluxoDiario', v_fluxo,
    'sparklineComissao', v_spark_comissao,
    'sparklineReceita', v_spark_receita,
    'transacoesRecentes', v_recentes
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.abrir_disputa_comprador(
  p_order_id UUID,
  p_category TEXT,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_dispute_id UUID;
  v_category public.dispute_category;
  v_reason TEXT := NULLIF(btrim(COALESCE(p_reason, '')), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'order_not_found');
  END IF;

  IF v_order.buyer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Somente o comprador pode abrir disputa neste pedido.';
  END IF;

  IF v_order.status <> 'aguardando_confirmacao'::public.order_status THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'invalid_status',
      'message', 'Disputa só pode ser aberta enquanto o pedido aguarda sua confirmação.'
    );
  END IF;

  IF EXISTS (SELECT 1 FROM public.order_disputes d WHERE d.order_id = p_order_id) THEN
    SELECT d.id INTO v_dispute_id FROM public.order_disputes d WHERE d.order_id = p_order_id;
    RETURN jsonb_build_object('ok', true, 'disputeId', v_dispute_id, 'alreadyExists', true);
  END IF;

  v_category := COALESCE(p_category, 'outro')::public.dispute_category;
  IF v_reason IS NULL THEN
    v_reason := 'Disputa aberta pelo comprador.';
  END IF;

  INSERT INTO public.order_disputes (order_id, opened_by, category, reason, status)
  VALUES (p_order_id, auth.uid(), v_category, v_reason, 'aberta'::public.dispute_status)
  RETURNING id INTO v_dispute_id;

  PERFORM public.update_order_status(
    p_order_id,
    'em_disputa'::public.order_status,
    NULL,
    'disputa_aberta',
    v_reason
  );

  RETURN jsonb_build_object('ok', true, 'disputeId', v_dispute_id, 'alreadyExists', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.comprador_registrar_evidencia_disputa(
  p_dispute_id UUID,
  p_kind TEXT,
  p_media_url TEXT,
  p_caption TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_order public.orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  SELECT o.*
  INTO v_order
  FROM public.order_disputes d
  JOIN public.orders o ON o.id = d.order_id
  WHERE d.id = p_dispute_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Disputa não encontrada.';
  END IF;

  IF v_order.buyer_id <> auth.uid() AND v_order.vendor_id <> auth.uid() THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  INSERT INTO public.order_dispute_evidence (
    dispute_id,
    party,
    kind,
    media_url,
    caption,
    created_by
  )
  VALUES (
    p_dispute_id,
    CASE WHEN v_order.buyer_id = auth.uid() THEN 'comprador'::public.dispute_party ELSE 'vendedor'::public.dispute_party END,
    COALESCE(p_kind, 'foto')::public.dispute_evidence_kind,
    p_media_url,
    NULLIF(btrim(COALESCE(p_caption, '')), ''),
    auth.uid()
  )
  RETURNING id INTO v_id;

  UPDATE public.order_disputes SET updated_at = now() WHERE id = p_dispute_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.comprador_obter_disputa(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_dispute public.order_disputes%ROWTYPE;
  v_evidence JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'order_not_found');
  END IF;

  IF v_order.buyer_id <> auth.uid() AND v_order.vendor_id <> auth.uid() THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  SELECT * INTO v_dispute FROM public.order_disputes WHERE order_id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'dispute_not_found');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', e.id,
      'party', e.party::TEXT,
      'kind', e.kind::TEXT,
      'mediaUrl', e.media_url,
      'caption', e.caption,
      'createdAt', e.created_at
    )
    ORDER BY e.created_at ASC
  ), '[]'::jsonb)
  INTO v_evidence
  FROM public.order_dispute_evidence e
  WHERE e.dispute_id = v_dispute.id;

  RETURN jsonb_build_object(
    'ok', true,
    'dispute', jsonb_build_object(
      'id', v_dispute.id,
      'orderId', v_dispute.order_id,
      'category', v_dispute.category::TEXT,
      'reason', v_dispute.reason,
      'status', v_dispute.status::TEXT,
      'openedAt', v_dispute.opened_at,
      'updatedAt', v_dispute.updated_at,
      'resolvedAt', v_dispute.resolved_at
    ),
    'evidence', v_evidence
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_obter_faturamento_mensal(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.abrir_disputa_comprador(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.comprador_registrar_evidencia_disputa(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.comprador_obter_disputa(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_obter_faturamento_mensal(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.abrir_disputa_comprador(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.comprador_registrar_evidencia_disputa(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.comprador_obter_disputa(UUID) TO authenticated;
