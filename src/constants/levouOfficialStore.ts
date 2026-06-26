import type { SellerBadge } from '@/src/constants/sellerBadge';

/** ID fixo da conta no Supabase (migration 077). */
export const LEVOU_OFFICIAL_USER_ID = 'b0000000-0000-4000-8000-000000000001';

/** E-mails da conta Loja Oficial Levou (migration 076 aplica etiqueta automaticamente). */
export const LEVOU_OFFICIAL_VENDOR_EMAILS = [
  'loja@levou.app.br',
  'oficial@levou.app.br',
] as const;

export const LEVOU_OFFICIAL_DISPLAY_NAME = 'Levou Oficial';
export const LEVOU_OFFICIAL_HANDLE = '@levou_oficial';

/** ID mock para demos sem Supabase. */
export const LEVOU_OFFICIAL_MOCK_VENDOR_ID = 'levou-oficial';

export function isLevouOfficialEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return (LEVOU_OFFICIAL_VENDOR_EMAILS as readonly string[]).includes(normalized);
}

export function isLevouOfficialVendorId(vendorId: string | null | undefined): boolean {
  if (!vendorId) return false;
  return vendorId === LEVOU_OFFICIAL_MOCK_VENDOR_ID || vendorId === LEVOU_OFFICIAL_USER_ID;
}
