import AsyncStorage from '@react-native-async-storage/async-storage';
import { MENSAGENS_INICIAIS_LOTE_CHAT } from '@/src/content/lotChatAgentConfig';
import type { LotChatMessage, LotChatNivel } from '@/src/types/lotChat';

export const LOT_CHAT_MOCK_KEY = '@aetherion/lot_chat_mock';

export type LotChatMockEntry = {
  conversationId: string;
  nivel: LotChatNivel;
  vendedorVisivel: boolean;
  messages: LotChatMessage[];
};

export type LotChatMockStore = Record<string, LotChatMockEntry>;

export function mockLotChatConversationId(orderId: string): string {
  return `mock-lot-chat-${orderId}`;
}

export function mockLotChatMessageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function criarMockConversaLote(orderId: string): LotChatMockEntry {
  return {
    conversationId: mockLotChatConversationId(orderId),
    nivel: 'ia',
    vendedorVisivel: false,
    messages: MENSAGENS_INICIAIS_LOTE_CHAT.map((body, i) => ({
      id: `bot-${orderId}-${i}`,
      senderRole: 'ia' as const,
      senderUserId: null,
      body,
      imageUrl: null,
      createdAt: new Date(Date.now() - (3 - i) * 1000).toISOString(),
    })),
  };
}

export async function lerLotChatMockStore(): Promise<LotChatMockStore> {
  const raw = await AsyncStorage.getItem(LOT_CHAT_MOCK_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as LotChatMockStore;
  } catch {
    return {};
  }
}

export async function salvarLotChatMockStore(store: LotChatMockStore): Promise<void> {
  await AsyncStorage.setItem(LOT_CHAT_MOCK_KEY, JSON.stringify(store));
}

export async function garantirMockConversaLote(orderId: string): Promise<LotChatMockEntry> {
  const store = await lerLotChatMockStore();
  if (!store[orderId]) {
    store[orderId] = criarMockConversaLote(orderId);
    await salvarLotChatMockStore(store);
  }
  return store[orderId];
}

export function encontrarMockPorConversationId(
  store: LotChatMockStore,
  conversationId: string,
): { orderId: string; entry: LotChatMockEntry } | null {
  const orderId = Object.keys(store).find((k) => store[k].conversationId === conversationId);
  if (!orderId) return null;
  return { orderId, entry: store[orderId] };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPedidoUuid(orderId: string): boolean {
  return UUID_RE.test(orderId);
}
