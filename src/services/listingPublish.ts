import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  requiresElectronicsTechSheet,
  type ElectronicsTechSheetPayload,
} from '@/src/constants/electronicsTechSheet';
import { propertyExtrasFromTechSheet } from '@/src/constants/propertyTechSheet';
import { vehicleExtrasFromTechSheet } from '@/src/constants/vehicleTechSheet';
import { LISTING_LEGAL_DECLARATION_FULL_TEXT } from '@/src/constants/listingLegalDeclaration';
import { DEFAULT_PROMOTION_PLANS } from '@/src/constants/promotionPlans';
import {
  calcularEndsAtAPartirDe,
  parsePriceInput,
  reaisParaCentavos,
  type AuctionDuration,
} from '@/src/lib/listingCategories';
import { isMockMode } from '@/src/lib/mockMode';
import { obterIdUsuarioAtual } from '@/src/lib/sessionUser';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import { buildPromotionCheckout } from '@/src/lib/promotionFormatters';
import { enviarFotosAnuncio } from '@/src/services/auctionImageUpload';
import { calcularGarantiaVendedorLocal } from '@/src/constants/payments';
import {
  debitListingWalletCents,
  getListingWalletBalanceCents,
  getWalletBreakdownCents,
  syncListingWalletFromSupabase,
} from '@/src/services/listingWalletBalance';
import type { ListingPublishInput, ListingPublishResult } from '@/src/types/listingPublish';

const MOCK_PUBLISHED_KEY = '@levou/mock_published_auctions';

type MockPublishedRow = {
  id: string;
  title: string;
  imageUrls: string[];
  createdAt: string;
};

function resolveProductBrand(input: ListingPublishInput): string | null {
  if (input.category === 'eletronicos') {
    return input.electronicsTechSheet.marca?.trim() || null;
  }
  if (input.category === 'veiculos') {
    return input.vehicleTechSheet.marca_modelo?.trim() || null;
  }
  return null;
}

function resolveProductDimensions(input: ListingPublishInput): string | null {
  const h = input.heightCm.trim();
  const w = input.widthCm.trim();
  const l = input.lengthCm.trim();
  if (h && w && l) return `${l}×${w}×${h} cm`;
  const parts = [l, w, h].filter(Boolean);
  return parts.length > 0 ? `${parts.join('×')} cm` : null;
}

function buildElectronicsTechSheetExtra(
  input: ListingPublishInput,
): ElectronicsTechSheetPayload | null {
  if (!input.electronicTypeId || !requiresElectronicsTechSheet(input.electronicTypeId)) {
    return null;
  }
  return {
    type_id: input.electronicTypeId,
    values: input.electronicsTechSheet,
  };
}

function buildListingExtras(input: ListingPublishInput): Record<string, unknown> {
  return {
    legal_declaration_version: '2026-06-v1',
    legal_declaration_accepted: input.ownershipDeclarationAccepted,
    legal_declaration_text_snapshot: LISTING_LEGAL_DECLARATION_FULL_TEXT,
    weight_kg: input.weightKg.trim() || null,
    height_cm: input.heightCm.trim() || null,
    width_cm: input.widthCm.trim() || null,
    length_cm: input.lengthCm.trim() || null,
    product_brand: resolveProductBrand(input),
    product_dimensions: resolveProductDimensions(input),
    optional_serial: input.optionalSerial.trim() || null,
    electronic_type_id: input.electronicTypeId,
    electronic_type_label: input.electronicTypeLabel,
    electronics_tech_sheet: buildElectronicsTechSheetExtra(input),
    vehicle_tech_sheet:
      input.category === 'veiculos' ? { values: input.vehicleTechSheet } : null,
    property_tech_sheet:
      input.category === 'imoveis' ? { values: input.propertyTechSheet } : null,
    nf_pdf_attached: input.nfPdfAttached,
    vehicle:
      input.category === 'veiculos'
        ? vehicleExtrasFromTechSheet(input.vehicleTechSheet)
        : null,
    property:
      input.category === 'imoveis'
        ? propertyExtrasFromTechSheet(input.propertyTechSheet)
        : null,
  };
}

async function salvarMockPublicado(row: MockPublishedRow): Promise<void> {
  const raw = await AsyncStorage.getItem(MOCK_PUBLISHED_KEY);
  const lista: MockPublishedRow[] = raw ? (JSON.parse(raw) as MockPublishedRow[]) : [];
  lista.unshift(row);
  await AsyncStorage.setItem(MOCK_PUBLISHED_KEY, JSON.stringify(lista.slice(0, 50)));
}

async function publicarMock(input: ListingPublishInput): Promise<ListingPublishResult> {
  const checkout = buildPromotionCheckout(DEFAULT_PROMOTION_PLANS, input.promotionSelection);
  const total = checkout.totalCents;

  const estimatedCents = reaisParaCentavos(parsePriceInput(input.estimatedMarketValue));
  const collateralCents = calcularGarantiaVendedorLocal(estimatedCents);
  const breakdown = await getWalletBreakdownCents();

  if (breakdown.availableCents < total + collateralCents) {
    return {
      ok: false,
      erro: `Saldo disponível insuficiente. Promoções: R$ ${(total / 100).toFixed(2)}, garantia: R$ ${(collateralCents / 100).toFixed(2)}, disponível: R$ ${(breakdown.availableCents / 100).toFixed(2)}.`,
      fonte: 'mock',
    };
  }

  if (total > 0) {
    const debito = await debitListingWalletCents(total);
    if (!debito.ok) {
      return { ok: false, erro: debito.erro, fonte: 'mock' };
    }
  }

  const auctionId = `lst-${Date.now()}`;
  await salvarMockPublicado({
    id: auctionId,
    title: input.title.trim(),
    imageUrls: [...input.photos],
    createdAt: new Date().toISOString(),
  });

  const newBalance = await getListingWalletBalanceCents();

  return {
    ok: true,
    auctionId,
    totalChargedCents: total,
    collateralHeldCents: collateralCents,
    newBalanceCents: newBalance,
    newCollateralHeldCents: breakdown.collateralHeldCents + collateralCents,
    availableBalanceCents: Math.max(newBalance - breakdown.collateralHeldCents - collateralCents, 0),
    fonte: 'mock',
  };
}

export async function publicarNovoLeilao(
  input: ListingPublishInput,
): Promise<ListingPublishResult> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return publicarMock(input);
  }

  const supabase = getSupabase();
  if (!supabase) {
    return publicarMock(input);
  }

  const sellerId = await obterIdUsuarioAtual();
  if (!sellerId) {
    return { ok: false, erro: 'Faça login para publicar.', fonte: 'supabase' };
  }

  const photos = [...input.photos];
  const { data: kycAprovado, error: kycErr } = await supabase.rpc('auth_kyc_aprovado');
  if (kycErr) {
    return {
      ok: false,
      erro: 'Não foi possível verificar seu cadastro. Tente novamente.',
      fonte: 'supabase',
    };
  }
  if (kycAprovado !== true) {
    return {
      ok: false,
      erro: 'Cadastro completo (KYC) aprovado é obrigatório para publicar. Conclua a verificação em Cadastro KYC.',
      fonte: 'supabase',
    };
  }

  const startingCents = reaisParaCentavos(parsePriceInput(input.startPrice));
  const estimatedCents = reaisParaCentavos(parsePriceInput(input.estimatedMarketValue));

  const { data, error } = await supabase.rpc('publicar_leilao', {
    p_payload: {
      title: input.title.trim(),
      description: input.description.trim(),
      listing_category: input.category,
      starting_price_cents: startingCents,
      estimated_market_cents: estimatedCents,
      auction_duration: input.auctionDuration as AuctionDuration,
      conservation_state: input.conservationState,
      origin_cep: input.originCep,
      serial_imei: input.serialImei.trim() || null,
      serial_imei_kind: input.serialImeiKind,
      nf_access_key: input.nfAccessKey.replace(/\D/g, '').length === 44 ? input.nfAccessKey : null,
      want_featured: input.promotionSelection.featured,
      want_featured_plus: input.promotionSelection.featuredPlus,
      want_ai_cover: false,
      listing_extras: buildListingExtras(input),
    },
  });

  if (error) {
    return { ok: false, erro: error.message, fonte: 'supabase' };
  }

  const row = data as {
    ok?: boolean;
    auction_id?: string;
    total_charged_cents?: number;
    collateral_held_cents?: number;
    new_balance_cents?: number;
    new_collateral_held_cents?: number;
    available_balance_cents?: number;
  };

  if (!row?.ok || !row.auction_id) {
    return { ok: false, erro: 'Resposta inválida ao publicar.', fonte: 'supabase' };
  }

  const auctionId = row.auction_id;

  try {
    const imageUrls = await enviarFotosAnuncio(auctionId, sellerId, input.photos);
    const { error: imgErr } = await supabase.rpc('atualizar_imagens_leilao_rascunho', {
      p_auction_id: auctionId,
      p_image_urls: imageUrls,
    });
    if (imgErr) {
      return {
        ok: false,
        erro: `Leilão criado, mas falha ao salvar fotos: ${imgErr.message}`,
        auctionId,
        fonte: 'supabase',
      };
    }
  } catch (uploadErr) {
    const msg = uploadErr instanceof Error ? uploadErr.message : 'Falha no upload das fotos.';
    return { ok: false, erro: msg, auctionId, fonte: 'supabase' };
  }

  await syncListingWalletFromSupabase();

  return {
    ok: true,
    auctionId,
    totalChargedCents: row.total_charged_cents ?? 0,
    collateralHeldCents: row.collateral_held_cents ?? 0,
    newBalanceCents: row.new_balance_cents,
    newCollateralHeldCents: row.new_collateral_held_cents,
    availableBalanceCents: row.available_balance_cents,
    fonte: 'supabase',
  };
}
