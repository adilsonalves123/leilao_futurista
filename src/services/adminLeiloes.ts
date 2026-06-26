import { LEILOES_INICIAIS } from '@/src/admin/mockData';

import type { AdminLeilao, AdminLeilaoStatus, AdminPedidoEvento, StatusPedidoAdmin } from '@/src/admin/types';

import { formatBRL } from '@/src/lib/bids';

import {

  montarTimelineLeilaoAdmin,

  resolverPendenciaLeilaoAdmin,

} from '@/src/lib/adminLeilaoFluxo';

import { isMockMode } from '@/src/lib/mockMode';

import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';

import { formatarDataPedidoAdmin } from '@/src/admin/pedidosMock';



type LeilaoRowRpc = {

  id: string;

  title: string;

  description: string;

  image_urls: string[];

  current_price_cents: number;

  status: string;

  seller_email: string;

  seller_name: string;

  is_featured: boolean;

  is_featured_plus: boolean;

  created_at: string;

  ends_at: string;

  order_id?: string | null;

  order_code?: string | null;

  order_status?: string | null;

  tracking_code?: string | null;

  order_shipped_at?: string | null;

  order_delivered_at?: string | null;

  order_finalized_at?: string | null;

  winner_name?: string | null;

  winner_bid_cents?: number | null;

  bid_count?: number | null;

};



const ORDER_STATUS_VALUES: StatusPedidoAdmin[] = [

  'pendente_pagamento',

  'pago',

  'em_envio',

  'aguardando_confirmacao',

  'finalizado',

  'em_disputa',

  'estornado',

];



function parseOrderStatus(value: string | null | undefined): StatusPedidoAdmin | null {

  if (!value) return null;

  return ORDER_STATUS_VALUES.includes(value as StatusPedidoAdmin)

    ? (value as StatusPedidoAdmin)

    : null;

}



function mapStatusDb(status: string): AdminLeilaoStatus {

  switch (status) {

    case 'draft':

      return 'em_analise';

    case 'live':

      return 'ao_vivo';

    case 'paused':

      return 'pausado';

    case 'ended':

      return 'encerrado';

    case 'cancelled':

      return 'rejeitado';

    default:

      return 'encerrado';

  }

}



function enrichLeilao(base: Omit<AdminLeilao, 'pendencia'>): AdminLeilao {

  const pendencia = resolverPendenciaLeilaoAdmin({

    status: base.status,

    criadoEm: base.criadoEm,

    encerraEm: base.encerraEm,

    orderId: base.orderId,

    orderCode: base.orderCode,

    orderStatus: base.orderStatus,

    trackingCode: base.trackingCode,

    winnerName: base.winnerName,

    winnerBidCents: base.winnerBidCents,

    bidCount: base.bidCount,

  });

  return { ...base, pendencia };

}



function mapRow(row: LeilaoRowRpc): AdminLeilao {

  const imagens = row.image_urls?.length ? row.image_urls : [];

  const capa = imagens[0] ?? 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?q=80&w=400';

  const promos: string[] = [];

  if (row.is_featured_plus) promos.push('Destaque Plus');

  else if (row.is_featured) promos.push('Destaque');



  const status = mapStatusDb(row.status);

  const orderStatus = parseOrderStatus(row.order_status);



  return enrichLeilao({

    id: row.id,

    titulo: row.title,

    vendedor: row.seller_name || row.seller_email,

    vendedorEmail: row.seller_email,

    lanceAtual: formatBRL(row.current_price_cents),

    status,

    imagemUrl: capa,

    galeriaUrls: imagens.length ? imagens : [capa],

    descricao: row.description || 'Sem descrição informada.',

    promocoes: promos,

    criadoEm: row.created_at,

    encerraEm: row.ends_at,

    orderId: row.order_id ?? null,

    orderCode: row.order_code ?? null,

    orderStatus,

    trackingCode: row.tracking_code ?? null,

    winnerName: row.winner_name ?? null,

    winnerBidCents: row.winner_bid_cents != null ? Number(row.winner_bid_cents) : null,

    bidCount: row.bid_count != null ? Number(row.bid_count) : 0,

  });

}



function mapMockLeilao(item: (typeof LEILOES_INICIAIS)[number]): AdminLeilao {

  return enrichLeilao({

    id: item.id,

    titulo: item.titulo,

    vendedor: item.vendedor,

    lanceAtual: item.lanceAtual,

    status: item.status,

    imagemUrl: item.imagemUrl,

    galeriaUrls: item.galeriaUrls,

    descricao: item.descricao,

    promocoes: item.promocoes,

  });

}



async function assertAdminRpc(): Promise<void> {

  const supabase = getSupabase();

  if (!supabase) throw new Error('Supabase não configurado.');



  const { data: ehAdmin, error } = await supabase.rpc('auth_is_admin');

  if (error) {

    throw new Error(

      `Função auth_is_admin ausente. Execute as migrations admin no Supabase. Detalhe: ${error.message}`,

    );

  }

  if (ehAdmin !== true) {

    throw new Error(

      'Conta logada não é admin. Atualize role = admin no Supabase e entre de novo em /admin/login.',

    );

  }

}



export async function listarLeiloesAdmin(): Promise<AdminLeilao[]> {

  if (isMockMode() || !isSupabaseConfigured()) {

    return LEILOES_INICIAIS.map(mapMockLeilao);

  }



  const supabase = getSupabase();

  if (!supabase) return LEILOES_INICIAIS.map(mapMockLeilao);



  await assertAdminRpc();



  const { data, error } = await supabase.rpc('admin_listar_leiloes');

  if (error) {

    if (error.message.includes('admin_listar_leiloes')) {

      throw new Error(

        'Execute supabase/migrations/047_admin_leiloes_moderacao.sql (e 050 para fluxo operacional) no Supabase.',

      );

    }

    throw new Error(error.message);

  }



  return ((data ?? []) as LeilaoRowRpc[]).map(mapRow);

}



export async function obterEventosLeilaoAdmin(auctionId: string): Promise<AdminPedidoEvento[]> {

  if (isMockMode() || !isSupabaseConfigured()) return [];



  const supabase = getSupabase();

  if (!supabase) return [];



  await assertAdminRpc();



  const { data, error } = await supabase.rpc('admin_obter_eventos_pedido_leilao', {

    p_auction_id: auctionId,

  });



  if (error) {

    if (error.message.includes('admin_obter_eventos_pedido_leilao')) {

      return [];

    }

    console.warn('[adminLeiloes] eventos:', error.message);

    return [];

  }



  return ((data ?? []) as { event_id: string; event_type: string; message: string; created_at: string }[]).map(

    (row) => ({

      id: row.event_id,

      tipo: row.event_type,

      mensagem: row.message,

      criadoEm: formatarDataPedidoAdmin(row.created_at),

    }),

  );

}



export { montarTimelineLeilaoAdmin, resolverPendenciaLeilaoAdmin };



export async function aprovarLeilaoAdmin(auctionId: string): Promise<void> {

  if (isMockMode() || !isSupabaseConfigured()) {

    throw new Error(

      'Supabase não configurado. Conecte o .env e faça login em /admin/login para aprovar leilões reais.',

    );

  }



  const supabase = getSupabase();

  if (!supabase) {

    throw new Error('Cliente Supabase indisponível. Reinicie o app e tente novamente.');

  }



  await assertAdminRpc();



  const { error } = await supabase.rpc('admin_aprovar_leilao', { p_auction_id: auctionId });

  if (error) {

    if (error.message.includes('admin_aprovar_leilao')) {

      throw new Error(

        'Execute supabase/migrations/047_admin_leiloes_moderacao.sql no SQL Editor do Supabase.',

      );

    }

    if (error.message.includes('Transição de status')) {

      throw new Error(

        'O banco bloqueou draft → live. Execute supabase/migrations/048_admin_approve_status_transition.sql no Supabase.',

      );

    }

    throw new Error(error.message);

  }

}



/** Encurta cronômetro para testes. minutos=1 → termina em 1 min; minutos=0 → encerra agora. */

export async function acelerarLeilaoTesteAdmin(

  auctionId: string,

  minutos: 0 | 1 | 3 = 1,

): Promise<void> {

  if (isMockMode() || !isSupabaseConfigured()) {

    throw new Error(

      'Supabase não configurado. Conecte o .env e faça login em /admin/login para usar o modo teste.',

    );

  }



  const supabase = getSupabase();

  if (!supabase) {

    throw new Error('Cliente Supabase indisponível. Reinicie o app e tente novamente.');

  }



  await assertAdminRpc();



  const { error } = await supabase.rpc('admin_acelerar_leilao_teste', {

    p_auction_id: auctionId,

    p_minutos: minutos,

  });



  if (error) {

    if (error.message.includes('admin_acelerar_leilao_teste')) {

      throw new Error(

        'Execute supabase/migrations/049_admin_acelerar_leilao_teste.sql no SQL Editor do Supabase.',

      );

    }

    throw new Error(error.message);

  }

}



export async function rejeitarLeilaoAdmin(auctionId: string): Promise<void> {

  if (isMockMode() || !isSupabaseConfigured()) {

    throw new Error(

      'Supabase não configurado. Conecte o .env e faça login em /admin/login para rejeitar leilões reais.',

    );

  }



  const supabase = getSupabase();

  if (!supabase) {

    throw new Error('Cliente Supabase indisponível. Reinicie o app e tente novamente.');

  }



  await assertAdminRpc();



  const { error } = await supabase.rpc('admin_rejeitar_leilao', { p_auction_id: auctionId });

  if (error) {

    if (error.message.includes('admin_rejeitar_leilao')) {

      throw new Error(

        'Execute supabase/migrations/047_admin_leiloes_moderacao.sql no SQL Editor do Supabase.',

      );

    }

    throw new Error(error.message);

  }

}

export async function enviarPushOportunidadeAdmin(auctionId: string): Promise<number> {
  if (isMockMode() || !isSupabaseConfigured()) {
    throw new Error(
      'Supabase não configurado. Conecte o .env e faça login em /admin/login.',
    );
  }

  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Cliente Supabase indisponível. Reinicie o app e tente novamente.');
  }

  await assertAdminRpc();

  const { data, error } = await supabase.rpc('admin_enviar_push_oportunidade', {
    p_auction_id: auctionId,
  });

  if (error) {
    if (error.message.includes('admin_enviar_push_oportunidade')) {
      throw new Error(
        'Execute supabase/migrations/052_push_notifications.sql no SQL Editor do Supabase.',
      );
    }
    throw new Error(error.message);
  }

  return typeof data === 'number' ? data : 0;
}


