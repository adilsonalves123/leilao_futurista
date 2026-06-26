-- Pedidos operacionais + faturas de arremate (suporte admin)
-- Integração: orders ↔ auction_invoices ↔ order_events

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS telefone TEXT;

CREATE TYPE order_status AS ENUM (
  'pendente_pagamento',
  'pago',
  'em_envio',
  'aguardando_confirmacao',
  'finalizado',
  'em_disputa',
  'estornado'
);

CREATE TYPE invoice_payment_method AS ENUM ('pix', 'boleto', 'cartao', 'cripto');

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  vendor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  checkout_id UUID REFERENCES public.checkouts(id) ON DELETE SET NULL,
  item_cents BIGINT NOT NULL CHECK (item_cents >= 0),
  shipping_cents BIGINT NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  commission_cents BIGINT NOT NULL DEFAULT 0 CHECK (commission_cents >= 0),
  total_cents BIGINT NOT NULL CHECK (total_cents >= 0),
  status order_status NOT NULL DEFAULT 'pendente_pagamento',
  tracking_code TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.auction_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_method invoice_payment_method NOT NULL,
  gateway_transaction_id TEXT,
  approved_at TIMESTAMPTZ,
  receipt_url TEXT,
  gateway TEXT NOT NULL DEFAULT 'luckcode',
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);

CREATE TABLE public.order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX orders_status_created_at_idx ON public.orders (status, created_at DESC);
CREATE INDEX orders_created_at_idx ON public.orders (created_at DESC);
CREATE INDEX orders_code_trgm_idx ON public.orders USING gin (code gin_trgm_ops);
CREATE INDEX orders_buyer_id_idx ON public.orders (buyer_id);
CREATE INDEX order_events_order_id_created_at_idx ON public.order_events (order_id, created_at ASC);
CREATE INDEX users_nome_completo_trgm_idx ON public.users USING gin (nome_completo gin_trgm_ops);
CREATE INDEX users_cpf_trgm_idx ON public.users USING gin (cpf gin_trgm_ops);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read orders" ON public.orders;
CREATE POLICY "Admin read orders"
  ON public.orders FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin read auction_invoices" ON public.auction_invoices;
CREATE POLICY "Admin read auction_invoices"
  ON public.auction_invoices FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin read order_events" ON public.order_events;
CREATE POLICY "Admin read order_events"
  ON public.order_events FOR SELECT
  USING (true);

-- Busca rápida unificada para o painel /admin/pedidos
CREATE OR REPLACE FUNCTION public.search_admin_orders(
  p_query TEXT DEFAULT '',
  p_categoria TEXT DEFAULT 'todos',
  p_limit INT DEFAULT 80
)
RETURNS TABLE (
  id UUID,
  code TEXT,
  auction_id UUID,
  auction_title TEXT,
  auction_image TEXT,
  buyer_id UUID,
  buyer_nome TEXT,
  buyer_email TEXT,
  buyer_cpf TEXT,
  buyer_telefone TEXT,
  vendor_id UUID,
  vendor_nome TEXT,
  vendor_email TEXT,
  vendor_telefone TEXT,
  item_cents BIGINT,
  shipping_cents BIGINT,
  commission_cents BIGINT,
  total_cents BIGINT,
  status order_status,
  tracking_code TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    o.id,
    o.code,
    o.auction_id,
    a.title AS auction_title,
    COALESCE(a.image_urls[1], '') AS auction_image,
    o.buyer_id,
    COALESCE(b.nome_completo, b.display_name, b.email) AS buyer_nome,
    b.email AS buyer_email,
    b.cpf AS buyer_cpf,
    b.telefone AS buyer_telefone,
    o.vendor_id,
    COALESCE(v.nome_completo, v.display_name, v.email) AS vendor_nome,
    v.email AS vendor_email,
    v.telefone AS vendor_telefone,
    o.item_cents,
    o.shipping_cents,
    o.commission_cents,
    o.total_cents,
    o.status,
    o.tracking_code,
    o.created_at,
    o.updated_at
  FROM public.orders o
  INNER JOIN public.auctions a ON a.id = o.auction_id
  INNER JOIN public.users b ON b.id = o.buyer_id
  INNER JOIN public.users v ON v.id = o.vendor_id
  WHERE (
    COALESCE(trim(p_query), '') = ''
    OR o.code ILIKE '%' || trim(p_query) || '%'
    OR b.nome_completo ILIKE '%' || trim(p_query) || '%'
    OR b.display_name ILIKE '%' || trim(p_query) || '%'
    OR b.cpf ILIKE '%' || trim(p_query) || '%'
    OR replace(replace(b.cpf, '.', ''), '-', '') ILIKE '%' || replace(replace(trim(p_query), '.', ''), '-', '') || '%'
  )
  AND (
    p_categoria = 'todos'
    OR (p_categoria = 'disputas' AND o.status IN ('em_disputa', 'estornado'))
    OR (p_categoria = 'pagamentos_pendentes' AND o.status = 'pendente_pagamento')
    OR (p_categoria = 'em_envio' AND o.status IN ('em_envio', 'pago'))
  )
  ORDER BY o.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 200));
$$;

COMMENT ON FUNCTION public.search_admin_orders IS 'Busca indexada para painel admin de pedidos (código, comprador, CPF)';
