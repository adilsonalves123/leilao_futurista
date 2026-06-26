import AsyncStorage from '@react-native-async-storage/async-storage';

import { MOCK_VENDOR_ID } from '@/src/constants/operations';
import { formatBRL } from '@/src/lib/bids';
import {
  calcularEndsAtAPartirDe,
  inferirDuracaoPorEndsAt,
  type AuctionDuration,
  type ListingCategory,
} from '@/src/lib/listingCategories';
import {
  deveUsarBackendLeilaoLocal,
  isErroUuidPostgres,
  normalizeAuctionId,
} from '@/src/lib/auctionIds';
import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import { enviarFotosAnuncio } from '@/src/services/auctionImageUpload';
import type { AuctionStatus, OrderStatus } from '@/src/types/database';

export type GestaoStatus =
  | 'em_andamento'
  | 'pausado'
  | 'aguardando_pagamento'
  | 'finalizado'
  | 'cancelado';

export type VendorListingResumo = {
  id: string;
  title: string;
  imageUrl: string;
  highestBidCents: number;
  highestBidLabel: string;
  gestaoStatus: GestaoStatus;
  gestaoStatusLabel: string;
  statusColor: string;
};

export type LanceAnuncio = {
  id: string;
  bidderName: string;
  amountCents: number;
  amountLabel: string;
  createdAt: string;
  createdAtLabel: string;
  isHighest: boolean;
};

export type ArrematanteInfo = {
  orderId: string;
  orderCode: string;
  buyerId: string;
  buyerName: string;
  email: string;
  telefone: string | null;
  paymentStatus: OrderStatus;
  paymentStatusLabel: string;
  paymentMethodLabel: string | null;
  itemCents: number;
  itemLabel: string;
  pagamentoConfirmado: boolean;
};

export type GestaoAnuncioDetalhe = {
  id: string;
  title: string;
  description: string | null;
  imageUrls: string[];
  startingPriceCents: number;
  currentPriceCents: number;
  currentPriceLabel: string;
  gestaoStatus: GestaoStatus;
  gestaoStatusLabel: string;
  statusColor: string;
  endsAt: string | null;
  startsAt: string | null;
  category: ListingCategory | null;
  auctionDuration: AuctionDuration;
  bidCount: number;
  canEditMedia: boolean;
  canEditPriceAndEndDate: boolean;
  auctionStatus: AuctionStatus;
  canPause: boolean;
  canResume: boolean;
  canDelete: boolean;
  bids: LanceAnuncio[];
  arrematante: ArrematanteInfo | null;
};

export type AtualizarAnuncioInput = {
  title: string;
  description: string;
  category: ListingCategory;
  startingPriceCents?: number;
  endsAt?: string;
  imageUrls: string[];
};

const IMAGES_KEY = '@aetherion/vendor_listing_images';
const CATEGORY_KEY = '@aetherion/vendor_listing_category';
const MOCK_EDIT_KEY = '@aetherion/vendor_listing_mock_edits';

const STATUS_META: Record<GestaoStatus, { label: string; color: string }> = {
  em_andamento: { label: 'Em andamento', color: '#F59E0B' },
  pausado: { label: 'Pausado', color: '#6B7280' },
  aguardando_pagamento: { label: 'Aguardando Pagamento', color: '#D97706' },
  finalizado: { label: 'Finalizado', color: '#10B981' },
  cancelado: { label: 'Excluído', color: '#9CA3AF' },
};

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pendente_pagamento: 'Aguardando pagamento',
  pago: 'Pago — retido em custódia',
  em_envio: 'Pago — item em envio',
  aguardando_confirmacao: 'Pago — aguardando confirmação',
  finalizado: 'Pagamento confirmado',
  em_disputa: 'Em disputa',
  estornado: 'Estornado',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'Pix',
  boleto: 'Boleto',
  cartao: 'Cartão',
  cripto: 'Cripto',
};

const MOCK_LISTINGS: GestaoAnuncioDetalhe[] = [
  {
    id: 'a1',
    title: 'MacBook Pro M3 Max 512GB',
    description: 'Notebook lacrado, nota fiscal inclusa. Retirada ou envio via Melhor Envio.',
    imageUrls: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800',
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=800',
    ],
    startingPriceCents: 1500000,
    currentPriceCents: 1899000,
    currentPriceLabel: formatBRL(1899000),
    gestaoStatus: 'em_andamento',
    gestaoStatusLabel: STATUS_META.em_andamento.label,
    statusColor: STATUS_META.em_andamento.color,
    endsAt: new Date(Date.now() + 3600000 * 5).toISOString(),
    startsAt: new Date(Date.now() - 3600000).toISOString(),
    category: 'eletronicos',
    auctionDuration: '6 horas',
    bidCount: 4,
    auctionStatus: 'live',
    canEditMedia: false,
    canEditPriceAndEndDate: false,
    canPause: true,
    canResume: false,
    canDelete: true,
    bids: [
      {
        id: 'b-a1-1',
        bidderName: '@lucas_s',
        amountCents: 1899000,
        amountLabel: formatBRL(1899000),
        createdAt: new Date(Date.now() - 120000).toISOString(),
        createdAtLabel: formatBidTime(new Date(Date.now() - 120000).toISOString()),
        isHighest: true,
      },
      {
        id: 'b-a1-2',
        bidderName: '@ana_p',
        amountCents: 1850000,
        amountLabel: formatBRL(1850000),
        createdAt: new Date(Date.now() - 900000).toISOString(),
        createdAtLabel: formatBidTime(new Date(Date.now() - 900000).toISOString()),
        isHighest: false,
      },
      {
        id: 'b-a1-3',
        bidderName: '@carlos_r',
        amountCents: 1780000,
        amountLabel: formatBRL(1780000),
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        createdAtLabel: formatBidTime(new Date(Date.now() - 3600000).toISOString()),
        isHighest: false,
      },
      {
        id: 'b-a1-4',
        bidderName: '@maria_f',
        amountCents: 1650000,
        amountLabel: formatBRL(1650000),
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        createdAtLabel: formatBidTime(new Date(Date.now() - 7200000).toISOString()),
        isHighest: false,
      },
    ],
    arrematante: null,
  },
  {
    id: 'a2',
    title: 'AirPods Pro 2ª Geração',
    description: 'Fones seminovos, caixa original e cabo USB-C. Garantia Apple até dez/2026.',
    imageUrls: [
      'https://images.unsplash.com/photo-1606841837239-c5a061070ced?q=80&w=800',
    ],
    startingPriceCents: 80000,
    currentPriceCents: 80000,
    currentPriceLabel: formatBRL(80000),
    gestaoStatus: 'em_andamento',
    gestaoStatusLabel: STATUS_META.em_andamento.label,
    statusColor: STATUS_META.em_andamento.color,
    endsAt: new Date(Date.now() + 3600000 * 12).toISOString(),
    startsAt: new Date(Date.now() - 3600000).toISOString(),
    category: 'eletronicos',
    auctionDuration: '24 horas',
    bidCount: 0,
    auctionStatus: 'live',
    canEditMedia: true,
    canEditPriceAndEndDate: true,
    canPause: true,
    canResume: false,
    canDelete: true,
    bids: [],
    arrematante: null,
  },
  {
    id: 'a3',
    title: 'Samsung Galaxy S24 Ultra',
    description: '256GB, cor Titanium Black. Acessórios completos.',
    imageUrls: [
      'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=800',
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa8?q=80&w=800',
    ],
    startingPriceCents: 420000,
    currentPriceCents: 485000,
    currentPriceLabel: formatBRL(485000),
    gestaoStatus: 'finalizado',
    gestaoStatusLabel: STATUS_META.finalizado.label,
    statusColor: STATUS_META.finalizado.color,
    endsAt: new Date(Date.now() - 86400000).toISOString(),
    startsAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    category: 'eletronicos',
    auctionDuration: '3 dias',
    bidCount: 6,
    auctionStatus: 'ended',
    canEditMedia: false,
    canEditPriceAndEndDate: false,
    canPause: false,
    canResume: false,
    canDelete: false,
    bids: [
      {
        id: 'b-a3-1',
        bidderName: '@pedro_m',
        amountCents: 485000,
        amountLabel: formatBRL(485000),
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        createdAtLabel: formatBidTime(new Date(Date.now() - 86400000).toISOString()),
        isHighest: true,
      },
      {
        id: 'b-a3-2',
        bidderName: '@julia_k',
        amountCents: 470000,
        amountLabel: formatBRL(470000),
        createdAt: new Date(Date.now() - 86500000).toISOString(),
        createdAtLabel: formatBidTime(new Date(Date.now() - 86500000).toISOString()),
        isHighest: false,
      },
    ],
    arrematante: {
      orderId: 'ord-mock-a3',
      orderCode: 'LC-45892',
      buyerId: 'u-pedro',
      buyerName: 'Pedro M.',
      email: 'pedro.m@email.com',
      telefone: '(41) 99876-5432',
      paymentStatus: 'finalizado',
      paymentStatusLabel: ORDER_STATUS_LABELS.finalizado,
      paymentMethodLabel: 'Pix',
      itemCents: 485000,
      itemLabel: formatBRL(485000),
      pagamentoConfirmado: true,
    },
  },
  {
    id: 'a4',
    title: 'iPhone 16 Pro Max 256GB',
    description: 'Aparelho desbloqueado, bateria 98%. Acompanha capinha original.',
    imageUrls: [
      'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?q=80&w=800',
    ],
    startingPriceCents: 650000,
    currentPriceCents: 749900,
    currentPriceLabel: formatBRL(749900),
    gestaoStatus: 'aguardando_pagamento',
    gestaoStatusLabel: STATUS_META.aguardando_pagamento.label,
    statusColor: STATUS_META.aguardando_pagamento.color,
    endsAt: new Date(Date.now() - 3600000).toISOString(),
    startsAt: new Date(Date.now() - 86400000).toISOString(),
    category: 'eletronicos',
    auctionDuration: '24 horas',
    bidCount: 3,
    auctionStatus: 'ended',
    canEditMedia: false,
    canEditPriceAndEndDate: false,
    canPause: false,
    canResume: false,
    canDelete: false,
    bids: [
      {
        id: 'b-a4-1',
        bidderName: '@lucas_s',
        amountCents: 749900,
        amountLabel: formatBRL(749900),
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        createdAtLabel: formatBidTime(new Date(Date.now() - 3600000).toISOString()),
        isHighest: true,
      },
    ],
    arrematante: {
      orderId: 'ord-mock-a4',
      orderCode: 'LC-45901',
      buyerId: 'u-lucas',
      buyerName: 'Lucas S.',
      email: 'lucas.s@email.com',
      telefone: '(11) 98765-4321',
      paymentStatus: 'pendente_pagamento',
      paymentStatusLabel: ORDER_STATUS_LABELS.pendente_pagamento,
      paymentMethodLabel: null,
      itemCents: 749900,
      itemLabel: formatBRL(749900),
      pagamentoConfirmado: false,
    },
  },
];

function formatBidTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resolveGestaoStatus(
  auctionStatus: string,
  orderStatus: OrderStatus | null,
): GestaoStatus {
  if (auctionStatus === 'cancelled') return 'cancelado';
  if (auctionStatus === 'paused') return 'pausado';
  if (auctionStatus === 'live') return 'em_andamento';
  if (orderStatus === 'pendente_pagamento') return 'aguardando_pagamento';
  return 'finalizado';
}

function flagsGestaoAnuncio(
  auctionStatus: AuctionStatus,
  bidCount: number,
): Pick<GestaoAnuncioDetalhe, 'canEditMedia' | 'canEditPriceAndEndDate' | 'canPause' | 'canResume' | 'canDelete'> {
  const editavel = auctionStatus === 'live' || auctionStatus === 'paused';
  return {
    canEditMedia: bidCount === 0 && auctionStatus === 'live',
    canEditPriceAndEndDate: bidCount === 0 && auctionStatus === 'live',
    canPause: auctionStatus === 'live',
    canResume: auctionStatus === 'paused',
    canDelete: editavel,
  };
}

function mapResumo(detail: GestaoAnuncioDetalhe): VendorListingResumo {
  return {
    id: detail.id,
    title: detail.title,
    imageUrl: detail.imageUrls[0] ?? '',
    highestBidCents: detail.currentPriceCents,
    highestBidLabel: detail.currentPriceLabel,
    gestaoStatus: detail.gestaoStatus,
    gestaoStatusLabel: detail.gestaoStatusLabel,
    statusColor: detail.statusColor,
  };
}

async function lerImagensExtras(): Promise<Record<string, string[]>> {
  try {
    const raw = await AsyncStorage.getItem(IMAGES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
  } catch {
    return {};
  }
}

async function salvarImagensExtras(map: Record<string, string[]>): Promise<void> {
  await AsyncStorage.setItem(IMAGES_KEY, JSON.stringify(map));
}

type MockEditPatch = Partial<
  Pick<
    GestaoAnuncioDetalhe,
    | 'title'
    | 'description'
    | 'imageUrls'
    | 'startingPriceCents'
    | 'currentPriceCents'
    | 'endsAt'
    | 'startsAt'
    | 'category'
    | 'auctionDuration'
    | 'auctionStatus'
    | 'gestaoStatus'
    | 'gestaoStatusLabel'
    | 'statusColor'
  >
>;

async function lerMockEdits(): Promise<Record<string, MockEditPatch>> {
  try {
    const raw = await AsyncStorage.getItem(MOCK_EDIT_KEY);
    return raw ? (JSON.parse(raw) as Record<string, MockEditPatch>) : {};
  } catch {
    return {};
  }
}

async function salvarMockEdit(auctionId: string, patch: MockEditPatch): Promise<void> {
  const map = await lerMockEdits();
  map[auctionId] = { ...map[auctionId], ...patch };
  await AsyncStorage.setItem(MOCK_EDIT_KEY, JSON.stringify(map));
}

async function lerCategoriasExtras(): Promise<Record<string, ListingCategory>> {
  try {
    const raw = await AsyncStorage.getItem(CATEGORY_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ListingCategory>) : {};
  } catch {
    return {};
  }
}

async function salvarCategoriaExtra(auctionId: string, category: ListingCategory): Promise<void> {
  const map = await lerCategoriasExtras();
  map[auctionId] = category;
  await AsyncStorage.setItem(CATEGORY_KEY, JSON.stringify(map));
}

function aplicarImagensExtras(
  detail: GestaoAnuncioDetalhe,
  extras: Record<string, string[]>,
): GestaoAnuncioDetalhe {
  const extra = extras[detail.id];
  if (!extra?.length) return detail;
  return { ...detail, imageUrls: [...detail.imageUrls, ...extra] };
}

function aplicarMockEdits(
  detail: GestaoAnuncioDetalhe,
  edits: Record<string, MockEditPatch>,
  categorias: Record<string, ListingCategory>,
): GestaoAnuncioDetalhe {
  const patch = edits[detail.id];
  const cat = categorias[detail.id] ?? patch?.category ?? detail.category;
  const merged: GestaoAnuncioDetalhe = {
    ...detail,
    ...patch,
    category: cat ?? detail.category,
    currentPriceLabel: formatBRL(
      patch?.currentPriceCents ?? patch?.startingPriceCents ?? detail.currentPriceCents,
    ),
    bidCount: detail.bidCount,
  };
  const auctionStatus = (patch?.auctionStatus ?? merged.auctionStatus ?? 'live') as AuctionStatus;
  const gestaoStatus = resolveGestaoStatus(auctionStatus, merged.arrematante?.paymentStatus ?? null);
  const meta = STATUS_META[gestaoStatus];
  if (merged.endsAt) {
    merged.auctionDuration = inferirDuracaoPorEndsAt(merged.endsAt, merged.startsAt);
  }
  return {
    ...merged,
    auctionStatus,
    gestaoStatus,
    gestaoStatusLabel: meta.label,
    statusColor: meta.color,
    ...flagsGestaoAnuncio(auctionStatus, merged.bidCount),
  };
}

function mapAuctionRowToDetalhe(
  auction: Record<string, unknown>,
  bids: LanceAnuncio[],
  arrematante: ArrematanteInfo | null,
): GestaoAnuncioDetalhe {
  const auctionStatus = auction.status as AuctionStatus;
  const gestaoStatus = resolveGestaoStatus(
    auctionStatus,
    arrematante?.paymentStatus ?? null,
  );
  const meta = STATUS_META[gestaoStatus];
  const bidCount = bids.length;
  const endsAt = auction.ends_at as string;
  const startsAt = (auction.starts_at as string) ?? null;
  const category = (auction.listing_category as ListingCategory | null) ?? null;

  return {
    id: auction.id as string,
    title: auction.title as string,
    description: (auction.description as string | null) ?? null,
    imageUrls: (auction.image_urls as string[]) ?? [],
    startingPriceCents: auction.starting_price_cents as number,
    currentPriceCents: auction.current_price_cents as number,
    currentPriceLabel: formatBRL(auction.current_price_cents as number),
    gestaoStatus,
    gestaoStatusLabel: meta.label,
    statusColor: meta.color,
    endsAt,
    startsAt,
    category,
    auctionDuration: inferirDuracaoPorEndsAt(endsAt, startsAt),
    bidCount,
    auctionStatus,
    ...flagsGestaoAnuncio(auctionStatus, bidCount),
    bids,
    arrematante,
  };
}

function bidderDisplayName(
  user: { display_name: string | null; nome_completo: string | null; email: string } | null,
): string {
  if (!user) return 'Comprador';
  if (user.display_name?.startsWith('@')) return user.display_name;
  const base = user.display_name ?? user.nome_completo ?? user.email.split('@')[0];
  return `@${base.replace(/\s+/g, '_').toLowerCase()}`;
}

function isPagamentoConfirmado(status: OrderStatus): boolean {
  return ['pago', 'em_envio', 'aguardando_confirmacao', 'finalizado'].includes(status);
}

export async function listarMeusAnuncios(): Promise<VendorListingResumo[]> {
  if (isMockMode() || !isSupabaseConfigured()) {
    const extras = await lerImagensExtras();
    return MOCK_LISTINGS.map((l) => mapResumo(aplicarImagensExtras(l, extras)));
  }

  const supabase = getSupabase();
  if (!supabase) {
    const extras = await lerImagensExtras();
    return MOCK_LISTINGS.map((l) => mapResumo(aplicarImagensExtras(l, extras)));
  }

  const { data: auth } = await supabase.auth.getUser();
  const sellerId = auth.user?.id ?? MOCK_VENDOR_ID;

  const { data, error } = await supabase
    .from('auctions')
    .select('id, title, image_urls, current_price_cents, status')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });

  if (error || !data?.length) {
    const extras = await lerImagensExtras();
    return MOCK_LISTINGS.map((l) => mapResumo(aplicarImagensExtras(l, extras)));
  }

  const resumos: VendorListingResumo[] = [];

  for (const row of data) {
    const { data: order } = await supabase
      .from('orders')
      .select('status')
      .eq('auction_id', row.id)
      .maybeSingle();

    const gestaoStatus = resolveGestaoStatus(
      row.status as string,
      (order?.status as OrderStatus | null) ?? null,
    );
    const meta = STATUS_META[gestaoStatus];

    resumos.push({
      id: row.id,
      title: row.title,
      imageUrl: (row.image_urls as string[])?.[0] ?? '',
      highestBidCents: row.current_price_cents as number,
      highestBidLabel: formatBRL(row.current_price_cents as number),
      gestaoStatus,
      gestaoStatusLabel: meta.label,
      statusColor: meta.color,
    });
  }

  return resumos;
}

async function carregarDetalheMock(auctionId: string): Promise<GestaoAnuncioDetalhe | null> {
  const base = MOCK_LISTINGS.find((l) => l.id === auctionId);
  if (!base) return null;
  const [extras, edits, categorias] = await Promise.all([
    lerImagensExtras(),
    lerMockEdits(),
    lerCategoriasExtras(),
  ]);
  return aplicarMockEdits(aplicarImagensExtras(base, extras), edits, categorias);
}

export async function obterGestaoAnuncio(auctionId: string): Promise<GestaoAnuncioDetalhe | null> {
  const id = normalizeAuctionId(auctionId);
  if (deveUsarBackendLeilaoLocal(id)) {
    return carregarDetalheMock(id);
  }

  const supabase = getSupabase();
  if (!supabase) {
    return carregarDetalheMock(id);
  }

  const { data: auction, error } = await supabase
    .from('auctions')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !auction) {
    if (error && isErroUuidPostgres(error.message)) {
      return carregarDetalheMock(id);
    }
    return carregarDetalheMock(id);
  }

  const { data: bidsRaw } = await supabase
    .from('bids')
    .select(
      'id, amount_cents, created_at, bidder:users!bidder_id(display_name, nome_completo, email)',
    )
    .eq('auction_id', id)
    .order('amount_cents', { ascending: false });

  const bids: LanceAnuncio[] = (bidsRaw ?? []).map((row, index) => ({
    id: row.id as string,
    bidderName: bidderDisplayName(
      row.bidder as { display_name: string | null; nome_completo: string | null; email: string },
    ),
    amountCents: row.amount_cents as number,
    amountLabel: formatBRL(row.amount_cents as number),
    createdAt: row.created_at as string,
    createdAtLabel: formatBidTime(row.created_at as string),
    isHighest: index === 0,
  }));

  const { data: orderRow } = await supabase
    .from('orders')
    .select(
      `
      id,
      code,
      buyer_id,
      item_cents,
      status,
      buyer:users!buyer_id(display_name, nome_completo, email, telefone),
      invoice:auction_invoices(payment_method, approved_at)
    `,
    )
    .eq('auction_id', id)
    .maybeSingle();

  let arrematante: ArrematanteInfo | null = null;

  if (orderRow && auction.status !== 'live') {
    const buyer = orderRow.buyer as {
      display_name: string | null;
      nome_completo: string | null;
      email: string;
      telefone: string | null;
    };
    const invoice = Array.isArray(orderRow.invoice)
      ? orderRow.invoice[0]
      : orderRow.invoice;
    const paymentStatus = orderRow.status as OrderStatus;

    arrematante = {
      orderId: orderRow.id as string,
      orderCode: orderRow.code as string,
      buyerId: orderRow.buyer_id as string,
      buyerName: buyer.nome_completo ?? buyer.display_name ?? buyer.email.split('@')[0],
      email: buyer.email,
      telefone: buyer.telefone,
      paymentStatus,
      paymentStatusLabel: ORDER_STATUS_LABELS[paymentStatus],
      paymentMethodLabel: invoice?.payment_method
        ? PAYMENT_METHOD_LABELS[String(invoice.payment_method)] ?? String(invoice.payment_method)
        : null,
      itemCents: (orderRow.item_cents as number) ?? (auction.current_price_cents as number),
      itemLabel: formatBRL(
        (orderRow.item_cents as number) ?? (auction.current_price_cents as number),
      ),
      pagamentoConfirmado: isPagamentoConfirmado(paymentStatus),
    };
  }

  return mapAuctionRowToDetalhe(auction, bids, arrematante);
}

export async function atualizarAnuncio(
  auctionId: string,
  input: AtualizarAnuncioInput,
): Promise<GestaoAnuncioDetalhe> {
  const id = normalizeAuctionId(auctionId);
  const detalheAtual = await obterGestaoAnuncio(id);
  if (!detalheAtual) {
    throw new Error('Anúncio não encontrado.');
  }

  if (detalheAtual.auctionStatus === 'cancelled') {
    throw new Error('Este anúncio foi excluído e não pode ser editado.');
  }
  if (!['live', 'paused'].includes(detalheAtual.auctionStatus)) {
    throw new Error('Este leilão não está mais disponível para edição.');
  }

  if (!input.title.trim()) {
    throw new Error('Informe o título do anúncio.');
  }
  if (!input.description.trim()) {
    throw new Error('Informe a descrição do anúncio.');
  }
  if (input.imageUrls.length === 0) {
    throw new Error('Adicione pelo menos uma foto ao anúncio.');
  }

  const temLances = detalheAtual.bidCount > 0;

  if (temLances) {
    if (
      input.startingPriceCents !== undefined &&
      input.startingPriceCents !== detalheAtual.startingPriceCents
    ) {
      throw new Error('O preço inicial não pode ser alterado após receber lances.');
    }
    if (input.endsAt !== undefined && input.endsAt !== detalheAtual.endsAt) {
      throw new Error('A data de término não pode ser alterada após receber lances.');
    }
  }

  if (deveUsarBackendLeilaoLocal(id)) {
    const patch: MockEditPatch = {
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      imageUrls: input.imageUrls,
    };
    if (!temLances && input.startingPriceCents !== undefined) {
      patch.startingPriceCents = input.startingPriceCents;
      patch.currentPriceCents = input.startingPriceCents;
    }
    if (!temLances && input.endsAt) {
      patch.endsAt = input.endsAt;
      patch.auctionDuration = inferirDuracaoPorEndsAt(input.endsAt, detalheAtual.startsAt);
    }
    const extras = await lerImagensExtras();
    delete extras[id];
    await salvarImagensExtras(extras);
    await Promise.all([salvarMockEdit(id, patch), salvarCategoriaExtra(id, input.category)]);
    const atualizado = await carregarDetalheMock(id);
    if (!atualizado) throw new Error('Falha ao atualizar anúncio.');
    return atualizado;
  }

  const supabase = getSupabase();
  if (!supabase) {
    const patch: MockEditPatch = {
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      imageUrls: input.imageUrls,
    };
    if (!temLances && input.startingPriceCents !== undefined) {
      patch.startingPriceCents = input.startingPriceCents;
      patch.currentPriceCents = input.startingPriceCents;
    }
    if (!temLances && input.endsAt) patch.endsAt = input.endsAt;
    const extras = await lerImagensExtras();
    delete extras[id];
    await salvarImagensExtras(extras);
    await Promise.all([salvarMockEdit(id, patch), salvarCategoriaExtra(id, input.category)]);
    const atualizado = await carregarDetalheMock(id);
    if (!atualizado) throw new Error('Falha ao atualizar anúncio.');
    return atualizado;
  }

  const { data: auth } = await supabase.auth.getUser();
  const sellerId = auth.user?.id ?? MOCK_VENDOR_ID;

  const orderedUris = input.imageUrls;
  const imageUrls: string[] = [];
  const locaisParaEnviar: string[] = [];

  for (const uri of orderedUris) {
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      imageUrls.push(uri);
    } else {
      locaisParaEnviar.push(uri);
    }
  }

  if (locaisParaEnviar.length > 0) {
    const enviadas = await enviarFotosAnuncio(id, sellerId, locaisParaEnviar);
    let localIdx = 0;
    const merged: string[] = [];
    for (const uri of orderedUris) {
      if (uri.startsWith('http://') || uri.startsWith('https://')) {
        merged.push(uri);
      } else {
        merged.push(enviadas[localIdx]);
        localIdx += 1;
      }
    }
    imageUrls.length = 0;
    imageUrls.push(...merged);
  }

  const updatePayload: Record<string, unknown> = {
    title: input.title.trim(),
    description: input.description.trim(),
    listing_category: input.category,
    image_urls: imageUrls,
  };

  if (!temLances && input.startingPriceCents !== undefined) {
    updatePayload.starting_price_cents = input.startingPriceCents;
    updatePayload.current_price_cents = input.startingPriceCents;
  }
  if (!temLances && input.endsAt) {
    updatePayload.ends_at = input.endsAt;
  }

  const { error } = await supabase.from('auctions').update(updatePayload).eq('id', id);

  if (error) {
    if (isErroUuidPostgres(error.message)) {
      const patch: MockEditPatch = {
        title: input.title.trim(),
        description: input.description.trim(),
        category: input.category,
        imageUrls: input.imageUrls,
      };
      await salvarMockEdit(id, patch);
      const mockAtualizado = await carregarDetalheMock(id);
      if (!mockAtualizado) throw new Error('Falha ao atualizar anúncio.');
      return mockAtualizado;
    }
    throw new Error(error.message);
  }

  const atualizado = await obterGestaoAnuncio(id);
  if (!atualizado) throw new Error('Falha ao recarregar anúncio.');
  return atualizado;
}

export function prazoParaEndsAt(
  duration: AuctionDuration,
  startsAt: string | null,
): string {
  const base = startsAt ? new Date(startsAt) : new Date();
  return calcularEndsAtAPartirDe(duration, base);
}

export async function adicionarImagemAnuncio(auctionId: string, uri: string): Promise<string[]> {
  const id = normalizeAuctionId(auctionId);
  if (deveUsarBackendLeilaoLocal(id)) {
    const extras = await lerImagensExtras();
    const atual = extras[id] ?? [];
    const novas = [...atual, uri];
    extras[id] = novas;
    await salvarImagensExtras(extras);
    const base = MOCK_LISTINGS.find((l) => l.id === id);
    return [...(base?.imageUrls ?? []), ...novas];
  }

  const supabase = getSupabase();
  if (!supabase) {
    const extras = await lerImagensExtras();
    const atual = extras[id] ?? [];
    const novas = [...atual, uri];
    extras[id] = novas;
    await salvarImagensExtras(extras);
    return novas;
  }

  const detail = await obterGestaoAnuncio(id);
  if (!detail?.canEditMedia) {
    throw new Error('Não é possível adicionar fotos após receber lances.');
  }

  const { data: auth } = await supabase.auth.getUser();
  const sellerId = auth.user?.id ?? MOCK_VENDOR_ID;
  const [urlEnviada] = await enviarFotosAnuncio(id, sellerId, [uri]);
  const novasUrls = [...detail.imageUrls, urlEnviada];

  const { error } = await supabase
    .from('auctions')
    .update({ image_urls: novasUrls })
    .eq('id', id);

  if (error) throw new Error(error.message);
  return novasUrls;
}

async function alterarStatusAnuncioMock(
  auctionId: string,
  status: AuctionStatus,
): Promise<GestaoAnuncioDetalhe> {
  await salvarMockEdit(auctionId, { auctionStatus: status });
  const atualizado = await carregarDetalheMock(auctionId);
  if (!atualizado) throw new Error('Anúncio não encontrado.');
  return atualizado;
}

/** Status Supabase ao pausar — deve existir no enum auction_status. */
export const AUCTION_STATUS_PAUSED = 'paused' as const satisfies AuctionStatus;
export const AUCTION_STATUS_LIVE = 'live' as const satisfies AuctionStatus;

export async function pausarLeilao(auctionId: string): Promise<GestaoAnuncioDetalhe> {
  const id = normalizeAuctionId(auctionId);
  const detalhe = await obterGestaoAnuncio(id);
  if (!detalhe) throw new Error('Anúncio não encontrado.');
  if (!detalhe.canPause) {
    throw new Error('Somente leilões ativos podem ser pausados.');
  }

  if (deveUsarBackendLeilaoLocal(id)) {
    return alterarStatusAnuncioMock(id, AUCTION_STATUS_PAUSED);
  }

  const supabase = getSupabase();
  if (!supabase) return alterarStatusAnuncioMock(id, AUCTION_STATUS_PAUSED);

  const { error } = await supabase
    .from('auctions')
    .update({ status: AUCTION_STATUS_PAUSED })
    .eq('id', id)
    .eq('status', AUCTION_STATUS_LIVE);

  if (error) {
    if (isErroUuidPostgres(error.message)) {
      return alterarStatusAnuncioMock(id, AUCTION_STATUS_PAUSED);
    }
    throw new Error(error.message);
  }

  const atualizado = await obterGestaoAnuncio(id);
  if (!atualizado) throw new Error('Falha ao pausar leilão.');
  return atualizado;
}

export async function retomarLeilao(auctionId: string): Promise<GestaoAnuncioDetalhe> {
  const id = normalizeAuctionId(auctionId);
  const detalhe = await obterGestaoAnuncio(id);
  if (!detalhe) throw new Error('Anúncio não encontrado.');
  if (!detalhe.canResume) {
    throw new Error('Este leilão não está pausado.');
  }

  if (deveUsarBackendLeilaoLocal(id)) {
    return alterarStatusAnuncioMock(id, AUCTION_STATUS_LIVE);
  }

  const supabase = getSupabase();
  if (!supabase) return alterarStatusAnuncioMock(id, AUCTION_STATUS_LIVE);

  const { error } = await supabase
    .from('auctions')
    .update({ status: AUCTION_STATUS_LIVE })
    .eq('id', id)
    .eq('status', AUCTION_STATUS_PAUSED);

  if (error) {
    if (isErroUuidPostgres(error.message)) {
      return alterarStatusAnuncioMock(id, AUCTION_STATUS_LIVE);
    }
    throw new Error(error.message);
  }

  const atualizado = await obterGestaoAnuncio(id);
  if (!atualizado) throw new Error('Falha ao retomar leilão.');
  return atualizado;
}

export type ExcluirAnuncioResultado = {
  penalidadeAplicada: boolean;
  reputacaoEstrelas?: number;
};

export async function excluirAnuncio(auctionId: string): Promise<ExcluirAnuncioResultado> {
  const id = normalizeAuctionId(auctionId);
  const detalhe = await obterGestaoAnuncio(id);
  if (!detalhe) throw new Error('Anúncio não encontrado.');
  if (!detalhe.canDelete) {
    throw new Error('Este anúncio não pode ser excluído no status atual.');
  }

  const temLances = detalhe.bidCount > 0;

  async function excluirMock(): Promise<ExcluirAnuncioResultado> {
    await alterarStatusAnuncioMock(id, 'cancelled');
    if (temLances) {
      const { aplicarPenalidadeExclusaoComLances, obterIdVendedorAtual } = await import(
        '@/src/services/vendorReputation'
      );
      const vendorId = await obterIdVendedorAtual();
      const reputacao = await aplicarPenalidadeExclusaoComLances(vendorId);
      return { penalidadeAplicada: true, reputacaoEstrelas: reputacao };
    }
    return { penalidadeAplicada: false };
  }

  if (deveUsarBackendLeilaoLocal(id)) {
    return excluirMock();
  }

  const supabase = getSupabase();
  if (!supabase) {
    return excluirMock();
  }

  const { error } = await supabase.rpc('excluir_leilao_vendedor', {
    p_auction_id: id,
  });

  if (error) {
    if (isErroUuidPostgres(error.message)) {
      return excluirMock();
    }
    if (error.message.includes('Could not find the function')) {
      const { error: cancelErr } = await supabase
        .from('auctions')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .in('status', ['live', 'paused', 'draft']);
      if (cancelErr) {
        if (isErroUuidPostgres(cancelErr.message)) {
          return excluirMock();
        }
        throw new Error(cancelErr.message);
      }
      if (temLances) {
        const { aplicarPenalidadeExclusaoComLances, obterIdVendedorAtual } = await import(
          '@/src/services/vendorReputation'
        );
        const vendorId = await obterIdVendedorAtual();
        const reputacao = await aplicarPenalidadeExclusaoComLances(vendorId);
        return { penalidadeAplicada: true, reputacaoEstrelas: reputacao };
      }
      return { penalidadeAplicada: false };
    }
    throw new Error(error.message);
  }

  if (temLances) {
    const { obterReputacaoVendedor, obterIdVendedorAtual } = await import(
      '@/src/services/vendorReputation'
    );
    const vendorId = await obterIdVendedorAtual();
    const reputacao = await obterReputacaoVendedor(vendorId);
    return { penalidadeAplicada: true, reputacaoEstrelas: reputacao };
  }

  return { penalidadeAplicada: false };
}
