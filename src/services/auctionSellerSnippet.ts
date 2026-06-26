import type { SellerBadge } from '@/src/constants/sellerBadge';
import { SELLER_BADGE_DEFAULT, parseSellerBadge } from '@/src/constants/sellerBadge';
import {
  LEVOU_OFFICIAL_DISPLAY_NAME,
  LEVOU_OFFICIAL_USER_ID,
} from '@/src/constants/levouOfficialStore';
import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import { resolverVendorId } from '@/src/services/adminVendedor';
import { obterPerfilVendedorPublico } from '@/src/services/vendorPublicProfile';

export type AuctionSellerSnippet = {
  sellerId: string;
  sellerName: string;
  sellerBadge: SellerBadge | null;
};

const MOCK_SNIPPETS: Record<string, AuctionSellerSnippet> = {
  'v-tech': {
    sellerId: 'v-tech',
    sellerName: 'Tech Store BR',
    sellerBadge: 'empresa_verificada',
  },
  'v-luxury': {
    sellerId: 'v-luxury',
    sellerName: 'Luxury Watches BR',
    sellerBadge: 'empresa_verificada',
  },
  'v-sneaker': {
    sellerId: 'v-sneaker',
    sellerName: 'Sneaker Hub',
    sellerBadge: 'particular',
  },
  'levou-oficial': {
    sellerId: 'levou-oficial',
    sellerName: 'Levou Oficial',
    sellerBadge: 'loja_oficial',
  },
  [LEVOU_OFFICIAL_USER_ID]: {
    sellerId: LEVOU_OFFICIAL_USER_ID,
    sellerName: LEVOU_OFFICIAL_DISPLAY_NAME,
    sellerBadge: 'loja_oficial',
  },
  'mock-vendor-1': {
    sellerId: 'v-tech',
    sellerName: 'Tech Store BR',
    sellerBadge: 'empresa_verificada',
  },
};

function mapRpcRow(row: {
  vendor_id: string;
  display_name: string | null;
  seller_badge: string | null;
  status_verificacao: string;
}): AuctionSellerSnippet {
  const kycAprovado = row.status_verificacao === 'aprovado';
  const badge = parseSellerBadge(row.seller_badge);

  return {
    sellerId: row.vendor_id,
    sellerName: row.display_name?.trim() || 'Vendedor Levou',
    sellerBadge: kycAprovado ? (badge ?? SELLER_BADGE_DEFAULT) : badge,
  };
}

export async function obterSnippetVendedor(
  sellerId: string | null | undefined,
): Promise<AuctionSellerSnippet | null> {
  if (!sellerId) return null;

  const resolved = resolverVendorId(sellerId);
  if (MOCK_SNIPPETS[resolved]) {
    return MOCK_SNIPPETS[resolved];
  }

  if (isMockMode() || !isSupabaseConfigured()) {
    const perfil = await obterPerfilVendedorPublico(resolved);
    if (!perfil) return null;
    return {
      sellerId: perfil.id,
      sellerName: perfil.nomeExibicao,
      sellerBadge: perfil.sellerBadge,
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return MOCK_SNIPPETS[resolved] ?? null;
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(resolved)) {
    return MOCK_SNIPPETS[resolved] ?? null;
  }

  const mapa = await buscarSnippetsVendedores([resolved]);
  return mapa[resolved] ?? null;
}

export async function buscarSnippetsVendedores(
  sellerIds: string[],
): Promise<Record<string, AuctionSellerSnippet>> {
  const unicos = [...new Set(sellerIds.filter(Boolean))];
  const resultado: Record<string, AuctionSellerSnippet> = {};

  const mockIds: string[] = [];
  const uuidIds: string[] = [];

  for (const raw of unicos) {
    const resolved = resolverVendorId(raw);
    if (MOCK_SNIPPETS[resolved]) {
      resultado[resolved] = MOCK_SNIPPETS[resolved];
      resultado[raw] = MOCK_SNIPPETS[resolved];
      continue;
    }
    mockIds.push(resolved);
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(resolved)) {
      uuidIds.push(resolved);
    }
  }

  if (isMockMode() || !isSupabaseConfigured() || uuidIds.length === 0) {
    for (const id of mockIds) {
      if (resultado[id]) continue;
      const perfil = await obterPerfilVendedorPublico(id);
      if (perfil) {
        const snippet: AuctionSellerSnippet = {
          sellerId: perfil.id,
          sellerName: perfil.nomeExibicao,
          sellerBadge: perfil.sellerBadge,
        };
        resultado[id] = snippet;
      }
    }
    return resultado;
  }

  const supabase = getSupabase();
  if (!supabase) return resultado;

  const { data, error } = await supabase.rpc('vendedores_snippet_publico', {
    p_vendor_ids: uuidIds,
  });

  if (error) {
    console.warn('[auctionSellerSnippet] rpc error:', error.message);
    return resultado;
  }

  for (const row of data ?? []) {
    const snippet = mapRpcRow(
      row as {
        vendor_id: string;
        display_name: string | null;
        seller_badge: string | null;
        status_verificacao: string;
      },
    );
    resultado[snippet.sellerId] = snippet;
  }

  return resultado;
}
