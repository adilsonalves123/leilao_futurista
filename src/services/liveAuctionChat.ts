import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { deveUsarBackendLeilaoLocal } from '@/src/lib/auctionIds';
import { formatBRL } from '@/src/lib/bids';
import { moderarMensagemChat } from '@/src/lib/chatModeration';
import { isMockMode } from '@/src/lib/mockMode';
import { getMockSession } from '@/src/lib/mockSession';
import { obterIdUsuarioAtual } from '@/src/lib/sessionUser';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import type { LiveAuctionMessage, LiveChatBroadcastPayload } from '@/src/types/liveAuctionChat';

export const LIVE_CHAT_BROADCAST_EVENT = 'chat_message';

const MOCK_STORE_KEY = '@aetherion/live_auction_chat_mock';

type MockStore = Record<string, LiveAuctionMessage[]>;

type DbRow = {
  id: string;
  auction_id: string;
  user_id: string | null;
  username: string;
  message: string;
  is_system_message: boolean;
  created_at: string;
};

function novoId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function mapRow(row: DbRow): LiveAuctionMessage {
  return {
    id: row.id,
    auctionId: row.auction_id,
    userId: row.user_id,
    username: row.username,
    message: row.message,
    isSystemMessage: row.is_system_message,
    createdAt: row.created_at,
  };
}

export function canalChatAoVivo(auctionId: string): string {
  return `live-auction-chat:${auctionId}`;
}

/** IDs demo (ex.: "9", "1247") não existem no Postgres — usa AsyncStorage local */
function usarChatLocal(auctionId: string): boolean {
  return deveUsarBackendLeilaoLocal(auctionId) || !isSupabaseConfigured();
}

async function lerMock(): Promise<MockStore> {
  const raw = await AsyncStorage.getItem(MOCK_STORE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as MockStore;
  } catch {
    return {};
  }
}

async function salvarMock(store: MockStore): Promise<void> {
  await AsyncStorage.setItem(MOCK_STORE_KEY, JSON.stringify(store));
}

export async function obterUsernameAtual(): Promise<string> {
  const userId = await obterIdUsuarioAtual();
  if (!userId) return 'Participante';

  if (isMockMode() || !isSupabaseConfigured()) {
    return getMockSession()?.displayName ?? 'Participante';
  }

  const supabase = getSupabase();
  if (!supabase) {
    return getMockSession()?.displayName ?? 'Participante';
  }

  const { data } = await supabase
    .from('users')
    .select('display_name, nome_completo, email')
    .eq('id', userId)
    .maybeSingle();

  if (!data) return 'Participante';
  const row = data as {
    display_name: string | null;
    nome_completo: string | null;
    email: string;
  };
  return (
    row.display_name?.trim() ||
    row.nome_completo?.trim() ||
    row.email.split('@')[0] ||
    'Participante'
  );
}

export async function listarHistoricoChatAoVivo(
  auctionId: string,
  limit = 80,
): Promise<LiveAuctionMessage[]> {
  if (usarChatLocal(auctionId)) {
    const store = await lerMock();
    const msgs = store[auctionId] ?? [];
    return msgs.slice(-limit);
  }

  const supabase = getSupabase();
  if (!supabase) {
    const store = await lerMock();
    return (store[auctionId] ?? []).slice(-limit);
  }

  const { data, error } = await supabase.rpc('live_chat_listar_mensagens', {
    p_auction_id: auctionId,
    p_limit: limit,
  });

  if (error) {
    if (
      error.message.includes('live_chat_listar_mensagens') ||
      error.message.includes('invalid input syntax for type uuid')
    ) {
      const store = await lerMock();
      return (store[auctionId] ?? []).slice(-limit);
    }
    throw new Error(error.message);
  }

  const rows = (data ?? []) as DbRow[];
  return rows.map(mapRow).reverse();
}

export async function enviarMensagemChatAoVivo(
  auctionId: string,
  texto: string,
): Promise<LiveAuctionMessage> {
  const moderacao = moderarMensagemChat(texto);
  if (!moderacao.permitido) {
    throw new Error(moderacao.motivo);
  }

  const limpo = texto.trim();
  const userId = await obterIdUsuarioAtual();
  if (!userId) {
    throw new Error('Entre na sua conta para participar do chat.');
  }

  if (usarChatLocal(auctionId)) {
    const username = await obterUsernameAtual();
    const msg: LiveAuctionMessage = {
      id: novoId('mock-chat'),
      auctionId,
      userId,
      username,
      message: limpo,
      isSystemMessage: false,
      createdAt: new Date().toISOString(),
    };
    const store = await lerMock();
    const lista = store[auctionId] ?? [];
    store[auctionId] = [...lista, msg].slice(-200);
    await salvarMock(store);
    return msg;
  }

  const supabase = getSupabase();
  if (!supabase) {
    return enviarMensagemChatAoVivo(auctionId, texto);
  }

  const { data, error } = await supabase.rpc('live_chat_enviar_mensagem', {
    p_auction_id: auctionId,
    p_message: limpo,
  });

  if (error) {
    if (error.message.includes('invalid input syntax for type uuid')) {
      return enviarMensagemChatAoVivo(auctionId, texto);
    }
    if (error.message.includes('live_chat_enviar_mensagem')) {
      throw new Error('Execute supabase/migrations/037_live_auction_chat.sql no Supabase.');
    }
    throw new Error(error.message);
  }

  const row = ((data ?? []) as DbRow[])[0];
  if (!row) {
    throw new Error('Falha ao enviar mensagem.');
  }
  return mapRow(row);
}

export async function registrarLanceSistemaChatAoVivo(
  auctionId: string,
  amountCents: number,
): Promise<LiveAuctionMessage | null> {
  const userId = await obterIdUsuarioAtual();
  if (!userId) return null;

  if (usarChatLocal(auctionId)) {
    const username = await obterUsernameAtual();
    const msg: LiveAuctionMessage = {
      id: novoId('mock-sys'),
      auctionId,
      userId,
      username: 'Sistema',
      message: `🔥 ${username} deu um lance de ${formatBRL(amountCents)}`,
      isSystemMessage: true,
      createdAt: new Date().toISOString(),
    };
    const store = await lerMock();
    const lista = store[auctionId] ?? [];
    store[auctionId] = [...lista, msg].slice(-200);
    await salvarMock(store);
    return msg;
  }

  const supabase = getSupabase();
  if (!supabase) {
    return registrarLanceSistemaChatAoVivo(auctionId, amountCents);
  }

  const { data, error } = await supabase.rpc('live_chat_registrar_lance_sistema', {
    p_auction_id: auctionId,
    p_amount_cents: amountCents,
  });

  if (error) {
    if (error.message.includes('invalid input syntax for type uuid')) {
      return registrarLanceSistemaChatAoVivo(auctionId, amountCents);
    }
    return null;
  }
  const row = ((data ?? []) as DbRow[])[0];
  return row ? mapRow(row) : null;
}

export function broadcastMensagemChat(
  channel: RealtimeChannel,
  mensagem: LiveChatBroadcastPayload,
): void {
  channel.send({
    type: 'broadcast',
    event: LIVE_CHAT_BROADCAST_EVENT,
    payload: mensagem,
  });
}

/** Mock: simula broadcast entre abas/dispositivos locais via AsyncStorage + evento customizado */
const mockListeners = new Map<string, Set<(msg: LiveAuctionMessage) => void>>();

export function inscreverMockBroadcast(
  auctionId: string,
  handler: (msg: LiveAuctionMessage) => void,
): () => void {
  const key = auctionId;
  if (!mockListeners.has(key)) {
    mockListeners.set(key, new Set());
  }
  mockListeners.get(key)!.add(handler);
  return () => {
    mockListeners.get(key)?.delete(handler);
  };
}

export function emitirMockBroadcast(auctionId: string, mensagem: LiveAuctionMessage): void {
  mockListeners.get(auctionId)?.forEach((fn) => fn(mensagem));
}
