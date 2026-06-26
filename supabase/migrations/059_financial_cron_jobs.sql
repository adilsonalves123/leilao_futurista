-- Jobs financeiros agendados: liberação de garantias vendedor + confisco por não pagamento

CREATE OR REPLACE FUNCTION public.processar_vencedores_nao_pagantes(
  p_deadline_hours INT DEFAULT 48
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_order RECORD;
  v_result JSONB;
  v_count INT := 0;
  v_hours INT := GREATEST(COALESCE(p_deadline_hours, 48), 1);
BEGIN
  FOR v_row IN
    SELECT
      a.id AS auction_id,
      a.title,
      a.seller_id,
      bh.bidder_id AS winner_id,
      bh.hold_cents
    FROM public.auctions a
    INNER JOIN public.bid_holds bh
      ON bh.auction_id = a.id
     AND bh.status = 'winning'
    WHERE a.status = 'ended'::auction_status
      AND a.ends_at + make_interval(hours => v_hours) <= now()
      AND NOT EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE o.auction_id = a.id
          AND o.status = 'pago'::order_status
      )
  LOOP
    v_result := public.confiscar_retencao_vencedor(v_row.auction_id);
    IF COALESCE((v_result->>'ok')::BOOLEAN, false) THEN
      PERFORM public.liberar_garantia_leilao(v_row.auction_id, 'vencedor_nao_pagou');

      FOR v_order IN
        SELECT o.id, o.code
        FROM public.orders o
        WHERE o.auction_id = v_row.auction_id
          AND o.status = 'pendente_pagamento'::order_status
      LOOP
        UPDATE public.orders
        SET status = 'estornado'::order_status, updated_at = now()
        WHERE id = v_order.id;

        INSERT INTO public.order_events (order_id, event_type, message, metadata)
        VALUES (
          v_order.id,
          'pagamento_expirado',
          'Prazo de pagamento encerrado — pedido estornado e caução do lance confiscada.',
          jsonb_build_object(
            'auction_id', v_row.auction_id,
            'deadline_hours', v_hours
          )
        );
      END LOOP;

      UPDATE public.checkouts
      SET escrow_status = 'refunded'::escrow_status
      WHERE auction_id = v_row.auction_id
        AND escrow_status = 'pending'::escrow_status;

      PERFORM public.enqueue_notification(
        v_row.winner_id,
        'payment_forfeited',
        'Prazo de pagamento expirado',
        format(
          'Você não concluiu o pagamento de %s no prazo. A caução do lance foi retida.',
          COALESCE(v_row.title, 'o leilão')
        ),
        jsonb_build_object(
          'url', '/auction/' || v_row.auction_id::TEXT,
          'auctionId', v_row.auction_id::TEXT
        ),
        'payment_forfeited:' || v_row.auction_id::TEXT || ':' || v_row.winner_id::TEXT,
        NULL
      );

      PERFORM public.enqueue_notification(
        v_row.seller_id,
        'winner_payment_expired',
        'Vencedor não pagou',
        format(
          '%s — o arrematante não pagou no prazo. Sua garantia foi liberada.',
          COALESCE(v_row.title, 'Seu leilão')
        ),
        jsonb_build_object(
          'url', '/admin/leiloes',
          'auctionId', v_row.auction_id::TEXT
        ),
        'winner_payment_expired:' || v_row.auction_id::TEXT || ':' || v_row.seller_id::TEXT,
        NULL
      );

      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.run_scheduled_financial_jobs(
  p_deadline_hours INT DEFAULT 48
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_collateral INT;
  v_forfeited INT;
BEGIN
  v_collateral := public.liberar_garantias_vencidas();
  v_forfeited := public.processar_vencedores_nao_pagantes(p_deadline_hours);

  RETURN jsonb_build_object(
    'ok', true,
    'collateral_released', v_collateral,
    'winners_forfeited', v_forfeited,
    'deadline_hours', GREATEST(COALESCE(p_deadline_hours, 48), 1),
    'ran_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.processar_vencedores_nao_pagantes(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.run_scheduled_financial_jobs(INT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.liberar_garantias_vencidas() TO service_role;
GRANT EXECUTE ON FUNCTION public.processar_vencedores_nao_pagantes(INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.run_scheduled_financial_jobs(INT) TO service_role;

-- Agenda no pg_cron quando a extensão já estiver habilitada (Supabase Pro).
DO $cron$
BEGIN
  IF to_regclass('cron.job') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'levou-financial-jobs') THEN
    PERFORM cron.schedule(
      'levou-financial-jobs',
      '*/15 * * * *',
      $job$SELECT public.run_scheduled_financial_jobs(48);$job$
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron indisponível — use a Edge Function run-financial-jobs com cron externo.';
END;
$cron$;
