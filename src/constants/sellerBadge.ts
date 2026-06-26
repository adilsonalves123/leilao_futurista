export type SellerBadge = 'particular' | 'empresa_verificada' | 'loja_oficial';

export const SELLER_BADGE_DEFAULT: SellerBadge = 'particular';

export const SELLER_BADGE_LABELS: Record<SellerBadge, string> = {
  particular: 'Vendedor particular',
  empresa_verificada: 'Empresa verificada',
  loja_oficial: 'Loja oficial Levou',
};

export const SELLER_BADGE_SHORT: Record<SellerBadge, string> = {
  particular: 'Particular',
  empresa_verificada: 'Empresa verificada',
  loja_oficial: 'Loja oficial',
};

export const SELLER_BADGE_ADMIN_OPTIONS: {
  id: SellerBadge;
  label: string;
  hint: string;
}[] = [
  {
    id: 'particular',
    label: SELLER_BADGE_LABELS.particular,
    hint: 'Pessoa física ou vendedor comum — padrão automático.',
  },
  {
    id: 'empresa_verificada',
    label: SELLER_BADGE_LABELS.empresa_verificada,
    hint: 'CNPJ e documentação validados pelo admin.',
  },
  {
    id: 'loja_oficial',
    label: SELLER_BADGE_LABELS.loja_oficial,
    hint: 'Conta oficial da plataforma Levou.',
  },
];

export const SELLER_BADGE_COLORS: Record<
  SellerBadge,
  { bg: string; text: string; border: string }
> = {
  particular: { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' },
  empresa_verificada: { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
  loja_oficial: { bg: '#F4F0FF', text: '#6D28D9', border: '#DDD6FE' },
};

export function parseSellerBadge(value: string | null | undefined): SellerBadge | null {
  if (
    value === 'particular' ||
    value === 'empresa_verificada' ||
    value === 'loja_oficial'
  ) {
    return value;
  }
  return null;
}

export function sellerBadgeLabel(value: SellerBadge | null | undefined): string | null {
  if (!value) return null;
  return SELLER_BADGE_LABELS[value];
}
