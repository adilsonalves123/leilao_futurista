import AsyncStorage from '@react-native-async-storage/async-storage';
import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import type { LotChatMessage, LotChatNivel } from '@/src/types/lotChat';

const MOCK_VENDOR_KEY = '@aetherion/vendor_lot_chat_flags';

export type VendorLotChatAcesso = {
  conversationId: string | null;
  nivel: LotChatNivel | null;
  vendedorVisivel: boolean;
  chatLiberado: boolean;
};

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

export async function consultarAcessoChatVendedor(orderId: string): Promise<VendorLotChatAcesso> {
  if (isMockMode() || !isSupabaseConfigured()) {
    const raw = await AsyncStorage.getItem(MOCK_VENDOR_KEY);
    const flags = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    const liberado = flags[orderId] ?? false;
    return {
      conversationId: liberado ? `mock-vendor-conv-${orderId}` : null,
      nivel: liberado ? 'vendedor' : null,
      vendedorVisivel: liberado,
      chatLiberado: liberado,
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return {
      conversationId: null,
      nivel: null,
      vendedorVisivel: false,
      chatLiberado: false,
    };
  }

  const { data, error } = await supabase.rpc('vendor_lote_chat_status_por_pedido', {
    p_order_id: orderId,
  });
  if (error || !data?.length) {
    return {
      conversationId: null,
      nivel: null,
      vendedorVisivel: false,
      chatLiberado: false,
    };
  }

  const row = data[0] as {
    conversation_id: string;
    nivel: string;
    vendedor_visivel: boolean;
  };

  const liberado = row.vendedor_visivel && row.nivel === 'vendedor';

  return {
    conversationId: row.conversation_id,
    nivel: row.nivel as LotChatNivel,
    vendedorVisivel: row.vendedor_visivel,
    chatLiberado: liberado,
  };
}

export async function listarMensagensChatVendedor(conversationId: string): Promise<LotChatMessage[]> {
  if (isMockMode() || !isSupabaseConfigured()) return [];

  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc('lote_chat_listar_mensagens', {
    p_conversation_id: conversationId,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Parameters<typeof mapRow>[0][]).map(mapRow);
}

export async function enviarMensagemVendedorLote(
  orderId: string,
  texto: string,
  imageUrl?: string | null,
): Promise<void> {
  const limpo = texto.trim();
  if (!limpo && !imageUrl) return;

  if (isMockMode() || !isSupabaseConfigured()) return;

  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.rpc('lote_chat_enviar_vendedor_por_pedido', {
    p_order_id: orderId,
    p_body: limpo || '📷 Foto enviada',
    p_image_url: imageUrl ?? null,
  });
  if (error) throw new Error(error.message);
}

/** Demo: libera chat do vendedor no mock */
export async function mockLiberarChatVendedor(orderId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(MOCK_VENDOR_KEY);
  const flags = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  flags[orderId] = true;
  await AsyncStorage.setItem(MOCK_VENDOR_KEY, JSON.stringify(flags));
}

/** Demo: revoga acesso do vendedor no mock */
export async function mockRevogarChatVendedor(orderId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(MOCK_VENDOR_KEY);
  const flags = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  flags[orderId] = false;
  await AsyncStorage.setItem(MOCK_VENDOR_KEY, JSON.stringify(flags));
}
