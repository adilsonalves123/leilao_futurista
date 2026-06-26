import AsyncStorage from '@react-native-async-storage/async-storage';
import { isMockMode } from '@/src/lib/mockMode';
import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';
import type {
  AdminConversaSuporte,
  SupportConversationStatus,
  SupportMessage,
} from '@/src/types/supportChat';

const ADMIN_MOCK_KEY = '@aetherion/admin_support_chat_mock';

type AdminMockStore = {
  conversas: AdminConversaSuporte[];
  mensagens: Record<string, SupportMessage[]>;
};

const CONVERSAS_INICIAIS: AdminConversaSuporte[] = [
  {
    id: 'mock-conv-1',
    userId: 'mock-user-marcos',
    email: 'marcos.94@email.com',
    displayName: 'marcos_94',
    status: 'bot_ativo',
    ultimaMensagemPreview:
      'Não consigo liberar meu lance retido no MacBook após perder o leilão.',
    ultimaAtividadeEm: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    assumidoPor: null,
    assumidoEm: null,
  },
  {
    id: 'mock-conv-2',
    userId: 'mock-user-marta',
    email: 'marta.tech@email.com',
    displayName: 'marta_tech',
    status: 'atendimento_humano',
    ultimaMensagemPreview: 'Como faço saque FTK para conta bancária?',
    ultimaAtividadeEm: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    assumidoPor: 'admin-mock',
    assumidoEm: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
  },
];

function mensagensIniciaisMock(): Record<string, SupportMessage[]> {
  const agora = Date.now();
  return {
    'mock-conv-1': [
      {
        id: 'm1',
        role: 'bot',
        body: 'Olá! Eu sou o assistente virtual do Levou. 🤖',
        imageUrl: null,
        createdAt: new Date(agora - 20 * 60 * 1000).toISOString(),
      },
      {
        id: 'm2',
        role: 'user',
        body: 'Não consigo liberar meu lance retido no MacBook após perder o leilão.',
        imageUrl: null,
        createdAt: new Date(agora - 12 * 60 * 1000).toISOString(),
      },
      {
        id: 'm3',
        role: 'bot',
        body: 'Sobre lances e leilões: quando outro participante cobre seu lance, o valor retido volta ao saldo disponível na hora.',
        imageUrl: null,
        createdAt: new Date(agora - 11 * 60 * 1000).toISOString(),
      },
    ],
    'mock-conv-2': [
      {
        id: 'm4',
        role: 'user',
        body: 'Como faço saque FTK para conta bancária?',
        imageUrl: null,
        createdAt: new Date(agora - 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'm5',
        role: 'bot',
        body: 'Um atendente humano assumiu esta conversa. As respostas automáticas foram pausadas.',
        imageUrl: null,
        createdAt: new Date(agora - 55 * 60 * 1000).toISOString(),
      },
      {
        id: 'm6',
        role: 'admin',
        body: 'Olá Marta! O saque está em Carteira → Sacar. Precisa de KYC aprovado.',
        imageUrl: null,
        createdAt: new Date(agora - 50 * 60 * 1000).toISOString(),
      },
    ],
  };
}

function novoId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function lerMock(): Promise<AdminMockStore> {
  const raw = await AsyncStorage.getItem(ADMIN_MOCK_KEY);
  if (!raw) {
    return { conversas: [...CONVERSAS_INICIAIS], mensagens: mensagensIniciaisMock() };
  }
  try {
    return JSON.parse(raw) as AdminMockStore;
  } catch {
    return { conversas: [...CONVERSAS_INICIAIS], mensagens: mensagensIniciaisMock() };
  }
}

async function salvarMock(store: AdminMockStore): Promise<void> {
  await AsyncStorage.setItem(ADMIN_MOCK_KEY, JSON.stringify(store));
}

function mapConversa(row: {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  status: string;
  ultima_mensagem_preview: string | null;
  ultima_atividade_at: string;
  assumido_por: string | null;
  assumido_em: string | null;
}): AdminConversaSuporte {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    status: row.status as SupportConversationStatus,
    ultimaMensagemPreview: row.ultima_mensagem_preview,
    ultimaAtividadeEm: row.ultima_atividade_at,
    assumidoPor: row.assumido_por,
    assumidoEm: row.assumido_em,
  };
}

function mapMensagem(row: {
  id: string;
  role: string;
  body: string;
  image_url?: string | null;
  created_at: string;
}): SupportMessage {
  return {
    id: row.id,
    role: row.role as SupportMessage['role'],
    body: row.body,
    imageUrl: row.image_url ?? null,
    createdAt: row.created_at,
  };
}

export async function listarConversasSuporteAdmin(): Promise<AdminConversaSuporte[]> {
  if (isMockMode() || !isSupabaseConfigured()) {
    return (await lerMock()).conversas;
  }

  const supabase = getSupabase();
  if (!supabase) return (await lerMock()).conversas;

  const { data, error } = await supabase.rpc('admin_listar_conversas_suporte');
  if (error) {
    if (error.message.includes('admin_listar_conversas_suporte') || error.code === 'PGRST202') {
      throw new Error('Execute supabase/migrations/033_support_chat.sql no SQL Editor do Supabase.');
    }
    throw new Error(error.message);
  }
  return ((data ?? []) as Parameters<typeof mapConversa>[0][]).map(mapConversa);
}

export async function listarMensagensSuporteAdmin(
  conversationId: string,
): Promise<SupportMessage[]> {
  if (isMockMode() || !isSupabaseConfigured()) {
    const store = await lerMock();
    return store.mensagens[conversationId] ?? [];
  }

  const supabase = getSupabase();
  if (!supabase) {
    return (await lerMock()).mensagens[conversationId] ?? [];
  }

  const { data, error } = await supabase.rpc('admin_listar_mensagens_suporte', {
    p_conversation_id: conversationId,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as { id: string; role: string; body: string; created_at: string }[]).map(
    mapMensagem,
  );
}

export async function assumirAtendimentoHumanoAdmin(conversationId: string): Promise<void> {
  if (isMockMode() || !isSupabaseConfigured()) {
    const store = await lerMock();
    store.conversas = store.conversas.map((c) =>
      c.id === conversationId
        ? {
            ...c,
            status: 'atendimento_humano',
            assumidoPor: 'admin-mock',
            assumidoEm: new Date().toISOString(),
            ultimaAtividadeEm: new Date().toISOString(),
          }
        : c,
    );
    const msgs = store.mensagens[conversationId] ?? [];
    msgs.push({
      id: novoId('sys'),
      role: 'bot',
      body: 'Um atendente humano assumiu esta conversa. As respostas automáticas foram pausadas.',
      imageUrl: null,
      createdAt: new Date().toISOString(),
    });
    store.mensagens[conversationId] = msgs;
    await salvarMock(store);
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    await assumirAtendimentoHumanoAdmin(conversationId);
    return;
  }

  const { error } = await supabase.rpc('admin_assumir_atendimento_suporte', {
    p_conversation_id: conversationId,
  });
  if (error) throw new Error(error.message);
}

export async function enviarMensagemAdminSuporte(
  conversationId: string,
  body: string,
): Promise<void> {
  const limpo = body.trim();
  if (!limpo) return;

  if (isMockMode() || !isSupabaseConfigured()) {
    const store = await lerMock();
    const conv = store.conversas.find((c) => c.id === conversationId);
    if (!conv || conv.status !== 'atendimento_humano') {
      throw new Error('Assuma o atendimento humano antes de enviar mensagens.');
    }
    const msgs = store.mensagens[conversationId] ?? [];
    msgs.push({
      id: novoId('admin'),
      role: 'admin',
      body: limpo,
      imageUrl: null,
      createdAt: new Date().toISOString(),
    });
    store.mensagens[conversationId] = msgs;
    conv.ultimaMensagemPreview = limpo.slice(0, 120);
    conv.ultimaAtividadeEm = new Date().toISOString();
    await salvarMock(store);
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    await enviarMensagemAdminSuporte(conversationId, body);
    return;
  }

  const { error } = await supabase.rpc('admin_enviar_mensagem_suporte', {
    p_conversation_id: conversationId,
    p_body: limpo,
  });
  if (error) throw new Error(error.message);
}

export function formatarTempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Agora';
  if (min < 60) return `Há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Há ${h} h`;
  const d = Math.floor(h / 24);
  return `Há ${d} d`;
}

/** Mantém a fila admin alinhada ao chat do app em modo mock/demo */
export async function sincronizarConversaMockApp(
  conversationId: string,
  messages: SupportMessage[],
  preview: string,
): Promise<void> {
  if (!isMockMode() && isSupabaseConfigured()) return;

  const store = await lerMock();
  const idx = store.conversas.findIndex((c) => c.id === conversationId);
  if (idx >= 0) {
    store.conversas[idx] = {
      ...store.conversas[idx],
      ultimaMensagemPreview: preview.slice(0, 120),
      ultimaAtividadeEm: new Date().toISOString(),
    };
  }
  store.mensagens[conversationId] = messages;
  await salvarMock(store);
}

export function rotuloUsuarioConversa(c: AdminConversaSuporte): string {
  if (c.displayName?.trim()) {
    const n = c.displayName.trim();
    return n.startsWith('@') ? n : `@${n}`;
  }
  return c.email;
}
