import type { Ionicons } from '@expo/vector-icons';

export type AppPolicyType =
  | 'comprador_termo_arremate'
  | 'vendedor_termos_responsabilidade'
  | 'vendedor_regras_leilao'
  | 'vendedor_politica_app';

export type AppPolicy = {
  id: string;
  title: string;
  content: string;
  type: AppPolicyType;
  version: number;
  updatedAt: string;
};

export type AppPolicyGroup = 'comprador' | 'vendedor';

export type AppPolicyTab = {
  type: AppPolicyType;
  label: string;
  descricao: string;
  grupo: AppPolicyGroup;
  icon: keyof typeof Ionicons.glyphMap;
};

export const APP_POLICY_TABS: AppPolicyTab[] = [
  {
    type: 'comprador_termo_arremate',
    label: 'Termo Vinculante de Arremate',
    descricao: 'Lances, comissão de 10% e multa de 30%',
    grupo: 'comprador',
    icon: 'hammer-outline',
  },
  {
    type: 'vendedor_termos_responsabilidade',
    label: 'Termos de Responsabilidade',
    descricao: 'Responsabilidade sobre os lotes enviados',
    grupo: 'vendedor',
    icon: 'storefront-outline',
  },
  {
    type: 'vendedor_regras_leilao',
    label: 'Regras do Leilão',
    descricao: 'Regras de postagem e condução do leilão',
    grupo: 'vendedor',
    icon: 'cube-outline',
  },
  {
    type: 'vendedor_politica_app',
    label: 'Política do App',
    descricao: 'Regras gerais de uso para vendedores',
    grupo: 'vendedor',
    icon: 'phone-portrait-outline',
  },
];

export const APP_POLICY_GROUP_LABELS: Record<AppPolicyGroup, string> = {
  comprador: 'Comprador',
  vendedor: 'Vendedor',
};

export const APP_POLICY_LABELS: Record<AppPolicyType, string> = Object.fromEntries(
  APP_POLICY_TABS.map((tab) => [tab.type, tab.label]),
) as Record<AppPolicyType, string>;

/** Ordem exibida no cadastro de leilão (vendedor). */
export const VENDOR_POLICY_DISPLAY_ORDER: AppPolicyType[] = [
  'vendedor_regras_leilao',
  'vendedor_termos_responsabilidade',
  'vendedor_politica_app',
];

export const DEFAULT_COMPRADOR_TERMO_ARREMATE: Omit<AppPolicy, 'id' | 'updatedAt'> = {
  title: 'Termo Vinculante de Arremate',
  type: 'comprador_termo_arremate',
  version: 1,
  content: `Ao participar de lances nesta plataforma, você declara ter lido e aceito integralmente as condições jurídicas abaixo:

COMPROMISSO DE ARREMATE
Todo lance válido constitui proposta irrevogável de compra. Ao vencer o lote, você assume obrigação de pagamento integral conforme regras do leilão.

COMISSÃO LEVOU (10%)
Sobre o valor arrematado incide comissão de 10% em favor do Levou, além de eventuais taxas de custódia e logística informadas no checkout.

MULTA IRREVOGÁVEL POR DESISTÊNCIA (30%)
Em caso de desistência, abandono ou inadimplemento após vencer o lote, será aplicada multa irrevogável de 30% sobre o valor do arremate, sem prejuízo de outras medidas cabíveis.

VERACIDADE DOCUMENTAL
Você garante a autenticidade dos documentos (RG/CNH) e da selfie enviados no cadastro KYC.`,
};

export const DEFAULT_VENDEDOR_TERMOS_RESPONSABILIDADE: Omit<AppPolicy, 'id' | 'updatedAt'> = {
  title: 'Termos de Responsabilidade',
  type: 'vendedor_termos_responsabilidade',
  version: 1,
  content: `Ao anunciar, você declara ser o legítimo proprietário do item ou possuir autorização para vendê-lo.

RESPONSABILIDADE SOBRE O LOTE
Descrições, fotos e condições informadas devem ser fiéis ao produto real. A plataforma não se responsabiliza por garantias declaradas pelo vendedor.

OBRIGAÇÕES APÓS ARREMATE
Após confirmação do pagamento, você deve postar o item no prazo informado, com embalagem adequada e rastreio válido.

SANÇÕES
Informações falsas ou descumprimento podem resultar em suspensão, retenção de valores e responsabilização civil e criminal.`,
};

export const DEFAULT_VENDEDOR_REGRAS_LEILAO: Omit<AppPolicy, 'id' | 'updatedAt'> = {
  title: 'Regras do Leilão',
  type: 'vendedor_regras_leilao',
  version: 1,
  content: `Regras para condução de leilões na plataforma:

LANCE MÍNIMO
O lance inicial deve respeitar o incremento e limites definidos no anúncio.

MODERAÇÃO
Leilões fraudulentos ou com informações falsas serão removidos. Lotes incompletos podem ser recusados.

ENVIO APÓS ARREMATE
O vendedor deve enviar o item dentro do prazo acordado após o arremate confirmado.

DISPUTAS
Conflitos serão mediados pela equipe em até 72 horas úteis, conforme evidências apresentadas.`,
};

export const DEFAULT_VENDEDOR_POLITICA_APP: Omit<AppPolicy, 'id' | 'updatedAt'> = {
  title: 'Política do App',
  type: 'vendedor_politica_app',
  version: 1,
  content: `Políticas gerais de uso da plataforma para vendedores:

DADOS E LGPD
Seus dados pessoais são tratados conforme a LGPD e a Política de Privacidade da plataforma.

TAXAS
Taxas de intermediação (10%) serão descontadas automaticamente do valor arrematado no repasse.

ITENS PROIBIDOS
Armas, substâncias ilícitas e conteúdo não autorizado resultam em banimento imediato da conta.

ATUALIZAÇÕES
Versões publicadas no painel administrativo prevalecem sobre comunicações anteriores.`,
};

export const DEFAULT_POLICIES: Record<AppPolicyType, Omit<AppPolicy, 'id' | 'updatedAt'>> = {
  comprador_termo_arremate: DEFAULT_COMPRADOR_TERMO_ARREMATE,
  vendedor_termos_responsabilidade: DEFAULT_VENDEDOR_TERMOS_RESPONSABILIDADE,
  vendedor_regras_leilao: DEFAULT_VENDEDOR_REGRAS_LEILAO,
  vendedor_politica_app: DEFAULT_VENDEDOR_POLITICA_APP,
};

export const ALL_POLICY_TYPES: AppPolicyType[] = APP_POLICY_TABS.map((tab) => tab.type);

export function isAppPolicyType(value: string): value is AppPolicyType {
  return ALL_POLICY_TYPES.includes(value as AppPolicyType);
}

/** Tipos legados migrados automaticamente no serviço. */
export const LEGACY_POLICY_TYPE_MAP: Record<string, AppPolicyType> = {
  comprador_termo_arremate: 'comprador_termo_arremate',
  comprador_terms: 'comprador_termo_arremate',
  kyc_terms: 'comprador_termo_arremate',
  vendedor_termos_responsabilidade: 'vendedor_termos_responsabilidade',
  vendedor_terms: 'vendedor_termos_responsabilidade',
  vendedor_regras_leilao: 'vendedor_regras_leilao',
  vendedor_rules: 'vendedor_regras_leilao',
  vendedor_politica_app: 'vendedor_politica_app',
  app_policy: 'vendedor_politica_app',
};

export const LEGACY_TYPES_BY_POLICY: Record<AppPolicyType, string[]> = {
  comprador_termo_arremate: ['comprador_terms', 'kyc_terms'],
  vendedor_termos_responsabilidade: ['vendedor_terms'],
  vendedor_regras_leilao: ['vendedor_rules'],
  vendedor_politica_app: ['app_policy'],
};
