import { isMockMode } from '@/src/lib/mockMode';

import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';

import {

  criarMockConversaLote,

  encontrarMockPorConversationId,

  garantirMockConversaLote,

  isPedidoUuid,

  lerLotChatMockStore,

  mockLotChatMessageId,

  salvarLotChatMockStore,

} from '@/src/services/lotChatMockStore';

import type { LotChatMessage, LotChatNivel } from '@/src/types/lotChat';



function mapRow(row: {

  id: string;

  sender_role: string;

  sender_user_id: string | null;

  body: string;

  image_url: string | null;

  created_at: string;

}): LotChatMessage {

  return {

    id: row.id,

    senderRole: row.sender_role as LotChatMessage['senderRole'],

    senderUserId: row.sender_user_id,

    body: row.body,

    imageUrl: row.image_url,

    createdAt: row.created_at,

  };

}



export type AdminLotChatStatus = {

  conversationId: string;

  nivel: LotChatNivel;

  vendedorVisivel: boolean;

};



function deveUsarMockChat(orderId: string): boolean {

  return isMockMode() || !isSupabaseConfigured() || !isPedidoUuid(orderId);

}



export async function obterOuCriarChatAdminPedido(orderId: string): Promise<string> {

  if (deveUsarMockChat(orderId)) {

    const entry = await garantirMockConversaLote(orderId);

    return entry.conversationId;

  }



  const supabase = getSupabase();

  if (!supabase) {

    const entry = await garantirMockConversaLote(orderId);

    return entry.conversationId;

  }



  try {

    const { data, error } = await supabase.rpc('admin_lote_chat_obter_ou_criar', {

      p_order_id: orderId,

    });

    if (error) {

      throw new Error(

        error.message.includes('admin_lote_chat_obter_ou_criar')

          ? 'Execute supabase/migrations/036_lot_chat_admin_vendor_rpcs.sql'

          : error.message,

      );

    }

    return data as string;

  } catch {

    const entry = await garantirMockConversaLote(orderId);

    return entry.conversationId;

  }

}



export async function statusChatAdminPedido(orderId: string): Promise<AdminLotChatStatus> {

  if (deveUsarMockChat(orderId)) {

    const entry = await garantirMockConversaLote(orderId);

    return {

      conversationId: entry.conversationId,

      nivel: entry.nivel,

      vendedorVisivel: entry.vendedorVisivel,

    };

  }



  const supabase = getSupabase();

  if (!supabase) {

    const entry = await garantirMockConversaLote(orderId);

    return {

      conversationId: entry.conversationId,

      nivel: entry.nivel,

      vendedorVisivel: entry.vendedorVisivel,

    };

  }



  try {

    const { data, error } = await supabase.rpc('admin_lote_chat_status_por_pedido', {

      p_order_id: orderId,

    });



    if (error) {

      if (error.message.includes('admin_lote_chat_status_por_pedido')) {

        const convId = await obterOuCriarChatAdminPedido(orderId);

        return { conversationId: convId, nivel: 'ia', vendedorVisivel: false };

      }

      throw new Error(error.message);

    }



    const row = (data as { conversation_id: string; nivel: string; vendedor_visivel: boolean }[])[0];

    if (!row) {

      const convId = await obterOuCriarChatAdminPedido(orderId);

      return { conversationId: convId, nivel: 'ia', vendedorVisivel: false };

    }



    return {

      conversationId: row.conversation_id,

      nivel: row.nivel as LotChatNivel,

      vendedorVisivel: row.vendedor_visivel,

    };

  } catch {

    const entry = await garantirMockConversaLote(orderId);

    return {

      conversationId: entry.conversationId,

      nivel: entry.nivel,

      vendedorVisivel: entry.vendedorVisivel,

    };

  }

}



export async function listarMensagensChatAdmin(conversationId: string): Promise<LotChatMessage[]> {

  if (isMockMode() || !isSupabaseConfigured()) {

    const store = await lerLotChatMockStore();

    const found = encontrarMockPorConversationId(store, conversationId);

    return found?.entry.messages ?? [];

  }



  const supabase = getSupabase();

  if (!supabase) {

    const store = await lerLotChatMockStore();

    const found = encontrarMockPorConversationId(store, conversationId);

    return found?.entry.messages ?? [];

  }



  try {

    const { data, error } = await supabase.rpc('lote_chat_listar_mensagens', {

      p_conversation_id: conversationId,

    });

    if (error) throw new Error(error.message);

    return ((data ?? []) as Parameters<typeof mapRow>[0][]).map(mapRow);

  } catch {

    const store = await lerLotChatMockStore();

    const found = encontrarMockPorConversationId(store, conversationId);

    return found?.entry.messages ?? [];

  }

}



export async function assumirControleChatAdmin(orderId: string): Promise<void> {

  if (deveUsarMockChat(orderId)) {

    const store = await lerLotChatMockStore();

    if (!store[orderId]) {

      store[orderId] = criarMockConversaLote(orderId);

    }

    store[orderId].nivel = 'admin';

    store[orderId].messages.push({

      id: mockLotChatMessageId('sys'),

      senderRole: 'admin',

      senderUserId: 'mock-admin',

      body: '⚡ Um administrador assumiu este atendimento. O assistente automático foi pausado.',

      imageUrl: null,

      createdAt: new Date().toISOString(),

    });

    await salvarLotChatMockStore(store);

    return;

  }



  const supabase = getSupabase();

  if (!supabase) return;



  const { error } = await supabase.rpc('admin_lote_chat_assumir_intervencao', {

    p_order_id: orderId,

  });

  if (error) throw new Error(error.message);

}



export async function incluirVendedorChatAdmin(orderId: string): Promise<void> {
  if (deveUsarMockChat(orderId)) {
    const store = await lerLotChatMockStore();
    if (!store[orderId]) {
      store[orderId] = criarMockConversaLote(orderId);
    }
    store[orderId].nivel = 'vendedor';
    store[orderId].vendedorVisivel = true;
    store[orderId].messages.push({
      id: mockLotChatMessageId('sys'),
      senderRole: 'ia',
      senderUserId: null,
      body: 'O vendedor foi incluído nesta conversa e pode responder ao comprador.',
      imageUrl: null,
      createdAt: new Date().toISOString(),
    });
    await salvarLotChatMockStore(store);
    return;
  }

  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.rpc('admin_lote_chat_escalar_vendedor_por_pedido', {
    p_order_id: orderId,
  });
  if (error) throw new Error(error.message);
}

export async function removerVendedorChatAdmin(orderId: string): Promise<void> {
  if (deveUsarMockChat(orderId)) {
    const store = await lerLotChatMockStore();
    if (!store[orderId]) {
      throw new Error('Conversa não encontrada.');
    }
    if (!store[orderId].vendedorVisivel || store[orderId].nivel !== 'vendedor') {
      throw new Error('Vendedor não está ativo nesta conversa.');
    }
    store[orderId].nivel = 'admin';
    store[orderId].vendedorVisivel = false;
    store[orderId].messages.push({
      id: mockLotChatMessageId('sys'),
      senderRole: 'admin',
      senderUserId: 'mock-admin',
      body: 'O vendedor foi removido desta conversa. O atendimento continua apenas com a plataforma.',
      imageUrl: null,
      createdAt: new Date().toISOString(),
    });
    await salvarLotChatMockStore(store);
    return;
  }

  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.rpc('admin_lote_chat_remover_vendedor_por_pedido', {
    p_order_id: orderId,
  });
  if (error) {
    throw new Error(
      error.message.includes('admin_lote_chat_remover_vendedor_por_pedido')
        ? 'Execute supabase/migrations/040_admin_lot_chat_remover_vendedor.sql'
        : error.message,
    );
  }
}



export async function enviarMensagemAdminLote(

  orderId: string,

  texto: string,

  imageUrl?: string | null,

): Promise<void> {

  const limpo = texto.trim();

  if (!limpo && !imageUrl) return;



  if (deveUsarMockChat(orderId)) {

    const store = await lerLotChatMockStore();

    if (!store[orderId]) {

      store[orderId] = criarMockConversaLote(orderId);

    }

    if (store[orderId].nivel === 'ia') {

      throw new Error('Assuma o atendimento antes de enviar mensagens.');

    }

    store[orderId].messages.push({

      id: mockLotChatMessageId('admin'),

      senderRole: 'admin',

      senderUserId: 'mock-admin',

      body: limpo || '📷 Foto enviada',

      imageUrl: imageUrl ?? null,

      createdAt: new Date().toISOString(),

    });

    await salvarLotChatMockStore(store);

    return;

  }



  const supabase = getSupabase();

  if (!supabase) return;



  const { error } = await supabase.rpc('admin_lote_chat_enviar_por_pedido', {

    p_order_id: orderId,

    p_body: limpo || '📷 Foto enviada',

    p_image_url: imageUrl ?? null,

  });

  if (error) throw new Error(error.message);

}


