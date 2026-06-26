-- Renomeia/expande tipos de app_policies para alinhar app mobile ↔ painel admin
-- Execute após 006 e 007

COMMENT ON COLUMN public.app_policies.type IS
  'comprador_termo_arremate | vendedor_termos_responsabilidade | vendedor_regras_leilao | vendedor_politica_app';

-- Comprador: migra legado kyc_terms / comprador_terms
INSERT INTO public.app_policies (title, content, type, version)
SELECT p.title, p.content, 'comprador_termo_arremate', 1
FROM public.app_policies p
WHERE p.type IN ('kyc_terms', 'comprador_terms')
  AND NOT EXISTS (
    SELECT 1 FROM public.app_policies x WHERE x.type = 'comprador_termo_arremate'
  )
ORDER BY p.version DESC
LIMIT 1;

INSERT INTO public.app_policies (title, content, type, version)
VALUES (
  'Termo Vinculante de Arremate',
  'Ao participar de lances nesta plataforma, você declara ter lido e aceito integralmente as condições jurídicas abaixo:

COMPROMISSO DE ARREMATE
Todo lance válido constitui proposta irrevogável de compra. Ao vencer o lote, você assume obrigação de pagamento integral conforme regras do leilão.

COMISSÃO DA PLATAFORMA (10%)
Sobre o valor arrematado incide comissão de 10% em favor da Aetherion, além de eventuais taxas de escrow e logística informadas no checkout.

MULTA IRREVOGÁVEL POR DESISTÊNCIA (30%)
Em caso de desistência, abandono ou inadimplemento após vencer o lote, será aplicada multa irrevogável de 30% sobre o valor do arremate, sem prejuízo de outras medidas cabíveis.

VERACIDADE DOCUMENTAL
Você garante a autenticidade dos documentos (RG/CNH) e da selfie enviados no cadastro KYC.',
  'comprador_termo_arremate',
  1
)
ON CONFLICT (type, version) DO NOTHING;

-- Vendedor: Termos de Responsabilidade
INSERT INTO public.app_policies (title, content, type, version)
SELECT p.title, p.content, 'vendedor_termos_responsabilidade', 1
FROM public.app_policies p
WHERE p.type = 'vendedor_terms'
  AND NOT EXISTS (
    SELECT 1 FROM public.app_policies x WHERE x.type = 'vendedor_termos_responsabilidade'
  )
ORDER BY p.version DESC
LIMIT 1;

INSERT INTO public.app_policies (title, content, type, version)
VALUES (
  'Termos de Responsabilidade',
  'Ao anunciar, você declara ser o legítimo proprietário do item ou possuir autorização para vendê-lo.

RESPONSABILIDADE SOBRE O LOTE
Descrições, fotos e condições informadas devem ser fiéis ao produto real. A plataforma não se responsabiliza por garantias declaradas pelo vendedor.

OBRIGAÇÕES APÓS ARREMATE
Após confirmação do pagamento, você deve postar o item no prazo informado, com embalagem adequada e rastreio válido.

SANÇÕES
Informações falsas ou descumprimento podem resultar em suspensão, retenção de valores e responsabilização civil e criminal.',
  'vendedor_termos_responsabilidade',
  1
)
ON CONFLICT (type, version) DO NOTHING;

-- Vendedor: Regras do Leilão
INSERT INTO public.app_policies (title, content, type, version)
SELECT p.title, p.content, 'vendedor_regras_leilao', 1
FROM public.app_policies p
WHERE p.type = 'vendedor_rules'
  AND NOT EXISTS (
    SELECT 1 FROM public.app_policies x WHERE x.type = 'vendedor_regras_leilao'
  )
ORDER BY p.version DESC
LIMIT 1;

INSERT INTO public.app_policies (title, content, type, version)
VALUES (
  'Regras do Leilão',
  'Regras para condução de leilões na plataforma:

LANCE MÍNIMO
O lance inicial deve respeitar o incremento e limites definidos no anúncio.

MODERAÇÃO
Leilões fraudulentos ou com informações falsas serão removidos. Lotes incompletos podem ser recusados.

ENVIO APÓS ARREMATE
O vendedor deve enviar o item dentro do prazo acordado após o arremate confirmado.

DISPUTAS
Conflitos serão mediados pela equipe em até 72 horas úteis, conforme evidências apresentadas.',
  'vendedor_regras_leilao',
  1
)
ON CONFLICT (type, version) DO NOTHING;

-- Vendedor: Política do App
INSERT INTO public.app_policies (title, content, type, version)
SELECT p.title, p.content, 'vendedor_politica_app', 1
FROM public.app_policies p
WHERE p.type = 'app_policy'
  AND NOT EXISTS (
    SELECT 1 FROM public.app_policies x WHERE x.type = 'vendedor_politica_app'
  )
ORDER BY p.version DESC
LIMIT 1;

INSERT INTO public.app_policies (title, content, type, version)
VALUES (
  'Política do App',
  'Políticas gerais de uso da plataforma para vendedores:

DADOS E LGPD
Seus dados pessoais são tratados conforme a LGPD e a Política de Privacidade da plataforma.

TAXAS
Taxas de intermediação (10%) serão descontadas automaticamente do valor arrematado no repasse.

ITENS PROIBIDOS
Armas, substâncias ilícitas e conteúdo não autorizado resultam em banimento imediato da conta.

ATUALIZAÇÕES
Versões publicadas no painel administrativo prevalecem sobre comunicações anteriores.',
  'vendedor_politica_app',
  1
)
ON CONFLICT (type, version) DO NOTHING;
