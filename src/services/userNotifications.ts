import { MOCK_VENDOR_ID } from '@/src/constants/operations';
import { deveUsarBackendLeilaoLocal } from '@/src/lib/auctionIds';
import { formatBRL } from '@/src/lib/bids';
import { isMockMode } from '@/src/lib/mockMode';
import {
  appendNotificationFeedEvent,
  listarNotificationFeed,
  obterIdsNotificacoesLidas,
} from '@/src/lib/notificationFeed';
import { obterIdUsuarioAtual } from '@/src/lib/sessionUser';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import { MOCK_AUCTION_LIST } from '@/src/mocks/auctions';
import { MOCK_BIDS_BY_AUCTION } from '@/src/mocks/data';
import type { Order } from '@/src/types/operations';
import type { NotificationKind, UserNotification } from '@/src/types/notifications';

const KIND_META: Record<
  NotificationKind,
  { title: string; icon: 'hammer' | 'cube' | 'checkmark-circle' }
> = {
  outbid: { title: 'Você foi superado no lance', icon: 'hammer' },
  listing_bid: { title: 'Seu anúncio recebeu um lance', icon: 'cube' },
  payment_confirmed: { title: 'Pagamento confirmado', icon: 'checkmark-circle' },
};

export { KIND_META };

export function formatarTempoNotificacao(ms: number): string {
  const diffMs = Date.now() - ms;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'Agora';
  if (min < 60) return `Há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return h === 1 ? 'Há 1 hora' : `Há ${h} horas`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Ontem';
  if (d < 7) return `Há ${d} dias`;
  return new Date(ms).toLocaleDateString('pt-BR');
}

function tituloLeilao(auctionId: string, fallback?: string): string {
  const mock = MOCK_AUCTION_LIST.find((a) => a.id === auctionId);
  return fallback ?? mock?.title ?? 'Leilão';
}

function dedupePorId(lista: UserNotification[]): UserNotification[] {
  const vistos = new Set<string>();
  return lista.filter((n) => {
    if (vistos.has(n.id)) return false;
    vistos.add(n.id);
    return true;
  });
}

function feedParaNotificacoes(
  eventos: Awaited<ReturnType<typeof listarNotificationFeed>>,
  userId: string,
  lidos: Set<string>,
): UserNotification[] {
  return eventos
    .filter((e) => {
      if (e.kind === 'listing_bid') return e.sellerId === userId;
      if (e.kind === 'outbid') return e.bidderId === userId;
      if (e.kind === 'payment_confirmed') return e.vendorId === userId;
      return false;
    })
    .map((e) => {
      const meta = KIND_META[e.kind];
      const titulo = e.auctionTitle ?? tituloLeilao(e.auctionId ?? '');
      let desc = titulo;
      if (e.kind === 'outbid' && e.amountCents) {
        desc = `${titulo} — novo lance de ${formatBRL(e.amountCents)}`;
      } else if (e.kind === 'listing_bid' && e.amountCents) {
        desc = `${titulo} — lance de ${formatBRL(e.amountCents)}`;
      } else if (e.kind === 'payment_confirmed') {
        desc = `${titulo} — comprador pagou`;
      }
      return {
        id: `feed-${e.id}`,
        kind: e.kind,
        title: meta.title,
        description: desc,
        createdAtMs: e.createdAtMs,
        unread: !lidos.has(`feed-${e.id}`),
        auctionId: e.auctionId,
        orderId: e.orderId,
      };
    });
}

function notificacoesMockBids(userId: string, lidos: Set<string>): UserNotification[] {
  const lista: UserNotification[] = [];

  for (const [auctionId, bids] of Object.entries(MOCK_BIDS_BY_AUCTION)) {
    if (!bids.length) continue;
    const ordenados = [...bids].sort((a, b) => b.amount_cents - a.amount_cents);
    const topo = ordenados[0];
    const meus = bids.filter((b) => b.bidder_id === userId);
    if (meus.length && topo.bidder_id !== userId) {
      const id = `mock-outbid-${auctionId}`;
      lista.push({
        id,
        kind: 'outbid',
        title: KIND_META.outbid.title,
        description: `${tituloLeilao(auctionId)} — novo lance de ${formatBRL(topo.amount_cents)}`,
        createdAtMs: new Date(topo.created_at).getTime(),
        unread: !lidos.has(id),
        auctionId,
      });
    }
  }

  if (userId === MOCK_VENDOR_ID) {
    for (const [auctionId, bids] of Object.entries(MOCK_BIDS_BY_AUCTION)) {
      const deOutros = bids.filter((b) => b.bidder_id !== userId);
      if (!deOutros.length) continue;
      const ultimo = [...deOutros].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )[0];
      const id = `mock-listing-${auctionId}-${ultimo.created_at}`;
      lista.push({
        id,
        kind: 'listing_bid',
        title: KIND_META.listing_bid.title,
        description: `${tituloLeilao(auctionId)} — lance de ${formatBRL(ultimo.amount_cents)}`,
        createdAtMs: new Date(ultimo.created_at).getTime(),
        unread: !lidos.has(id),
        auctionId,
      });
    }
  }

  return lista;
}

function notificacoesOrdersLocais(
  orders: Order[],
  userId: string,
  lidos: Set<string>,
): UserNotification[] {
  return orders
    .filter(
      (o) =>
        o.vendorId === userId &&
        (o.status === 'RETIDO_EM_CUSTODIA' ||
          o.status === 'EM_TRANSITO' ||
          o.status === 'AGUARDANDO_CONFIRMACAO' ||
          o.status === 'LIQUIDADO'),
    )
    .map((o) => {
      const listing = MOCK_AUCTION_LIST.find((a) => a.id === o.auctionId);
      const titulo = listing?.title ?? 'Seu anúncio';
      const id = `ops-pay-${o.id}`;
      return {
        id,
        kind: 'payment_confirmed' as const,
        title: KIND_META.payment_confirmed.title,
        description: `${titulo} — comprador pagou ${formatBRL(o.totalCents)}`,
        createdAtMs: new Date(o.updatedAt).getTime(),
        unread: !lidos.has(id),
        auctionId: o.auctionId,
        orderId: o.id,
      };
    });
}

async function notificacoesSupabase(userId: string, lidos: Set<string>): Promise<UserNotification[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const lista: UserNotification[] = [];

  const { data: meusLances } = await supabase
    .from('bids')
    .select('auction_id, amount_cents, created_at')
    .eq('bidder_id', userId)
    .order('created_at', { ascending: false });

  const auctionIds = [...new Set((meusLances ?? []).map((b) => b.auction_id as string))];

  if (auctionIds.length > 0) {
    const { data: lancesLeilao } = await supabase
      .from('bids')
      .select('auction_id, bidder_id, amount_cents, created_at, auction:auctions(title)')
      .in('auction_id', auctionIds)
      .order('amount_cents', { ascending: false });

    const topoPorLeilao = new Map<string, (typeof lancesLeilao)[number]>();
    for (const row of lancesLeilao ?? []) {
      const aid = row.auction_id as string;
      if (!topoPorLeilao.has(aid)) topoPorLeilao.set(aid, row);
    }

    for (const aid of auctionIds) {
      const topo = topoPorLeilao.get(aid);
      if (!topo || (topo.bidder_id as string) === userId) continue;
      const titulo =
        (topo.auction as { title?: string } | null)?.title ?? tituloLeilao(aid);
      const id = `sb-outbid-${aid}-${topo.created_at}`;
      lista.push({
        id,
        kind: 'outbid',
        title: KIND_META.outbid.title,
        description: `${titulo} — novo lance de ${formatBRL(topo.amount_cents as number)}`,
        createdAtMs: new Date(topo.created_at as string).getTime(),
        unread: !lidos.has(id),
        auctionId: aid,
      });
    }
  }

  const { data: meusAnuncios } = await supabase
    .from('auctions')
    .select('id, title')
    .eq('seller_id', userId);

  const idsAnuncios = (meusAnuncios ?? []).map((a) => a.id as string);

  if (idsAnuncios.length > 0) {
    const { data: lancesRecebidos } = await supabase
      .from('bids')
      .select('id, auction_id, bidder_id, amount_cents, created_at, auction:auctions(title)')
      .in('auction_id', idsAnuncios)
      .neq('bidder_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    for (const row of lancesRecebidos ?? []) {
      const aid = row.auction_id as string;
      const titulo =
        (row.auction as { title?: string } | null)?.title ??
        (meusAnuncios?.find((a) => a.id === aid)?.title as string) ??
        tituloLeilao(aid);
      const id = `sb-listing-${row.id}`;
      lista.push({
        id,
        kind: 'listing_bid',
        title: KIND_META.listing_bid.title,
        description: `${titulo} — lance de ${formatBRL(row.amount_cents as number)}`,
        createdAtMs: new Date(row.created_at as string).getTime(),
        unread: !lidos.has(id),
        auctionId: aid,
      });
    }
  }

  const { data: pedidosPagos } = await supabase
    .from('orders')
    .select('id, status, updated_at, total_cents, auction_id, auction:auctions(title)')
    .eq('vendor_id', userId)
    .in('status', ['pago', 'em_envio', 'aguardando_confirmacao', 'finalizado'])
    .order('updated_at', { ascending: false })
    .limit(20);

  for (const row of pedidosPagos ?? []) {
    if ((row.status as string) === 'pendente_pagamento') continue;
    const titulo =
      (row.auction as { title?: string } | null)?.title ??
      tituloLeilao(row.auction_id as string);
    const id = `sb-pay-${row.id}`;
    lista.push({
      id,
      kind: 'payment_confirmed',
      title: KIND_META.payment_confirmed.title,
      description: `${titulo} — comprador pagou ${formatBRL((row.total_cents as number) ?? 0)}`,
      createdAtMs: new Date(row.updated_at as string).getTime(),
      unread: !lidos.has(id),
      auctionId: row.auction_id as string,
      orderId: row.id as string,
    });
  }

  return lista;
}

export type ListarNotificacoesOptions = {
  orders?: Order[];
};

export async function listarNotificacoesUsuario(
  options: ListarNotificacoesOptions = {},
): Promise<UserNotification[]> {
  const userId = await obterIdUsuarioAtual();
  if (!userId) return [];

  const lidos = await obterIdsNotificacoesLidas();
  const feed = await listarNotificationFeed();
  const partes: UserNotification[] = [
    ...feedParaNotificacoes(feed, userId, lidos),
    ...notificacoesOrdersLocais(options.orders ?? [], userId, lidos),
  ];

  if (isMockMode() || !isSupabaseConfigured()) {
    partes.push(...notificacoesMockBids(userId, lidos));
  } else {
    partes.push(...(await notificacoesSupabase(userId, lidos)));
  }

  return dedupePorId(partes).sort((a, b) => b.createdAtMs - a.createdAtMs);
}

/** Registra lance no backend e notifica o vendedor. */
async function notificarLanceNoAnuncio(input: {
  auctionId: string;
  auctionTitle: string;
  sellerId: string | null;
  amountCents: number;
  bidderId: string;
}): Promise<void> {
  if (!input.sellerId || input.sellerId === input.bidderId) return;
  await appendNotificationFeedEvent({
    kind: 'listing_bid',
    sellerId: input.sellerId,
    bidderId: input.bidderId,
    auctionId: input.auctionId,
    auctionTitle: input.auctionTitle,
    amountCents: input.amountCents,
  });
}

export async function registrarLanceComNotificacao(input: {
  auctionId: string;
  auctionTitle: string;
  sellerId: string | null;
  amountCents: number;
  bidderId: string;
}): Promise<{ ok: boolean; message?: string }> {
  const usarLocal =
    isMockMode() ||
    !isSupabaseConfigured() ||
    deveUsarBackendLeilaoLocal(input.auctionId);

  if (usarLocal) {
    await notificarLanceNoAnuncio(input);
    return { ok: true };
  }

  const supabase = getSupabase();
  if (!supabase) {
    await notificarLanceNoAnuncio(input);
    return { ok: true };
  }

  const { data, error } = await supabase.rpc('registrar_lance', {
    p_auction_id: input.auctionId,
    p_amount_cents: input.amountCents,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  const row = data as { ok?: boolean } | null;
  if (row?.ok !== true) {
    return { ok: false, message: 'Não foi possível registrar o lance.' };
  }

  await notificarLanceNoAnuncio(input);
  return { ok: true };
}

export async function registrarPagamentoConfirmadoNotificacao(input: {
  vendorId: string;
  auctionId: string;
  auctionTitle: string;
  orderId: string;
  totalCents: number;
}): Promise<void> {
  await appendNotificationFeedEvent({
    kind: 'payment_confirmed',
    vendorId: input.vendorId,
    auctionId: input.auctionId,
    auctionTitle: input.auctionTitle,
    orderId: input.orderId,
    amountCents: input.totalCents,
  });
}
