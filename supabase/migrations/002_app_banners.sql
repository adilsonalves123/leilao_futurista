-- Carrosséis da Home e da aba Leilões (configuração do painel admin)
-- Execute no Supabase: SQL Editor ou `supabase db push`

CREATE TABLE IF NOT EXISTS public.banners (
  id INT PRIMARY KEY DEFAULT 1,
  inicio JSONB NOT NULL DEFAULT '[]'::jsonb,
  leiloes JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.banners IS 'Slides dos carrosséis: inicio = Home, leiloes = aba Leilões';
COMMENT ON COLUMN public.banners.inicio IS 'Array JSON de slides do carrossel da Home';
COMMENT ON COLUMN public.banners.leiloes IS 'Array JSON de slides do carrossel de Leilões';

INSERT INTO public.banners (id, inicio, leiloes)
VALUES (1, '[]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Leitura pública para o app mobile exibir os carrosséis
CREATE POLICY "Leitura pública banners"
  ON public.banners FOR SELECT
  USING (true);

-- Escrita para painel admin (ajuste para auth admin em produção)
CREATE POLICY "Upsert banners admin"
  ON public.banners FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Update banners admin"
  ON public.banners FOR UPDATE
  USING (true)
  WITH CHECK (true);
