import {
  LEVOU_OFFICIAL_DISPLAY_NAME,
  LEVOU_OFFICIAL_HANDLE,
  LEVOU_OFFICIAL_MOCK_VENDOR_ID,
  LEVOU_OFFICIAL_USER_ID,
  LEVOU_OFFICIAL_VENDOR_EMAILS,
} from '@/src/constants/levouOfficialStore';
import { isMockMode } from '@/src/lib/mockMode';
import { parsePriceInput, reaisParaCentavos, type AuctionDuration } from '@/src/lib/listingCategories';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import { enviarFotosAnuncio } from '@/src/services/auctionImageUpload';
import type { ConservationState } from '@/src/constants/listingForm';
import type { ListingCategory } from '@/src/lib/listingCategories';

export type LojaOficialStatus = {
  ready: boolean;
  vendorId?: string;
  email?: string;
  displayName?: string;
  statusKyc?: string;
  sellerBadge?: string;
  leiloesAoVivo?: number;
  leiloesEmAnalise?: number;
  message?: string;
};

export type AdminLojaOficialPublishInput = {
  title: string;
  description: string;
  category: ListingCategory;
  startPrice: string;
  estimatedMarketValue: string;
  auctionDuration: AuctionDuration;
  conservationState: ConservationState;
  originCep: string;
  photos: string[];
  wantFeatured: boolean;
  wantFeaturedPlus: boolean;
  publicarAoVivo: boolean;
};

export type AdminLojaOficialPublishResult = {
  ok: boolean;
  auctionId?: string;
  vendorId?: string;
  status?: string;
  erro?: string;
};

const MOCK_STATUS: LojaOficialStatus = {
  ready: true,
  vendorId: LEVOU_OFFICIAL_MOCK_VENDOR_ID,
  email: LEVOU_OFFICIAL_VENDOR_EMAILS[0],
  displayName: LEVOU_OFFICIAL_DISPLAY_NAME,
  statusKyc: 'aprovado',
  sellerBadge: 'loja_oficial',
  leiloesAoVivo: 1,
  leiloesEmAnalise: 0,
};

function mapStatusRow(data: Record<string, unknown>): LojaOficialStatus {
  if (data.ready !== true) {
    return {
      ready: false,
      message:
        (typeof data.message === 'string' && data.message) ||
        'Conta Loja Oficial não configurada.',
    };
  }

  return {
    ready: true,
    vendorId: String(data.vendor_id ?? ''),
    email: typeof data.email === 'string' ? data.email : undefined,
    displayName: typeof data.display_name === 'string' ? data.display_name : LEVOU_OFFICIAL_DISPLAY_NAME,
    statusKyc: typeof data.status_kyc === 'string' ? data.status_kyc : undefined,
    sellerBadge: typeof data.seller_badge === 'string' ? data.seller_badge : 'loja_oficial',
    leiloesAoVivo: Number(data.leiloes_ao_vivo) || 0,
    leiloesEmAnalise: Number(data.leiloes_em_analise) || 0,
  };
}

export async function obterStatusLojaOficialAdmin(): Promise<LojaOficialStatus> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return MOCK_STATUS;
  }

  const supabase = getSupabase();
  if (!supabase) return MOCK_STATUS;

  const { data, error } = await supabase.rpc('admin_loja_oficial_status');
  if (error) {
    return { ready: false, message: error.message };
  }

  return mapStatusRow((data ?? {}) as Record<string, unknown>);
}

export async function publicarLeilaoLojaOficialAdmin(
  input: AdminLojaOficialPublishInput,
): Promise<AdminLojaOficialPublishResult> {
  const startingCents = reaisParaCentavos(parsePriceInput(input.startPrice));
  const estimatedCents = reaisParaCentavos(parsePriceInput(input.estimatedMarketValue));

  if (isMockMode() || !isSupabaseConfigured()) {
    const auctionId = `loja-mock-${Date.now()}`;
    return {
      ok: true,
      auctionId,
      vendorId: LEVOU_OFFICIAL_MOCK_VENDOR_ID,
      status: input.publicarAoVivo ? 'live' : 'draft',
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, erro: 'Supabase não configurado.' };
  }

  const { data, error } = await supabase.rpc('admin_publicar_leilao_loja_oficial', {
    p_payload: {
      title: input.title.trim(),
      description: input.description.trim(),
      listing_category: input.category,
      starting_price_cents: startingCents,
      estimated_market_cents: estimatedCents,
      auction_duration: input.auctionDuration,
      conservation_state: input.conservationState,
      origin_cep: input.originCep.replace(/\D/g, ''),
      want_featured: input.wantFeatured,
      want_featured_plus: input.wantFeaturedPlus,
      publicar_ao_vivo: input.publicarAoVivo,
    },
  });

  if (error) {
    return { ok: false, erro: error.message };
  }

  const row = data as {
    ok?: boolean;
    auction_id?: string;
    vendor_id?: string;
    status?: string;
  };

  if (!row?.ok || !row.auction_id) {
    return { ok: false, erro: 'Não foi possível publicar o leilão.' };
  }

  const vendorId = row.vendor_id ?? LEVOU_OFFICIAL_USER_ID;

  if (input.photos.length > 0) {
    try {
      const urls = await enviarFotosAnuncio(row.auction_id, vendorId, input.photos);
      await supabase.from('auctions').update({ image_urls: urls }).eq('id', row.auction_id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao enviar fotos.';
      return {
        ok: true,
        auctionId: row.auction_id,
        vendorId,
        status: row.status,
        erro: `Leilão criado, mas as fotos falharam: ${msg}`,
      };
    }
  }

  return {
    ok: true,
    auctionId: row.auction_id,
    vendorId,
    status: row.status,
  };
}

export const LOJA_OFICIAL_ADMIN_HINT = {
  email: LEVOU_OFFICIAL_VENDOR_EMAILS[0],
  handle: LEVOU_OFFICIAL_HANDLE,
  senhaInicial: 'LevouLojaSetup!',
};
