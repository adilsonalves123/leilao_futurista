import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CreateReviewInput, Review } from '@/src/types/review';
import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import { enviarFotosReview } from '@/src/services/reviewUpload';

const REVIEWS_MOCK_KEY = '@aetherion/reviews_mock';

export const REVIEWS_MOCK_INICIAIS: Review[] = [
  {
    id: 'rev-1',
    orderId: 'ord-45821',
    auctionId: 'l-rolex-01',
    vendorId: 'v-luxury',
    buyerId: 'u-john',
    rating: 5,
    comment: 'Relógio impecável, exatamente como nas fotos do leilão. Embalagem premium.',
    images: [
      'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=600&auto=format&fit=crop',
    ],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    buyerName: 'John D.',
    auctionTitle: 'Rolex Submariner',
  },
  {
    id: 'rev-2',
    orderId: 'ord-45819',
    auctionId: 'l-macbook-03',
    vendorId: 'v-tech',
    buyerId: 'u-carlos',
    rating: 5,
    comment: 'MacBook lacrado, nota fiscal inclusa. Vendedor respondeu rápido no chat.',
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop',
    ],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    buyerName: 'Carlos R.',
    auctionTitle: 'MacBook Pro M3 Max',
  },
  {
    id: 'rev-3',
    orderId: 'ord-45818',
    auctionId: 'l-jordan-04',
    vendorId: 'v-sneaker',
    buyerId: 'u-ana',
    rating: 4,
    comment: 'Tênis original, caixa um pouco amassada mas produto perfeito.',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=600&auto=format&fit=crop',
    ],
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    buyerName: 'Ana P.',
    auctionTitle: 'Jordan 1 Retro High',
  },
];

function mapRow(row: {
  id: string;
  order_id: string;
  auction_id: string;
  buyer_id: string;
  vendor_id: string;
  rating: number;
  comment: string;
  images: string[];
  created_at: string;
  buyer?: { nome_completo: string | null; display_name: string | null } | null;
  auction?: { title: string } | null;
}): Review {
  const buyer = row.buyer as { nome_completo: string | null; display_name: string | null } | null;
  const auction = row.auction as { title: string } | null;
  return {
    id: row.id,
    orderId: row.order_id,
    auctionId: row.auction_id,
    buyerId: row.buyer_id,
    vendorId: row.vendor_id,
    rating: row.rating,
    comment: row.comment,
    images: row.images ?? [],
    createdAt: row.created_at,
    buyerName: buyer?.nome_completo ?? buyer?.display_name ?? undefined,
    auctionTitle: auction?.title,
  };
}

async function lerMock(): Promise<Review[]> {
  const raw = await AsyncStorage.getItem(REVIEWS_MOCK_KEY);
  if (!raw) return [...REVIEWS_MOCK_INICIAIS];
  try {
    return JSON.parse(raw) as Review[];
  } catch {
    return [...REVIEWS_MOCK_INICIAIS];
  }
}

async function salvarMock(reviews: Review[]): Promise<void> {
  await AsyncStorage.setItem(REVIEWS_MOCK_KEY, JSON.stringify(reviews));
}

export async function listarReviewsPorVendedor(vendorId: string): Promise<Review[]> {
  if (isMockMode() || !isSupabaseConfigured()) {
    const mock = await lerMock();
    return mock.filter((r) => r.vendorId === vendorId || vendorId.startsWith('v-') || vendorId.startsWith('mock'));
  }

  const supabase = getSupabase();
  if (!supabase) {
    const mock = await lerMock();
    return mock.filter((r) => r.vendorId === vendorId);
  }

  const { data, error } = await supabase
    .from('reviews')
    .select(
      'id, order_id, auction_id, buyer_id, vendor_id, rating, comment, images, created_at, buyer:users!buyer_id(nome_completo, display_name), auction:auctions!auction_id(title)',
    )
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });

  if (error) {
    const mock = await lerMock();
    return mock.filter((r) => r.vendorId === vendorId);
  }

  return (data ?? []).map((row) => mapRow(row as Parameters<typeof mapRow>[0]));
}

export async function listarReviewsPorLeilao(auctionId: string): Promise<Review[]> {
  if (isMockMode() || !isSupabaseConfigured()) {
    const mock = await lerMock();
    return mock.filter((r) => r.auctionId === auctionId || auctionId === '1' || auctionId.length < 8);
  }

  const supabase = getSupabase();
  if (!supabase) {
    const mock = await lerMock();
    return mock.filter((r) => r.auctionId === auctionId);
  }

  const { data, error } = await supabase
    .from('reviews')
    .select(
      'id, order_id, auction_id, buyer_id, vendor_id, rating, comment, images, created_at, buyer:users!buyer_id(nome_completo, display_name), auction:auctions!auction_id(title)',
    )
    .eq('auction_id', auctionId)
    .order('created_at', { ascending: false });

  if (error) {
    const mock = await lerMock();
    return mock.filter((r) => r.auctionId === auctionId);
  }

  return (data ?? []).map((row) => mapRow(row as Parameters<typeof mapRow>[0]));
}

export async function listarReviewsPorPedido(orderId: string): Promise<Review[]> {
  if (isMockMode() || !isSupabaseConfigured()) {
    const mock = await lerMock();
    return mock.filter((r) => r.orderId === orderId);
  }

  const supabase = getSupabase();
  if (!supabase) return (await lerMock()).filter((r) => r.orderId === orderId);

  const { data } = await supabase
    .from('reviews')
    .select(
      'id, order_id, auction_id, buyer_id, vendor_id, rating, comment, images, created_at, buyer:users!buyer_id(nome_completo, display_name), auction:auctions!auction_id(title)',
    )
    .eq('order_id', orderId);

  return (data ?? []).map((row) => mapRow(row as Parameters<typeof mapRow>[0]));
}

export async function listarMinhasReviews(buyerId: string): Promise<Review[]> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return lerMock();
  }

  const supabase = getSupabase();
  if (!supabase) return lerMock();

  const { data } = await supabase
    .from('reviews')
    .select(
      'id, order_id, auction_id, buyer_id, vendor_id, rating, comment, images, created_at, buyer:users!buyer_id(nome_completo, display_name), auction:auctions!auction_id(title)',
    )
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false });

  return (data ?? []).map((row) => mapRow(row as Parameters<typeof mapRow>[0]));
}

export async function criarReview(input: CreateReviewInput): Promise<Review> {
  if (isMockMode() || !isSupabaseConfigured()) {
    const mock = await lerMock();
    const nova: Review = {
      id: `rev-${Date.now()}`,
      orderId: input.orderId,
      auctionId: input.auctionId,
      vendorId: input.vendorId,
      buyerId: input.buyerId,
      rating: input.rating,
      comment: input.comment.trim(),
      images: input.imageUris,
      createdAt: new Date().toISOString(),
      buyerName: 'Você',
    };
    await salvarMock([nova, ...mock]);
    return nova;
  }

  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não configurado.');
  }

  let imageUrls = input.imageUris;
  const locais = input.imageUris.filter((u) => !u.startsWith('http'));
  if (locais.length > 0) {
    imageUrls = [
      ...input.imageUris.filter((u) => u.startsWith('http')),
      ...(await enviarFotosReview(input.orderId, input.buyerId, locais)),
    ];
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      order_id: input.orderId,
      auction_id: input.auctionId,
      buyer_id: input.buyerId,
      vendor_id: input.vendorId,
      rating: input.rating,
      comment: input.comment.trim(),
      images: imageUrls,
    })
    .select(
      'id, order_id, auction_id, buyer_id, vendor_id, rating, comment, images, created_at',
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRow(data as Parameters<typeof mapRow>[0]);
}

export function extrairFotosReviews(reviews: Review[]): string[] {
  return reviews.flatMap((r) => r.images).filter(Boolean);
}

export function mediaAvaliacoes(reviews: Review[]): number {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}
