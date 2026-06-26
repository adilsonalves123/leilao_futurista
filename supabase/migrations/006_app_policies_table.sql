-- Termos, políticas e conteúdo jurídico editável pelo painel admin
-- Execute no Supabase: SQL Editor ou `supabase db push`

CREATE TABLE IF NOT EXISTS public.app_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL,
  version INT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_policies_type_version_key UNIQUE (type, version)
);

CREATE INDEX IF NOT EXISTS idx_app_policies_type_version
  ON public.app_policies (type, version DESC);

COMMENT ON TABLE public.app_policies IS 'Documentos legais versionados (termos KYC, privacidade, etc.)';
COMMENT ON COLUMN public.app_policies.type IS 'Ex.: kyc_terms, privacy_policy';
COMMENT ON COLUMN public.app_policies.version IS 'Versão incremental por type';

ALTER TABLE public.app_policies ENABLE ROW LEVEL SECURITY;

-- Leitura pública: app mobile exibe a versão mais recente
DROP POLICY IF EXISTS "Public read app_policies" ON public.app_policies;
CREATE POLICY "Public read app_policies"
  ON public.app_policies FOR SELECT
  USING (true);

-- Inserção: painel admin (ajuste para auth admin em produção)
DROP POLICY IF EXISTS "Admins insert app_policies" ON public.app_policies;
DROP POLICY IF EXISTS "Insert app_policies admin panel" ON public.app_policies;
CREATE POLICY "Insert app_policies admin panel"
  ON public.app_policies FOR INSERT
  WITH CHECK (true);

-- Seed inicial — Termos KYC (v1)
INSERT INTO public.app_policies (title, content, type, version)
VALUES (
  'Termos vinculantes de arremate',
  'Ao marcar a caixa abaixo, você declara ter lido e aceito integralmente as condições jurídicas para participar de lances nesta plataforma:

COMPROMISSO DE ARREMATE
Todo lance válido constitui proposta irrevogável de compra. Ao vencer o lote, você assume obrigação de pagamento integral conforme regras do leilão.

COMISSÃO DA PLATAFORMA (10%)
Sobre o valor arrematado incide comissão de 10% em favor da Aetherion, além de eventuais taxas de escrow e logística informadas no checkout.

MULTA IRREVOGÁVEL POR DESISTÊNCIA (30%)
Em caso de desistência, abandono ou inadimplemento após vencer o lote, será aplicada multa irrevogável de 30% sobre o valor do arremate, sem prejuízo de outras medidas cabíveis (bloqueio de conta, cobrança e registro em cadastro de inadimplentes).

VERACIDADE DOCUMENTAL
Você garante a autenticidade dos documentos (RG/CNH) e da selfie enviados. Informações falsas podem configurar fraude e rescisão imediata da conta.',
  'kyc_terms',
  1
)
ON CONFLICT (type, version) DO NOTHING;

-- Seed inicial — Política de Privacidade (v1)
INSERT INTO public.app_policies (title, content, type, version)
VALUES (
  'Política de Privacidade',
  'Esta Política de Privacidade descreve como a Aetherion coleta, usa e protege seus dados pessoais.

COLETA DE DADOS
Coletamos informações fornecidas no cadastro, documentos KYC, histórico de lances e dados de pagamento necessários à operação da plataforma.

USO DOS DADOS
Utilizamos seus dados para verificação de identidade, processamento de leilões, cumprimento de obrigações legais e melhoria da experiência no aplicativo.

COMPARTILHAMENTO
Seus dados não são vendidos. Podemos compartilhá-los apenas com prestadores essenciais (pagamento, logística) ou quando exigido por lei.

SEUS DIREITOS
Você pode solicitar acesso, correção ou exclusão de dados conforme a LGPD, entrando em contato pelo suporte da plataforma.',
  'privacy_policy',
  1
)
ON CONFLICT (type, version) DO NOTHING;
