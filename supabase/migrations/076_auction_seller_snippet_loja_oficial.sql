-- Snippet público de vendedores (cards de leilão) + etiqueta loja oficial por e-mail.

CREATE OR REPLACE FUNCTION public.vendedores_snippet_publico(p_vendor_ids UUID[])
RETURNS TABLE (
  vendor_id UUID,
  display_name TEXT,
  seller_badge TEXT,
  status_verificacao TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF p_vendor_ids IS NULL OR cardinality(p_vendor_ids) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    u.id AS vendor_id,
    u.display_name::TEXT,
    up.seller_badge::TEXT,
    u.status_verificacao::TEXT
  FROM public.users u
  LEFT JOIN public.user_profiles up ON up.user_id = u.id
  WHERE u.id = ANY(p_vendor_ids)
    AND u.role IS DISTINCT FROM 'admin'::public.user_role;
END;
$$;

COMMENT ON FUNCTION public.vendedores_snippet_publico(UUID[]) IS
  'Nome e etiqueta do vendedor para exibir em cards de leilão (sem PII).';

REVOKE ALL ON FUNCTION public.vendedores_snippet_publico(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vendedores_snippet_publico(UUID[]) TO anon, authenticated;

-- Conta Loja Oficial Levou: etiqueta automática quando o e-mail for da plataforma.
UPDATE public.user_profiles up
SET
  seller_badge = 'loja_oficial'::public.seller_badge,
  updated_at = now()
FROM public.users u
WHERE up.user_id = u.id
  AND lower(trim(u.email)) IN ('loja@levou.app.br', 'oficial@levou.app.br');

INSERT INTO public.user_profiles (user_id, reputacao_estrelas, seller_badge, updated_at)
SELECT
  u.id,
  5.0,
  'loja_oficial'::public.seller_badge,
  now()
FROM public.users u
WHERE lower(trim(u.email)) IN ('loja@levou.app.br', 'oficial@levou.app.br')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_profiles p WHERE p.user_id = u.id
  );
