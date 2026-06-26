-- Perfil do vendedor com reputação + exclusão segura de leilão

CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  reputacao_estrelas NUMERIC(3, 1) NOT NULL DEFAULT 5.0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_profiles_reputacao_range
    CHECK (reputacao_estrelas >= 0 AND reputacao_estrelas <= 5)
);

COMMENT ON TABLE public.user_profiles IS 'Perfil público/comercial do usuário (vendedor e licitante)';
COMMENT ON COLUMN public.user_profiles.reputacao_estrelas IS 'Reputação em estrelas (0 a 5, decremento de 1 ao excluir leilão com lances)';

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile row" ON public.user_profiles;
CREATE POLICY "Users read own profile row"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public read vendor reputation" ON public.user_profiles;
CREATE POLICY "Public read vendor reputation"
  ON public.user_profiles FOR SELECT
  USING (true);

-- Exclusão atômica: cancela leilão e aplica penalidade se houver lances
CREATE OR REPLACE FUNCTION public.excluir_leilao_vendedor(p_auction_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller UUID;
  v_status auction_status;
  v_bid_count INT;
BEGIN
  SELECT seller_id, status
  INTO v_seller, v_status
  FROM public.auctions
  WHERE id = p_auction_id
  FOR UPDATE;

  IF v_seller IS NULL THEN
    RAISE EXCEPTION 'Leilão não encontrado';
  END IF;

  IF auth.uid() IS NULL OR auth.uid() <> v_seller THEN
    RAISE EXCEPTION 'Não autorizado a excluir este leilão';
  END IF;

  IF v_status NOT IN ('live', 'paused', 'draft') THEN
    RAISE EXCEPTION 'Este leilão não pode ser excluído no status atual';
  END IF;

  SELECT COUNT(*)::INT INTO v_bid_count
  FROM public.bids
  WHERE auction_id = p_auction_id;

  UPDATE public.auctions
  SET status = 'cancelled'
  WHERE id = p_auction_id;

  IF v_bid_count > 0 THEN
    INSERT INTO public.user_profiles (user_id, reputacao_estrelas, updated_at)
    VALUES (v_seller, 5.0, now())
    ON CONFLICT (user_id) DO UPDATE
    SET
      reputacao_estrelas = GREATEST(0::numeric, public.user_profiles.reputacao_estrelas - 1),
      updated_at = now();
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.excluir_leilao_vendedor(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.excluir_leilao_vendedor(UUID) TO authenticated;
