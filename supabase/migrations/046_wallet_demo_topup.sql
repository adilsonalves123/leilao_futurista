  -- Recarga demo da carteira (sandbox / testes — desabilitar ou restringir em produção)

  CREATE OR REPLACE FUNCTION public.carteira_recarga_demo(p_amount_cents BIGINT)
  RETURNS JSONB
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  DECLARE
    v_uid UUID := auth.uid();
    v_new_balance BIGINT;
  BEGIN
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'Faça login para recarregar a carteira.';
    END IF;

    IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
      RAISE EXCEPTION 'Informe um valor positivo para recarga.';
    END IF;

    IF p_amount_cents > 10000000 THEN
      RAISE EXCEPTION 'Recarga demo limitada a R$ 100.000,00 por operação.';
    END IF;

    UPDATE public.users
    SET escrow_balance_cents = escrow_balance_cents + p_amount_cents
    WHERE id = v_uid
    RETURNING escrow_balance_cents INTO v_new_balance;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Perfil de usuário não encontrado.';
    END IF;

    RETURN jsonb_build_object(
      'ok', true,
      'credited_cents', p_amount_cents,
      'new_balance_cents', v_new_balance
    );
  END;
  $$;

  REVOKE ALL ON FUNCTION public.carteira_recarga_demo(BIGINT) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.carteira_recarga_demo(BIGINT) TO authenticated;
