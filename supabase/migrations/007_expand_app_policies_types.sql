-- Expande tipos de políticas: comprador, vendedor e geral
-- Execute após 006_app_policies_table.sql

COMMENT ON COLUMN public.app_policies.type IS
  'comprador_terms | vendedor_terms | vendedor_rules | app_policy | privacy_policy (legado: kyc_terms)';

-- Migra conteúdo legado kyc_terms -> comprador_terms (preserva edições já feitas)
INSERT INTO public.app_policies (title, content, type, version)
SELECT p.title, p.content, 'comprador_terms', 1
FROM public.app_policies p
WHERE p.type = 'kyc_terms'
  AND NOT EXISTS (SELECT 1 FROM public.app_policies WHERE type = 'comprador_terms')
ORDER BY p.version DESC
LIMIT 1;

-- Termos de Arremate (comprador) — seed se ainda não existir
INSERT INTO public.app_policies (title, content, type, version)
VALUES (
  'Termos de Arremate',
  'Ao marcar a caixa abaixo, você declara ter lido e aceito integralmente as condições jurídicas para participar de lances nesta plataforma:

COMPROMISSO DE ARREMATE
Todo lance válido constitui proposta irrevogável de compra. Ao vencer o lote, você assume obrigação de pagamento integral conforme regras do leilão.

COMISSÃO DA PLATAFORMA (10%)
Sobre o valor arrematado incide comissão de 10% em favor da Aetherion, além de eventuais taxas de escrow e logística informadas no checkout.

MULTA IRREVOGÁVEL POR DESISTÊNCIA (30%)
Em caso de desistência, abandono ou inadimplemento após vencer o lote, será aplicada multa irrevogável de 30% sobre o valor do arremate, sem prejuízo de outras medidas cabíveis (bloqueio de conta, cobrança e registro em cadastro de inadimplentes).

VERACIDADE DOCUMENTAL
Você garante a autenticidade dos documentos (RG/CNH) e da selfie enviados. Informações falsas podem configurar fraude e rescisão imediata da conta.',
  'comprador_terms',
  1
)
ON CONFLICT (type, version) DO NOTHING;

-- Termos do Vendedor
INSERT INTO public.app_policies (title, content, type, version)
VALUES (
  'Termos do Vendedor',
  'Ao cadastrar lotes nesta plataforma, você declara estar ciente e de acordo com as seguintes obrigações:

RESPONSABILIDADE SOBRE O LOTE
Você garante ser o legítimo proprietário do item ou possuir autorização para vendê-lo. Descrições, fotos e condições informadas devem ser fiéis ao produto real.

ENTREGA E PRAZOS
Após arremate confirmado e pagamento liberado, você deve postar o item dentro do prazo informado no anúncio, com embalagem adequada e código de rastreio válido.

PROIBIÇÕES
É vedado anunciar produtos proibidos, falsificados, sem nota fiscal quando exigida, ou que violem direitos de terceiros.

SANÇÕES
Descumprimento pode resultar em suspensão da conta, retenção de valores, multas contratuais e responsabilização civil e criminal.',
  'vendedor_terms',
  1
)
ON CONFLICT (type, version) DO NOTHING;

-- Regras de Envio/Leilão
INSERT INTO public.app_policies (title, content, type, version)
VALUES (
  'Regras de Envio e Leilão',
  'Regras operacionais para vendedores que participam dos leilões Aetherion:

POSTAGEM DO LOTE
Fotos nítidas, título objetivo e descrição completa são obrigatórios. Lotes incompletos podem ser recusados pela moderação.

TAXA DE VENDA (10%)
Sobre o valor arrematado incide comissão de 10% da plataforma, descontada no repasse ao vendedor após confirmação da entrega.

ENVIO APÓS ARREMATE
O vendedor deve gerar etiqueta ou informar rastreio em até 3 dias úteis após confirmação do pagamento em escrow, salvo prazo diverso no anúncio.

DISPUTAS E MEDIAÇÃO
Em caso de item divergente, a plataforma pode reter valores até resolução. O vendedor coopera com evidências solicitadas.',
  'vendedor_rules',
  1
)
ON CONFLICT (type, version) DO NOTHING;

-- Políticas gerais do App
INSERT INTO public.app_policies (title, content, type, version)
VALUES (
  'Políticas do App',
  'Regras gerais de uso da plataforma Aetherion Auctions:

CONDUTA DO USUÁRIO
É proibido fraude, manipulação de lances, uso de contas múltiplas para distorcer leilões ou qualquer conduta que prejudique outros participantes.

CONTA E SEGURANÇA
Você é responsável por manter suas credenciais em sigilo. Atividades suspeitas podem resultar em verificação adicional ou bloqueio preventivo.

PROPRIEDADE INTELECTUAL
Marcas, layout e conteúdo da plataforma são protegidos. É vedada reprodução não autorizada.

ALTERAÇÕES
Estas políticas podem ser atualizadas. Versões publicadas no app prevalecem sobre comunicações anteriores.',
  'app_policy',
  1
)
ON CONFLICT (type, version) DO NOTHING;
