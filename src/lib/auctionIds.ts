import { isMockMode } from '@/src/lib/mockMode';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** IDs de demonstração (a1, a2…) não existem no Postgres. */
const MOCK_ID_RE = /^a\d+$/i;

export function normalizeAuctionId(id: string): string {
  return id.trim().split('?')[0] ?? id;
}

export function isUuidAuctionId(id: string): boolean {
  return UUID_RE.test(normalizeAuctionId(id));
}

export function isMockAuctionId(id: string): boolean {
  const normalized = normalizeAuctionId(id);
  return MOCK_ID_RE.test(normalized) || !isUuidAuctionId(normalized);
}

/** Leilões demo ou app em modo mock — nunca consultar Supabase com esse id. */
export function deveUsarBackendLeilaoLocal(auctionId: string): boolean {
  return isMockMode() || isMockAuctionId(auctionId);
}

export function isErroUuidPostgres(message: string): boolean {
  return message.includes('invalid input syntax for type uuid');
}
