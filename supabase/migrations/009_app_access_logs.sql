-- Logs de acesso ao app (visitas únicas / usuários ativos no painel admin)
-- Execute após migrations anteriores

CREATE TABLE IF NOT EXISTS public.app_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  platform TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_access_logs_created_at
  ON public.app_access_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_access_logs_session_day
  ON public.app_access_logs (session_id, created_at DESC);

COMMENT ON TABLE public.app_access_logs IS 'Sessões de uso do app mobile/web para métricas operacionais';

ALTER TABLE public.app_access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Insert app access logs" ON public.app_access_logs;
CREATE POLICY "Insert app access logs"
  ON public.app_access_logs FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Read app access logs" ON public.app_access_logs;
CREATE POLICY "Read app access logs"
  ON public.app_access_logs FOR SELECT
  USING (true);

-- Leitura admin de checkouts para faturamento operacional
DROP POLICY IF EXISTS "Read checkouts dashboard" ON public.checkouts;
CREATE POLICY "Read checkouts dashboard"
  ON public.checkouts FOR SELECT
  USING (true);
