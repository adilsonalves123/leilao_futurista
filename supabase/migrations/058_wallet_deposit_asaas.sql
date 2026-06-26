-- Recarga real da carteira via Asaas (Pix)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_deposit_status') THEN
    CREATE TYPE public.wallet_deposit_status AS ENUM ('pendente', 'recebido', 'cancelado');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.wallet_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  asaas_payment_id TEXT NOT NULL,
  status public.wallet_deposit_status NOT NULL DEFAULT 'pendente',
  payment_method public.invoice_payment_method NOT NULL DEFAULT 'pix',
  gateway_fee_cents BIGINT NOT NULL DEFAULT 0,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  CONSTRAINT wallet_deposits_asaas_payment_id_key UNIQUE (asaas_payment_id)
);

CREATE INDEX IF NOT EXISTS wallet_deposits_user_id_idx ON public.wallet_deposits(user_id);
CREATE INDEX IF NOT EXISTS wallet_deposits_status_idx ON public.wallet_deposits(status);

ALTER TABLE public.wallet_deposits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wallet_deposits_select_own ON public.wallet_deposits;
CREATE POLICY wallet_deposits_select_own ON public.wallet_deposits
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.iniciar_recarga_carteira(
  p_user_id UUID,
  p_amount_cents BIGINT,
  p_asaas_payment_id TEXT,
  p_gateway_fee_cents BIGINT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deposit_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário obrigatório.';
  END IF;

  IF p_amount_cents IS NULL OR p_amount_cents < 1000 THEN
    RAISE EXCEPTION 'Valor mínimo de recarga: R$ 10,00.';
  END IF;

  IF p_amount_cents > 5000000 THEN
    RAISE EXCEPTION 'Valor máximo de recarga: R$ 50.000,00 por operação.';
  END IF;

  IF p_asaas_payment_id IS NULL OR length(trim(p_asaas_payment_id)) = 0 THEN
    RAISE EXCEPTION 'ID de pagamento Asaas obrigatório.';
  END IF;

  INSERT INTO public.wallet_deposits (
    user_id,
    amount_cents,
    asaas_payment_id,
    status,
    payment_method,
    gateway_fee_cents
  )
  VALUES (
    p_user_id,
    p_amount_cents,
    trim(p_asaas_payment_id),
    'pendente',
    'pix',
    COALESCE(p_gateway_fee_cents, 0)
  )
  RETURNING id INTO v_deposit_id;

  RETURN jsonb_build_object(
    'ok', true,
    'deposit_id', v_deposit_id,
    'amount_cents', p_amount_cents,
    'asaas_payment_id', trim(p_asaas_payment_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.confirmar_recarga_carteira_asaas(
  p_asaas_payment_id TEXT,
  p_receipt_url TEXT DEFAULT NULL,
  p_gateway_fee_cents BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deposit public.wallet_deposits%ROWTYPE;
  v_new_balance BIGINT;
  v_fee BIGINT;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF p_asaas_payment_id IS NULL OR length(trim(p_asaas_payment_id)) = 0 THEN
    RAISE EXCEPTION 'ID de pagamento Asaas obrigatório.';
  END IF;

  SELECT * INTO v_deposit
  FROM public.wallet_deposits
  WHERE asaas_payment_id = trim(p_asaas_payment_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'deposit_not_found');
  END IF;

  IF v_deposit.status = 'recebido' THEN
    SELECT escrow_balance_cents INTO v_new_balance
    FROM public.users
    WHERE id = v_deposit.user_id;

    RETURN jsonb_build_object(
      'ok', true,
      'already_confirmed', true,
      'deposit_id', v_deposit.id,
      'user_id', v_deposit.user_id,
      'new_balance_cents', v_new_balance
    );
  END IF;

  v_fee := COALESCE(p_gateway_fee_cents, v_deposit.gateway_fee_cents, 0);

  UPDATE public.users
  SET escrow_balance_cents = escrow_balance_cents + v_deposit.amount_cents
  WHERE id = v_deposit.user_id
  RETURNING escrow_balance_cents INTO v_new_balance;

  UPDATE public.wallet_deposits
  SET
    status = 'recebido',
    gateway_fee_cents = v_fee,
    receipt_url = COALESCE(p_receipt_url, receipt_url),
    confirmed_at = v_now,
    updated_at = v_now
  WHERE id = v_deposit.id;

  RETURN jsonb_build_object(
    'ok', true,
    'deposit_id', v_deposit.id,
    'user_id', v_deposit.user_id,
    'credited_cents', v_deposit.amount_cents,
    'new_balance_cents', v_new_balance
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.consultar_status_recarga_carteira_asaas(p_asaas_payment_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_deposit public.wallet_deposits%ROWTYPE;
  v_balance BIGINT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Faça login para consultar a recarga.';
  END IF;

  SELECT * INTO v_deposit
  FROM public.wallet_deposits
  WHERE asaas_payment_id = trim(p_asaas_payment_id)
    AND user_id = v_uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  SELECT escrow_balance_cents INTO v_balance
  FROM public.users
  WHERE id = v_uid;

  RETURN jsonb_build_object(
    'ok', true,
    'deposit_id', v_deposit.id,
    'status', v_deposit.status::TEXT,
    'received', v_deposit.status = 'recebido',
    'amount_cents', v_deposit.amount_cents,
    'new_balance_cents', v_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.iniciar_recarga_carteira(UUID, BIGINT, TEXT, BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirmar_recarga_carteira_asaas(TEXT, TEXT, BIGINT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.iniciar_recarga_carteira(UUID, BIGINT, TEXT, BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirmar_recarga_carteira_asaas(TEXT, TEXT, BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.consultar_status_recarga_carteira_asaas(TEXT) TO authenticated;
