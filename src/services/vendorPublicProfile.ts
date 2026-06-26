import {
  parseSellerBadge,
  SELLER_BADGE_DEFAULT,
  type SellerBadge,
} from '@/src/constants/sellerBadge';
import { MOCK_VENDOR_ID } from '@/src/constants/operations';
import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import {
  obterPerfilVendedorAdmin,
  resolverVendorId,
} from '@/src/services/adminVendedor';
import type { StatusVerificacao } from '@/src/types/database';

export type VendorPublicProfile = {
  id: string;
  handle: string;
  nomeExibicao: string;
  sellerBadge: SellerBadge | null;
  kycAprovado: boolean;
  reputacaoEstrelas: number;
  mediaAvaliacoes: number;
  totalAvaliacoes: number;
  vendasConcluidas: number;
};

function formatHandle(displayName: string | null, fallbackId: string): string {
  if (displayName?.startsWith('@')) return displayName;
  const base = (displayName ?? fallbackId).replace(/\s+/g, '_').toLowerCase();
  return `@${base}`;
}

function formatDisplayName(displayName: string | null, fallback: string): string {
  return displayName?.trim() || fallback;
}

export function mediaExibicaoVendedor(perfil: VendorPublicProfile): number {
  if (perfil.totalAvaliacoes > 0) return perfil.mediaAvaliacoes;
  return perfil.reputacaoEstrelas;
}

function mapRpcRow(row: {
  id: string;
  display_name: string | null;
  status_verificacao: string;
  seller_badge: string | null;
  reputacao_estrelas: number;
  vendas_concluidas: number;
  total_avaliacoes: number;
  media_avaliacoes: number;
}): VendorPublicProfile {
  const kycAprovado = row.status_verificacao === 'aprovado';
  const badge = parseSellerBadge(row.seller_badge);

  return {
    id: row.id,
    handle: formatHandle(row.display_name, row.id.slice(0, 8)),
    nomeExibicao: formatDisplayName(row.display_name, 'Vendedor Levou'),
    sellerBadge: kycAprovado ? (badge ?? SELLER_BADGE_DEFAULT) : badge,
    kycAprovado,
    reputacaoEstrelas: Number(row.reputacao_estrelas) || 5,
    mediaAvaliacoes: Number(row.media_avaliacoes) || 0,
    totalAvaliacoes: Number(row.total_avaliacoes) || 0,
    vendasConcluidas: Number(row.vendas_concluidas) || 0,
  };
}

async function obterPerfilMock(vendorId: string): Promise<VendorPublicProfile | null> {
  const admin = await obterPerfilVendedorAdmin(vendorId);
  if (!admin) return null;

  return {
    id: admin.id,
    handle: admin.handle,
    nomeExibicao: admin.nomeExibicao,
    sellerBadge: admin.sellerBadge,
    kycAprovado: admin.statusKyc === 'aprovado',
    reputacaoEstrelas: admin.mediaEstrelas,
    mediaAvaliacoes: admin.mediaEstrelas,
    totalAvaliacoes: admin.totalAvaliacoes,
    vendasConcluidas: admin.leiloesConcluidos,
  };
}

const MOCK_VENDOR_ALIASES: Record<string, string> = {
  'mock-vendor-1': 'v-tech',
  'levou-oficial': 'levou-oficial',
};

export async function obterPerfilVendedorPublico(
  handleOuId: string,
): Promise<VendorPublicProfile | null> {
  const raw = handleOuId.trim();
  const aliased = MOCK_VENDOR_ALIASES[raw] ?? raw;
  const vendorId = resolverVendorId(aliased);

  if (isMockMode() || !isSupabaseConfigured()) {
    return obterPerfilMock(vendorId);
  }

  const supabase = getSupabase();
  if (!supabase) {
    return obterPerfilMock(vendorId);
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(vendorId)) {
    return obterPerfilMock(vendorId);
  }

  const { data, error } = await supabase.rpc('perfil_vendedor_publico', {
    p_vendor_id: vendorId,
  });

  if (error) {
    console.warn('[vendorPublicProfile] rpc error:', error.message);
    return obterPerfilMock(vendorId);
  }

  if (!data || typeof data !== 'object') {
    return null;
  }

  const row = data as Record<string, unknown>;
  if (!row.id || typeof row.id !== 'string') {
    return null;
  }

  return mapRpcRow({
    id: row.id,
    display_name: (row.display_name as string | null) ?? null,
    status_verificacao: (row.status_verificacao as StatusVerificacao) ?? 'pendente',
    seller_badge: (row.seller_badge as string | null) ?? null,
    reputacao_estrelas: Number(row.reputacao_estrelas) || 5,
    vendas_concluidas: Number(row.vendas_concluidas) || 0,
    total_avaliacoes: Number(row.total_avaliacoes) || 0,
    media_avaliacoes: Number(row.media_avaliacoes) || 0,
  });
}

export function sellerIdPadraoMock(): string {
  return MOCK_VENDOR_ID;
}
